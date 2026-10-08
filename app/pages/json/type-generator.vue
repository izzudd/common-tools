<script setup lang="ts">
import { useClipboardAction } from '~/composables/useClipboardAction'
import type { TargetLanguage, CodegenOptions } from '~/types/codegen'
import type { SchemaField } from '~/types/schema'
import { inferSchemaFromData } from '~/utils/schema'
import { parseJsonSchemaToField, isJsonSchemaDocument } from '~/utils/schemaParser'
import { generateCode } from '~/utils/codegen'

type InputMode = 'auto' | 'json' | 'schema'

// Page-isolated state (per project workflow rules)
const inputMode = ref<InputMode>('auto')
const rawInput = ref('')
const parseError = ref<string | null>(null)
const selectedTarget = ref<TargetLanguage>('zod')
const rootName = ref('UserPayload')

// Options
const zodInferType = ref(true)
const pythonOptionalUnion = ref(true) // Python 3.10+ (T | None)
const pythonSnakeCase = ref(true)
const goOmitEmpty = ref(true)
const goPointerOptional = ref(true)
const tsTypeOrInterface = ref<'interface' | 'type'>('interface')
const tsReadonly = ref(false)

const { copied, copyToClipboard } = useClipboardAction()
const toast = useToast()

const TARGETS: { id: TargetLanguage, label: string, icon: string, badge?: string }[] = [
  { id: 'zod', label: 'Zod (TS)', icon: 'i-lucide-shield-check', badge: 'Validation' },
  { id: 'pydantic', label: 'Pydantic (Py)', icon: 'i-lucide-box', badge: 'v2' },
  { id: 'dataclass', label: 'Dataclass', icon: 'i-lucide-file-code', badge: 'Python' },
  { id: 'typeddict', label: 'TypedDict', icon: 'i-lucide-braces', badge: 'Python' },
  { id: 'go', label: 'Go Struct', icon: 'i-lucide-cpu', badge: 'Golang' },
  { id: 'typescript', label: 'TypeScript', icon: 'i-lucide-file-text', badge: 'Types' }
]

const sampleJsonPayload = `{
  "id": 101,
  "username": "alex_dev",
  "email": "alex@example.com",
  "is_active": true,
  "score": 98.5,
  "created_at": "2026-03-15T08:30:00Z",
  "avatar_url": "https://example.com/avatar.png",
  "tags": ["developer", "golang", "python", "vue"],
  "profile": {
    "bio": "Full-stack engineer",
    "location": "Jakarta, ID",
    "website": "https://alex.dev"
  },
  "roles": [
    {
      "id": 1,
      "name": "admin",
      "permissions": ["read", "write", "delete"]
    }
  ]
}`

