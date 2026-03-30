"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { SendHorizontal, MessageCircleQuestion } from "lucide-react"

interface AskUserQuestion {
  question: string
  type: "single_select" | "multi_select" | "free_text"
  options?: string[]
}

interface AskUserProps {
  questions: AskUserQuestion[]
  onSubmit: (answers: Record<string, string | string[]>) => void
  isReadOnly?: boolean
  previousAnswers?: Record<string, string | string[]>
}

// Extract comment from a previously submitted answer string
function extractComment(answer: string | string[] | undefined): string {
  if (typeof answer !== "string") return ""
  const marker = "\n\nAnmerkung: "
  const idx = typeof answer === "string" ? answer.indexOf(marker) : -1
  return idx >= 0 ? answer.slice(idx + marker.length) : ""
}

export function AskUser({ questions, onSubmit, isReadOnly, previousAnswers }: AskUserProps) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(
    previousAnswers ?? {}
  )
  const [comments, setComments] = useState<Record<number, string>>(() => {
    if (!previousAnswers) return {}
    const initial: Record<number, string> = {}
    questions.forEach((q, i) => {
      const comment = extractComment(previousAnswers[q.question])
      if (comment) initial[i] = comment
    })
    return initial
  })

  const handleSingleSelect = useCallback((questionIdx: number, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionIdx]: option }))
  }, [])

  const handleMultiSelect = useCallback((questionIdx: number, option: string) => {
    setAnswers((prev) => {
      const current = (prev[questionIdx] as string[]) ?? []
      const updated = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option]
      return { ...prev, [questionIdx]: updated }
    })
  }, [])

  const handleFreeText = useCallback((questionIdx: number, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionIdx]: text }))
  }, [])

  const handleComment = useCallback((questionIdx: number, text: string) => {
    setComments((prev) => ({ ...prev, [questionIdx]: text }))
  }, [])

  const handleSubmit = useCallback(() => {
    // Build a response mapping question text → answer
    const result: Record<string, string | string[]> = {}
    questions.forEach((q, i) => {
      const comment = comments[i]?.trim()
      const answer = answers[i]

      if (q.type === "free_text") {
        if (answer !== undefined) result[q.question] = answer
        return
      }

      // For single_select / multi_select: use comment as fallback or append
      if (!answer && comment) {
        // Only comment, no option selected
        result[q.question] = comment
      } else if (answer !== undefined) {
        if (comment) {
          // Option + comment: append to answer string
          const base = Array.isArray(answer) ? answer.join(", ") : answer
          result[q.question] = `${base}\n\nAnmerkung: ${comment}`
        } else {
          result[q.question] = answer
        }
      }
    })
    onSubmit(result)
  }, [answers, comments, questions, onSubmit])

  const allAnswered = questions.every((q, i) => {
    const answer = answers[i]
    const comment = comments[i]?.trim()

    if (q.type === "free_text") {
      return answer ? (answer as string).trim().length > 0 : false
    }
    // single_select / multi_select: option OR comment is enough
    const hasOption = q.type === "multi_select"
      ? Array.isArray(answer) && answer.length > 0
      : !!answer
    return hasOption || !!comment
  })

  return (
    <div className="space-y-4 rounded-2xl border p-5 widget-card">
      <div className="widget-header">
        <MessageCircleQuestion className="size-3.5" />
        Rückfrage
      </div>
      {questions.map((q, i) => (
        <div key={`question-${i}`} className="space-y-2">
          <p className="text-sm font-medium">{q.question}</p>

          {q.type === "single_select" && q.options && (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={q.question}>
              {q.options.map((option) => {
                const isSelected = answers[i] === option
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={isReadOnly}
                    onClick={() => handleSingleSelect(i, option)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted"
                    } ${isReadOnly ? "cursor-default opacity-70" : ""}`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          )}

          {q.type === "multi_select" && q.options && (
            <div className="flex flex-wrap gap-2" role="group" aria-label={q.question}>
              {q.options.map((option) => {
                const selected = (answers[i] as string[] | undefined) ?? []
                const isSelected = selected.includes(option)
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => handleMultiSelect(i, option)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted"
                    } ${isReadOnly ? "cursor-default opacity-70" : ""}`}
                  >
                    {isSelected ? "✓ " : ""}{option}
                  </button>
                )
              })}
            </div>
          )}

          {(q.type === "single_select" || q.type === "multi_select") && (
            <label className="block">
              <span className="text-xs text-muted-foreground">Eigene Antwort / Anmerkung (optional)</span>
              <textarea
                value={comments[i] ?? ""}
                onChange={(e) => handleComment(i, e.target.value)}
                disabled={isReadOnly}
                placeholder="Falls keine Option passt oder du etwas ergänzen möchtest..."
                className="mt-1 w-full resize-none rounded-xl border-0 bg-muted/50 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-default disabled:opacity-70"
                rows={2}
              />
            </label>
          )}

          {q.type === "free_text" && (
            <label className="block">
              <span className="sr-only">{q.question}</span>
              <textarea
                value={(answers[i] as string) ?? ""}
                onChange={(e) => handleFreeText(i, e.target.value)}
                disabled={isReadOnly}
                placeholder="Deine Antwort..."
                className="w-full resize-none rounded-xl border-0 bg-muted/50 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-default disabled:opacity-70"
                rows={2}
              />
            </label>
          )}
        </div>
      ))}

      {!isReadOnly && (
        <Button
          onClick={handleSubmit}
          disabled={!allAnswered}
          size="default"
          className="gap-2 rounded-full px-6"
        >
          <SendHorizontal className="size-3.5" />
          Antworten
        </Button>
      )}
    </div>
  )
}
