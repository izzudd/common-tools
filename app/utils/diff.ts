import { diffLines, diffWordsWithSpace, createTwoFilesPatch } from 'diff'
import type {
  DiffContextOption,
  DiffDraft,
  DiffStats,
  DiffToken,
  SplitCell,
  SplitRow,
  UnifiedLine
} from '~/types/diff'

interface NormalLineItem {
  oldLineNumber: number
  newLineNumber: number
  text: string
}

interface DeletedLineItem {
  lineNumber: number
  text: string
}

interface AddedLineItem {
  lineNumber: number
  text: string
}

interface NormalBlock {
  type: 'normal'
  lines: NormalLineItem[]
}

interface ChangeBlock {
  type: 'change'
  deleted: DeletedLineItem[]
  added: AddedLineItem[]
}

type DiffBlock = NormalBlock | ChangeBlock

export function calculateFoldRange(
  total: number,
  isStart: boolean,
  isEnd: boolean,
  ctx: number
): { foldStart: number, foldEnd: number } {
  if (isStart && isEnd) {
    return { foldStart: 0, foldEnd: 0 }
  }
  if (isStart) {
    return total > ctx ? { foldStart: 0, foldEnd: total - ctx } : { foldStart: 0, foldEnd: 0 }
  }
  if (isEnd) {
    return total > ctx ? { foldStart: ctx, foldEnd: total } : { foldStart: 0, foldEnd: 0 }
  }
  if (total > ctx * 2) {
    return { foldStart: ctx, foldEnd: total - ctx }
  }
  return { foldStart: 0, foldEnd: 0 }
}

function splitLines(text: string): string[] {
  if (!text) return []
  // Standardize CRLF to LF and preserve line count accurately
  const normalized = text.replace(/\r\n/g, '\n')
  if (normalized.endsWith('\n')) {
    return normalized.slice(0, -1).split('\n')
  }
  return normalized.split('\n')
}

export function computeIntraLineTokens(
  deletedText: string,
  addedText: string,
  ignoreCase = false
): { deletedTokens: DiffToken[], addedTokens: DiffToken[] } {
  try {
    const parts = diffWordsWithSpace(deletedText, addedText, { ignoreCase })
    const deletedTokens: DiffToken[] = []
    const addedTokens: DiffToken[] = []

    for (const part of parts) {
      if (part.added) {
        addedTokens.push({ type: 'added', text: part.value })
      } else if (part.removed) {
        deletedTokens.push({ type: 'deleted', text: part.value })
      } else {
        deletedTokens.push({ type: 'normal', text: part.value })
        addedTokens.push({ type: 'normal', text: part.value })
      }
    }

    return { deletedTokens, addedTokens }
  } catch {
    return {
      deletedTokens: [{ type: 'deleted', text: deletedText }],
      addedTokens: [{ type: 'added', text: addedText }]
    }
  }
}

export function parseDiffBlocks(
  oldText: string,
  newText: string,
  options: { ignoreWhitespace?: boolean, ignoreCase?: boolean } = {}
): DiffBlock[] {
  const parts = diffLines(oldText, newText, options)
  const blocks: DiffBlock[] = []
  let oldLine = 1
  let newLine = 1

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (!part) continue

    const val = part.value || ''
    const lines = splitLines(val)

    if (!part.added && !part.removed) {
      const normalLines: NormalLineItem[] = lines.map(text => ({
        oldLineNumber: oldLine++,
        newLineNumber: newLine++,
        text
      }))
      if (normalLines.length > 0) {
        blocks.push({ type: 'normal', lines: normalLines })
      }
    } else if (part.removed) {
      const deletedLines: DeletedLineItem[] = lines.map(text => ({
        lineNumber: oldLine++,
        text
      }))

      let addedLines: AddedLineItem[] = []
      // Check if next part is an addition to pair them up
      const nextPart = parts[i + 1]
      if (nextPart && nextPart.added) {
        i++
        const nextVal = nextPart.value || ''
        const nextLines = splitLines(nextVal)
        addedLines = nextLines.map(text => ({
          lineNumber: newLine++,
          text
        }))
      }

      blocks.push({
        type: 'change',
        deleted: deletedLines,
        added: addedLines
      })
    } else if (part.added) {
      const addedLines: AddedLineItem[] = lines.map(text => ({
        lineNumber: newLine++,
        text
      }))
      blocks.push({
        type: 'change',
        deleted: [],
        added: addedLines
      })
    }
  }

  return blocks
}

