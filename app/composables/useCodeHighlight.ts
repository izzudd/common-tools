import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

let highlighterPromise: Promise<HighlighterCore> | null = null

export function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [
        import('shiki/themes/github-dark-dimmed.mjs'),
        import('shiki/themes/github-light.mjs')
      ],
      langs: [
        import('shiki/langs/typescript.mjs'),
        import('shiki/langs/python.mjs'),
        import('shiki/langs/go.mjs'),
        import('shiki/langs/json.mjs'),
        import('shiki/langs/html.mjs'),
        import('shiki/langs/css.mjs')
      ],
      engine: createJavaScriptRegexEngine()
    })
  }
  return highlighterPromise
}

export function useCodeHighlight() {
  const colorMode = useColorMode()
  const theme = computed(() => colorMode.value === 'dark' ? 'github-dark-dimmed' : 'github-light')

  async function highlightCode(code: string, lang: string): Promise<string> {
    if (!code) return ''
    try {
      const highlighter = await getHighlighter()
      return highlighter.codeToHtml(code, {
        lang,
        theme: theme.value
      })
    } catch {
      // Fallback: escaped plain text
      const escaped = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      return `<pre class="shiki"><code>${escaped}</code></pre>`
    }
  }

  return {
    theme,
    highlightCode
  }
}
