"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, HelpCircle, ChevronLeft, ChevronRight, Send } from "lucide-react"
import type { QuizDefinition, QuizQuestion, QuizResults, QuizQuestionResult } from "@/types/quiz"

interface QuizRendererProps {
  quiz: QuizDefinition
  artifactId?: string
  isStreaming: boolean
  onComplete?: (quiz: QuizDefinition, results: QuizResults) => void
}

/** Grade the quiz based on user answers */
function gradeQuiz(quiz: QuizDefinition, answers: Record<string, string | number | number[]>): QuizResults {
  const details: QuizQuestionResult[] = []
  let correct = 0
  let incorrect = 0
  let pendingReview = 0

  for (const q of quiz.questions) {
    const answer = answers[q.id]

    if (q.type === "free_text") {
      pendingReview++
      details.push({
        questionId: q.id,
        type: q.type,
        userAnswer: typeof answer === "string" ? answer : "",
        needsReview: true,
      })
      continue
    }

    if (q.type === "single_choice") {
      const isCorrect = answer === q.correctAnswer
      if (isCorrect) correct++
      else incorrect++
      details.push({ questionId: q.id, type: q.type, correct: isCorrect })
      continue
    }

    if (q.type === "multiple_choice") {
      const userSelection = Array.isArray(answer) ? answer : []
      const correctIndices = Array.isArray(q.correctAnswer) ? q.correctAnswer : []
      const isCorrect =
        userSelection.length === correctIndices.length &&
        correctIndices.every((idx) => userSelection.includes(idx))
      if (isCorrect) correct++
      else incorrect++
      details.push({ questionId: q.id, type: q.type, correct: isCorrect })
    }
  }

  const autoGraded = correct + incorrect
  const percentage = autoGraded > 0 ? Math.round((correct / autoGraded) * 100) : 0

  return {
    totalQuestions: quiz.questions.length,
    correct,
    incorrect,
    pendingReview,
    percentage,
    details,
    completedAt: new Date().toISOString(),
  }
}

