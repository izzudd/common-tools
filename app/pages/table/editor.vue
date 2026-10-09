<script setup lang="ts">
import {
  parseCsv,
  serializeCsv,
  tableToJsonl,
  tableToJson,
  tableToMarkdown,
  tableToSql
} from '~/utils/csv'
import { useToolDraft } from '~/composables/useToolDraft'

interface TableEditorDraft {
  rawInput: string
  headers: string[]
  rows: string[][]
  delimiter: string
  searchQuery: string
  sortColumn: number | null
  sortDirection: 'asc' | 'desc'
  currentPage: number
  pageSize: number
}

const { state: draft, clearDraft } = useToolDraft<TableEditorDraft>('table-editor', () => ({
  rawInput: '',
  headers: [],
  rows: [],
  delimiter: ',',
  searchQuery: '',
  sortColumn: null,
  sortDirection: 'asc',
  currentPage: 1,
  pageSize: 15
}))

// Transient Editing state
const editingHeaderIndex = ref<number | null>(null)
const editingHeaderValue = ref('')
const swapSourceCol = ref<number>(0)
const swapTargetCol = ref<number>(1)
const showRawInput = ref(false)
const showSwapModal = ref(false)

const toast = useToast()

const sampleCsv = `id,name,email,role,salary,is_active,joined_date
1,Alice Smith,alice@example.com,Engineering Lead,125000,true,2023-03-15
2,Bob Jones,bob@example.com,Senior Frontend,98000,true,2023-06-01
3,Carol White,carol@example.com,Product Manager,110000,true,2022-11-20
4,David Brown,david@example.com,DevOps Specialist,105000,false,2024-01-10
5,Emma Watson,emma@example.com,UX Designer,88000,true,2024-04-05
6,Frank Miller,frank@example.com,Backend Engineer,95000,true,2023-09-12
7,Grace Hopper,grace@example.com,System Architect,140000,true,2021-08-14
8,Henry Ford,henry@example.com,QA Automation,82000,false,2024-02-18`

function loadSample() {
  loadData(sampleCsv)
}

function clearAll() {
  clearDraft()
  showRawInput.value = false
}

function loadData(content: string) {
  if (!content.trim()) return
  draft.value.rawInput = content
  const parsed = parseCsv(content)
  draft.value.headers = parsed.headers
  draft.value.rows = parsed.rows
  showRawInput.value = false
  draft.value.currentPage = 1
  draft.value.sortColumn = null
  if (draft.value.headers.length >= 2) {
    swapSourceCol.value = 0
    swapTargetCol.value = 1
  }
}

// Paste event listener for Ctrl+V / Cmd+V
function handleWindowPaste(e: ClipboardEvent) {
  const target = e.target as HTMLElement | null
  // Ignore if user is already typing in an input or textarea
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    return
  }

  const pasted = e.clipboardData?.getData('text')
  if (pasted && (pasted.includes(',') || pasted.includes('\t') || pasted.includes('\n'))) {
    e.preventDefault()
    loadData(pasted)
    toast.add({
      title: 'Table Imported',
      description: `Parsed ${draft.value.headers.length} columns and ${draft.value.rows.length} rows from clipboard`,
      color: 'success',
      icon: 'i-lucide-check'
    })
  }
}

onMounted(() => {
  window.addEventListener('paste', handleWindowPaste)
})

onUnmounted(() => {
  window.removeEventListener('paste', handleWindowPaste)
})

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      loadData(text)
      toast.add({
        title: 'Clipboard Loaded',
        description: `Imported ${draft.value.headers.length} columns & ${draft.value.rows.length} rows`,
        color: 'success'
      })
    }
  } catch {
    toast.add({
      title: 'Clipboard Access Denied',
      description: 'Please paste using Ctrl+V or paste into the raw text box',
      color: 'warning'
    })
  }
}

function handleFileUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    const content = event.target?.result as string
    if (content) {
      loadData(content)
    }
  }
  reader.readAsText(file)
}

// --- Column Manipulations ---
function startEditHeader(idx: number) {
  editingHeaderIndex.value = idx
  editingHeaderValue.value = draft.value.headers[idx] ?? ''
}

function saveHeader() {
  if (editingHeaderIndex.value !== null) {
    const clean = editingHeaderValue.value.trim()
    if (clean) {
      draft.value.headers[editingHeaderIndex.value] = clean
    }
    editingHeaderIndex.value = null
  }
}

function cancelEditHeader() {
  editingHeaderIndex.value = null
}

