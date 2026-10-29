import type { ToolItem } from '~/types/tools'

/**
 * Single source of truth for everything that shows up outside the app shell:
 * canonical URLs, social-card copy, and the per-tool <title>/description.
 *
 * Consumed twice — at runtime by `app.vue` (client-side `useHead`) and at build
 * time by `scripts/postbuild.ts`, which bakes the same values into the static
 * HTML that crawlers and social scrapers actually read (the app is `ssr: false`).
 */
export const SITE_URL = 'https://quoin.izzudd.my.id'
export const OG_IMAGE = `${SITE_URL}/og.png`
export const AUTHOR_NAME = 'Daffa Izzuddin'
export const AUTHOR_URL = 'https://izzudd.my.id'

export const HOME_TITLE = 'Quoin — privacy-first developer tools'

export const HOME_DESCRIPTION = 'Developer tools that run 100% in your browser: JSON formatter & schema builder, encoders, slugifier, timezone converter, CSV tables, Markdown. No uploads, no accounts, no telemetry.'

export function toolTitle(tool: Pick<ToolItem, 'name'>) {
  return `${tool.name} — Quoin`
}

export function toolDescription(tool: Pick<ToolItem, 'description'>) {
  return `${tool.description}. Runs entirely in your browser — nothing is uploaded, nothing is tracked.`
}

export const THEME_COLOR_DARK = '#0a0a0a'
export const THEME_COLOR_LIGHT = '#fafafa'
