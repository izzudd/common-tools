export type SqlDialect = 'mysql' | 'postgres' | 'sqlite' | 'mssql'

export interface ParsedTable {
  headers: string[]
  rows: string[][]
}

export type InferredColumnType = 'integer' | 'numeric' | 'boolean' | 'date' | 'text'

export interface ColumnTypeInfo {
  name: string
  inferredType: InferredColumnType
  sqlType: string
}

export interface SqlExportOptions {
  headers: string[]
  rows: string[][]
  dialect: SqlDialect
  tableName?: string
  createTable?: boolean
  dropTable?: boolean
  ifNotExists?: boolean
  multiRowInsert?: boolean
  emptyAsNull?: boolean
  batchSize?: number
}

/**
 * Robust RFC 4180 compliant CSV / TSV parser.
 * Handles quoted fields, inner escaped quotes, multiline values, and auto-detects delimiter.
 */
export function parseCsv(text: string, customDelimiter?: string): ParsedTable {
  const trimmed = text.trim()
  if (!trimmed) {
    return { headers: [], rows: [] }
  }

  // Auto-detect delimiter if not explicitly provided
  let delimiter = customDelimiter
  if (!delimiter) {
    const firstLine = trimmed.split(/\r?\n/)[0] || ''
    const commaCount = (firstLine.match(/,/g) || []).length
    const tabCount = (firstLine.match(/\t/g) || []).length
    const semicolonCount = (firstLine.match(/;/g) || []).length
    const pipeCount = (firstLine.match(/\|/g) || []).length

    if (tabCount > commaCount && tabCount > semicolonCount) {
      delimiter = '\t'
    } else if (semicolonCount > commaCount && semicolonCount > tabCount) {
      delimiter = ';'
    } else if (pipeCount > commaCount && pipeCount > tabCount) {
      delimiter = '|'
    } else {
      delimiter = ','
    }
  }

  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  let i = 0

  while (i < trimmed.length) {
    const char = trimmed[i]
    const nextChar = trimmed[i + 1]

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentField += '"'
          i += 2
          continue
        } else {
          // Closing quote
          inQuotes = false
          i++
          continue
        }
      } else {
        currentField += char
        i++
        continue
      }
    } else {
      if (char === '"') {
        inQuotes = true
        i++
        continue
      } else if (char === delimiter) {
        currentRow.push(currentField)
        currentField = ''
        i++
        continue
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField)
        rows.push(currentRow)
        currentRow = []
        currentField = ''
        i += 2
        continue
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentField)
        rows.push(currentRow)
        currentRow = []
        currentField = ''
        i++
        continue
      } else {
        currentField += char
        i++
        continue
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField)
    rows.push(currentRow)
  }

  // Filter out trailing blank rows
  const cleanRows = rows.filter(r => r.some(cell => cell.trim() !== ''))
  if (cleanRows.length === 0) {
    return { headers: [], rows: [] }
  }

  const rawHeaders = cleanRows[0] ?? []
  const headers = rawHeaders.map((h, idx) => h.trim() || `column_${idx + 1}`)

  const dataRows = cleanRows.slice(1).map((row) => {
    if (row.length < headers.length) {
      return [...row, ...Array<string>(headers.length - row.length).fill('')]
    }
    return row.slice(0, headers.length)
  })

  return { headers, rows: dataRows }
}

/**
 * Serialize headers and rows back into CSV or TSV string with proper quoting.
 */
export function serializeCsv(headers: string[], rows: string[][], delimiter = ','): string {
  const escapeCell = (cell: string) => {
    if (cell.includes(delimiter) || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
      return `"${cell.replace(/"/g, '""')}"`
    }
    return cell
  }

  const lines = [
    headers.map(escapeCell).join(delimiter),
    ...rows.map(row => row.map(escapeCell).join(delimiter))
  ]
  return lines.join('\n')
}

/**
 * Infer column data types across all rows for SQL creation and typed JSON parsing.
 */
