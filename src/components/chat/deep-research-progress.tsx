"use client"

import { useEffect, useRef, useState } from "react"
import {
  ClipboardListIcon,
  SearchIcon,
  BookOpenIcon,
  FileTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  LoaderIcon,
  XIcon,
  FlaskConicalIcon,
  ExternalLinkIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface DeepResearchProgressProps {
  interactionId: string
  chatId: string
  query: string
  /** Called when research is complete and artifact was created */
  onArtifactCreated?: (artifactId: string) => void
}

type Phase = "planning" | "searching" | "analyzing" | "writing"
type ResearchState = "polling" | "completed" | "failed" | "expired"

interface PhaseInfo {
  key: Phase
  label: string
  icon: typeof SearchIcon
  keywords: RegExp
}

const PHASES: PhaseInfo[] = [
  { key: "planning", label: "Planung", icon: ClipboardListIcon, keywords: /plan|strategy|research plan|outline|planen|strategie|gliederung|konzept/i },
  { key: "searching", label: "Suche", icon: SearchIcon, keywords: /search|query|finding|look|fetch|such|recherchier|finde|abrufen|anfrage/i },
  { key: "analyzing", label: "Analyse", icon: BookOpenIcon, keywords: /read|analy|evaluat|review|examin|lese|analysier|auswert|pruef|prüf|bewert|untersuch/i },
  { key: "writing", label: "Bericht", icon: FileTextIcon, keywords: /writ|draft|compil|summar|report|format|schreib|verfass|zusammenfass|bericht|entwurf|formatier/i },
]

const POLL_INTERVAL = 5_000

function derivePhase(summaries: string[], fallback: Phase): Phase {
  if (summaries.length === 0) return "planning"
  const latest = summaries.slice(-3).join(" ")
  for (let i = PHASES.length - 1; i >= 0; i--) {
    if (PHASES[i].keywords.test(latest)) return PHASES[i].key
  }
  return fallback
}

export function DeepResearchProgress({ interactionId, chatId, query, onArtifactCreated }: DeepResearchProgressProps) {
  const [state, setState] = useState<ResearchState>("polling")
  const [currentPhase, setCurrentPhase] = useState<Phase>("planning")
  const [thoughtSummaries, setThoughtSummaries] = useState<string[]>([])
  const [artifactId, setArtifactId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Use refs to avoid stale closures in setInterval
  const stateRef = useRef(state)
  stateRef.current = state
  const completingRef = useRef(false)
  const onArtifactCreatedRef = useRef(onArtifactCreated)
  onArtifactCreatedRef.current = onArtifactCreated

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null
    let timerId: ReturnType<typeof setInterval> | null = null
    let abortController: AbortController | null = null

    const completeResearch = async () => {
      if (completingRef.current) return
      completingRef.current = true

      try {
        const res = await fetch(`/api/deep-research/${interactionId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId, title: `Deep Research: ${query.slice(0, 100)}` }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? `HTTP ${res.status}`)
        }

        const data = await res.json()
        setArtifactId(data.artifactId)
        setState("completed")
        onArtifactCreatedRef.current?.(data.artifactId)
      } catch (err) {
        console.error("[DeepResearch] Complete failed:", err)
        setError("Artifact konnte nicht erstellt werden")
        setState("failed")
      }
    }

    const poll = async () => {
      if (stateRef.current !== "polling") return

      abortController = new AbortController()

      try {
        const res = await fetch(`/api/deep-research/${interactionId}`, {
          signal: abortController.signal,
        })

        if (res.status === 404) {
          setState("expired")
          if (intervalId) clearInterval(intervalId)
          if (timerId) clearInterval(timerId)
          return
        }

        if (!res.ok) return

        const data = await res.json()

        if (data.thoughtSummaries?.length > 0) {
          setThoughtSummaries(data.thoughtSummaries)
          setCurrentPhase((prev) => derivePhase(data.thoughtSummaries, prev))
        }

        if (data.status === "completed") {
          if (intervalId) clearInterval(intervalId)
          if (timerId) clearInterval(timerId)
          await completeResearch()
        } else if (data.status === "failed") {
          setState("failed")
          setError(data.error ?? "Recherche fehlgeschlagen")
          if (intervalId) clearInterval(intervalId)
          if (timerId) clearInterval(timerId)
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        console.warn("[DeepResearch] Poll error:", err)
      }
    }

    // Immediate first check
    poll()

    // Start polling interval
    intervalId = setInterval(poll, POLL_INTERVAL)

    // Elapsed timer
    timerId = setInterval(() => {
      if (stateRef.current === "polling") {
        setElapsedSeconds((s) => s + 1)
      }
    }, 1000)

    return () => {
      if (intervalId) clearInterval(intervalId)
      if (timerId) clearInterval(timerId)
      abortController?.abort()
    }
  }, [interactionId, chatId, query])

  const isActive = state === "polling"
  const phaseIndex = PHASES.findIndex((p) => p.key === currentPhase)

  return (
    <div className="rounded-xl border widget-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/20">
        <FlaskConicalIcon className="size-4 text-primary" />
        <span className="text-sm font-medium">Deep Research</span>
        {isActive && (
          <span className="ml-auto text-xs text-muted-foreground">
            {formatElapsed(elapsedSeconds)}
          </span>
        )}
        {state === "completed" && (
          <span className="ml-auto flex items-center gap-1 text-xs text-success">
            <CheckCircleIcon className="size-3.5" />
            Fertig
          </span>
        )}
        {(state === "failed" || state === "expired") && (
          <span className="ml-auto flex items-center gap-1 text-xs text-red-600">
            <XCircleIcon className="size-3.5" />
            {state === "expired" ? "Abgelaufen" : "Fehler"}
          </span>
        )}
      </div>

      {/* Phase Timeline */}
      <div className="px-3 py-3 space-y-1">
        {PHASES.map((phase, i) => {
          const isDone = i < phaseIndex || state === "completed"
          const isCurrent = i === phaseIndex && isActive
          const isPending = i > phaseIndex && isActive

          return (
            <div key={phase.key} className="flex items-center gap-2.5">
              <div className="flex flex-col items-center">
                {isDone ? (
                  <CheckCircleIcon className="size-4 text-success" />
                ) : isCurrent ? (
                  <LoaderIcon className="size-4 text-primary animate-spin" />
                ) : (
                  <div className="size-4 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>
              <span className={`text-sm ${
                isDone ? "text-muted-foreground" :
                isCurrent ? "text-foreground font-medium" :
                isPending ? "text-muted-foreground/50" :
                "text-muted-foreground"
              }`}>
                {phase.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Latest thought summary */}
      {isActive && thoughtSummaries.length > 0 && (
        <div className="px-3 pb-2">
          <p className="text-xs text-muted-foreground/80 italic line-clamp-2">
            {thoughtSummaries[thoughtSummaries.length - 1]}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-3 pb-3">
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <XIcon className="size-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Completed: artifact link */}
      {state === "completed" && artifactId && (
        <div className="px-3 pb-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => onArtifactCreatedRef.current?.(artifactId)}
          >
            <FileTextIcon className="size-4" />
            Report oeffnen
            <ExternalLinkIcon className="size-3 ml-auto" />
          </Button>
        </div>
      )}

      {/* Expired */}
      {state === "expired" && (
        <div className="px-3 pb-3">
          <p className="text-xs text-muted-foreground">
            Diese Recherche ist nicht mehr verfuegbar.
          </p>
        </div>
      )}
    </div>
  )
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`
}
