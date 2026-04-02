"use client"

import { useEffect, useRef } from "react"
import { Mic, MicOff, PhoneOff, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VoiceChatVisualizer } from "./voice-chat-visualizer"
import type { VoiceChatState, TranscriptEntry } from "@/hooks/use-voice-chat"

interface VoiceChatOverlayProps {
  state: VoiceChatState
  duration: number
  transcript: TranscriptEntry[]
  amplitude: number
  isMuted: boolean
  maxDuration: number
  onMute: () => void
  onUnmute: () => void
  onDisconnect: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function VoiceChatOverlay({
  state,
  duration,
  transcript,
  amplitude,
  isMuted,
  maxDuration,
  onMute,
  onUnmute,
  onDisconnect,
}: VoiceChatOverlayProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const timeRemaining = maxDuration - duration
  const showWarning = timeRemaining > 0 && timeRemaining <= 120

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [transcript])

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDisconnect()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onDisconnect])

  const visualizerState = isMuted
    ? "muted" as const
    : state === "connecting"
      ? "connecting" as const
      : state === "speaking"
        ? "speaking" as const
        : state === "listening"
          ? "listening" as const
          : "idle" as const

  const stateLabel =
    state === "connecting" ? "Verbinde..." :
    state === "speaking" ? "Spricht..." :
    state === "listening" ? (isMuted ? "Stummgeschaltet" : "Hört zu...") :
    state === "connected" ? "Verbunden" :
    ""

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
      {/* Close button */}
      <div className="flex justify-end p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onDisconnect}
          aria-label="Voice Chat beenden"
        >
          <X className="size-5" />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
        {/* Visualizer */}
        <VoiceChatVisualizer
          amplitude={amplitude}
          state={visualizerState}
          size="lg"
        />

        {/* State label */}
        <p className="text-sm text-muted-foreground">
          {stateLabel}
        </p>

        {/* Timer */}
        <div className="flex items-center gap-2 font-mono text-lg tabular-nums">
          <span className={showWarning ? "text-destructive font-semibold" : "text-foreground"}>
            {formatTime(duration)}
          </span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{formatTime(maxDuration)}</span>
        </div>

        {showWarning && (
          <p className="text-sm text-destructive">
            Noch {Math.ceil(timeRemaining / 60)} {timeRemaining > 60 ? "Minuten" : "Minute"}
          </p>
        )}

        {/* Transcript */}
        {transcript.length > 0 && (
          <div className="w-full max-w-lg max-h-48 overflow-y-auto rounded-xl border bg-muted/30 p-4">
            <div className="space-y-3 text-sm">
              {transcript.map((entry, i) => (
                <div key={i} className="flex gap-2">
                  <span className={`shrink-0 font-medium ${
                    entry.role === "user" ? "text-primary" : "text-muted-foreground"
                  }`}>
                    {entry.role === "user" ? "Du:" : "AI:"}
                  </span>
                  <span className="text-foreground/90">{entry.text}</span>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-6">
        <Button
          variant={isMuted ? "default" : "outline"}
          size="lg"
          onClick={isMuted ? onUnmute : onMute}
          className="gap-2 rounded-full px-6"
        >
          {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          {isMuted ? "Entmuten" : "Mute"}
        </Button>

        <Button
          variant="destructive"
          size="lg"
          onClick={onDisconnect}
          className="gap-2 rounded-full px-6"
        >
          <PhoneOff className="size-4" />
          Beenden
        </Button>
      </div>
    </div>
  )
}
