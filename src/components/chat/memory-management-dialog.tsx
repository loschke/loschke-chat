"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { TrashIcon, SearchIcon, LoaderIcon, BrainIcon, AlertCircleIcon } from "lucide-react"

interface Memory {
  id: string
  memory: string
  created_at?: string
  updated_at?: string
}

interface MemoryManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MemoryManagementDialog({ open, onOpenChange }: MemoryManagementDialogProps) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)

  const loadMemories = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/user/memories")
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Memories konnten nicht geladen werden")
        return
      }
      const data = await res.json()
      setMemories(data.memories ?? [])
    } catch {
      setError("Verbindung zum Memory-Service fehlgeschlagen")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setSearchQuery("")
      loadMemories()
    }
  }, [open, loadMemories])

  const handleDelete = async (memoryId: string) => {
    setConfirmDeleteId(null)
    setDeleteError(null)
    setDeletingId(memoryId)
    try {
      const res = await fetch(`/api/user/memories/${memoryId}`, { method: "DELETE" })
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== memoryId))
      } else {
        const data = await res.json().catch(() => ({}))
        setDeleteError(data.error ?? "Löschen fehlgeschlagen")
      }
    } catch {
      setDeleteError("Verbindung fehlgeschlagen")
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteAll = async () => {
    setConfirmDeleteAll(false)
    setDeleteError(null)
    setIsDeletingAll(true)
    try {
      const res = await fetch("/api/user/memories", { method: "DELETE" })
      if (res.ok) {
        setMemories([])
      } else {
        const data = await res.json().catch(() => ({}))
        setDeleteError(data.error ?? "Löschen fehlgeschlagen")
      }
    } catch {
      setDeleteError("Verbindung fehlgeschlagen")
    } finally {
      setIsDeletingAll(false)
    }
  }

  const filtered = searchQuery.trim()
    ? memories.filter((m) =>
        m.memory.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : memories

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null
    try {
      return new Date(dateStr).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch {
      return null
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainIcon className="size-5" />
              Memory verwalten
            </DialogTitle>
            <DialogDescription>
              Gespeicherte Erinnerungen aus deinen Chats. Du kannst einzelne Einträge löschen.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <AlertCircleIcon className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={loadMemories}>
                Erneut versuchen
              </Button>
            </div>
          ) : memories.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <BrainIcon className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Noch keine Erinnerungen gespeichert.</p>
              <p className="text-xs text-muted-foreground/70">
                Memories werden automatisch aus deinen Chats extrahiert oder wenn du die KI bittest sich etwas zu merken.
              </p>
            </div>
          ) : (
            <>
              {memories.length > 5 && (
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Erinnerungen durchsuchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}

              {deleteError && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircleIcon className="size-4 shrink-0" />
                  {deleteError}
                </div>
              )}

              <div className="flex-1 overflow-y-auto -mx-6 px-6 min-h-0">
                <div className="space-y-2">
                  {filtered.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Keine Treffer für &ldquo;{searchQuery}&rdquo;
                    </p>
                  ) : (
                    filtered.map((memory) => (
                      <div
                        key={memory.id}
                        className="group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-relaxed">{memory.memory}</p>
                          {(memory.created_at || memory.updated_at) && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDate(memory.updated_at ?? memory.created_at)}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={() => setConfirmDeleteId(memory.id)}
                          disabled={deletingId === memory.id}
                        >
                          {deletingId === memory.id ? (
                            <LoaderIcon className="size-4 animate-spin" />
                          ) : (
                            <TrashIcon className="size-4" />
                          )}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t pt-3 -mx-6 px-6 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {filtered.length === memories.length
                    ? `${memories.length} ${memories.length === 1 ? "Erinnerung" : "Erinnerungen"}`
                    : `${filtered.length} von ${memories.length} Erinnerungen`}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      window.open("/api/user/memories?export=true", "_blank")
                    }}
                  >
                    Exportieren
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs"
                    onClick={() => setConfirmDeleteAll(true)}
                    disabled={isDeletingAll}
                  >
                    {isDeletingAll ? (
                      <LoaderIcon className="size-3 animate-spin mr-1" />
                    ) : null}
                    Alle löschen
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Erinnerung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Erinnerung wird unwiderruflich gelöscht und steht in zukünftigen Chats nicht mehr zur Verfügung.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alle Erinnerungen löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Alle {memories.length} Erinnerungen werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Alle löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
