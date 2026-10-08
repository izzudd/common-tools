<script setup lang="ts">
import { useClipboardAction } from '~/composables/useClipboardAction'
import {
  parseCsv,
  tableToSql,
  tableToJsonl,
  tableToJson,
  serializeCsv,
  tableToMarkdown,
  tableToHtml,
  tableToYaml,
  type SqlDialect
} from '~/utils/csv'

type ExportFormat = 'sql' | 'jsonl' | 'json' | 'tsv' | 'markdown' | 'html' | 'yaml'

// Page-isolated state
const input = ref('')
const output = ref('')
const selectedFormat = ref<ExportFormat>('sql')

// Delimiter & Parse Options
const delimiterChoice = ref<'auto' | ',' | '\t' | ';' | '|'>('auto')

// SQL Specific Options
const sqlDialect = ref<SqlDialect>('mysql')
const sqlTableName = ref('users')
const sqlCreateTable = ref(true)
const sqlDropTable = ref(true)
const sqlIfNotExists = ref(true)
const sqlMultiRow = ref(true)
const sqlEmptyAsNull = ref(true)
const sqlBatchSize = ref(250)

// JSON / Other Options
const parseDataTypes = ref(true)
const jsonIndent = ref<number>(2)

const { copied, copyToClipboard } = useClipboardAction()
const toast = useToast()

const sampleCsv = `id,name,email,role,salary,is_active,joined_date
1,Alice Smith,alice@example.com,Engineering Lead,125000.50,true,2023-03-15
2,Bob Jones,bob@example.com,Senior Frontend,98000.00,true,2023-06-01
3,Carol White,carol@example.com,Product Manager,110000.00,true,2022-11-20
4,David Brown,david@example.com,DevOps Specialist,105000.75,false,2024-01-10
5,Emma Watson,emma@example.com,UX Designer,88000.00,true,2024-04-05`

function loadSample() {
  input.value = sampleCsv
  convertData()
}

function clearAll() {
  input.value = ''
  output.value = ''
}

function convertData() {
  const raw = input.value.trim()
  if (!raw) {
    output.value = ''
    return
  }

  const forcedDelimiter = delimiterChoice.value === 'auto' ? undefined : delimiterChoice.value
  const { headers, rows } = parseCsv(raw, forcedDelimiter)

  if (headers.length === 0) {
    output.value = ''
    return
  }

  switch (selectedFormat.value) {
    case 'sql':
      output.value = tableToSql({
        headers,
        rows,
        dialect: sqlDialect.value,
        tableName: sqlTableName.value.trim() || 'imported_data',
        createTable: sqlCreateTable.value,
        dropTable: sqlDropTable.value,
        ifNotExists: sqlIfNotExists.value,
        multiRowInsert: sqlMultiRow.value,
        emptyAsNull: sqlEmptyAsNull.value,
        batchSize: sqlBatchSize.value
      })
      break

    case 'jsonl':
      output.value = tableToJsonl(headers, rows, parseDataTypes.value)
      break

    case 'json':
      output.value = tableToJson(headers, rows, parseDataTypes.value, jsonIndent.value)
      break

    case 'tsv':
      output.value = serializeCsv(headers, rows, '\t')
      break

    case 'markdown':
      output.value = tableToMarkdown(headers, rows)
      break

    case 'html':
      output.value = tableToHtml(headers, rows)
      break

    case 'yaml':
      output.value = tableToYaml(headers, rows, parseDataTypes.value)
      break
  }
}

watch(
  [
    input,
    selectedFormat,
    delimiterChoice,
    sqlDialect,
    sqlTableName,
    sqlCreateTable,
    sqlDropTable,
    sqlIfNotExists,
    sqlMultiRow,
    sqlEmptyAsNull,
    sqlBatchSize,
    parseDataTypes,
    jsonIndent
  ],
  () => {
    convertData()
  }
)

function handleFileUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    const content = event.target?.result as string
    if (content) {
      input.value = content
      // Infer table name from filename
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^\w\d_]/g, '_')
      if (baseName) sqlTableName.value = baseName
      convertData()
    }
  }
  reader.readAsText(file)
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      input.value = text
      convertData()
      toast.add({
        title: 'Pasted from Clipboard',
        color: 'success'
      })
    }
  } catch {
    toast.add({
      title: 'Clipboard Permission Denied',
      description: 'Please paste directly into the text editor (Ctrl+V)',
      color: 'warning'
    })
  }
}

function downloadOutput() {
  if (!output.value) return

  let ext = 'txt'
  let mime = 'text/plain'

  switch (selectedFormat.value) {
    case 'sql':
      ext = 'sql'
      mime = 'application/sql'
      break
    case 'jsonl':
      ext = 'jsonl'
      mime = 'application/x-ndjson'
      break
    case 'json':
      ext = 'json'
      mime = 'application/json'
      break
    case 'tsv':
      ext = 'tsv'
      mime = 'text/tab-separated-values'
      break
    case 'markdown':
      ext = 'md'
      mime = 'text/markdown'
      break
    case 'html':
      ext = 'html'
      mime = 'text/html'
      break
    case 'yaml':
      ext = 'yaml'
      mime = 'text/yaml'
      break
  }

  const filename = `${sqlTableName.value || 'table'}.${ext}`
  const blob = new Blob([output.value], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)

  toast.add({
    title: 'File Downloaded',
    description: `Saved as ${filename}`,
    color: 'success'
  })
}

const stats = computed(() => {
  const inText = input.value
  const outText = output.value
  const inLines = inText ? inText.trim().split(/\r?\n/).length : 0
  const outLines = outText ? outText.split('\n').length : 0
  const firstLine = inText.trim().split(/\r?\n/)[0] || ''
  const parsed = parseCsv(firstLine)

  return {
    inChars: inText.length,
    outChars: outText.length,
    inLines,
    outLines,
    columns: parsed.headers.length,
    inBytes: new Blob([inText]).size,
    outBytes: new Blob([outText]).size
  }
})
</script>

