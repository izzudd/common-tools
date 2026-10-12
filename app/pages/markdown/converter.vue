<script setup lang="ts">
import { useClipboardAction } from '~/composables/useClipboardAction'
import { useToolDraft } from '~/composables/useToolDraft'
import {
  htmlToMarkdown,
  markdownToHtml,
  markdownToDocsHtml,
  copyRichHtmlToClipboard
} from '~/utils/markdown'

type ConverterMode = 'md-to-html' | 'html-to-md' | 'md-to-docs'
type PreviewTab = 'raw' | 'rendered'

interface MarkdownConverterDraft {
  input: string
  mode: ConverterMode
  previewTab: PreviewTab
  gfm: boolean
  breaks: boolean
  headingStyle: 'atx' | 'setext'
  bulletListMarker: '-' | '+' | '*'
}

const { state: draft, clearDraft } = useToolDraft<MarkdownConverterDraft>('markdown-converter', () => ({
  input: '',
  mode: 'md-to-html',
  previewTab: 'rendered',
  gfm: true,
  breaks: true,
  headingStyle: 'atx',
  bulletListMarker: '-'
}))

const output = ref('')
const docsStyledHtml = ref('')
const isCopiedDocs = ref(false)
const { copied, copyToClipboard } = useClipboardAction()
const toast = useToast()

const sampleMarkdown = `# 🚀 Project Overview & Architecture

Welcome to **DevPocket**! A client-side, privacy-first companion built for modern engineers.

## Key Highlights
- **100% Client-Side**: Zero telemetry, zero cloud database leaks.
- **Fast Performance**: Powered by Bun & Nuxt 4.
- **Rich Offline Tools**: JSON formatters, SQL generators, and text utilities.

### Quick Example Table
| Component | Status | Speed |
| :--- | :---: | ---: |
| Markdown Parser | ✅ Ready | Instant |
| HTML Converter | ✅ Ready | Instant |
| Google Docs Paste | 🚀 Active | Real-time |

> *"Simplicity is the prerequisite for reliability."* — Edsger W. Dijkstra

Check out [Google Docs](https://docs.google.com) to test copy-pasting styled rich text!`

const sampleHtml = `<div class="container">
  <h1>🚀 Project Overview & Architecture</h1>
  <p>Welcome to <strong>DevPocket</strong>! A client-side, privacy-first companion built for modern engineers.</p>
  
  <h2>Key Highlights</h2>
  <ul>
    <li><strong>100% Client-Side</strong>: Zero telemetry, zero cloud database leaks.</li>
    <li><strong>Fast Performance</strong>: Powered by Bun &amp; Nuxt 4.</li>
    <li><strong>Rich Offline Tools</strong>: JSON formatters, SQL generators, and text utilities.</li>
  </ul>

  <blockquote>
    <p><em>"Simplicity is the prerequisite for reliability."</em> — Edsger W. Dijkstra</p>
  </blockquote>

  <table>
    <thead>
      <tr>
        <th>Component</th>
        <th>Status</th>
        <th>Speed</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Markdown Parser</td>
        <td>Ready</td>
        <td>Instant</td>
      </tr>
    </tbody>
  </table>
</div>`

function loadSample() {
  if (draft.value.mode === 'html-to-md') {
    draft.value.input = sampleHtml
  } else {
    draft.value.input = sampleMarkdown
  }
  convertContent()
}

function clearAll() {
  clearDraft()
  output.value = ''
  docsStyledHtml.value = ''
}

function swapDirection() {
  if (draft.value.mode === 'html-to-md') {
    draft.value.mode = 'md-to-html'
  } else if (draft.value.mode === 'md-to-html') {
    draft.value.mode = 'html-to-md'
  }

  // Swap input with output if available
  if (output.value.trim()) {
    draft.value.input = output.value
  }
  convertContent()
}

