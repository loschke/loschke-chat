"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface ProjectSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** If provided, we're editing an existing project */
  project?: {
    id: string
    name: string
    description: string | null
    instructions: string | null
    defaultExpertId: string | null
  } | null
  onSave: (data: {
    name: string
    description?: string
    instructions?: string
  }) => void
}

export function ProjectSettingsDialog({
  open,
  onOpenChange,
  project,
  onSave,
}: ProjectSettingsDialogProps) {
  const [name, setName] = useState(project?.name ?? "")
  const [description, setDescription] = useState(project?.description ?? "")
  const [instructions, setInstructions] = useState(project?.instructions ?? "")
  const [isSaving, setIsSaving] = useState(false)

  const isEdit = !!project

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)
    try {
      onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        instructions: instructions.trim() || undefined,
      })
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Projekt bearbeiten" : "Neues Projekt"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Website Relaunch"
              maxLength={100}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-description">Beschreibung</Label>
            <Input
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung (optional)"
              maxLength={500}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-instructions">Instruktionen</Label>
            <Textarea
              id="project-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Spezifische Anweisungen für die KI in diesem Projekt (optional)"
              rows={5}
              maxLength={10000}
            />
            <p className="text-xs text-muted-foreground">
              Diese Anweisungen werden bei jedem Chat in diesem Projekt berücksichtigt.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim() || isSaving}>
              {isEdit ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
