<script setup lang="ts">
import { useClipboardAction } from '~/composables/useClipboardAction'
import { useToolDraft } from '~/composables/useToolDraft'

interface StringifyDraft {
  input: string
  conversionMode: 'stringify' | 'jsonify'
  quoteStyle: 'double' | 'single' | 'backtick'
  compactBeforeStringify: boolean
}

const { state: draft, clearDraft } = useToolDraft<StringifyDraft>('json-stringify', () => ({
  input: '',
  conversionMode: 'stringify',
  quoteStyle: 'double',
  compactBeforeStringify: true
}))

const output = ref('')
const errorMessage = ref<string | null>(null)

const { copied, copyToClipboard } = useClipboardAction()

const sampleJson = `{
  "name": "DevPocket",
  "features": ["zero-latency", "client-only"],
  "meta": { "active": true, "code": 200 }
}`

const sampleEscapedString = `"{\\"name\\":\\"DevPocket\\",\\"features\\":[\\"zero-latency\\",\\"client-only\\"],\\"meta\\":{\\"active\\":true,\\"code\\":200}}"`

function loadSample() {
  if (draft.value.conversionMode === 'stringify') {
    draft.value.input = sampleJson
  } else {
    draft.value.input = sampleEscapedString
  }
  process()
}

function clearAll() {
  clearDraft()
  output.value = ''
  errorMessage.value = null
}

