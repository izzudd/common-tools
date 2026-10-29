<script setup lang="ts">
import { ALL_TOOLS } from '~/config/tools'
import {
  AUTHOR_NAME,
  HOME_DESCRIPTION,
  HOME_TITLE,
  OG_IMAGE,
  SITE_URL,
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
  toolDescription,
  toolTitle
} from '~/config/site'

const route = useRoute()
const currentTool = computed(() => ALL_TOOLS.find(tool => tool.path === route.path))

// The static tags baked into the built HTML are what crawlers see; this keeps
// the tab title and card copy live for in-app navigation (`ssr: false`).
useHead(() => ({
  title: currentTool.value ? toolTitle(currentTool.value) : HOME_TITLE,
  meta: [
    {
      name: 'description',
      content: currentTool.value ? toolDescription(currentTool.value) : HOME_DESCRIPTION
    },
    { name: 'theme-color', content: THEME_COLOR_DARK, media: '(prefers-color-scheme: dark)' },
    { name: 'theme-color', content: THEME_COLOR_LIGHT, media: '(prefers-color-scheme: light)' },
    { property: 'og:title', content: currentTool.value ? toolTitle(currentTool.value) : HOME_TITLE },
    { property: 'og:description', content: currentTool.value ? toolDescription(currentTool.value) : HOME_DESCRIPTION },
    { property: 'og:url', content: `${SITE_URL}${route.path}` },
    { property: 'og:image', content: OG_IMAGE }
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
  ],
  htmlAttrs: {
    lang: 'en',
    class: 'bg-neutral-50 dark:bg-neutral-950'
  },
  bodyAttrs: {
    class: 'bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 antialiased overscroll-none'
  }
}))

useSeoMeta({
  author: AUTHOR_NAME
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
