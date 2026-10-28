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
        keywords: ['json', 'schema', 'json-schema', 'draft-07', 'builder', 'generator', 'spec']
      },
      {
        id: 'json-type-generator',
        name: 'JSON to Type & Model',
        description: 'Convert JSON payloads into type-safe models: Zod, Pydantic, Python Dataclass/TypedDict, Go Structs, and TypeScript',
        path: '/json/type-generator',
        icon: 'i-lucide-code-xml',
        badge: 'Multi-target',
        keywords: ['json', 'zod', 'pydantic', 'dataclass', 'typeddict', 'python', 'go', 'golang', 'struct', 'typescript', 'types', 'model']
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
      },
      {
        id: 'string-diff',
        name: 'Text & Git Diff Comparator',
        description: 'Compare text and code with split side-by-side or unified top-down view just like GitHub and Git diff',
        path: '/string/diff',
        icon: 'i-lucide-git-compare',
        badge: 'Git Style',
        keywords: ['diff', 'compare', 'git diff', 'text compare', 'side by side', 'unified', 'patch', 'changes', 'merge', 'code diff', 'github']
      }
    ]
  },
  {
    id: 'time',
    name: 'Time Tools',
    description: 'Convert timestamps across time zones, handle daylight saving, and plan meetings across regions',
    icon: 'i-lucide-clock',
    tools: [
      {
        id: 'time-converter',
        name: 'Time Zone Converter',
        description: 'Convert any time, date-time, ISO string, or epoch into WIB, SGT, PT, UTC and 445 more zones with DST handled',
        path: '/time/converter',
        icon: 'i-lucide-globe-2',
        badge: 'DST-aware',
        keywords: ['time', 'timezone', 'time zone', 'converter', 'wib', 'sgt', 'pdt', 'pst', 'est', 'utc', 'utc+7', 'epoch', 'unix', 'iso 8601', 'dst', 'daylight saving', 'overlap', 'meeting', 'jam', 'zona waktu']
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
  },
  {
    id: 'web',
    name: 'Web & HTML Tools',
    description: 'Preview, test, and render HTML & CSS snippets, email templates, and web components',
    icon: 'i-lucide-globe',
    tools: [
      {
        id: 'html-previewer',
        name: 'HTML & Email Previewer',
        description: 'Interactive HTML & CSS sandbox with sandboxed iframe, responsive viewports, and email client simulator',
        path: '/web/html-previewer',
        icon: 'i-lucide-mail',
        badge: 'Playground',
        keywords: ['html', 'css', 'preview', 'email', 'playground', 'iframe', 'sandbox', 'render', 'newsletter', 'template']
      }
    ]
  },
  {
    id: 'markdown',
    name: 'Markdown Tools',
    description: 'Convert Markdown to HTML, HTML to Markdown, Google Docs paste-ready rich text, and format tables',
    icon: 'i-lucide-file-text',
    tools: [
      {
        id: 'markdown-live-editor',
        name: 'Live Preview & Editor',
        description: 'Real-time Markdown editor with instant live preview, formatting toolbar, and 1-click Google Docs / Word export',
        path: '/markdown/live-editor',
        icon: 'i-lucide-eye',
        badge: 'Live Editor',
        keywords: ['markdown', 'preview', 'editor', 'live', 'google docs', 'word', 'rich text', 'wysiwyg', 'write', 'notes']
      },
      {
        id: 'markdown-converter',
        name: 'Markdown & Docs Converter',
        description: 'Convert Markdown to HTML, HTML to Markdown, and Google Docs / Word copy-paste ready rich text',
        path: '/markdown/converter',
        icon: 'i-lucide-file-code',
        badge: 'Rich Text',
        keywords: ['markdown', 'html', 'docs', 'google docs', 'word', 'converter', 'rich text', 'paste', 'clipboard', 'wysiwyg']
      },
      {
        id: 'markdown-formatter',
        name: 'Table Formatter & TOC',
        description: 'Align and beautify markdown tables, generate linked Table of Contents, and strip syntax to plain text',
        path: '/markdown/formatter',
        icon: 'i-lucide-table-properties',
        badge: 'Utilities',
        keywords: ['markdown', 'table', 'toc', 'table of contents', 'formatter', 'align', 'strip', 'clean', 'headings']
      }
    ]
  }
]

export const ALL_TOOLS = TOOL_CATEGORIES.flatMap(category => category.tools)

export function findToolByPath(path: string) {
  return ALL_TOOLS.find(t => t.path === path)
}
