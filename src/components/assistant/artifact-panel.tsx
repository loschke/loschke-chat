"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { X, Eye, Pencil, Copy, Download, Check, FileText, Printer, Code, Save, ClipboardCheck, Maximize2, Minimize2, LinkIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MessageResponse } from "@/components/ai-elements/message"
import type { ArtifactContentType } from "@/types/artifact"
import type { QuizDefinition, QuizResults } from "@/types/quiz"
import type { SectionFeedback } from "@/types/review"
import { languageToExtension } from "./artifact-utils"

const HtmlPreview = dynamic(
  () => import("./html-preview").then((mod) => ({ default: mod.HtmlPreview })),
  { ssr: false }
)
const CodePreview = dynamic(
  () => import("./code-preview").then((mod) => ({ default: mod.CodePreview })),
  { ssr: false }
)
const QuizRenderer = dynamic(
  () => import("./quiz-renderer").then((mod) => ({ default: mod.QuizRenderer })),
  { ssr: false }
)
const ReviewRenderer = dynamic(
  () => import("./review-renderer").then((mod) => ({ default: mod.ReviewRenderer })),
  { ssr: false }
)
const ImagePreview = dynamic(
  () => import("./image-preview").then((mod) => ({ default: mod.ImagePreview })),
  { ssr: false }
)
const ArtifactEditor = dynamic(
  () => import("./artifact-editor").then((mod) => ({ default: mod.ArtifactEditor })),
  { ssr: false }
)

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

interface ArtifactPanelProps {
  content: string
  title: string
  contentType: ArtifactContentType
  language?: string
  isStreaming: boolean
  artifactId?: string
  version?: number
  reviewMode?: boolean
  onClose: () => void
  onSave?: (content: string) => void
  fullscreen?: boolean
  onToggleFullscreen?: () => void
  /** Callback when a quiz is completed — passes updated quiz + results for back-channel */
  onQuizComplete?: (quiz: QuizDefinition, results: QuizResults) => void
  /** Callback when a review is completed — passes feedback for back-channel */
  onReviewComplete?: (feedback: SectionFeedback[]) => void
}

/** Count source entries in a "## Quellen" section at the end of content. */
function countSources(content: string): number {
  const quellenMatch = content.match(/^##\s+Quellen\s*$/im)
  if (!quellenMatch || quellenMatch.index === undefined) return 0
  const quellenSection = content.slice(quellenMatch.index)
  const entries = quellenSection.match(/^\s*\d+\.\s+/gm)
  return entries ? entries.length : 0
}

function SourcesBadge({ content, contentType, viewRef }: {
  content: string
  contentType: ArtifactContentType
  viewRef: React.RefObject<HTMLDivElement | null>
}) {
  const sourceCount = useMemo(() => {
    if (contentType !== "markdown" && contentType !== "html") return 0
    return countSources(content)
  }, [content, contentType])
  if (sourceCount === 0) return null

  return (
    <button
      className="shrink-0 flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 text-[10px] font-medium hover:bg-blue-500/20 transition-colors"
      onClick={() => {
        const headings = viewRef.current?.querySelectorAll("h2")
        const quellenHeading = Array.from(headings ?? []).find(h => /quellen/i.test(h.textContent ?? ""))
        quellenHeading?.scrollIntoView({ behavior: "smooth" })
      }}
      title="Zum Quellenverzeichnis scrollen"
    >
      <LinkIcon className="size-3" />
      {sourceCount} {sourceCount === 1 ? "Quelle" : "Quellen"}
    </button>
  )
}

function sanitizeFilename(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "dokument"
  )
}

