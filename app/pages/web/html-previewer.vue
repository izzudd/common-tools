<script setup lang="ts">
import { useClipboardAction } from '~/composables/useClipboardAction'
import { useToolDraft } from '~/composables/useToolDraft'

type ViewportMode = 'responsive' | 'desktop' | 'tablet' | 'mobile'
type ThemeMode = 'system' | 'light' | 'dark'
type TabMode = 'html' | 'css'

interface HtmlPreviewerDraft {
  html: string
  css: string
  activeTab: TabMode
  viewport: ViewportMode
  emailMode: boolean
  previewTheme: ThemeMode
  autoRefresh: boolean
}

const sampleEmailTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to DevPocket</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); max-width: 600px; width: 100%;">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 36px 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">DevPocket</h1>
              <p style="color: #ecfdf5; margin: 8px 0 0 0; font-size: 14px; font-weight: 400;">Your offline-first, client-side developer companion</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px; color: #334155; font-size: 15px; line-height: 1.6;">
              <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">Welcome aboard, Developer! 🚀</h2>
              <p style="margin: 0 0 16px 0;">
                Thanks for checking out DevPocket. We built this toolkit so you never have to paste sensitive company JSON, credentials, or customer tables into third-party servers again.
              </p>
              
              <!-- Feature List Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 24px 0; padding: 16px;">
                <tr>
                  <td style="padding: 8px 12px;">
                    <strong style="color: #0f172a;">⚡ 100% In-Browser Execution</strong><br>
                    <span style="color: #64748b; font-size: 13px;">Zero tracking, zero analytics, zero server-side persistence.</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px;">
                    <strong style="color: #0f172a;">💾 Local Draft Persistence</strong><br>
                    <span style="color: #64748b; font-size: 13px;">Switch between tools seamlessly without losing your scratchpad inputs.</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px;">
                    <strong style="color: #0f172a;">🎨 High-Fidelity Previews</strong><br>
                    <span style="color: #64748b; font-size: 13px;">Test responsive viewports, email layout widths, and custom styles live.</span>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0 16px 0;">
                <tr>
                  <td align="center">
                    <a href="https://github.com" target="_blank" style="background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);">
                      Explore Open Source Tools
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; color: #64748b; font-size: 13px; text-align: center;">
                Need help or have a feature idea? Star us or open an issue anytime.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center; color: #94a3b8; font-size: 12px;">
              <p style="margin: 0 0 6px 0;">Sent with love from DevPocket &bull; Zero analytics included</p>
              <p style="margin: 0;">You are receiving this sample because you tested the HTML Email Previewer tool.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

const sampleCustomCss = `/* Custom preview overrides or responsive styles */
@media only screen and (max-width: 600px) {
  .email-container {
    width: 100% !important;
    border-radius: 0 !important;
  }
}`

const { state: draft, clearDraft } = useToolDraft<HtmlPreviewerDraft>('html-previewer', () => ({
  html: '',
  css: '',
  activeTab: 'html',
  viewport: 'responsive',
  emailMode: true,
  previewTheme: 'system',
  autoRefresh: true
}))

const iframeRef = ref<HTMLIFrameElement | null>(null)
const isFullscreen = ref(false)
const refreshKey = ref(0)
const toast = useToast()
const { copyToClipboard } = useClipboardAction()

function loadSample() {
  draft.value.html = sampleEmailTemplate
  draft.value.css = sampleCustomCss
  draft.value.emailMode = true
  triggerRefresh()
}

function clearAll() {
  clearDraft()
  triggerRefresh()
}

function triggerRefresh() {
  refreshKey.value++
  renderIframe()
}

const VIEWPORT_WIDTHS: Record<ViewportMode, string> = {
  responsive: '100%',
  desktop: '1200px',
  tablet: '768px',
  mobile: '375px'
}

const currentIframeWidth = computed(() => {
  if (draft.value.emailMode && draft.value.viewport === 'responsive') {
    return '100%'
  }
  return VIEWPORT_WIDTHS[draft.value.viewport]
})

/**
 * Builds composite HTML document including custom CSS and sandboxed scripts
 */
const compiledDocument = computed(() => {
  const rawHtml = draft.value.html.trim()
  const customCss = draft.value.css.trim()

  if (!rawHtml && !customCss) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      color: #94a3b8;
      background-color: #fafafa;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #0f172a;
        color: #64748b;
      }
    }
  </style>
