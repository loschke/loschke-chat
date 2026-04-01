"use client"

import { useState } from "react"
import { Pencil, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const ASPECT_RATIOS = [
  { value: "1:1", label: "Quadrat", w: 1, h: 1 },
  { value: "16:9", label: "Quer", w: 16, h: 9 },
  { value: "9:16", label: "Hoch", w: 9, h: 16 },
  { value: "3:2", label: "Foto quer", w: 3, h: 2 },
  { value: "2:3", label: "Foto hoch", w: 2, h: 3 },
  { value: "4:3", label: "Klassisch", w: 4, h: 3 },
  { value: "3:4", label: "Portrait", w: 3, h: 4 },
  { value: "4:5", label: "Instagram", w: 4, h: 5 },
  { value: "21:9", label: "Cinematic", w: 21, h: 9 },
] as const

interface ImageEditFormProps {
  referenceImageUrl: string
  onSubmit: (data: { editDescription: string; aspectRatio: string }) => void
  isReadOnly?: boolean
  previousData?: { editDescription: string; aspectRatio: string }
}

export function ImageEditForm({
  referenceImageUrl,
  onSubmit,
  isReadOnly,
  previousData,
}: ImageEditFormProps) {
  const [editDescription, setEditDescription] = useState(previousData?.editDescription ?? "")
  const [aspectRatio, setAspectRatio] = useState(previousData?.aspectRatio ?? "1:1")

  const handleSubmit = () => {
    if (!editDescription.trim()) return
    onSubmit({ editDescription: editDescription.trim(), aspectRatio })
  }

  return (
    <div className="mt-3 rounded-xl border widget-card p-4 space-y-4 max-w-2xl w-full">
      {/* Reference image preview */}
      <div>
        <label className="text-xs font-medium text-foreground mb-1.5 block">
          Referenzbild
        </label>
        <div className="rounded-lg overflow-hidden bg-muted aspect-[4/3] max-w-[280px]">
          {referenceImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={referenceImageUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="size-8 text-muted-foreground/40" />
            </div>
          )}
        </div>
      </div>

      {/* Edit description */}
      <div>
        <label className="text-xs font-medium text-foreground mb-1.5 block">
          Was moechtest du aendern?
        </label>
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="z.B. Mach den Himmel dramatischer, aendere die Farben zu Blau- und Silbertoenen..."
          rows={3}
          disabled={isReadOnly}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 resize-none"
        />
      </div>

      {/* Aspect Ratio */}
      <div>
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
      </div>

      {/* Submit */}
      {!isReadOnly && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!editDescription.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Pencil className="size-4" />
          Bild bearbeiten
        </button>
      )}
    </div>
  )
}
