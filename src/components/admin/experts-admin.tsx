"use client"

import { useState, useCallback } from "react"
import { Plus, Trash2, Pencil, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExpertImport } from "./expert-import"
import { ExpertEditor } from "./expert-editor"

interface ExpertRow {
  id: string
  userId: string | null
  name: string
  slug: string
  description: string
  icon: string | null
  skillSlugs: string[]
  sortOrder: number
}

interface ExpertsAdminProps {
  initialExperts: ExpertRow[]
}

export function ExpertsAdmin({ initialExperts }: ExpertsAdminProps) {
  const [experts, setExperts] = useState(initialExperts)
  const [view, setView] = useState<"list" | "import" | "edit">("list")
  const [editingExpertId, setEditingExpertId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const refreshExperts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/experts")
      if (res.ok) {
        const data = await res.json()
        setExperts(data)
      }
    } catch {
      // Refresh failed silently — list stays as-is
    }
  }, [])

  const deleteExpert = async (id: string, name: string) => {
    if (!confirm(`Expert "${name}" wirklich löschen?`)) return
    setLoading(id)
    try {
      const res = await fetch(`/api/admin/experts/${id}`, { method: "DELETE" })
      if (res.ok) await refreshExperts()
    } catch {
      // Delete failed — state unchanged
    } finally {
      setLoading(null)
    }
  }

  const handleImportSuccess = () => {
    refreshExperts()
    setView("list")
  }

  const handleEditSuccess = () => {
    refreshExperts()
    setView("list")
    setEditingExpertId(null)
  }

  if (view === "import") {
    return (
      <div>
        <div className="mb-6 space-y-2">
          <Button variant="secondary" size="sm" onClick={() => setView("list")}>
            <X className="mr-1 size-4" /> Abbrechen
          </Button>
          <h1 className="text-lg font-semibold">Expert importieren</h1>
        </div>
        <ExpertImport onSuccess={handleImportSuccess} />
      </div>
    )
  }

  if (view === "edit" && editingExpertId) {
    return (
      <div>
        <div className="mb-6 space-y-2">
          <Button variant="secondary" size="sm" onClick={() => { setView("list"); setEditingExpertId(null) }}>
            <X className="mr-1 size-4" /> Abbrechen
          </Button>
          <h1 className="text-lg font-semibold">Expert bearbeiten</h1>
        </div>
        <ExpertEditor expertId={editingExpertId} onSuccess={handleEditSuccess} />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Experts ({experts.length})</h1>
        <Button size="sm" onClick={() => setView("import")}>
          <Plus className="mr-1 size-4" /> Importieren
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Slug</th>
              <th className="px-4 py-2 text-left font-medium">Icon</th>
              <th className="px-4 py-2 text-left font-medium">Skills</th>
              <th className="px-4 py-2 text-center font-medium">Typ</th>
              <th className="px-4 py-2 text-center font-medium">Sortierung</th>
              <th className="px-4 py-2 text-right font-medium">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {experts.map((expert) => (
              <tr key={expert.id} className="border-b last:border-0 hover:bg-muted/25">
                <td className="px-4 py-2 font-medium">{expert.name}</td>
                <td className="px-4 py-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{expert.slug}</code>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{expert.icon ?? "—"}</td>
                <td className="px-4 py-2">
                  {expert.skillSlugs.length > 0
                    ? expert.skillSlugs.map((s) => (
                        <Badge key={s} variant="outline" className="mr-1 text-xs">{s}</Badge>
                      ))
                    : <span className="text-muted-foreground">—</span>
                  }
                </td>
                <td className="px-4 py-2 text-center">
                  <Badge variant={expert.userId === null ? "secondary" : "default"}>
                    {expert.userId === null ? "Global" : "User"}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-center text-muted-foreground">{expert.sortOrder}</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => { setEditingExpertId(expert.id); setView("edit") }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      disabled={loading === expert.id}
                      onClick={() => deleteExpert(expert.id, expert.name)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {experts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Keine Experts vorhanden. <button className="underline" onClick={() => setView("import")}>Ersten Expert importieren</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