export function computeDiffStats(
  oldText: string,
  newText: string,
  blocks: DiffBlock[]
): DiffStats {
  const oldLines = splitLines(oldText)
  const newLines = splitLines(newText)

  let additions = 0
  let deletions = 0
  let modifications = 0
  let unchanged = 0

  for (const block of blocks) {
    if (block.type === 'normal') {
      unchanged += block.lines.length
    } else {
      const dCount = block.deleted.length
      const aCount = block.added.length
      const paired = Math.min(dCount, aCount)
      modifications += paired
      deletions += dCount
      additions += aCount
    }
  }

  return {
    additions,
    deletions,
    modifications,
    unchanged,
    oldTotalLines: oldLines.length,
    newTotalLines: newLines.length
  }
}

export function generateUnifiedLines(
  blocks: DiffBlock[],
  options: {
    contextOption: DiffContextOption
    wordDiff: boolean
    ignoreCase: boolean
    expandedHunks: Set<number>
  }
): UnifiedLine[] {
  const lines: UnifiedLine[] = []
  const hasChanges = blocks.some(b => b.type === 'change')
  const ctx = options.contextOption === 'all' || !hasChanges ? 0 : parseInt(options.contextOption, 10)
  let hunkCounter = 0

  for (let bIndex = 0; bIndex < blocks.length; bIndex++) {
    const block = blocks[bIndex]
    if (!block) continue

    if (block.type === 'normal') {
      const total = block.lines.length

      if (ctx === 0) {
        // Render all normal lines
        for (const item of block.lines) {
          lines.push({
            id: `u-n-${item.oldLineNumber}-${item.newLineNumber}`,
            type: 'normal',
            oldLineNumber: item.oldLineNumber,
            newLineNumber: item.newLineNumber,
            prefix: ' ',
            text: item.text
          })
        }
      } else {
        const isStart = bIndex === 0
        const isEnd = bIndex === blocks.length - 1
        const { foldStart, foldEnd } = calculateFoldRange(total, isStart, isEnd, ctx)

        const isFoldable = foldEnd > foldStart
        const currentHunkIndex = isFoldable ? hunkCounter++ : -1
        const isExpanded = currentHunkIndex >= 0 && options.expandedHunks.has(currentHunkIndex)

        // 1. Pre-fold normal lines
        for (let i = 0; i < foldStart; i++) {
          const item = block.lines[i]
          if (!item) continue
          lines.push({
            id: `u-n-${item.oldLineNumber}-${item.newLineNumber}`,
            type: 'normal',
            oldLineNumber: item.oldLineNumber,
            newLineNumber: item.newLineNumber,
            prefix: ' ',
            text: item.text
          })
        }

        // 2. Folded section or expanded lines
        if (isFoldable) {
          if (isExpanded) {
            for (let i = foldStart; i < foldEnd; i++) {
              const item = block.lines[i]
              if (!item) continue
              lines.push({
                id: `u-n-${item.oldLineNumber}-${item.newLineNumber}`,
                type: 'normal',
                oldLineNumber: item.oldLineNumber,
                newLineNumber: item.newLineNumber,
                prefix: ' ',
                text: item.text
              })
            }
          } else {
            const hiddenCount = foldEnd - foldStart
            const firstHidden = block.lines[foldStart]
            const lastHidden = block.lines[foldEnd - 1]
            const oldStart = firstHidden ? firstHidden.oldLineNumber : 0
            const newStart = firstHidden ? firstHidden.newLineNumber : 0
            const oldEnd = lastHidden ? lastHidden.oldLineNumber : 0
            const newEnd = lastHidden ? lastHidden.newLineNumber : 0

            lines.push({
              id: `u-hunk-${currentHunkIndex}`,
              type: 'hunk-header',
              oldLineNumber: null,
              newLineNumber: null,
              prefix: '@',
              text: `@@ -${oldStart},${hiddenCount} +${newStart},${hiddenCount} @@`,
              hunkIndex: currentHunkIndex,
              hiddenCount,
              hunkRange: `Lines ${oldStart}-${oldEnd} (Old) / ${newStart}-${newEnd} (New)`
            })
          }
        }

        // 3. Post-fold normal lines
        for (let i = foldEnd; i < total; i++) {
          const item = block.lines[i]
          if (!item) continue
          lines.push({
            id: `u-n-${item.oldLineNumber}-${item.newLineNumber}`,
            type: 'normal',
            oldLineNumber: item.oldLineNumber,
            newLineNumber: item.newLineNumber,
            prefix: ' ',
            text: item.text
          })
        }
      }
    } else {
      // Change block
      const deletedLen = block.deleted.length
      const addedLen = block.added.length

      // Deleted lines first
      for (let i = 0; i < deletedLen; i++) {
        const del = block.deleted[i]
        if (!del) continue

        let tokens: DiffToken[] | undefined
        if (options.wordDiff && i < addedLen && block.added[i]) {
          const res = computeIntraLineTokens(del.text, block.added[i]!.text, options.ignoreCase)
          tokens = res.deletedTokens
        }

        lines.push({
          id: `u-d-${del.lineNumber}`,
          type: 'deleted',
          oldLineNumber: del.lineNumber,
          newLineNumber: null,
          prefix: '-',
          text: del.text,
          tokens
        })
      }

      // Added lines second
      for (let j = 0; j < addedLen; j++) {
        const add = block.added[j]
        if (!add) continue

        let tokens: DiffToken[] | undefined
        if (options.wordDiff && j < deletedLen && block.deleted[j]) {
          const res = computeIntraLineTokens(block.deleted[j]!.text, add.text, options.ignoreCase)
          tokens = res.addedTokens
        }

        lines.push({
          id: `u-a-${add.lineNumber}`,
          type: 'added',
          oldLineNumber: null,
          newLineNumber: add.lineNumber,
          prefix: '+',
          text: add.text,
          tokens
        })
      }
    }
  }

  return lines
}

