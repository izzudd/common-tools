<script setup lang="ts">
import { useClipboardAction } from '~/composables/useClipboardAction'
import { useToolDraft } from '~/composables/useToolDraft'
import {
  markdownToHtml,
  markdownToDocsHtml,
  copyRichHtmlToClipboard
} from '~/utils/markdown'

type ViewportLayout = 'split' | 'editor-only' | 'preview-only'
type PreviewTheme = 'light' | 'dark'

interface LiveEditorDraft {
  markdown: string
  layout: ViewportLayout
  syncScroll: boolean
  previewTheme: PreviewTheme
  enableGfm: boolean
  enableBreaks: boolean
}

const defaultSample = `# 🚀 Live Markdown Editor & Docs Exporter

Welcome to **Quoin's Markdown Live Preview**! Write markdown on the left, and watch the live preview update in real-time on the right.

---

## 📋 Features at a Glance
- **Instant Dual-Pane Live Preview**: Synchronous typing without reloads.
- **Copy for Google Docs & MS Word**: One click preserves fonts, headings, colors, tables, and spacing.
- **GFM Ready**: Task lists, strikethrough, tables, and blockquotes.

### 📊 Benchmark Comparison Table
| Feature | Quoin | Cloud Tools |
| :--- | :---: | :---: |
| Data Privacy | 🔒 100% Client-Side | ⚠️ Stored in DB |
| Offline Access | ✅ Instant | ❌ Needs Network |
| Speed | ⚡ Near Zero Latency | ⏳ Server Latency |

### 🛠️ Code Snippet
\`\`\`typescript
interface UserProfile {
  id: string
  displayName: string
  isPro: boolean
}
\`\`\`

### ✅ Interactive Task List
- [x] Write intuitive documentation
- [x] Test copy-paste in Google Docs
- [ ] Export directly to PDF or HTML

> *"Simplicity is about subtracting the obvious and adding the meaningful."* — John Maeda

Click the green **"Copy for Google Docs"** button above, then press \`Ctrl+V\` / \`Cmd+V\` directly in **Google Docs**, **MS Word**, or **Notion**!`

const { state: draft, clearDraft } = useToolDraft<LiveEditorDraft>('markdown-live-editor', () => ({
  markdown: '',
  layout: 'split',
  syncScroll: true,
  previewTheme: 'light',
  enableGfm: true,
  enableBreaks: true
}))

const editorTextareaRef = ref<HTMLTextAreaElement | null>(null)
const previewContainerRef = ref<HTMLDivElement | null>(null)
const isCopiedDocs = ref(false)
const isFullscreen = ref(false)
const toast = useToast()
const { copyToClipboard } = useClipboardAction()

const renderedHtml = computed(() => {
  const content = draft.value.markdown.trim()
  if (!content) return ''
  return markdownToHtml(content, {
    gfm: draft.value.enableGfm,
    breaks: draft.value.enableBreaks
  })
})

function loadSample() {
  draft.value.markdown = defaultSample
}

function clearAll() {
  clearDraft()
}

// Quick insertion helper for markdown syntax toolbar
function insertSyntax(prefix: string, suffix = '', placeholder = '') {
  const textarea = editorTextareaRef.value
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = draft.value.markdown
  const selected = text.substring(start, end) || placeholder

  const replacement = `${prefix}${selected}${suffix}`
  draft.value.markdown = text.substring(0, start) + replacement + text.substring(end)

  nextTick(() => {
    textarea.focus()
    const cursorPosition = start + prefix.length + selected.length
    textarea.setSelectionRange(cursorPosition, cursorPosition)
  })
}

// Synchronized scrolling between editor textarea and preview container
function handleEditorScroll() {
  if (!draft.value.syncScroll || !editorTextareaRef.value || !previewContainerRef.value) return
  const textarea = editorTextareaRef.value
  const preview = previewContainerRef.value

  const scrollPercentage = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight || 1)
  preview.scrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight)
}

