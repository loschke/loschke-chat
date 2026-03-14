"use client"

import { FileTextIcon, ShieldAlertIcon } from "lucide-react"
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

interface FilePrivacyDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  filenames: string[]
  modelProvider?: string
  modelRegion?: string
}

export function FilePrivacyDialog({
  open,
  onConfirm,
  onCancel,
  filenames,
  modelProvider,
  modelRegion,
}: FilePrivacyDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlertIcon className="size-5 text-amber-500" />
            Datenschutz-Hinweis
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Die folgenden Dateien werden an den KI-Anbieter gesendet:
              </p>
              <ul className="space-y-1">
                {filenames.map((name) => (
                  <li key={name} className="flex items-center gap-2 text-sm">
                    <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{name}</span>
                  </li>
                ))}
              </ul>
              {(modelProvider || modelRegion) && (
                <p className="text-sm text-muted-foreground">
                  Anbieter: {modelProvider ?? "Unbekannt"}
                  {modelRegion && ` (Region: ${modelRegion.toUpperCase()})`}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Trotzdem senden</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