export function generateSplitRows(
  blocks: DiffBlock[],
  options: {
    contextOption: DiffContextOption
    wordDiff: boolean
    ignoreCase: boolean
    expandedHunks: Set<number>
  }
): SplitRow[] {
  const rows: SplitRow[] = []
  const hasChanges = blocks.some(b => b.type === 'change')
  const ctx = options.contextOption === 'all' || !hasChanges ? 0 : parseInt(options.contextOption, 10)
  let hunkCounter = 0

  for (let bIndex = 0; bIndex < blocks.length; bIndex++) {
    const block = blocks[bIndex]
    if (!block) continue

    if (block.type === 'normal') {
      const total = block.lines.length

      const addNormalRow = (item: NormalLineItem) => {
        rows.push({
          id: `s-n-${item.oldLineNumber}-${item.newLineNumber}`,
          isHunkHeader: false,
          left: {
            type: 'normal',
            lineNumber: item.oldLineNumber,
            prefix: ' ',
            text: item.text
          },
          right: {
            type: 'normal',
            lineNumber: item.newLineNumber,
            prefix: ' ',
            text: item.text
          }
        })
      }

      if (ctx === 0) {
        for (const item of block.lines) {
          addNormalRow(item)
        }
      } else {
        const isStart = bIndex === 0
        const isEnd = bIndex === blocks.length - 1
        const { foldStart, foldEnd } = calculateFoldRange(total, isStart, isEnd, ctx)

        const isFoldable = foldEnd > foldStart
        const currentHunkIndex = isFoldable ? hunkCounter++ : -1
        const isExpanded = currentHunkIndex >= 0 && options.expandedHunks.has(currentHunkIndex)

        // 1. Pre-fold lines
        for (let i = 0; i < foldStart; i++) {
          const item = block.lines[i]
          if (item) addNormalRow(item)
        }

        // 2. Folded section or expanded
        if (isFoldable) {
          if (isExpanded) {
            for (let i = foldStart; i < foldEnd; i++) {
              const item = block.lines[i]
              if (item) addNormalRow(item)
            }
          } else {
            const hiddenCount = foldEnd - foldStart
            const firstHidden = block.lines[foldStart]
            const oldStart = firstHidden ? firstHidden.oldLineNumber : 0
            const newStart = firstHidden ? firstHidden.newLineNumber : 0

            rows.push({
              id: `s-hunk-${currentHunkIndex}`,
              isHunkHeader: true,
              hunkText: `@@ -${oldStart},${hiddenCount} +${newStart},${hiddenCount} @@`,
              hunkIndex: currentHunkIndex,
              hiddenCount,
              left: { type: 'empty', lineNumber: null, text: '' },
              right: { type: 'empty', lineNumber: null, text: '' }
            })
          }
        }

        // 3. Post-fold lines
        for (let i = foldEnd; i < total; i++) {
          const item = block.lines[i]
          if (item) addNormalRow(item)
        }
      }
    } else {
      // Change block: align left and right side by side
      const deletedLen = block.deleted.length
      const addedLen = block.added.length
      const maxLen = Math.max(deletedLen, addedLen)

      for (let k = 0; k < maxLen; k++) {
        const del = k < deletedLen ? block.deleted[k] : null
        const add = k < addedLen ? block.added[k] : null

        let leftTokens: DiffToken[] | undefined
        let rightTokens: DiffToken[] | undefined

        if (options.wordDiff && del && add) {
          const res = computeIntraLineTokens(del.text, add.text, options.ignoreCase)
          leftTokens = res.deletedTokens
          rightTokens = res.addedTokens
        }

        const leftCell: SplitCell = del
          ? {
              type: 'deleted',
              lineNumber: del.lineNumber,
              prefix: '-',
              text: del.text,
              tokens: leftTokens
            }
          : {
              type: 'empty',
              lineNumber: null,
              text: ''
            }

        const rightCell: SplitCell = add
          ? {
              type: 'added',
              lineNumber: add.lineNumber,
              prefix: '+',
              text: add.text,
              tokens: rightTokens
            }
          : {
              type: 'empty',
              lineNumber: null,
              text: ''
            }

        rows.push({
          id: `s-c-${del ? del.lineNumber : 'x'}-${add ? add.lineNumber : 'y'}`,
          isHunkHeader: false,
          left: leftCell,
          right: rightCell
        })
      }
    }
  }

  return rows
}