function convertContent() {
  const raw = draft.value.input.trim()
  if (!raw) {
    output.value = ''
    docsStyledHtml.value = ''
    return
  }

  if (draft.value.mode === 'html-to-md') {
    output.value = htmlToMarkdown(raw, {
      headingStyle: draft.value.headingStyle,
      bulletListMarker: draft.value.bulletListMarker
    })
    docsStyledHtml.value = ''
  } else if (draft.value.mode === 'md-to-html') {
    output.value = markdownToHtml(raw, {
      gfm: draft.value.gfm,
      breaks: draft.value.breaks
    })
    docsStyledHtml.value = ''
  } else if (draft.value.mode === 'md-to-docs') {
    const styled = markdownToDocsHtml(raw)
    output.value = styled
    docsStyledHtml.value = styled
  }
}

watch(
  draft,
  () => {
    convertContent()
  },
  { deep: true, immediate: true }
)

async function copyForGoogleDocs() {
  const md = draft.value.input.trim()
  if (!md) {
    toast.add({
      title: 'Nothing to copy',
      description: 'Please input Markdown first',
      color: 'warning'
    })
    return
  }

  const styled = markdownToDocsHtml(md)
  const success = await copyRichHtmlToClipboard(styled, md)

  if (success) {
    isCopiedDocs.value = true
    toast.add({
      title: 'Copied for Google Docs & Word!',
      description: 'You can now press Ctrl+V / Cmd+V directly in Google Docs or MS Word with preserved formatting.',
      color: 'success',
      icon: 'i-lucide-clipboard-check'
    })
    setTimeout(() => {
      isCopiedDocs.value = false
    }, 2500)
  } else {
    toast.add({
      title: 'Copy failed',
      description: 'Could not write rich text format to clipboard.',
      color: 'error'
    })
  }
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      draft.value.input = text
      convertContent()
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

  let filename = 'document.txt'
  let mime = 'text/plain'

  if (draft.value.mode === 'html-to-md') {
    filename = 'converted.md'
    mime = 'text/markdown'
  } else {
    filename = 'converted.html'
    mime = 'text/html'
  }

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

function handleFileUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    const content = event.target?.result as string
    if (content) {
      draft.value.input = content
      convertContent()
      toast.add({
        title: 'File Loaded',
        description: `Imported ${file.name}`,
        color: 'success'
      })
    }
  }
  reader.readAsText(file)
}

const stats = computed(() => {
  const inText = draft.value.input
  const outText = output.value
  const inWords = inText ? inText.trim().split(/\s+/).filter(Boolean).length : 0
  const outWords = outText ? outText.trim().split(/\s+/).filter(Boolean).length : 0
  const inLines = inText ? inText.split(/\r?\n/).length : 0
  const outLines = outText ? outText.split(/\r?\n/).length : 0

  return {
    inChars: inText.length,
    outChars: outText.length,
    inWords,
    outWords,
    inLines,
    outLines
  }
})
</script>

