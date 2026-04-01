"use client"

import { useEffect, useRef, useState } from "react"
import { createHighlighter, createJavaScriptRegexEngine } from "shiki"
import type { Highlighter } from "shiki"

import { sanitizeShikiHtml } from "@/lib/dom-utils"

interface CodePreviewProps {
  code: string
  language?: string
}

const SHIKI_LANG_MAP: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  yml: "yaml",
  sh: "bash",
  cs: "csharp",
  kt: "kotlin",
  rs: "rust",
}

function normalizeLanguage(lang?: string): string {
  if (!lang) return "text"
  const lower = lang.toLowerCase()
  return SHIKI_LANG_MAP[lower] ?? lower
}

// Singleton highlighter (JS engine, no WASM — CSP-safe)
let highlighterPromise: Promise<Highlighter> | null = null

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      engine: createJavaScriptRegexEngine(),
      themes: ["github-dark"],
      langs: ["javascript", "typescript", "python", "html", "css", "json", "bash", "sql", "java", "go", "rust", "ruby", "php", "swift", "kotlin", "csharp", "xml", "yaml", "markdown", "text"],
    })
  }
  return highlighterPromise
}

export function CodePreview({ code, language }: CodePreviewProps) {
  const [html, setHtml] = useState<string>("")
  const [error, setError] = useState(false)
  const prevRef = useRef({ code: "", language: "" })

  useEffect(() => {
    const lang = normalizeLanguage(language)

    // Skip if nothing changed
    if (prevRef.current.code === code && prevRef.current.language === lang && html) return
    prevRef.current = { code, language: lang }

    let cancelled = false

    async function highlight() {
      try {
        const highlighter = await getHighlighter()

        // Load language dynamically if not bundled
        const loadedLangs = highlighter.getLoadedLanguages()
        if (!loadedLangs.includes(lang) && lang !== "text") {
          try {
            await highlighter.loadLanguage(lang as Parameters<Highlighter["loadLanguage"]>[0])
          } catch {
            // Unknown language — fall back to text
          }
        }

        const result = highlighter.codeToHtml(code, {
          lang: loadedLangs.includes(lang) || lang === "text" ? lang : "text",
          theme: "github-dark",
        })
        if (!cancelled) {
          // Sanitize Shiki HTML to prevent potential XSS when rendering with dangerouslySetInnerHTML
          setHtml(sanitizeShikiHtml(result))
        }
      } catch (err) {
        console.warn("[CodePreview] Shiki error:", err)
        if (!cancelled) setError(true)
      }
    }

    highlight()
    return () => { cancelled = true }
  }, [code, language])

  if (error) {
    return (
      <pre className="m-0 min-h-full overflow-auto bg-[#24292e] p-4 text-sm text-[#e1e4e8]">
        <code>{code}</code>
      </pre>
    )
  }

  if (!html) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
        Syntax-Highlighting wird geladen...
      </div>
    )
  }

  return (
    <div
      className="overflow-auto text-sm [&_pre]:!m-0 [&_pre]:!rounded-none [&_pre]:!p-4 [&_pre]:min-h-full"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
