"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const MAX_LENGTH = 2000

interface CustomInstructionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomInstructionsDialog({ open, onOpenChange }: CustomInstructionsDialogProps) {
  const [instructions, setInstructions] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const loadInstructions = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/user/instructions")
      if (res.ok) {
        const data = await res.json()
        setInstructions(data.instructions ?? "")
      }
    } catch {
      // Non-critical
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadInstructions()
  }, [open, loadInstructions])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await fetch("/api/user/instructions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions }),
      })
      onOpenChange(false)
    } catch {
      // Non-critical
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Eigene Anweisungen</DialogTitle>
          <DialogDescription>
            Diese Anweisungen werden bei jeder Antwort berücksichtigt.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        ) : (
          <>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value.slice(0, MAX_LENGTH))}
              placeholder="z.B. Antworte immer auf Deutsch. Bevorzuge kurze, präzise Antworten..."
              className="min-h-[160px] resize-none"
              maxLength={MAX_LENGTH}
            />
            <div className="text-right text-xs text-muted-foreground">
              {instructions.length} / {MAX_LENGTH}
            </div>
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={isLoading || isSaving}>
            {isSaving ? "Speichern..." : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
