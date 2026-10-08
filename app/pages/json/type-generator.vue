<script setup lang="ts">
import { useClipboardAction } from '~/composables/useClipboardAction'
import { useToolDraft } from '~/composables/useToolDraft'
import type { TargetLanguage, CodegenOptions } from '~/types/codegen'
import type { SchemaField } from '~/types/schema'
import { inferSchemaFromData } from '~/utils/schema'
import { parseJsonSchemaToField, isJsonSchemaDocument } from '~/utils/schemaParser'
import { generateCode } from '~/utils/codegen'

type InputMode = 'auto' | 'json' | 'schema'

// Persistent tool draft in localStorage
interface TypeGeneratorDraft {
  inputMode: InputMode
  rawInput: string
  selectedTarget: TargetLanguage
  rootName: string
  zodInferType: boolean
  pythonOptionalUnion: boolean
  pythonSnakeCase: boolean
  goOmitEmpty: boolean
  goPointerOptional: boolean
  tsTypeOrInterface: 'interface' | 'type'
  tsReadonly: boolean
}

const { state: draft, clearDraft } = useToolDraft<TypeGeneratorDraft>('json-type-generator', () => ({
  inputMode: 'auto',
  rawInput: '',
  selectedTarget: 'zod',
  rootName: 'UserPayload',
  zodInferType: true,
  pythonOptionalUnion: true,
  pythonSnakeCase: true,
  goOmitEmpty: true,
  goPointerOptional: true,
  tsTypeOrInterface: 'interface',
  tsReadonly: false
}))

const parseError = ref<string | null>(null)

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
  draft.value.rawInput = sampleJsonPayload
  parseError.value = null
  toast.add({
    title: 'Sample JSON Loaded',
    description: 'Pasted comprehensive sample API response with nested structures',
    color: 'info',
    icon: 'i-lucide-file-text'
  })
}

function loadSampleSchema() {
  draft.value.rawInput = sampleSchemaPayload
  parseError.value = null
  toast.add({
    title: 'Sample JSON Schema Loaded',
    description: 'Pasted JSON Schema definition with validations and required fields',
    color: 'info',
    icon: 'i-lucide-file-json'
  })
}

function clearAll() {
  clearDraft()
  parseError.value = null
  toast.add({
    title: 'Cleared',
    description: 'Draft reset and local cache wiped clean',
    color: 'neutral',
    icon: 'i-lucide-trash-2'
  })
}

const parsedJsonData = computed<{ data: unknown, isSchema: boolean } | null>(() => {
  const raw = draft.value.rawInput.trim()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    const isSchema = draft.value.inputMode === 'schema'
      || (draft.value.inputMode === 'auto' && isJsonSchemaDocument(parsed))
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
      : (draft.value.rootName || 'Root')
    return parseJsonSchemaToField(title, parsed, true)
  } else {
    return inferSchemaFromData(draft.value.rootName || 'Root', parsed, true)
  }
})

// Validation watcher
watch(
  () => draft.value.rawInput,
  (val) => {
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
  },
  { immediate: true }
)

const generatedOutput = computed<string>(() => {
  if (!inferredRootField.value) {
    if (!draft.value.rawInput.trim()) {
      return '// Paste or type valid JSON or JSON Schema on the left panel to generate models'
    }
    return `// Syntax error in input:\n// ${parseError.value || 'Invalid JSON'}`
  }

  const codegenOpts: CodegenOptions = {
    rootName: draft.value.rootName || 'Root',
    zodInferType: draft.value.zodInferType,
    pythonOptionalUnion: draft.value.pythonOptionalUnion,
    pythonSnakeCase: draft.value.pythonSnakeCase,
    goOmitEmpty: draft.value.goOmitEmpty,
    goPointerOptional: draft.value.goPointerOptional,
    tsTypeOrInterface: draft.value.tsTypeOrInterface,
    tsReadonly: draft.value.tsReadonly
  }

  try {
    return generateCode(draft.value.selectedTarget, inferredRootField.value, codegenOpts)
  } catch (err: unknown) {
    return `// Error generating code:\n// ${err instanceof Error ? err.message : String(err)}`
  }
})

