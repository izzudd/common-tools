<script setup lang="ts">
import { useClipboardAction } from '~/composables/useClipboardAction'
import { useToolDraft } from '~/composables/useToolDraft'

interface BeautifierDraft {
  inputJson: string
  indentSize: '2' | '4' | 'tab'
  sortKeys: boolean
  mode: 'beautify' | 'minify'
}

const { state: draft, clearDraft } = useToolDraft<BeautifierDraft>('json-beautifier', () => ({
  inputJson: '',
  indentSize: '2',
  sortKeys: false,
  mode: 'beautify'
}))

const outputJson = ref('')
const errorMessage = ref<string | null>(null)
const errorLocation = ref<{ line: number, column: number } | null>(null)

const { copied, copyToClipboard } = useClipboardAction()

const sampleJson = `{
  "app": "DevPocket",
  "version": "1.0.0",
  "secure": true,
  "stats": {
    "totalTools": 5,
    "clientOnly": true,
    "speedMs": 0.42
  },
  "tags": ["bun", "nuxt4", "vue3", "typescript"],
  "contributors": [
    { "name": "Alice", "role": "Maintainer", "active": true },
    { "name": "Bob", "role": "Contributor", "active": false }
  ]
}`

function loadSample() {
  draft.value.inputJson = sampleJson
  processJson()
}

function clearAll() {
  clearDraft()
  outputJson.value = ''
  errorMessage.value = null
  errorLocation.value = null
}

// Deep sort keys recursively
function sortObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys)
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj as Record<string, unknown>)
      .sort((a, b) => a.localeCompare(b))
      .reduce((result: Record<string, unknown>, key: string) => {
        result[key] = sortObjectKeys((obj as Record<string, unknown>)[key])
        return result
      }, {})
  }
  return obj
}

function processJson() {
  errorMessage.value = null
  errorLocation.value = null

  const raw = draft.value.inputJson.trim()
  if (!raw) {
    outputJson.value = ''
    return
  }

  try {
    let parsed = JSON.parse(raw)

    if (draft.value.sortKeys) {
      parsed = sortObjectKeys(parsed)
    }

    if (draft.value.mode === 'minify') {
      outputJson.value = JSON.stringify(parsed)
    } else {
      const space = draft.value.indentSize === 'tab' ? '\t' : Number(draft.value.indentSize)
      outputJson.value = JSON.stringify(parsed, null, space)
    }
  } catch (err: unknown) {
    outputJson.value = ''
    if (err instanceof Error) {
      errorMessage.value = err.message
      // Try to extract line / column from error message
      const match = err.message.match(/at position (\d+)/i)
      if (match && match[1]) {
        const pos = Number.parseInt(match[1], 10)
        const lines = raw.slice(0, pos).split('\n')
        errorLocation.value = {
          line: lines.length,
          column: lines[lines.length - 1]?.length ?? 0
        }
      }
    } else {
      errorMessage.value = 'Invalid JSON format'
    }
  }
}

// Watch inputs and configuration to update output reactively
watch(
  () => [draft.value.inputJson, draft.value.indentSize, draft.value.sortKeys, draft.value.mode],
  () => {
    processJson()
  },
  { immediate: true }
)

