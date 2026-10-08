<script setup lang="ts">
import { useClipboardAction } from '~/composables/useClipboardAction'
import type { SchemaField, SchemaDraft } from '~/types/schema'
import {
  generateFieldId,
  inferSchemaFromData,
  buildRootJsonSchema,
  buildTypeScriptDefinition
} from '~/utils/schema'

type ActiveView = 'builder' | 'infer'
type OutputView = 'schema' | 'typescript'

// Page-isolated state
const activeView = ref<ActiveView>('builder')
const outputView = ref<OutputView>('schema')

// Schema Config
const schemaTitle = ref('UserPayload')
const schemaDescription = ref('')
const schemaDraft = ref<SchemaDraft>('draft-07')
const strictAdditionalProperties = ref(false)

// Sample input for inference mode
const sampleJsonInput = ref('')
const inferErrorMessage = ref<string | null>(null)

// Root Schema Tree
const rootField = ref<SchemaField>({
  id: 'root',
  name: 'root',
  type: 'object',
  required: true,
  properties: [
    {
      id: generateFieldId(),
      name: 'id',
      type: 'integer',
      required: true,
      minimum: 1
    },
    {
      id: generateFieldId(),
      name: 'username',
      type: 'string',
      required: true,
      minLength: 3,
      maxLength: 30
    },
    {
      id: generateFieldId(),
      name: 'email',
      type: 'string',
      required: true,
      format: 'email'
    },
    {
      id: generateFieldId(),
      name: 'isActive',
      type: 'boolean',
      required: false
    },
    {
      id: generateFieldId(),
      name: 'roles',
      type: 'array',
      required: true,
      itemType: 'string'
    },
    {
      id: generateFieldId(),
      name: 'profile',
      type: 'object',
      required: false,
      properties: [
        {
          id: generateFieldId(),
          name: 'displayName',
          type: 'string',
          required: false
        },
        {
          id: generateFieldId(),
          name: 'website',
          type: 'string',
          required: false,
          format: 'uri'
        }
      ]
    }
  ]
})

const { copied, copyToClipboard } = useClipboardAction()
const toast = useToast()

const sampleJsonPayload = `{
  "id": 101,
  "username": "alex_dev",
  "email": "alex@example.com",
  "isActive": true,
  "score": 98.5,
  "createdAt": "2026-03-15T08:30:00Z",
  "homepage": "https://example.com/alex",
  "tags": ["frontend", "vue", "nuxt"],
  "settings": {
    "notifications": true,
    "theme": "dark"
  }
}`

function loadSample() {
  sampleJsonInput.value = sampleJsonPayload
  inferFromJson()
}

function clearAll() {
  rootField.value.properties = []
  sampleJsonInput.value = ''
  inferErrorMessage.value = null
}

