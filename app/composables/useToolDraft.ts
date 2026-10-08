import type { Ref } from 'vue'

const STORAGE_PREFIX = 'devpocket:draft:'

/**
 * Creates a reactive state synchronized with localStorage.
 * Automatically restores on initialization and persists changes with debounce.
 */
export function useToolDraft<T>(
  toolId: string,
  initialFactory: () => T
): {
  state: Ref<T>
  clearDraft: () => void
  resetToInitial: () => void
} {
  const storageKey = `${STORAGE_PREFIX}${toolId}`
  const initialValue = initialFactory()
  const state = ref<T>(initialValue) as Ref<T>

  // Restore from localStorage if in browser environment
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (stored !== null) {
        state.value = JSON.parse(stored) as T
      }
    } catch {
      // If parsing fails or storage restricted, fallback silently to initial
    }
  }

  // Debounced auto-save to localStorage
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  watch(
    state,
    (newVal) => {
      if (typeof window === 'undefined' || !window.localStorage) return

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(() => {
        try {
          if (newVal === null || newVal === undefined) {
            window.localStorage.removeItem(storageKey)
          } else {
            window.localStorage.setItem(storageKey, JSON.stringify(newVal))
          }
        } catch {
          // Gracefully ignore QuotaExceededError or disabled cookies/storage
        }
      }, 200)
    },
    { deep: true }
  )

  function clearDraft() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(storageKey)
      } catch {
        // Ignored
      }
    }
    state.value = initialFactory()
  }

  function resetToInitial() {
    clearDraft()
  }

  return {
    state,
    clearDraft,
    resetToInitial
  }
}