function moveColumn(idx: number, direction: 'left' | 'right') {
  const targetIdx = direction === 'left' ? idx - 1 : idx + 1
  if (targetIdx < 0 || targetIdx >= draft.value.headers.length) return
  swapColumns(idx, targetIdx)
}

function swapColumns(idxA: number, idxB: number) {
  if (idxA === idxB || idxA < 0 || idxB < 0 || idxA >= draft.value.headers.length || idxB >= draft.value.headers.length) {
    return
  }

  // Swap header names
  const tempHeader = draft.value.headers[idxA]!
  draft.value.headers[idxA] = draft.value.headers[idxB]!
  draft.value.headers[idxB] = tempHeader

  // Swap cell values for every row
  draft.value.rows = draft.value.rows.map((row) => {
    const newRow = [...row]
    const tempCell = newRow[idxA] ?? ''
    newRow[idxA] = newRow[idxB] ?? ''
    newRow[idxB] = tempCell
    return newRow
  })

  // Update sort column pointer if it was affected
  if (draft.value.sortColumn === idxA) {
    draft.value.sortColumn = idxB
  } else if (draft.value.sortColumn === idxB) {
    draft.value.sortColumn = idxA
  }

  toast.add({
    title: 'Columns Swapped',
    description: `Swapped "${draft.value.headers[idxB]}" and "${draft.value.headers[idxA]}"`,
    color: 'success',
    icon: 'i-lucide-arrow-left-right'
  })
}

function executeModalSwap() {
  swapColumns(swapSourceCol.value, swapTargetCol.value)
  showSwapModal.value = false
}

function deleteColumn(colIdx: number) {
  if (draft.value.headers.length <= 1) {
    toast.add({
      title: 'Cannot delete column',
      description: 'The table must have at least one column',
      color: 'warning'
    })
    return
  }

  const colName = draft.value.headers[colIdx]
  draft.value.headers.splice(colIdx, 1)
  draft.value.rows = draft.value.rows.map((row) => {
    const newRow = [...row]
    newRow.splice(colIdx, 1)
    return newRow
  })

  if (draft.value.sortColumn === colIdx) {
    draft.value.sortColumn = null
  } else if (draft.value.sortColumn !== null && draft.value.sortColumn > colIdx) {
    draft.value.sortColumn -= 1
  }

  toast.add({
    title: 'Column Removed',
    description: `Deleted "${colName}"`,
    color: 'neutral'
  })
}

function addColumn() {
  const newName = `column_${draft.value.headers.length + 1}`
  draft.value.headers.push(newName)
  draft.value.rows = draft.value.rows.map(row => [...row, ''])
  toast.add({
    title: 'Column Added',
    description: `Created new column "${newName}"`,
    color: 'success'
  })
}

// --- Row Manipulations ---
function addRow() {
  draft.value.rows.push(Array(draft.value.headers.length).fill(''))
  // Jump to last page
  draft.value.currentPage = Math.ceil(draft.value.rows.length / draft.value.pageSize)
}

function deleteRow(rowIdx: number) {
  draft.value.rows.splice(rowIdx, 1)
}

function updateCell(rowIdx: number, colIdx: number, value: string) {
  if (draft.value.rows[rowIdx]) {
    draft.value.rows[rowIdx][colIdx] = value
  }
}

// --- Sorting & Filtering ---
function toggleSort(colIdx: number) {
  if (draft.value.sortColumn === colIdx) {
    if (draft.value.sortDirection === 'asc') {
      draft.value.sortDirection = 'desc'
    } else {
      draft.value.sortColumn = null
      draft.value.sortDirection = 'asc'
    }
  } else {
    draft.value.sortColumn = colIdx
    draft.value.sortDirection = 'asc'
  }
}

const filteredRows = computed(() => {
  const query = draft.value.searchQuery.trim().toLowerCase()
  let result = [...draft.value.rows]

  // Search filter
  if (query) {
    result = result.filter(row => row.some(cell => cell.toLowerCase().includes(query)))
  }

  // Sorting
  if (draft.value.sortColumn !== null) {
    const colIdx = draft.value.sortColumn
    const dir = draft.value.sortDirection === 'asc' ? 1 : -1

    result.sort((a, b) => {
      const valA = a[colIdx] ?? ''
      const valB = b[colIdx] ?? ''

      const numA = Number.parseFloat(valA)
      const numB = Number.parseFloat(valB)

      if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
        return (numA - numB) * dir
      }
      return valA.localeCompare(valB) * dir
    })
  }

  return result
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredRows.value.length / draft.value.pageSize))
})

