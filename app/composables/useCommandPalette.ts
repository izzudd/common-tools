export const isCommandPaletteOpen = ref(false)

export function useCommandPalette() {
  function open() {
    isCommandPaletteOpen.value = true
  }

  function close() {
    isCommandPaletteOpen.value = false
  }

  function toggle() {
    isCommandPaletteOpen.value = !isCommandPaletteOpen.value
  }

  return {
    isOpen: isCommandPaletteOpen,
    open,
    close,
    toggle
  }
}