export function inferColumnTypes(headers: string[], rows: string[][], dialect: SqlDialect = 'mysql'): ColumnTypeInfo[] {
  return headers.map((header, colIndex) => {
    const values = rows
      .map(row => row[colIndex] ?? '')
      .map(val => val.trim())
      .filter(val => val !== '')

    if (values.length === 0) {
      return {
        name: header,
        inferredType: 'text',
        sqlType: getSqlType('text', dialect)
      }
    }

    let isInteger = true
    let isNumeric = true
    let isBoolean = true
    let isDate = true
    let maxLen = 0

    const boolRegex = /^(true|false|yes|no|1|0)$/i
    const intRegex = /^-?\d+$/
    const numRegex = /^-?\d+(\.\d+)?$/
    const dateRegex = /^\d{4}-\d{2}-\d{2}(([T\s]\d{2}:\d{2}(:\d{2})?)?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/

    for (const val of values) {
      if (val.length > maxLen) maxLen = val.length
      if (isBoolean && !boolRegex.test(val)) isBoolean = false
      if (isInteger && !intRegex.test(val)) isInteger = false
      if (isNumeric && !numRegex.test(val)) isNumeric = false
      if (isDate && !dateRegex.test(val)) isDate = false
    }

    let inferred: InferredColumnType = 'text'
    if (isInteger) {
      inferred = 'integer'
    } else if (isNumeric) {
      inferred = 'numeric'
    } else if (isBoolean) {
      inferred = 'boolean'
    } else if (isDate) {
      inferred = 'date'
    }

    return {
      name: header,
      inferredType: inferred,
      sqlType: getSqlType(inferred, dialect, maxLen)
    }
  })
}

function getSqlType(type: InferredColumnType, dialect: SqlDialect, maxLen = 0): string {
  switch (dialect) {
    case 'mysql':
      switch (type) {
        case 'integer':
          return maxLen > 9 ? 'BIGINT' : 'INT'
        case 'numeric':
          return 'DECIMAL(12, 4)'
        case 'boolean':
          return 'BOOLEAN'
        case 'date':
          return 'DATETIME'
        case 'text':
          return maxLen > 255 ? 'TEXT' : 'VARCHAR(255)'
      }
      break

    case 'postgres':
      switch (type) {
        case 'integer':
          return maxLen > 9 ? 'BIGINT' : 'INTEGER'
        case 'numeric':
          return 'NUMERIC'
        case 'boolean':
          return 'BOOLEAN'
        case 'date':
          return 'TIMESTAMP'
        case 'text':
          return maxLen > 255 ? 'TEXT' : 'VARCHAR(255)'
      }
      break

    case 'sqlite':
      switch (type) {
        case 'integer':
          return 'INTEGER'
        case 'numeric':
          return 'REAL'
        case 'boolean':
          return 'INTEGER' // SQLite represents boolean as 0/1
        case 'date':
          return 'TEXT'
        case 'text':
          return 'TEXT'
      }
      break

    case 'mssql':
      switch (type) {
        case 'integer':
          return maxLen > 9 ? 'BIGINT' : 'INT'
        case 'numeric':
          return 'FLOAT'
        case 'boolean':
          return 'BIT'
        case 'date':
          return 'DATETIME2'
        case 'text':
          return maxLen > 255 ? 'NVARCHAR(MAX)' : 'NVARCHAR(255)'
      }
      break
  }
}

function quoteIdentifier(name: string, dialect: SqlDialect): string {
  const clean = name.replace(/[^\w\d_]/g, '_')
  switch (dialect) {
    case 'mysql':
      return `\`${clean}\``
    case 'postgres':
    case 'sqlite':
      return `"${clean}"`
    case 'mssql':
      return `[${clean}]`
  }
}

/**
 * Format a cell value into SQL literal representation.
 */
function formatSqlValue(
  value: string,
  colInfo: ColumnTypeInfo,
  dialect: SqlDialect,
  emptyAsNull = true
): string {
  const trimmed = value.trim()
  if (emptyAsNull && trimmed === '') {
    return 'NULL'
  }

  switch (colInfo.inferredType) {
    case 'integer':
    case 'numeric':
      if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        return trimmed
      }
      break

    case 'boolean': {
      const lower = trimmed.toLowerCase()
      if (lower === 'true' || lower === 'yes' || lower === '1') {
        if (dialect === 'sqlite' || dialect === 'mssql') return '1'
        return 'TRUE'
      } else if (lower === 'false' || lower === 'no' || lower === '0') {
        if (dialect === 'sqlite' || dialect === 'mssql') return '0'
        return 'FALSE'
      }
      break
    }
  }

  // Standard string literal: escape single quotes by doubling them ''
  const escaped = value.replace(/'/g, '\'\'')
  return `'${escaped}'`
}

