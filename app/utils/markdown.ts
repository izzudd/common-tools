import TurndownService from 'turndown'
import { marked } from 'marked'

/**
 * Configure Turndown for clean, readable Markdown output
 */
export function createTurndownService(options?: {
  headingStyle?: 'atx' | 'setext'
  hr?: string
  bulletListMarker?: '-' | '+' | '*'
  codeBlockStyle?: 'indented' | 'fenced'
  emDelimiter?: '_' | '*'
  strongDelimiter?: '__' | '**'
}): TurndownService {
  const service = new TurndownService({
    headingStyle: options?.headingStyle ?? 'atx',
    hr: options?.hr ?? '---',
    bulletListMarker: options?.bulletListMarker ?? '-',
    codeBlockStyle: options?.codeBlockStyle ?? 'fenced',
    emDelimiter: options?.emDelimiter ?? '*',
    strongDelimiter: options?.strongDelimiter ?? '**'
  })

  // Add rule for strikethrough (del / s)
  service.addRule('strikethrough', {
    filter: ['del', 's'],
    replacement: function (content) {
      return `~~${content}~~`
    }
  })

  // Add rule for task list checkboxes
  service.addRule('taskListCheckbox', {
    filter: function (node) {
      return (
        node.nodeName === 'INPUT'
        && (node as HTMLInputElement).getAttribute('type') === 'checkbox'
      )
    },
    replacement: function (_content, node) {
      const isChecked = (node as HTMLInputElement).checked || (node as HTMLElement).hasAttribute('checked')
      return isChecked ? '[x] ' : '[ ] '
    }
  })

  // Clean table handling if table HTML is encountered
  service.addRule('table', {
    filter: 'table',
    replacement: function (_content, node) {
      const table = node as HTMLTableElement
      const rows = Array.from(table.querySelectorAll('tr'))
      if (rows.length === 0) return ''

      const matrix: string[][] = []
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('th, td')).map(cell =>
          (cell.textContent || '').trim().replace(/\|/g, '\\|').replace(/\n+/g, ' ')
        )
        if (cells.length > 0) {
          matrix.push(cells)
        }
      }

      if (matrix.length === 0) return ''

      const maxCols = Math.max(...matrix.map(r => r.length))
      const normalizedMatrix = matrix.map((r) => {
        const row = [...r]
        while (row.length < maxCols) row.push('')
        return row
      })

      const colWidths = Array.from({ length: maxCols }, (_, colIdx) => {
        return Math.max(3, ...normalizedMatrix.map(row => row[colIdx]?.length || 0))
      })

      const headerRow = normalizedMatrix[0]!
      const delimiterRow = colWidths.map(w => '-'.repeat(w))

      const outputRows: string[] = []
      outputRows.push(`| ${headerRow.map((cell, i) => cell.padEnd(colWidths[i]!)).join(' | ')} |`)
      outputRows.push(`| ${delimiterRow.join(' | ')} |`)

      for (let i = 1; i < normalizedMatrix.length; i++) {
        const row = normalizedMatrix[i]!
        outputRows.push(`| ${row.map((cell, idx) => cell.padEnd(colWidths[idx]!)).join(' | ')} |`)
      }

      return `\n\n${outputRows.join('\n')}\n\n`
    }
  })

  return service
}

/**
 * Converts HTML string to clean Markdown
 */
export function htmlToMarkdown(
  html: string,
  options?: {
    headingStyle?: 'atx' | 'setext'
    codeBlockStyle?: 'indented' | 'fenced'
    bulletListMarker?: '-' | '+' | '*'
  }
): string {
  if (!html.trim()) return ''
  const turndown = createTurndownService(options)
  return turndown.turndown(html).trim()
}

/**
 * Converts Markdown string to HTML
 */
export function markdownToHtml(
  markdown: string,
  options?: {
    breaks?: boolean
    gfm?: boolean
  }
): string {
  if (!markdown.trim()) return ''
  return marked.parse(markdown, {
    breaks: options?.breaks ?? true,
    gfm: options?.gfm ?? true,
    async: false
  }) as string
}

/**
 * Generates Google Docs / Word clipboard compatible styled HTML from Markdown.
 * Google Docs / Word preserves formatting when pasting rich text HTML with inline CSS styling.
 */
