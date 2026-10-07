import type { ToolCategory } from '~/types/tools'

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'json',
    name: 'JSON Tools',
    description: 'Format, validate, visualize, inspect, and transform JSON payloads',
    icon: 'i-lucide-braces',
    tools: [
      {
        id: 'json-beautifier',
        name: 'Beautifier & Minifier',
        description: 'Format unreadable JSON with indentation or compress into single line',
        path: '/json/beautifier',
        icon: 'i-lucide-indent-decrease',
        badge: 'Core',
        keywords: ['json', 'format', 'beautify', 'minify', 'compress', 'indent', 'sort']
      },
      {
        id: 'json-visualizer',
        name: 'Interactive Visualizer',
        description: 'Explore hierarchical JSON objects with collapsible tree nodes & search',
        path: '/json/visualizer',
        icon: 'i-lucide-folder-tree',
        badge: 'Interactive',
        keywords: ['json', 'tree', 'visualizer', 'node', 'hierarchy', 'inspect', 'explore']
      },
      {
        id: 'json-stringify',
        name: 'Stringify & JSONify',
        description: 'Escape JSON into inline quoted strings and parse escaped strings back',
        path: '/json/stringify',
        icon: 'i-lucide-quote',
        keywords: ['json', 'stringify', 'escape', 'unescape', 'serialize', 'deserialize', 'parse']
      }
    ]
  },
  {
    id: 'string',
    name: 'String Tools',
    description: 'Escape, unescape, sanitize, format, and manipulate raw text strings',
    icon: 'i-lucide-type',
    tools: [
      {
        id: 'string-escaper',
        name: 'Escaper & Unescaper',
        description: 'Escape/unescape HTML entities, URL params, Regex specials, C-slashes, Base64',
        path: '/string/escaper',
        icon: 'i-lucide-binary',
        badge: 'Multi-mode',
        keywords: ['string', 'escape', 'unescape', 'html', 'url', 'uri', 'regex', 'slash', 'base64']
      },
      {
        id: 'string-whitespace',
        name: 'Whitespace Remover',
        description: 'Strip tabs, collapse spaces, trim edges, and sanitize line breaks',
        path: '/string/whitespace',
        icon: 'i-lucide-scissors',
        keywords: ['string', 'whitespace', 'trim', 'strip', 'spaces', 'tabs', 'lines', 'clean']
      },
      {
        id: 'string-slugify',
        name: 'Slugify & URL Normalizer',
        description: 'Generate clean, URL-safe slugs with customizable separators, transliteration, and case formatting',
        path: '/string/slugify',
        icon: 'i-lucide-link',
        badge: 'SEO',
        keywords: ['string', 'slug', 'slugify', 'url', 'seo', 'permalink', 'kebab-case', 'normalize', 'clean-url']
      }
    ]
  }
]

export const ALL_TOOLS = TOOL_CATEGORIES.flatMap(category => category.tools)

export function findToolByPath(path: string) {
  return ALL_TOOLS.find(t => t.path === path)
}
