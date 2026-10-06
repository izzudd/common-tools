<script setup lang="ts">
import { useClipboardAction } from '~/composables/useClipboardAction'

const props = defineProps<{
  data: unknown
}>()

const searchQuery = ref('')
const forceExpandAll = ref<boolean | null>(null)
const { copyToClipboard } = useClipboardAction()

function expandAll() {
  forceExpandAll.value = true
  // Reset trigger state next tick to allow manual toggling
  setTimeout(() => {
    forceExpandAll.value = null
  }, 100)
}

function collapseAll() {
  forceExpandAll.value = false
  setTimeout(() => {
    forceExpandAll.value = null
  }, 100)
}

async function handleCopyPath(path: string) {
  await copyToClipboard(path, `Copied path: ${path}`)
}

async function handleCopyValue(val: string) {
  await copyToClipboard(val, 'Copied node value')
}

const nodeStats = computed(() => {
  let objectCount = 0
  let arrayCount = 0
  let primitiveCount = 0

  function count(val: unknown) {
    if (val === null || typeof val !== 'object') {
      primitiveCount++
      return
    }
    if (Array.isArray(val)) {
      arrayCount++
      for (const item of val) count(item)
    } else {
      objectCount++
      for (const item of Object.values(val)) count(item)
    }
  }

  try {
    count(props.data)
  } catch {
    // Large recursion safeguard
  }

  return { objectCount, arrayCount, primitiveCount }
})
</script>

<template>
  <div class="flex flex-col h-full bg-neutral-900/40 dark:bg-neutral-950/60 rounded-xl border border-default overflow-hidden">
    <!-- Tree viewer toolbar -->
    <div class="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-default bg-neutral-100/50 dark:bg-neutral-900/50">
      <div class="flex items-center gap-2 flex-1 min-w-[200px]">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Filter keys or values..."
          size="sm"
          class="w-full max-w-xs"
        />
        <UBadge
          v-if="searchQuery"
          color="neutral"
          variant="subtle"
          size="xs"
        >
          Filtering
        </UBadge>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-unfold-vertical"
          label="Expand All"
          size="xs"
          variant="outline"
          color="neutral"
          @click="expandAll"
        />
        <UButton
          icon="i-lucide-fold-vertical"
          label="Collapse All"
          size="xs"
          variant="outline"
          color="neutral"
          @click="collapseAll"
        />
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="flex items-center gap-4 px-3 py-1.5 bg-neutral-100/30 dark:bg-neutral-900/30 text-[11px] text-muted border-b border-default">
      <span>Objects: <strong class="text-highlighted">{{ nodeStats.objectCount }}</strong></span>
      <span>Arrays: <strong class="text-highlighted">{{ nodeStats.arrayCount }}</strong></span>
      <span>Values: <strong class="text-highlighted">{{ nodeStats.primitiveCount }}</strong></span>
      <span class="ms-auto italic text-dimmed hidden sm:inline">Tip: Click keys to copy path</span>
    </div>

    <!-- Tree nodes render area -->
    <div class="flex-1 overflow-auto p-4 font-mono text-xs max-h-[600px] select-text">
      <JsonTreeNode
        :data="data"
        path="$"
        :search-query="searchQuery"
        :force-expand-all="forceExpandAll"
        @copy-path="handleCopyPath"
        @copy-value="handleCopyValue"
      />
    </div>
  </div>
</template>
