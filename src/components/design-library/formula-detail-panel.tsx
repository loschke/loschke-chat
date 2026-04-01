"use client"

import { useState, useEffect, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Palette, Layers, Pencil, Loader2, ImageIcon, Copy, Check } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import type { Formula } from "./formula-card"

interface Example {
  id: string
  promptText: string
  promptTextDe?: string
  previewUrl: string
  imageModel: string
  category: string
}

interface FormulaDetailPanelProps {
  formula: Formula | null
  formulaName: string
  open: boolean
  onClose: () => void
}

/** Highlight [placeholders] in template text */
function renderTemplate(text: string): ReactNode[] {
  const parts = text.split(/(\[[^\]]+\])/)
  return parts.map((part, i) =>
    part.startsWith("[") && part.endsWith("]")
      ? <span key={i} className="rounded bg-primary/15 px-1 py-0.5 text-primary font-semibold">{part}</span>
      : <span key={i}>{part}</span>
  )
}

/** Simple markdown renderer for legend text (bold, lists, line breaks) */
function renderLegend(text: string): ReactNode {
  const lines = text.split("\n")
  return (
    <ul className="space-y-1.5">
      {lines.filter((l) => l.trim()).map((line, i) => {
        const cleaned = line.replace(/^-\s*/, "")
        // Replace **bold** with <strong>
        const parts = cleaned.split(/(\*\*[^*]+\*\*)/)
        const rendered = parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
            : <span key={j}>{part}</span>
        )
        return (
          <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-foreground/80">
            <span className="text-muted-foreground shrink-0 mt-0.5">&#8226;</span>
            <span>{rendered}</span>
          </li>
        )
      })}
    </ul>
  )
}

function ExampleImageCard({ example, onEdit }: { example: Example; onEdit: () => void }) {
  const [copied, setCopied] = useState(false)
  const promptText = example.promptTextDe ?? example.promptText

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(promptText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [promptText])

  return (
    <div className="group relative rounded-lg overflow-hidden bg-muted aspect-square">
      {example.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={example.previewUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className="size-6 text-muted-foreground/40" />
        </div>
      )}

      {/* Hover overlay with actions */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex flex-col items-center justify-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-black opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
        >
          <Pencil className="size-3" />
          Bearbeiten
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/30"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Kopiert" : "Prompt kopieren"}
        </button>
      </div>

      {/* Model badge */}
      <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[8px] text-white/80">
        {example.imageModel}
      </span>
    </div>
  )
}

export function FormulaDetailPanel({ formula, formulaName, open, onClose }: FormulaDetailPanelProps) {
  const router = useRouter()
  const [examples, setExamples] = useState<Example[]>([])
  const [loading, setLoading] = useState(false)

  // Load examples when formula changes
  useEffect(() => {
    if (!formula) { setExamples([]); return }
    setLoading(true)
    fetch(`/api/design-library/formulas/${formula.id}`)
      .then((r) => r.json())
      .then((data) => setExamples(data.examples ?? []))
      .catch(() => setExamples([]))
      .finally(() => setLoading(false))
  }, [formula?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateVariant = () => {
    if (!formula) return
    router.push(`/?formula=${formula.id}&expert=design-studio`)
  }

  const handlePromptOnly = () => {
    if (!formula) return
    router.push(`/?formula=${formula.id}&expert=design-studio&mode=prompt-only`)
  }

  const handleEditImage = (example: Example) => {
    const prompt = example.promptTextDe ?? example.promptText
    router.push(`/?referenceImage=${encodeURIComponent(example.previewUrl)}&originalPrompt=${encodeURIComponent(prompt)}&expert=design-studio`)
  }

  const legendText = formula?.legend
    ? typeof formula.legend === "string"
      ? formula.legend
      : formula.legend.de ?? formula.legend.en ?? ""
    : ""

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{formulaName}</SheetTitle>
          <SheetDescription className="sr-only">Details zur Prompt-Formel</SheetDescription>
        </SheetHeader>

        {formula && (
          <div className="flex flex-col gap-5 px-1 pb-6">
            {/* Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Layers className="size-3" />
                {formula.usageType}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {formula.mediumType}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {formula.exampleCount} Beispielbilder
              </span>
            </div>

            {/* Template */}
            <div className="rounded-lg bg-muted/50 border p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                Prompt-Template
              </p>
              <p className="text-xs font-mono leading-relaxed text-foreground/80 break-words whitespace-pre-wrap">
                {renderTemplate(formula.templateText)}
              </p>
            </div>

            {/* Legend */}
            {legendText && (
              <div className="rounded-lg bg-muted/50 border p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Variablen-Legende
                </p>
                {renderLegend(legendText)}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreateVariant}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Palette className="size-4" />
                Bild generieren
              </button>
              <button
                type="button"
                onClick={handlePromptOnly}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Pencil className="size-4" />
                Prompt erstellen
              </button>
            </div>

            {/* Example Images */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Beispielbilder ({loading ? "..." : examples.length})
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : examples.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Keine Beispielbilder vorhanden
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {examples.map((ex) => (
                    <ExampleImageCard
                      key={ex.id}
                      example={ex}
                      onEdit={() => handleEditImage(ex)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
