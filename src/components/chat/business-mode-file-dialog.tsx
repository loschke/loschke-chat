"use client"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ShieldIcon, FileIcon, ImageIcon } from "lucide-react"
import { containsImage } from "@/lib/ai/model-capabilities"

interface BusinessModeFileDialogProps {
  open: boolean
  files: Array<{ name: string; type: string; size: number }>
  options: {
    safeModel: boolean
    localModel: boolean
  }
  onDecision: (decision: "accept" | "reject" | "safe" | "local") => void
}

function formatFileSize(bytes: number): string {
  if (bytes <= 0) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function BusinessModeFileDialog({
  open,
  files,
  options,
  onDecision,
}: BusinessModeFileDialogProps) {
  // Images cannot be processed by the safe/local routes (privacy models are typically text-only).
  // When any image is attached, hide the safe/local buttons and surface an explicit hint.
  const hasImage = containsImage(files)
  const showSafeOption = options.safeModel && !hasImage
  const showLocalOption = options.localModel && !hasImage
  const showAlternativeRoutes = showSafeOption || showLocalOption

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-sm gap-0 p-0 overflow-hidden">
        {/* Header */}
        <AlertDialogHeader className="px-5 pt-5 pb-3">
          <AlertDialogTitle className="flex items-center gap-2.5 text-base">
            <ShieldIcon className="size-5 text-blue-500" />
            Datei-Upload
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            Folgende Dateien werden an den KI-Anbieter gesendet und dort verarbeitet.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* File list */}
        <div className="mx-5 mb-4 max-h-36 divide-y divide-border overflow-y-auto rounded-lg border">
          {files.map((file, i) => {
            const isImage = file.type.toLowerCase().startsWith("image/")
            const Icon = isImage ? ImageIcon : FileIcon
            return (
              <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm">
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{file.name}</span>
                {formatFileSize(file.size) && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {hasImage && (options.safeModel || options.localModel) && (
          <div className="mx-5 mb-4 rounded-md border border-amber-400/40 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400">
            Bilder können nicht in den sicheren Modus gesendet werden. Entferne das Bild oder fahre an den Original-Anbieter fort.
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 px-5 pb-5">
          {/* Primary CTA */}
          <Button
            className="w-full bg-primary hover:bg-primary/90"
            onClick={() => onDecision("accept")}
          >
            Fortfahren
          </Button>

          {/* Safe Model (EU/DE) — hidden when an image is attached */}
          {showSafeOption && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onDecision("safe")}
            >
              Sicher fortfahren
            </Button>
          )}

          {/* Local Model — hidden when an image is attached */}
          {showLocalOption && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onDecision("local")}
            >
              Lokal verarbeiten
            </Button>
          )}

          {showAlternativeRoutes && (
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

          {/* Cancel */}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => onDecision("reject")}
          >
            Abbrechen
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
