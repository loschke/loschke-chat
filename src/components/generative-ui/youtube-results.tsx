"use client"

import { useState, useCallback } from "react"
import { Copy, Check, ExternalLink, Play } from "lucide-react"
import { cn } from "@/lib/utils"

export interface YouTubeVideo {
  videoId: string
  title: string
  channel: string
  publishedAt: string
  duration?: string
  description?: string
  thumbnailUrl: string
}

interface YouTubeResultsProps {
  query: string
  videos: YouTubeVideo[]
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return ""
  }
}

function VideoCard({ video }: { video: YouTubeVideo }) {
  const [copied, setCopied] = useState(false)
  const url = `https://www.youtube.com/watch?v=${video.videoId}`

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
    },
    [url]
  )

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group grid grid-cols-[140px_1fr] gap-0 rounded-xl overflow-hidden border widget-card hover:brightness-[1.02] dark:hover:brightness-[1.1] transition-all"
    >
      <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : null}
        <div className="relative z-10 flex items-center justify-center size-10 rounded-full bg-red-600/90 group-hover:bg-red-600 transition-colors">
          <Play className="size-4 text-white fill-white ml-0.5" />
        </div>
        {video.duration && (
          <span className="absolute bottom-1 right-1 z-10 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium leading-none text-white tabular-nums">
            {video.duration}
          </span>
        )}
      </div>

      <div className="p-3 min-w-0 flex flex-col justify-center gap-0.5">
        <p className="text-sm font-medium line-clamp-2 leading-snug">
          {video.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground truncate">
            {video.channel}
            {video.publishedAt ? ` · ${formatDate(video.publishedAt)}` : ""}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "shrink-0 inline-flex items-center justify-center size-5 rounded border transition-colors",
              copied
                ? "border-primary text-primary"
                : "border-border/70 text-muted-foreground hover:text-foreground hover:border-border"
            )}
            title="URL kopieren"
          >
            {copied ? (
              <Check className="size-3" />
            ) : (
              <Copy className="size-3" />
            )}
          </button>
        </div>
      </div>
    </a>
  )
}

export function YouTubeResults({ query, videos }: YouTubeResultsProps) {
  if (videos.length === 0) {
    return (
      <div className="mt-3 rounded-xl border border-border/50 bg-muted/30 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Keine Ergebnisse fuer &bdquo;{query}&ldquo;
        </p>
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 px-1">
        <ExternalLink className="size-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {videos.length} Ergebnis{videos.length !== 1 ? "se" : ""} fuer &bdquo;{query}&ldquo;
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {videos.map((video) => (
          <VideoCard key={video.videoId} video={video} />
        ))}
      </div>
    </div>
  )
}

export function YouTubeResultsSkeleton() {
  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 px-1">
        <div className="size-3.5 rounded bg-muted animate-pulse" />
        <div className="h-3 w-32 rounded bg-muted animate-pulse" />
      </div>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="grid grid-cols-[140px_1fr] gap-0 rounded-xl overflow-hidden bg-muted/40 border border-border/50"
        >
          <div className="aspect-video bg-muted animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
