<script setup lang="ts">
interface Props {
  data: unknown
  keyName?: string | number
  path?: string
  depth?: number
  searchQuery?: string
  defaultExpanded?: boolean
  forceExpandAll?: boolean | null
}

const props = withDefaults(defineProps<Props>(), {
  keyName: undefined,
  path: '$',
  depth: 0,
  searchQuery: '',
  defaultExpanded: true,
  forceExpandAll: null
})

const emit = defineEmits<{
  'copy-path': [path: string]
  'copy-value': [val: string]
}>()

const isExpanded = ref(props.depth < 3 && props.defaultExpanded)

watch(
  () => props.forceExpandAll,
  (val) => {
    if (val !== null) {
      isExpanded.value = val
    }
  }
)

const dataType = computed(() => {
  if (props.data === null) return 'null'
  if (Array.isArray(props.data)) return 'array'
  return typeof props.data
})

const isComplex = computed(() => dataType.value === 'object' || dataType.value === 'array')

const childEntries = computed(() => {
  if (!isComplex.value || props.data === null) return []
  if (Array.isArray(props.data)) {
    return props.data.map((item, index) => ({
      key: index,
      value: item,
      subPath: `${props.path}[${index}]`
    }))
  }
  return Object.entries(props.data as Record<string, unknown>).map(([k, v]) => ({
    key: k,
    value: v,
    subPath: `${props.path}.${k}`
  }))
})

// Quick match test for search filter
const isMatchingSearch = computed(() => {
  if (!props.searchQuery) return true
  const query = props.searchQuery.toLowerCase()
  if (props.keyName !== undefined && String(props.keyName).toLowerCase().includes(query)) {
    return true
  }
  if (!isComplex.value) {
    return String(props.data).toLowerCase().includes(query)
  }
  // Deep search check
  try {
    const jsonStr = JSON.stringify(props.data)
    return jsonStr.toLowerCase().includes(query)
  } catch {
    return false
  }
})

// Auto expand when there's an active search query that matches deep
watch(
  () => props.searchQuery,
  (newQuery) => {
    if (newQuery && isMatchingSearch.value && isComplex.value) {
      isExpanded.value = true
    }
  }
)

function toggleExpand() {
  if (isComplex.value) {
    isExpanded.value = !isExpanded.value
  }
}

function handleCopyPath() {
  emit('copy-path', props.path)
}

function handleCopyValue() {
  const valStr = typeof props.data === 'string' ? props.data : JSON.stringify(props.data, null, 2)
  emit('copy-value', valStr)
}
</script>

<template>
  <div
    v-if="isMatchingSearch"
    class="font-mono text-xs leading-relaxed select-text"
  >
    <div
      class="group flex items-center gap-1.5 py-0.5 px-1.5 rounded hover:bg-neutral-500/10 transition-colors w-fit max-w-full"
    >
      <!-- Expand/Collapse toggle for arrays & objects -->
      <button
        v-if="isComplex"
        type="button"
        class="size-4 shrink-0 inline-flex items-center justify-center rounded text-neutral-400 hover:text-neutral-200 transition-transform"
        :class="{ 'rotate-90': isExpanded }"
        @click.stop="toggleExpand"
      >
        <UIcon
          name="i-lucide-chevron-right"
          class="size-3.5"
        />
      </button>
      <span
        v-else
        class="size-4 shrink-0 inline-block"
      />

      <!-- Key Name -->
      <span
        v-if="keyName !== undefined"
        class="text-neutral-500 dark:text-neutral-400 font-medium shrink-0 cursor-pointer hover:underline"
        title="Click to copy path"
        @click.stop="handleCopyPath"
      >
        "{{ keyName }}":
      </span>

      <!-- Value Rendering by Type -->
      <template v-if="dataType === 'string'">
        <span class="text-emerald-600 dark:text-emerald-400 break-all">
          "{{ data }}"
        </span>
      </template>

      <template v-else-if="dataType === 'number'">
        <span class="text-sky-600 dark:text-sky-400 font-semibold">
          {{ data }}
        </span>
      </template>

      <template v-else-if="dataType === 'boolean'">
        <span class="text-amber-600 dark:text-amber-400 font-semibold">
          {{ data }}
        </span>
      </template>

      <template v-else-if="dataType === 'null'">
        <span class="text-rose-600 dark:text-rose-400 italic">
          null
        </span>
      </template>

      <template v-else-if="dataType === 'array'">
        <span class="text-neutral-400">[</span>
        <button
          v-if="!isExpanded"
          type="button"
          class="px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] rounded hover:bg-neutral-300 dark:hover:bg-neutral-700 transition"
          @click.stop="toggleExpand"
        >
          {{ (data as unknown[]).length }} items
        </button>
        <span
          v-if="!isExpanded"
          class="text-neutral-400"
        >]</span>
      </template>

      <template v-else-if="dataType === 'object'">
        <span class="text-neutral-400">{</span>
        <button
          v-if="!isExpanded"
          type="button"
          class="px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] rounded hover:bg-neutral-300 dark:hover:bg-neutral-700 transition"
          @click.stop="toggleExpand"
        >
          {{ Object.keys(data as object).length }} keys
        </button>
        <span
          v-if="!isExpanded"
          class="text-neutral-400"
        >}</span>
      </template>

      <!-- Hover quick action buttons -->
      <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ms-2">
        <button
          type="button"
          class="text-[10px] px-1 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          title="Copy JSON path"
          @click.stop="handleCopyPath"
        >
          path
        </button>
        <button
          type="button"
          class="text-[10px] px-1 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          title="Copy node value"
          @click.stop="handleCopyValue"
        >
          copy
        </button>
      </div>
    </div>

    <!-- Children Nodes (if expanded) -->
    <div
      v-if="isComplex && isExpanded"
      class="border-l border-neutral-200 dark:border-neutral-800 ml-3.5 pl-2 mt-0.5 space-y-0.5"
    >
      <JsonTreeNode
        v-for="child in childEntries"
        :key="String(child.key)"
        :data="child.value"
        :key-name="child.key"
        :path="child.subPath"
        :depth="depth + 1"
        :search-query="searchQuery"
        :force-expand-all="forceExpandAll"
        @copy-path="emit('copy-path', $event)"
        @copy-value="emit('copy-value', $event)"
      />
      <div class="text-neutral-400 pl-1 py-0.5">
        {{ dataType === 'array' ? ']' : '}' }}
      </div>
    </div>
  </div>
</template>
