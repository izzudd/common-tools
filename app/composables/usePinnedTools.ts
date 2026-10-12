import { ref, computed } from 'vue'

const STORAGE_KEY = 'devpocket:pinned_tools'

// Global reactive reference shared across components
const pinnedToolIds = ref<string[]>([])
let isInitialized = false

function initPinnedTools() {
  if (isInitialized) return
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          pinnedToolIds.value = parsed.filter(item => typeof item === 'string')
        }
      }
    } catch {
      pinnedToolIds.value = []
    }
  }
  isInitialized = true
}

function saveToStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedToolIds.value))
    } catch {
      // Ignore quota errors
    }
  }
}

export function usePinnedTools() {
  initPinnedTools()

  function isPinned(toolId: string): boolean {
    return pinnedToolIds.value.includes(toolId)
  }

  function togglePin(toolId: string): boolean {
    if (!toolId) return false
    const index = pinnedToolIds.value.indexOf(toolId)
    if (index === -1) {
      pinnedToolIds.value.push(toolId)
    } else {
      pinnedToolIds.value.splice(index, 1)
    }
    saveToStorage()
    return isPinned(toolId)
  }

  function pinTool(toolId: string) {
    if (!toolId || pinnedToolIds.value.includes(toolId)) return
    pinnedToolIds.value.push(toolId)
    saveToStorage()
  }

  function unpinTool(toolId: string) {
    if (!toolId) return
    const index = pinnedToolIds.value.indexOf(toolId)
    if (index !== -1) {
      pinnedToolIds.value.splice(index, 1)
      saveToStorage()
    }
  }

  return {
    pinnedToolIds: computed(() => pinnedToolIds.value),
    isPinned,
    togglePin,
    pinTool,
    unpinTool
  }
}
