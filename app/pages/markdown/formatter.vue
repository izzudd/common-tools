<script setup lang="ts">
import { useClipboardAction } from '~/composables/useClipboardAction'
import { useToolDraft } from '~/composables/useToolDraft'
import {
  formatMarkdownTable,
  generateMarkdownToc,
  stripMarkdown
} from '~/utils/markdownExtras'

type UtilityMode = 'table-formatter' | 'toc-generator' | 'strip-markdown'

interface MarkdownFormatterDraft {
  input: string
  mode: UtilityMode
  insertTocAtTop: boolean
}

const { state: draft, clearDraft } = useToolDraft<MarkdownFormatterDraft>('markdown-formatter', () => ({
  input: '',
  mode: 'table-formatter',
  insertTocAtTop: true
}))

const output = ref('')
const { copied, copyToClipboard } = useClipboardAction()
const toast = useToast()

const sampleTable = `# Team Roster & Quarterly Progress

| Employee | Role | Department | Target Met | Score |
|:---|:---:|:---|---:|---:|
| Alex Mercer | Senior Dev | Platform Eng | Yes | 98.5 |
| Beatrice Vance | Staff Architect | Infrastructure | Yes | 100.0 |
| Charlie Day | Product Design | User Experience | In Progress | 84.0 |
| Diana Prince | Engineering Manager | Core Product | Yes | 95.0 |

Formatting this will cleanly align all column pipes and dashes based on text length!`

const sampleDocumentForToc = `# Building High Performance Web Applications

## Introduction
Modern web engineering requires attention to both initial bundle footprint and runtime responsiveness.

### Client-Side vs Server-Side
Choosing the right execution paradigm impacts user latency and privacy guarantees.

## Architecture Guidelines

### Minimal Dependencies
Keeping packages light prevents maintenance rot and dependency security risks.

### Local-First Persistence
Data belongs on the client's device whenever possible.

## Security Considerations

### Cross-Site Scripting (XSS)
Never render untrusted strings without strict sanitization.

### Zero Telemetry
Respect privacy by avoiding unnecessary remote beacon tracking.

## Summary & Checklist
Keep it lean, keep it fast, and keep it safe.`

const sampleForStrip = `# 🎯 Welcome to **DevPocket**

DevPocket is an *offline-first* suite of developer tools!

- ⚡ **Zero backend**: Everything executes in your browser.
- 📦 **No dependencies bloat**: Uses native Web APIs.
- 🔗 Check out [Documentation](https://github.com) for more details.

> *"Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away."*

\`\`\`typescript
const greet = (name: string): string => \`Hello, \${name}!\`;
\`\`\`

All formatting symbols above will be cleanly stripped to pure plain text.`

function loadSample() {
  if (draft.value.mode === 'table-formatter') {
    draft.value.input = sampleTable
  } else if (draft.value.mode === 'toc-generator') {
    draft.value.input = sampleDocumentForToc
  } else {
    draft.value.input = sampleForStrip
  }
  processContent()
}

function clearAll() {
  clearDraft()
  output.value = ''
}

function processContent() {
  const raw = draft.value.input.trim()
  if (!raw) {
    output.value = ''
    return
  }

  if (draft.value.mode === 'table-formatter') {
    output.value = formatMarkdownTable(raw)
  } else if (draft.value.mode === 'toc-generator') {
    const { tocMarkdown } = generateMarkdownToc(raw)
    if (draft.value.insertTocAtTop && tocMarkdown) {
      output.value = `## Table of Contents\n${tocMarkdown}\n\n---\n\n${raw}`
    } else {
      output.value = tocMarkdown || 'No headings (#, ##, ###) detected in document.'
    }
  } else if (draft.value.mode === 'strip-markdown') {
    output.value = stripMarkdown(raw)
  }
}

watch(
  draft,
  () => {
    processContent()
  },
  { deep: true, immediate: true }
)

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      draft.value.input = text
      processContent()
      toast.add({
        title: 'Pasted from Clipboard',
        color: 'success'
      })
    }
  } catch {
    toast.add({
      title: 'Clipboard Permission Denied',
      description: 'Please paste directly into the text editor (Ctrl+V / Cmd+V)',
      color: 'warning'
    })
  }
}

function downloadOutput() {
  if (!output.value) return

  const filename = draft.value.mode === 'strip-markdown' ? 'content.txt' : 'formatted.md'
  const mime = draft.value.mode === 'strip-markdown' ? 'text/plain' : 'text/markdown'

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
  const inText = draft.value.input
  const outText = output.value
  const inLines = inText ? inText.split(/\r?\n/).length : 0
  const outLines = outText ? outText.split(/\r?\n/).length : 0

  return {
    inChars: inText.length,
    outChars: outText.length,
    inLines,
    outLines
  }
})
</script>