export function ArtifactPanel({
  content,
  title,
  contentType,
  language,
  isStreaming,
  artifactId,
  version,
  reviewMode: initialReviewMode,
  onClose,
  onSave,
  onQuizComplete,
  onReviewComplete,
  fullscreen,
  onToggleFullscreen,
}: ArtifactPanelProps) {
  const [mode, setMode] = useState<"view" | "review" | "edit">(initialReviewMode ? "review" : "view")
  const [editContent, setEditContent] = useState(content)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const viewRef = useRef<HTMLDivElement>(null)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const printIframesRef = useRef<HTMLIFrameElement[]>([])

  // Cleanup timeouts and print iframes on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
      for (const iframe of printIframesRef.current) {
        iframe.remove()
      }
      printIframesRef.current = []
    }
  }, [])

  // ESC exits fullscreen
  useEffect(() => {
    if (!fullscreen || !onToggleFullscreen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onToggleFullscreen()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [fullscreen, onToggleFullscreen])

  const handleCopy = useCallback(async () => {
    const textToCopy = mode === "edit" ? editContent : content
    try {
      await navigator.clipboard.writeText(textToCopy)
    } catch {
      // Clipboard API may not be available in insecure contexts
      return
    }
    setCopied(true)
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current)
    }
    copyTimeoutRef.current = setTimeout(() => {
      setCopied(false)
      copyTimeoutRef.current = null
    }, 2000)
  }, [mode, editContent, content])

  const handleSave = useCallback(async () => {
    if (!onSave || saving) return
    setSaving(true)
    try {
      await onSave(editContent)
    } finally {
      setSaving(false)
    }
  }, [onSave, editContent, saving])

  const handleDownloadFile = useCallback(() => {
    const textToDownload = mode === "edit" ? editContent : content
    let ext: string
    let mimeType: string

    if (contentType === "html") {
      ext = ".html"
      mimeType = "text/html"
    } else if (contentType === "code") {
      ext = languageToExtension(language)
      mimeType = "text/plain"
    } else {
      ext = ".md"
      mimeType = "text/markdown"
    }

    const blob = new Blob([textToDownload], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${sanitizeFilename(title)}${ext}`
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }, [mode, editContent, content, title, contentType, language])

  const handleDownloadPdf = useCallback(() => {
    if (contentType === "html") {
      const htmlToPrint = mode === "edit" ? editContent : content
      const iframe = document.createElement("iframe")
      iframe.style.position = "fixed"
      iframe.style.left = "-9999px"
      iframe.style.top = "0"
      iframe.style.width = "0"
      iframe.style.height = "0"
      iframe.setAttribute("sandbox", "allow-modals")
      iframe.srcdoc = htmlToPrint
      printIframesRef.current.push(iframe)

      iframe.onload = () => {
        iframe.contentWindow?.print()
        setTimeout(() => {
          iframe.remove()
          printIframesRef.current = printIframesRef.current.filter((f) => f !== iframe)
        }, 1000)
      }

      document.body.appendChild(iframe)
      return
    }

    // For markdown/code content, render as styled HTML for print
    let htmlContent: string
    if (viewRef.current) {
      htmlContent = viewRef.current.innerHTML
    } else {
      const escaped = (mode === "edit" ? editContent : content)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
      htmlContent = `<pre style="white-space: pre-wrap;">${escaped}</pre>`
    }

    const escapedTitle = escapeHtml(title)
    const printDoc = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${escapedTitle}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    line-height: 1.65;
    color: #1a1a1a;
    max-width: 100%;
  }
  h1, h2, h3, h4, h5, h6 { font-weight: bold; margin: 1em 0 0.5em; page-break-after: avoid; }
  h1 { font-size: 1.5em; }
  h2 { font-size: 1.3em; border-bottom: 1px solid #e5e5e5; padding-bottom: 0.3em; }
  h3 { font-size: 1.1em; }
  p { margin: 0.5em 0; }
  ul, ol { padding-left: 1.5em; margin: 0.5em 0; }
  li { margin: 0.25em 0; }
  code { background: #f5f5f5; padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.85em; font-family: "Cascadia Code", "Fira Code", Consolas, monospace; }
  pre { background: #f5f5f5; padding: 1em; border-radius: 6px; overflow-x: auto; margin: 1em 0; page-break-inside: avoid; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; page-break-inside: avoid; }
  th, td { border: 1px solid #d4d4d4; padding: 0.5em 0.75em; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  blockquote { border-left: 3px solid #d4d4d4; padding-left: 1em; margin: 1em 0; color: #555; }
  a { color: #2563eb; text-decoration: underline; }
  hr { border: none; border-top: 1px solid #d4d4d4; margin: 1.5em 0; }
  img { max-width: 100%; }
</style>
</head><body>${htmlContent}</body></html>`

    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.left = "-9999px"
    iframe.style.top = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.setAttribute("sandbox", "allow-modals")
    iframe.srcdoc = printDoc
    printIframesRef.current.push(iframe)

    iframe.onload = () => {
      iframe.contentWindow?.print()
      setTimeout(() => {
        iframe.remove()
        printIframesRef.current = printIframesRef.current.filter((f) => f !== iframe)
      }, 1000)
    }

    document.body.appendChild(iframe)
  }, [mode, editContent, content, title, contentType])

  const handleToggleMode = useCallback(() => {
    if (mode === "edit") {
      setMode("view")
    } else {
      setEditContent(content)
      setMode("edit")
    }
  }, [mode, content])

  const editorLanguage =
    contentType === "html"
      ? "html"
      : contentType === "code"
        ? language ?? "text"
        : "markdown"

  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-2 overflow-hidden">
          {isStreaming && (
            <span className="bg-primary size-2 shrink-0 animate-pulse rounded-full" />
          )}
          <span className="truncate text-sm font-semibold">{title}</span>
          {version != null && version > 1 && (
            <span className="shrink-0 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">
              v{version}
            </span>
          )}
          <SourcesBadge content={content} contentType={contentType} viewRef={viewRef} />
        </div>
        <div className="flex items-center gap-1">
          {/* Hide edit/copy for quiz, image, and audio types */}
          {contentType !== "quiz" && contentType !== "image" && contentType !== "audio" && (
            <>
              {mode === "edit" && onSave && artifactId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 md:size-7"
                  onClick={handleSave}
                  disabled={saving}
                  title="Speichern"
                >
                  <Save className="size-3.5" />
                </Button>
              )}
              {/* Three-way toggle for markdown with review capability */}
              {contentType === "markdown" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`size-7 ${mode === "review" ? "bg-muted" : ""}`}
                  onClick={() => setMode(mode === "review" ? "view" : "review")}
                  title={mode === "review" ? "Vorschau" : "Review-Modus"}
                >
                  <ClipboardCheck className="size-3.5" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 md:size-7"
                onClick={handleToggleMode}
                title={mode === "edit" ? "Vorschau" : "Bearbeiten"}
              >
                {mode === "edit" ? (
                  <Eye className="size-3.5" />
                ) : (
                  <Pencil className="size-3.5" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 md:size-7"
                onClick={handleCopy}
                title="Kopieren"
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 md:size-7"
                    title="Herunterladen"
                  >
                    <Download className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDownloadFile}>
                    {contentType === "code" ? (
                      <Code className="size-3.5" />
                    ) : contentType === "html" ? (
                      <Code className="size-3.5" />
                    ) : (
                      <FileText className="size-3.5" />
                    )}
                    {contentType === "html"
                      ? "HTML (.html)"
                      : contentType === "code"
                        ? `Code (${languageToExtension(language)})`
                        : "Markdown (.md)"}
                  </DropdownMenuItem>
                  {contentType !== "code" && (
                    <DropdownMenuItem onClick={handleDownloadPdf}>
                      <Printer className="size-3.5" />
                      Als PDF drucken
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          {/* Image-only download button */}
          {contentType === "image" && !isStreaming && content && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 md:size-7"
              onClick={async () => {
                let url: string | undefined
                try {
                  const gallery = JSON.parse(content) as Array<{ url: string; role: string }>
                  const latest = [...gallery].reverse().find((e) => e.role === "generated" || e.role === "iteration")
                  url = latest?.url ?? gallery[0]?.url
                } catch {
                  if (content.startsWith("data:") || content.startsWith("http")) {
                    url = content
                  }
                }
                if (!url) return
                try {
                  const res = await fetch(url)
                  const blob = await res.blob()
                  const blobUrl = URL.createObjectURL(blob)
                  const link = document.createElement("a")
                  link.href = blobUrl
                  link.download = `${sanitizeFilename(title)}.png`
                  document.body.append(link)
                  link.click()
                  link.remove()
                  URL.revokeObjectURL(blobUrl)
                } catch {
                  window.open(url, "_blank")
                }
              }}
              title="Herunterladen"
            >
              <Download className="size-3.5" />
            </Button>
          )}
          {onToggleFullscreen && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 md:size-7 max-md:hidden"
              onClick={onToggleFullscreen}
              title={fullscreen ? "Verkleinern" : "Vollbild"}
            >
              {fullscreen ? (
                <Minimize2 className="size-3.5" />
              ) : (
                <Maximize2 className="size-3.5" />
              )}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 md:size-7"
            onClick={onClose}
          >
            <X className="size-4 md:size-3.5" />
            <span className="sr-only">Schliessen</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {contentType === "image" ? (
          <ImagePreview content={content} title={title} isStreaming={isStreaming} />
        ) : contentType === "quiz" ? (
          (() => {
            let quizData: QuizDefinition | null = null
            try { quizData = JSON.parse(content) as QuizDefinition } catch { /* invalid JSON */ }
            if (!quizData) return <div className="p-6 text-sm text-muted-foreground">Quiz-Daten konnten nicht geladen werden.</div>
            return (
              <QuizRenderer
                quiz={quizData}
                artifactId={artifactId}
                isStreaming={isStreaming}
                onComplete={onQuizComplete}
              />
            )
          })()
        ) : mode === "review" && contentType === "markdown" ? (
          <ReviewRenderer
            content={content}
            title={title}
            isStreaming={isStreaming}
            onComplete={onReviewComplete}
          />
        ) : mode === "view" ? (
          contentType === "html" ? (
            isStreaming ? (
              <StreamingPlaceholder title={title} message="HTML wird generiert…" muted />
            ) : (
              <HtmlPreview html={content} />
            )
          ) : contentType === "code" ? (
            <CodePreview code={content} language={language} />
          ) : (
            isStreaming && !content ? (
            <StreamingPlaceholder title={title} />
          ) : (
            <div ref={viewRef} className="p-6">
              <MessageResponse className="chat-prose">
                {content}
              </MessageResponse>
            </div>
          )
          )
        ) : (
          <ArtifactEditor
            value={editContent}
            onChange={setEditContent}
            language={editorLanguage}
          />
        )}
      </div>
    </div>
  )
}

function StreamingPlaceholder({ title, message = "Inhalt wird generiert…", muted = false }: { title: string; message?: string; muted?: boolean }) {
  return (
    <div className={`flex h-full flex-col items-center justify-center gap-4 p-8 text-muted-foreground ${muted ? "bg-muted" : ""}`}>
      <div className="flex items-center gap-2">
        <span className="size-2 animate-pulse rounded-full bg-primary" />
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <div className="w-full max-w-md space-y-3">
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted-foreground/20" />
        <div className="h-3 w-full animate-pulse rounded bg-muted-foreground/20 [animation-delay:150ms]" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted-foreground/20 [animation-delay:300ms]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted-foreground/20 [animation-delay:450ms]" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-muted-foreground/20 [animation-delay:600ms]" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground/60">{message}</p>
    </div>
  )
}
