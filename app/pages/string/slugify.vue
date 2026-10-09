<script setup lang="ts">
import { useClipboardAction } from '~/composables/useClipboardAction'
import { useToolDraft } from '~/composables/useToolDraft'

type SeparatorType = '-' | '_' | '.' | '/' | '' | 'custom'
type CasingType = 'lower' | 'upper' | 'title' | 'preserve'
type CharsetType = 'ascii' | 'unicode'

interface SlugifyDraft {
  input: string
  baseUrl: string
  separatorType: SeparatorType
  customSeparator: string
  casing: CasingType
  charset: CharsetType
  normalizeAccents: boolean
  convertAmpersand: boolean
  removeStopWords: boolean
  batchMode: boolean
  maxLength: number | ''
  truncateWordBoundary: boolean
}

const { state: draft, clearDraft } = useToolDraft<SlugifyDraft>('string-slugify', () => ({
  input: '',
  baseUrl: 'https://example.com/posts/',
  separatorType: '-',
  customSeparator: '-',
  casing: 'lower',
  charset: 'ascii',
  normalizeAccents: true,
  convertAmpersand: true,
  removeStopWords: false,
  batchMode: false,
  maxLength: '',
  truncateWordBoundary: true
}))

const output = ref('')
const { copied, copyToClipboard } = useClipboardAction()

const sampleTitle = `Crème Brûlée & Café au Lait: The Ultimate 2026 Developer's Guide! #101`

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'down', 'during',
  'each',
  'for', 'from', 'further',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
  'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'she', 'should', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up',
  'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would',
  'you', 'your', 'yours', 'yourself', 'yourselves'
])

const SPECIAL_CHAR_MAP: Record<string, string> = {
  æ: 'ae',
  Æ: 'ae',
  œ: 'oe',
  Œ: 'oe',
  ß: 'ss',
  ø: 'o',
  Ø: 'o',
  å: 'a',
  Å: 'a',
  ð: 'd',
  Ð: 'd',
  þ: 'th',
  Þ: 'th',
  ł: 'l',
  Ł: 'l'
}

function loadSample() {
  draft.value.input = sampleTitle
  processSlug()
}

function clearAll() {
  clearDraft()
  output.value = ''
}

function getEffectiveSeparator(): string {
  if (draft.value.separatorType === 'custom') {
    return draft.value.customSeparator
  }
  return draft.value.separatorType
}

