"use client"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ShieldIcon, FileIcon } from "lucide-react"

interface BusinessModeFileDialogProps {
  open: boolean
  files: Array<{ name: string; type: string; size: number }>
  options: {
    euModel: boolean
    localModel: boolean
  }
  onDecision: (decision: "accept" | "reject" | "eu" | "local") => void
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
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm">
              <FileIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{file.name}</span>
              {formatFileSize(file.size) && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 px-5 pb-5">
          {/* Primary CTA */}
          <Button
            className="w-full bg-primary hover:bg-primary/90"
            onClick={() => onDecision("accept")}
          >
            Fortfahren
          </Button>

          {/* EU Model */}
          {options.euModel && (
            <div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onDecision("eu")}
              >
                Mit EU-Modell fortfahren
              </Button>
              <p className="mt-1 text-center text-xs text-muted-foreground">
                Antwortqualität kann abweichen
              </p>
            </div>
          )}

          {/* Local Model */}
          {options.localModel && (
            <div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onDecision("local")}
              >
                Lokal verarbeiten
              </Button>
              <p className="mt-1 text-center text-xs text-muted-foreground">
                Antwortqualität kann abweichen
              </p>
            </div>
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
