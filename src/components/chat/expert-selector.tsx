"use client"

import { useEffect, useState } from "react"
import {
  Sparkles,
  Code,
  Search,
  BarChart3,
  BookOpen,
  PenLine,
  Bot,
  Check,
  type LucideIcon,
} from "lucide-react"
import type { ExpertPublic } from "@/types/expert"

/** Map icon name strings to Lucide components */
const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Code,
  Search,
  BarChart3,
  BookOpen,
  PenLine,
  Bot,
}

interface ExpertSelectorProps {
  selectedExpertId: string | null
  onExpertSelect: (expertId: string | null) => void
}

export function ExpertSelector({ selectedExpertId, onExpertSelect }: ExpertSelectorProps) {
  const [experts, setExperts] = useState<ExpertPublic[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadExperts() {
      try {
        const res = await fetch("/api/experts")
        if (res.ok) {
          const data = await res.json()
          setExperts(data)
        }
      } catch {
        // Non-critical — selector just won't show
      } finally {
        setIsLoading(false)
      }
    }
    loadExperts()
  }, [])

  if (isLoading) {
    return (
      <div className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border bg-muted/30"
          />
        ))}
      </div>
    )
  }

  if (experts.length === 0) return null

  return (
    <div className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
      {experts.map((expert) => {
        const Icon = ICON_MAP[expert.icon ?? ""] ?? Bot
        const isSelected = selectedExpertId === expert.id

        return (
          <button
            key={expert.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onExpertSelect(isSelected ? null : expert.id)}
            className={`group relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left text-sm transition-all ${
              isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "hover:border-muted-foreground/25 hover:bg-muted/50"
            }`}
          >
            {isSelected && (
              <div className="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-primary">
                <Check className="size-3 text-primary-foreground" />
              </div>
            )}
            <div className={`flex size-8 items-center justify-center rounded-lg ${
              isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground group-hover:text-foreground"
            }`}>
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="font-medium leading-tight">{expert.name}</div>
              <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {expert.description}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