</head>
<body>
  <div style="text-align: center;">
    <p style="font-size: 14px; font-weight: 500;">Preview will render here</p>
    <p style="font-size: 12px; margin-top: 4px; opacity: 0.7;">Type or paste HTML &amp; CSS on the left</p>
  </div>
</body>
</html>`
  }

  // If input already has <html> or <head>, inject CSS into head or top
  let doc = rawHtml
  const styleTag = customCss ? `<style id="devpocket-custom-css">\n${customCss}\n</style>` : ''

  if (/<head[\s>]/i.test(doc)) {
    doc = doc.replace(/<head[\s>]/i, match => `${match}\n${styleTag}\n`)
  } else if (/<html[\s>]/i.test(doc)) {
    doc = doc.replace(/<html[\s>]/i, match => `${match}\n<head>${styleTag}</head>\n`)
  } else {
    // Fragment without html boilerplate
    doc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${styleTag}
</head>
<body>
  ${doc}
</body>
</html>`
  }

  return doc
})

function renderIframe() {
  if (!iframeRef.value) return
  const doc = iframeRef.value.contentDocument || iframeRef.value.contentWindow?.document
  if (!doc) return

  doc.open()
  doc.write(compiledDocument.value)
  doc.close()
}

// Watch draft changes for live preview
watch(
  [() => draft.value.html, () => draft.value.css, refreshKey],
  () => {
    if (draft.value.autoRefresh) {
      nextTick(() => {
        renderIframe()
      })
    }
  },
  { immediate: true }
)

onMounted(() => {
  renderIframe()
})

function handleFileUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    const content = event.target?.result as string
    if (content) {
      draft.value.html = content
      toast.add({
        title: 'File Loaded',
        description: `Imported ${file.name}`,
        color: 'success'
      })
    }
  }
  reader.readAsText(file)
}

async function pasteClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      if (draft.value.activeTab === 'html') {
        draft.value.html = text
      } else {
        draft.value.css = text
      }
      toast.add({
        title: 'Pasted from Clipboard',
        color: 'success'
      })
    }
  } catch {
    toast.add({
      title: 'Clipboard access denied',
      description: 'Please paste directly into the editor using Ctrl+V / Cmd+V',
      color: 'warning'
    })
  }
}