const paginatedRows = computed(() => {
  const start = (draft.value.currentPage - 1) * draft.value.pageSize
  return filteredRows.value.slice(start, start + draft.value.pageSize)
})

// Serialized output for copying / exporting
const currentCsv = computed(() => {
  return serializeCsv(draft.value.headers, draft.value.rows, draft.value.delimiter)
})

const payloadSize = computed(() => {
  return new Blob([currentCsv.value]).size
})

function downloadExport(type: 'csv' | 'tsv' | 'json' | 'jsonl' | 'md' | 'sql') {
  let content = ''
  const filename = `table-export.${type}`
  let mimeType = 'text/plain'

  switch (type) {
    case 'csv':
      content = serializeCsv(draft.value.headers, draft.value.rows, ',')
      mimeType = 'text/csv'
      break
    case 'tsv':
      content = serializeCsv(draft.value.headers, draft.value.rows, '\t')
      mimeType = 'text/tab-separated-values'
      break
    case 'json':
      content = tableToJson(draft.value.headers, draft.value.rows)
      mimeType = 'application/json'
      break
    case 'jsonl':
      content = tableToJsonl(draft.value.headers, draft.value.rows)
      mimeType = 'application/x-ndjson'
      break
    case 'md':
      content = tableToMarkdown(draft.value.headers, draft.value.rows)
      mimeType = 'text/markdown'
      break
    case 'sql':
      content = tableToSql({
        headers: draft.value.headers,
        rows: draft.value.rows,
        dialect: 'mysql',
        tableName: 'imported_table'
      })
      mimeType = 'application/sql'
      break
  }

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)

  toast.add({
    title: 'Downloaded File',
    description: `Exported ${draft.value.rows.length} rows as ${filename}`,
    color: 'success'
  })
}
</script>

