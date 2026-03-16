"use client"

import { useCallback, useEffect, useState } from "react"
import { FileSpreadsheetIcon, FileTextIcon, ImageIcon, PresentationIcon, XIcon } from "lucide-react"

interface FilePart {
  type: string
  mediaType?: unknown
  url?: unknown
  data?: unknown
  filename?: unknown
}

interface MessageAttachmentsProps {
  messageId: string
  parts: FilePart[]
}

/** Groups file parts into an image grid + document chips */
export function MessageAttachments({ messageId, parts }: MessageAttachmentsProps) {
  if (parts.length === 0) return null

  const images = parts.filter((p) => (p.mediaType as string | undefined)?.startsWith("image/"))
  const docs = parts.filter((p) => !(p.mediaType as string | undefined)?.startsWith("image/"))

  return (
    <>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((part, i) => (
            <ImageAttachment
              key={`${messageId}-img-${i}`}
              url={resolveUrl(part)}
              filename={part.filename as string | undefined}
              count={images.length}
            />
          ))}
        </div>
      )}
      {docs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {docs.map((part, i) => (
            <DocAttachment
              key={`${messageId}-doc-${i}`}
              url={resolveUrl(part)}
              mediaType={part.mediaType as string | undefined}
              filename={part.filename as string | undefined}
            />
          ))}
        </div>
      )}
    </>
  )
}

function resolveUrl(part: FilePart): string | undefined {
  return (part.url as string | undefined) ?? (typeof part.data === "string" ? part.data : undefined)
}

function ImageAttachment({ url, filename, count }: { url?: string; filename?: string; count: number }) {
  const [lightbox, setLightbox] = useState(false)

  const close = useCallback(() => setLightbox(false), [])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [lightbox, close])

  if (!url) return null

  // Scale thumbnails based on count: single image larger, multiple smaller
  const sizeClass = count === 1
    ? "max-h-64 max-w-full"
    : count === 2
      ? "max-h-48 max-w-[calc(50%-0.25rem)]"
      : "max-h-36 max-w-[calc(33.333%-0.333rem)]"

  return (
    <>
      <button
        type="button"
        className={`overflow-hidden rounded-xl border card-elevated cursor-zoom-in ${sizeClass}`}
        onClick={() => setLightbox(true)}
      >
        <img
          src={url}
          alt={filename || "Bild"}
          className="size-full object-cover"
        />
      </button>
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-zoom-out"
          onClick={close}
        >
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            onClick={close}
          >
            <XIcon className="size-5" />
          </button>
          <img
            src={url}
            alt={filename || "Bild"}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

function DocAttachment({ url, mediaType, filename }: { url?: string; mediaType?: string; filename?: string }) {
  if (!url) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2 text-sm hover:bg-muted transition-colors card-elevated"
    >
      {mediaType === "application/pdf" ? (
        <FileTextIcon className="size-4 text-red-500" />
      ) : mediaType?.includes("wordprocessingml") ? (
        <FileTextIcon className="size-4 text-blue-500" />
      ) : mediaType?.includes("spreadsheetml") ? (
        <FileSpreadsheetIcon className="size-4 text-green-600" />
      ) : mediaType?.includes("presentationml") ? (
        <PresentationIcon className="size-4 text-orange-500" />
      ) : (
        <ImageIcon className="size-4 text-muted-foreground" />
      )}
      <span className="truncate max-w-48">{filename || "Datei"}</span>
    </a>
  )
}
