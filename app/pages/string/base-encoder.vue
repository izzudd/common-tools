<script setup lang="ts">
import { useClipboardAction } from '~/composables/useClipboardAction'
import { useToolDraft } from '~/composables/useToolDraft'

type ToolMode = 'text' | 'number'
type TextAction = 'encode' | 'decode'
type BaseFormat
  = 'base64'
    | 'base64url'
    | 'hex'
    | 'binary'
    | 'base32'
    | 'base58'
    | 'base62'
    | 'octal'
    | 'decimal'

interface BaseEncoderDraft {
  toolMode: ToolMode
  textAction: TextAction
  selectedBase: BaseFormat
  inputText: string
  hexCase: 'lower' | 'upper'
  byteSeparator: 'space' | 'none' | 'colon'
  base64Padding: boolean
  numberInput: string
  numberInputBase: number
}

const { state: draft, clearDraft } = useToolDraft<BaseEncoderDraft>('string-base-encoder', () => ({
  toolMode: 'text',
  textAction: 'encode',
  selectedBase: 'base64',
  inputText: '',
  hexCase: 'lower',
  byteSeparator: 'space',
  base64Padding: true,
  numberInput: '',
  numberInputBase: 10
}))

const outputText = ref('')
const errorMessage = ref<string | null>(null)

const { copied, copyToClipboard } = useClipboardAction()

// Text sample
const sampleText = `DevPocket 🚀: Ultra fast, client-side, zero tracking developer toolkit.`
const sampleNumber = '1048576'

// --- Text Encoding / Decoding Utilities ---
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder('utf-8', { fatal: false })

// Base Alphabets
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

// Base64 & Base64URL
function bytesToBase64(bytes: Uint8Array, urlSafe = false, pad = true): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  let base64 = btoa(binary)
  if (urlSafe) {
    base64 = base64.replace(/\+/g, '-').replace(/\//g, '_')
  }
  if (!pad) {
    base64 = base64.replace(/=+$/, '')
  }
  return base64
}

function base64ToBytes(str: string): Uint8Array {
  let clean = str.trim().replace(/-/g, '+').replace(/_/g, '/')
  while (clean.length % 4 !== 0) {
    clean += '='
  }
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// Hex (Base16)
function bytesToHex(bytes: Uint8Array, uppercase = false, sep = ' '): string {
  const separator = sep === 'colon' ? ':' : sep === 'space' ? ' ' : ''
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(separator)
  return uppercase ? hex.toUpperCase() : hex.toLowerCase()
}

function hexToBytes(str: string): Uint8Array {
  const clean = str.replace(/^0x/gi, '').replace(/[\s:-]/g, '')
  if (clean.length % 2 !== 0) {
    throw new Error('Hex string must contain an even number of characters')
  }
  if (/[^0-9a-fA-F]/.test(clean)) {
    throw new Error('Hex string contains invalid characters')
  }
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = Number.parseInt(clean.slice(i, i + 2), 16)
  }
  return bytes
}

// Binary (Base2)
function bytesToBinary(bytes: Uint8Array, sep = ' '): string {
  const separator = sep === 'colon' ? ':' : sep === 'space' ? ' ' : ''
  return Array.from(bytes)
    .map(b => b.toString(2).padStart(8, '0'))
    .join(separator)
}

function binaryToBytes(str: string): Uint8Array {
  const clean = str.replace(/[\s:-]/g, '')
  if (clean.length === 0) return new Uint8Array(0)
  if (clean.length % 8 !== 0) {
    throw new Error('Binary bit length must be a multiple of 8')
  }
  if (/[^01]/.test(clean)) {
    throw new Error('Binary string can only contain digits 0 and 1')
  }
  const bytes = new Uint8Array(clean.length / 8)
  for (let i = 0; i < clean.length; i += 8) {
    bytes[i / 8] = Number.parseInt(clean.slice(i, i + 8), 2)
  }
  return bytes
}

// Octal (Base8)
function bytesToOctal(bytes: Uint8Array, sep = ' '): string {
  const separator = sep === 'colon' ? ':' : sep === 'space' ? ' ' : ''
  return Array.from(bytes)
    .map(b => b.toString(8).padStart(3, '0'))
    .join(separator)
}

