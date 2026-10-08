<script setup lang="ts">
import type { SchemaField, JsonSchemaType, StringFormat } from '~/types/schema'
import { generateFieldId } from '~/utils/schema'

const field = defineModel<SchemaField>({ required: true })

interface Props {
  depth?: number
  isRoot?: boolean
}

withDefaults(defineProps<Props>(), {
  depth: 0,
  isRoot: false
})

const emit = defineEmits<{
  remove: [id: string]
}>()

const isExpanded = ref(true)
const showDetails = ref(false)

const TYPE_OPTIONS: { label: string, value: JsonSchemaType }[] = [
  { label: 'string', value: 'string' },
  { label: 'number', value: 'number' },
  { label: 'integer', value: 'integer' },
  { label: 'boolean', value: 'boolean' },
  { label: 'object', value: 'object' },
  { label: 'array', value: 'array' },
  { label: 'null', value: 'null' }
]

const FORMAT_OPTIONS: { label: string, value: StringFormat }[] = [
  { label: 'None', value: '' },
  { label: 'email', value: 'email' },
  { label: 'date-time', value: 'date-time' },
  { label: 'date', value: 'date' },
  { label: 'uri / URL', value: 'uri' },
  { label: 'uuid', value: 'uuid' },
  { label: 'ipv4', value: 'ipv4' }
]

function handleTypeChange() {
  if (field.value.type === 'object') {
    if (!field.value.properties) {
      field.value.properties = []
    }
  } else if (field.value.type === 'array') {
    if (!field.value.itemType) {
      field.value.itemType = 'string'
    }
    if (field.value.itemType === 'object' && !field.value.itemProperties) {
      field.value.itemProperties = []
    }
  }
}

function addProperty() {
  if (!field.value.properties) {
    field.value.properties = []
  }
  const count = field.value.properties.length + 1
  field.value.properties.push({
    id: generateFieldId(),
    name: `prop_${count}`,
    type: 'string',
    required: false
  })
  isExpanded.value = true
}

function removeProperty(id: string) {
  if (field.value.properties) {
    field.value.properties = field.value.properties.filter(p => p.id !== id)
  }
}

function addArrayItemProperty() {
  if (!field.value.itemProperties) {
    field.value.itemProperties = []
  }
  const count = field.value.itemProperties.length + 1
  field.value.itemProperties.push({
    id: generateFieldId(),
    name: `item_prop_${count}`,
    type: 'string',
    required: false
  })
  isExpanded.value = true
}

function removeArrayItemProperty(id: string) {
  if (field.value.itemProperties) {
    field.value.itemProperties = field.value.itemProperties.filter(p => p.id !== id)
  }
}
</script>

