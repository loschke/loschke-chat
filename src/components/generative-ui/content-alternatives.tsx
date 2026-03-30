"use client"

import { useState, useCallback } from "react"
import { Check, SplitSquareHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MessageResponse } from "@/components/ai-elements/message"

interface Alternative {
  label: string
  content: string
}

interface ContentAlternativesProps {
  prompt?: string
  alternatives: Alternative[]
  onSubmit: (selection: { label: string; content: string; index: number; feedback?: string }) => void
  isReadOnly?: boolean
  /** Index of previously selected alternative (for read-only replay) */
  selectedIndex?: number
  /** Previously submitted feedback (for read-only replay) */
  previousFeedback?: string
}

export function ContentAlternatives({
  prompt,
  alternatives,
  onSubmit,
  isReadOnly,
  selectedIndex,
  previousFeedback,
}: ContentAlternativesProps) {
  const [activeTab, setActiveTab] = useState(selectedIndex ?? 0)
  const [confirmed, setConfirmed] = useState(selectedIndex != null)
  const [feedback, setFeedback] = useState(previousFeedback ?? "")

  const handleSelect = useCallback(() => {
    const alt = alternatives[activeTab]
    if (!alt) return
    setConfirmed(true)
    const trimmed = feedback.trim()
    onSubmit({ label: alt.label, content: alt.content, index: activeTab, ...(trimmed && { feedback: trimmed }) })
  }, [activeTab, alternatives, feedback, onSubmit])

  const isSelected = (idx: number) => confirmed && idx === (selectedIndex ?? activeTab)

  return (
    <div className="space-y-3 rounded-2xl border p-5 widget-card">
      <div className="widget-header">
        <SplitSquareHorizontal className="size-3.5" />
        Varianten
      </div>
      {prompt && (
        <p className="text-sm text-muted-foreground">{prompt}</p>
      )}

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1.5" role="tablist">
        {alternatives.map((alt, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={activeTab === i}
            onClick={() => setActiveTab(i)}
            className={`relative rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              activeTab === i
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted"
            } ${isSelected(i) ? "pr-7" : ""}`}
          >
            {alt.label}
            {isSelected(i) && (
              <Check className="absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="rounded-xl bg-background/60 p-4">
        <MessageResponse className="chat-prose">
          {alternatives[activeTab]?.content ?? ""}
        </MessageResponse>
      </div>

      {/* Feedback textarea */}
      {!confirmed && !isReadOnly && (
        <label className="block">
          <span className="text-xs text-muted-foreground">Anmerkung / Feedback (optional)</span>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Was gefällt dir, was soll anders sein..."
            className="mt-1 w-full resize-none rounded-xl border-0 bg-muted/50 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            rows={2}
          />
        </label>
      )}

      {/* Action */}
      {!isReadOnly && !confirmed && (
        <Button
          onClick={handleSelect}
          size="default"
          className="gap-2 rounded-full px-6"
        >
          <Check className="size-3.5" />
          Auswählen
        </Button>
      )}

      {confirmed && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Ausgewählt: <span className="font-medium text-foreground">{alternatives[selectedIndex ?? activeTab]?.label}</span>
          </p>
          {(previousFeedback || feedback.trim()) && (
            <p className="text-xs text-muted-foreground italic">
              Anmerkung: {previousFeedback || feedback.trim()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
