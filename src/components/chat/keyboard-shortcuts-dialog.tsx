"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SHORTCUTS = [
  { keys: ["{mod}", "K"], description: "Sidebar-Suche fokussieren" },
  { keys: ["{mod}", "B"], description: "Sidebar ein-/ausblenden" },
  { keys: ["Alt", "N"], description: "Neuer Chat" },
  { keys: ["{mod}", "."], description: "Tastenkuerzel anzeigen" },
]

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  )
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(navigator.platform.toUpperCase().includes("MAC"))
    }
  }, [])

  const mod = isMac ? "\u2318" : "Ctrl"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Tastenkuerzel</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.description} className="flex items-center justify-between py-1">
              <span className="text-sm">{s.description}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <Kbd key={i}>{k === "{mod}" ? mod : k}</Kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
