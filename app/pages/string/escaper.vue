<script setup lang="ts">
import { useClipboardAction } from '~/composables/useClipboardAction'
import { useToolDraft } from '~/composables/useToolDraft'

type Mode = 'html' | 'url' | 'regex' | 'slash' | 'base64'
type Action = 'escape' | 'unescape'

interface EscaperDraft {
  input: string
  selectedMode: Mode
  selectedAction: Action
  urlComponentOnly: boolean
}

const { state: draft, clearDraft } = useToolDraft<EscaperDraft>('string-escaper', () => ({
  input: '',
  selectedMode: 'html',
  selectedAction: 'escape',
  urlComponentOnly: true
}))

const output = ref('')
const errorMessage = ref<string | null>(null)

const { copied, copyToClipboard } = useClipboardAction()

const SAMPLES: Record<Mode, { escape: string, unescape: string }> = {
  html: {
    escape: `<div class="card" id='main'>\n  <p>5 is > 2 & 10 < 20: "Quote"</p>\n</div>`,
    unescape: `&lt;div class=&quot;card&quot; id=&#39;main&#39;&gt;\n  &lt;p&gt;5 is &gt; 2 &amp; 10 &lt; 20: &quot;Quote&quot;&lt;/p&gt;\n&lt;/div&gt;`
  },
  url: {
    escape: `https://example.com/search?q=developer tools&category=web & code#section-1`,
    unescape: `https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Ddeveloper%20tools%26category%3Dweb%20%26%20code%23section-1`
  },
  regex: {
    escape: `function check(item: string) { return item.match(/^[a-z]+(\\.[a-z]+)*$/); }`,
    unescape: `function check\\(item: string\\) \\{ return item\\.match\\(/\\^\\[a-z\\]\\+\\(\\\\\\.\\[a-z\\]\\+\\)\\*\\$/\\); \\}`
  },
  slash: {
    escape: `First Line\nSecond Line with \t Tab and "double quote" and 'single quote' and \\backslash\\`,
    unescape: `First Line\\nSecond Line with \\t Tab and \\"double quote\\" and \\'single quote\\' and \\\\backslash\\\\`
  },
  base64: {
    escape: `DevPocket 🚀: Ultra fast, client-side, zero tracking developer toolkit.`,
    unescape: `RGV2UG9ja2V0IPCfmYAgVWx0cmEgZmFzdCwgY2xpZW50LXNpZGUsIHplcm8gdHJhY2tpbmcgZGV2ZWxvcGVyIHRvb2xraXQu`
  }
}

function loadSample() {
  const sample = SAMPLES[draft.value.selectedMode]
  draft.value.input = draft.value.selectedAction === 'escape' ? sample.escape : sample.unescape
  processText()
}

function clearAll() {
  clearDraft()
  output.value = ''
  errorMessage.value = null
}

function swapInputOutput() {
  const temp = output.value
  draft.value.selectedAction = draft.value.selectedAction === 'escape' ? 'unescape' : 'escape'
  draft.value.input = temp
  processText()
}

// UTF-8 safe Base64 encoder
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  const binString = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
  return btoa(binString)
}

// UTF-8 safe Base64 decoder
function base64ToUtf8(str: string): string {
  const clean = str.trim()
  const binString = atob(clean)
  const bytes = Uint8Array.from(binString, m => m.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function processText() {
  errorMessage.value = null
  const text = draft.value.input
  if (!text) {
    output.value = ''
    return
  }

  try {
    switch (draft.value.selectedMode) {
      case 'html':
        if (draft.value.selectedAction === 'escape') {
          output.value = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
        } else {
          output.value = text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, '\'')
            .replace(/&#x27;/g, '\'')
            .replace(/&#x2F;/g, '/')
        }
        break

      case 'url':
        if (draft.value.selectedAction === 'escape') {
          output.value = draft.value.urlComponentOnly ? encodeURIComponent(text) : encodeURI(text)
        } else {
          output.value = draft.value.urlComponentOnly ? decodeURIComponent(text) : decodeURI(text)
        }
        break

      case 'regex':
        if (draft.value.selectedAction === 'escape') {
          // Escapes characters with special meaning in regex: [ \ ^ $ . | ? * + ( ) { }
          output.value = text.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
        } else {
          output.value = text.replace(/\\([\\^$.*+?()[\]{}|])/g, '$1')
        }
        break

      case 'slash':
        if (draft.value.selectedAction === 'escape') {
          output.value = text
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/'/g, '\\\'')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t')
            .replace(/\f/g, '\\f')
        } else {
          output.value = text
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\f/g, '\f')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, '\'')
            .replace(/\\\\/g, '\\')
        }
        break

      case 'base64':
        if (draft.value.selectedAction === 'escape') {
          output.value = utf8ToBase64(text)
        } else {
          output.value = base64ToUtf8(text)
        }
        break
    }
  } catch (err: unknown) {
    output.value = ''
    if (err instanceof Error) {
      errorMessage.value = err.message
    } else {
      errorMessage.value = 'Failed to transform string'
    }
  }
}

