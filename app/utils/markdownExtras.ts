/**
 * Formats Markdown table rows to have aligned columns
 */
export function formatMarkdownTable(markdown: string): string {
  const lines = markdown.split(/\r?\n/)
  const result: string[] = []
  let tableBuffer: string[] = []

  function flushTable() {
    if (tableBuffer.length === 0) return

    const rows = tableBuffer.map((line) => {
      const trimmed = line.trim()
      const rawCells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|')
      return rawCells.map(c => c.trim())
    })

    const maxCols = Math.max(...rows.map(r => r.length))
    if (maxCols <= 1 || rows.length < 2) {
      result.push(...tableBuffer)
      tableBuffer = []
      return
    }

    // Determine column widths
    const colWidths = Array.from({ length: maxCols }, (_, colIdx) => {
      return Math.max(
        3,
        ...rows.map(row => (row[colIdx] ? row[colIdx].length : 0))
      )
    })

    // Detect alignments from separator row (index 1)
    const alignments: ('left' | 'center' | 'right')[] = []
    const sepRow = rows[1] || []
    for (let c = 0; c < maxCols; c++) {
      const cell = sepRow[c] || ''
      if (cell.startsWith(':') && cell.endsWith(':')) {
        alignments.push('center')
      } else if (cell.endsWith(':')) {
        alignments.push('right')
      } else {
        alignments.push('left')
      }
    }

    rows.forEach((row, rowIndex) => {
      const paddedCells = Array.from({ length: maxCols }, (_, c) => {
        const val = row[c] || ''
        const width = colWidths[c] || 3
        if (rowIndex === 1) {
          // Separator row
          const align = alignments[c]
          if (align === 'center') {
            return `:${'-'.repeat(Math.max(1, width - 2))}:`
          } else if (align === 'right') {
            return `${'-'.repeat(Math.max(1, width - 1))}:`
          } else if (val.startsWith(':')) {
            return `:${'-'.repeat(Math.max(1, width - 1))}`
          } else {
            return '-'.repeat(width)
          }
        }

        const align = alignments[c]
        if (align === 'right') {
          return val.padStart(width)
        } else if (align === 'center') {
          const totalPad = width - val.length
          const leftPad = Math.floor(totalPad / 2)
          const rightPad = totalPad - leftPad
          return ' '.repeat(leftPad) + val + ' '.repeat(rightPad)
        } else {
          return val.padEnd(width)
        }
      })

      result.push(`| ${paddedCells.join(' | ')} |`)
    })

    tableBuffer = []
  }

  for (const line of lines) {
    if (line.trim().startsWith('|') && line.includes('|', 1)) {
      tableBuffer.push(line)
    } else {
      flushTable()
      result.push(line)
    }
  }
  flushTable()

  return result.join('\n')
}

export interface TocItem {
  level: number
  text: string
  slug: string
}

/**
 * Extracts Table of Contents from Markdown headings
 */
export function generateMarkdownToc(markdown: string): { tocMarkdown: string, items: TocItem[] } {
  const lines = markdown.split(/\r?\n/)
  const items: TocItem[] = []
  const slugCounts = new Map<string, number>()

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match && match[1] && match[2]) {
      const level = match[1].length
      const rawText = match[2].trim().replace(/[*_`~[\]]/g, '')
      let slug = rawText
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')

      if (!slug) slug = 'heading'

      const count = slugCounts.get(slug) || 0
      slugCounts.set(slug, count + 1)
      if (count > 0) {
        slug = `${slug}-${count}`
      }

      items.push({ level, text: rawText, slug })
    }
  }

  if (items.length === 0) {
    return { tocMarkdown: '', items: [] }
  }

  const minLevel = Math.min(...items.map(i => i.level))
  const tocMarkdown = items
    .map((i) => {
      const indent = '  '.repeat(Math.max(0, i.level - minLevel))
      return `${indent}- [${i.text}](#${i.slug})`
    })
    .join('\n')

  return { tocMarkdown, items }
}

/**
 * Strips all markdown syntax to plain text
 */
export function stripMarkdown(markdown: string): string {
  let text = markdown
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Remove links but keep anchor text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Remove headings
    .replace(/^#{1,6}\s+/gm, '')
    // Remove blockquotes
    .replace(/^\s*>\s+/gm, '')
    // Remove bold and italics
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove strikethrough
    .replace(/~~(.*?)~~/g, '$1')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Clean list bullets
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove task checkboxes
    .replace(/\[[ xX]\]\s*/g, '')

  // Normalize excessive newlines
  text = text.replace(/\n{3,}/g, '\n\n').trim()
  return text
}
