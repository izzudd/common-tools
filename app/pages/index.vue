<script setup lang="ts">
import { TOOL_CATEGORIES, ALL_TOOLS } from '~/config/tools'
import { usePinnedTools } from '~/composables/usePinnedTools'

const searchQuery = ref('')
const selectedCategory = ref<string>('all')
const { pinnedToolIds, isPinned, togglePin } = usePinnedTools()
const toast = useToast()

function handleTogglePin(e: Event, tool: typeof ALL_TOOLS[number]) {
  e.preventDefault()
  e.stopPropagation()
  const pinned = togglePin(tool.id)
  toast.add({
    title: pinned ? 'Tool Pinned' : 'Tool Unpinned',
    description: pinned
      ? `"${tool.name}" is now pinned to the top of your sidebar.`
      : `"${tool.name}" removed from pinned tools.`,
    color: pinned ? 'primary' : 'neutral',
    icon: pinned ? 'i-lucide-pin' : 'i-lucide-pin-off'
  })
}

const filteredTools = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return ALL_TOOLS.filter((tool) => {
    let matchesCategory = true
    if (selectedCategory.value === 'pinned') {
      matchesCategory = isPinned(tool.id)
    } else if (selectedCategory.value !== 'all') {
      matchesCategory = TOOL_CATEGORIES.find(c => c.id === selectedCategory.value)?.tools.some(t => t.id === tool.id) ?? false
    }

    if (!matchesCategory) return false
    if (!query) return true

    return (
      tool.name.toLowerCase().includes(query)
      || tool.description.toLowerCase().includes(query)
      || tool.keywords.some(k => k.toLowerCase().includes(query))
    )
  })
})
</script>

<template>
  <div class="space-y-8 max-w-6xl mx-auto">
    <!-- Hero Section -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 text-white p-8 md:p-10 shadow-lg border border-neutral-700/60">
      <div class="relative z-10 max-w-2xl space-y-4">
        <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight">
          DevPocket
        </h1>
        <p class="text-neutral-300 text-sm md:text-base leading-relaxed">
          Fast, elegant, and secure browser-based developer utilities. All data transformations happen with zero latency.
        </p>

        <!-- Quick Search -->
        <div class="pt-2 max-w-lg">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Search tools (e.g. format JSON, escape HTML, remove spaces)..."
            size="lg"
            class="w-full bg-neutral-800/80 text-white"
          />
        </div>
      </div>

      <!-- Background decorative pattern -->
      <div class="absolute -right-12 -bottom-12 opacity-10 pointer-events-none">
        <UIcon
          name="i-lucide-braces"
          class="size-72 text-white"
        />
      </div>
    </div>

    <!-- Category Filters -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1">
      <UButton
        label="All Tools"
        :variant="selectedCategory === 'all' ? 'solid' : 'ghost'"
        :color="selectedCategory === 'all' ? 'primary' : 'neutral'"
        size="sm"
        @click="selectedCategory = 'all'"
      />
      <UButton
        v-if="pinnedToolIds.length > 0"
        icon="i-lucide-pin"
        :label="`Pinned (${pinnedToolIds.length})`"
        :variant="selectedCategory === 'pinned' ? 'solid' : 'ghost'"
        :color="selectedCategory === 'pinned' ? 'primary' : 'neutral'"
        size="sm"
        @click="selectedCategory = 'pinned'"
      />
      <UButton
        v-for="cat in TOOL_CATEGORIES"
        :key="cat.id"
        :icon="cat.icon"
        :label="cat.name"
        :variant="selectedCategory === cat.id ? 'solid' : 'ghost'"
        :color="selectedCategory === cat.id ? 'primary' : 'neutral'"
        size="sm"
        @click="selectedCategory = cat.id"
      />
    </div>

    <!-- Tools Grid -->
    <div
      v-if="filteredTools.length > 0"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <NuxtLink
        v-for="tool in filteredTools"
        :key="tool.id"
        :to="tool.path"
        class="group flex flex-col justify-between p-5 rounded-xl border border-default bg-neutral-100/50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-900/90 hover:border-primary/50 transition-all hover:shadow-md relative"
      >
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-colors">
              <UIcon
                :name="tool.icon"
                class="size-5"
              />
            </div>
            <div class="flex items-center gap-1.5">
              <UBadge
                v-if="tool.badge"
                color="primary"
                variant="subtle"
                size="xs"
              >
                {{ tool.badge }}
              </UBadge>
              <button
                type="button"
                :title="isPinned(tool.id) ? 'Unpin from sidebar' : 'Pin to sidebar'"
                :aria-label="isPinned(tool.id) ? 'Unpin tool' : 'Pin tool'"
                class="p-1 rounded-md transition-colors"
                :class="isPinned(tool.id) ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'text-muted hover:text-highlighted hover:bg-neutral-200 dark:hover:bg-neutral-800 opacity-60 group-hover:opacity-100'"
                @click="handleTogglePin($event, tool)"
              >
                <UIcon
                  :name="isPinned(tool.id) ? 'i-lucide-pin-off' : 'i-lucide-pin'"
                  class="size-3.5"
                />
              </button>
            </div>
          </div>

          <div>
            <h3 class="font-semibold text-base text-highlighted group-hover:text-primary transition-colors flex items-center gap-1.5">
              {{ tool.name }}
              <UIcon
                name="i-lucide-arrow-right"
                class="size-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
              />
            </h3>
            <p class="text-xs text-muted mt-1 leading-relaxed line-clamp-2">
              {{ tool.description }}
            </p>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-default/50 flex flex-wrap gap-1">
          <span
            v-for="kw in tool.keywords.slice(0, 3)"
            :key="kw"
            class="text-[10px] text-dimmed font-mono px-1.5 py-0.5 rounded bg-neutral-200/50 dark:bg-neutral-800/50"
          >
            #{{ kw }}
          </span>
        </div>
      </NuxtLink>
    </div>

    <div
      v-else
      class="text-center py-12 border border-dashed border-default rounded-xl p-8 space-y-3"
    >
      <UIcon
        name="i-lucide-search-x"
        class="size-10 text-muted mx-auto"
      />
      <h3 class="font-medium text-base text-highlighted">
        No tools matching "{{ searchQuery }}"
      </h3>
      <p class="text-xs text-muted">
        Try a different search term or reset the category filter.
      </p>
      <UButton
        label="Reset Filter"
        color="neutral"
        variant="outline"
        size="sm"
        @click="searchQuery = ''; selectedCategory = 'all'"
      />
    </div>
  </div>
</template>