/**
 * Generate full SQL statements (CREATE TABLE & INSERT INTO).
 */
export function tableToSql(options: SqlExportOptions): string {
  const {
    headers,
    rows,
    dialect,
    tableName = 'imported_data',
    createTable = true,
    dropTable = true,
    ifNotExists = true,
    multiRowInsert = true,
    emptyAsNull = true,
    batchSize = 250
  } = options

  if (headers.length === 0) return ''

  const colTypes = inferColumnTypes(headers, rows, dialect)
  const safeTableName = quoteIdentifier(tableName, dialect)
  const sqlLines: string[] = []

  // Header comment
  sqlLines.push(`-- SQL Export: ${tableName} (${dialect.toUpperCase()})`)
  sqlLines.push(`-- Generated by DevPocket on ${new Date().toISOString()}`)
  sqlLines.push('')

  // DROP TABLE
  if (dropTable) {
    sqlLines.push(`DROP TABLE IF EXISTS ${safeTableName};`)
    sqlLines.push('')
  }

  // CREATE TABLE
  if (createTable) {
    const ifNotExistsClause = ifNotExists && !dropTable ? 'IF NOT EXISTS ' : ''
    sqlLines.push(`CREATE TABLE ${ifNotExistsClause}${safeTableName} (`)
    const colDefs = colTypes.map((col, idx) => {
      const comma = idx < colTypes.length - 1 ? ',' : ''
      return `  ${quoteIdentifier(col.name, dialect)} ${col.sqlType}${comma}`
    })
    sqlLines.push(colDefs.join('\n'))
    sqlLines.push(');')
    sqlLines.push('')
  }

  // INSERT INTO
  if (rows.length > 0) {
    const quotedCols = headers.map(h => quoteIdentifier(h, dialect)).join(', ')

    if (multiRowInsert && dialect !== 'sqlite') {
      // Chunk inserts according to batchSize
      for (let i = 0; i < rows.length; i += batchSize) {
        const chunk = rows.slice(i, i + batchSize)
        sqlLines.push(`INSERT INTO ${safeTableName} (${quotedCols}) VALUES`)
        const valuesList = chunk.map((row, rowIdx) => {
          const rowVals = row.map((cell, cIdx) => {
            const col = colTypes[cIdx] ?? { name: `col_${cIdx}`, inferredType: 'text', sqlType: 'TEXT' }
            return formatSqlValue(cell, col, dialect, emptyAsNull)
          })
          const isLastInChunk = rowIdx === chunk.length - 1
          return `(${rowVals.join(', ')})${isLastInChunk ? ';' : ','}`
        })
        sqlLines.push(valuesList.join('\n'))
        sqlLines.push('')
      }
    } else {
      // SQLite or single-row insert mode
      for (const row of rows) {
        const rowVals = row.map((cell, cIdx) => {
          const col = colTypes[cIdx] ?? { name: `col_${cIdx}`, inferredType: 'text', sqlType: 'TEXT' }
          return formatSqlValue(cell, col, dialect, emptyAsNull)
        })
        sqlLines.push(`INSERT INTO ${safeTableName} (${quotedCols}) VALUES (${rowVals.join(', ')});`)
      }
    }
  }

  return sqlLines.join('\n').trim()
}

/**
 * Convert tabular data to JSON Lines (.jsonl).
 */
export function tableToJsonl(headers: string[], rows: string[][], parseTypes = true): string {
  const colTypes = parseTypes ? inferColumnTypes(headers, rows) : []

  return rows.map((row) => {
    const obj: Record<string, unknown> = {}
    headers.forEach((header, idx) => {
      const raw = row[idx] ?? ''
      if (!parseTypes) {
        obj[header] = raw
        return
      }

      const col = colTypes[idx]
      if (!col || raw.trim() === '') {
        obj[header] = raw === '' ? null : raw
        return
      }

      switch (col.inferredType) {
        case 'integer':
          obj[header] = Number.parseInt(raw, 10)
          break
        case 'numeric':
          obj[header] = Number.parseFloat(raw)
          break
        case 'boolean': {
          const l = raw.toLowerCase()
          obj[header] = l === 'true' || l === 'yes' || l === '1'
          break
        }
        default:
          obj[header] = raw
      }
    })
    return JSON.stringify(obj)
  }).join('\n')
}

