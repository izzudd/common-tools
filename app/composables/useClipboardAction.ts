export function useClipboardAction() {
  const toast = useToast()
  const copied = ref(false)

  async function copyToClipboard(text: string, label = 'Copied to clipboard') {
    if (!text) {
      toast.add({
        title: 'Nothing to copy',
        description: 'Output is currently empty',
        color: 'warning',
        icon: 'i-lucide-alert-circle'
      })
      return false
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback for older contexts
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }

      copied.value = true
      toast.add({
        title: label,
        color: 'success',
        icon: 'i-lucide-check'
      })

      setTimeout(() => {
        copied.value = false
      }, 2000)

      return true
    } catch {
      toast.add({
        title: 'Failed to copy',
        description: 'Please grant clipboard permissions or copy manually',
        color: 'error',
        icon: 'i-lucide-x-circle'
      })
      return false
    }
  }

  return {
    copied,
    copyToClipboard
  }
}