function inferFromJson() {
  inferErrorMessage.value = null
  const raw = sampleJsonInput.value.trim()
  if (!raw) {
    inferErrorMessage.value = 'Please paste a valid JSON string'
    return
  }

  try {
    const parsed = JSON.parse(raw)
    const inferred = inferSchemaFromData('root', parsed, true)

    if (inferred.type === 'object') {
      rootField.value = inferred
    } else {
      // Wrap in root container
      rootField.value = {
        id: 'root',
        name: 'root',
        type: 'object',
        required: true,
        properties: [inferred]
      }
    }

    activeView.value = 'builder'
    toast.add({
      title: 'Schema Inferred',
      description: 'Extracted properties & data types successfully',
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch (err: unknown) {
    inferErrorMessage.value = err instanceof Error ? err.message : 'Invalid JSON format'
  }
}

// Generated Output Code
const generatedSchema = computed(() => {
  return buildRootJsonSchema(rootField.value, {
    draft: schemaDraft.value,
    title: schemaTitle.value,
    description: schemaDescription.value,
    strictAdditionalProperties: strictAdditionalProperties.value
  })
})

const generatedTypeScript = computed(() => {
  const safeName = (schemaTitle.value.trim().replace(/[^\w\d]/g, '') || 'RootObject')
  return buildTypeScriptDefinition(rootField.value, safeName)
})

const currentOutputCode = computed(() => {
  return outputView.value === 'schema' ? generatedSchema.value : generatedTypeScript.value
})

function markAllRequired(required: boolean) {
  function applyReq(field: SchemaField) {
    field.required = required
    if (field.properties) {
      field.properties.forEach(applyReq)
    }
    if (field.itemProperties) {
      field.itemProperties.forEach(applyReq)
    }
  }

  if (rootField.value.properties) {
    rootField.value.properties.forEach(applyReq)
  }

  toast.add({
    title: required ? 'All Fields Marked Required' : 'All Fields Marked Optional',
    color: 'neutral'
  })
}

function downloadFile() {
  const isSchema = outputView.value === 'schema'
  const ext = isSchema ? 'json' : 'ts'
  const filename = `${schemaTitle.value.toLowerCase() || 'schema'}.${ext}`
  const mime = isSchema ? 'application/json' : 'text/typescript'

  const blob = new Blob([currentOutputCode.value], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)

  toast.add({
    title: 'Downloaded File',
    description: `Saved as ${filename}`,
    color: 'success'
  })
}

const stats = computed(() => {
  const countProps = (field: SchemaField): number => {
    let count = 0
    if (field.properties) {
      count += field.properties.length
      field.properties.forEach((p) => {
        count += countProps(p)
      })
    }
    if (field.itemProperties) {
      count += field.itemProperties.length
      field.itemProperties.forEach((p) => {
        count += countProps(p)
      })
    }
    return count
  }

  return {
    totalProperties: countProps(rootField.value),
    outputLines: currentOutputCode.value.split('\n').length,
    outputSize: new Blob([currentOutputCode.value]).size
  }
})
</script>

<template>
  <div class="space-y-6">
    <ToolHeader
      title="JSON Schema Builder & Generator"
      description="Create, infer, and customize JSON Schema (Draft 7 / 2020-12) and TypeScript interfaces interactively."
      icon="i-lucide-file-json"
      category="JSON Tools"
      badge="Generator"
      :copy-text="currentOutputCode"
      :disable-copy="!currentOutputCode"
      @load-sample="loadSample"
      @clear="clearAll"
    >
      <template #actions>
        <div class="flex flex-wrap items-center justify-between gap-3 w-full">
          <!-- View Modes: Visual Builder vs Infer from JSON -->
          <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
            <button
              type="button"
              class="px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
              :class="activeView === 'builder' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
              @click="activeView = 'builder'"
            >
              <UIcon
                name="i-lucide-sliders"
                class="size-3.5"
              />
              Interactive Builder
            </button>
            <button
              type="button"
              class="px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
              :class="activeView === 'infer' ? 'bg-primary text-white shadow-xs font-semibold' : 'text-muted hover:text-highlighted'"
              @click="activeView = 'infer'"
            >
              <UIcon
                name="i-lucide-sparkles"
                class="size-3.5"
              />
              Infer from Sample JSON
            </button>
          </div>

          <!-- Quick Helpers -->
          <div class="flex items-center gap-2">
            <UButton
              label="Require All"
              size="xs"
              color="neutral"
              variant="outline"
              @click="markAllRequired(true)"
            />
            <UButton
              label="Optional All"
              size="xs"
              color="neutral"
              variant="outline"
              @click="markAllRequired(false)"
            />
          </div>
        </div>

        <!-- Schema Options Configuration Row -->
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs pt-2 border-t border-default/50 w-full">
          <!-- Title -->
          <div class="flex items-center gap-1.5">
            <span class="text-muted">Title:</span>
            <input
              v-model="schemaTitle"
              type="text"
              placeholder="SchemaTitle"
              class="w-32 px-2 py-0.5 text-xs font-mono rounded border border-default bg-neutral-100 dark:bg-neutral-900 text-highlighted focus:outline-none focus:ring-1 focus:ring-primary"
            >
          </div>

          <!-- Draft Version -->
          <div class="flex items-center gap-1.5">
            <span class="text-muted">Draft:</span>
            <select
              v-model="schemaDraft"
              class="px-2 py-0.5 text-xs rounded border border-default bg-neutral-100 dark:bg-neutral-900 font-mono text-highlighted focus:outline-none"
            >
              <option value="draft-07">
                Draft-07 (Standard)
              </option>
              <option value="draft-2020-12">
                Draft 2020-12
              </option>
              <option value="draft-04">
                Draft-04
              </option>
            </select>
          </div>

          <!-- Strict Additional Properties -->
          <label class="flex items-center gap-1.5 text-muted hover:text-highlighted cursor-pointer select-none">
            <input
              v-model="strictAdditionalProperties"
              type="checkbox"
              class="rounded border-default text-primary focus:ring-primary/20"
            >
            <span>additionalProperties: false</span>
          </label>
        </div>
      </template>
    </ToolHeader>

    <!-- Metrics Bar -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-default bg-neutral-100/40 dark:bg-neutral-900/40 text-xs">
      <div>
        <span class="text-muted block text-[11px]">Total Properties</span>
        <div class="font-mono mt-0.5">
          <strong class="text-highlighted">{{ stats.totalProperties }}</strong> fields
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Generated Size</span>
        <div class="font-mono mt-0.5">
          <strong class="text-highlighted">{{ stats.outputLines }}</strong> lines
          <span class="text-muted text-[11px]">({{ stats.outputSize }} B)</span>
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Schema Draft</span>
        <div class="font-mono mt-0.5 font-semibold text-primary uppercase">
          {{ schemaDraft }}
        </div>
      </div>
      <div>
        <span class="text-muted block text-[11px]">Output Mode</span>
        <div class="font-mono mt-0.5 font-semibold text-highlighted capitalize">
          {{ outputView }}
        </div>
      </div>
    </div>

    <!-- Main Dual Panes -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Left Column: Visual Builder OR Infer Form (7 Cols) -->
      <div class="lg:col-span-7 space-y-4">
        <!-- MODE A: Visual Builder Tree -->
        <div
          v-if="activeView === 'builder'"
          class="rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 p-4 space-y-3"
        >
          <div class="flex items-center justify-between pb-2 border-b border-default text-xs">
            <div class="flex items-center gap-2 font-semibold text-highlighted">
              <UIcon
                name="i-lucide-folder-tree"
                class="size-4 text-primary"
              />
              Root Object Properties
            </div>
            <span class="text-muted text-[11px] font-mono">{{ rootField.properties?.length || 0 }} top-level keys</span>
          </div>

          <!-- Root Node Component -->
          <div class="space-y-2">
            <SchemaFieldNode
              v-model="rootField"
              :is-root="true"
            />
          </div>
        </div>

        <!-- MODE B: Infer from JSON -->
        <div
          v-else
          class="rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 p-4 space-y-4"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-highlighted flex items-center gap-1.5">
                <UIcon
                  name="i-lucide-sparkles"
                  class="size-4 text-primary"
                />
                Paste Sample JSON to Infer Schema
              </h3>
              <p class="text-xs text-muted mt-0.5">
                Automatically detects data types, nested objects, array items, and string formats (email, date, uri, uuid).
              </p>
            </div>
            <UButton
              label="Infer Schema"
              size="sm"
              color="primary"
              icon="i-lucide-wand-sparkles"
              @click="inferFromJson"
            />
          </div>

          <textarea
            v-model="sampleJsonInput"
            rows="14"
            placeholder="Paste your JSON payload here..."
            class="w-full p-3 font-mono text-xs rounded-xl border border-default bg-neutral-100/60 dark:bg-neutral-950/60 text-highlighted focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
            spellcheck="false"
          />

          <!-- Error Banner -->
          <div
            v-if="inferErrorMessage"
            class="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs flex items-center gap-2 font-mono"
          >
            <UIcon
              name="i-lucide-alert-circle"
              class="size-4 shrink-0"
            />
            <span>{{ inferErrorMessage }}</span>
          </div>
        </div>
      </div>

      <!-- Right Column: Live Generated Output (5 Cols) -->
      <div class="lg:col-span-5 flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden sticky top-20">
        <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <!-- Output Format Tabs -->
          <div class="inline-flex rounded border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900 text-[11px]">
            <button
              type="button"
              class="px-2.5 py-0.5 rounded transition-all font-mono"
              :class="outputView === 'schema' ? 'bg-neutral-200 dark:bg-neutral-800 text-highlighted font-semibold' : 'text-muted'"
              @click="outputView = 'schema'"
            >
              JSON Schema
            </button>
            <button
              type="button"
              class="px-2.5 py-0.5 rounded transition-all font-mono"
              :class="outputView === 'typescript' ? 'bg-neutral-200 dark:bg-neutral-800 text-highlighted font-semibold' : 'text-muted'"
              @click="outputView = 'typescript'"
            >
              TypeScript Interface
            </button>
          </div>

          <div class="flex items-center gap-1.5">
            <UButton
              icon="i-lucide-download"
              size="xs"
              color="neutral"
              variant="ghost"
              title="Download file"
              @click="downloadFile"
            />
            <UButton
              :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
              :label="copied ? 'Copied' : 'Copy'"
              size="xs"
              color="neutral"
              variant="outline"
              @click="copyToClipboard(currentOutputCode)"
            />
          </div>
        </div>

        <div class="p-2 flex-1">
          <textarea
            :value="currentOutputCode"
            readonly
            rows="22"
            class="w-full p-3 bg-transparent font-mono text-xs focus:outline-none resize-y text-highlighted"
            spellcheck="false"
          />
        </div>
      </div>
    </div>
  </div>
</template>