watch(
  () => [draft.value.input, draft.value.selectedMode, draft.value.selectedAction, draft.value.urlComponentOnly],
  () => {
    processText()
  },
  { immediate: true }
)
</script>

<template>
  <div class="space-y-6">
    <ToolHeader
      title="String Escaper & Unescaper"
      description="Escape and unescape HTML special characters, URLs, Regex meta-patterns, C/Unix slashes, and UTF-8 Base64 strings."
      icon="i-lucide-binary"
      category="String Tools"
      :copy-text="output"
      :disable-copy="!output"
      @load-sample="loadSample"
      @clear="clearAll"
    >
      <template #actions>
        <div class="flex flex-wrap items-center gap-3">
          <!-- Modes -->
          <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
            <button
              v-for="m in (['html', 'url', 'regex', 'slash', 'base64'] as Mode[])"
              :key="m"
              type="button"
              class="px-2.5 py-1 text-xs font-medium rounded-md transition-all uppercase"
              :class="draft.selectedMode === m ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
              @click="draft.selectedMode = m"
            >
              {{ m }}
            </button>
          </div>

          <!-- Action Switcher (Escape vs Unescape) -->
          <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
            <button
              type="button"
              class="px-3 py-1 text-xs font-medium rounded-md transition-all"
              :class="draft.selectedAction === 'escape' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
              @click="draft.selectedAction = 'escape'"
            >
              Escape / Encode
            </button>
            <button
              type="button"
              class="px-3 py-1 text-xs font-medium rounded-md transition-all"
              :class="draft.selectedAction === 'unescape' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
              @click="draft.selectedAction = 'unescape'"
            >
              Unescape / Decode
            </button>
          </div>

          <!-- Swap Button -->
          <UButton
            icon="i-lucide-arrow-left-right"
            label="Swap"
            size="xs"
            variant="ghost"
            color="neutral"
            :disabled="!output"
            @click="swapInputOutput"
          />

          <!-- URL Option -->
          <label
            v-if="draft.selectedMode === 'url'"
            class="flex items-center gap-2 text-xs text-muted hover:text-highlighted cursor-pointer select-none"
          >
            <input
              v-model="draft.urlComponentOnly"
              type="checkbox"
              class="rounded border-default text-primary focus:ring-primary/20"
            >
            <span>Component mode (encodeURIComponent)</span>
          </label>
        </div>
      </template>
    </ToolHeader>

    <!-- Error Alert -->
    <div
      v-if="errorMessage"
      class="flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs"
    >
      <UIcon
        name="i-lucide-alert-circle"
        class="size-5 shrink-0 mt-0.5"
      />
      <div>
        <p class="font-semibold">
          Decoding Error
        </p>
        <p class="font-mono text-[11px] opacity-90">
          {{ errorMessage }}
        </p>
      </div>
    </div>

    <!-- Dual Panes -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden">
        <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <span class="flex items-center gap-2">
            <UIcon
              name="i-lucide-text"
              class="size-4"
            />
            Input String
          </span>
          <span class="font-mono text-[11px]">{{ draft.input.length }} chars</span>
        </div>
        <div class="p-2 flex-1">
          <textarea
            v-model="draft.input"
            :placeholder="`Enter text to ${draft.selectedAction} in ${draft.selectedMode.toUpperCase()} format...`"
            class="w-full h-96 p-3 bg-transparent font-mono text-xs focus:outline-none resize-y text-highlighted"
            spellcheck="false"
          />
        </div>
      </div>

      <div class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden">
        <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <span class="flex items-center gap-2">
            <UIcon
              name="i-lucide-sparkles"
              class="size-4"
            />
            {{ draft.selectedAction === 'escape' ? 'Escaped Result' : 'Unescaped Result' }}
          </span>
          <div class="flex items-center gap-2">
            <span class="font-mono text-[11px]">{{ output.length }} chars</span>
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
            placeholder="Transformed string will appear here..."
            class="w-full h-96 p-3 bg-transparent font-mono text-xs focus:outline-none resize-y text-highlighted"
            spellcheck="false"
          />
        </div>
      </div>
    </div>
  </div>
</template>