<template>
  <div class="space-y-6">
    <ToolHeader
      title="Table & CSV Editor"
      description="Inspect, swap columns, rename headers, review clipboard or CSV data, and export in multiple formats."
      icon="i-lucide-table-properties"
      category="Table Tools"
      badge="Interactive"
      :copy-text="currentCsv"
      :disable-copy="draft.headers.length === 0"
      @load-sample="loadSample"
      @clear="clearAll"
    >
      <template #actions>
        <div class="flex flex-wrap items-center justify-between gap-3 w-full">
          <!-- Action Buttons -->
          <div class="flex flex-wrap items-center gap-2">
            <!-- Paste from Clipboard -->
            <UButton
              icon="i-lucide-clipboard-paste"
              label="Paste Clipboard (Ctrl+V)"
              size="xs"
              color="neutral"
              variant="outline"
              @click="pasteFromClipboard"
            />

            <!-- File Upload -->
            <label class="cursor-pointer">
              <input
                type="file"
                accept=".csv,.tsv,.txt"
                class="hidden"
                @change="handleFileUpload"
              >
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-default bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 transition-colors text-muted hover:text-highlighted">
                <UIcon
                  name="i-lucide-upload"
                  class="size-3.5"
                />
                Upload File
              </span>
            </label>

            <!-- Toggle Raw CSV View -->
            <UButton
              :icon="showRawInput ? 'i-lucide-table' : 'i-lucide-code'"
              :label="showRawInput ? 'Back to Grid View' : 'Raw CSV Input'"
              size="xs"
              color="neutral"
              variant="outline"
              @click="showRawInput = !showRawInput"
            />

            <!-- Swap Column Modal Trigger -->
            <UButton
              v-if="draft.headers.length >= 2"
              icon="i-lucide-arrow-left-right"
              label="Swap Columns"
              size="xs"
              color="neutral"
              variant="outline"
              @click="showSwapModal = true"
            />

            <!-- Open in SQL Converter -->
            <UButton
              to="/table/converter"
              icon="i-lucide-database"
              label="SQL Converter"
              size="xs"
              color="primary"
              variant="subtle"
            />
          </div>

          <!-- Export Dropdown / Buttons -->
          <div
            v-if="draft.headers.length > 0"
            class="flex items-center gap-1.5"
          >
            <span class="text-xs text-muted">Export:</span>
            <UButton
              label="CSV"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="downloadExport('csv')"
            />
            <UButton
              label="TSV"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="downloadExport('tsv')"
            />
            <UButton
              label="JSONL"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="downloadExport('jsonl')"
            />
            <UButton
              label="SQL"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="downloadExport('sql')"
            />
            <UButton
              label="Markdown"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="downloadExport('md')"
            />
          </div>
        </div>
      </template>
    </ToolHeader>

    <!-- Swap Columns Modal Dialog -->
    <div
      v-if="showSwapModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      @click.self="showSwapModal = false"
    >
      <div class="w-full max-w-md p-6 rounded-2xl border border-default bg-neutral-50 dark:bg-neutral-900 shadow-xl space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-highlighted flex items-center gap-2">
            <UIcon
              name="i-lucide-arrow-left-right"
              class="size-5 text-primary"
            />
            Swap Two Columns
          </h3>
          <UButton
            icon="i-lucide-x"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="showSwapModal = false"
          />
        </div>

        <p class="text-xs text-muted">
          Select two columns to exchange their order and data across all rows.
        </p>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-muted mb-1">Column A</label>
            <select
              v-model.number="swapSourceCol"
              class="w-full px-3 py-2 text-xs rounded-lg border border-default bg-neutral-100 dark:bg-neutral-800 text-highlighted focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option
                v-for="(h, i) in draft.headers"
                :key="i"
                :value="i"
              >
                {{ h }} (col {{ i + 1 }})
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-muted mb-1">Column B</label>
            <select
              v-model.number="swapTargetCol"
              class="w-full px-3 py-2 text-xs rounded-lg border border-default bg-neutral-100 dark:bg-neutral-800 text-highlighted focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option
                v-for="(h, i) in draft.headers"
                :key="i"
                :value="i"
              >
                {{ h }} (col {{ i + 1 }})
              </option>
            </select>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            label="Cancel"
            size="sm"
            color="neutral"
            variant="outline"
            @click="showSwapModal = false"
          />
          <UButton
            label="Swap Now"
            size="sm"
            color="primary"
            icon="i-lucide-arrow-left-right"
            :disabled="swapSourceCol === swapTargetCol"
            @click="executeModalSwap"
          />
        </div>
      </div>
    </div>

    <!-- Raw Text Input Area (Shown when toggled or empty) -->
    <div
      v-if="showRawInput || draft.headers.length === 0"
      class="p-5 rounded-xl border border-default bg-neutral-100/40 dark:bg-neutral-900/40 space-y-4"
    >
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-semibold text-highlighted flex items-center gap-2">
            <UIcon
              name="i-lucide-file-spreadsheet"
              class="size-4 text-primary"
            />
            Paste CSV or Spreadsheet Data
          </h3>
          <p class="text-xs text-muted mt-0.5">
            Paste comma-separated (CSV), tab-separated (from Excel / Sheets), or semicolon-separated text.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            label="Load Sample"
            size="xs"
            color="neutral"
            variant="outline"
            @click="loadSample"
          />
          <UButton
            label="Parse Table"
            size="xs"
            color="primary"
            icon="i-lucide-table"
            :disabled="!draft.rawInput.trim()"
            @click="loadData(draft.rawInput)"
          />
        </div>
      </div>

      <textarea
        v-model="draft.rawInput"
        rows="8"
        placeholder="id,name,role,salary&#10;1,Alice,Engineer,95000&#10;2,Bob,Designer,85000..."
        class="w-full p-3 font-mono text-xs rounded-xl border border-default bg-neutral-100/60 dark:bg-neutral-950/60 text-highlighted focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
        spellcheck="false"
      />
    </div>

    <!-- Interactive Table Grid (When data is loaded) -->
    <div
      v-if="draft.headers.length > 0 && !showRawInput"
      class="space-y-4"
    >
      <!-- Stats & Controls Bar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-default bg-neutral-100/40 dark:bg-neutral-900/40 text-xs">
        <div class="flex flex-wrap items-center gap-4">
          <div>
            <span class="text-muted block text-[11px]">Columns</span>
            <strong class="font-mono text-highlighted">{{ draft.headers.length }}</strong>
          </div>
          <div>
            <span class="text-muted block text-[11px]">Total Rows</span>
            <strong class="font-mono text-highlighted">{{ draft.rows.length }}</strong>
          </div>
          <div>
            <span class="text-muted block text-[11px]">Filtered</span>
            <strong class="font-mono text-highlighted">{{ filteredRows.length }}</strong>
          </div>
          <div class="hidden sm:block">
            <span class="text-muted block text-[11px]">Payload Size</span>
            <span class="font-mono text-muted text-[11px]">{{ payloadSize }} B</span>
          </div>
        </div>

        <!-- Filter & Search -->
        <div class="flex items-center gap-3">
          <div class="relative w-48 sm:w-64">
            <input
              v-model="draft.searchQuery"
              type="text"
              placeholder="Search table cells..."
              class="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-default bg-neutral-100/60 dark:bg-neutral-950/60 text-highlighted focus:outline-none focus:ring-1 focus:ring-primary"
            >
            <UIcon
              name="i-lucide-search"
              class="size-3.5 text-muted absolute left-2.5 top-2"
            />
          </div>

          <UButton
            icon="i-lucide-plus"
            label="Add Row"
            size="xs"
            color="neutral"
            variant="outline"
            @click="addRow"
          />

          <UButton
            icon="i-lucide-plus"
            label="Add Col"
            size="xs"
            color="neutral"
            variant="outline"
            @click="addColumn"
          />
        </div>
      </div>

      <!-- Scrollable Table Container -->
      <div class="rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/30 overflow-hidden shadow-xs">
        <div class="overflow-x-auto max-h-[620px] relative">
          <table class="w-full text-left text-xs border-collapse">
            <!-- Table Header -->
            <thead class="sticky top-0 z-10 bg-neutral-200/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-default select-none">
              <tr>
                <!-- Row Number Column -->
                <th class="w-12 px-3 py-2.5 text-center font-mono text-[11px] text-muted border-r border-default">
                  #
                </th>

                <!-- Dynamic Data Column Headers -->
                <th
                  v-for="(header, colIdx) in draft.headers"
                  :key="colIdx"
                  class="px-3 py-2 font-semibold text-highlighted border-r border-default last:border-r-0 min-w-[160px] group"
                >
                  <div class="flex items-center justify-between gap-1.5">
                    <!-- Column Title / Editable Header -->
                    <div
                      v-if="editingHeaderIndex === colIdx"
                      class="flex items-center gap-1 flex-1"
                    >
                      <input
                        v-model="editingHeaderValue"
                        type="text"
                        class="w-full px-2 py-0.5 text-xs font-semibold rounded border border-primary bg-neutral-50 dark:bg-neutral-950 text-highlighted focus:outline-none"
                        autofocus
                        @keydown.enter="saveHeader"
                        @keydown.esc="cancelEditHeader"
                      >
                      <button
                        type="button"
                        class="text-emerald-500 hover:text-emerald-600 p-0.5"
                        @click="saveHeader"
                      >
                        <UIcon
                          name="i-lucide-check"
                          class="size-3.5"
                        />
                      </button>
                      <button
                        type="button"
                        class="text-muted hover:text-highlighted p-0.5"
                        @click="cancelEditHeader"
                      >
                        <UIcon
                          name="i-lucide-x"
                          class="size-3.5"
                        />
                      </button>
                    </div>

                    <div
                      v-else
                      class="flex items-center gap-1.5 truncate cursor-pointer flex-1"
                      title="Double-click to rename"
                      @dblclick="startEditHeader(colIdx)"
                    >
                      <span class="truncate font-mono">{{ header }}</span>
                      <button
                        type="button"
                        class="opacity-0 group-hover:opacity-100 text-muted hover:text-primary transition-opacity"
                        title="Rename header"
                        @click.stop="startEditHeader(colIdx)"
                      >
                        <UIcon
                          name="i-lucide-pencil"
                          class="size-3"
                        />
                      </button>
                    </div>

                    <!-- Actions: Sort & Move Left/Right & Delete -->
                    <div class="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100">
                      <!-- Sort Button -->
                      <button
                        type="button"
                        class="p-1 rounded hover:bg-neutral-300 dark:hover:bg-neutral-800 text-muted hover:text-highlighted"
                        :class="draft.sortColumn === colIdx ? 'text-primary font-bold' : ''"
                        title="Sort column"
                        @click="toggleSort(colIdx)"
                      >
                        <UIcon
                          :name="draft.sortColumn === colIdx && draft.sortDirection === 'desc' ? 'i-lucide-arrow-down' : 'i-lucide-arrow-up-down'"
                          class="size-3"
                        />
                      </button>

                      <!-- Move Left -->
                      <button
                        v-if="colIdx > 0"
                        type="button"
                        class="p-1 rounded hover:bg-neutral-300 dark:hover:bg-neutral-800 text-muted hover:text-highlighted"
                        title="Move column left"
                        @click="moveColumn(colIdx, 'left')"
                      >
                        <UIcon
                          name="i-lucide-chevron-left"
                          class="size-3"
                        />
                      </button>

                      <!-- Move Right -->
                      <button
                        v-if="colIdx < draft.headers.length - 1"
                        type="button"
                        class="p-1 rounded hover:bg-neutral-300 dark:hover:bg-neutral-800 text-muted hover:text-highlighted"
                        title="Move column right"
                        @click="moveColumn(colIdx, 'right')"
                      >
                        <UIcon
                          name="i-lucide-chevron-right"
                          class="size-3"
                        />
                      </button>

                      <!-- Delete Column -->
                      <button
                        type="button"
                        class="p-1 rounded hover:bg-neutral-300 dark:hover:bg-neutral-800 text-muted hover:text-rose-500"
                        title="Delete column"
                        @click="deleteColumn(colIdx)"
                      >
                        <UIcon
                          name="i-lucide-trash"
                          class="size-3"
                        />
                      </button>
                    </div>
                  </div>
                </th>

                <!-- Row Delete Action -->
                <th class="w-10 px-2 py-2.5 text-center text-muted" />
              </tr>
            </thead>

            <!-- Table Body -->
            <tbody class="divide-y divide-default">
              <tr
                v-for="(row, rIdx) in paginatedRows"
                :key="rIdx"
                class="hover:bg-neutral-200/40 dark:hover:bg-neutral-800/40 transition-colors group"
              >
                <!-- Row Number -->
                <td class="px-3 py-1.5 text-center font-mono text-[11px] text-muted border-r border-default select-none">
                  {{ (draft.currentPage - 1) * draft.pageSize + rIdx + 1 }}
                </td>

                <!-- Editable Cells -->
                <td
                  v-for="(_, cIdx) in draft.headers"
                  :key="cIdx"
                  class="p-1 border-r border-default last:border-r-0 min-w-[160px]"
                >
                  <input
                    :value="row[cIdx] ?? ''"
                    type="text"
                    class="w-full px-2 py-1 bg-transparent rounded font-mono text-xs text-highlighted focus:bg-neutral-100 dark:focus:bg-neutral-950 focus:outline-none focus:ring-1 focus:ring-primary/60 border border-transparent hover:border-default"
                    @input="(e) => updateCell((draft.currentPage - 1) * draft.pageSize + rIdx, cIdx, (e.target as HTMLInputElement).value)"
                  >
                </td>

                <!-- Delete Row Button -->
                <td class="px-2 py-1 text-center">
                  <button
                    type="button"
                    class="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-rose-500 transition-opacity rounded"
                    title="Delete row"
                    @click="deleteRow((draft.currentPage - 1) * draft.pageSize + rIdx)"
                  >
                    <UIcon
                      name="i-lucide-trash-2"
                      class="size-3.5"
                    />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="flex flex-wrap items-center justify-between gap-3 p-3 border-t border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs text-muted">
          <div class="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              v-model.number="draft.pageSize"
              class="px-2 py-1 text-xs rounded border border-default bg-neutral-100 dark:bg-neutral-800 text-highlighted focus:outline-none"
              @change="draft.currentPage = 1"
            >
              <option :value="10">
                10
              </option>
              <option :value="15">
                15
              </option>
              <option :value="25">
                25
              </option>
              <option :value="50">
                50
              </option>
              <option :value="100">
                100
              </option>
            </select>
            <span>
              Showing {{ (draft.currentPage - 1) * draft.pageSize + 1 }} -
              {{ Math.min(draft.currentPage * draft.pageSize, filteredRows.length) }}
              of {{ filteredRows.length }} rows
            </span>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              icon="i-lucide-chevrons-left"
              size="xs"
              color="neutral"
              variant="outline"
              :disabled="draft.currentPage <= 1"
              @click="draft.currentPage = 1"
            />
            <UButton
              icon="i-lucide-chevron-left"
              size="xs"
              color="neutral"
              variant="outline"
              :disabled="draft.currentPage <= 1"
              @click="draft.currentPage -= 1"
            />
            <span class="font-mono text-xs">
              Page {{ draft.currentPage }} of {{ totalPages }}
            </span>
            <UButton
              icon="i-lucide-chevron-right"
              size="xs"
              color="neutral"
              variant="outline"
              :disabled="draft.currentPage >= totalPages"
              @click="draft.currentPage += 1"
            />
            <UButton
              icon="i-lucide-chevrons-right"
              size="xs"
              color="neutral"
              variant="outline"
              :disabled="draft.currentPage >= totalPages"
              @click="draft.currentPage = totalPages"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
