<script setup lang="ts">
import { useClipboardAction } from '~/composables/useClipboardAction'
import { useToolDraft } from '~/composables/useToolDraft'
import type { DiffContextOption, DiffDraft } from '~/types/diff'
import {
  computeDiffStats,
  DEFAULT_DIFF_DRAFT,
  generateGitPatch,
  generateSplitRows,
  generateUnifiedLines,
  parseDiffBlocks,
  SAMPLE_DIFF_NEW,
  SAMPLE_DIFF_OLD
} from '~/utils/diff'

const { state: draft, clearDraft } = useToolDraft<DiffDraft>('string-diff', () => ({
  ...DEFAULT_DIFF_DRAFT
}))

const { copied, copyToClipboard } = useClipboardAction()

const showInputs = ref(true)
const expandedHunks = ref<Set<number>>(new Set())

// File upload refs
const originalFileInput = ref<HTMLInputElement | null>(null)
const modifiedFileInput = ref<HTMLInputElement | null>(null)

// Parse blocks
const diffBlocks = computed(() => {
  return parseDiffBlocks(draft.value.originalText, draft.value.modifiedText, {
    ignoreWhitespace: draft.value.ignoreWhitespace,
    ignoreCase: draft.value.ignoreCase
  })
})

// Compute stats
const stats = computed(() => {
  return computeDiffStats(draft.value.originalText, draft.value.modifiedText, diffBlocks.value)
})

// Unified rows (Compact / Top-down)
const unifiedLines = computed(() => {
  return generateUnifiedLines(diffBlocks.value, {
    contextOption: draft.value.contextOption,
    wordDiff: draft.value.wordDiff,
    ignoreCase: draft.value.ignoreCase,
    expandedHunks: expandedHunks.value
  })
})

// Split rows (Side-by-side)
const splitRows = computed(() => {
  return generateSplitRows(diffBlocks.value, {
    contextOption: draft.value.contextOption,
    wordDiff: draft.value.wordDiff,
    ignoreCase: draft.value.ignoreCase,
    expandedHunks: expandedHunks.value
  })
})

// Git patch representation
const gitPatchText = computed(() => {
  if (!draft.value.originalText && !draft.value.modifiedText) return ''
  return generateGitPatch(
    draft.value.originalFileName,
    draft.value.modifiedFileName,
    draft.value.originalText,
    draft.value.modifiedText,
    {
      context: draft.value.contextOption === 'all' ? 10000 : parseInt(draft.value.contextOption, 10),
      ignoreWhitespace: draft.value.ignoreWhitespace
    }
  )
})

const hasContent = computed(() => {
  return Boolean(draft.value.originalText || draft.value.modifiedText)
})

const isIdentical = computed(() => {
  if (!hasContent.value) return false
  return stats.value.additions === 0 && stats.value.deletions === 0
})

// GitHub 5-square visual diff meter
const diffMeter = computed(() => {
  const total = stats.value.additions + stats.value.deletions
  if (total === 0) {
    return Array(5).fill('neutral')
  }
  const addRatio = stats.value.additions / total
  const greenCount = Math.round(addRatio * 5)
  const redCount = 5 - greenCount

  const bars: Array<'green' | 'red'> = []
  for (let i = 0; i < greenCount; i++) bars.push('green')
  for (let i = 0; i < redCount; i++) bars.push('red')
  return bars
})

// Reset expanded hunks when context, texts, or options change
watch(
  () => [
    draft.value.contextOption,
    draft.value.originalText,
    draft.value.modifiedText,
    draft.value.ignoreWhitespace,
    draft.value.ignoreCase
  ],
  () => {
    expandedHunks.value = new Set()
  }
)

function expandHunk(index?: number) {
  if (index !== undefined && index >= 0) {
    const next = new Set(expandedHunks.value)
    next.add(index)
    expandedHunks.value = next
  }
}

function expandAllHunks() {
  draft.value.contextOption = 'all'
}

