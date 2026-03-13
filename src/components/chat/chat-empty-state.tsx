"use client"

import { useState } from "react"
import { Sparkles, Code, FileText, HelpCircle } from "lucide-react"
import { brand } from "@/config/brand"
import { ExpertSelector } from "./expert-selector"
import { QuicktaskSelector, type QuicktaskPublic } from "./quicktask-selector"
import { QuicktaskForm } from "./quicktask-form"

interface ChatEmptyStateProps {
  onSuggestionSelect: (text: string) => void
  selectedExpertId: string | null
  onExpertSelect: (expertId: string | null) => void
  onQuicktaskSubmit: (slug: string, data: Record<string, string>) => void
  isSubmitting?: boolean
}

type Tab = "experts" | "quicktasks"

const suggestions = [
  {
    icon: Sparkles,
    text: "Erkläre mir ein komplexes Thema einfach",
  },
  {
    icon: Code,
    text: "Hilf mir beim Programmieren",
  },
  {
    icon: FileText,
    text: "Fasse einen langen Text zusammen",
  },
  {
    icon: HelpCircle,
    text: "Beantworte meine Fragen",
  },
]

export function ChatEmptyState({
  onSuggestionSelect,
  selectedExpertId,
  onExpertSelect,
  onQuicktaskSubmit,
  isSubmitting,
}: ChatEmptyStateProps) {
  const [activeTab, setActiveTab] = useState<Tab>("experts")
  const [selectedQuicktask, setSelectedQuicktask] = useState<QuicktaskPublic | null>(null)

  // Quicktask form view
  if (selectedQuicktask) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4">
        <QuicktaskForm
          quicktask={selectedQuicktask}
          onSubmit={(data) => onQuicktaskSubmit(selectedQuicktask.slug, data)}
          onBack={() => setSelectedQuicktask(null)}
          isSubmitting={isSubmitting ?? false}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-bold tracking-tight">
          {brand.name}
        </h2>
        <p className="text-muted-foreground">
          Wie kann ich dir helfen?
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => setActiveTab("experts")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "experts"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Experten
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("quicktasks")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "quicktasks"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Quicktasks
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "experts" ? (
        <ExpertSelector
          selectedExpertId={selectedExpertId}
          onExpertSelect={onExpertSelect}
        />
      ) : (
        <QuicktaskSelector
          onQuicktaskSelect={setSelectedQuicktask}
        />
      )}

      {/* Suggestion cards (only in experts tab) */}
      {activeTab === "experts" && (
        <div className="grid w-full max-w-lg grid-cols-2 gap-3">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.text}
              type="button"
              onClick={() => onSuggestionSelect(suggestion.text)}
              className="flex items-start gap-3 rounded-xl border p-4 text-left text-sm transition-colors hover:bg-muted/50"
            >
              <suggestion.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>{suggestion.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