function octalToBytes(str: string): Uint8Array {
  const clean = str.trim()
  if (!clean) return new Uint8Array(0)
  const parts = clean.includes(' ') || clean.includes(':') ? clean.split(/[\s:]+/) : clean.match(/.{1,3}/g) || []
  const bytes = new Uint8Array(parts.length)
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (!part) continue
    const val = Number.parseInt(part, 8)
    if (Number.isNaN(val) || val < 0 || val > 255) {
      throw new Error(`Invalid octal byte: ${part}`)
    }
    bytes[i] = val
  }
  return bytes
}

// Decimal (ASCII Bytes)
function bytesToDecimal(bytes: Uint8Array, sep = ' '): string {
  const separator = sep === 'colon' ? ':' : sep === 'space' ? ' ' : ' '
  return Array.from(bytes).join(separator)
}

function decimalToBytes(str: string): Uint8Array {
  const clean = str.trim()
  if (!clean) return new Uint8Array(0)
  const parts = clean.split(/[\s,:-]+/)
  const bytes = new Uint8Array(parts.length)
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (!part) continue
    const val = Number.parseInt(part, 10)
    if (Number.isNaN(val) || val < 0 || val > 255) {
      throw new Error(`Invalid byte number (must be 0-255): ${part}`)
    }
    bytes[i] = val
  }
  return bytes
}

// Base32 (RFC 4648)
function bytesToBase32(bytes: Uint8Array, pad = true): string {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      const idx = (value >>> (bits - 5)) & 31
      output += BASE32_ALPHABET[idx] ?? ''
      bits -= 5
    }
  }
  if (bits > 0) {
    const idx = (value << (5 - bits)) & 31
    output += BASE32_ALPHABET[idx] ?? ''
  }
  if (pad) {
    while (output.length % 8 !== 0) {
      output += '='
    }
  }
  return output
}

function base32ToBytes(str: string): Uint8Array {
  const clean = str.toUpperCase().replace(/[=\s]/g, '')
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char)
    if (idx === -1) throw new Error(`Invalid Base32 character: ${char}`)
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return new Uint8Array(bytes)
}

// Base58 (Bitcoin)
function bytesToBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) return ''
  let zeroes = 0
  while (zeroes < bytes.length && bytes[zeroes] === 0) {
    zeroes++
  }
  let num = 0n
  for (const byte of bytes) {
    num = (num << 8n) + BigInt(byte)
  }
  let str = ''
  while (num > 0n) {
    const rem = num % 58n
    num = num / 58n
    str = (BASE58_ALPHABET[Number(rem)] ?? '') + str
  }
  return '1'.repeat(zeroes) + str
}

function base58ToBytes(str: string): Uint8Array {
  const clean = str.trim()
  if (!clean) return new Uint8Array(0)
  let zeroes = 0
  while (zeroes < clean.length && clean[zeroes] === '1') {
    zeroes++
  }
  let num = 0n
  for (const char of clean.slice(zeroes)) {
    const idx = BASE58_ALPHABET.indexOf(char)
    if (idx === -1) throw new Error(`Invalid Base58 character: ${char}`)
    num = num * 58n + BigInt(idx)
  }
  const hex = num.toString(16)
  const hexPadded = hex.length % 2 === 0 ? hex : '0' + hex
  const byteCount = hex === '0' ? 0 : hexPadded.length / 2
  const result = new Uint8Array(zeroes + byteCount)
  for (let i = 0; i < byteCount; i++) {
    result[zeroes + i] = Number.parseInt(hexPadded.slice(i * 2, i * 2 + 2), 16)
  }
  return result
}

// Base62
function bytesToBase62(bytes: Uint8Array): string {
  if (bytes.length === 0) return ''
  let num = 0n
  for (const byte of bytes) {
    num = (num << 8n) + BigInt(byte)
  }
  if (num === 0n) return '0'
  let str = ''
  while (num > 0n) {
    const rem = num % 62n
    num = num / 62n
    str = (BASE62_ALPHABET[Number(rem)] ?? '') + str
  }
  return str
}

