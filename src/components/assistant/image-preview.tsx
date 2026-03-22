"use client"

import { useState, useMemo } from "react"
import { ArrowRight, Download, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { parseImageGallery } from "@/lib/ai/image-gallery"

interface ImagePreviewProps {
  /** JSON-stringified ImageGalleryEntry[] or a single image URL (legacy) */
  content: string
  title: string
  isStreaming: boolean
}

export function ImagePreview({ content, title, isStreaming }: ImagePreviewProps) {
  const { inputEntries, generatedEntries } = useMemo(() => {
    const gallery = parseImageGallery(content)
    return {
      inputEntries: gallery.filter((e) => e.role === "input"),
      generatedEntries: gallery.filter((e) => e.role === "generated" || e.role === "iteration"),
    }
  }, [content])

  const [activeIndex, setActiveIndex] = useState<number>(-1) // -1 = latest

  const activeEntry = activeIndex >= 0 && activeIndex < generatedEntries.length
    ? generatedEntries[activeIndex]
    : generatedEntries[generatedEntries.length - 1]

  if (isStreaming) {
    return <ImageStreamingPlaceholder title={title} />
  }

  if (inputEntries.length === 0 && generatedEntries.length === 0) {
    return <ImageLoadingPlaceholder title={title} />
  }

  return (
    <div className="flex h-full flex-col">
      {/* Input images (for combining) */}
      {inputEntries.length > 0 && (
        <div className="border-b bg-muted/30 px-4 py-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Quellbilder</p>
          <div className="flex items-center gap-2">
            {inputEntries.map((entry, i) => (
              <div
                key={i}
                className="size-14 shrink-0 overflow-hidden rounded-md border bg-background"
              >
                <img
                  src={entry.url}
                  alt={`Quelle ${i + 1}`}
                  className="size-full object-cover"
                />
              </div>
            ))}
            <ArrowRight className="mx-1 size-4 shrink-0 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Main image */}
      <div className="flex flex-1 items-center justify-center overflow-auto bg-muted/10 p-4">
        {activeEntry ? (
          <img
            src={activeEntry.url}
            alt={title}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        ) : (
          <p className="text-sm text-muted-foreground">Kein Bild verfügbar</p>
        )}
      </div>

      {/* Timeline (multiple generated versions) */}
      {generatedEntries.length > 1 && (
        <div className="border-t bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {generatedEntries.map((entry, i) => {
              const isActive = activeIndex === -1
                ? i === generatedEntries.length - 1
                : i === activeIndex
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={`relative size-12 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                    isActive
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-transparent hover:border-muted-foreground/30"
                  }`}
                >
                  <img
                    src={entry.url}
                    alt={`Version ${i + 1}`}
                    className="size-full object-cover"
                  />
                  <span className="absolute bottom-0 right-0 rounded-tl bg-background/80 px-1 text-[9px] font-medium">
                    v{i + 1}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom toolbar: info + download */}
      {activeEntry && (
        <div className="flex items-center justify-end gap-1 border-t px-3 py-2">
          {activeEntry.prompt && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7" title="Prompt anzeigen">
                  <Info className="size-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="max-w-sm">
                <p className="text-xs text-muted-foreground">{activeEntry.prompt}</p>
              </PopoverContent>
            </Popover>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Bild herunterladen"
            onClick={async () => {
              const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "bild"}.png`
              try {
                const res = await fetch(activeEntry.url)
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const link = document.createElement("a")
                link.href = url
                link.download = filename
                document.body.append(link)
                link.click()
                link.remove()
                URL.revokeObjectURL(url)
              } catch {
                // Fallback: open in new tab
                window.open(activeEntry.url, "_blank")
              }
            }}
          >
            <Download className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

function ImageLoadingPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
      <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
      <p className="text-xs">{title} wird geladen...</p>
    </div>
  )
}

function ImageStreamingPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-muted p-8 text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="size-2 animate-pulse rounded-full bg-primary" />
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      {/* Image skeleton */}
      <div className="flex aspect-square w-full max-w-xs items-center justify-center rounded-lg bg-muted-foreground/10">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 animate-pulse rounded-full bg-muted-foreground/20" />
          <div className="h-2 w-24 animate-pulse rounded bg-muted-foreground/20" />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground/60">Bild wird generiert...</p>
    </div>
  )
}
