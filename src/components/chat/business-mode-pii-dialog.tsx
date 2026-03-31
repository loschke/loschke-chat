"use client"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ShieldIcon } from "lucide-react"
import type { PiiFinding } from "@/lib/pii/types"
import { PII_LABELS } from "@/lib/pii/types"

interface BusinessModePiiDialogProps {
  open: boolean
  findings: PiiFinding[]
  options: {
    safeModel: boolean
    localModel: boolean
  }
  onDecision: (decision: "accept" | "redact" | "safe" | "local" | "cancel") => void
}

/** Mask a PII value for preview (show first/last chars with dots) */
function maskPreview(value: string): string {
  if (value.length <= 4) return "****"
  const first = value.slice(0, 2)
  const last = value.slice(-2)
  const dots = "\u00B7".repeat(Math.min(value.length - 4, 7))
  return `${first}${dots}${last}`
}

export function BusinessModePiiDialog({
  open,
  findings,
  options,
  onDecision,
}: BusinessModePiiDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-[90vw] gap-0 overflow-hidden p-0 sm:max-w-sm">
        {/* Header */}
        <AlertDialogHeader className="px-5 pt-5 pb-3">
          <AlertDialogTitle className="flex items-center gap-2.5 text-base">
            <ShieldIcon className="size-5 text-primary" />
            Sensible Daten erkannt
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            In deiner Nachricht wurden personenbezogene Daten erkannt. Wie willst du fortfahren?
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Findings list */}
        <div className="mx-5 mb-4 max-h-48 divide-y divide-border overflow-y-auto rounded-xl border">
          {findings.map((finding, i) => (
            <div key={i} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
              <span className="text-foreground">
                {PII_LABELS[finding.type] ?? finding.type}
              </span>
              <span className="font-mono text-xs text-muted-foreground tracking-wide">
                {maskPreview(finding.value)}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 px-5 pb-5">
          {/* Primary CTA */}
          <Button
            className="w-full bg-primary hover:bg-primary/90"
            onClick={() => onDecision("redact")}
          >
            Maskiert senden
          </Button>

          {/* Safe Model (EU/DE) */}
          {options.safeModel && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onDecision("safe")}
            >
              Sicher senden
            </Button>
          )}

          {/* Local Model */}
          {options.localModel && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onDecision("local")}
            >
              Lokal verarbeiten
            </Button>
          )}

          {(options.safeModel || options.localModel) && (
            <p className="text-center text-xs text-muted-foreground">
              Antwortqualitaet kann abweichen
            </p>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">oder</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Secondary actions */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs text-muted-foreground"
              onClick={() => onDecision("cancel")}
            >
              Nachricht bearbeiten
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs text-muted-foreground"
              onClick={() => onDecision("accept")}
            >
              Trotzdem senden
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
