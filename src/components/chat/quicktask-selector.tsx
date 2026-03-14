"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Image,
  Share2,
  CalendarCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import type { SkillField } from "@/lib/ai/skills/discovery"

/** Public quicktask info from API */
export interface QuicktaskPublic {
  slug: string
  name: string
  description: string
  category: string | null
  icon: string | null
  fields: SkillField[]
  outputAsArtifact: boolean
}

const ICON_MAP: Record<string, LucideIcon> = {
  Image,
  Share2,
  CalendarCheck,
  Sparkles,
}

interface QuicktaskSelectorProps {
  onQuicktaskSelect: (quicktask: QuicktaskPublic) => void
}

export function QuicktaskSelector({ onQuicktaskSelect }: QuicktaskSelectorProps) {
  const [quicktasks, setQuicktasks] = useState<QuicktaskPublic[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/skills/quicktasks")
        if (res.ok) {
          const data = await res.json()
          setQuicktasks(data)
        }
      } catch {
        // Non-critical
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const categories = useMemo(() => {
    const cats = new Set<string>()
    for (const q of quicktasks) {
      if (q.category) cats.add(q.category)
    }
    return Array.from(cats).sort()
  }, [quicktasks])

  const filtered = useMemo(
    () =>
      activeCategory
        ? quicktasks.filter((q) => q.category === activeCategory)
        : quicktasks,
    [quicktasks, activeCategory]
  )

  if (isLoading || quicktasks.length === 0) return null

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      {categories.length > 1 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
              activeCategory === null
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Alle
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                activeCategory === cat
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((qt) => {
          const Icon = ICON_MAP[qt.icon ?? ""] ?? Sparkles
          return (
            <button
              key={qt.slug}
              type="button"
              onClick={() => onQuicktaskSelect(qt)}
              className="group flex flex-col items-start gap-2 rounded-xl border p-4 text-left text-sm transition-all hover:border-muted-foreground/25 hover:bg-muted/50"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-foreground">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="font-medium leading-tight">{qt.name}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {qt.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