function loadSample() {
  draft.value.originalText = SAMPLE_DIFF_OLD
  draft.value.modifiedText = SAMPLE_DIFF_NEW
  draft.value.originalFileName = 'ServiceClient.v1.ts'
  draft.value.modifiedFileName = 'ServiceClient.v2.ts'
  expandedHunks.value = new Set()
}

function clearAll() {
  clearDraft()
  expandedHunks.value = new Set()
}

function swapTexts() {
  const tempText = draft.value.originalText
  draft.value.originalText = draft.value.modifiedText
  draft.value.modifiedText = tempText

  const tempName = draft.value.originalFileName
  draft.value.originalFileName = draft.value.modifiedFileName
  draft.value.modifiedFileName = tempName
}

function handleFileUpload(event: Event, target: 'original' | 'modified') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const content = (e.target?.result as string) || ''
    if (target === 'original') {
      draft.value.originalText = content
      draft.value.originalFileName = file.name
    } else {
      draft.value.modifiedText = content
      draft.value.modifiedFileName = file.name
    }
  }
  reader.readAsText(file)
  // Reset value to allow re-uploading same file
  input.value = ''
}

function downloadPatch() {
  if (!gitPatchText.value) return
  const blob = new Blob([gitPatchText.value], { type: 'text/x-diff;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${draft.value.modifiedFileName || 'changes'}.patch`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const contextOptions: { label: string, value: DiffContextOption }[] = [
  { label: '3 lines context', value: '3' },
  { label: '5 lines context', value: '5' },
  { label: '10 lines context', value: '10' },
  { label: 'All lines (Full)', value: 'all' }
]
</script>

<template>
  <div class="space-y-6">
    <ToolHeader
      tool-id="string-diff"
      title="Text & Git Diff Comparator"
      description="Compare text and code with split side-by-side or unified top-down view just like GitHub and Git diff."
      icon="i-lucide-git-compare"
      category="String Tools"
      badge="Git Style"
      :copy-text="gitPatchText"
      :disable-copy="!hasContent"
      @load-sample="loadSample"
      @clear="clearAll"
    >
      <template #actions>
        <div class="flex flex-wrap items-center justify-between gap-3 w-full">
          <!-- Left: View Mode Toggle -->
          <div class="flex items-center gap-1.5 p-1 rounded-lg border border-default bg-neutral-100/50 dark:bg-neutral-900/50">
            <button
              type="button"
              class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer"
              :class="draft.viewMode === 'split'
                ? 'bg-primary text-white shadow-xs font-semibold'
                : 'text-muted hover:text-highlighted'"
              @click="draft.viewMode = 'split'"
            >
              <UIcon
                name="i-lucide-columns-2"
                class="size-3.5"
              />
              <span>Split (Side-by-Side)</span>
            </button>
            <button
              type="button"
              class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer"
              :class="draft.viewMode === 'unified'
                ? 'bg-primary text-white shadow-xs font-semibold'
                : 'text-muted hover:text-highlighted'"
              @click="draft.viewMode = 'unified'"
            >
              <UIcon
                name="i-lucide-rows-2"
                class="size-3.5"
              />
              <span>Unified (Top-Down)</span>
            </button>
          </div>

          <!-- Middle / Right: Diff Option Flags -->
          <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <label class="flex items-center gap-2 text-muted hover:text-highlighted cursor-pointer select-none">
              <input
                v-model="draft.wordDiff"
                type="checkbox"
                class="rounded border-default text-primary focus:ring-primary/20"
              >
              <span>Word-level diff</span>
            </label>

            <label class="flex items-center gap-2 text-muted hover:text-highlighted cursor-pointer select-none">
              <input
                v-model="draft.ignoreWhitespace"
                type="checkbox"
                class="rounded border-default text-primary focus:ring-primary/20"
              >
              <span>Ignore whitespace</span>
            </label>

            <label class="flex items-center gap-2 text-muted hover:text-highlighted cursor-pointer select-none">
              <input
                v-model="draft.ignoreCase"
                type="checkbox"
                class="rounded border-default text-primary focus:ring-primary/20"
              >
              <span>Ignore case</span>
            </label>

            <label class="flex items-center gap-2 text-muted hover:text-highlighted cursor-pointer select-none">
              <input
                v-model="draft.wrapLines"
                type="checkbox"
                class="rounded border-default text-primary focus:ring-primary/20"
              >
              <span>Soft wrap</span>
            </label>

            <!-- Context selector -->
            <div class="flex items-center gap-1.5">
              <span class="text-muted">Context:</span>
              <select
                v-model="draft.contextOption"
                class="rounded-md border border-default bg-neutral-100/60 dark:bg-neutral-900/60 px-2 py-0.5 text-xs text-highlighted focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option
                  v-for="opt in contextOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </template>
    </ToolHeader>

    <!-- Metrics Bar -->
    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 p-3.5 rounded-xl border border-default bg-neutral-100/40 dark:bg-neutral-900/40 text-xs">
      <div>
        <span class="text-muted block text-[11px]">Additions</span>
        <div class="font-mono mt-0.5 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
          <UIcon
            name="i-lucide-plus"
            class="size-3.5"
          />
          {{ stats.additions }} lines
        </div>
      </div>

      <div>
        <span class="text-muted block text-[11px]">Deletions</span>
        <div class="font-mono mt-0.5 text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
          <UIcon
            name="i-lucide-minus"
            class="size-3.5"
          />
          {{ stats.deletions }} lines
        </div>
      </div>

      <div>
        <span class="text-muted block text-[11px]">Modifications</span>
        <div class="font-mono mt-0.5 text-sky-600 dark:text-sky-400 font-semibold">
          {{ stats.modifications }} lines
        </div>
      </div>

      <div>
        <span class="text-muted block text-[11px]">Unchanged</span>
        <div class="font-mono mt-0.5 text-muted">
          {{ stats.unchanged }} lines
        </div>
      </div>

      <div>
        <span class="text-muted block text-[11px]">Lines Changed</span>
        <div class="font-mono mt-0.5 text-highlighted">
          {{ stats.oldTotalLines }} → {{ stats.newTotalLines }}
        </div>
      </div>

      <div>
        <span class="text-muted block text-[11px]">Diff Ratio</span>
        <div class="flex items-center gap-1 mt-1.5">
          <span
            v-for="(bar, i) in diffMeter"
            :key="i"
            class="size-2 rounded-xs"
            :class="{
              'bg-emerald-500': bar === 'green',
              'bg-rose-500': bar === 'red',
              'bg-neutral-300 dark:bg-neutral-700': bar === 'neutral'
            }"
          />
        </div>
      </div>
    </div>

    <!-- Collapsible Input Editors -->
    <div class="rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/30 overflow-hidden">
      <!-- Section Accordion Header -->
      <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs">
        <div class="flex items-center gap-2 font-medium text-highlighted">
          <UIcon
            name="i-lucide-file-code"
            class="size-4 text-primary"
          />
          <span>Input Texts & Files</span>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-arrow-left-right"
            label="Swap"
            size="xs"
            color="neutral"
            variant="outline"
            :disabled="!hasContent"
            @click="swapTexts"
          />

          <UButton
            :icon="showInputs ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
            :label="showInputs ? 'Hide Editors' : 'Show Editors'"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="showInputs = !showInputs"
          />
        </div>
      </div>

      <!-- Hidden file inputs -->
      <input
        ref="originalFileInput"
        type="file"
        class="hidden"
        @change="handleFileUpload($event, 'original')"
      >
      <input
        ref="modifiedFileInput"
        type="file"
        class="hidden"
        @change="handleFileUpload($event, 'modified')"
      >

      <!-- Input Panes Grid -->
      <div
        v-show="showInputs"
        class="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-default"
      >
        <!-- Original Pane -->
        <div class="flex flex-col p-3">
          <div class="flex items-center justify-between gap-2 pb-2 text-xs">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <span class="font-medium text-rose-600 dark:text-rose-400 shrink-0">Original (Old):</span>
              <input
                v-model="draft.originalFileName"
                type="text"
                placeholder="original.txt"
                class="bg-transparent border-b border-dashed border-default text-xs font-mono px-1 py-0.5 text-highlighted focus:outline-none focus:border-primary truncate max-w-[180px]"
              >
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-[11px] font-mono text-muted">{{ stats.oldTotalLines }} lines</span>
              <UButton
                icon="i-lucide-upload"
                size="xs"
                color="neutral"
                variant="ghost"
                title="Upload file"
                @click="originalFileInput?.click()"
              />
              <UButton
                v-if="draft.originalText"
                icon="i-lucide-x"
                size="xs"
                color="neutral"
                variant="ghost"
                title="Clear original"
                @click="draft.originalText = ''"
              />
            </div>
          </div>

          <textarea
            v-model="draft.originalText"
            placeholder="Paste original (before) text or drop file here..."
            class="w-full h-56 p-3 bg-neutral-50/50 dark:bg-neutral-950/40 rounded-lg border border-default font-mono text-xs focus:outline-none focus:border-primary resize-y text-highlighted"
            spellcheck="false"
          />
        </div>

        <!-- Modified Pane -->
        <div class="flex flex-col p-3">
          <div class="flex items-center justify-between gap-2 pb-2 text-xs">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <span class="font-medium text-emerald-600 dark:text-emerald-400 shrink-0">Modified (New):</span>
              <input
                v-model="draft.modifiedFileName"
                type="text"
                placeholder="modified.txt"
                class="bg-transparent border-b border-dashed border-default text-xs font-mono px-1 py-0.5 text-highlighted focus:outline-none focus:border-primary truncate max-w-[180px]"
              >
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-[11px] font-mono text-muted">{{ stats.newTotalLines }} lines</span>
              <UButton
                icon="i-lucide-upload"
                size="xs"
                color="neutral"
                variant="ghost"
                title="Upload file"
                @click="modifiedFileInput?.click()"
              />
              <UButton
                v-if="draft.modifiedText"
                icon="i-lucide-x"
                size="xs"
                color="neutral"
                variant="ghost"
                title="Clear modified"
                @click="draft.modifiedText = ''"
              />
            </div>
          </div>

          <textarea
            v-model="draft.modifiedText"
            placeholder="Paste modified (after) text or drop file here..."
            class="w-full h-56 p-3 bg-neutral-50/50 dark:bg-neutral-950/40 rounded-lg border border-default font-mono text-xs focus:outline-none focus:border-primary resize-y text-highlighted"
            spellcheck="false"
          />
        </div>
      </div>
    </div>

    <!-- Diff Viewer Container -->
    <div class="rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/30 overflow-hidden">
      <!-- Diff View Header -->
      <div class="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 border-b border-default bg-neutral-100/70 dark:bg-neutral-900/70 text-xs">
        <div class="flex items-center gap-2 font-mono">
          <UIcon
            name="i-lucide-git-commit-horizontal"
            class="size-4 text-muted"
          />
          <span class="font-semibold text-rose-600 dark:text-rose-400">{{ draft.originalFileName || 'a/original' }}</span>
          <span class="text-muted">→</span>
          <span class="font-semibold text-emerald-600 dark:text-emerald-400">{{ draft.modifiedFileName || 'b/modified' }}</span>
        </div>

        <!-- Quick actions -->
        <div class="flex items-center gap-2">
          <UButton
            v-if="draft.contextOption !== 'all' && (stats.additions > 0 || stats.deletions > 0)"
            icon="i-lucide-unfold-vertical"
            label="Expand All Hunks"
            size="xs"
            color="neutral"
            variant="outline"
            @click="expandAllHunks"
          />

          <UButton
            icon="i-lucide-download"
            label="Patch (.patch)"
            size="xs"
            color="neutral"
            variant="outline"
            :disabled="!gitPatchText"
            @click="downloadPatch"
          />

          <UButton
            :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
            :label="copied ? 'Copied Patch' : 'Copy Patch'"
            size="xs"
            color="neutral"
            variant="outline"
            :disabled="!gitPatchText"
            @click="copyToClipboard(gitPatchText)"
          />
        </div>
      </div>

      <!-- Zero Differences or Empty State -->
      <div
        v-if="!hasContent"
        class="flex flex-col items-center justify-center p-12 text-center text-muted space-y-3"
      >
        <UIcon
          name="i-lucide-git-compare"
          class="size-10 text-muted/60"
        />
        <div class="text-sm font-medium text-highlighted">
          No texts to compare
        </div>
        <p class="text-xs max-w-sm">
          Paste original and modified text in the editors above, upload files, or click "Load Sample Data" to preview the comparator.
        </p>
        <UButton
          icon="i-lucide-file-text"
          label="Load Sample Data"
          size="sm"
          color="primary"
          variant="subtle"
          @click="loadSample"
        />
      </div>

      <div
        v-else-if="isIdentical"
        class="flex flex-col items-center justify-center p-12 text-center space-y-3"
      >
        <div class="p-3 rounded-full bg-emerald-500/10 text-emerald-500">
          <UIcon
            name="i-lucide-check-circle-2"
            class="size-8"
          />
        </div>
        <div class="text-sm font-medium text-highlighted">
          Texts are identical!
        </div>
        <p class="text-xs text-muted max-w-sm">
          No differences found between original and modified text.
        </p>
      </div>

      <!-- Diff Tables -->
      <div
        v-else
        class="overflow-x-auto"
      >
        <!-- 1. SPLIT VIEW (Side by Side) -->
        <table
          v-if="draft.viewMode === 'split'"
          class="w-full border-collapse font-mono text-xs select-text table-fixed"
        >
          <colgroup>
            <!-- Left side (Original) -->
            <col class="w-12 sm:w-14">
            <col class="w-5">
            <col class="w-[calc(50%-4.25rem)]">
            <!-- Right side (Modified) -->
            <col class="w-12 sm:w-14">
            <col class="w-5">
            <col class="w-[calc(50%-4.25rem)]">
          </colgroup>

          <tbody>
            <tr
              v-for="row in splitRows"
              :key="row.id"
              class="border-b border-default/30 leading-5"
              :class="{
                'hover:bg-neutral-100/40 dark:hover:bg-neutral-800/30': !row.isHunkHeader
              }"
            >
              <!-- HUNK HEADER -->
              <td
                v-if="row.isHunkHeader"
                colspan="6"
                class="bg-sky-500/10 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border-y border-sky-500/20 py-1 px-3 text-xs"
              >
                <div class="flex items-center justify-between">
                  <span class="font-mono font-medium">{{ row.hunkText }}</span>
                  <button
                    type="button"
                    class="flex items-center gap-1 px-2 py-0.5 rounded-sm bg-sky-500/20 hover:bg-sky-500/30 text-sky-800 dark:text-sky-200 cursor-pointer font-sans text-[11px]"
                    @click="expandHunk(row.hunkIndex)"
                  >
                    <UIcon
                      name="i-lucide-unfold-vertical"
                      class="size-3"
                    />
                    <span>Expand {{ row.hiddenCount }} lines</span>
                  </button>
                </div>
              </td>

              <!-- NORMAL / MODIFIED CELLS -->
              <template v-else>
                <!-- LEFT: Gutter (Line Number) -->
                <td
                  class="text-right pr-2 py-0.5 select-none text-[11px] text-muted border-r border-default/30"
                  :class="{
                    'bg-rose-500/15 text-rose-700 dark:text-rose-400 font-semibold': row.left.type === 'deleted',
                    'bg-neutral-100/30 dark:bg-neutral-900/30': row.left.type === 'empty',
                    'bg-neutral-100/40 dark:bg-neutral-900/40': row.left.type === 'normal'
                  }"
                >
                  {{ row.left.lineNumber ?? '' }}
                </td>

                <!-- LEFT: Prefix marker -->
                <td
                  class="text-center py-0.5 select-none font-bold text-xs"
                  :class="{
                    'bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400': row.left.type === 'deleted',
                    'bg-neutral-100/20 dark:bg-neutral-900/20': row.left.type === 'empty'
                  }"
                >
                  {{ row.left.prefix ?? '' }}
                </td>

                <!-- LEFT: Content -->
                <td
                  class="py-0.5 px-2 border-r border-default/50 align-top overflow-hidden"
                  :class="[
                    draft.wrapLines ? 'break-words whitespace-pre-wrap' : 'whitespace-pre',
                    {
                      'bg-rose-500/10 dark:bg-rose-500/15 text-rose-950 dark:text-rose-100': row.left.type === 'deleted',
                      'bg-neutral-100/20 dark:bg-neutral-900/20 select-none': row.left.type === 'empty'
                    }
                  ]"
                >
                  <template v-if="row.left.tokens && row.left.tokens.length > 0">
                    <span
                      v-for="(t, idx) in row.left.tokens"
                      :key="idx"
                      :class="{
                        'bg-rose-500/30 dark:bg-rose-500/40 rounded-xs font-semibold px-0.5 text-rose-950 dark:text-rose-50': t.type === 'deleted'
                      }"
                    >{{ t.text }}</span>
                  </template>
                  <template v-else-if="row.left.text">
                    {{ row.left.text }}
                  </template>
                  <span
                    v-else-if="row.left.type !== 'empty'"
                    class="inline-block"
                  >&nbsp;</span>
                </td>

                <!-- RIGHT: Gutter (Line Number) -->
                <td
                  class="text-right pr-2 py-0.5 select-none text-[11px] text-muted border-r border-default/30"
                  :class="{
                    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold': row.right.type === 'added',
                    'bg-neutral-100/30 dark:bg-neutral-900/30': row.right.type === 'empty',
                    'bg-neutral-100/40 dark:bg-neutral-900/40': row.right.type === 'normal'
                  }"
                >
                  {{ row.right.lineNumber ?? '' }}
                </td>

                <!-- RIGHT: Prefix marker -->
                <td
                  class="text-center py-0.5 select-none font-bold text-xs"
                  :class="{
                    'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400': row.right.type === 'added',
                    'bg-neutral-100/20 dark:bg-neutral-900/20': row.right.type === 'empty'
                  }"
                >
                  {{ row.right.prefix ?? '' }}
                </td>

                <!-- RIGHT: Content -->
                <td
                  class="py-0.5 px-2 align-top overflow-hidden"
                  :class="[
                    draft.wrapLines ? 'break-words whitespace-pre-wrap' : 'whitespace-pre',
                    {
                      'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-950 dark:text-emerald-100': row.right.type === 'added',
                      'bg-neutral-100/20 dark:bg-neutral-900/20 select-none': row.right.type === 'empty'
                    }
                  ]"
                >
                  <template v-if="row.right.tokens && row.right.tokens.length > 0">
                    <span
                      v-for="(t, idx) in row.right.tokens"
                      :key="idx"
                      :class="{
                        'bg-emerald-500/30 dark:bg-emerald-500/40 rounded-xs font-semibold px-0.5 text-emerald-950 dark:text-emerald-50': t.type === 'added'
                      }"
                    >{{ t.text }}</span>
                  </template>
                  <template v-else-if="row.right.text">
                    {{ row.right.text }}
                  </template>
                  <span
                    v-else-if="row.right.type !== 'empty'"
                    class="inline-block"
                  >&nbsp;</span>
                </td>
              </template>
            </tr>
          </tbody>
        </table>

        <!-- 2. UNIFIED VIEW (Compact / Top-Down) -->
        <table
          v-else
          class="w-full border-collapse font-mono text-xs select-text table-fixed"
        >
          <colgroup>
            <col class="w-12 sm:w-14">
            <col class="w-12 sm:w-14">
            <col class="w-6">
            <col class="w-[calc(100%-7.5rem)]">
          </colgroup>

          <tbody>
            <tr
              v-for="line in unifiedLines"
              :key="line.id"
              class="border-b border-default/30 leading-5"
              :class="{
                'hover:bg-neutral-100/40 dark:hover:bg-neutral-800/30': line.type !== 'hunk-header'
              }"
            >
              <!-- HUNK HEADER -->
              <td
                v-if="line.type === 'hunk-header'"
                colspan="4"
                class="bg-sky-500/10 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border-y border-sky-500/20 py-1 px-3 text-xs"
              >
                <div class="flex items-center justify-between">
                  <span class="font-mono font-medium">{{ line.text }}</span>
                  <button
                    type="button"
                    class="flex items-center gap-1 px-2 py-0.5 rounded-sm bg-sky-500/20 hover:bg-sky-500/30 text-sky-800 dark:text-sky-200 cursor-pointer font-sans text-[11px]"
                    @click="expandHunk(line.hunkIndex)"
                  >
                    <UIcon
                      name="i-lucide-unfold-vertical"
                      class="size-3"
                    />
                    <span>Expand {{ line.hiddenCount }} lines</span>
                  </button>
                </div>
              </td>

              <!-- NORMAL / DELETED / ADDED LINES -->
              <template v-else>
                <!-- Old Line # -->
                <td
                  class="text-right pr-2 py-0.5 select-none text-[11px] text-muted border-r border-default/30"
                  :class="{
                    'bg-rose-500/15 text-rose-700 dark:text-rose-400 font-semibold': line.type === 'deleted',
                    'bg-neutral-100/40 dark:bg-neutral-900/40': line.type === 'normal' || line.type === 'added'
                  }"
                >
                  {{ line.oldLineNumber ?? '' }}
                </td>

                <!-- New Line # -->
                <td
                  class="text-right pr-2 py-0.5 select-none text-[11px] text-muted border-r border-default/30"
                  :class="{
                    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold': line.type === 'added',
                    'bg-neutral-100/40 dark:bg-neutral-900/40': line.type === 'normal' || line.type === 'deleted'
                  }"
                >
                  {{ line.newLineNumber ?? '' }}
                </td>

                <!-- Prefix Marker (+, -, space) -->
                <td
                  class="text-center py-0.5 select-none font-bold text-xs"
                  :class="{
                    'bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400': line.type === 'deleted',
                    'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400': line.type === 'added'
                  }"
                >
                  {{ line.prefix }}
                </td>

                <!-- Code Content -->
                <td
                  class="py-0.5 px-2 align-top overflow-hidden"
                  :class="[
                    draft.wrapLines ? 'break-words whitespace-pre-wrap' : 'whitespace-pre',
                    {
                      'bg-rose-500/10 dark:bg-rose-500/15 text-rose-950 dark:text-rose-100': line.type === 'deleted',
                      'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-950 dark:text-emerald-100': line.type === 'added'
                    }
                  ]"
                >
                  <template v-if="line.tokens && line.tokens.length > 0">
                    <span
                      v-for="(t, idx) in line.tokens"
                      :key="idx"
                      :class="{
                        'bg-rose-500/30 dark:bg-rose-500/40 rounded-xs font-semibold px-0.5 text-rose-950 dark:text-rose-50': t.type === 'deleted',
                        'bg-emerald-500/30 dark:bg-emerald-500/40 rounded-xs font-semibold px-0.5 text-emerald-950 dark:text-emerald-50': t.type === 'added'
                      }"
                    >{{ t.text }}</span>
                  </template>
                  <template v-else-if="line.text">
                    {{ line.text }}
                  </template>
                  <span
                    v-else
                    class="inline-block"
                  >&nbsp;</span>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
