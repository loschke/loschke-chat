import {
  FileText,
  Code,
  GalleryHorizontalEnd,
  Maximize2,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  Code,
  GalleryHorizontalEnd,
}

interface ArtifactCardProps {
  title: string
  preview: string
  icon?: string
  isActive: boolean
  onClick: () => void
}

export function ArtifactCard({
  title,
  preview,
  icon,
  isActive,
  onClick,
}: ArtifactCardProps) {
  const Icon = (icon ? ICON_MAP[icon] : null) ?? FileText

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group mt-3 flex w-full items-center gap-3 rounded-xl border p-3.5 text-left card-interactive",
        isActive
          ? "border-primary/30 bg-primary/5 card-elevated"
          : "border-border hover:bg-muted/50"
      )}
    >
      <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-xl">
        <Icon className="text-primary size-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        {preview && (
          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
            {preview}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        <span>Oeffnen</span>
        <Maximize2 className="size-3.5" />
      </div>
    </button>
  )
}