function formatJsonInput() {
  const raw = draft.value.rawInput.trim()
  if (!raw) return
  try {
    const parsed = JSON.parse(raw)
    draft.value.rawInput = JSON.stringify(parsed, null, 2)
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
    description: `Generated ${draft.value.selectedTarget.toUpperCase()} definition ready for your codebase`,
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

  const ext = extensions[draft.value.selectedTarget]
  const filename = `${(draft.value.rootName || 'models').toLowerCase()}.${ext}`
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
  return map[draft.value.selectedTarget] || 'typescript'
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
          :color="draft.selectedTarget === target.id ? 'primary' : 'neutral'"
          :variant="draft.selectedTarget === target.id ? 'solid' : 'ghost'"
          size="sm"
          @click="draft.selectedTarget = target.id"
        />
      </div>

      <!-- Root Model / Class Name Input -->
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-muted">Root Name:</span>
        <UInput
          v-model="draft.rootName"
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
      <template v-if="draft.selectedTarget === 'zod'">
        <label class="flex items-center gap-2 cursor-pointer hover:text-highlighted">
          <input
            v-model="draft.zodInferType"
            type="checkbox"
            class="rounded border-default text-primary focus:ring-primary"
          >
          Export <code>z.infer&lt;typeof ...&gt;</code> types
        </label>
      </template>

      <!-- PYDANTIC OPTIONS -->
      <template v-else-if="draft.selectedTarget === 'pydantic'">
        <label class="flex items-center gap-2 cursor-pointer hover:text-highlighted">
          <input
            v-model="draft.pythonSnakeCase"
            type="checkbox"
            class="rounded border-default text-primary focus:ring-primary"
          >
          Auto snake_case with <code>Field(alias="...")</code>
        </label>
        <label class="flex items-center gap-2 cursor-pointer hover:text-highlighted">
          <input
            v-model="draft.pythonOptionalUnion"
            type="checkbox"
            class="rounded border-default text-primary focus:ring-primary"
          >
          Use Python 3.10+ union (<code>T | None</code>)
        </label>
      </template>

      <!-- PYTHON DATACLASS OPTIONS -->
      <template v-else-if="draft.selectedTarget === 'dataclass'">
        <label class="flex items-center gap-2 cursor-pointer hover:text-highlighted">
          <input
            v-model="draft.pythonSnakeCase"
            type="checkbox"
            class="rounded border-default text-primary focus:ring-primary"
          >
          Auto snake_case field names
        </label>
        <label class="flex items-center gap-2 cursor-pointer hover:text-highlighted">
          <input
            v-model="draft.pythonOptionalUnion"
            type="checkbox"
            class="rounded border-default text-primary focus:ring-primary"
          >
          Use Python 3.10+ union (<code>T | None</code>)
        </label>
      </template>

      <!-- PYTHON TYPEDDICT OPTIONS -->
      <template v-else-if="draft.selectedTarget === 'typeddict'">
        <span class="text-muted">Generates PEP 589 TypedDict with <code>NotRequired[...]</code> for optional fields</span>
      </template>

      <!-- GO OPTIONS -->
      <template v-else-if="draft.selectedTarget === 'go'">
        <label class="flex items-center gap-2 cursor-pointer hover:text-highlighted">
          <input
            v-model="draft.goOmitEmpty"
            type="checkbox"
            class="rounded border-default text-primary focus:ring-primary"
          >
          Add <code>omitempty</code> in json tag for optionals
        </label>
        <label class="flex items-center gap-2 cursor-pointer hover:text-highlighted">
          <input
            v-model="draft.goPointerOptional"
            type="checkbox"
            class="rounded border-default text-primary focus:ring-primary"
          >
          Use pointer (<code>*T</code>) for nullable/optional
        </label>
      </template>

      <!-- TYPESCRIPT OPTIONS -->
      <template v-else-if="draft.selectedTarget === 'typescript'">
        <div class="flex items-center gap-2">
          <span>Style:</span>
          <select
            v-model="draft.tsTypeOrInterface"
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
            v-model="draft.tsReadonly"
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
                :class="draft.inputMode === 'auto' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted'"
                @click="draft.inputMode = 'auto'"
              >
                Auto Detect
              </button>
              <button
                type="button"
                class="px-2 py-0.5 rounded transition-all"
                :class="draft.inputMode === 'json' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted'"
                @click="draft.inputMode = 'json'"
              >
                Raw JSON
              </button>
              <button
                type="button"
                class="px-2 py-0.5 rounded transition-all"
                :class="draft.inputMode === 'schema' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted'"
                @click="draft.inputMode = 'schema'"
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
              v-else-if="draft.rawInput.trim()"
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
              :disabled="!draft.rawInput.trim()"
              @click="formatJsonInput"
            />
            <UButton
              icon="i-lucide-eraser"
              label="Clear"
              color="neutral"
              variant="ghost"
              size="xs"
              :disabled="!draft.rawInput"
              @click="clearAll"
            />
          </div>
        </div>

        <div class="relative">
          <textarea
            v-model="draft.rawInput"
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
            <span class="text-xs font-semibold text-highlighted uppercase tracking-wider">Generated {{ draft.selectedTarget.toUpperCase() }}</span>
            <UBadge
              color="neutral"
              variant="subtle"
              size="xs"
            >
              {{ TARGETS.find(t => t.id === draft.selectedTarget)?.label }}
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
