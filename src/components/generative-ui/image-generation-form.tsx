"use client"

import { useState } from "react"
import { Palette, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const ASPECT_RATIOS = [
  { value: "1:1", label: "Quadrat", icon: "□", w: 1, h: 1 },
  { value: "16:9", label: "Quer", icon: "▬", w: 16, h: 9 },
  { value: "9:16", label: "Hoch", icon: "▮", w: 9, h: 16 },
  { value: "3:2", label: "Foto quer", icon: "▬", w: 3, h: 2 },
  { value: "2:3", label: "Foto hoch", icon: "▮", w: 2, h: 3 },
  { value: "4:3", label: "Klassisch", icon: "▬", w: 4, h: 3 },
  { value: "3:4", label: "Portrait", icon: "▮", w: 3, h: 4 },
  { value: "4:5", label: "Instagram", icon: "▮", w: 4, h: 5 },
  { value: "21:9", label: "Cinematic", icon: "▬", w: 21, h: 9 },
] as const

interface ImageGenerationFormProps {
  formulaName?: string
  formulaTemplate?: string
  promptOnlyMode?: boolean
  onSubmit: (data: { description: string; aspectRatio: string }) => void
  isReadOnly?: boolean
  previousData?: { description: string; aspectRatio: string }
}

export function ImageGenerationForm({
  formulaName,
  formulaTemplate,
  promptOnlyMode,
  onSubmit,
  isReadOnly,
  previousData,
}: ImageGenerationFormProps) {
  const [description, setDescription] = useState(previousData?.description ?? "")
  const [aspectRatio, setAspectRatio] = useState(previousData?.aspectRatio ?? "1:1")

  const handleSubmit = () => {
    if (!description.trim()) return
    onSubmit({ description: description.trim(), aspectRatio })
  }

  return (
    <div className="mt-3 rounded-xl border widget-card p-4 space-y-4 max-w-lg">
      {/* Formula context */}
      {formulaName && (
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
          <Palette className="size-4 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium">{formulaName}</p>
            {formulaTemplate && (
              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 font-mono">
                {formulaTemplate}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="text-xs font-medium text-foreground mb-1.5 block">
          {formulaName ? "Beschreibe deine Variante" : "Was moechtest du erstellen?"}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={formulaName
            ? "z.B. Alpenpanorama bei Sonnenuntergang, dramatische Wolken, warme Toene..."
            : "Beschreibe das Bild das du dir vorstellst..."
          }
          rows={3}
          disabled={isReadOnly}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 resize-none"
        />
      </div>

      {/* Aspect Ratio — hidden in prompt-only mode */}
      {!promptOnlyMode && <div>
        <label className="text-xs font-medium text-foreground mb-1.5 block">
          Seitenverhaeltnis
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.value}
              type="button"
              disabled={isReadOnly}
              onClick={() => setAspectRatio(ratio.value)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors",
                aspectRatio === ratio.value
                  ? "border-primary bg-primary/5 text-primary font-medium"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                isReadOnly && "opacity-60 cursor-default"
              )}
            >
              {/* Visual ratio indicator */}
              <div className="flex items-center justify-center size-5">
                <div
                  className={cn(
                    "border rounded-[2px]",
                    aspectRatio === ratio.value ? "border-primary" : "border-muted-foreground/40"
                  )}
                  style={{
                    width: `${Math.min(20, ratio.w * 3)}px`,
                    height: `${Math.min(20, ratio.h * 3)}px`,
                  }}
                />
              </div>
              <span>{ratio.label}</span>
              <span className="ml-auto text-[10px] opacity-60">{ratio.value}</span>
            </button>
          ))}
        </div>
      </div>}

      {/* Submit */}
      {!isReadOnly && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!description.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ImageIcon className="size-4" />
          {promptOnlyMode ? "Prompts erstellen" : "Bild generieren"}
        </button>
      )}
    </div>
  )
}
