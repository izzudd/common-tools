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
      },
      {
        id: 'json-schema',
        name: 'Schema Builder & Generator',
        description: 'Build JSON Schema interactively or infer automatically from sample JSON payloads',
        path: '/json/schema',
        icon: 'i-lucide-file-json',
        badge: 'Generator',
        keywords: ['json', 'schema', 'json-schema', 'draft-07', 'types', 'builder', 'generator', 'typescript']
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
      },
      {
        id: 'string-base-encoder',
        name: 'Base Encoder & Decoder',
        description: 'Encode/decode text or convert numbers across Base64, Hex, Binary, Base32, Base58, Base62, Octal',
        path: '/string/base-encoder',
        icon: 'i-lucide-binary',
        badge: 'Multi-Base',
        keywords: ['string', 'base', 'base64', 'base32', 'base58', 'base62', 'binary', 'hex', 'octal', 'encode', 'decode', 'radix', 'convert']
      }
    ]
  },
  {
    id: 'table',
    name: 'Table & CSV Tools',
    description: 'Inspect, edit columns, swap headers, and convert tabular data to SQL, JSONL, and TSV',
    icon: 'i-lucide-table',
    tools: [
      {
        id: 'table-editor',
        name: 'Table & CSV Editor',
        description: 'Review CSV/clipboard data in an interactive table, rename headers, and swap columns',
        path: '/table/editor',
        icon: 'i-lucide-table-properties',
        badge: 'Interactive',
        keywords: ['table', 'csv', 'tsv', 'spreadsheet', 'grid', 'swap', 'header', 'editor', 'excel']
      },
      {
        id: 'table-converter',
        name: 'CSV to SQL & Multi-Format',
        description: 'Convert CSV into SQL (MySQL, PostgreSQL, SQLite, MSSQL), JSONL, TSV, Markdown, and JSON',
        path: '/table/converter',
        icon: 'i-lucide-database',
        badge: 'Multi-Format',
        keywords: ['csv', 'sql', 'mysql', 'postgres', 'sqlite', 'mssql', 'jsonl', 'tsv', 'converter', 'export', 'insert']
      }
    ]
  }
]

export const ALL_TOOLS = TOOL_CATEGORIES.flatMap(category => category.tools)

export function findToolByPath(path: string) {
  return ALL_TOOLS.find(t => t.path === path)
}
