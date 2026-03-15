"use client"

import { useState } from "react"
import { Folder, FolderX } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ProjectOption {
  id: string
  name: string
}

interface ProjectMoveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chatId: string
  currentProjectId: string | null
  projects: ProjectOption[]
  onMove: (chatId: string, projectId: string | null) => void
}

export function ProjectMoveDialog({
  open,
  onOpenChange,
  chatId,
  currentProjectId,
  projects,
  onMove,
}: ProjectMoveDialogProps) {
  const [selected, setSelected] = useState<string | null>(currentProjectId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>In Projekt verschieben</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-60 flex-col gap-1 overflow-y-auto py-2">
          {/* Remove from project option */}
          <button
            type="button"
            onClick={() => setSelected(null)}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
              selected === null
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <FolderX className="size-4" />
            Kein Projekt
          </button>
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => setSelected(project.id)}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                selected === project.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Folder className="size-4" />
              <span className="truncate">{project.name}</span>
            </button>
          ))}
          {projects.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Noch keine Projekte vorhanden.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            size="sm"
            disabled={selected === currentProjectId}
            onClick={() => {
              onMove(chatId, selected)
              onOpenChange(false)
            }}
          >
            Verschieben
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