function transliterate(str: string): string {
  let result = str
  for (const [char, replacement] of Object.entries(SPECIAL_CHAR_MAP)) {
    result = result.replaceAll(char, replacement)
  }
  return result.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function slugifyLine(line: string, sep: string): string {
  let text = line.trim()
  if (!text) return ''

  // 1. Convert Ampersand
  if (draft.value.convertAmpersand) {
    text = text.replace(/&/g, ' and ')
  }

  // 2. Transliterate accents
  if (draft.value.normalizeAccents) {
    text = transliterate(text)
  }

  // 3. Extract tokens according to charset
  let rawTokens: string[] = []
  if (draft.value.charset === 'ascii') {
    rawTokens = text.match(/[a-zA-Z0-9]+/g) || []
  } else {
    // Unicode letters & numbers
    rawTokens = text.match(/[\p{L}\p{N}]+/gu) || []
  }

  if (rawTokens.length === 0) return ''

  // 4. Stop words removal
  if (draft.value.removeStopWords) {
    const filtered = rawTokens.filter(token => !STOP_WORDS.has(token.toLowerCase()))
    if (filtered.length > 0) {
      rawTokens = filtered
    }
  }

  // 5. Apply casing
  const casedTokens = rawTokens.map((token) => {
    switch (draft.value.casing) {
      case 'lower':
        return token.toLowerCase()
      case 'upper':
        return token.toUpperCase()
      case 'title':
        return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
      case 'preserve':
        return token
    }
  })

  // 6. Join with separator
  let slug = casedTokens.join(sep)

  // 7. Collapse consecutive separators (if separator is non-empty)
  if (sep) {
    const escapedSep = escapeRegex(sep)
    const multiSepRegex = new RegExp(`${escapedSep}{2,}`, 'g')
    slug = slug.replace(multiSepRegex, sep)

    // Trim separator from edges
    const edgeRegex = new RegExp(`^${escapedSep}+|${escapedSep}+$`, 'g')
    slug = slug.replace(edgeRegex, '')
  }

  // 8. Truncate if max length is set
  const limit = typeof draft.value.maxLength === 'number' && draft.value.maxLength > 0 ? draft.value.maxLength : 0
  if (limit > 0 && slug.length > limit) {
    if (draft.value.truncateWordBoundary && sep) {
      const truncated = slug.slice(0, limit)
      const lastSepIndex = truncated.lastIndexOf(sep)
      if (lastSepIndex > 0) {
        slug = truncated.slice(0, lastSepIndex)
      } else {
        slug = truncated
      }
    } else {
      slug = slug.slice(0, limit)
    }

    if (sep) {
      const edgeRegex = new RegExp(`^${escapeRegex(sep)}+|${escapeRegex(sep)}+$`, 'g')
      slug = slug.replace(edgeRegex, '')
    }
  }

  return slug
}

function processSlug() {
  const raw = draft.value.input
  if (!raw.trim()) {
    output.value = ''
    return
  }

  const sep = getEffectiveSeparator()

  if (draft.value.batchMode) {
    const lines = raw.split(/\r?\n/)
    const slugged = lines.map(line => slugifyLine(line, sep))
    output.value = slugged.join('\n')
  } else {
    output.value = slugifyLine(raw, sep)
  }
}

watch(
  draft,
  () => {
    processSlug()
  },
  { deep: true, immediate: true }
)

// Extract base tokens from input for alternative casing cards
const cleanTokens = computed<string[]>(() => {
  const raw = draft.value.input.trim()
  if (!raw) return []

  let text = raw
  if (draft.value.convertAmpersand) {
    text = text.replace(/&/g, ' and ')
  }
  if (draft.value.normalizeAccents) {
    text = transliterate(text)
  }

  const tokens = text.match(/[a-zA-Z0-9]+/g) || []
  if (draft.value.removeStopWords) {
    const filtered = tokens.filter(t => !STOP_WORDS.has(t.toLowerCase()))
    return filtered.length > 0 ? filtered : tokens
  }
  return tokens
})

// Alternative format variations for instant copying
const variations = computed(() => {
  const tokens = cleanTokens.value
  if (tokens.length === 0) return []

  const lowerTokens = tokens.map(t => t.toLowerCase())

  return [
    {
      label: 'Kebab Case',
      value: lowerTokens.join('-'),
      icon: 'i-lucide-minus'
    },
    {
      label: 'Snake Case',
      value: lowerTokens.join('_'),
      icon: 'i-lucide-underline'
    },
    {
      label: 'Camel Case',
      value: lowerTokens.map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(''),
      icon: 'i-lucide-case-sensitive'
    },
    {
      label: 'Pascal Case',
      value: lowerTokens.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(''),
      icon: 'i-lucide-case-upper'
    },
    {
      label: 'Constant Case',
      value: lowerTokens.map(w => w.toUpperCase()).join('_'),
      icon: 'i-lucide-hash'
    },
    {
      label: 'Dot Case',
      value: lowerTokens.join('.'),
      icon: 'i-lucide-circle-dot'
    },
    {
      label: 'Path Slug',
      value: lowerTokens.join('/'),
      icon: 'i-lucide-folder'
    },
    {
      label: 'Title Case',
      value: lowerTokens.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      icon: 'i-lucide-type'
    }
  ]
})

// Full URL Preview
const fullUrl = computed(() => {
  if (!output.value) return ''
  const base = draft.value.baseUrl.trim().replace(/\/+$/, '')
  // If batch mode, only show first slug in URL preview
  const firstSlug = output.value.split('\n')[0] || ''
  return `${base}/${firstSlug}`
})

const stats = computed(() => {
  const inText = draft.value.input
  const outText = output.value
  const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0)
  const countLines = (s: string) => (s ? s.split(/\r?\n/).length : 0)

  return {
    inChars: inText.length,
    outChars: outText.length,
    inWords: countWords(inText),
    outLines: countLines(outText),
    diff: inText.length - outText.length
  }
})
</script>

