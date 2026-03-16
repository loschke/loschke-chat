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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { MemoryManagementDialog } from "./memory-management-dialog"
import { CreditHistoryDialog } from "./credit-history-dialog"

const MAX_LENGTH = 2000

interface ModelInfo {
  id: string
  name: string
  provider: string
  categories: string[]
}

interface CustomInstructionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomInstructionsDialog({ open, onOpenChange }: CustomInstructionsDialogProps) {
  const [instructions, setInstructions] = useState("")
  const [defaultModelId, setDefaultModelId] = useState<string | null>(null)
  const [memoryEnabled, setMemoryEnabled] = useState(false)
  const [memoryAvailable, setMemoryAvailable] = useState(false)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false)
  const [creditHistoryOpen, setCreditHistoryOpen] = useState(false)
  const [creditsBalance, setCreditsBalance] = useState<number | undefined>(undefined)
  const [creditsEnabled, setCreditsEnabled] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [prefsRes, modelsRes] = await Promise.all([
        fetch("/api/user/instructions"),
        fetch("/api/models"),
      ])
      if (prefsRes.ok) {
        const data = await prefsRes.json()
        setInstructions(data.instructions ?? "")
        setDefaultModelId(data.defaultModelId ?? null)
        setMemoryEnabled(data.memoryEnabled ?? true)
        setMemoryAvailable(data.memoryAvailable ?? false)
        setCreditsBalance(data.creditsBalance)
        setCreditsEnabled(data.creditsEnabled ?? false)
      }
      if (modelsRes.ok) {
        const data = await modelsRes.json()
        setModels(data.models ?? [])
      }
    } catch {
      // Non-critical
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadData()
  }, [open, loadData])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/user/instructions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions, defaultModelId, memoryEnabled }),
      })
      if (!res.ok) {
        console.warn("[Settings] Failed to save:", res.status)
        return
      }
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
          <DialogTitle>Einstellungen</DialogTitle>
          <DialogDescription>
            Dein bevorzugtes Modell und persönliche Anweisungen für alle Chats.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="default-model">Bevorzugtes Modell</Label>
              <Select
                value={defaultModelId ?? "__system__"}
                onValueChange={(v) => setDefaultModelId(v === "__system__" ? null : v)}
              >
                <SelectTrigger id="default-model">
                  <SelectValue placeholder="System-Standard" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__system__">System-Standard</SelectItem>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Wird verwendet wenn kein Experte oder Quicktask ein Modell vorgibt.
              </p>
            </div>

            {memoryAvailable && (
              <div className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <Label htmlFor="memory-toggle">Memory</Label>
                    <p className="text-xs text-muted-foreground">
                      Kontext aus früheren Chats bei neuen Gesprächen einbeziehen.
                    </p>
                  </div>
                  <Switch
                    id="memory-toggle"
                    checked={memoryEnabled}
                    onCheckedChange={setMemoryEnabled}
                  />
                </div>
                {memoryEnabled && (
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-1 h-auto p-0 text-xs"
                    onClick={() => setMemoryDialogOpen(true)}
                  >
                    Memories verwalten
                  </Button>
                )}
              </div>
            )}
            <MemoryManagementDialog
              open={memoryDialogOpen}
              onOpenChange={setMemoryDialogOpen}
            />

            {creditsEnabled && creditsBalance !== undefined && (
              <div className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <Label>Credits</Label>
                    <p className="text-xs text-muted-foreground">
                      Aktuelles Guthaben: <span className="font-medium">{creditsBalance.toLocaleString("de-DE")}</span> Credits
                    </p>
                  </div>
                </div>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1 h-auto p-0 text-xs"
                  onClick={() => setCreditHistoryOpen(true)}
                >
                  Verbrauch anzeigen
                </Button>
              </div>
            )}
            <CreditHistoryDialog
              open={creditHistoryOpen}
              onOpenChange={setCreditHistoryOpen}
            />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom-instructions">Eigene Anweisungen</Label>
              <Textarea
                id="custom-instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value.slice(0, MAX_LENGTH))}
                placeholder="z.B. Antworte immer auf Deutsch. Bevorzuge kurze, präzise Antworten..."
                className="min-h-[160px] resize-none"
                maxLength={MAX_LENGTH}
              />
              <div className="text-right text-xs text-muted-foreground">
                {instructions.length} / {MAX_LENGTH}
              </div>
            </div>
          </div>
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