async function copyForGoogleDocs() {
  const md = draft.value.markdown.trim()
  if (!md) {
    toast.add({
      title: 'Nothing to copy',
      description: 'Please write or paste markdown first',
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
      description: 'Press Ctrl+V / Cmd+V in Google Docs or Word. Typography, tables, and colors are preserved.',
      color: 'success',
      icon: 'i-lucide-clipboard-check'
    })
    setTimeout(() => {
      isCopiedDocs.value = false
    }, 2500)
  } else {
    toast.add({
      title: 'Copy failed',
      description: 'Clipboard permissions denied or unavailable',
      color: 'error'
    })
  }
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      draft.value.markdown = text
      toast.add({
        title: 'Pasted from Clipboard',
        color: 'success'
      })
    }
  } catch {
    toast.add({
      title: 'Clipboard Permission Denied',
      description: 'Please paste directly into the editor (Ctrl+V / Cmd+V)',
      color: 'warning'
    })
  }
}

function downloadMarkdown() {
  if (!draft.value.markdown) return
  const blob = new Blob([draft.value.markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'document.md'
  a.click()
  URL.revokeObjectURL(url)

  toast.add({
    title: 'Markdown Downloaded',
    description: 'Saved as document.md',
    color: 'success'
  })
}

function downloadHtml() {
  if (!renderedHtml.value) return
  const fullDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exported Markdown</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1f2937; }
    h1, h2, h3 { color: #111827; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #d1d5db; padding: 8px 12px; }
    th { background: #f3f4f6; text-align: left; }
    blockquote { border-left: 4px solid #10b981; margin: 0; padding-left: 16px; color: #4b5563; font-style: italic; }
    pre { background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; }
    code { font-family: monospace; background: #f3f4f6; padding: 2px 4px; border-radius: 4px; }
  </style>
</head>
<body>
${renderedHtml.value}
</body>
</html>`

  const blob = new Blob([fullDoc], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'document.html'
  a.click()
  URL.revokeObjectURL(url)

  toast.add({
    title: 'HTML Downloaded',
    description: 'Saved as document.html',
    color: 'success'
  })
}

const stats = computed(() => {
  const text = draft.value.markdown
  const words = text ? text.trim().split(/\s+/).filter(Boolean).length : 0
  const lines = text ? text.split(/\r?\n/).length : 0
  const chars = text.length

  return {
    chars,
    words,
    lines,
    readingTimeMinutes: Math.ceil(words / 200) || 1
  }
})
</script>

<template>
  <div class="space-y-6">
    <ToolHeader
      title="Markdown Live Preview & Editor"
      description="Write markdown with real-time live preview, formatting toolbar, synchronized scrolling, and 1-click rich-text copy for Google Docs & Word."
      icon="i-lucide-eye"
      category="Markdown Tools"
      badge="Live Preview"
      tool-id="markdown-live-editor"
      :copy-text="draft.markdown"
      :disable-copy="!draft.markdown"
      @load-sample="loadSample"
      @clear="clearAll"
    >
      <template #actions>
        <div class="flex flex-wrap items-center justify-between gap-3 w-full">
          <!-- View Layout Selector -->
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-muted font-medium">Layout:</span>
            <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
                :class="draft.layout === 'split' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
                title="Split Side-by-Side"
                @click="draft.layout = 'split'"
              >
                <UIcon
                  name="i-lucide-columns-2"
                  class="size-3.5"
                />
                Split View
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
                :class="draft.layout === 'editor-only' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
                title="Editor Only"
                @click="draft.layout = 'editor-only'"
              >
                <UIcon
                  name="i-lucide-file-edit"
                  class="size-3.5"
                />
                Editor
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
                :class="draft.layout === 'preview-only' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
                title="Preview Only"
                @click="draft.layout = 'preview-only'"
              >
                <UIcon
                  name="i-lucide-book-open"
                  class="size-3.5"
                />
                Preview
              </button>
            </div>
          </div>

          <!-- Primary Actions -->
          <div class="flex items-center gap-2">
            <!-- Copy for Google Docs (Hero Action) -->
            <UButton
              :icon="isCopiedDocs ? 'i-lucide-check' : 'i-lucide-clipboard-check'"
              :label="isCopiedDocs ? 'Copied Rich Text!' : 'Copy for Google Docs'"
              size="xs"
              color="success"
              variant="solid"
              :disabled="!draft.markdown.trim()"
              @click="copyForGoogleDocs"
            />

            <!-- Copy Raw Markdown -->
            <UButton
              icon="i-lucide-copy"
              label="Copy MD"
              size="xs"
              color="neutral"
              variant="outline"
              :disabled="!draft.markdown.trim()"
              @click="copyToClipboard(draft.markdown, 'Markdown copied!')"
            />

            <!-- Download Markdown File -->
            <UButton
              icon="i-lucide-download"
              label="Download MD"
              size="xs"
              color="neutral"
              variant="outline"
              :disabled="!draft.markdown.trim()"
              @click="downloadMarkdown"
            />

            <!-- Download HTML File -->
            <UButton
              icon="i-lucide-file-code"
              label="HTML"
              size="xs"
              color="neutral"
              variant="outline"
              :disabled="!renderedHtml"
              @click="downloadHtml"
            />
          </div>
        </div>

        <!-- Secondary Config Row -->
        <div class="flex flex-wrap items-center justify-between gap-3 text-xs pt-2 border-t border-default/50 w-full">
          <div class="flex flex-wrap items-center gap-4">
            <label class="flex items-center gap-1.5 text-muted hover:text-highlighted cursor-pointer select-none">
              <input
                v-model="draft.syncScroll"
                type="checkbox"
                class="rounded border-default text-primary focus:ring-primary/20"
              >
              <span>Synchronize Scrolling</span>
            </label>
            <label class="flex items-center gap-1.5 text-muted hover:text-highlighted cursor-pointer select-none">
              <input
                v-model="draft.enableBreaks"
                type="checkbox"
                class="rounded border-default text-primary focus:ring-primary/20"
              >
              <span>Soft Line Breaks</span>
            </label>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              to="/markdown/converter"
              icon="i-lucide-file-code"
              label="HTML &amp; Docs Converter"
              size="xs"
              color="neutral"
              variant="link"
            />
            <UButton
              to="/markdown/formatter"
              icon="i-lucide-table-properties"
              label="Table Formatter &amp; TOC"
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
        <span class="text-muted block text-[11px]">Length</span>
        <div class="font-mono mt-0.5">
          <strong class="text-highlighted">{{ stats.chars }}</strong> characters
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Word Count</span>
        <div class="font-mono mt-0.5">
          <strong class="text-highlighted">{{ stats.words }}</strong> words
          <span class="text-muted text-[11px]">({{ stats.lines }} lines)</span>
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Est. Reading Time</span>
        <div class="font-mono mt-0.5 font-semibold text-highlighted">
          ~{{ stats.readingTimeMinutes }} min read
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Docs Compatibility</span>
        <div class="font-mono mt-0.5 text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
          <UIcon
            name="i-lucide-check-circle-2"
            class="size-3.5"
          />
          Google Docs / Word Ready
        </div>
      </div>
    </div>

    <!-- Main Workspace Container -->
    <div
      class="grid gap-4 transition-all"
      :class="[
        draft.layout === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1',
        isFullscreen ? 'fixed inset-4 z-50 bg-neutral-50 dark:bg-neutral-950 p-4 rounded-2xl shadow-2xl border border-default' : ''
      ]"
    >
      <!-- Left Pane: Markdown Editor -->
      <div
        v-if="draft.layout !== 'preview-only'"
        class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden min-h-[580px]"
      >
        <!-- Editor Toolbar -->
        <div class="flex items-center justify-between px-3.5 py-2 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <!-- Formatting Quick Buttons -->
          <div class="flex items-center gap-1 overflow-x-auto py-0.5">
            <button
              type="button"
              class="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-highlighted transition-colors font-bold text-xs"
              title="Bold (**text**)"
              @click="insertSyntax('**', '**', 'bold text')"
            >
              B
            </button>
            <button
              type="button"
              class="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-highlighted transition-colors italic text-xs font-serif"
              title="Italic (*text*)"
              @click="insertSyntax('*', '*', 'italic text')"
            >
              I
            </button>
            <button
              type="button"
              class="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-highlighted transition-colors line-through text-xs"
              title="Strikethrough (~~text~~)"
              @click="insertSyntax('~~', '~~', 'strikethrough')"
            >
              S
            </button>
            <span class="w-px h-4 bg-default mx-1" />
            <button
              type="button"
              class="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-highlighted transition-colors font-mono text-xs"
              title="Heading 2 (## Title)"
              @click="insertSyntax('## ', '\n', 'Heading 2')"
            >
              H2
            </button>
            <button
              type="button"
              class="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-highlighted transition-colors font-mono text-xs"
              title="Heading 3 (### Subtitle)"
              @click="insertSyntax('### ', '\n', 'Heading 3')"
            >
              H3
            </button>
            <span class="w-px h-4 bg-default mx-1" />
            <button
              type="button"
              class="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-highlighted transition-colors"
              title="Unordered List (- Item)"
              @click="insertSyntax('- ', '\n', 'List item')"
            >
              <UIcon
                name="i-lucide-list"
                class="size-3.5"
              />
            </button>
            <button
              type="button"
              class="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-highlighted transition-colors"
              title="Numbered List (1. Item)"
              @click="insertSyntax('1. ', '\n', 'List item')"
            >
              <UIcon
                name="i-lucide-list-ordered"
                class="size-3.5"
              />
            </button>
            <button
              type="button"
              class="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-highlighted transition-colors"
              title="Task List (- [ ] Task)"
              @click="insertSyntax('- [ ] ', '\n', 'New task')"
            >
              <UIcon
                name="i-lucide-check-square"
                class="size-3.5"
              />
            </button>
            <button
              type="button"
              class="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-highlighted transition-colors"
              title="Quote (> Quote)"
              @click="insertSyntax('> ', '\n', 'Blockquote')"
            >
              <UIcon
                name="i-lucide-quote"
                class="size-3.5"
              />
            </button>
            <button
              type="button"
              class="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-highlighted transition-colors"
              title="Code Block (```)"
              @click="insertSyntax('```\n', '\n```', 'code block')"
            >
              <UIcon
                name="i-lucide-code"
                class="size-3.5"
              />
            </button>
            <button
              type="button"
              class="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-highlighted transition-colors"
              title="Table"
              @click="insertSyntax('| Col 1 | Col 2 |\n| :--- | :--- |\n| Data 1 | Data 2 |\n', '', '')"
            >
              <UIcon
                name="i-lucide-table"
                class="size-3.5"
              />
            </button>
            <button
              type="button"
              class="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-highlighted transition-colors"
              title="Link ([text](url))"
              @click="insertSyntax('[', '](https://example.com)', 'link text')"
            >
              <UIcon
                name="i-lucide-link"
                class="size-3.5"
              />
            </button>
          </div>

          <!-- Utility Paste -->
          <div class="flex items-center gap-2 shrink-0">
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

        <!-- Textarea Editor -->
        <div class="p-2 flex-1 flex flex-col">
          <textarea
            ref="editorTextareaRef"
            v-model="draft.markdown"
            placeholder="Type or paste markdown here... Use the toolbar above for quick formatting."
            class="w-full flex-1 p-3 bg-transparent font-mono text-xs focus:outline-none resize-none text-highlighted leading-relaxed"
            spellcheck="false"
            @scroll="handleEditorScroll"
          />
        </div>
      </div>

      <!-- Right Pane: Real-Time Live Rendered Preview -->
      <div
        v-if="draft.layout !== 'editor-only'"
        class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden min-h-[580px]"
      >
        <!-- Preview Header Bar -->
        <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-eye"
              class="size-4 text-primary"
            />
            <span class="font-semibold text-highlighted">Live Rich Preview</span>
            <UBadge
              color="neutral"
              variant="subtle"
              size="xs"
            >
              HTML Rendered
            </UBadge>
          </div>

          <div class="flex items-center gap-2">
            <!-- Fullscreen toggle -->
            <UButton
              :icon="isFullscreen ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
              size="xs"
              color="neutral"
              variant="ghost"
              :title="isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'"
              @click="isFullscreen = !isFullscreen"
            />

            <!-- Copy for Google Docs in Preview Header -->
            <UButton
              :icon="isCopiedDocs ? 'i-lucide-check' : 'i-lucide-clipboard-check'"
              :label="isCopiedDocs ? 'Copied!' : 'Copy for Docs'"
              size="xs"
              color="success"
              variant="solid"
              :disabled="!draft.markdown.trim()"
              @click="copyForGoogleDocs"
            />
          </div>
        </div>

        <!-- Rendered Canvas Area -->
        <div
          ref="previewContainerRef"
          class="p-4 flex-1 overflow-auto bg-white dark:bg-neutral-900/80"
        >
          <!-- Callout Notice for Google Docs -->
          <div
            v-if="draft.markdown.trim()"
            class="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start justify-between gap-3"
          >
            <div class="flex items-start gap-2">
              <UIcon
                name="i-lucide-sparkles"
                class="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5"
              />
              <div>
                <strong>Google Docs &amp; MS Word Ready</strong>
                <p class="mt-0.5 text-emerald-700/90 dark:text-emerald-400/90">
                  Click <em>"Copy for Docs"</em> to copy this rich layout directly into Google Docs, Word, or Notion with preserved headings, tables, borders, and colors.
                </p>
              </div>
            </div>
            <UButton
              :icon="isCopiedDocs ? 'i-lucide-check' : 'i-lucide-copy'"
              :label="isCopiedDocs ? 'Copied' : 'Copy'"
              size="xs"
              color="success"
              variant="subtle"
              @click="copyForGoogleDocs"
            />
          </div>

          <!-- eslint-disable vue/no-v-html -->
          <div
            data-markdown-preview
            class="text-xs text-neutral-800 dark:text-neutral-200"
            v-html="renderedHtml || '<p class=\'text-muted italic\'>Live rendered markdown will appear here as you type...</p>'"
          />
          <!-- eslint-enable vue/no-v-html -->
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
[data-markdown-preview] :deep(h1) {
  font-size: 1.6rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.6rem;
  border-bottom: 1px solid rgba(156, 163, 175, 0.3);
  padding-bottom: 0.3rem;
  color: #111827;
}

[data-markdown-preview] :deep(h2) {
  font-size: 1.3rem;
  font-weight: 600;
  margin-top: 1.2rem;
  margin-bottom: 0.4rem;
  border-bottom: 1px solid rgba(156, 163, 175, 0.2);
  padding-bottom: 0.25rem;
  color: #1f2937;
}

[data-markdown-preview] :deep(h3) {
  font-size: 1.15rem;
  font-weight: 600;
  margin-top: 0.9rem;
  margin-bottom: 0.3rem;
  color: #374151;
}

[data-markdown-preview] :deep(p) {
  margin-top: 0.45rem;
  margin-bottom: 0.75rem;
  line-height: 1.65;
}

[data-markdown-preview] :deep(ul) {
  list-style-type: disc;
  padding-left: 1.35rem;
  margin-top: 0.45rem;
  margin-bottom: 0.75rem;
}

[data-markdown-preview] :deep(ol) {
  list-style-type: decimal;
  padding-left: 1.35rem;
  margin-top: 0.45rem;
  margin-bottom: 0.75rem;
}

[data-markdown-preview] :deep(li) {
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
  line-height: 1.55;
}

[data-markdown-preview] :deep(blockquote) {
  border-left: 3.5px solid #10b981;
  background-color: rgba(16, 185, 129, 0.05);
  padding: 0.5rem 0.85rem;
  margin: 0.85rem 0;
  border-radius: 0 0.375rem 0.375rem 0;
  font-style: italic;
  color: #4b5563;
}

[data-markdown-preview] :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.85rem 0;
  font-size: 0.75rem;
  border: 1px solid rgba(156, 163, 175, 0.4);
}

[data-markdown-preview] :deep(th),
[data-markdown-preview] :deep(td) {
  border: 1px solid rgba(156, 163, 175, 0.4);
  padding: 0.45rem 0.75rem;
}

[data-markdown-preview] :deep(th) {
  background-color: rgba(156, 163, 175, 0.15);
  font-weight: 600;
  text-align: left;
}

[data-markdown-preview] :deep(pre) {
  background-color: rgba(156, 163, 175, 0.15);
  padding: 0.85rem;
  border-radius: 0.375rem;
  overflow-x: auto;
  font-family: monospace;
  margin: 0.75rem 0;
}

[data-markdown-preview] :deep(code) {
  font-family: monospace;
  padding: 0.15rem 0.35rem;
  border-radius: 0.25rem;
  background-color: rgba(156, 163, 175, 0.15);
  color: #d97706;
}

[data-markdown-preview] :deep(hr) {
  border: 0;
  border-top: 1px solid rgba(156, 163, 175, 0.3);
  margin: 1.25rem 0;
}

[data-markdown-preview] :deep(a) {
  color: #10b981;
  text-decoration: underline;
}

/* Dark mode adjustments inside markdown */
:global(.dark) [data-markdown-preview] :deep(h1),
:global(.dark) [data-markdown-preview] :deep(h2),
:global(.dark) [data-markdown-preview] :deep(h3) {
  color: #f3f4f6;
}

:global(.dark) [data-markdown-preview] :deep(blockquote) {
  color: #9ca3af;
  background-color: rgba(16, 185, 129, 0.1);
}
</style>