export function QuizRenderer({ quiz, artifactId, isStreaming, onComplete }: QuizRendererProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | number | number[]>>(quiz.answers ?? {})
  const [submitted, setSubmitted] = useState(!!quiz.results)

  const results = useMemo(() => quiz.results ?? null, [quiz.results])
  const isReadOnly = submitted || !!results

  const question = quiz.questions[currentIdx]
  const totalQuestions = quiz.questions.length
  const progress = ((currentIdx + 1) / totalQuestions) * 100

  const allAnswered = quiz.questions.every((q) => {
    const a = answers[q.id]
    if (a === undefined || a === "") return false
    if (Array.isArray(a) && a.length === 0) return false
    return true
  })

  const handleSingleChoice = useCallback((questionId: string, optionIdx: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIdx }))
  }, [])

  const handleMultipleChoice = useCallback((questionId: string, optionIdx: number) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? (prev[questionId] as number[]) : []
      const updated = current.includes(optionIdx)
        ? current.filter((i) => i !== optionIdx)
        : [...current, optionIdx]
      return { ...prev, [questionId]: updated }
    })
  }, [])

  const handleFreeText = useCallback((questionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }))
  }, [])

  const handleSubmit = useCallback(() => {
    const quizResults = gradeQuiz(quiz, answers)
    const completedQuiz: QuizDefinition = { ...quiz, answers, results: quizResults }
    setSubmitted(true)
    onComplete?.(completedQuiz, quizResults)
  }, [quiz, answers, onComplete])

  if (isStreaming) {
    return <QuizStreamingPlaceholder title={quiz.title} />
  }

  // Results view
  if (isReadOnly && results) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <ResultsHeader title={quiz.title} results={results} />
          <div className="space-y-4">
            {quiz.questions.map((q, i) => (
              <QuestionReview
                key={q.id}
                question={q}
                questionNumber={i + 1}
                answer={answers[q.id]}
                result={results.details.find((d) => d.questionId === q.id)}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Active quiz view
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold">{quiz.title}</h2>
          {quiz.description && (
            <p className="mt-1 text-sm text-muted-foreground">{quiz.description}</p>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Frage {currentIdx + 1} von {totalQuestions}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        {question && (
          <QuestionInput
            question={question}
            answer={answers[question.id]}
            onSingleChoice={handleSingleChoice}
            onMultipleChoice={handleMultipleChoice}
            onFreeText={handleFreeText}
          />
        )}
      </div>

      {/* Navigation footer */}
      <div className="border-t p-4 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          className="gap-1.5"
        >
          <ChevronLeft className="size-3.5" />
          Zurück
        </Button>

        {/* Question dots */}
        <div className="flex gap-1">
          {quiz.questions.map((q, i) => {
            const hasAnswer = answers[q.id] !== undefined && answers[q.id] !== "" && !(Array.isArray(answers[q.id]) && (answers[q.id] as number[]).length === 0)
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(i)}
                className={`size-2 rounded-full transition-colors ${
                  i === currentIdx
                    ? "bg-primary"
                    : hasAnswer
                      ? "bg-primary/40"
                      : "bg-muted-foreground/20"
                }`}
              />
            )
          })}
        </div>

        {currentIdx < totalQuestions - 1 ? (
          <Button
            size="sm"
            onClick={() => setCurrentIdx((i) => Math.min(totalQuestions - 1, i + 1))}
            className="gap-1.5"
          >
            Weiter
            <ChevronRight className="size-3.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={!allAnswered}
            onClick={handleSubmit}
            className="gap-1.5"
          >
            <Send className="size-3.5" />
            Absenden
          </Button>
        )}
      </div>
    </div>
  )
}

/** Single question input — renders type-specific controls */
function QuestionInput({
  question,
  answer,
  onSingleChoice,
  onMultipleChoice,
  onFreeText,
}: {
  question: QuizQuestion
  answer: string | number | number[] | undefined
  onSingleChoice: (id: string, idx: number) => void
  onMultipleChoice: (id: string, idx: number) => void
  onFreeText: (id: string, text: string) => void
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium leading-relaxed">{question.question}</p>

      {question.type === "single_choice" && question.options && (
        <div className="space-y-2">
          {question.options.map((option, i) => {
            const isSelected = answer === i
            return (
              <button
                key={i}
                onClick={() => onSingleChoice(question.id, i)}
                className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full border text-xs font-medium">
                  {String.fromCharCode(65 + i)}
                </span>
                {option}
              </button>
            )
          })}
        </div>
      )}

      {question.type === "multiple_choice" && question.options && (
        <div className="space-y-2">
          {question.options.map((option, i) => {
            const selected = Array.isArray(answer) ? answer : []
            const isSelected = selected.includes(i)
            return (
              <button
                key={i}
                onClick={() => onMultipleChoice(question.id, i)}
                className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <span className={`mr-2 inline-flex size-5 items-center justify-center rounded border text-xs font-medium ${
                  isSelected ? "bg-primary text-primary-foreground border-primary" : ""
                }`}>
                  {isSelected ? "✓" : String.fromCharCode(65 + i)}
                </span>
                {option}
              </button>
            )
          })}
          <p className="text-xs text-muted-foreground">Mehrere Antworten möglich</p>
        </div>
      )}

      {question.type === "free_text" && (
        <textarea
          value={typeof answer === "string" ? answer : ""}
          onChange={(e) => onFreeText(question.id, e.target.value)}
          placeholder="Deine Antwort..."
          className="w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          rows={4}
        />
      )}
    </div>
  )
}

/** Results header with score */
function ResultsHeader({ title, results }: { title: string; results: QuizResults }) {
  const autoGraded = results.correct + results.incorrect
  const scoreColor = results.percentage >= 80 ? "text-success" : results.percentage >= 50 ? "text-warning" : "text-destructive"

  return (
    <div className="rounded-xl border bg-muted/30 p-5 space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className={`text-3xl font-bold ${scoreColor}`}>{results.percentage}%</div>
          <div className="text-xs text-muted-foreground mt-0.5">Ergebnis</div>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-success" />
            <span>{results.correct} von {autoGraded} richtig</span>
          </div>
          {results.pendingReview > 0 && (
            <div className="flex items-center gap-2">
              <HelpCircle className="size-4 text-blue-600 dark:text-blue-400" />
              <span>{results.pendingReview} offene Frage{results.pendingReview > 1 ? "n" : ""} (Modell-Bewertung)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Per-question review in results view */
function QuestionReview({
  question,
  questionNumber,
  answer,
  result,
}: {
  question: QuizQuestion
  questionNumber: number
  answer: string | number | number[] | undefined
  result?: QuizQuestionResult
}) {
  const isCorrect = result?.correct
  const needsReview = result?.needsReview

  return (
    <div className="rounded-xl border p-4 space-y-2">
      <div className="flex items-start gap-2">
        {isCorrect === true && <CheckCircle2 className="size-4 mt-0.5 shrink-0 text-success" />}
        {isCorrect === false && <XCircle className="size-4 mt-0.5 shrink-0 text-destructive" />}
        {needsReview && <HelpCircle className="size-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />}
        <p className="text-sm font-medium">
          <span className="text-muted-foreground mr-1">{questionNumber}.</span>
          {question.question}
        </p>
      </div>

      {/* Show user answer */}
      {question.type === "free_text" && typeof answer === "string" && (
        <div className="ml-6 rounded-lg bg-muted px-3 py-2 text-sm italic text-foreground">
          {answer}
        </div>
      )}

      {(question.type === "single_choice" || question.type === "multiple_choice") && question.options && (
        <div className="ml-6 space-y-1">
          {question.options.map((opt, i) => {
            const isUserAnswer = question.type === "single_choice"
              ? answer === i
              : Array.isArray(answer) && answer.includes(i)
            const isCorrectOption = question.type === "single_choice"
              ? question.correctAnswer === i
              : Array.isArray(question.correctAnswer) && question.correctAnswer.includes(i)

            return (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
                  isCorrectOption
                    ? "bg-success/10 text-success"
                    : isUserAnswer && !isCorrectOption
                      ? "bg-destructive/10 text-destructive"
                      : ""
                }`}
              >
                <span className="size-4 text-center text-xs font-medium">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{opt}</span>
                {isUserAnswer && <span className="text-xs font-medium ml-auto">(deine Antwort)</span>}
                {isCorrectOption && !isUserAnswer && <span className="text-xs font-medium ml-auto">(richtig)</span>}
              </div>
            )
          })}
        </div>
      )}

      {/* Explanation */}
      {question.explanation && (
        <div className="ml-6 rounded-lg border-l-2 border-primary/40 bg-primary/10 px-3 py-2 text-xs text-foreground/70">
          {question.explanation}
        </div>
      )}
    </div>
  )
}

/** Placeholder while quiz is streaming */
function QuizStreamingPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-muted p-8 text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="size-2 animate-pulse rounded-full bg-primary" />
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <div className="w-full max-w-md space-y-3">
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted-foreground/20" />
        <div className="h-3 w-full animate-pulse rounded bg-muted-foreground/20 [animation-delay:150ms]" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted-foreground/20 [animation-delay:300ms]" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground/60">Quiz wird erstellt...</p>
    </div>
  )
}
