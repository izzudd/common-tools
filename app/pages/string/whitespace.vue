<script setup lang="ts">
import { useClipboardAction } from '~/composables/useClipboardAction'

// Page-isolated state
const input = ref('')
const output = ref('')

// Configuration toggles
const stripAllWhitespace = ref(false)
const collapseSpaces = ref(true)
const trimLines = ref(true)
const removeEmptyLines = ref(true)
const replaceTabsWithSpaces = ref(true)
const tabSize = ref(2)
const normalizeLineBreaks = ref<'lf' | 'crlf' | 'none'>('lf')

const { copied, copyToClipboard } = useClipboardAction()

const sampleText = `  // Sample code or unformatted text with irregular spacing
function calculateMetrics( items ) {
\t\tlet total = 0 ;   
    
\t\tfor ( let i = 0 ; i < items.length ; i ++ ) {
\t\t\ttotal += items[ i ] ;    
\t\t}
    
\t\treturn total ;
}   
`

function loadSample() {
  input.value = sampleText
  processWhitespace()
}

function clearAll() {
  input.value = ''
  output.value = ''
}

function processWhitespace() {
  const text = input.value
  if (!text) {
    output.value = ''
    return
  }

  // Extreme mode: Strip all whitespace completely
  if (stripAllWhitespace.value) {
    output.value = text.replace(/\s+/g, '')
    return
  }

  let result = text

  // 1. Tab handling
  if (replaceTabsWithSpaces.value) {
    const spaces = ' '.repeat(tabSize.value)
    result = result.replace(/\t/g, spaces)
  }

  // 2. Line processing
  const lines = result.split(/\r?\n/)
  const processedLines: string[] = []

  for (let line of lines) {
    // Trim line edges
    if (trimLines.value) {
      line = line.trim()
    }

    // Collapse multiple spaces within the line
    if (collapseSpaces.value) {
      line = line.replace(/[^\S\r\n]+/g, ' ')
    }

    // Empty lines check
    if (removeEmptyLines.value && line.length === 0) {
      continue
    }

    processedLines.push(line)
  }

  // 3. Line break normalization
  const eol = normalizeLineBreaks.value === 'crlf' ? '\r\n' : '\n'
  result = processedLines.join(eol)

  output.value = result
}

watch(
  [
    input,
    stripAllWhitespace,
    collapseSpaces,
    trimLines,
    removeEmptyLines,
    replaceTabsWithSpaces,
    tabSize,
    normalizeLineBreaks
  ],
  () => {
    processWhitespace()
  }
)

const stats = computed(() => {
  const inText = input.value
  const outText = output.value

  const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0)
  const countLines = (s: string) => (s ? s.split(/\r?\n/).length : 0)
  const countTabs = (s: string) => (s.match(/\t/g) || []).length

  const savedChars = Math.max(0, inText.length - outText.length)
  const savedPercent = inText.length > 0 ? ((savedChars / inText.length) * 100).toFixed(1) : '0'

  return {
    inChars: inText.length,
    outChars: outText.length,
    inWords: countWords(inText),
    outWords: countWords(outText),
    inLines: countLines(inText),
    outLines: countLines(outText),
    inTabs: countTabs(inText),
    savedChars,
    savedPercent
  }
})
</script>

<template>
  <div class="space-y-6">
    <ToolHeader
      title="Whitespace & Indentation Remover"
      description="Clean up excess whitespace, strip tabs, collapse repetitive spaces, trim margins, and normalize line breaks."
      icon="i-lucide-scissors"
      category="String Tools"
      :copy-text="output"
      :disable-copy="!output"
      @load-sample="loadSample"
      @clear="clearAll"
    >
      <template #actions>
        <!-- Options & Toggles -->
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <label class="flex items-center gap-2 text-muted hover:text-highlighted cursor-pointer select-none">
            <input
              v-model="collapseSpaces"
              type="checkbox"
              :disabled="stripAllWhitespace"
              class="rounded border-default text-primary focus:ring-primary/20"
            >
            <span>Collapse multiple spaces</span>
          </label>

          <label class="flex items-center gap-2 text-muted hover:text-highlighted cursor-pointer select-none">
            <input
              v-model="trimLines"
              type="checkbox"
              :disabled="stripAllWhitespace"
              class="rounded border-default text-primary focus:ring-primary/20"
            >
            <span>Trim line ends (leading/trailing)</span>
          </label>

          <label class="flex items-center gap-2 text-muted hover:text-highlighted cursor-pointer select-none">
            <input
              v-model="removeEmptyLines"
              type="checkbox"
              :disabled="stripAllWhitespace"
              class="rounded border-default text-primary focus:ring-primary/20"
            >
            <span>Remove empty/blank lines</span>
          </label>

          <label class="flex items-center gap-2 text-muted hover:text-highlighted cursor-pointer select-none">
            <input
              v-model="replaceTabsWithSpaces"
              type="checkbox"
              :disabled="stripAllWhitespace"
              class="rounded border-default text-primary focus:ring-primary/20"
            >
            <span>Replace tabs with {{ tabSize }} spaces</span>
          </label>

          <label class="flex items-center gap-2 text-rose-500 dark:text-rose-400 font-medium cursor-pointer select-none">
            <input
              v-model="stripAllWhitespace"
              type="checkbox"
              class="rounded border-default text-rose-600 focus:ring-rose-400/20"
            >
            <span>Strip ALL whitespace completely</span>
          </label>
        </div>
      </template>
    </ToolHeader>

    <!-- Metrics Bar -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-default bg-neutral-100/40 dark:bg-neutral-900/40 text-xs">
      <div>
        <span class="text-muted block text-[11px]">Characters</span>
        <div class="font-mono mt-0.5">
          <span class="text-muted">{{ stats.inChars }}</span> →
          <strong class="text-highlighted">{{ stats.outChars }}</strong>
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Lines</span>
        <div class="font-mono mt-0.5">
          <span class="text-muted">{{ stats.inLines }}</span> →
          <strong class="text-highlighted">{{ stats.outLines }}</strong>
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Words</span>
        <div class="font-mono mt-0.5">
          <span class="text-muted">{{ stats.inWords }}</span> →
          <strong class="text-highlighted">{{ stats.outWords }}</strong>
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Characters Saved</span>
        <div class="font-mono mt-0.5 text-emerald-500 font-semibold">
          -{{ stats.savedChars }} ({{ stats.savedPercent }}%)
        </div>
      </div>
    </div>

    <!-- Dual Panes -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden">
        <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <span class="flex items-center gap-2">
            <UIcon
              name="i-lucide-align-left"
              class="size-4"
            />
            Original Text
          </span>
          <span class="font-mono text-[11px]">{{ stats.inChars }} chars</span>
        </div>
        <div class="p-2 flex-1">
          <textarea
            v-model="input"
            placeholder="Paste text with messy spaces, tabs, or blank lines..."
            class="w-full h-96 p-3 bg-transparent font-mono text-xs focus:outline-none resize-y text-highlighted"
            spellcheck="false"
          />
        </div>
      </div>

      <div class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden">
        <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <span class="flex items-center gap-2">
            <UIcon
              name="i-lucide-check-check"
              class="size-4"
            />
            Cleaned Text
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
            placeholder="Sanitized text will appear here..."
            class="w-full h-96 p-3 bg-transparent font-mono text-xs focus:outline-none resize-y text-highlighted"
            spellcheck="false"
          />
        </div>
      </div>
    </div>
  </div>
</template>