function base62ToBytes(str: string): Uint8Array {
  const clean = str.trim()
  if (!clean) return new Uint8Array(0)
  let num = 0n
  for (const char of clean) {
    const idx = BASE62_ALPHABET.indexOf(char)
    if (idx === -1) throw new Error(`Invalid Base62 character: ${char}`)
    num = num * 62n + BigInt(idx)
  }
  const hex = num.toString(16)
  const hexPadded = hex.length % 2 === 0 ? hex : '0' + hex
  const byteCount = hex === '0' ? 0 : hexPadded.length / 2
  const result = new Uint8Array(byteCount)
  for (let i = 0; i < byteCount; i++) {
    result[i] = Number.parseInt(hexPadded.slice(i * 2, i * 2 + 2), 16)
  }
  return result
}

// --- Text Processing ---
function processText() {
  errorMessage.value = null
  const input = draft.value.inputText
  if (!input) {
    outputText.value = ''
    return
  }

  try {
    if (draft.value.textAction === 'encode') {
      const bytes = textEncoder.encode(input)
      switch (draft.value.selectedBase) {
        case 'base64':
          outputText.value = bytesToBase64(bytes, false, draft.value.base64Padding)
          break
        case 'base64url':
          outputText.value = bytesToBase64(bytes, true, draft.value.base64Padding)
          break
        case 'hex':
          outputText.value = bytesToHex(bytes, draft.value.hexCase === 'upper', draft.value.byteSeparator)
          break
        case 'binary':
          outputText.value = bytesToBinary(bytes, draft.value.byteSeparator)
          break
        case 'octal':
          outputText.value = bytesToOctal(bytes, draft.value.byteSeparator)
          break
        case 'decimal':
          outputText.value = bytesToDecimal(bytes, draft.value.byteSeparator)
          break
        case 'base32':
          outputText.value = bytesToBase32(bytes, draft.value.base64Padding)
          break
        case 'base58':
          outputText.value = bytesToBase58(bytes)
          break
        case 'base62':
          outputText.value = bytesToBase62(bytes)
          break
      }
    } else {
      // Decode
      let bytes: Uint8Array
      switch (draft.value.selectedBase) {
        case 'base64':
        case 'base64url':
          bytes = base64ToBytes(input)
          break
        case 'hex':
          bytes = hexToBytes(input)
          break
        case 'binary':
          bytes = binaryToBytes(input)
          break
        case 'octal':
          bytes = octalToBytes(input)
          break
        case 'decimal':
          bytes = decimalToBytes(input)
          break
        case 'base32':
          bytes = base32ToBytes(input)
          break
        case 'base58':
          bytes = base58ToBytes(input)
          break
        case 'base62':
          bytes = base62ToBytes(input)
          break
        default:
          throw new Error('Unsupported format')
      }
      outputText.value = textDecoder.decode(bytes)
    }
  } catch (err: unknown) {
    outputText.value = ''
    if (err instanceof Error) {
      errorMessage.value = err.message
    } else {
      errorMessage.value = 'Failed to transform base string'
    }
  }
}

watch(
  draft,
  () => {
    if (draft.value.toolMode === 'text') {
      processText()
    }
  },
  { deep: true, immediate: true }
)

function swapInputOutput() {
  const temp = outputText.value
  draft.value.textAction = draft.value.textAction === 'encode' ? 'decode' : 'encode'
  draft.value.inputText = temp
  processText()
}

