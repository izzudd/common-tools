<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { TOOL_CATEGORIES, ALL_TOOLS } from '~/config/tools'
import { usePinnedTools } from '~/composables/usePinnedTools'

const route = useRoute()
const sidebarOpen = ref(true)
const { pinnedToolIds, isPinned, togglePin } = usePinnedTools()
const toast = useToast()

const currentTool = computed(() => {
  return ALL_TOOLS.find(t => t.path === route.path)
})

function handleToggleCurrentToolPin() {
  if (!currentTool.value) return
  const pinned = togglePin(currentTool.value.id)
  toast.add({
    title: pinned ? 'Tool Pinned' : 'Tool Unpinned',
    description: pinned
      ? `"${currentTool.value.name}" is now pinned to the top of your sidebar.`
      : `"${currentTool.value.name}" removed from pinned tools.`,
    color: pinned ? 'primary' : 'neutral',
    icon: pinned ? 'i-lucide-pin' : 'i-lucide-pin-off'
  })
}

// Build navigation menu items with Pinned Tools at the top
const navItems = computed<NavigationMenuItem[]>(() => {
  const homeItem: NavigationMenuItem = {
    label: 'Overview & Hub',
    icon: 'i-lucide-layout-grid',
    to: '/',
    active: route.path === '/'
  }

  // Find all pinned tools from catalog preserving user pin order
  const pinnedList = pinnedToolIds.value
    .map(id => ALL_TOOLS.find(tool => tool.id === id))
    .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool))

  const pinnedCategory: NavigationMenuItem | null = pinnedList.length > 0
    ? {
        label: 'Pinned Tools',
        icon: 'i-lucide-pin',
        badge: pinnedList.length.toString(),
        defaultOpen: true,
        children: pinnedList.map(tool => ({
          label: tool.name,
          icon: tool.icon,
          to: tool.path,
          active: route.path === tool.path
        }))
      }
    : null

  const categoryItems: NavigationMenuItem[] = TOOL_CATEGORIES.map(category => ({
    label: category.name,
    icon: category.icon,
    defaultOpen: true,
    children: category.tools.map(tool => ({
      label: tool.name,
      icon: tool.icon,
      to: tool.path,
      active: route.path === tool.path
    }))
  }))

  return pinnedCategory
    ? [homeItem, pinnedCategory, ...categoryItems]
    : [homeItem, ...categoryItems]
})
</script>

<template>
  <div class="flex min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
    <!-- Collapsible Sidebar -->
    <USidebar
      v-model:open="sidebarOpen"
      collapsible="icon"
      rail
      :ui="{
        container: 'h-full border-r border-default bg-neutral-100/60 dark:bg-neutral-900/40 backdrop-blur-md',
        inner: 'divide-transparent',
        body: 'py-2 px-2 group-data-[state=collapsed]/sidebar:px-1'
      }"
    >
      <template #header="{ state }">
        <NuxtLink
          to="/"
          class="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-500/10 transition-colors w-full overflow-hidden"
          :class="state === 'collapsed' ? 'justify-center px-0' : ''"
        >
          <div class="size-8 rounded-lg bg-primary flex items-center justify-center text-white shrink-0 shadow-sm font-bold text-base">
            <UIcon
              name="i-lucide-cpu"
              class="size-5"
            />
          </div>
          <div
            v-if="state !== 'collapsed'"
            class="flex flex-col truncate"
          >
            <span class="font-bold tracking-tight text-sm text-highlighted">DevPocket</span>
            <span class="text-[10px] text-muted font-medium uppercase tracking-wider">Client Utilities</span>
          </div>
        </NuxtLink>
      </template>

      <template #default="{ state }">
        <div class="space-y-4">
          <UNavigationMenu
            :key="state"
            :items="navItems"
            :collapsed="state === 'collapsed'"
            :tooltip="true"
            :popover="true"
            orientation="vertical"
            :ui="{
              link: [
                'text-xs py-1.5 px-2.5 rounded-lg font-medium transition-colors',
                state === 'collapsed' && 'justify-center'
              ],
              childLink: 'text-xs py-1.5 px-2'
            }"
          />
        </div>
      </template>

      <template #footer="{ state }">
        <div
          v-if="state !== 'collapsed'"
          class="p-2.5 border-t border-default w-full text-xs text-muted text-center"
        >
          <span>Made with magic by </span>
          <NuxtLink
            to="https://izzudd.my.id"
            target="_blank"
            class="font-semibold text-highlighted hover:text-primary transition-colors underline underline-offset-2"
          >
            Izzudd
          </NuxtLink>
        </div>
        <div
          v-else
          class="flex items-center justify-center p-2 border-t border-default w-full"
        >
          <UTooltip text="Made with magic by Izzudd">
            <NuxtLink
              to="https://izzudd.my.id"
              target="_blank"
              aria-label="Made with magic by Izzudd"
              class="p-1 rounded-md text-muted hover:text-primary transition-colors flex items-center justify-center"
            >
              <UIcon
                name="i-lucide-sparkles"
                class="size-4"
              />
            </NuxtLink>
          </UTooltip>
        </div>
      </template>
    </USidebar>

    <!-- App Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Top header bar -->
      <header class="h-14 border-b border-default bg-neutral-100/40 dark:bg-neutral-900/30 backdrop-blur-md px-4 flex items-center justify-between shrink-0 sticky top-0 z-20">
        <div class="flex items-center gap-3">
          <UButton
            icon="i-lucide-panel-left"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Toggle sidebar"
            @click="sidebarOpen = !sidebarOpen"
          />

          <!-- Breadcrumb indicator -->
          <div class="flex items-center gap-2 text-xs">
            <NuxtLink
              to="/"
              class="text-muted hover:text-highlighted transition-colors"
            >
              Home
            </NuxtLink>
            <template v-if="currentTool">
              <UIcon
                name="i-lucide-chevron-right"
                class="size-3 text-muted"
              />
              <span class="font-semibold text-highlighted">
                {{ currentTool.name }}
              </span>
              <UButton
                :icon="isPinned(currentTool.id) ? 'i-lucide-pin-off' : 'i-lucide-pin'"
                :color="isPinned(currentTool.id) ? 'primary' : 'neutral'"
                :variant="isPinned(currentTool.id) ? 'subtle' : 'ghost'"
                size="xs"
                :title="isPinned(currentTool.id) ? 'Unpin tool from sidebar' : 'Pin tool to top of sidebar'"
                :aria-label="isPinned(currentTool.id) ? 'Unpin tool' : 'Pin tool'"
                @click="handleToggleCurrentToolPin"
              />
            </template>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Client-Only Privacy Tag -->
          <UBadge
            color="success"
            variant="subtle"
            size="sm"
            class="hidden sm:inline-flex items-center gap-1 font-mono text-[11px]"
          >
            <UIcon
              name="i-lucide-shield-check"
              class="size-3.5"
            />
            Zero Server Persistence
          </UBadge>

          <UButton
            to="https://github.com"
            target="_blank"
            icon="i-simple-icons-github"
            aria-label="GitHub Repository"
            color="neutral"
            variant="ghost"
            size="sm"
          />

          <UColorModeButton size="sm" />
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        <slot />
      </main>
    </div>
  </div>
</template>