export function generateGitPatch(
  oldFileName: string,
  newFileName: string,
  oldText: string,
  newText: string,
  options: { context?: number, ignoreWhitespace?: boolean } = {}
): string {
  const fileA = oldFileName.trim() ? `a/${oldFileName.trim()}` : 'a/original'
  const fileB = newFileName.trim() ? `b/${newFileName.trim()}` : 'b/modified'
  return createTwoFilesPatch(fileA, fileB, oldText, newText, '', '', {
    context: options.context ?? 3,
    ignoreWhitespace: options.ignoreWhitespace ?? false
  })
}

export const SAMPLE_DIFF_OLD = `// API Client Configuration
interface ClientConfig {
  baseUrl: string;
  timeoutMs: number;
  retries: number;
  enableDebugLogs?: boolean;
}

export class ServiceClient {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
    console.log("[DEBUG] Initializing client for:", config.baseUrl);
  }

  async fetchEndpoint(route: string): Promise<Response> {
    const targetUrl = this.config.baseUrl + route;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const res = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error("HTTP error: " + res.status);
      }

      return res;
    } finally {
      clearTimeout(timeout);
    }
  }

  getVersion(): string {
    return "1.0.4";
  }
}
`

export const SAMPLE_DIFF_NEW = `// API Client Configuration (v2 Standard)
interface ClientConfig {
  baseUrl: string;
  timeoutMs: number;
  retries: number;
  apiKey?: string;
  environment: "development" | "staging" | "production";
}

export class ServiceClient {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  async fetchEndpoint(route: string): Promise<Response> {
    const targetUrl = new URL(route, this.config.baseUrl).toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const headers: Record<string, string> = {
        "Accept": "application/json",
        "X-Environment": this.config.environment,
      };

      if (this.config.apiKey) {
        headers["Authorization"] = \`Bearer \${this.config.apiKey}\`;
      }

      const res = await fetch(targetUrl, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(\`HTTP \${res.status}: \${res.statusText}\`);
      }

      return res;
    } finally {
      clearTimeout(timeout);
    }
  }

  getVersion(): string {
    return "2.1.0";
  }
}
`

export const DEFAULT_DIFF_DRAFT: DiffDraft = {
  originalText: '',
  modifiedText: '',
  originalFileName: 'service-v1.ts',
  modifiedFileName: 'service-v2.ts',
  viewMode: 'split',
  ignoreWhitespace: false,
  ignoreCase: false,
  wordDiff: true,
  wrapLines: false,
  contextOption: '3'
}