const sampleSchemaPayload = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "UserPayload",
  "type": "object",
  "required": ["id", "username", "email", "roles"],
  "properties": {
    "id": {
      "type": "integer",
      "minimum": 1
    },
    "username": {
      "type": "string",
      "minLength": 3,
      "maxLength": 30
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "is_active": {
      "type": "boolean"
    },
    "score": {
      "type": "number"
    },
    "created_at": {
      "type": "string",
      "format": "date-time"
    },
    "avatar_url": {
      "type": "string",
      "format": "uri"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "profile": {
      "type": "object",
      "properties": {
        "bio": { "type": "string" },
        "location": { "type": "string" },
        "website": { "type": "string", "format": "uri" }
      }
    },
    "roles": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name"],
        "properties": {
          "id": { "type": "integer" },
          "name": { "type": "string" },
          "permissions": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    }
  }
}`

function loadSample() {
  rawInput.value = sampleJsonPayload
  parseError.value = null
  toast.add({
    title: 'Sample JSON Loaded',
    description: 'Pasted comprehensive sample API response with nested structures',
    color: 'info',
    icon: 'i-lucide-file-text'
  })
}

function loadSampleSchema() {
  rawInput.value = sampleSchemaPayload
  parseError.value = null
  toast.add({
    title: 'Sample JSON Schema Loaded',
    description: 'Pasted JSON Schema definition with validations and required fields',
    color: 'info',
    icon: 'i-lucide-file-json'
  })
}

function clearAll() {
  rawInput.value = ''
  parseError.value = null
}

const parsedJsonData = computed<{ data: unknown, isSchema: boolean } | null>(() => {
  const raw = rawInput.value.trim()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    const isSchema = inputMode.value === 'schema'
      || (inputMode.value === 'auto' && isJsonSchemaDocument(parsed))
    return { data: parsed, isSchema }
  } catch {
    return null
  }
})

const detectedMode = computed<'json' | 'schema'>(() => {
  return parsedJsonData.value?.isSchema ? 'schema' : 'json'
})

const inferredRootField = computed<SchemaField | null>(() => {
  if (!parsedJsonData.value) return null
  const { data: parsed, isSchema } = parsedJsonData.value

  if (isSchema) {
    const title = (parsed && typeof parsed === 'object' && typeof (parsed as Record<string, unknown>).title === 'string' && (parsed as Record<string, unknown>).title)
      ? String((parsed as Record<string, unknown>).title).trim()
      : (rootName.value || 'Root')
    return parseJsonSchemaToField(title, parsed, true)
  } else {
    return inferSchemaFromData(rootName.value || 'Root', parsed, true)
  }
})

// Validation watcher
watch(rawInput, (val) => {
  const raw = val.trim()
  if (!raw) {
    parseError.value = null
    return
  }
  try {
    JSON.parse(raw)
    parseError.value = null
  } catch (err: unknown) {
    parseError.value = err instanceof Error ? err.message : 'Invalid JSON format'
  }
}, { immediate: true })

const generatedOutput = computed<string>(() => {
  if (!inferredRootField.value) {
    if (!rawInput.value.trim()) {
      return '// Paste or type valid JSON or JSON Schema on the left panel to generate models'
    }
    return `// Syntax error in input:\n// ${parseError.value || 'Invalid JSON'}`
  }

  const codegenOpts: CodegenOptions = {
    rootName: rootName.value || 'Root',
    zodInferType: zodInferType.value,
    pythonOptionalUnion: pythonOptionalUnion.value,
    pythonSnakeCase: pythonSnakeCase.value,
    goOmitEmpty: goOmitEmpty.value,
    goPointerOptional: goPointerOptional.value,
    tsTypeOrInterface: tsTypeOrInterface.value,
    tsReadonly: tsReadonly.value
  }

  try {
    return generateCode(selectedTarget.value, inferredRootField.value, codegenOpts)
  } catch (err: unknown) {
    return `// Error generating code:\n// ${err instanceof Error ? err.message : String(err)}`
  }
})

