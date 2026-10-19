<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'
import { useCommandPalette } from '~/composables/useCommandPalette'
import { usePinnedTools } from '~/composables/usePinnedTools'
import { ALL_TOOLS, TOOL_CATEGORIES } from '~/config/tools'

const router = useRouter()
const colorMode = useColorMode()
const { isOpen, toggle, close } = useCommandPalette()
const { pinnedToolIds } = usePinnedTools()
const searchTerm = ref('')

// Global shortcuts: Command+P and Command+K (with browser print-dialog interception)
defineShortcuts({
  meta_p: {
    usingInput: true,
    handler: (e) => {
      e?.preventDefault()
      toggle()
    }
  },
  meta_k: {
    usingInput: true,
    handler: (e) => {
      e?.preventDefault()
      toggle()
    }
  }
})

// Build items & groups for the command palette
const groups = computed<CommandPaletteGroup[]>(() => {
  const result: CommandPaletteGroup[] = []

  // 1. Pinned Tools (if any exist)
  const pinnedList = pinnedToolIds.value
    .map(id => ALL_TOOLS.find(t => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))

  if (pinnedList.length > 0) {
    result.push({
      id: 'pinned',
      label: 'Pinned Tools',
      items: pinnedList.map(tool => ({
        id: `pinned-${tool.id}`,
        label: tool.name,
        description: tool.description,
        icon: tool.icon,
        to: tool.path,
        suffix: tool.badge || 'Pinned',
        keywords: tool.keywords.join(' ')
      }))
    })
  }

  // 2. Category Tools
  for (const cat of TOOL_CATEGORIES) {
    result.push({
      id: cat.id,
      label: cat.name,
      items: cat.tools.map(tool => ({
        id: tool.id,
        label: tool.name,
        description: tool.description,
        icon: tool.icon,
        to: tool.path,
        suffix: tool.badge,
        keywords: tool.keywords.join(' ')
      }))
    })
  }

  // 3. Quick Actions
  const actions: CommandPaletteItem[] = [
    {
      id: 'action-home',
      label: 'Go to Overview & Hub',
      description: 'Navigate to DevPocket dashboard and full tool catalog',
      icon: 'i-lucide-layout-grid',
      to: '/',
      keywords: 'home dashboard hub overview start'
    },
    {
      id: 'action-theme',
      label: colorMode.value === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      description: 'Toggle between dark and light color themes',
      icon: colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon',
      onSelect: () => {
        colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
      },
      keywords: 'theme dark light mode color appearance'
    },
    {
      id: 'action-github',
      label: 'Open GitHub Repository',
      description: 'View DevPocket source code and contribute on GitHub',
      icon: 'i-simple-icons-github',
      to: 'https://github.com/izzudd/common-tools',
      target: '_blank',
      keywords: 'github repo source code repository star git'
    }
  ]

  result.push({
    id: 'actions',
    label: 'Quick Actions',
    items: actions
  })

  return result
})

function handleSelect(item: CommandPaletteItem) {
  close()
  searchTerm.value = ''

  if (item.onSelect) {
    item.onSelect(new Event('select'))
  } else if (item.to) {
    if (item.target === '_blank') {
      window.open(item.to as string, '_blank')
    } else {
      router.push(item.to as string)
    }
  }
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :ui="{
      content: 'p-0 overflow-hidden sm:max-w-xl bg-neutral-50 dark:bg-neutral-900 border border-default shadow-2xl rounded-2xl'
    }"
  >
    <template #content>
      <UCommandPalette
        v-model:search-term="searchTerm"
        :groups="groups"
        :fuse="{
          fuseOptions: {
            keys: ['label', 'description', 'suffix', 'keywords'],
            threshold: 0.2
          }
        }"
        placeholder="Type a tool name, category, or action..."
        close
        class="h-96"
        @update:model-value="handleSelect"
      />
    </template>
  </UModal>
</template>