/**
 * Convert tabular data to standard JSON array.
 */
export function tableToJson(headers: string[], rows: string[][], parseTypes = true, indent = 2): string {
  const colTypes = parseTypes ? inferColumnTypes(headers, rows) : []

  const records = rows.map((row) => {
    const obj: Record<string, unknown> = {}
    headers.forEach((header, idx) => {
      const raw = row[idx] ?? ''
      if (!parseTypes) {
        obj[header] = raw
        return
      }

      const col = colTypes[idx]
      if (!col || raw.trim() === '') {
        obj[header] = raw === '' ? null : raw
        return
      }

      switch (col.inferredType) {
        case 'integer':
          obj[header] = Number.parseInt(raw, 10)
          break
        case 'numeric':
          obj[header] = Number.parseFloat(raw)
          break
        case 'boolean': {
          const l = raw.toLowerCase()
          obj[header] = l === 'true' || l === 'yes' || l === '1'
          break
        }
        default:
          obj[header] = raw
      }
    })
    return obj
  })

  return JSON.stringify(records, null, indent)
}

/**
 * Convert tabular data to Markdown Table.
 */
export function tableToMarkdown(headers: string[], rows: string[][]): string {
  if (headers.length === 0) return ''

  const colWidths = headers.map((h, i) => {
    let max = h.length
    for (const r of rows) {
      const cellLen = (r[i] ?? '').length
      if (cellLen > max) max = cellLen
    }
    return Math.max(max, 3)
  })

  const escapeMd = (str: string) => str.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')

  const headerRow = '| ' + headers.map((h, i) => escapeMd(h).padEnd(colWidths[i] ?? 3)).join(' | ') + ' |'
  const dividerRow = '| ' + colWidths.map(w => ':'.padEnd(w, '-')).join(' | ') + ' |'
  const dataRows = rows.map((row) => {
    return '| ' + headers.map((_, i) => escapeMd(row[i] ?? '').padEnd(colWidths[i] ?? 3)).join(' | ') + ' |'
  })

  return [headerRow, dividerRow, ...dataRows].join('\n')
}

/**
 * Convert tabular data to HTML Table.
 */
export function tableToHtml(headers: string[], rows: string[][]): string {
  const escapeHtml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const html: string[] = ['<table class="data-table">']
  html.push('  <thead>')
  html.push('    <tr>')
  for (const h of headers) {
    html.push(`      <th>${escapeHtml(h)}</th>`)
  }
  html.push('    </tr>')
  html.push('  </thead>')
  html.push('  <tbody>')
  for (const row of rows) {
    html.push('    <tr>')
    for (let i = 0; i < headers.length; i++) {
      html.push(`      <td>${escapeHtml(row[i] ?? '')}</td>`)
    }
    html.push('    </tr>')
  }
  html.push('  </tbody>')
  html.push('</table>')

  return html.join('\n')
}

/**
 * Convert tabular data to YAML.
 */
export function tableToYaml(headers: string[], rows: string[][], parseTypes = true): string {
  const colTypes = parseTypes ? inferColumnTypes(headers, rows) : []
  const yamlLines: string[] = []

  for (const row of rows) {
    yamlLines.push(`- ${headers[0]}: ${formatYamlVal(row[0] ?? '', colTypes[0], parseTypes)}`)
    for (let i = 1; i < headers.length; i++) {
      yamlLines.push(`  ${headers[i]}: ${formatYamlVal(row[i] ?? '', colTypes[i], parseTypes)}`)
    }
  }

  return yamlLines.join('\n')
}

function formatYamlVal(val: string, col?: ColumnTypeInfo, parseTypes = true): string {
  if (val.trim() === '') return 'null'
  if (!parseTypes || !col) {
    if (val.includes('\n') || val.includes(':') || val.includes('#') || val.startsWith('"') || val.startsWith('\'')) {
      return JSON.stringify(val)
    }
    return val
  }

  switch (col.inferredType) {
    case 'integer':
    case 'numeric':
      return val
    case 'boolean': {
      const l = val.toLowerCase()
      return l === 'true' || l === 'yes' || l === '1' ? 'true' : 'false'
    }
    default:
      if (val.includes('\n') || val.includes(':') || val.includes('#') || val.startsWith('"') || val.startsWith('\'')) {
        return JSON.stringify(val)
      }
      return val
  }
}