function formatJsonInput() {
  const raw = rawInput.value.trim()
  if (!raw) return
  try {
    const parsed = JSON.parse(raw)
    rawInput.value = JSON.stringify(parsed, null, 2)
    toast.add({
      title: 'Formatted Input',
      description: 'Applied standard 2-space indentation',
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch (err: unknown) {
    toast.add({
      title: 'Cannot format',
      description: err instanceof Error ? err.message : 'Invalid JSON',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function copyOutput() {
  if (!generatedOutput.value || parseError.value) return
  await copyToClipboard(generatedOutput.value)
  toast.add({
    title: 'Copied to Clipboard',
    description: `Generated ${selectedTarget.value.toUpperCase()} definition ready for your codebase`,
    color: 'success',
    icon: 'i-lucide-check'
  })
}

function downloadFile() {
  if (!generatedOutput.value || parseError.value) return

  const extensions: Record<TargetLanguage, string> = {
    zod: 'ts',
    pydantic: 'py',
    dataclass: 'py',
    typeddict: 'py',
    go: 'go',
    typescript: 'ts'
  }

  const ext = extensions[selectedTarget.value]
  const filename = `${(rootName.value || 'models').toLowerCase()}.${ext}`
  const blob = new Blob([generatedOutput.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  toast.add({
    title: 'File Downloaded',
    description: `Saved as ${filename}`,
    color: 'success',
    icon: 'i-lucide-download'
  })
}

const targetLangShiki = computed<string>(() => {
  const map: Record<TargetLanguage, string> = {
    zod: 'typescript',
    pydantic: 'python',
    dataclass: 'python',
    typeddict: 'python',
    go: 'go',
    typescript: 'typescript'
  }
  return map[selectedTarget.value] || 'typescript'
})
</script>

<template>
  <div class="space-y-6">
    <ToolHeader
      title="JSON to Type & Model"
      description="Convert sample JSON payloads or JSON Schema definitions into type-safe models for Zod, Pydantic, Python Dataclass / TypedDict, Go Structs, and TypeScript"
      category="JSON Tools"
      badge="Multi-target"
      icon="i-lucide-code-xml"
      :copy-text="generatedOutput"
      :disable-copy="!generatedOutput || !!parseError"
      @load-sample="loadSample"
      @clear="clearAll"
      @copy="copyOutput"
    >
      <template #actions>
        <div class="flex items-center gap-2 flex-wrap text-xs text-muted">
          <span>Quick Samples:</span>
          <UButton
            label="Sample JSON"
            size="xs"
            color="neutral"
            variant="outline"
            icon="i-lucide-braces"
            @click="loadSample"
          />
          <UButton
            label="Sample JSON Schema"
            size="xs"
            color="neutral"
            variant="outline"
            icon="i-lucide-file-json"
            @click="loadSampleSchema"
          />
          <NuxtLink
            to="/json/schema"
            class="inline-flex items-center gap-1 text-primary hover:underline ml-2"
          >
            <UIcon
              name="i-lucide-external-link"
              class="size-3.5"
            />
            Need to build schema first? Open Schema Builder
          </NuxtLink>
        </div>
      </template>
    </ToolHeader>

    <!-- Target Selector Bar -->
    <div class="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-neutral-100/50 dark:bg-neutral-900/50 border border-default">
      <div class="flex flex-wrap items-center gap-1.5">
        <UButton
          v-for="target in TARGETS"
          :key="target.id"
          :icon="target.icon"
          :label="target.label"
          :color="selectedTarget === target.id ? 'primary' : 'neutral'"
          :variant="selectedTarget === target.id ? 'solid' : 'ghost'"
          size="sm"
          @click="selectedTarget = target.id"
        />
      </div>

      <!-- Root Model / Class Name Input -->
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-muted">Root Name:</span>
        <UInput
          v-model="rootName"
          placeholder="e.g. UserPayload"
          size="sm"
          class="w-40 font-mono text-xs"
        />
      </div>
    </div>

    <!-- Target Specific Options Banner -->
    <div class="flex flex-wrap items-center gap-4 px-4 py-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-default text-xs text-muted">
      <span class="font-semibold text-highlighted flex items-center gap-1.5">
        <UIcon
          name="i-lucide-sliders"
          class="size-3.5"
        />
        Config:
      </span>

      <!-- ZOD OPTIONS -->
      <template v-if="selectedTarget === 'zod'">
        <label class="flex items-center gap-2 cursor-pointer hover:text-highlighted">
          <input
            v-model="zodInferType"
            type="checkbox"
            class="rounded border-default text-primary focus:ring-primary"
          >
          Export <code>z.infer&lt;typeof ...&gt;</code> types
        </label>
      </template>

      <!-- PYDANTIC OPTIONS -->
      <template v-else-if="selectedTarget === 'pydantic'">
        <label class="flex items-center gap-2 cursor-pointer hover:text-highlighted">
          <input
            v-model="pythonSnakeCase"
            type="checkbox"
            class="rounded border-default text-primary focus:ring-primary"
          >
          Auto snake_case with <code>Field(alias="...")</code>
        </label>
        <label class="flex items-center gap-2 cursor-pointer hover:text-highlighted">
          <input
            v-model="pythonOptionalUnion"
            type="checkbox"
            class="rounded border-default text-primary focus:ring-primary"
          >
          Use Python 3.10+ union (<code>T | None</code>)
        </label>
      </template>

      <!-- PYTHON DATACLASS OPTIONS -->
      <template v-else-if="selectedTarget === 'dataclass'">
        <label class="flex items-center gap-2 cursor-pointer hover:text-highlighted">
          <input
            v-model="pythonSnakeCase"
            type="checkbox"
            class="rounded border-default text-primary focus:ring-primary"
          >
          Auto snake_case field names
        </label>
        <label class="flex items-center gap-2 cursor-pointer hover:text-highlighted">
          <input
            v-model="pythonOptionalUnion"
            type="checkbox"
            class="rounded border-default text-primary focus:ring-primary"
          >
          Use Python 3.10+ union (<code>T | None</code>)
        </label>
      </template>

      <!-- PYTHON TYPEDDICT OPTIONS -->
      <template v-else-if="selectedTarget === 'typeddict'">
        <span class="text-muted">Generates PEP 589 TypedDict with <code>NotRequired[...]</code> for optional fields</span>
      </template>

      <!-- GO OPTIONS -->
      <template v-else-if="selectedTarget === 'go'">
        <label class="flex items-center gap-2 cursor-pointer hover:text-highlighted">
          <input
            v-model="goOmitEmpty"
            type="checkbox"
            class="rounded border-default text-primary focus:ring-primary"
          >
          Add <code>omitempty</code> in json tag for optionals
        </label>
        <label class="flex items-center gap-2 cursor-pointer hover:text-highlighted">
          <input
            v-model="goPointerOptional"
            type="checkbox"
            class="rounded border-default text-primary focus:ring-primary"
          >
          Use pointer (<code>*T</code>) for nullable/optional
        </label>
      </template>

      <!-- TYPESCRIPT OPTIONS -->
      <template v-else-if="selectedTarget === 'typescript'">
        <div class="flex items-center gap-2">
          <span>Style:</span>
          <select
            v-model="tsTypeOrInterface"
            class="bg-transparent border border-default rounded px-2 py-0.5 text-xs text-highlighted"
          >
            <option value="interface">
              interface
            </option>
            <option value="type">
              type alias
            </option>
          </select>
        </div>
        <label class="flex items-center gap-2 cursor-pointer hover:text-highlighted">
          <input
            v-model="tsReadonly"
            type="checkbox"
            class="rounded border-default text-primary focus:ring-primary"
          >
          Mark fields as <code>readonly</code>
        </label>
      </template>
    </div>

    <!-- Dual Pane Editor & Preview -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <!-- LEFT PANE: Input -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-highlighted uppercase tracking-wider">Input Payload</span>

            <!-- Mode Selector / Indicator -->
            <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900 text-[11px]">
              <button
                type="button"
                class="px-2 py-0.5 rounded transition-all"
                :class="inputMode === 'auto' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted'"
                @click="inputMode = 'auto'"
              >
                Auto Detect
              </button>
              <button
                type="button"
                class="px-2 py-0.5 rounded transition-all"
                :class="inputMode === 'json' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted'"
                @click="inputMode = 'json'"
              >
                Raw JSON
              </button>
              <button
                type="button"
                class="px-2 py-0.5 rounded transition-all"
                :class="inputMode === 'schema' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted'"
                @click="inputMode = 'schema'"
              >
                JSON Schema
              </button>
            </div>

            <UBadge
              v-if="parseError"
              color="error"
              variant="subtle"
              size="xs"
            >
              Invalid
            </UBadge>
            <UBadge
              v-else-if="rawInput.trim()"
              color="success"
              variant="subtle"
              size="xs"
            >
              {{ detectedMode === 'schema' ? 'JSON Schema' : 'JSON Object' }}
            </UBadge>
          </div>

          <div class="flex items-center gap-1.5">
            <UButton
              icon="i-lucide-align-left"
              label="Format"
              color="neutral"
              variant="ghost"
              size="xs"
              :disabled="!rawInput.trim()"
              @click="formatJsonInput"
            />
            <UButton
              icon="i-lucide-eraser"
              label="Clear"
              color="neutral"
              variant="ghost"
              size="xs"
              :disabled="!rawInput"
              @click="rawInput = ''"
            />
          </div>
        </div>

        <div class="relative">
          <textarea
            v-model="rawInput"
            placeholder="Paste your JSON payload or JSON Schema definition here..."
            rows="24"
            class="w-full font-mono text-xs p-4 rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 text-highlighted focus:ring-2 focus:ring-primary focus:outline-none transition resize-y"
            spellcheck="false"
          />
        </div>

        <!-- Parse error banner -->
        <div
          v-if="parseError"
          class="flex items-start gap-2 p-3 rounded-lg bg-error/10 text-error border border-error/20 text-xs"
        >
          <UIcon
            name="i-lucide-alert-triangle"
            class="size-4 shrink-0 mt-0.5"
          />
          <span class="font-mono">{{ parseError }}</span>
        </div>
      </div>

      <!-- RIGHT PANE: Code Output -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-highlighted uppercase tracking-wider">Generated {{ selectedTarget.toUpperCase() }}</span>
            <UBadge
              color="neutral"
              variant="subtle"
              size="xs"
            >
              {{ TARGETS.find(t => t.id === selectedTarget)?.label }}
            </UBadge>
          </div>

          <div class="flex items-center gap-1.5">
            <UButton
              icon="i-lucide-download"
              label="Download"
              color="neutral"
              variant="ghost"
              size="xs"
              :disabled="!generatedOutput || !!parseError"
              @click="downloadFile"
            />
            <UButton
              :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
              :label="copied ? 'Copied!' : 'Copy'"
              :color="copied ? 'success' : 'neutral'"
              variant="ghost"
              size="xs"
              :disabled="!generatedOutput || !!parseError"
              @click="copyOutput"
            />
          </div>
        </div>

        <div class="relative">
          <CodeHighlightViewer
            :code="generatedOutput"
            :lang="targetLangShiki"
            max-height="34rem"
          />
        </div>

        <div class="flex items-center justify-between text-xs text-muted pt-1">
          <span>Source: {{ detectedMode === 'schema' ? 'Parsed from JSON Schema' : 'Inferred from JSON payload' }}</span>
          <span>{{ generatedOutput.split('\n').length }} lines</span>
        </div>
      </div>
    </div>
  </div>
</template>
