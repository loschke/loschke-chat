"use client"

import {
  FileText,
  GalleryHorizontalEnd,
  Loader2,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react"

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  GalleryHorizontalEnd,
}

interface SkillProgressProps {
  label: string
  icon?: string
  isRunning: boolean
}

export function SkillProgress({ label, icon, isRunning }: SkillProgressProps) {
  const Icon = (icon ? ICON_MAP[icon] : null) ?? FileText

  return (
    <div className="mt-3 flex w-full items-center gap-3 rounded-xl border bg-muted/30 p-3 card-elevated">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="size-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {label} wird erstellt
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isRunning ? "Code wird ausgefuehrt..." : "Wird abgeschlossen..."}
        </p>
      </div>
      {isRunning ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
      ) : (
        <CheckCircle2 className="size-4 shrink-0 text-success" />
      )}
    </div>
  )
}
