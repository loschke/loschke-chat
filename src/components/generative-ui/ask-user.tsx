"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { SendHorizontal, MessageCircleQuestion, Check, Circle } from "lucide-react"

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

// Derive a short tab label from a question string
function tabLabel(question: string, maxLen = 28): string {
  // Strip trailing question mark and whitespace
  const clean = question.replace(/\?+\s*$/, "").trim()
  if (clean.length <= maxLen) return clean
  return clean.slice(0, maxLen - 1).trimEnd() + "…"
}

export function AskUser({ questions, onSubmit, isReadOnly, previousAnswers }: AskUserProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(() => {
    if (!previousAnswers) return {}
    const indexed: Record<string, string | string[]> = {}
    questions.forEach((q, i) => {
      if (previousAnswers[q.question] !== undefined) {
        indexed[i] = previousAnswers[q.question]
      }
    })
    return indexed
  })
  const [comments, setComments] = useState<Record<number, string>>(() => {
    if (!previousAnswers) return {}
    const initial: Record<number, string> = {}
    questions.forEach((q, i) => {
      const comment = extractComment(previousAnswers[q.question])
      if (comment) initial[i] = comment
    })
    return initial
  })

  const isStepAnswered = useCallback((idx: number) => {
    const q = questions[idx]
    const answer = answers[idx]
    const comment = comments[idx]?.trim()
    if (q.type === "free_text") {
      return answer ? (answer as string).trim().length > 0 : false
    }
    const hasOption = q.type === "multi_select"
      ? Array.isArray(answer) && answer.length > 0
      : !!answer
    return hasOption || !!comment
  }, [questions, answers, comments])

  const handleSingleSelect = useCallback((questionIdx: number, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionIdx]: option }))
    // Auto-advance to next unanswered step after a short delay
    if (!isReadOnly && questions.length > 1) {
      setTimeout(() => {
        // Find next unanswered step (or stay if last)
        for (let offset = 1; offset < questions.length; offset++) {
          const next = (questionIdx + offset) % questions.length
          if (next !== questionIdx) {
            setActiveStep(next)
            return
          }
        }
      }, 250)
    }
  }, [isReadOnly, questions.length])

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
    const result: Record<string, string | string[]> = {}
    questions.forEach((q, i) => {
      const comment = comments[i]?.trim()
      const answer = answers[i]

      if (q.type === "free_text") {
        if (answer !== undefined) result[q.question] = answer
        return
      }

      if (!answer && comment) {
        result[q.question] = comment
      } else if (answer !== undefined) {
        if (comment) {
          const base = Array.isArray(answer) ? answer.join(", ") : answer
          result[q.question] = `${base}\n\nAnmerkung: ${comment}`
        } else {
          result[q.question] = answer
        }
      }
    })
    onSubmit(result)
  }, [answers, comments, questions, onSubmit])

  const allAnswered = questions.every((_, i) => isStepAnswered(i))
  const showTabs = questions.length > 1
  const q = questions[activeStep]

  return (
    <div className="rounded-2xl border widget-card overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-0">
        <div className="widget-header">
          <MessageCircleQuestion className="size-3.5" />
          Rückfrage
        </div>
      </div>

      {/* Tab Navigation (only for multiple questions) */}
      {showTabs && (
        <div className="flex gap-1.5 px-5 pt-3 pb-0">
          {questions.map((question, i) => {
            const answered = isStepAnswered(i)
            const active = i === activeStep
            return (
              <button
                key={`tab-${i}`}
                type="button"
                onClick={() => setActiveStep(i)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : answered
                      ? "bg-muted/80 text-muted-foreground"
                      : "bg-muted/40 text-muted-foreground/70 hover:bg-muted/60"
                }`}
              >
                {answered && <Check className="size-3" />}
                {tabLabel(question.question)}
              </button>
            )
          })}
        </div>
      )}

      {/* Active Question */}
      <div className="p-5 space-y-3">
        <p className="text-sm font-medium">{q.question}</p>

        {/* Single Select — Card Options */}
        {q.type === "single_select" && q.options && (
          <div className="space-y-2" role="radiogroup" aria-label={q.question}>
            {q.options.map((option) => {
              const isSelected = answers[activeStep] === option
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={isReadOnly}
                  onClick={() => handleSingleSelect(activeStep, option)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  } ${isReadOnly ? "cursor-default opacity-70" : "cursor-pointer"}`}
                >
                  <span className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected ? "border-primary" : "border-muted-foreground/40"
                  }`}>
                    {isSelected && <Circle className="size-2 fill-primary text-primary" />}
                  </span>
                  <span>{option}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Multi Select — Card Options */}
        {q.type === "multi_select" && q.options && (
          <div className="space-y-2" role="group" aria-label={q.question}>
            {q.options.map((option) => {
              const selected = (answers[activeStep] as string[] | undefined) ?? []
              const isSelected = selected.includes(option)
              return (
                <button
                  key={option}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => handleMultiSelect(activeStep, option)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  } ${isReadOnly ? "cursor-default opacity-70" : "cursor-pointer"}`}
                >
                  <span className={`flex size-4 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                  }`}>
                    {isSelected && <Check className="size-2.5 text-primary-foreground" />}
                  </span>
                  <span>{option}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Comment / Remark for select types */}
        {(q.type === "single_select" || q.type === "multi_select") && (
          <label className="block">
            <span className="text-xs text-muted-foreground">Eigene Antwort / Anmerkung (optional)</span>
            <textarea
              value={comments[activeStep] ?? ""}
              onChange={(e) => handleComment(activeStep, e.target.value)}
              disabled={isReadOnly}
              placeholder="Falls keine Option passt oder du etwas ergänzen möchtest..."
              className="mt-1 w-full resize-none rounded-xl border-0 bg-muted/50 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-default disabled:opacity-70"
              rows={2}
            />
          </label>
        )}

        {/* Free Text */}
        {q.type === "free_text" && (
          <label className="block">
            <span className="sr-only">{q.question}</span>
            <textarea
              value={(answers[activeStep] as string) ?? ""}
              onChange={(e) => handleFreeText(activeStep, e.target.value)}
              disabled={isReadOnly}
              placeholder="Deine Antwort..."
              className="w-full resize-none rounded-xl border-0 bg-muted/50 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-default disabled:opacity-70"
              rows={2}
            />
          </label>
        )}

        {/* Submit */}
        {!isReadOnly && (
          <div className="pt-1">
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered}
              size="default"
              className="gap-2 rounded-full px-6"
            >
              <SendHorizontal className="size-3.5" />
              Antworten
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