<template>
  <div class="space-y-6">
    <ToolHeader
      title="Slugify & URL Normalizer"
      description="Convert titles and strings into clean, SEO-friendly, and URL-safe slugs with customizable separators, transliteration, and casing."
      icon="i-lucide-link"
      category="String Tools"
      badge="SEO"
      :copy-text="output"
      :disable-copy="!output"
      @load-sample="loadSample"
      @clear="clearAll"
    >
      <template #actions>
        <div class="flex flex-wrap items-center gap-3">
          <!-- Separator Selector -->
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-muted font-medium">Separator:</span>
            <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-all"
                :class="draft.separatorType === '-' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
                title="Hyphen (-)"
                @click="draft.separatorType = '-'"
              >
                -
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-all"
                :class="draft.separatorType === '_' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
                title="Underscore (_)"
                @click="draft.separatorType = '_'"
              >
                _
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-all"
                :class="draft.separatorType === '.' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
                title="Dot (.)"
                @click="draft.separatorType = '.'"
              >
                .
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-all"
                :class="draft.separatorType === '/' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
                title="Slash (/)"
                @click="draft.separatorType = '/'"
              >
                /
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
                :class="draft.separatorType === '' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
                title="None (No separator)"
                @click="draft.separatorType = ''"
              >
                None
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
                :class="draft.separatorType === 'custom' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
                title="Custom character"
                @click="draft.separatorType = 'custom'"
              >
                Custom
              </button>
            </div>
            <input
              v-if="draft.separatorType === 'custom'"
              v-model="draft.customSeparator"
              type="text"
              maxlength="5"
              placeholder="Sep"
              class="w-16 px-2 py-1 text-xs font-mono rounded-lg border border-default bg-neutral-100 dark:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-primary"
            >
          </div>

          <!-- Casing Switcher -->
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-muted font-medium">Case:</span>
            <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
                :class="draft.casing === 'lower' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
                @click="draft.casing = 'lower'"
              >
                lowercase
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
                :class="draft.casing === 'upper' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
                @click="draft.casing = 'upper'"
              >
                UPPERCASE
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
                :class="draft.casing === 'title' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
                @click="draft.casing = 'title'"
              >
                Title-Case
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
                :class="draft.casing === 'preserve' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
                @click="draft.casing = 'preserve'"
              >
                Preserve
              </button>
            </div>
          </div>

          <!-- Charset Switcher -->
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-muted font-medium">Charset:</span>
            <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
                :class="draft.charset === 'ascii' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
                title="Strict alphanumeric [a-z0-9] only"
                @click="draft.charset === 'ascii'"
              >
                ASCII Safe
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
                :class="draft.charset === 'unicode' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
                title="Allow International Unicode letters and numbers"
                @click="draft.charset = 'unicode'"
              >
                Unicode
              </button>
            </div>
          </div>
        </div>

        <!-- Secondary Config Toggles -->
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs pt-1 border-t border-default/50 w-full">
          <label class="flex items-center gap-2 text-muted hover:text-highlighted cursor-pointer select-none">
            <input
              v-model="draft.normalizeAccents"
              type="checkbox"
              class="rounded border-default text-primary focus:ring-primary/20"
            >
            <span>Normalize accents & diacritics (é &rarr; e)</span>
          </label>

          <label class="flex items-center gap-2 text-muted hover:text-highlighted cursor-pointer select-none">
            <input
              v-model="draft.convertAmpersand"
              type="checkbox"
              class="rounded border-default text-primary focus:ring-primary/20"
            >
            <span>Convert '&amp;' to 'and'</span>
          </label>

          <label class="flex items-center gap-2 text-muted hover:text-highlighted cursor-pointer select-none">
            <input
              v-model="draft.removeStopWords"
              type="checkbox"
              class="rounded border-default text-primary focus:ring-primary/20"
            >
            <span>Remove stop words (the, in, for...)</span>
          </label>

          <label class="flex items-center gap-2 text-muted hover:text-highlighted cursor-pointer select-none">
            <input
              v-model="draft.batchMode"
              type="checkbox"
              class="rounded border-default text-primary focus:ring-primary/20"
            >
            <span>Batch line-by-line mode</span>
          </label>

          <!-- Max Length -->
          <div class="flex items-center gap-2">
            <span class="text-muted">Max Length:</span>
            <input
              v-model.number="draft.maxLength"
              type="number"
              min="0"
              placeholder="0 (off)"
              class="w-16 px-2 py-0.5 text-xs font-mono rounded border border-default bg-neutral-100 dark:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-primary"
            >
            <label
              v-if="typeof draft.maxLength === 'number' && draft.maxLength > 0"
              class="flex items-center gap-1.5 text-muted hover:text-highlighted cursor-pointer select-none"
            >
              <input
                v-model="draft.truncateWordBoundary"
                type="checkbox"
                class="rounded border-default text-primary focus:ring-primary/20"
              >
              <span>Word boundary</span>
            </label>
          </div>
        </div>
      </template>
    </ToolHeader>

    <!-- Metrics Bar -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-default bg-neutral-100/40 dark:bg-neutral-900/40 text-xs">
      <div>
        <span class="text-muted block text-[11px]">Original Text</span>
        <div class="font-mono mt-0.5">
          <strong class="text-highlighted">{{ stats.inChars }}</strong> chars
          <span class="text-muted text-[11px]">({{ stats.inWords }} words)</span>
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Slug Length</span>
        <div class="font-mono mt-0.5">
          <strong class="text-highlighted">{{ stats.outChars }}</strong> chars
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Output Lines</span>
        <div class="font-mono mt-0.5">
          <strong class="text-highlighted">{{ stats.outLines }}</strong> lines
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Character Delta</span>
        <div
          class="font-mono mt-0.5 font-semibold"
          :class="stats.diff >= 0 ? 'text-emerald-500' : 'text-amber-500'"
        >
          {{ stats.diff >= 0 ? `-${stats.diff}` : `+${Math.abs(stats.diff)}` }} chars
        </div>
      </div>
    </div>

    <!-- Live URL Simulator Banner -->
    <div
      v-if="output && !draft.batchMode"
      class="p-4 rounded-xl border border-default bg-neutral-100/60 dark:bg-neutral-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
    >
      <div class="flex items-center gap-2.5 min-w-0 flex-1 w-full">
        <UIcon
          name="i-lucide-globe"
          class="size-5 text-primary shrink-0"
        />
        <div class="flex items-center gap-1.5 min-w-0 flex-1 font-mono text-xs overflow-hidden">
          <input
            v-model="draft.baseUrl"
            type="text"
            placeholder="Base URL..."
            class="text-muted hover:text-highlighted bg-transparent border-b border-dashed border-default focus:outline-none focus:border-primary shrink-0 max-w-[180px] sm:max-w-[220px]"
          >
          <span class="text-primary font-semibold truncate">{{ output }}</span>
        </div>
      </div>
      <UButton
        icon="i-lucide-copy"
        label="Copy URL"
        size="xs"
        color="neutral"
        variant="outline"
        class="shrink-0"
        @click="copyToClipboard(fullUrl, 'Full URL copied!')"
      />
    </div>

    <!-- Dual Panes: Input & Slug Output -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden">
        <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <span class="flex items-center gap-2">
            <UIcon
              name="i-lucide-align-left"
              class="size-4"
            />
            Original String / Title
          </span>
          <span class="font-mono text-[11px]">{{ stats.inChars }} chars</span>
        </div>
        <div class="p-2 flex-1">
          <textarea
            v-model="draft.input"
            :placeholder="draft.batchMode ? 'Paste multiple titles (one per line)...' : 'Paste article title, heading, product name, or sentence to slugify...'"
            class="w-full h-80 p-3 bg-transparent font-mono text-xs focus:outline-none resize-y text-highlighted"
            spellcheck="false"
          />
        </div>
      </div>

      <div class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden">
        <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <span class="flex items-center gap-2">
            <UIcon
              name="i-lucide-link-2"
              class="size-4"
            />
            Generated Slug
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
            placeholder="URL slug will appear here..."
            class="w-full h-80 p-3 bg-transparent font-mono text-xs focus:outline-none resize-y text-highlighted"
            spellcheck="false"
          />
        </div>
      </div>
    </div>

    <!-- Quick Format Variations Grid (Single mode) -->
    <div
      v-if="variations.length > 0 && !draft.batchMode"
      class="space-y-3"
    >
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-highlighted flex items-center gap-2">
          <UIcon
            name="i-lucide-sparkles"
            class="size-4 text-primary"
          />
          Common Casing Variations
        </h3>
        <span class="text-xs text-muted">Click any card to copy</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          v-for="item in variations"
          :key="item.label"
          type="button"
          class="group text-left p-3 rounded-xl border border-default bg-neutral-100/40 dark:bg-neutral-900/40 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:border-primary/50 transition-all flex flex-col justify-between"
          @click="copyToClipboard(item.value, `${item.label} copied!`)"
        >
          <div class="flex items-center justify-between w-full mb-1.5">
            <span class="text-[11px] font-medium text-muted flex items-center gap-1.5">
              <UIcon
                :name="item.icon"
                class="size-3.5 text-primary"
              />
              {{ item.label }}
            </span>
            <UIcon
              name="i-lucide-copy"
              class="size-3 text-muted group-hover:text-primary transition-colors"
            />
          </div>
          <div class="font-mono text-xs font-semibold text-highlighted truncate w-full">
            {{ item.value }}
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
