"use client"

import { useState, useCallback } from "react"
import { Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { VoiceChatVisualizer } from "./voice-chat-visualizer"

interface VoiceChatTabProps {
  onStartVoiceChat: () => void
  creditsAvailable: boolean
}

const CONSENT_KEY = "voice-chat-consent"

export function VoiceChatTab({ onStartVoiceChat, creditsAvailable }: VoiceChatTabProps) {
  const [showConsent, setShowConsent] = useState(false)

  const handleStart = useCallback(() => {
    // Check if consent was already given
    if (localStorage.getItem(CONSENT_KEY) === "true") {
      onStartVoiceChat()
      return
    }
    setShowConsent(true)
  }, [onStartVoiceChat])

  const handleConsent = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "true")
    setShowConsent(false)
    onStartVoiceChat()
  }, [onStartVoiceChat])

  return (
    <>
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        {/* Idle visualizer */}
        <VoiceChatVisualizer
          amplitude={0}
          state="idle"
          size="lg"
        />

        {/* Description */}
        <div className="text-center">
          <h3 className="mb-2 text-lg font-semibold">Sprich mit mir</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Frag einfach drauf los. Du bekommst sofort eine Antwort per Sprache.
          </p>
        </div>

        {/* Start button */}
        <Button
          size="lg"
          onClick={handleStart}
          disabled={!creditsAvailable}
          className="gap-2 rounded-full px-8"
        >
          <Mic className="size-4" />
          Voice starten
        </Button>

        {!creditsAvailable && (
          <p className="text-xs text-muted-foreground">
            Nicht genügend Credits für Voice Chat
          </p>
        )}
      </div>

      {/* Consent dialog */}
      <AlertDialog open={showConsent} onOpenChange={setShowConsent}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hinweis zu Voice Chat</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Audio wird direkt an Google (Gemini) gesendet und dort verarbeitet.
                Das Gespräch wird nach Beendigung als Text in deiner Chat-History gespeichert.
              </span>
              <span className="block">
                Voice Chat nutzt Google Search um aktuelle Informationen einzubeziehen.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleConsent}>
              Verstanden, starten
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