<template>
  <div class="space-y-6">
    <ToolHeader
      title="Markdown Table Formatter & TOC Generator"
      description="Beautify unaligned markdown tables with padded columns, auto-generate linked Table of Contents (TOC) from headings, or strip markdown syntax to plain text."
      icon="i-lucide-table-properties"
      category="Markdown Tools"
      badge="Utilities"
      :copy-text="output"
      :disable-copy="!output"
      @load-sample="loadSample"
      @clear="clearAll"
    >
      <template #actions>
        <div class="flex flex-wrap items-center justify-between gap-3 w-full">
          <!-- Mode Tabs -->
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-muted font-medium">Tool Action:</span>
            <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
                :class="draft.mode === 'table-formatter' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
                @click="draft.mode = 'table-formatter'"
              >
                <UIcon
                  name="i-lucide-table"
                  class="size-3.5"
                />
                Align Table Columns
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
                :class="draft.mode === 'toc-generator' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
                @click="draft.mode = 'toc-generator'"
              >
                <UIcon
                  name="i-lucide-list-tree"
                  class="size-3.5"
                />
                Generate Table of Contents
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
                :class="draft.mode === 'strip-markdown' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
                @click="draft.mode = 'strip-markdown'"
              >
                <UIcon
                  name="i-lucide-file-text"
                  class="size-3.5"
                />
                Strip to Plain Text
              </button>
            </div>
          </div>

          <!-- Utility Actions -->
          <div class="flex items-center gap-2">
            <UButton
              to="/markdown/converter"
              icon="i-lucide-arrow-left"
              label="HTML & Docs Converter"
              size="xs"
              color="neutral"
              variant="outline"
            />
            <UButton
              v-if="output"
              icon="i-lucide-download"
              label="Download"
              size="xs"
              color="primary"
              variant="outline"
              @click="downloadOutput"
            />
          </div>
        </div>

        <!-- Mode-Specific Sub-Options Row -->
        <div
          v-if="draft.mode === 'toc-generator'"
          class="flex flex-wrap items-center gap-4 text-xs pt-2 border-t border-default/50 w-full"
        >
          <label class="flex items-center gap-1.5 text-muted hover:text-highlighted cursor-pointer select-none">
            <input
              v-model="draft.insertTocAtTop"
              type="checkbox"
              class="rounded border-default text-primary focus:ring-primary/20"
            >
            <span>Prepend generated TOC to original document</span>
          </label>
        </div>
      </template>
    </ToolHeader>

    <!-- Metrics Bar -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-default bg-neutral-100/40 dark:bg-neutral-900/40 text-xs">
      <div>
        <span class="text-muted block text-[11px]">Input Lines</span>
        <div class="font-mono mt-0.5">
          <strong class="text-highlighted">{{ stats.inLines }}</strong> lines
          <span class="text-muted text-[11px]">({{ stats.inChars }} chars)</span>
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Output Lines</span>
        <div class="font-mono mt-0.5">
          <strong class="text-highlighted">{{ stats.outLines }}</strong> lines
          <span class="text-muted text-[11px]">({{ stats.outChars }} chars)</span>
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Tool Operation</span>
        <div class="font-mono mt-0.5 font-semibold text-primary capitalize flex items-center gap-1.5">
          <UIcon
            :name="draft.mode === 'table-formatter' ? 'i-lucide-table' : draft.mode === 'toc-generator' ? 'i-lucide-list-tree' : 'i-lucide-file-text'"
            class="size-3.5"
          />
          {{ draft.mode === 'table-formatter' ? 'Table Formatter' : draft.mode === 'toc-generator' ? 'TOC Generator' : 'Markdown Stripper' }}
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Characters</span>
        <div class="font-mono mt-0.5">
          <strong class="text-highlighted">{{ stats.outChars }}</strong> chars
          <span class="text-muted text-[11px]">(in: {{ stats.inChars }})</span>
        </div>
      </div>
    </div>

    <!-- Dual Panes: Left Input, Right Processed Output -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Input Pane -->
      <div class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden min-h-[500px]">
        <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <span class="flex items-center gap-2">
            <UIcon
              name="i-lucide-file-text"
              class="size-4"
            />
            Input Markdown Document
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
          </div>
        </div>
        <div class="p-2 flex-1 flex flex-col">
          <textarea
            v-model="draft.input"
            placeholder="Type or paste markdown table or full document here..."
            class="w-full flex-1 p-3 bg-transparent font-mono text-xs focus:outline-none resize-none text-highlighted"
            spellcheck="false"
          />
        </div>
      </div>

      <!-- Converted Output Pane -->
      <div class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden min-h-[500px]">
        <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <span class="flex items-center gap-2">
            <UIcon
              name="i-lucide-sparkles"
              class="size-4 text-primary"
            />
            Processed Output
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
        <div class="p-2 flex-1 flex flex-col">
          <textarea
            :value="output"
            readonly
            placeholder="Formatted markdown will appear here..."
            class="w-full flex-1 p-3 bg-transparent font-mono text-xs focus:outline-none resize-none text-highlighted"
            spellcheck="false"
          />
        </div>
      </div>
    </div>
  </div>
</template>