function process() {
  errorMessage.value = null
  const raw = draft.value.input.trim()

  if (!raw) {
    output.value = ''
    return
  }

  try {
    if (draft.value.conversionMode === 'stringify') {
      // Step 1: Ensure input is valid JSON
      const parsed = JSON.parse(raw)
      const baseStr = draft.value.compactBeforeStringify
        ? JSON.stringify(parsed)
        : JSON.stringify(parsed, null, 2)

      // Step 2: Stringify according to chosen quote format
      if (draft.value.quoteStyle === 'double') {
        // Standard JSON string: "{\"foo\":\"bar\"}"
        output.value = JSON.stringify(baseStr)
      } else if (draft.value.quoteStyle === 'single') {
        // Single quote escaped string: '{"foo":"bar"}'
        const escaped = baseStr.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')
        output.value = `'${escaped}'`
      } else {
        // Backtick template literal: `{"foo":"bar"}`
        const escaped = baseStr.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')
        output.value = `\`${escaped}\``
      }
    } else {
      // JSONify (Parse escaped string back to JSON)
      let cleanInput = raw

      // If wrapped in outer quotes or backticks, extract inner content
      if (
        (cleanInput.startsWith('"') && cleanInput.endsWith('"'))
        || (cleanInput.startsWith('\'') && cleanInput.endsWith('\''))
        || (cleanInput.startsWith('`') && cleanInput.endsWith('`'))
      ) {
        try {
          // If double-quoted string, JSON.parse naturally unescapes it into raw string
          if (cleanInput.startsWith('"')) {
            cleanInput = JSON.parse(cleanInput)
          } else {
            cleanInput = cleanInput.slice(1, -1).replace(/\\'/g, '\'').replace(/\\`/g, '`')
          }
        } catch {
          // Fallback manual unescape
          cleanInput = cleanInput.slice(1, -1)
        }
      }

      // If still containing escaped quotes like \"
      if (cleanInput.includes('\\"')) {
        cleanInput = cleanInput.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      }

      // Parse as JSON and format cleanly
      const parsed = JSON.parse(cleanInput)
      output.value = JSON.stringify(parsed, null, 2)
    }
  } catch (err: unknown) {
    output.value = ''
    if (err instanceof Error) {
      errorMessage.value = err.message
    } else {
      errorMessage.value = 'Failed to transform string/JSON'
    }
  }
}

watch(
  () => [draft.value.input, draft.value.conversionMode, draft.value.quoteStyle, draft.value.compactBeforeStringify],
  () => {
    process()
  },
  { immediate: true }
)

function swapDirection() {
  const currentOutput = output.value
  draft.value.conversionMode = draft.value.conversionMode === 'stringify' ? 'jsonify' : 'stringify'
  draft.value.input = currentOutput
  process()
}

const inputPlaceholder = computed(() => {
  return draft.value.conversionMode === 'stringify'
    ? 'Paste raw JSON here...'
    : 'Paste escaped string (e.g. "{\\"a\\": 1}")...'
})

const outputPlaceholder = computed(() => {
  return draft.value.conversionMode === 'stringify'
    ? 'Escaped string output will appear here...'
    : 'Formatted JSON will appear here...'
})
</script>

<template>
  <div class="space-y-6">
    <ToolHeader
      title="JSON Stringify & JSONify"
      description="Escape JSON objects into quoted string literals for code/APIs, or unescape stringified logs and payloads back to clean JSON."
      icon="i-lucide-quote"
      category="JSON Tools"
      :copy-text="output"
      :disable-copy="!output"
      @load-sample="loadSample"
      @clear="clearAll"
    >
      <template #actions>
        <div class="flex flex-wrap items-center gap-3">
          <!-- Mode Tabs -->
          <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
            <button
              type="button"
              class="px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
              :class="draft.conversionMode === 'stringify' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
              @click="draft.conversionMode = 'stringify'"
            >
              <span>JSON → Escaped String</span>
            </button>
            <button
              type="button"
              class="px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
              :class="draft.conversionMode === 'jsonify' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
              @click="draft.conversionMode = 'jsonify'"
            >
              <span>Escaped String → JSON</span>
            </button>
          </div>

          <UButton
            icon="i-lucide-arrow-left-right"
            label="Swap & Reverse"
            size="xs"
            variant="ghost"
            color="neutral"
            :disabled="!output"
            @click="swapDirection"
          />

          <!-- Stringify specific options -->
          <template v-if="draft.conversionMode === 'stringify'">
            <div class="flex items-center gap-1.5 text-xs">
              <span class="text-muted">Enclose with:</span>
              <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
                <button
                  type="button"
                  class="px-2 py-0.5 text-xs rounded transition-all font-mono"
                  :class="draft.quoteStyle === 'double' ? 'bg-neutral-200 dark:bg-neutral-800 text-highlighted font-semibold' : 'text-muted'"
                  @click="draft.quoteStyle = 'double'"
                >
                  "..."
                </button>
                <button
                  type="button"
                  class="px-2 py-0.5 text-xs rounded transition-all font-mono"
                  :class="draft.quoteStyle === 'single' ? 'bg-neutral-200 dark:bg-neutral-800 text-highlighted font-semibold' : 'text-muted'"
                  @click="draft.quoteStyle = 'single'"
                >
                  '...'
                </button>
                <button
                  type="button"
                  class="px-2 py-0.5 text-xs rounded transition-all font-mono"
                  :class="draft.quoteStyle === 'backtick' ? 'bg-neutral-200 dark:bg-neutral-800 text-highlighted font-semibold' : 'text-muted'"
                  @click="draft.quoteStyle = 'backtick'"
                >
                  `...`
                </button>
              </div>
            </div>

            <label class="flex items-center gap-2 text-xs text-muted hover:text-highlighted cursor-pointer select-none">
              <input
                v-model="draft.compactBeforeStringify"
                type="checkbox"
                class="rounded border-default text-primary focus:ring-primary/20"
              >
              <span>Compact JSON before escaping</span>
            </label>
          </template>
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
          Conversion Error
        </p>
        <p class="font-mono text-[11px] opacity-90">
          {{ errorMessage }}
        </p>
      </div>
    </div>

    <!-- Dual Editor Panels -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden">
        <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <span class="flex items-center gap-2">
            <UIcon
              name="i-lucide-file-text"
              class="size-4"
            />
            {{ draft.conversionMode === 'stringify' ? 'Input Raw JSON' : 'Input Escaped String' }}
          </span>
          <span class="font-mono text-[11px]">{{ draft.input.length }} chars</span>
        </div>
        <div class="p-2 flex-1">
          <textarea
            v-model="draft.input"
            :placeholder="inputPlaceholder"
            class="w-full h-96 p-3 bg-transparent font-mono text-xs focus:outline-none resize-y text-highlighted"
            spellcheck="false"
          />
        </div>
      </div>

      <div class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden">
        <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <span class="flex items-center gap-2">
            <UIcon
              name="i-lucide-check-circle"
              class="size-4"
            />
            {{ draft.conversionMode === 'stringify' ? 'Escaped String Output' : 'Parsed Clean JSON' }}
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
            :placeholder="outputPlaceholder"
            class="w-full h-96 p-3 bg-transparent font-mono text-xs focus:outline-none resize-y text-highlighted"
            spellcheck="false"
          />
        </div>
      </div>
    </div>
  </div>
</template>
