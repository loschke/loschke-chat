"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { MicIcon, MicOffIcon, SquareIcon } from "lucide-react"
import { PromptInputButton } from "@/components/ai-elements/prompt-input"

// Web Speech API types (not in all TS libs)
interface SpeechRecognitionResult {
  readonly length: number
  [index: number]: { transcript: string; confidence: number }
  isFinal: boolean
}
interface SpeechRecognitionResultList {
  readonly length: number
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onstart: ((ev: Event) => void) | null
  onend: ((ev: Event) => void) | null
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null
  onresult: ((ev: SpeechRecognitionEvent) => void) | null
}

interface SpeechButtonProps {
  lang?: string
  onTranscript: (text: string) => void
}

type SpeechState = "idle" | "listening" | "error" | "unavailable"

export function SpeechButton({ lang = "de-DE", onTranscript }: SpeechButtonProps) {
  const [state, setState] = useState<SpeechState>("unavailable")
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript

  // Initialize on mount (client-only)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Web Speech API detection
    const w = window as any
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR() as SpeechRecognitionInstance
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang

    recognition.onstart = () => setState("listening")

    recognition.onend = () => {
      setState((prev) => (prev === "error" ? "error" : "idle"))
    }

    recognition.onerror = (ev) => {
      console.warn("[SpeechButton] error:", ev.error)
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        setState("error")
      } else {
        setState("idle")
      }
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript
        }
      }
      if (transcript) {
        onTranscriptRef.current(transcript)
      }
    }

    recognitionRef.current = recognition
    setState("idle")

    return () => {
      recognition.onstart = null
      recognition.onend = null
      recognition.onerror = null
      recognition.onresult = null
      recognition.stop()
      recognitionRef.current = null
    }
  }, [lang])

  const toggle = useCallback(() => {
    const r = recognitionRef.current
    if (!r) return

    if (state === "listening") {
      r.stop()
    } else {
      // Reset error state on retry
      setState("idle")
      try {
        r.start()
      } catch {
        setState("idle")
      }
    }
  }, [state])

  // Don't render if Web Speech API is not available
  if (state === "unavailable") return null

  const isListening = state === "listening"
  const isError = state === "error"

  const tooltip = isError
    ? "Mikrofon blockiert — bitte in Browser-Einstellungen erlauben"
    : isListening
      ? "Aufnahme stoppen"
      : "Spracheingabe"

  return (
    <PromptInputButton
      type="button"
      variant={isListening ? "default" : "ghost"}
      tooltip={tooltip}
      onClick={toggle}
      className={
        isListening
          ? "bg-destructive text-white hover:bg-destructive/80"
          : isError
            ? "text-destructive hover:text-destructive"
            : undefined
      }
    >
      {isListening ? (
        <SquareIcon className="size-4" />
      ) : isError ? (
        <MicOffIcon className="size-4" />
      ) : (
        <MicIcon className="size-4" />
      )}
    </PromptInputButton>
  )
}
