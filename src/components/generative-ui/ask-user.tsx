"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { SendHorizontal } from "lucide-react"

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

export function AskUser({ questions, onSubmit, isReadOnly, previousAnswers }: AskUserProps) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(
    previousAnswers ?? {}
  )

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

  const handleSubmit = useCallback(() => {
    // Build a response mapping question text → answer
    const result: Record<string, string | string[]> = {}
    questions.forEach((q, i) => {
      const answer = answers[i]
      if (answer !== undefined) {
        result[q.question] = answer
      }
    })
    onSubmit(result)
  }, [answers, questions, onSubmit])

  const allAnswered = questions.every((q, i) => {
    const answer = answers[i]
    if (!answer) return false
    if (q.type === "multi_select") return (answer as string[]).length > 0
    if (q.type === "free_text") return (answer as string).trim().length > 0
    return true
  })

  return (
    <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
      {questions.map((q, i) => (
        <div key={i} className="space-y-2">
          <p className="text-sm font-medium">{q.question}</p>

          {q.type === "single_select" && q.options && (
            <div className="flex flex-wrap gap-2">
              {q.options.map((option) => {
                const isSelected = answers[i] === option
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => handleSingleSelect(i, option)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
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
            <div className="flex flex-wrap gap-2">
              {q.options.map((option) => {
                const selected = (answers[i] as string[] | undefined) ?? []
                const isSelected = selected.includes(option)
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => handleMultiSelect(i, option)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
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

          {q.type === "free_text" && (
            <textarea
              value={(answers[i] as string) ?? ""}
              onChange={(e) => handleFreeText(i, e.target.value)}
              disabled={isReadOnly}
              placeholder="Deine Antwort..."
              className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-default disabled:opacity-70"
              rows={2}
            />
          )}
        </div>
      ))}

      {!isReadOnly && (
        <Button
          onClick={handleSubmit}
          disabled={!allAnswered}
          size="sm"
          className="gap-2"
        >
          <SendHorizontal className="size-3.5" />
          Antworten
        </Button>
      )}
    </div>
  )
}
