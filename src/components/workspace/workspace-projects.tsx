"use client"

import { useState, useCallback, useEffect } from "react"
import { Plus, Trash2, Pencil, X, Archive, Users, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ProjectRow {
  id: string
  name: string
  description: string | null
  defaultExpertId: string | null
  isArchived: boolean
  chatCount: number
  updatedAt: Date
}

interface WorkspaceProjectsProps {
  initialProjects: ProjectRow[]
}

export function WorkspaceProjects({ initialProjects }: WorkspaceProjectsProps) {
  const [projects, setProjects] = useState(initialProjects)
  const [view, setView] = useState<"list" | "create" | "edit">("list")
  const [editingProject, setEditingProject] = useState<ProjectRow | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [membersProjectId, setMembersProjectId] = useState<string | null>(null)

  const refreshProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects")
      if (res.ok) {
        const data = await res.json()
        setProjects(data.own ?? data)
      }
    } catch {
      // silent
    }
  }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Projekt "${name}" wirklich löschen? Chats werden nicht gelöscht.`)) return
    setLoading(id)
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" })
      if (res.ok) await refreshProjects()
    } catch {
      // silent
    } finally {
      setLoading(null)
    }
  }

  const handleArchive = async (id: string) => {
    setLoading(id)
    try {
      const project = projects.find(p => p.id === id)
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !project?.isArchived }),
      })
      if (res.ok) await refreshProjects()
    } catch {
      // silent
    } finally {
      setLoading(null)
    }
  }

  const handleSuccess = () => {
    refreshProjects()
    setView("list")
    setEditingProject(null)
  }

  if (view === "create" || (view === "edit" && editingProject)) {
    return (
      <div>
        <div className="mb-6 space-y-2">
          <Button variant="secondary" size="sm" onClick={() => { setView("list"); setEditingProject(null) }}>
            <X className="mr-1 size-4" /> Abbrechen
          </Button>
          <h1 className="text-lg font-semibold">
            {view === "create" ? "Neues Projekt" : "Projekt bearbeiten"}
          </h1>
        </div>
        <ProjectForm
          project={editingProject}
          onSuccess={handleSuccess}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Meine Projekte ({projects.length})</h1>
        <Button size="sm" onClick={() => setView("create")}>
          <Plus className="mr-1 size-4" /> Neues Projekt
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="mb-4 text-muted-foreground">
            Organisiere deine Chats in Projekten mit eigenen Instructions und Dokumenten.
          </p>
          <Button size="sm" onClick={() => setView("create")}>
            <Plus className="mr-1 size-4" /> Neues Projekt
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium md:px-4">Name</th>
                <th className="hidden px-4 py-2 text-center font-medium md:table-cell">Chats</th>
                <th className="px-3 py-2 text-right font-medium md:px-4">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className={`border-b last:border-0 hover:bg-muted/25 ${project.isArchived ? "opacity-50" : ""}`}>
                  <td className="px-3 py-2 md:px-4">
                    <div>
                      <span className="font-medium">{project.name}</span>
                      {project.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{project.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-4 py-2 text-center text-muted-foreground md:table-cell">{project.chatCount}</td>
                  <td className="px-3 py-2 text-right md:px-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setMembersProjectId(project.id)}
                        title="Mitglieder verwalten"
                      >
                        <Users className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => { setEditingProject(project); setView("edit") }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={loading === project.id}
                        onClick={() => handleArchive(project.id)}
                        title={project.isArchived ? "Wiederherstellen" : "Archivieren"}
                      >
                        <Archive className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        disabled={loading === project.id}
                        onClick={() => handleDelete(project.id, project.name)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProjectMembersDialog
        projectId={membersProjectId}
        onClose={() => setMembersProjectId(null)}
      />
    </div>
  )
}

function ProjectMembersDialog({ projectId, onClose }: { projectId: string | null; onClose: () => void }) {
  const [members, setMembers] = useState<Array<{ id: string; userId: string; role: string; name: string | null; email: string | null }>>([])
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!projectId) return
    async function loadMembers() {
      try {
        const res = await fetch(`/api/projects/${projectId}/members`)
        if (res.ok) setMembers(await res.json())
      } catch {
        // silent
      }
    }
    loadMembers()
  }, [projectId])

  const handleAdd = async () => {
    if (!email.trim() || !projectId) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setMembers((prev) => [...prev, data])
        setEmail("")
      } else {
        setError(data.error ?? "Fehler beim Hinzufuegen")
      }
    } catch {
      setError("Netzwerkfehler")
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (memberId: string) => {
    if (!projectId) return
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, { method: "DELETE" })
      if (res.ok) setMembers((prev) => prev.filter((m) => m.id !== memberId))
    } catch {
      // silent
    }
  }

  return (
    <Dialog open={!!projectId} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mitglieder verwalten</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError("") }}
              placeholder="E-Mail-Adresse"
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
            />
            <Button size="sm" onClick={handleAdd} disabled={loading || !email.trim()}>
              Einladen
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{m.name ?? m.email}</span>
                  {m.name && m.email && (
                    <span className="ml-2 text-muted-foreground">{m.email}</span>
                  )}
                  <span className="ml-2 text-xs text-muted-foreground">({m.role})</span>
                </div>
                {m.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(m.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground">Noch keine Mitglieder. Lade jemanden per E-Mail ein.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ProjectForm({ project, onSuccess }: { project: ProjectRow | null; onSuccess: () => void }) {
  const isNew = !project
  const [name, setName] = useState(project?.name ?? "")
  const [description, setDescription] = useState(project?.description ?? "")
  const [instructions, setInstructions] = useState("")
  const [isLoading, setIsLoading] = useState(!isNew)
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!project) return
    async function loadProject() {
      try {
        const res = await fetch(`/api/projects/${project!.id}`)
        if (res.ok) {
          const data = await res.json()
          setInstructions(data.instructions ?? "")
        }
      } catch {
        // silent
      } finally {
        setIsLoading(false)
      }
    }
    loadProject()
  }, [project])

  const handleSave = async () => {
    if (!name.trim()) {
      setStatus("error")
      setMessage("Name ist erforderlich.")
      return
    }

    setStatus("saving")
    setMessage("")

    try {
      const url = isNew ? "/api/projects" : `/api/projects/${project!.id}`
      const method = isNew ? "POST" : "PATCH"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          instructions: instructions || null,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus("success")
        setMessage(isNew ? "Projekt erstellt." : "Projekt aktualisiert.")
        setTimeout(onSuccess, 800)
      } else {
        setStatus("error")
        setMessage(data.error ?? "Speichern fehlgeschlagen")
      }
    } catch {
      setStatus("error")
      setMessage("Netzwerkfehler. Bitte erneut versuchen.")
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="space-y-2">
        <Label htmlFor="project-name">Name</Label>
        <Input
          id="project-name"
          value={name}
          onChange={(e) => { setName(e.target.value); setStatus("idle") }}
          placeholder="z.B. Website-Relaunch"
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="project-description">Beschreibung</Label>
        <Input
          id="project-description"
          value={description}
          onChange={(e) => { setDescription(e.target.value); setStatus("idle") }}
          placeholder="Kurzbeschreibung des Projekts"
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="project-instructions">Instructions</Label>
        <Textarea
          id="project-instructions"
          value={instructions}
          onChange={(e) => { setInstructions(e.target.value); setStatus("idle") }}
          placeholder="Anweisungen die in jedem Chat dieses Projekts gelten..."
          className="min-h-[150px]"
          maxLength={10000}
        />
      </div>

      {message && (
        <div className={`flex items-center gap-2 rounded-md p-3 text-sm ${
          status === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        }`}>
          {status === "success" ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
          {message}
        </div>
      )}

      <Button onClick={handleSave} disabled={status === "saving" || isLoading}>
        {status === "saving" ? "Speichere..." : isNew ? "Erstellen" : "Speichern"}
      </Button>
    </div>
  )
}
