<script setup lang="ts">
useHead({
  title: 'Quoin - Modern Client-Side Developer Utilities',
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'description', content: 'Lean, secure, 100% client-side developer utility web app with zero backend persistence.' },
    { name: 'theme-color', content: '#0a0a0a', media: '(prefers-color-scheme: dark)' },
    { name: 'theme-color', content: '#fafafa', media: '(prefers-color-scheme: light)' }
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'apple-touch-icon', href: '/favicon.svg' }
  ],
  htmlAttrs: {
    lang: 'en',
    class: 'bg-neutral-50 dark:bg-neutral-950'
  },
  bodyAttrs: {
    class: 'bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 antialiased overscroll-none'
  }
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
