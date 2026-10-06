// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  ssr: false,

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  // Fully static output (`.output/public`) that Cloudflare serves straight from
  // its assets store — see wrangler.jsonc. Pinned explicitly because a CI
  // environment (Cloudflare Workers Builds) otherwise auto-switches Nitro to the
  // `cloudflare-module` preset, which emits a server entry this app does not want.
  nitro: {
    preset: 'static'
  },

  compatibilityDate: '2026-06-30',

  typescript: {
    strict: true
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
