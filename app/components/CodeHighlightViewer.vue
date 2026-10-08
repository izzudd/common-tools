<script setup lang="ts">
import { useCodeHighlight } from '~/composables/useCodeHighlight'

const props = withDefaults(
  defineProps<{
    code: string
    lang?: string
    maxHeight?: string
  }>(),
  {
    lang: 'typescript',
    maxHeight: '38rem'
  }
)

const { highlightCode, theme } = useCodeHighlight()
const highlightedHtml = ref<string>('')

async function updateHighlight() {
  if (!props.code) {
    highlightedHtml.value = ''
    return
  }
  highlightedHtml.value = await highlightCode(props.code, props.lang)
}

watch(
  [() => props.code, () => props.lang, theme],
  () => {
    updateHighlight()
  },
  { immediate: true }
)
</script>

<template>
  <div
    class="relative rounded-xl border border-default bg-neutral-100/50 dark:bg-neutral-900/60 overflow-hidden font-mono text-xs"
  >
    <!-- eslint-disable vue/no-v-html -->
    <div
      v-if="highlightedHtml"
      data-shiki-container
      class="overflow-auto p-4 select-text"
      :style="{ maxHeight: props.maxHeight, minHeight: '16rem' }"
      v-html="highlightedHtml"
    />
    <!-- eslint-enable vue/no-v-html -->

    <!-- Fallback raw display while loading initial highlight -->
    <pre
      v-else
      class="overflow-auto p-4 select-text text-highlighted"
      :style="{ maxHeight: props.maxHeight, minHeight: '16rem' }"
    ><code>{{ props.code }}</code></pre>
  </div>
</template>

<style>
[data-shiki-container] pre.shiki {
  background-color: transparent !important;
  margin: 0;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  line-height: 1.5;
  white-space: pre;
}

[data-shiki-container] code {
  font-family: inherit;
}
</style>
