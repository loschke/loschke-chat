"use client"

import { ImageIcon, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Formula {
  id: string
  name: { de: string; en: string } | string
  templateText: string
  usageType: string
  mediumType: string
  previewUrl: string
  exampleCount: number
  legend?: { de: string; en: string } | string
  variables?: unknown[]
  tags?: { de: string[]; en: string[] }
}

interface FormulaCardProps {
  formula: Formula
  name: string
  isSelected?: boolean
  onClick: () => void
}

export function FormulaCard({ formula, name, isSelected, onClick }: FormulaCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group rounded-xl overflow-hidden border text-left transition-all card-interactive",
        isSelected && "ring-2 ring-primary border-primary"
      )}
    >
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {formula.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={formula.previewUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="size-8 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-medium line-clamp-1 leading-snug">{name}</p>
        <div className="flex items-center gap-1 mt-1">
          <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground truncate">
            <Layers className="size-2" />
            {formula.mediumType}
          </span>
          <span className="text-[9px] text-muted-foreground">
            {formula.exampleCount} Bilder
          </span>
        </div>
      </div>
    </button>
  )
}
