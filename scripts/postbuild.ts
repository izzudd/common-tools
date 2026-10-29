/**
 * Post-build pass for the static SPA output (`.output/public`).
 *
 * `ssr: false` means Nuxt ships a bare HTML shell: no <title>, no meta
 * description, no Open Graph tags. Crawlers and social scrapers never run the
 * client bundle, so a shared link renders as a bare URL with no card.
 *
 * This script walks the generated HTML files and injects a static head block
 * per route, plus `robots.txt` and `sitemap.xml`. Copy comes from
 * `app/config/site.ts` and the tool registry, so it can never drift from what
 * the app itself says.
 *
 * Runs as the last step of `bun run build` (and therefore on every Workers
 * Builds deploy).
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { TOOL_CATEGORIES } from '../app/config/tools'
import {
  AUTHOR_NAME,
  AUTHOR_URL,
  HOME_DESCRIPTION,
  HOME_TITLE,
  OG_IMAGE,
  SITE_URL,
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
  toolDescription,
  toolTitle
} from '../app/config/site'

const OUT = '.output/public'

interface RouteMeta {
  title: string
  description: string
  url: string
}

const routes = new Map<string, RouteMeta>()
routes.set('/', { title: HOME_TITLE, description: HOME_DESCRIPTION, url: `${SITE_URL}/` })

for (const category of TOOL_CATEGORIES) {
  for (const tool of category.tools) {
    routes.set(tool.path, {
      title: toolTitle(tool),
      description: toolDescription(tool),
      url: `${SITE_URL}${tool.path}`
    })
  }
}

function esc(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function headBlock(meta: RouteMeta) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': 'Quoin',
    'applicationCategory': 'DeveloperApplication',
    'operatingSystem': 'Any (web browser)',
    'url': meta.url,
    'description': meta.description,
    'image': OG_IMAGE,
    'isAccessibleForFree': true,
    'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
    'author': { '@type': 'Person', 'name': AUTHOR_NAME, 'url': AUTHOR_URL },
    'featureList': TOOL_CATEGORIES.flatMap(category => category.tools.map(tool => tool.name))
  }

  return [
    '<!--quoin:head-->',
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}">`,
    `<meta name="author" content="${esc(AUTHOR_NAME)}">`,
    `<link rel="canonical" href="${esc(meta.url)}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Quoin">',
    `<meta property="og:title" content="${esc(meta.title)}">`,
    `<meta property="og:description" content="${esc(meta.description)}">`,
    `<meta property="og:url" content="${esc(meta.url)}">`,
    `<meta property="og:image" content="${OG_IMAGE}">`,
    '<meta property="og:image:type" content="image/png">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="Quoin — utilities that hold your work in place">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(meta.title)}">`,
    `<meta name="twitter:description" content="${esc(meta.description)}">`,
    `<meta name="twitter:image" content="${OG_IMAGE}">`,
    `<meta name="theme-color" content="${THEME_COLOR_DARK}" media="(prefers-color-scheme: dark)">`,
    `<meta name="theme-color" content="${THEME_COLOR_LIGHT}" media="(prefers-color-scheme: light)">`,
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
    '<link rel="icon" type="image/x-icon" href="/favicon.ico">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
    '<!--/quoin:head-->'
  ].join('')
}

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return htmlFiles(full)
    return full.endsWith('.html') ? [full] : []
  })
}

/** `/json/beautifier/index.html` → `/json/beautifier`, `/index.html` → `/` */
function routeFor(full: string) {
  const rel = '/' + relative(OUT, full).replace(/\\/g, '/')
  return rel === '/index.html' ? '/' : rel.replace(/\/index\.html$/, '')
}

let injected = 0
for (const file of htmlFiles(OUT)) {
  const meta = routes.get(routeFor(file)) ?? { title: HOME_TITLE, description: HOME_DESCRIPTION, url: `${SITE_URL}/` }
  let html = readFileSync(file, 'utf8')

  html = html.replace(/<!--quoin:head-->[\s\S]*?<!--\/quoin:head-->/, '')
  html = html.replace('</head>', `${headBlock(meta)}</head>`)
  html = html.replace(/<html(?![^>]*\blang=)/, '<html lang="en"')

  writeFileSync(file, html)
  injected++
}

const today = new Date().toISOString().slice(0, 10)
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...[...routes.values()].map(
    meta => `  <url><loc>${esc(meta.url)}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${meta.url === `${SITE_URL}/` ? '1.0' : '0.8'}</priority></url>`
  ),
  '</urlset>',
  ''
].join('\n')
writeFileSync(join(OUT, 'sitemap.xml'), sitemap)

writeFileSync(
  join(OUT, 'robots.txt'),
  ['User-agent: *', 'Allow: /', '', `Sitemap: ${SITE_URL}/sitemap.xml`, ''].join('\n')
)

console.log(`[postbuild] head injected into ${injected} html files; ${routes.size} routes in sitemap.xml`)
