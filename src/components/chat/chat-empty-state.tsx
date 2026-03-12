"use client"

import { Sparkles, Code, FileText, HelpCircle } from "lucide-react"
import { brand } from "@/config/brand"

interface ChatEmptyStateProps {
  onSuggestionSelect: (text: string) => void
}

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

export function ChatEmptyState({ onSuggestionSelect }: ChatEmptyStateProps) {
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
    </div>
  )
}