function downloadHtml() {
  const content = compiledDocument.value
  const blob = new Blob([content], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = draft.value.emailMode ? 'email-template.html' : 'preview.html'
  a.click()
  URL.revokeObjectURL(url)

  toast.add({
    title: 'Downloaded File',
    description: `Saved as ${a.download}`,
    color: 'success'
  })
}

function openInNewTab() {
  const blob = new Blob([compiledDocument.value], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

const stats = computed(() => {
  const htmlChars = draft.value.html.length
  const cssChars = draft.value.css.length
  const totalBytes = new Blob([compiledDocument.value]).size
  const lines = draft.value.html ? draft.value.html.split(/\r?\n/).length : 0

  return {
    htmlChars,
    cssChars,
    totalBytes,
    lines
  }
})
</script>

<template>
  <div class="space-y-6">
    <ToolHeader
      title="HTML & CSS Playground / Email Previewer"
      description="Live HTML and CSS playground with isolated sandboxed iframe, responsive breakpoints, and dedicated email template testing."
      icon="i-lucide-globe"
      category="Web Tools"
      badge="Live Preview"
      :copy-text="compiledDocument"
      :disable-copy="!draft.html.trim()"
      @load-sample="loadSample"
      @clear="clearAll"
    >
      <template #actions>
        <div class="flex flex-wrap items-center justify-between gap-3 w-full">
          <!-- Viewport Mode Selector -->
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-muted font-medium">Viewport:</span>
            <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
                :class="draft.viewport === 'responsive' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
                title="Full width fluid container"
                @click="draft.viewport = 'responsive'"
              >
                <UIcon
                  name="i-lucide-maximize-2"
                  class="size-3.5"
                />
                Fluid
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
                :class="draft.viewport === 'desktop' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
                title="Desktop 1200px"
                @click="draft.viewport = 'desktop'"
              >
                <UIcon
                  name="i-lucide-monitor"
                  class="size-3.5"
                />
                Desktop (1200px)
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
                :class="draft.viewport === 'tablet' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
                title="Tablet 768px"
                @click="draft.viewport = 'tablet'"
              >
                <UIcon
                  name="i-lucide-tablet"
                  class="size-3.5"
                />
                Tablet (768px)
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
                :class="draft.viewport === 'mobile' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
                title="Mobile 375px"
                @click="draft.viewport = 'mobile'"
              >
                <UIcon
                  name="i-lucide-smartphone"
                  class="size-3.5"
                />
                Mobile (375px)
              </button>
            </div>
          </div>

          <!-- Utility Bar: Email Mode & Auto-refresh -->
          <div class="flex items-center gap-3 text-xs">
            <!-- Email Mode Toggle -->
            <label class="flex items-center gap-1.5 text-muted hover:text-highlighted cursor-pointer select-none">
              <input
                v-model="draft.emailMode"
                type="checkbox"
                class="rounded border-default text-primary focus:ring-primary/20"
              >
              <span class="flex items-center gap-1">
                <UIcon
                  name="i-lucide-mail"
                  class="size-3.5 text-primary"
                />
                Email Mode
              </span>
            </label>

            <!-- Auto Refresh Toggle -->
            <label class="flex items-center gap-1.5 text-muted hover:text-highlighted cursor-pointer select-none">
              <input
                v-model="draft.autoRefresh"
                type="checkbox"
                class="rounded border-default text-primary focus:ring-primary/20"
              >
              <span>Auto-refresh</span>
            </label>

            <!-- Manual Refresh Button -->
            <UButton
              icon="i-lucide-rotate-cw"
              label="Refresh"
              size="xs"
              color="neutral"
              variant="outline"
              @click="triggerRefresh"
            />

            <!-- Open in New Tab -->
            <UButton
              icon="i-lucide-external-link"
              label="Pop Out"
              size="xs"
              color="neutral"
              variant="outline"
              @click="openInNewTab"
            />

            <!-- Download HTML -->
            <UButton
              icon="i-lucide-download"
              label="Download"
              size="xs"
              color="primary"
              variant="outline"
              :disabled="!draft.html.trim()"
              @click="downloadHtml"
            />
          </div>
        </div>
      </template>
    </ToolHeader>

    <!-- Metrics Bar -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-default bg-neutral-100/40 dark:bg-neutral-900/40 text-xs">
      <div>
        <span class="text-muted block text-[11px]">HTML Size</span>
        <div class="font-mono mt-0.5">
          <strong class="text-highlighted">{{ stats.htmlChars }}</strong> chars
          <span class="text-muted text-[11px]">({{ stats.lines }} lines)</span>
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Custom CSS</span>
        <div class="font-mono mt-0.5">
          <strong class="text-highlighted">{{ stats.cssChars }}</strong> chars
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Payload Size</span>
        <div class="font-mono mt-0.5 font-semibold text-highlighted">
          {{ stats.totalBytes }} B
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Simulation Mode</span>
        <div class="font-mono mt-0.5 font-semibold text-primary capitalize flex items-center gap-1.5">
          <UIcon
            :name="draft.emailMode ? 'i-lucide-mail' : 'i-lucide-globe'"
            class="size-3.5"
          />
          {{ draft.emailMode ? 'Email Container' : 'Web Browser' }}
        </div>
      </div>
    </div>

    <!-- Dual Panes: Left Editor, Right Live Iframe -->
    <div
      class="grid grid-cols-1 lg:grid-cols-2 gap-4"
      :class="isFullscreen ? 'fixed inset-4 z-50 bg-neutral-50 dark:bg-neutral-950 p-4 rounded-2xl shadow-2xl border border-default' : ''"
    >
      <!-- Left Pane: HTML / CSS Tabs -->
      <div class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden min-h-[580px]">
        <!-- Editor Tab Bar -->
        <div class="flex items-center justify-between px-3.5 py-2 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium">
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="px-3 py-1 rounded-md transition-all flex items-center gap-1.5 text-xs font-semibold"
              :class="draft.activeTab === 'html' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
              @click="draft.activeTab = 'html'"
            >
              <UIcon
                name="i-lucide-code-2"
                class="size-3.5"
              />
              HTML Code
            </button>
            <button
              type="button"
              class="px-3 py-1 rounded-md transition-all flex items-center gap-1.5 text-xs font-semibold"
              :class="draft.activeTab === 'css' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
              @click="draft.activeTab = 'css'"
            >
              <UIcon
                name="i-lucide-paint-brush"
                class="size-3.5"
              />
              Custom CSS
              <span
                v-if="draft.css.trim()"
                class="size-1.5 rounded-full bg-emerald-400"
              />
            </button>
          </div>

          <div class="flex items-center gap-2">
            <!-- Paste button -->
            <UButton
              icon="i-lucide-clipboard-paste"
              label="Paste"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="pasteClipboard"
            />

            <!-- File Upload -->
            <label class="cursor-pointer">
              <input
                type="file"
                accept=".html,.htm,.txt"
                class="hidden"
                @change="handleFileUpload"
              >
              <span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-muted hover:text-highlighted rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
                <UIcon
                  name="i-lucide-upload"
                  class="size-3"
                />
                Upload HTML
              </span>
            </label>
          </div>
        </div>

        <!-- Editor Textarea Area -->
        <div class="p-2 flex-1 flex flex-col">
          <textarea
            v-if="draft.activeTab === 'html'"
            v-model="draft.html"
            placeholder="Paste raw HTML, newsletter template, or component snippet here..."
            class="w-full flex-1 p-3 bg-transparent font-mono text-xs focus:outline-none resize-none text-highlighted"
            spellcheck="false"
          />
          <textarea
            v-else
            v-model="draft.css"
            placeholder="/* Optional custom CSS styles, media queries, or overrides */&#10;body { font-family: sans-serif; }&#10;.btn:hover { opacity: 0.9; }"
            class="w-full flex-1 p-3 bg-transparent font-mono text-xs focus:outline-none resize-none text-highlighted"
            spellcheck="false"
          />
        </div>
      </div>

      <!-- Right Pane: Live Sandboxed Iframe Preview -->
      <div class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden min-h-[580px]">
        <!-- Browser Bar Simulator Header -->
        <div class="flex items-center justify-between px-3.5 py-2 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <!-- Window traffic light dots & Address pill -->
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="size-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span class="size-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span class="size-2.5 rounded-full bg-emerald-500/80 inline-block" />
            </div>

            <div class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-neutral-200/50 dark:bg-neutral-800/50 text-[11px] font-mono text-muted truncate max-w-xs">
              <UIcon
                :name="draft.emailMode ? 'i-lucide-mail' : 'i-lucide-lock'"
                class="size-3 text-primary shrink-0"
              />
              <span class="truncate">{{ draft.emailMode ? 'inbox.preview://message/render' : 'sandbox://preview.local' }}</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="font-mono text-[11px] hidden sm:inline">{{ currentIframeWidth }}</span>

            <!-- Copy raw HTML -->
            <UButton
              icon="i-lucide-copy"
              size="xs"
              color="neutral"
              variant="ghost"
              title="Copy compiled HTML document"
              @click="copyToClipboard(compiledDocument, 'Compiled HTML copied!')"
            />

            <!-- Toggle Fullscreen -->
            <UButton
              :icon="isFullscreen ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
              size="xs"
              color="neutral"
              variant="ghost"
              :title="isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'"
              @click="isFullscreen = !isFullscreen"
            />
          </div>
        </div>

        <!-- Iframe Canvas Viewport Area -->
        <div class="flex-1 bg-neutral-200/40 dark:bg-neutral-950/60 p-4 flex justify-center items-start overflow-auto">
          <div
            class="transition-all duration-200 bg-white rounded-lg shadow-sm border border-neutral-300 dark:border-neutral-800 overflow-hidden flex flex-col"
            :style="{
              width: currentIframeWidth,
              maxWidth: '100%',
              minHeight: '520px'
            }"
          >
            <!-- Email Client Header Mockup (If in email mode) -->
            <div
              v-if="draft.emailMode"
              class="px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80 text-[11px] text-muted flex items-center justify-between"
            >
              <div class="flex items-center gap-2">
                <div class="size-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                  DP
                </div>
                <div>
                  <strong class="text-highlighted block leading-tight">DevPocket Previewer</strong>
                  <span class="text-[10px] text-muted">&lt;sender@preview.internal&gt;</span>
                </div>
              </div>
              <span class="text-[10px] text-muted">Today, 10:00 AM</span>
            </div>

            <!-- Sandboxed Iframe -->
            <iframe
              ref="iframeRef"
              title="Sandbox HTML Preview"
              sandbox="allow-same-origin"
              class="w-full flex-1 border-0 min-h-[500px] bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