<template>
  <div class="space-y-6">
    <ToolHeader
      title="Markdown & HTML Converter"
      description="Convert Markdown to HTML, HTML to clean Markdown, and produce formatted rich text ready for instant copy-pasting into Google Docs & Word."
      icon="i-lucide-file-text"
      category="Markdown Tools"
      badge="Multi-Way"
      tool-id="markdown-converter"
      :copy-text="output"
      :disable-copy="!output"
      @load-sample="loadSample"
      @clear="clearAll"
    >
      <template #actions>
        <div class="flex flex-wrap items-center justify-between gap-3 w-full">
          <!-- Mode Switcher Tabs -->
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-muted font-medium">Conversion Mode:</span>
            <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
                :class="draft.mode === 'md-to-html' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
                @click="draft.mode = 'md-to-html'"
              >
                <UIcon
                  name="i-lucide-file-code"
                  class="size-3.5"
                />
                Markdown → HTML
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
                :class="draft.mode === 'html-to-md' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
                @click="draft.mode = 'html-to-md'"
              >
                <UIcon
                  name="i-lucide-file-text"
                  class="size-3.5"
                />
                HTML → Markdown
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
                :class="draft.mode === 'md-to-docs' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
                @click="draft.mode = 'md-to-docs'"
              >
                <UIcon
                  name="i-lucide-sparkles"
                  class="size-3.5"
                />
                Markdown → Google Docs
              </button>
            </div>
          </div>

          <!-- Utility Action Controls -->
          <div class="flex items-center gap-2">
            <!-- Swap Direction button (for HTML <-> MD) -->
            <UButton
              v-if="draft.mode !== 'md-to-docs'"
              icon="i-lucide-arrow-left-right"
              label="Swap Mode"
              size="xs"
              color="neutral"
              variant="outline"
              @click="swapDirection"
            />

            <!-- Special Copy to Google Docs Button -->
            <UButton
              v-if="draft.mode === 'md-to-docs' || draft.mode === 'md-to-html'"
              :icon="isCopiedDocs ? 'i-lucide-check' : 'i-lucide-clipboard-check'"
              :label="isCopiedDocs ? 'Copied Rich Text!' : 'Copy for Google Docs'"
              size="xs"
              color="success"
              variant="solid"
              :disabled="!draft.input.trim()"
              @click="copyForGoogleDocs"
            />

            <!-- Download Button -->
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

        <!-- Mode-Specific Configuration Row -->
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs pt-2 border-t border-default/50 w-full">
          <!-- Markdown to HTML / Google Docs options -->
          <template v-if="draft.mode === 'md-to-html' || draft.mode === 'md-to-docs'">
            <label class="flex items-center gap-1.5 text-muted hover:text-highlighted cursor-pointer select-none">
              <input
                v-model="draft.gfm"
                type="checkbox"
                class="rounded border-default text-primary focus:ring-primary/20"
              >
              <span>GitHub Flavored Markdown (GFM Tables, Strikethrough)</span>
            </label>
            <label class="flex items-center gap-1.5 text-muted hover:text-highlighted cursor-pointer select-none">
              <input
                v-model="draft.breaks"
                type="checkbox"
                class="rounded border-default text-primary focus:ring-primary/20"
              >
              <span>Convert Soft Line Breaks (&lt;br&gt;)</span>
            </label>
          </template>

          <!-- HTML to Markdown options -->
          <template v-else-if="draft.mode === 'html-to-md'">
            <div class="flex items-center gap-2">
              <span class="text-muted">Heading Style:</span>
              <div class="inline-flex rounded border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900 font-mono text-[11px]">
                <button
                  type="button"
                  class="px-2 py-0.5 rounded"
                  :class="draft.headingStyle === 'atx' ? 'bg-neutral-200 dark:bg-neutral-800 text-highlighted font-semibold' : 'text-muted'"
                  @click="draft.headingStyle = 'atx'"
                >
                  ATX (#)
                </button>
                <button
                  type="button"
                  class="px-2 py-0.5 rounded"
                  :class="draft.headingStyle === 'setext' ? 'bg-neutral-200 dark:bg-neutral-800 text-highlighted font-semibold' : 'text-muted'"
                  @click="draft.headingStyle = 'setext'"
                >
                  Setext (===)
                </button>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-muted">List Bullet:</span>
              <div class="inline-flex rounded border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900 font-mono text-[11px]">
                <button
                  v-for="bullet in (['-', '*', '+'] as const)"
                  :key="bullet"
                  type="button"
                  class="px-2 py-0.5 rounded"
                  :class="draft.bulletListMarker === bullet ? 'bg-neutral-200 dark:bg-neutral-800 text-highlighted font-semibold' : 'text-muted'"
                  @click="draft.bulletListMarker = bullet"
                >
                  {{ bullet }}
                </button>
              </div>
            </div>
          </template>

          <!-- Quick Navigation to Table & Extra Tools -->
          <div class="ml-auto flex items-center gap-2">
            <UButton
              to="/markdown/formatter"
              icon="i-lucide-sparkles"
              label="Table Formatter & TOC Tool"
              size="xs"
              color="neutral"
              variant="link"
            />
          </div>
        </div>
      </template>
    </ToolHeader>

    <!-- Metrics Bar -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-default bg-neutral-100/40 dark:bg-neutral-900/40 text-xs">
      <div>
        <span class="text-muted block text-[11px]">Input Size</span>
        <div class="font-mono mt-0.5">
          <strong class="text-highlighted">{{ stats.inChars }}</strong> chars
          <span class="text-muted text-[11px]">({{ stats.inWords }} words, {{ stats.inLines }} lines)</span>
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Output Size</span>
        <div class="font-mono mt-0.5">
          <strong class="text-highlighted">{{ stats.outChars }}</strong> chars
          <span class="text-muted text-[11px]">({{ stats.outWords }} words, {{ stats.outLines }} lines)</span>
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Active Mode</span>
        <div class="font-mono mt-0.5 font-semibold text-primary capitalize flex items-center gap-1.5">
          <UIcon
            :name="draft.mode === 'html-to-md' ? 'i-lucide-file-text' : draft.mode === 'md-to-docs' ? 'i-lucide-sparkles' : 'i-lucide-file-code'"
            class="size-3.5"
          />
          {{ draft.mode === 'html-to-md' ? 'HTML to Markdown' : draft.mode === 'md-to-docs' ? 'Google Docs Rich Text' : 'Markdown to HTML' }}
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

    <!-- Dual Panes: Left Input, Right Converted Output -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Input Pane -->
      <div class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden min-h-[520px]">
        <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <span class="flex items-center gap-2">
            <UIcon
              :name="draft.mode === 'html-to-md' ? 'i-lucide-code-xml' : 'i-lucide-file-text'"
              class="size-4"
            />
            Input {{ draft.mode === 'html-to-md' ? 'HTML' : 'Markdown' }}
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
                :accept="draft.mode === 'html-to-md' ? '.html,.htm,.txt' : '.md,.markdown,.txt'"
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
        <div class="p-2 flex-1 flex flex-col">
          <textarea
            v-model="draft.input"
            :placeholder="draft.mode === 'html-to-md' ? 'Paste raw HTML here...' : 'Type or paste Markdown here...'"
            class="w-full flex-1 p-3 bg-transparent font-mono text-xs focus:outline-none resize-none text-highlighted"
            spellcheck="false"
          />
        </div>
      </div>

      <!-- Output Pane -->
      <div class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden min-h-[520px]">
        <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <div class="flex items-center gap-2">
            <!-- Output View Switcher (Rendered vs Code) -->
            <div class="inline-flex rounded border border-default p-0.5 bg-neutral-200/50 dark:bg-neutral-800/50 text-[11px]">
              <button
                type="button"
                class="px-2.5 py-0.5 rounded transition-all font-medium"
                :class="draft.previewTab === 'rendered' ? 'bg-white dark:bg-neutral-700 text-highlighted shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
                @click="draft.previewTab = 'rendered'"
              >
                Rich Preview
              </button>
              <button
                type="button"
                class="px-2.5 py-0.5 rounded transition-all font-medium"
                :class="draft.previewTab === 'raw' ? 'bg-white dark:bg-neutral-700 text-highlighted shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
                @click="draft.previewTab = 'raw'"
              >
                Raw Code
              </button>
            </div>
            <span class="text-muted text-[11px] font-mono hidden sm:inline">
              {{ draft.mode === 'html-to-md' ? 'Markdown' : draft.mode === 'md-to-docs' ? 'Google Docs Rich HTML' : 'HTML Code' }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <span class="font-mono text-[11px]">{{ stats.outChars }} chars</span>
            <!-- Special Google Docs Rich Copy in Output Bar -->
            <UButton
              v-if="draft.mode === 'md-to-docs'"
              :icon="isCopiedDocs ? 'i-lucide-check' : 'i-lucide-clipboard-check'"
              :label="isCopiedDocs ? 'Copied Rich Text!' : 'Copy to Docs'"
              size="xs"
              color="success"
              variant="solid"
              :disabled="!output"
              @click="copyForGoogleDocs"
            />
            <UButton
              v-else
              :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
              :label="copied ? 'Copied' : 'Copy'"
              size="xs"
              color="neutral"
              variant="outline"
              :disabled="!output"
              @click="copyToClipboard(output)"
            />
          </div>
        </div>

        <div class="p-2 flex-1 flex flex-col overflow-auto">
          <!-- Rendered HTML / Docs Preview -->
          <div
            v-if="draft.previewTab === 'rendered'"
            class="p-4 rounded-lg bg-white dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 flex-1 overflow-auto text-sm text-neutral-800 dark:text-neutral-200"
          >
            <!-- Google Docs info banner -->
            <div
              v-if="draft.mode === 'md-to-docs'"
              class="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5"
            >
              <UIcon
                name="i-lucide-sparkles"
                class="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5"
              />
              <div>
                <strong>Google Docs &amp; Word Ready!</strong>
                <p class="mt-0.5 text-emerald-700/90 dark:text-emerald-400/90">
                  Click <em>"Copy for Google Docs"</em> above, then paste directly (Ctrl+V / Cmd+V) into Google Docs, MS Word, or Notion. All typography, tables, colors, blockquotes, and headings will transfer seamlessly.
                </p>
              </div>
            </div>

            <!-- eslint-disable vue/no-v-html -->
            <!-- If converting HTML to MD, render marked markdown -->
            <div
              v-if="draft.mode === 'html-to-md'"
              data-markdown-preview
              class="text-xs overflow-auto"
              v-html="output ? markdownToHtml(output) : '<p class=\'text-muted italic\'>Converted markdown preview will appear here...</p>'"
            />
            <!-- If converting MD to HTML / Docs, render output HTML -->
            <div
              v-else
              data-markdown-preview
              class="text-xs overflow-auto"
              v-html="output || '<p class=\'text-muted italic\'>Formatted preview will appear here...</p>'"
            />
            <!-- eslint-enable vue/no-v-html -->
          </div>

          <!-- Raw Code Textarea -->
          <textarea
            v-else
            :value="output"
            readonly
            placeholder="Converted code will appear here..."
            class="w-full flex-1 p-3 bg-transparent font-mono text-xs focus:outline-none resize-none text-highlighted"
            spellcheck="false"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
[data-markdown-preview] :deep(h1) {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid rgba(156, 163, 175, 0.3);
  padding-bottom: 0.25rem;
}

[data-markdown-preview] :deep(h2) {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.35rem;
  border-bottom: 1px solid rgba(156, 163, 175, 0.2);
  padding-bottom: 0.2rem;
}

[data-markdown-preview] :deep(h3) {
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 0.75rem;
  margin-bottom: 0.25rem;
}

[data-markdown-preview] :deep(p) {
  margin-top: 0.4rem;
  margin-bottom: 0.6rem;
  line-height: 1.6;
}

[data-markdown-preview] :deep(ul) {
  list-style-type: disc;
  padding-left: 1.25rem;
  margin-top: 0.4rem;
  margin-bottom: 0.6rem;
}

[data-markdown-preview] :deep(ol) {
  list-style-type: decimal;
  padding-left: 1.25rem;
  margin-top: 0.4rem;
  margin-bottom: 0.6rem;
}

[data-markdown-preview] :deep(li) {
  margin-top: 0.2rem;
  margin-bottom: 0.2rem;
}

[data-markdown-preview] :deep(blockquote) {
  border-left: 3px solid #10b981;
  padding-left: 0.75rem;
  margin: 0.75rem 0;
  opacity: 0.85;
  font-style: italic;
}

[data-markdown-preview] :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75rem 0;
  font-size: 0.75rem;
}

[data-markdown-preview] :deep(th),
[data-markdown-preview] :deep(td) {
  border: 1px solid rgba(156, 163, 175, 0.4);
  padding: 0.4rem 0.6rem;
}

[data-markdown-preview] :deep(th) {
  background-color: rgba(156, 163, 175, 0.15);
  font-weight: 600;
}

[data-markdown-preview] :deep(pre) {
  background-color: rgba(156, 163, 175, 0.15);
  padding: 0.75rem;
  border-radius: 0.375rem;
  overflow-x: auto;
  font-family: monospace;
  margin: 0.6rem 0;
}

[data-markdown-preview] :deep(code) {
  font-family: monospace;
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
  background-color: rgba(156, 163, 175, 0.15);
}

[data-markdown-preview] :deep(a) {
  color: #10b981;
  text-decoration: underline;
}
</style>