// Multi-base live overview cards (when in text encode mode)
const multiBasePreviews = computed(() => {
  const text = draft.value.inputText
  if (!text) return []

  try {
    const bytes = textEncoder.encode(text)
    return [
      {
        id: 'base64',
        name: 'Base64 (RFC 4648)',
        value: bytesToBase64(bytes, false, true),
        icon: 'i-lucide-file-code'
      },
      {
        id: 'base64url',
        name: 'Base64URL',
        value: bytesToBase64(bytes, true, false),
        icon: 'i-lucide-globe'
      },
      {
        id: 'hex',
        name: 'Hexadecimal (Base16)',
        value: bytesToHex(bytes, false, ' '),
        icon: 'i-lucide-hash'
      },
      {
        id: 'binary',
        name: 'Binary (Base2)',
        value: bytesToBinary(bytes, ' '),
        icon: 'i-lucide-binary'
      },
      {
        id: 'base32',
        name: 'Base32',
        value: bytesToBase32(bytes, true),
        icon: 'i-lucide-align-left'
      },
      {
        id: 'base58',
        name: 'Base58 (Bitcoin)',
        value: bytesToBase58(bytes),
        icon: 'i-lucide-coins'
      },
      {
        id: 'base62',
        name: 'Base62',
        value: bytesToBase62(bytes),
        icon: 'i-lucide-type'
      },
      {
        id: 'octal',
        name: 'Octal (Base8)',
        value: bytesToOctal(bytes, ' '),
        icon: 'i-lucide-list-ordered'
      },
      {
        id: 'decimal',
        name: 'ASCII Decimal Bytes',
        value: bytesToDecimal(bytes, ' '),
        icon: 'i-lucide-calculator'
      }
    ]
  } catch {
    return []
  }
})

