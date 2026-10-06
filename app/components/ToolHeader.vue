<script setup lang="ts">
import { useClipboardAction } from '~/composables/useClipboardAction'

const props = withDefaults(
  defineProps<{
    title: string
    description: string
    icon?: string
    badge?: string
    category?: string
    copyText?: string
    disableCopy?: boolean
  }>(),
  {
    icon: 'i-lucide-wrench',
    badge: undefined,
    category: undefined,
    copyText: '',
    disableCopy: false
  }
)

const emit = defineEmits<{
  'load-sample': []
  'clear': []
  'copy': []
}>()

const { copied, copyToClipboard } = useClipboardAction()

async function handleCopy() {
  emit('copy')
  if (props.copyText) {
    await copyToClipboard(props.copyText)
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-5 border-b border-default mb-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 mt-0.5">
          <UIcon
            :name="icon"
            class="size-6"
          />
        </div>
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="text-xl md:text-2xl font-bold tracking-tight text-highlighted">
              {{ title }}
            </h1>
            <UBadge
              v-if="category"
              color="neutral"
              variant="subtle"
              size="sm"
            >
              {{ category }}
            </UBadge>
            <UBadge
              v-if="badge"
              color="primary"
              variant="subtle"
              size="sm"
            >
              {{ badge }}
            </UBadge>
          </div>
          <p class="text-sm text-muted mt-1 max-w-2xl">
            {{ description }}
          </p>
        </div>
      </div>

      <!-- Quick Utility Controls -->
      <div class="flex items-center gap-2 flex-wrap self-end sm:self-auto">
        <UButton
          icon="i-lucide-file-text"
          label="Load Sample Data"
          color="neutral"
          variant="outline"
          size="sm"
          @click="emit('load-sample')"
        />

        <UButton
          icon="i-lucide-trash-2"
          label="Clear"
          color="neutral"
          variant="outline"
          size="sm"
          @click="emit('clear')"
        />

        <UButton
          :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
          :label="copied ? 'Copied!' : 'Copy to Clipboard'"
          :color="copied ? 'success' : 'primary'"
          variant="solid"
          size="sm"
          :disabled="disableCopy"
          @click="handleCopy"
        />
      </div>
    </div>

    <!-- Extra controls slot -->
    <div
      v-if="$slots.actions"
      class="flex flex-wrap items-center justify-between gap-3 pt-2"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