export function markdownToDocsHtml(markdown: string): string {
  if (!markdown.trim()) return ''

  const baseHtml = markdownToHtml(markdown, { breaks: true, gfm: true })

  // Inline CSS styles tailored specifically for Google Docs & MS Word paste clipboard engine
  const styledHtml = `
<div style="font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.5; color: #1f2937;">
${baseHtml}
</div>
`
    // Enhance headings
    .replace(/<h1>/g, '<h1 style="font-size: 20pt; font-weight: bold; margin-top: 18pt; margin-bottom: 6pt; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 4pt;">')
    .replace(/<h2>/g, '<h2 style="font-size: 16pt; font-weight: bold; margin-top: 14pt; margin-bottom: 4pt; color: #1f2937; border-bottom: 1px solid #f3f4f6; padding-bottom: 3pt;">')
    .replace(/<h3>/g, '<h3 style="font-size: 13pt; font-weight: bold; margin-top: 10pt; margin-bottom: 3pt; color: #374151;">')
    .replace(/<h4>/g, '<h4 style="font-size: 11pt; font-weight: bold; margin-top: 8pt; margin-bottom: 2pt; color: #4b5563;">')
    // Enhance paragraphs
    .replace(/<p>/g, '<p style="margin-top: 0pt; margin-bottom: 8pt; line-height: 1.5;">')
    // Enhance blockquotes
    .replace(/<blockquote>/g, '<blockquote style="border-left: 3pt solid #10b981; padding-left: 10pt; margin-left: 0; margin-right: 0; margin-top: 8pt; margin-bottom: 8pt; color: #4b5563; font-style: italic; background-color: #f9fafb; padding-top: 4pt; padding-bottom: 4pt;">')
    // Enhance code blocks
    .replace(/<pre><code(?:\s+class="[^"]*")?>/g, '<pre style="background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4pt; padding: 10pt; font-family: \'Consolas\', \'Courier New\', monospace; font-size: 9.5pt; color: #1f2937; margin-top: 8pt; margin-bottom: 8pt; line-height: 1.4; white-space: pre-wrap; word-break: break-word;"><code style="font-family: inherit;">')
    // Enhance inline code
    .replace(/<code>/g, '<code style="background-color: #f3f4f6; color: #d97706; padding: 2pt 4pt; border-radius: 3pt; font-family: \'Consolas\', \'Courier New\', monospace; font-size: 9.5pt; border: 1px solid #e5e7eb;">')
    // Enhance tables for Google Docs
    .replace(/<table>/g, '<table style="border-collapse: collapse; width: 100%; margin-top: 10pt; margin-bottom: 10pt; font-size: 10pt; border: 1px solid #d1d5db;">')
    .replace(/<th>/g, '<th style="border: 1px solid #d1d5db; background-color: #f3f4f6; padding: 6pt 10pt; font-weight: bold; text-align: left; color: #111827;">')
    .replace(/<td>/g, '<td style="border: 1px solid #d1d5db; padding: 6pt 10pt; color: #374151;">')
    // Enhance lists
    .replace(/<ul>/g, '<ul style="margin-top: 0pt; margin-bottom: 8pt; padding-left: 20pt;">')
    .replace(/<ol>/g, '<ol style="margin-top: 0pt; margin-bottom: 8pt; padding-left: 20pt;">')
    .replace(/<li>/g, '<li style="margin-bottom: 3pt; line-height: 1.5;">')
    // Enhance horizontal rule
    .replace(/<hr\s*\/?>/g, '<hr style="border: 0; border-top: 1px solid #d1d5db; margin: 16pt 0;">')
    // Enhance links
    .replace(/<a /g, '<a style="color: #2563eb; text-decoration: underline;" ')

  return styledHtml.trim()
}

/**
 * Copies styled rich HTML + fallback plain text to user clipboard via ClipboardItem
 */
export async function copyRichHtmlToClipboard(html: string, fallbackPlain: string): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.clipboard) {
    return false
  }

  try {
    if (typeof ClipboardItem !== 'undefined') {
      const blobHtml = new Blob([html], { type: 'text/html' })
      const blobText = new Blob([fallbackPlain], { type: 'text/plain' })
      const clipboardItem = new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText
      })
      await navigator.clipboard.write([clipboardItem])
      return true
    }

    // Fallback using document.execCommand if ClipboardItem not supported
    const container = document.createElement('div')
    container.innerHTML = html
    container.style.position = 'fixed'
    container.style.pointerEvents = 'none'
    container.style.opacity = '0'
    document.body.appendChild(container)

    const range = document.createRange()
    range.selectNodeContents(container)
    const selection = window.getSelection()
    if (selection) {
      selection.removeAllRanges()
      selection.addRange(range)
      document.execCommand('copy')
      selection.removeAllRanges()
    }
    document.body.removeChild(container)
    return true
  } catch {
    // If rich copy fails, fallback to simple plain text copy
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(fallbackPlain)
      return true
    }
    return false
  }
}
