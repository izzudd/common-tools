<script setup lang="ts">
// Page-isolated state
const rawJson = ref('')
const parsedData = ref<unknown | null>(null)
const errorMessage = ref<string | null>(null)
const activeView = ref<'split' | 'tree'>('split')

const sampleData = `{
  "api": {
    "version": "v2",
    "endpoint": "https://api.example.com/data",
    "status": 200,
    "cached": false
  },
  "user": {
    "id": 1042,
    "name": "Alex Mercer",
    "email": "alex.mercer@devpocket.internal",
    "verified": true,
    "roles": ["developer", "admin"],
    "preferences": {
      "theme": "dark",
      "notifications": {
        "email": true,
        "slack": false
      }
    }
  },
  "records": [
    { "id": 1, "action": "login", "timestamp": 1728200000, "meta": null },
    { "id": 2, "action": "update_key", "timestamp": 1728203600, "meta": { "ip": "127.0.0.1" } }
  ]
}`

function loadSample() {
  rawJson.value = sampleData
  parseInput()
}

function clearAll() {
  rawJson.value = ''
  parsedData.value = null
  errorMessage.value = null
}

function parseInput() {
  errorMessage.value = null
  const input = rawJson.value.trim()

  if (!input) {
    parsedData.value = null
    return
  }

  try {
    parsedData.value = JSON.parse(input)
  } catch (err: unknown) {
    parsedData.value = null
    if (err instanceof Error) {
      errorMessage.value = err.message
    } else {
      errorMessage.value = 'Invalid JSON syntax'
    }
  }
}

watch(rawJson, () => {
  parseInput()
})

const formattedJson = computed(() => {
  if (parsedData.value === null) return ''
  try {
    return JSON.stringify(parsedData.value, null, 2)
  } catch {
    return ''
  }
})
</script>

<template>
  <div class="space-y-6">
    <ToolHeader
      title="JSON Visualizer & Tree Inspector"
      description="Interactive node hierarchy explorer for complex JSON payloads with collapsible keys, search filters, and path navigation."
      icon="i-lucide-folder-tree"
      category="JSON Tools"
      :copy-text="formattedJson"
      :disable-copy="!parsedData"
      @load-sample="loadSample"
      @clear="clearAll"
    >
      <template #actions>
        <div class="flex items-center gap-2">
          <div class="inline-flex rounded-lg border border-default p-0.5 bg-neutral-100 dark:bg-neutral-900">
            <button
              type="button"
              class="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
              :class="activeView === 'split' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
              @click="activeView = 'split'"
            >
              Split View
            </button>
            <button
              type="button"
              class="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
              :class="activeView === 'tree' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-highlighted'"
              @click="activeView = 'tree'"
            >
              Tree Only
            </button>
          </div>
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
          Unable to build tree view
        </p>
        <p class="font-mono text-[11px] opacity-90">
          {{ errorMessage }}
        </p>
      </div>
    </div>

    <!-- Main Content Area -->
    <div
      class="grid gap-4"
      :class="activeView === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'"
    >
      <!-- Raw JSON Input (hidden in tree-only mode for focus) -->
      <div
        v-if="activeView === 'split'"
        class="flex flex-col rounded-xl border border-default bg-neutral-100/30 dark:bg-neutral-900/40 overflow-hidden"
      >
        <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-medium text-muted">
          <span class="flex items-center gap-2">
            <UIcon
              name="i-lucide-edit-3"
              class="size-4"
            />
            JSON Source
          </span>
          <span class="font-mono text-[11px]">{{ rawJson.length }} chars</span>
        </div>
        <div class="p-2 flex-1">
          <textarea
            v-model="rawJson"
            placeholder="Paste JSON to generate interactive tree..."
            class="w-full h-[550px] p-3 bg-transparent font-mono text-xs focus:outline-none resize-y text-highlighted"
            spellcheck="false"
          />
        </div>
      </div>

      <!-- Tree Visualizer Canvas -->
      <div class="flex flex-col min-h-[550px]">
        <template v-if="parsedData !== null">
          <JsonTreeViewer
            :data="parsedData"
            class="flex-1"
          />
        </template>
        <div
          v-else
          class="flex flex-col items-center justify-center h-full min-h-[350px] p-8 text-center rounded-xl border border-dashed border-default bg-neutral-100/20 dark:bg-neutral-900/20"
        >
          <UIcon
            name="i-lucide-network"
            class="size-12 text-muted/60 mb-3"
          />
          <h3 class="font-semibold text-sm text-highlighted">
            No JSON Data Loaded
          </h3>
          <p class="text-xs text-muted max-w-sm mt-1 mb-4">
            Paste valid JSON on the left or click "Load Sample Data" to explore nodes interactively.
          </p>
          <UButton
            label="Load Sample Data"
            icon="i-lucide-file-text"
            color="primary"
            variant="subtle"
            size="sm"
            @click="loadSample"
          />
        </div>
      </div>
    </div>
  </div>
</template>
