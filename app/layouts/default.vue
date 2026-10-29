<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { TOOL_CATEGORIES, ALL_TOOLS } from '~/config/tools'
import { usePinnedTools } from '~/composables/usePinnedTools'
import { useCommandPalette } from '~/composables/useCommandPalette'

const route = useRoute()
const sidebarOpen = ref(true)
const { pinnedToolIds, isPinned, togglePin } = usePinnedTools()
const { open: openCommandPalette } = useCommandPalette()
const toast = useToast()

const currentTool = computed(() => {
  return ALL_TOOLS.find(t => t.path === route.path)
})

function toggleToolPin(toolId: string) {
  const tool = ALL_TOOLS.find(t => t.id === toolId)
  if (!tool) return
  const pinned = togglePin(toolId)
  toast.add({
    title: pinned ? 'Tool Pinned' : 'Tool Unpinned',
    description: pinned
      ? `"${tool.name}" is now pinned to the top of your sidebar.`
      : `"${tool.name}" removed from pinned tools.`,
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
          active: route.path === tool.path,
          toolId: tool.id
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
      active: route.path === tool.path,
      toolId: tool.id
    }))
  }))

  return pinnedCategory
    ? [homeItem, pinnedCategory, ...categoryItems]
    : [homeItem, ...categoryItems]
})
</script>

<template>
  <div class="flex h-dvh bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 overflow-hidden">
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
            <span class="font-bold tracking-tight text-sm text-highlighted">Quoin</span>
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
                'text-xs py-1.5 px-2.5 rounded-lg font-medium transition-colors group/navitem',
                state === 'collapsed' && 'justify-center'
              ],
              childLink: 'text-xs py-1.5 px-2 group/navitem'
            }"
          >
            <!-- Hover pin button for tool items in non-collapsed state -->
            <template #item-trailing="{ item }">
              <button
                v-if="state !== 'collapsed' && (item as any).toolId"
                type="button"
                :title="isPinned((item as any).toolId) ? 'Unpin tool from top' : 'Pin tool to top'"
                :aria-label="isPinned((item as any).toolId) ? 'Unpin tool' : 'Pin tool'"
                class="opacity-0 group-hover/navitem:opacity-100 transition-opacity p-0.5 rounded text-muted hover:text-highlighted focus:opacity-100"
                :class="isPinned((item as any).toolId) ? 'opacity-100 text-primary hover:text-primary/80' : ''"
                @click.prevent.stop="toggleToolPin((item as any).toolId)"
              >
                <UIcon
                  :name="isPinned((item as any).toolId) ? 'i-lucide-pin-off' : 'i-lucide-pin'"
                  class="size-3.5"
                />
              </button>
            </template>
          </UNavigationMenu>
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
    <div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      <!-- Top header bar -->
      <header class="h-14 border-b border-default bg-neutral-100/40 dark:bg-neutral-900/30 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-20">
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
            </template>
          </div>
        </div>

        <!-- Center Quick Search Bar (VS Code style command palette trigger) -->
        <button
          type="button"
          aria-label="Open Command Palette"
          class="flex items-center justify-between gap-2 sm:gap-3 px-2.5 sm:px-3 py-1.5 rounded-lg border border-default bg-neutral-100/70 dark:bg-neutral-900/60 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 hover:border-primary/40 transition-all text-xs text-muted hover:text-highlighted cursor-pointer w-32 sm:w-60 md:w-72 shadow-xs group"
          @click="openCommandPalette"
        >
          <span class="flex items-center gap-2 truncate">
            <UIcon
              name="i-lucide-search"
              class="size-3.5 shrink-0 text-muted group-hover:text-primary transition-colors"
            />
            <span class="truncate hidden sm:inline">Search tools, actions...</span>
            <span class="truncate sm:hidden">Search...</span>
          </span>

          <div class="flex items-center gap-1 shrink-0">
            <UKbd
              value="meta"
              size="sm"
            />
            <UKbd
              value="P"
              size="sm"
            />
          </div>
        </button>

        <div class="flex items-center gap-2">
          <!-- Client-Only Privacy Tag -->
          <UBadge
            color="success"
            variant="subtle"
            size="sm"
            class="hidden md:inline-flex items-center gap-1 font-mono text-[11px]"
          >
            <UIcon
              name="i-lucide-shield-check"
              class="size-3.5"
            />
            Zero Server Persistence
          </UBadge>

          <UButton
            to="https://github.com/izzudd/quoin"
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
      <main class="flex-1 overflow-y-auto overscroll-y-contain">
        <div class="p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <slot />
        </div>
      </main>

      <!-- Command Palette Modal -->
      <CommandPaletteModal />
    </div>
  </div>
</template>