<template>
  <div class="space-y-6">
    <ToolHeader
      title="CSV to SQL & Multi-Format Converter"
      description="Convert CSV and tabular data into SQL (MySQL, PostgreSQL, SQLite, MSSQL), JSONL, TSV, JSON, Markdown, and HTML."
      icon="i-lucide-database"
      category="Table Tools"
      badge="Multi-Format"
      :copy-text="output"
      :disable-copy="!output"
      @load-sample="loadSample"
      @clear="clearAll"
    >
      <template #actions>
        <div class="flex flex-wrap items-center justify-between gap-3 w-full">
          <!-- Target Format Selector -->
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-muted font-medium">Export Format:</span>
            <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
              <button
                v-for="fmt in ([
                  { id: 'sql', label: 'SQL' },
                  { id: 'jsonl', label: 'JSONL' },
                  { id: 'tsv', label: 'TSV' },
                  { id: 'json', label: 'JSON' },
                  { id: 'markdown', label: 'Markdown' },
                  { id: 'html', label: 'HTML' },
                  { id: 'yaml', label: 'YAML' }
                ] as const)"
                :key="fmt.id"
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
                :class="selectedFormat === fmt.id ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
                @click="selectedFormat = fmt.id"
              >
                {{ fmt.label }}
              </button>
            </div>
          </div>

          <!-- Utility Actions -->
          <div class="flex items-center gap-2">
            <UButton
              to="/table/editor"
              icon="i-lucide-table-properties"
              label="Table Editor Grid"
              size="xs"
              color="neutral"
              variant="outline"
            />

            <UButton
              v-if="output"
              icon="i-lucide-download"
              label="Download File"
              size="xs"
              color="primary"
              variant="outline"
              @click="downloadOutput"
            />
          </div>
        </div>

        <!-- Format-specific Options Row -->
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs pt-2 border-t border-default/50 w-full">
          <!-- SQL Config Controls -->
          <template v-if="selectedFormat === 'sql'">
            <!-- Dialect Selector -->
            <div class="flex items-center gap-2">
              <span class="text-muted">Dialect:</span>
              <div class="inline-flex rounded border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900 font-mono text-[11px]">
                <button
                  v-for="d in (['mysql', 'postgres', 'sqlite', 'mssql'] as SqlDialect[])"
                  :key="d"
                  type="button"
                  class="px-2 py-0.5 rounded capitalize"
                  :class="sqlDialect === d ? 'bg-neutral-200 dark:bg-neutral-800 text-highlighted font-semibold' : 'text-muted hover:text-highlighted'"
                  @click="sqlDialect = d"
                >
                  {{ d === 'postgres' ? 'PostgreSQL' : d === 'mssql' ? 'SQL Server' : d }}
                </button>
              </div>
            </div>

            <!-- Table Name Input -->
            <div class="flex items-center gap-1.5">
              <span class="text-muted">Table Name:</span>
              <input
                v-model="sqlTableName"
                type="text"
                class="w-28 px-2 py-0.5 text-xs font-mono rounded border border-default bg-neutral-100 dark:bg-neutral-900 text-highlighted focus:outline-none focus:ring-1 focus:ring-primary"
              >
            </div>

            <!-- Create Table Toggle -->
            <label class="flex items-center gap-1.5 text-muted hover:text-highlighted cursor-pointer select-none">
              <input
                v-model="sqlCreateTable"
                type="checkbox"
                class="rounded border-default text-primary focus:ring-primary/20"
              >
              <span>CREATE TABLE</span>
            </label>

            <!-- Drop Table Toggle -->
            <label
              v-if="sqlCreateTable"
              class="flex items-center gap-1.5 text-muted hover:text-highlighted cursor-pointer select-none"
            >
              <input
                v-model="sqlDropTable"
                type="checkbox"
                class="rounded border-default text-primary focus:ring-primary/20"
              >
              <span>DROP TABLE IF EXISTS</span>
            </label>

            <!-- Multi-row insert -->
            <label
              v-if="sqlDialect !== 'sqlite'"
              class="flex items-center gap-1.5 text-muted hover:text-highlighted cursor-pointer select-none"
            >
              <input
                v-model="sqlMultiRow"
                type="checkbox"
                class="rounded border-default text-primary focus:ring-primary/20"
              >
              <span>Multi-row INSERT</span>
            </label>

            <!-- Empty strings as NULL -->
            <label class="flex items-center gap-1.5 text-muted hover:text-highlighted cursor-pointer select-none">
              <input
                v-model="sqlEmptyAsNull"
                type="checkbox"
                class="rounded border-default text-primary focus:ring-primary/20"
              >
              <span>Empty as NULL</span>
            </label>
          </template>

          <!-- JSON & JSONL Controls -->
          <template v-else-if="selectedFormat === 'jsonl' || selectedFormat === 'json' || selectedFormat === 'yaml'">
            <label class="flex items-center gap-2 text-muted hover:text-highlighted cursor-pointer select-none">
              <input
                v-model="parseDataTypes"
                type="checkbox"
                class="rounded border-default text-primary focus:ring-primary/20"
              >
              <span>Auto-detect types (numbers, booleans)</span>
            </label>

            <div
              v-if="selectedFormat === 'json'"
              class="flex items-center gap-2"
            >
              <span class="text-muted">Indent:</span>
              <div class="inline-flex rounded border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900 text-[11px]">
                <button
                  type="button"
                  class="px-2 py-0.5 rounded"
                  :class="jsonIndent === 2 ? 'bg-neutral-200 dark:bg-neutral-800 text-highlighted font-semibold' : 'text-muted'"
                  @click="jsonIndent = 2"
                >
                  2 spaces
                </button>
                <button
                  type="button"
                  class="px-2 py-0.5 rounded"
                  :class="jsonIndent === 4 ? 'bg-neutral-200 dark:bg-neutral-800 text-highlighted font-semibold' : 'text-muted'"
                  @click="jsonIndent = 4"
                >
                  4 spaces
                </button>
              </div>
            </div>
          </template>

          <!-- Delimiter Override -->
          <div class="flex items-center gap-2 ml-auto">
            <span class="text-muted">Input Delimiter:</span>
            <select
              v-model="delimiterChoice"
              class="px-2 py-0.5 text-xs rounded border border-default bg-neutral-100 dark:bg-neutral-900 font-mono text-highlighted focus:outline-none"
            >
              <option value="auto">
                Auto-detect
              </option>
              <option value=",">
                Comma (,)
              </option>
              <option value="&#9;">
                Tab (\t)
              </option>
              <option value=";">
                Semicolon (;)
              </option>
              <option value="|">
                Pipe (|)
              </option>
            </select>
          </div>
        </div>
      </template>
    </ToolHeader>

    <!-- Metrics Bar -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-default bg-neutral-100/40 dark:bg-neutral-900/40 text-xs">
      <div>
        <span class="text-muted block text-[11px]">Input CSV</span>
        <div class="font-mono mt-0.5">
          <strong class="text-highlighted">{{ stats.inLines }}</strong> lines
          <span class="text-muted text-[11px]">({{ stats.inBytes }} B)</span>
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Output</span>
        <div class="font-mono mt-0.5">
          <strong class="text-highlighted">{{ stats.outLines }}</strong> lines
          <span class="text-muted text-[11px]">({{ stats.outBytes }} B)</span>
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Target Format</span>
        <div class="font-mono mt-0.5 uppercase font-semibold text-primary">
          {{ selectedFormat === 'sql' ? `SQL (${sqlDialect})` : selectedFormat }}
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Columns</span>
        <div class="font-mono mt-0.5">
          <strong class="text-highlighted">{{ stats.columns }}</strong> cols
        </div>
      </div>
    </div>

    <!-- Dual Panes: Left Raw CSV, Right Converted Output -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Input CSV Pane -->
      <div class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden">
        <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <span class="flex items-center gap-2">
            <UIcon
              name="i-lucide-file-text"
              class="size-4"
            />
            Input CSV / Tabular Data
          </span>
          <div class="flex items-center gap-2">
            <UButton
              icon="i-lucide-clipboard-paste"
              label="Paste"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="pasteFromClipboard"
            />
            <label class="cursor-pointer">
              <input
                type="file"
                accept=".csv,.tsv,.txt"
                class="hidden"
                @change="handleFileUpload"
              >
              <span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-muted hover:text-highlighted rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
                <UIcon
                  name="i-lucide-upload"
                  class="size-3"
                />
                Upload
              </span>
            </label>
          </div>
        </div>
        <div class="p-2 flex-1">
          <textarea
            v-model="input"
            placeholder="Paste CSV, TSV, or comma-separated rows here..."
            class="w-full h-96 p-3 bg-transparent font-mono text-xs focus:outline-none resize-y text-highlighted"
            spellcheck="false"
          />
        </div>
      </div>

      <!-- Converted Output Pane -->
      <div class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden">
        <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <span class="flex items-center gap-2">
            <UIcon
              name="i-lucide-code"
              class="size-4"
            />
            Converted {{ selectedFormat.toUpperCase() }}
          </span>
          <div class="flex items-center gap-2">
            <span class="font-mono text-[11px]">{{ stats.outChars }} chars</span>
            <UButton
              v-if="output"
              :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
              :label="copied ? 'Copied' : 'Copy'"
              size="xs"
              color="neutral"
              variant="outline"
              @click="copyToClipboard(output)"
            />
          </div>
        </div>
        <div class="p-2 flex-1">
          <textarea
            :value="output"
            readonly
            placeholder="Converted query or data will appear here..."
            class="w-full h-96 p-3 bg-transparent font-mono text-xs focus:outline-none resize-y text-highlighted"
            spellcheck="false"
          />
        </div>
      </div>
    </div>
  </div>
</template>