const stats = computed(() => {
  const inBytes = new Blob([draft.value.inputJson]).size
  const outBytes = new Blob([outputJson.value]).size
  const diff = inBytes - outBytes
  const pct = inBytes > 0 ? ((diff / inBytes) * 100).toFixed(1) : '0'

  return {
    inChars: draft.value.inputJson.length,
    outChars: outputJson.value.length,
    inBytes,
    outBytes,
    pct,
    lines: outputJson.value ? outputJson.value.split('\n').length : 0
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Tool Header with controls -->
    <ToolHeader
      title="JSON Beautifier & Minifier"
      description="Format, prettify, sort keys, validate, or compress JSON data with zero latency."
      icon="i-lucide-indent-decrease"
      category="JSON Tools"
      :copy-text="outputJson"
      :disable-copy="!outputJson"
      @load-sample="loadSample"
      @clear="clearAll"
    >
      <template #actions>
        <!-- Toolbar options -->
        <div class="flex flex-wrap items-center gap-3">
          <!-- Mode Tabs -->
          <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
            <button
              type="button"
              class="px-3 py-1 text-xs font-medium rounded-md transition-all"
              :class="draft.mode === 'beautify' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
              @click="draft.mode = 'beautify'"
            >
              Beautify
            </button>
            <button
              type="button"
              class="px-3 py-1 text-xs font-medium rounded-md transition-all"
              :class="draft.mode === 'minify' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
              @click="draft.mode = 'minify'"
            >
              Minify
            </button>
          </div>

          <!-- Indentation select (when beautifying) -->
          <div
            v-if="draft.mode === 'beautify'"
            class="flex items-center gap-1.5 text-xs"
          >
            <span class="text-muted">Indent:</span>
            <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
              <button
                type="button"
                class="px-2 py-0.5 text-xs rounded transition-all"
                :class="draft.indentSize === '2' ? 'bg-neutral-200 dark:bg-neutral-800 text-highlighted font-semibold' : 'text-muted'"
                @click="draft.indentSize = '2'"
              >
                2 spaces
              </button>
              <button
                type="button"
                class="px-2 py-0.5 text-xs rounded transition-all"
                :class="draft.indentSize === '4' ? 'bg-neutral-200 dark:bg-neutral-800 text-highlighted font-semibold' : 'text-muted'"
                @click="draft.indentSize = '4'"
              >
                4 spaces
              </button>
              <button
                type="button"
                class="px-2 py-0.5 text-xs rounded transition-all"
                :class="draft.indentSize === 'tab' ? 'bg-neutral-200 dark:bg-neutral-800 text-highlighted font-semibold' : 'text-muted'"
                @click="draft.indentSize = 'tab'"
              >
                Tab
              </button>
            </div>
          </div>

          <!-- Sort keys toggle -->
          <label class="flex items-center gap-2 text-xs text-muted hover:text-highlighted cursor-pointer select-none">
            <input
              v-model="draft.sortKeys"
              type="checkbox"
              class="rounded border-default text-primary focus:ring-primary/20"
            >
            <span>Sort object keys alphabetically</span>
          </label>
        </div>

        <!-- Quick Live Stats -->
        <div
          v-if="outputJson"
          class="flex items-center gap-3 text-xs font-mono text-muted"
        >
          <span>Lines: <strong class="text-highlighted">{{ stats.lines }}</strong></span>
          <span>Size: <strong class="text-highlighted">{{ stats.outBytes }} B</strong></span>
          <span
            v-if="draft.mode === 'minify' && Number(stats.pct) > 0"
            class="text-emerald-500 font-semibold"
          >
            Saved: {{ stats.pct }}%
          </span>
        </div>
      </template>
    </ToolHeader>

    <!-- Error Alert (Graceful inline handling) -->
    <div
      v-if="errorMessage"
      class="flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs"
    >
      <UIcon
        name="i-lucide-alert-circle"
        class="size-5 shrink-0 mt-0.5"
      />
      <div class="space-y-1">
        <p class="font-semibold">
          JSON Syntax Error
        </p>
        <p class="font-mono text-[11px] opacity-90">
          {{ errorMessage }}
        </p>
        <p
          v-if="errorLocation"
          class="text-[11px] text-rose-500 font-semibold"
        >
          Approximate position: Line {{ errorLocation.line }}, Column {{ errorLocation.column }}
        </p>
      </div>
    </div>

    <!-- Main Editor Panels (Side by side on desktop, stacked on mobile) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Input Panel -->
      <div class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden">
        <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <span class="flex items-center gap-2">
            <UIcon
              name="i-lucide-file-input"
              class="size-4"
            />
            Input JSON
          </span>
          <span class="font-mono text-[11px]">{{ stats.inChars }} chars</span>
        </div>
        <div class="p-2 flex-1">
          <textarea
            v-model="draft.inputJson"
            placeholder="Paste or write raw JSON here..."
            class="w-full h-96 p-3 bg-transparent font-mono text-xs focus:outline-none resize-y text-highlighted"
            spellcheck="false"
          />
        </div>
      </div>

      <!-- Output Panel -->
      <div class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden">
        <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <span class="flex items-center gap-2">
            <UIcon
              name="i-lucide-file-output"
              class="size-4"
            />
            Formatted Output
          </span>
          <div class="flex items-center gap-2">
            <span class="font-mono text-[11px]">{{ stats.outChars }} chars</span>
            <UButton
              v-if="outputJson"
              :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
              :label="copied ? 'Copied' : 'Copy'"
              size="xs"
              color="neutral"
              variant="outline"
              @click="copyToClipboard(outputJson)"
            />
          </div>
        </div>
        <div class="p-2 flex-1 relative">
          <textarea
            :value="outputJson"
            readonly
            placeholder="Formatted output will appear here..."
            class="w-full h-96 p-3 bg-transparent font-mono text-xs focus:outline-none resize-y text-highlighted"
            spellcheck="false"
          />
        </div>
      </div>
    </div>
  </div>
</template>