// --- Number / Radix Conversion Utilities ---
const NUMBER_BASES = [
  { base: 2, label: 'Binary (Base 2)', alphabet: '01', prefix: '0b' },
  { base: 8, label: 'Octal (Base 8)', alphabet: '01234567', prefix: '0o' },
  { base: 10, label: 'Decimal (Base 10)', alphabet: '0123456789', prefix: '' },
  { base: 16, label: 'Hex (Base 16)', alphabet: '0123456789abcdef', prefix: '0x' },
  { base: 32, label: 'Base 32', alphabet: '0123456789abcdefghjkmnpqrstvwxyz', prefix: '' },
  { base: 36, label: 'Base 36', alphabet: '0123456789abcdefghijklmnopqrstuvwxyz', prefix: '' },
  { base: 58, label: 'Base 58', alphabet: BASE58_ALPHABET, prefix: '' },
  { base: 62, label: 'Base 62', alphabet: BASE62_ALPHABET, prefix: '' },
  { base: 64, label: 'Base 64', alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', prefix: '' }
]

function bigIntToBase(n: bigint, alphabet: string): string {
  if (n === 0n) return alphabet[0] ?? '0'
  const base = BigInt(alphabet.length)
  let isNegative = false
  let current = n
  if (current < 0n) {
    isNegative = true
    current = -current
  }
  let result = ''
  while (current > 0n) {
    const rem = current % base
    result = (alphabet[Number(rem)] ?? '') + result
    current = current / base
  }
  return isNegative ? '-' + result : result
}

function baseToBigInt(str: string, alphabet: string): bigint {
  const clean = str.trim()
  if (!clean) throw new Error('Number is empty')
  let isNegative = false
  let s = clean
  if (s.startsWith('-')) {
    isNegative = true
    s = s.slice(1)
  }
  const base = BigInt(alphabet.length)
  let result = 0n
  for (const char of s) {
    const idx = alphabet.indexOf(char)
    if (idx === -1) {
      throw new Error(`Invalid character '${char}' for Base ${alphabet.length}`)
    }
    result = result * base + BigInt(idx)
  }
  return isNegative ? -result : result
}

const parsedBigInt = computed<{ value: bigint | null, error: string | null }>(() => {
  const raw = draft.value.numberInput.trim()
  if (!raw) return { value: null, error: null }

  try {
    let clean = raw
    let effectiveBase = draft.value.numberInputBase

    // Auto-detect prefixes if in standard base
    if (clean.startsWith('0x') || clean.startsWith('0X')) {
      effectiveBase = 16
      clean = clean.slice(2)
    } else if (clean.startsWith('0b') || clean.startsWith('0B')) {
      effectiveBase = 2
      clean = clean.slice(2)
    } else if (clean.startsWith('0o') || clean.startsWith('0O')) {
      effectiveBase = 8
      clean = clean.slice(2)
    }

    const conf = NUMBER_BASES.find(b => b.base === effectiveBase)
    if (!conf) throw new Error(`Base ${effectiveBase} is not supported`)

    // For hex/base36, case-insensitivity helps
    const targetAlphabet = conf.alphabet
    const compareInput = (effectiveBase === 16 || effectiveBase === 36 || effectiveBase === 32)
      ? clean.toLowerCase()
      : clean

    const val = baseToBigInt(compareInput, targetAlphabet)
    return { value: val, error: null }
  } catch (err: unknown) {
    return {
      value: null,
      error: err instanceof Error ? err.message : 'Invalid number for selected base'
    }
  }
})

const numberBaseConversions = computed(() => {
  const { value, error } = parsedBigInt.value
  if (value === null || error) return []

  return NUMBER_BASES.map(item => ({
    base: item.base,
    label: item.label,
    value: bigIntToBase(value, item.alphabet),
    prefix: item.prefix
  }))
})

// Unified Controls
function loadSample() {
  if (draft.value.toolMode === 'text') {
    draft.value.inputText = sampleText
    draft.value.textAction = 'encode'
    processText()
  } else {
    draft.value.numberInput = sampleNumber
    draft.value.numberInputBase = 10
  }
}

function clearAll() {
  clearDraft()
  outputText.value = ''
  errorMessage.value = null
}

const copyableContent = computed(() => {
  if (draft.value.toolMode === 'text') {
    return outputText.value
  }
  return numberBaseConversions.value.length > 0
    ? numberBaseConversions.value.map(c => `${c.label}: ${c.value}`).join('\n')
    : ''
})

const textStats = computed(() => {
  const inBytes = new Blob([draft.value.inputText]).size
  const outBytes = new Blob([outputText.value]).size
  return {
    inLength: draft.value.inputText.length,
    outLength: outputText.value.length,
    inBytes,
    outBytes
  }
})
</script>

<template>
  <div class="space-y-6">
    <ToolHeader
      title="Base Encoder & Decoder"
      description="Encode and decode text, or convert numbers and integers across common bases: Base64, Hex, Binary, Base32, Base58, Base62, Octal."
      icon="i-lucide-binary"
      category="String Tools"
      badge="Multi-Base"
      :copy-text="copyableContent"
      :disable-copy="!copyableContent"
      @load-sample="loadSample"
      @clear="clearAll"
    >
      <template #actions>
        <div class="flex flex-wrap items-center justify-between gap-3 w-full">
          <!-- Main Mode Switcher: Text vs Number -->
          <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
            <button
              type="button"
              class="px-3.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
              :class="draft.toolMode === 'text' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
              @click="draft.toolMode = 'text'"
            >
              <UIcon
                name="i-lucide-type"
                class="size-3.5"
              />
              Text / String Mode
            </button>
            <button
              type="button"
              class="px-3.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
              :class="draft.toolMode === 'number' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
              @click="draft.toolMode = 'number'"
            >
              <UIcon
                name="i-lucide-calculator"
                class="size-3.5"
              />
              Number / Radix Mode
            </button>
          </div>

          <!-- Text Mode Sub-controls -->
          <div
            v-if="draft.toolMode === 'text'"
            class="flex flex-wrap items-center gap-3"
          >
            <!-- Encode vs Decode -->
            <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
              <button
                type="button"
                class="px-3 py-1 text-xs font-medium rounded-md transition-all"
                :class="draft.textAction === 'encode' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
                @click="draft.textAction = 'encode'"
              >
                Encode
              </button>
              <button
                type="button"
                class="px-3 py-1 text-xs font-medium rounded-md transition-all"
                :class="draft.textAction === 'decode' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
                @click="draft.textAction = 'decode'"
              >
                Decode
              </button>
            </div>

            <!-- Base Selector -->
            <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900 text-xs">
              <button
                v-for="b in ([
                  { id: 'base64', label: 'Base64' },
                  { id: 'base64url', label: 'Base64URL' },
                  { id: 'hex', label: 'Hex' },
                  { id: 'binary', label: 'Binary' },
                  { id: 'base32', label: 'Base32' },
                  { id: 'base58', label: 'Base58' },
                  { id: 'base62', label: 'Base62' },
                  { id: 'octal', label: 'Octal' }
                ] as const)"
                :key="b.id"
                type="button"
                class="px-2 py-0.5 rounded transition-all"
                :class="draft.selectedBase === b.id ? 'bg-neutral-200 dark:bg-neutral-800 text-highlighted font-semibold' : 'text-muted hover:text-highlighted'"
                @click="draft.selectedBase = b.id"
              >
                {{ b.label }}
              </button>
            </div>

            <!-- Swap Button -->
            <UButton
              icon="i-lucide-arrow-left-right"
              label="Swap"
              size="xs"
              variant="ghost"
              color="neutral"
              :disabled="!outputText"
              @click="swapInputOutput"
            />
          </div>
        </div>

        <!-- Extra Text Controls Row -->
        <div
          v-if="draft.toolMode === 'text'"
          class="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs pt-1 border-t border-default/50 w-full"
        >
          <!-- Hex Casing -->
          <div
            v-if="draft.selectedBase === 'hex'"
            class="flex items-center gap-2"
          >
            <span class="text-muted">Letter Case:</span>
            <div class="inline-flex rounded border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
              <button
                type="button"
                class="px-2 py-0.5 text-[11px] rounded"
                :class="draft.hexCase === 'lower' ? 'bg-neutral-200 dark:bg-neutral-800 text-highlighted font-semibold' : 'text-muted'"
                @click="draft.hexCase = 'lower'"
              >
                lowercase (a-f)
              </button>
              <button
                type="button"
                class="px-2 py-0.5 text-[11px] rounded"
                :class="draft.hexCase === 'upper' ? 'bg-neutral-200 dark:bg-neutral-800 text-highlighted font-semibold' : 'text-muted'"
                @click="draft.hexCase = 'upper'"
              >
                UPPERCASE (A-F)
              </button>
            </div>
          </div>

          <!-- Separator for byte-based formats -->
          <div
            v-if="['hex', 'binary', 'octal', 'decimal'].includes(draft.selectedBase)"
            class="flex items-center gap-2"
          >
            <span class="text-muted">Byte Delimiter:</span>
            <div class="inline-flex rounded border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
              <button
                type="button"
                class="px-2 py-0.5 text-[11px] rounded"
                :class="draft.byteSeparator === 'space' ? 'bg-neutral-200 dark:bg-neutral-800 text-highlighted font-semibold' : 'text-muted'"
                @click="draft.byteSeparator = 'space'"
              >
                Space
              </button>
              <button
                type="button"
                class="px-2 py-0.5 text-[11px] rounded"
                :class="draft.byteSeparator === 'none' ? 'bg-neutral-200 dark:bg-neutral-800 text-highlighted font-semibold' : 'text-muted'"
                @click="draft.byteSeparator = 'none'"
              >
                None
              </button>
              <button
                type="button"
                class="px-2 py-0.5 text-[11px] rounded"
                :class="draft.byteSeparator === 'colon' ? 'bg-neutral-200 dark:bg-neutral-800 text-highlighted font-semibold' : 'text-muted'"
                @click="draft.byteSeparator = 'colon'"
              >
                Colon (:)
              </button>
            </div>
          </div>

          <!-- Base64 Padding -->
          <label
            v-if="['base64', 'base64url', 'base32'].includes(draft.selectedBase)"
            class="flex items-center gap-2 text-muted hover:text-highlighted cursor-pointer select-none"
          >
            <input
              v-model="draft.base64Padding"
              type="checkbox"
              class="rounded border-default text-primary focus:ring-primary/20"
            >
            <span>Include '=' padding</span>
          </label>
        </div>
      </template>
    </ToolHeader>

    <!-- Error message banner -->
    <div
      v-if="draft.toolMode === 'text' && errorMessage"
      class="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 flex items-start gap-3 text-xs"
    >
      <UIcon
        name="i-lucide-alert-triangle"
        class="size-4 shrink-0 mt-0.5"
      />
      <div>
        <strong class="font-semibold block">Decoding Error</strong>
        <span>{{ errorMessage }}</span>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- VIEW A: TEXT MODE                          -->
    <!-- ========================================== -->
    <div
      v-if="draft.toolMode === 'text'"
      class="space-y-6"
    >
      <!-- Metrics Bar -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-default bg-neutral-100/40 dark:bg-neutral-900/40 text-xs">
        <div>
          <span class="text-muted block text-[11px]">Input Size</span>
          <div class="font-mono mt-0.5">
            <strong class="text-highlighted">{{ textStats.inLength }}</strong> chars
            <span class="text-muted text-[11px]">({{ textStats.inBytes }} B)</span>
          </div>
        </div>
        <div>
          <span class="text-muted block text-[11px]">Output Size</span>
          <div class="font-mono mt-0.5">
            <strong class="text-highlighted">{{ textStats.outLength }}</strong> chars
            <span class="text-muted text-[11px]">({{ textStats.outBytes }} B)</span>
          </div>
        </div>
        <div>
          <span class="text-muted block text-[11px]">Current Format</span>
          <div class="font-mono mt-0.5 uppercase font-semibold text-primary">
            {{ draft.selectedBase }}
          </div>
        </div>
        <div>
          <span class="text-muted block text-[11px]">Operation</span>
          <div class="font-mono mt-0.5 font-semibold text-highlighted capitalize">
            {{ draft.textAction }}
          </div>
        </div>
      </div>

      <!-- Dual Panes -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Input pane -->
        <div class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden">
          <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
            <span class="flex items-center gap-2">
              <UIcon
                :name="draft.textAction === 'encode' ? 'i-lucide-type' : 'i-lucide-binary'"
                class="size-4"
              />
              {{ draft.textAction === 'encode' ? 'Raw Text / String' : `Encoded ${draft.selectedBase.toUpperCase()} String` }}
            </span>
            <span class="font-mono text-[11px]">{{ textStats.inLength }} chars</span>
          </div>
          <div class="p-2 flex-1">
            <textarea
              v-model="draft.inputText"
              :placeholder="draft.textAction === 'encode' ? 'Type or paste plain text to encode into bases...' : `Paste valid ${draft.selectedBase.toUpperCase()} encoded string to decode...`"
              class="w-full h-80 p-3 bg-transparent font-mono text-xs focus:outline-none resize-y text-highlighted"
              spellcheck="false"
            />
          </div>
        </div>

        <!-- Output pane -->
        <div class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden">
          <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
            <span class="flex items-center gap-2">
              <UIcon
                :name="draft.textAction === 'encode' ? 'i-lucide-binary' : 'i-lucide-type'"
                class="size-4"
              />
              {{ draft.textAction === 'encode' ? `Encoded ${draft.selectedBase.toUpperCase()}` : 'Decoded Plain Text' }}
            </span>
            <div class="flex items-center gap-2">
              <span class="font-mono text-[11px]">{{ textStats.outLength }} chars</span>
              <UButton
                v-if="outputText"
                :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                :label="copied ? 'Copied' : 'Copy'"
                size="xs"
                color="neutral"
                variant="outline"
                @click="copyToClipboard(outputText)"
              />
            </div>
          </div>
          <div class="p-2 flex-1">
            <textarea
              :value="outputText"
              readonly
              :placeholder="errorMessage ? 'Fix syntax error on the left...' : 'Converted output will appear here...'"
              class="w-full h-80 p-3 bg-transparent font-mono text-xs focus:outline-none resize-y text-highlighted"
              spellcheck="false"
            />
          </div>
        </div>
      </div>

      <!-- Live Multi-Base Overview Grid (When encoding) -->
      <div
        v-if="draft.textAction === 'encode' && multiBasePreviews.length > 0"
        class="space-y-3"
      >
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-highlighted flex items-center gap-2">
            <UIcon
              name="i-lucide-sparkles"
              class="size-4 text-primary"
            />
            All Base Formats (Instant Copy)
          </h3>
          <span class="text-xs text-muted">Generated simultaneously</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <div
            v-for="b in multiBasePreviews"
            :key="b.id"
            class="group p-3 rounded-xl border border-default bg-neutral-100/40 dark:bg-neutral-900/40 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:border-primary/50 transition-all flex flex-col justify-between"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-highlighted flex items-center gap-1.5">
                <UIcon
                  :name="b.icon"
                  class="size-3.5 text-primary"
                />
                {{ b.name }}
              </span>
              <UButton
                icon="i-lucide-copy"
                size="xs"
                variant="ghost"
                color="neutral"
                @click="copyToClipboard(b.value, `${b.name} copied!`)"
              />
            </div>
            <div
              class="font-mono text-xs text-muted break-all line-clamp-3 bg-neutral-200/40 dark:bg-neutral-950/40 p-2 rounded-lg select-all"
              :title="b.value"
            >
              {{ b.value }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- VIEW B: NUMBER / RADIX CONVERTER           -->
    <!-- ========================================== -->
    <div
      v-else
      class="space-y-6"
    >
      <!-- Number Input Card -->
      <div class="p-5 rounded-xl border border-default bg-neutral-100/40 dark:bg-neutral-900/40 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-semibold text-highlighted">
              Number / Integer Input
            </h3>
            <p class="text-xs text-muted mt-0.5">
              Enter any integer (supports arbitrarily large BigInt values). Prefix with <code class="text-primary font-mono">0x</code> for Hex, <code class="text-primary font-mono">0b</code> for Binary, or pick the base below.
            </p>
          </div>

          <!-- Base Selector -->
          <div class="flex items-center gap-2 text-xs">
            <span class="text-muted">Input Base:</span>
            <select
              v-model.number="draft.numberInputBase"
              class="px-2.5 py-1 text-xs rounded-lg border border-default bg-neutral-100 dark:bg-neutral-900 font-mono text-highlighted focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option
                v-for="b in NUMBER_BASES"
                :key="b.base"
                :value="b.base"
              >
                Base {{ b.base }} ({{ b.label.split(' ')[0] }})
              </option>
            </select>
          </div>
        </div>

        <div class="relative">
          <input
            v-model="draft.numberInput"
            type="text"
            placeholder="e.g. 1048576, 0x100000, 0b100000000000000000000..."
            class="w-full px-4 py-3 rounded-xl border border-default bg-neutral-100/60 dark:bg-neutral-950/60 font-mono text-sm text-highlighted focus:outline-none focus:ring-2 focus:ring-primary/50"
            spellcheck="false"
          >
          <div
            v-if="draft.numberInput"
            class="absolute right-2.5 top-2.5 flex items-center gap-1"
          >
            <UButton
              icon="i-lucide-x"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="draft.numberInput = ''"
            />
          </div>
        </div>

        <!-- Parse Error Banner -->
        <div
          v-if="parsedBigInt.error"
          class="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs flex items-center gap-2 font-mono"
        >
          <UIcon
            name="i-lucide-alert-circle"
            class="size-4 shrink-0"
          />
          <span>{{ parsedBigInt.error }}</span>
        </div>
      </div>

      <!-- Multi-Base Number Conversion Grid -->
      <div
        v-if="numberBaseConversions.length > 0"
        class="space-y-3"
      >
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-highlighted flex items-center gap-2">
            <UIcon
              name="i-lucide-layers"
              class="size-4 text-primary"
            />
            Radix Conversions (All Bases)
          </h3>
          <span class="text-xs text-muted">Calculated with full BigInt precision</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="item in numberBaseConversions"
            :key="item.base"
            class="p-4 rounded-xl border border-default bg-neutral-100/40 dark:bg-neutral-900/40 hover:border-primary/40 transition-colors flex flex-col justify-between"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-highlighted flex items-center gap-1.5">
                <UBadge
                  color="primary"
                  variant="subtle"
                  size="xs"
                >
                  Base {{ item.base }}
                </UBadge>
                {{ item.label.replace(`(Base ${item.base})`, '') }}
              </span>
              <UButton
                icon="i-lucide-copy"
                size="xs"
                color="neutral"
                variant="ghost"
                @click="copyToClipboard(item.value, `${item.label} copied!`)"
              />
            </div>

            <div class="font-mono text-xs font-semibold text-primary break-all bg-neutral-200/40 dark:bg-neutral-950/40 p-2.5 rounded-lg select-all">
              <span
                v-if="item.prefix"
                class="text-muted text-[11px]"
              >{{ item.prefix }}</span>
              <span>{{ item.value }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