<template>
  <div class="flex flex-col space-y-1.5 w-full">
    <!-- Main Node Bar -->
    <div
      class="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 rounded-xl border border-default bg-neutral-100/50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-900/80 transition-colors group"
      :class="isRoot ? 'border-primary/40 bg-primary/5' : ''"
    >
      <!-- Expand / Collapse Arrow -->
      <button
        v-if="field.type === 'object' || (field.type === 'array' && field.itemType === 'object')"
        type="button"
        class="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-muted hover:text-highlighted transition-transform"
        @click="isExpanded = !isExpanded"
      >
        <UIcon
          :name="isExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
          class="size-3.5"
        />
      </button>
      <div
        v-else
        class="size-5 shrink-0"
      />

      <!-- Property Name -->
      <div class="flex items-center gap-1.5 min-w-[120px] sm:min-w-[150px] flex-1">
        <input
          v-model="field.name"
          type="text"
          :disabled="isRoot"
          placeholder="property_name"
          class="w-full px-2 py-1 text-xs font-mono font-semibold text-highlighted bg-transparent border border-transparent rounded hover:border-default focus:border-primary focus:bg-neutral-100 dark:focus:bg-neutral-950 focus:outline-none"
        >
      </div>

      <!-- Type Dropdown -->
      <select
        v-model="field.type"
        class="px-2 py-1 text-xs font-mono font-medium rounded-lg border border-default bg-neutral-100 dark:bg-neutral-800 text-highlighted focus:outline-none focus:ring-1 focus:ring-primary"
        @change="handleTypeChange"
      >
        <option
          v-for="t in TYPE_OPTIONS"
          :key="t.value"
          :value="t.value"
        >
          {{ t.label }}
        </option>
      </select>

      <!-- If Array: Item Type Dropdown -->
      <div
        v-if="field.type === 'array'"
        class="flex items-center gap-1 text-xs text-muted"
      >
        <span class="text-[11px]">of</span>
        <select
          v-model="field.itemType"
          class="px-2 py-1 text-xs font-mono rounded-lg border border-default bg-neutral-100 dark:bg-neutral-800 text-highlighted focus:outline-none"
          @change="handleTypeChange"
        >
          <option value="string">
            string
          </option>
          <option value="number">
            number
          </option>
          <option value="integer">
            integer
          </option>
          <option value="boolean">
            boolean
          </option>
          <option value="object">
            object
          </option>
        </select>
      </div>

      <!-- Required Checkbox -->
      <label
        v-if="!isRoot"
        class="flex items-center gap-1 text-[11px] text-muted hover:text-highlighted cursor-pointer select-none px-1"
        title="Field is required in JSON Schema"
      >
        <input
          v-model="field.required"
          type="checkbox"
          class="rounded border-default text-primary focus:ring-primary/20"
        >
        <span :class="field.required ? 'text-primary font-semibold' : ''">Required</span>
      </label>

      <!-- Constraints & Validation Popover Toggle -->
      <button
        type="button"
        class="p-1 rounded text-muted hover:text-highlighted transition-colors"
        :class="showDetails ? 'text-primary bg-primary/10' : ''"
        title="Configure constraints & details"
        @click="showDetails = !showDetails"
      >
        <UIcon
          name="i-lucide-sliders-horizontal"
          class="size-3.5"
        />
      </button>

      <!-- Add Child (for Objects) -->
      <button
        v-if="field.type === 'object'"
        type="button"
        class="p-1 rounded text-muted hover:text-primary transition-colors"
        title="Add property to this object"
        @click="addProperty"
      >
        <UIcon
          name="i-lucide-plus"
          class="size-3.5"
        />
      </button>

      <!-- Add Item Property (for Array of Objects) -->
      <button
        v-if="field.type === 'array' && field.itemType === 'object'"
        type="button"
        class="p-1 rounded text-muted hover:text-primary transition-colors"
        title="Add property to array item object"
        @click="addArrayItemProperty"
      >
        <UIcon
          name="i-lucide-plus"
          class="size-3.5"
        />
      </button>

      <!-- Delete Node -->
      <button
        v-if="!isRoot"
        type="button"
        class="p-1 rounded text-muted hover:text-rose-500 transition-colors opacity-60 group-hover:opacity-100"
        title="Remove property"
        @click="emit('remove', field.id)"
      >
        <UIcon
          name="i-lucide-trash"
          class="size-3.5"
        />
      </button>
    </div>

    <!-- Validation / Constraints Details Panel -->
    <div
      v-if="showDetails"
      class="p-3 ml-6 rounded-xl border border-default/80 bg-neutral-100/30 dark:bg-neutral-900/30 space-y-2 text-xs"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <!-- Description -->
        <div>
          <label class="block text-[11px] font-medium text-muted mb-0.5">Description</label>
          <input
            v-model="field.description"
            type="text"
            placeholder="e.g. Unique identifier of user"
            class="w-full px-2 py-1 text-xs rounded border border-default bg-neutral-100 dark:bg-neutral-800 text-highlighted focus:outline-none focus:ring-1 focus:ring-primary"
          >
        </div>

        <!-- Format (for Strings) -->
        <div v-if="field.type === 'string'">
          <label class="block text-[11px] font-medium text-muted mb-0.5">Format</label>
          <select
            v-model="field.format"
            class="w-full px-2 py-1 text-xs rounded border border-default bg-neutral-100 dark:bg-neutral-800 text-highlighted focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option
              v-for="opt in FORMAT_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Min & Max (for Numbers) -->
        <div
          v-if="field.type === 'number' || field.type === 'integer'"
          class="flex items-center gap-2"
        >
          <div class="flex-1">
            <label class="block text-[11px] font-medium text-muted mb-0.5">Minimum</label>
            <input
              v-model.number="field.minimum"
              type="number"
              placeholder="0"
              class="w-full px-2 py-1 text-xs font-mono rounded border border-default bg-neutral-100 dark:bg-neutral-800 text-highlighted focus:outline-none"
            >
          </div>
          <div class="flex-1">
            <label class="block text-[11px] font-medium text-muted mb-0.5">Maximum</label>
            <input
              v-model.number="field.maximum"
              type="number"
              placeholder="100"
              class="w-full px-2 py-1 text-xs font-mono rounded border border-default bg-neutral-100 dark:bg-neutral-800 text-highlighted focus:outline-none"
            >
          </div>
        </div>

        <!-- Min & Max Length (for Strings) -->
        <div
          v-if="field.type === 'string'"
          class="flex items-center gap-2"
        >
          <div class="flex-1">
            <label class="block text-[11px] font-medium text-muted mb-0.5">Min Length</label>
            <input
              v-model.number="field.minLength"
              type="number"
              min="0"
              placeholder="0"
              class="w-full px-2 py-1 text-xs font-mono rounded border border-default bg-neutral-100 dark:bg-neutral-800 text-highlighted focus:outline-none"
            >
          </div>
          <div class="flex-1">
            <label class="block text-[11px] font-medium text-muted mb-0.5">Max Length</label>
            <input
              v-model.number="field.maxLength"
              type="number"
              min="0"
              placeholder="255"
              class="w-full px-2 py-1 text-xs font-mono rounded border border-default bg-neutral-100 dark:bg-neutral-800 text-highlighted focus:outline-none"
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Recursive Nested Properties (When Object) -->
    <div
      v-if="isExpanded && field.type === 'object'"
      class="pl-4 sm:pl-6 border-l-2 border-default/70 space-y-2 mt-1"
    >
      <SchemaFieldNode
        v-for="(_, index) in (field.properties || [])"
        :key="field.properties![index]!.id"
        v-model="field.properties![index]!"
        :depth="depth + 1"
        @remove="removeProperty"
      />

      <div class="pt-1">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-primary font-medium rounded-lg border border-dashed border-primary/40 hover:bg-primary/5 transition-colors"
          @click="addProperty"
        >
          <UIcon
            name="i-lucide-plus"
            class="size-3.5"
          />
          Add Property to {{ field.name }}
        </button>
      </div>
    </div>

    <!-- Recursive Nested Properties (When Array of Objects) -->
    <div
      v-if="isExpanded && field.type === 'array' && field.itemType === 'object'"
      class="pl-4 sm:pl-6 border-l-2 border-default/70 space-y-2 mt-1"
    >
      <div class="text-[11px] font-medium text-muted">
        Array Item Object Properties:
      </div>
      <SchemaFieldNode
        v-for="(_, index) in (field.itemProperties || [])"
        :key="field.itemProperties![index]!.id"
        v-model="field.itemProperties![index]!"
        :depth="depth + 1"
        @remove="removeArrayItemProperty"
      />

      <div class="pt-1">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-primary font-medium rounded-lg border border-dashed border-primary/40 hover:bg-primary/5 transition-colors"
          @click="addArrayItemProperty"
        >
          <UIcon
            name="i-lucide-plus"
            class="size-3.5"
          />
          Add Property to Array Item
        </button>
      </div>
    </div>
  </div>
</template>
