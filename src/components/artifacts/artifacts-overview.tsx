"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  FileText,
  GalleryHorizontalEnd,
  Code,
  ClipboardCheck,
  MessageSquareMore,
  Image as ImageIcon,
  Layers,
  Loader2,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface ArtifactItem {
  id: string
  title: string
  type: string
  language: string | null
  version: number
  chatId: string
  chatTitle: string | null
  fileUrl: string | null
  createdAt: string
  updatedAt: string
}

const TYPE_ICON_MAP: Record<string, LucideIcon> = {
  html: GalleryHorizontalEnd,
  code: Code,
  quiz: ClipboardCheck,
  review: MessageSquareMore,
  image: ImageIcon,
  markdown: FileText,
}

const TYPE_LABELS: Record<string, string> = {
  markdown: "Dokument",
  html: "HTML",
  code: "Code",
  quiz: "Quiz",
  review: "Review",
  image: "Bild",
}

const TYPE_COLORS: Record<string, string> = {
  markdown: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  html: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  code: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  quiz: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  review: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  image: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
}

const FILTER_TYPES = [
  { value: null, label: "Alle" },
  { value: "markdown", label: "Dokumente" },
  { value: "html", label: "HTML" },
  { value: "code", label: "Code" },
  { value: "image", label: "Bilder" },
  { value: "quiz", label: "Quiz" },
  { value: "review", label: "Review" },
] as const

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Gerade eben"
  if (diffMins < 60) return `Vor ${diffMins} Min.`
  if (diffHours < 24) return `Vor ${diffHours} Std.`
  if (diffDays < 7) return `Vor ${diffDays} Tag${diffDays > 1 ? "en" : ""}`
  return date.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })
}

export function ArtifactsOverview() {
  const router = useRouter()
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)

  const fetchArtifacts = useCallback(async (type: string | null, newOffset: number, append: boolean) => {
    const params = new URLSearchParams({ limit: "24", offset: String(newOffset) })
    if (type) params.set("type", type)

    try {
      const res = await fetch(`/api/artifacts?${params}`)
      if (res.ok) {
        const data = await res.json()
        setArtifacts((prev) => append ? [...prev, ...data.artifacts] : data.artifacts)
        setHasMore(data.hasMore)
      }
    } catch {
      // Silently fail
    }
  }, [])

  useEffect(() => {
    setIsLoading(true)
    setOffset(0)
    fetchArtifacts(typeFilter, 0, false).finally(() => setIsLoading(false))
  }, [typeFilter, fetchArtifacts])

  const loadMore = useCallback(async () => {
    const newOffset = offset + 24
    setIsLoadingMore(true)
    setOffset(newOffset)
    await fetchArtifacts(typeFilter, newOffset, true)
    setIsLoadingMore(false)
  }, [offset, typeFilter, fetchArtifacts])

  const handleCardClick = useCallback((artifact: ArtifactItem) => {
    router.push(`/c/${artifact.chatId}?artifact=${artifact.id}`)
  }, [router])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Layers className="size-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Meine Dateien</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Type Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {FILTER_TYPES.map((ft) => (
            <Button
              key={ft.value ?? "all"}
              variant={typeFilter === ft.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(ft.value)}
              className="h-8"
            >
              {ft.label}
            </Button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg border bg-muted" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && artifacts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Layers className="mb-3 size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {typeFilter
                ? `Keine ${TYPE_LABELS[typeFilter] ?? typeFilter}-Artifacts vorhanden.`
                : "Noch keine Artifacts erstellt."}
            </p>
          </div>
        )}

        {/* Grid */}
        {!isLoading && artifacts.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {artifacts.map((artifact) => {
                const Icon = TYPE_ICON_MAP[artifact.type] ?? FileText
                return (
                  <button
                    key={artifact.id}
                    type="button"
                    onClick={() => handleCardClick(artifact)}
                    className="card-interactive flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
                  >
                    {/* Image thumbnail */}
                    {artifact.type === "image" && artifact.fileUrl && (
                      <div className="mb-1 w-full overflow-hidden rounded-md bg-muted">
                        <img
                          src={artifact.fileUrl}
                          alt={artifact.title}
                          className="aspect-video w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="flex w-full items-center gap-2">
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium">{artifact.title}</span>
                    </div>
                    {artifact.chatTitle && (
                      <p className="truncate text-xs text-muted-foreground">
                        {artifact.chatTitle}
                      </p>
                    )}
                    <div className="flex w-full items-center justify-between text-xs">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${TYPE_COLORS[artifact.type] ?? "bg-muted text-muted-foreground"}`}>
                        {TYPE_LABELS[artifact.type] ?? artifact.type}
                      </span>
                      <span className="text-muted-foreground/70">{formatRelativeDate(artifact.createdAt)}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <><Loader2 className="mr-2 size-4 animate-spin" /> Laden...</>
                  ) : (
                    "Mehr laden"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
