export type DiffViewMode = 'split' | 'unified'

export type DiffContextOption = '3' | '5' | '10' | 'all'

export interface DiffToken {
  type: 'normal' | 'added' | 'deleted'
  text: string
}

export interface UnifiedLine {
  id: string
  type: 'normal' | 'added' | 'deleted' | 'hunk-header'
  oldLineNumber: number | null
  newLineNumber: number | null
  prefix: ' ' | '+' | '-' | '@'
  text: string
  tokens?: DiffToken[]
  hunkIndex?: number
  hiddenCount?: number
  hunkRange?: string
}

export interface SplitCell {
  type: 'normal' | 'added' | 'deleted' | 'empty'
  lineNumber: number | null
  prefix?: ' ' | '+' | '-'
  text: string
  tokens?: DiffToken[]
}

export interface SplitRow {
  id: string
  isHunkHeader: boolean
  hunkText?: string
  hunkIndex?: number
  hiddenCount?: number
  left: SplitCell
  right: SplitCell
}

export interface DiffStats {
  additions: number
  deletions: number
  modifications: number
  unchanged: number
  oldTotalLines: number
  newTotalLines: number
}

export interface DiffDraft {
  originalText: string
  modifiedText: string
  originalFileName: string
  modifiedFileName: string
  viewMode: DiffViewMode
  ignoreWhitespace: boolean
  ignoreCase: boolean
  wordDiff: boolean
  wrapLines: boolean
  contextOption: DiffContextOption
}
