"use client"

import { useState } from "react"
import { MessageCircle, Lightbulb, BrainCircuit, MessageSquareQuote, ListChecks, Users, Zap } from "lucide-react"
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
  userName?: string
}

type Tab = "chat" | "experts" | "quicktasks"

const suggestions = [
  {
    icon: Lightbulb,
    text: "Erkläre mir ein Thema einfach",
    description: "Komplexe Sachverhalte verständlich aufbereitet",
  },
  {
    icon: BrainCircuit,
    text: "Brainstorme Ideen mit mir",
    description: "Kreative Ansätze entwickeln und Gedanken sortieren",
  },
  {
    icon: MessageSquareQuote,
    text: "Gib mir eine zweite Meinung",
    description: "Feedback, Gegenargumente und neue Perspektiven",
  },
  {
    icon: ListChecks,
    text: "Hilf mir eine Entscheidung zu strukturieren",
    description: "Pro/Contra, Optionen vergleichen, Klarheit schaffen",
  },
]

const tabs = [
  { id: "chat" as const, label: "Chat", icon: MessageCircle },
  { id: "experts" as const, label: "Experten", icon: Users },
  { id: "quicktasks" as const, label: "Quicktasks", icon: Zap },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Guten Morgen"
  if (hour < 18) return "Guten Tag"
  return "Guten Abend"
}

export function ChatEmptyState({
  onSuggestionSelect,
  selectedExpertId,
  onExpertSelect,
  onQuicktaskSubmit,
  isSubmitting,
  userName,
}: ChatEmptyStateProps) {
  const [activeTab, setActiveTab] = useState<Tab>("chat")
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

  const greeting = getGreeting()
  const firstName = userName?.split(" ")[0]

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      {/* Greeting */}
      <div className="text-center">
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {brand.name}
        </p>
        <h2 className="mb-1 text-2xl font-bold tracking-tight">
          {firstName ? `${greeting}, ${firstName}` : greeting}
        </h2>
        <p className="text-sm text-muted-foreground">
          Wie kann ich dir helfen?
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "chat" && (
        <div className="grid w-full max-w-2xl grid-cols-2 gap-3">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.text}
              type="button"
              onClick={() => onSuggestionSelect(suggestion.text)}
              className="group flex flex-col items-start gap-2 rounded-xl border p-4 text-left text-sm transition-all hover:border-muted-foreground/25 hover:bg-muted/50"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-foreground">
                <suggestion.icon className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="font-medium leading-tight">{suggestion.text}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {suggestion.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {activeTab === "experts" && (
        <ExpertSelector
          selectedExpertId={selectedExpertId}
          onExpertSelect={onExpertSelect}
        />
      )}

      {activeTab === "quicktasks" && (
        <QuicktaskSelector
          onQuicktaskSelect={setSelectedQuicktask}
        />
      )}
    </div>
  )
}
