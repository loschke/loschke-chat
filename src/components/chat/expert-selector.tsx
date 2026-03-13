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

  if (isLoading || experts.length === 0) return null

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {experts.map((expert) => {
        const Icon = ICON_MAP[expert.icon ?? ""] ?? Bot
        const isSelected = selectedExpertId === expert.id

        return (
          <button
            key={expert.id}
            type="button"
            onClick={() => onExpertSelect(isSelected ? null : expert.id)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-4" />
            <span>{expert.name}</span>
          </button>
        )
      })}
    </div>
  )
}
