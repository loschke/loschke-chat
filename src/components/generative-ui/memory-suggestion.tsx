"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Check, X, BookmarkPlus, Trash2, BrainIcon } from "lucide-react"

interface MemorySuggestionItem {
  memory: string
  reason: string
}

interface MemorySuggestionProps {
  suggestions: MemorySuggestionItem[]
  onSubmit: (result: { saved: string[]; dismissed: string[] }) => void
  isReadOnly?: boolean
  previousResult?: { saved: string[]; dismissed: string[] }
}

export function MemorySuggestion({ suggestions, onSubmit, isReadOnly, previousResult }: MemorySuggestionProps) {
  const [decisions, setDecisions] = useState<Record<number, "saved" | "dismissed" | "error">>(() => {
    if (!previousResult) return {}
    const initial: Record<number, "saved" | "dismissed" | "error"> = {}
    suggestions.forEach((s, i) => {
      if (previousResult.saved.includes(s.memory)) initial[i] = "saved"
      else if (previousResult.dismissed.includes(s.memory)) initial[i] = "dismissed"
    })
    return initial
  })
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [submitted, setSubmitted] = useState(!!previousResult)

  const allDecided = suggestions.every((_, i) => decisions[i] === "saved" || decisions[i] === "dismissed")

  const handleSave = useCallback(async (index: number) => {
    const memory = suggestions[index].memory
    setSaving((prev) => ({ ...prev, [index]: true }))
    try {
      const res = await fetch("/api/user/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memory }),
      })
      if (res.ok) {
        setDecisions((prev) => ({ ...prev, [index]: "saved" }))
      } else {
        setDecisions((prev) => ({ ...prev, [index]: "error" }))
      }
    } catch {
      setDecisions((prev) => ({ ...prev, [index]: "error" }))
    } finally {
      setSaving((prev) => ({ ...prev, [index]: false }))
    }
  }, [suggestions])

  const handleDismiss = useCallback((index: number) => {
    setDecisions((prev) => ({ ...prev, [index]: "dismissed" }))
  }, [])

  const handleSaveAll = useCallback(async () => {
    const pending = suggestions
      .map((_, i) => i)
      .filter((i) => decisions[i] === undefined || decisions[i] === "error")

    await Promise.allSettled(pending.map((i) => handleSave(i)))
  }, [suggestions, decisions, handleSave])

  const handleDismissAll = useCallback(() => {
    const updates: Record<number, "dismissed"> = {}
    suggestions.forEach((_, i) => {
      if (decisions[i] === undefined) updates[i] = "dismissed"
    })
    setDecisions((prev) => ({ ...prev, ...updates }))
  }, [suggestions, decisions])

  const handleSubmit = useCallback(() => {
    const saved: string[] = []
    const dismissed: string[] = []
    suggestions.forEach((s, i) => {
      if (decisions[i] === "saved") saved.push(s.memory)
      else dismissed.push(s.memory)
    })
    setSubmitted(true)
    onSubmit({ saved, dismissed })
  }, [suggestions, decisions, onSubmit])

  const readOnly = isReadOnly || submitted
  const undecidedCount = suggestions.filter((_, i) => !decisions[i] || decisions[i] === "error").length

  return (
    <div className="space-y-3 rounded-2xl border p-5 widget-card">
      <div className="widget-header">
        <BrainIcon className="size-3.5" />
        Erinnerungen
      </div>

      <div className="space-y-2">
        {suggestions.map((s, i) => {
          const decision = decisions[i]
          const isSaving = saving[i]

          return (
            <div
              key={`suggestion-${i}`}
              className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                decision === "saved"
                  ? "border-primary/30 bg-primary/5"
                  : decision === "dismissed"
                    ? "border-border bg-muted/20 opacity-60"
                    : "border-border bg-background"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm">{s.memory}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.reason}</p>
              </div>

              {decision === "saved" && (
                <span className="flex shrink-0 items-center gap-1 text-xs text-primary">
                  <Check className="size-3.5" />
                  Gespeichert
                </span>
              )}

              {decision === "dismissed" && (
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <X className="size-3.5" />
                  Verworfen
                </span>
              )}

              {decision === "error" && !readOnly && (
                <button
                  type="button"
                  onClick={() => handleSave(i)}
                  disabled={isSaving}
                  className="shrink-0 text-xs text-destructive hover:underline"
                >
                  Fehler – erneut versuchen
                </button>
              )}

              {!decision && !readOnly && (
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => handleSave(i)}
                    disabled={isSaving}
                    title="Speichern"
                  >
                    <BookmarkPlus className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => handleDismiss(i)}
                    disabled={isSaving}
                    title="Verwerfen"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!readOnly && (
        <div className="flex items-center gap-2">
          {undecidedCount > 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-full text-xs"
                onClick={handleSaveAll}
              >
                <BookmarkPlus className="size-3" />
                Alle speichern
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-full text-xs"
                onClick={handleDismissAll}
              >
                <Trash2 className="size-3" />
                Alle verwerfen
              </Button>
            </>
          )}
          {allDecided && (
            <Button
              size="sm"
              className="ml-auto gap-1.5 rounded-full px-5"
              onClick={handleSubmit}
            >
              <Check className="size-3.5" />
              Fertig
            </Button>
          )}
        </div>
      )}

      {submitted && (
        <p className="text-xs text-muted-foreground">
          {Object.values(decisions).filter((d) => d === "saved").length} von {suggestions.length} Erinnerungen gespeichert
        </p>
      )}
    </div>
  )
}
