"use client"

import { useState, useCallback } from "react"
import { Plus, Trash2, Pencil, Upload, X, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SkillImport } from "./skill-import"
import { SkillEditor } from "./skill-editor"

interface SkillRow {
  id: string
  slug: string
  name: string
  description: string
  mode: string
  category: string | null
  icon: string | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

interface SkillsAdminProps {
  initialSkills: SkillRow[]
}

export function SkillsAdmin({ initialSkills }: SkillsAdminProps) {
  const [skills, setSkills] = useState(initialSkills)
  const [view, setView] = useState<"list" | "import" | "edit">("list")
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const refreshSkills = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/skills")
      if (res.ok) {
        const data = await res.json()
        setSkills(data)
      }
    } catch {
      // Refresh failed silently — list stays as-is
    }
  }, [])

  const toggleActive = async (id: string, isActive: boolean) => {
    setLoading(id)
    try {
      const res = await fetch(`/api/admin/skills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (res.ok) await refreshSkills()
    } catch {
      // Toggle failed — state unchanged
    } finally {
      setLoading(null)
    }
  }

  const deleteSkill = async (id: string, name: string) => {
    if (!confirm(`Skill "${name}" wirklich löschen?`)) return
    setLoading(id)
    try {
      const res = await fetch(`/api/admin/skills/${id}`, { method: "DELETE" })
      if (res.ok) await refreshSkills()
    } catch {
      // Delete failed — state unchanged
    } finally {
      setLoading(null)
    }
  }

  const handleImportSuccess = () => {
    refreshSkills()
    setView("list")
  }

  const handleEditSuccess = () => {
    refreshSkills()
    setView("list")
    setEditingSkillId(null)
  }

  if (view === "import") {
    return (
      <div>
        <div className="mb-6 space-y-2">
          <Button variant="secondary" size="sm" onClick={() => setView("list")}>
            <X className="mr-1 size-4" /> Abbrechen
          </Button>
          <h1 className="text-lg font-semibold">Skill importieren</h1>
        </div>
        <SkillImport onSuccess={handleImportSuccess} />
      </div>
    )
  }

  if (view === "edit" && editingSkillId) {
    return (
      <div>
        <div className="mb-6 space-y-2">
          <Button variant="secondary" size="sm" onClick={() => { setView("list"); setEditingSkillId(null) }}>
            <X className="mr-1 size-4" /> Abbrechen
          </Button>
          <h1 className="text-lg font-semibold">Skill bearbeiten</h1>
        </div>
        <SkillEditor skillId={editingSkillId} onSuccess={handleEditSuccess} />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Skills ({skills.length})</h1>
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
              <th className="px-4 py-2 text-left font-medium">Mode</th>
              <th className="px-4 py-2 text-left font-medium">Kategorie</th>
              <th className="px-4 py-2 text-center font-medium">Aktiv</th>
              <th className="px-4 py-2 text-center font-medium">Sortierung</th>
              <th className="px-4 py-2 text-right font-medium">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((skill) => (
              <tr key={skill.id} className="border-b last:border-0 hover:bg-muted/25">
                <td className="px-4 py-2 font-medium">{skill.name}</td>
                <td className="px-4 py-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{skill.slug}</code>
                </td>
                <td className="px-4 py-2">
                  <Badge variant={skill.mode === "quicktask" ? "default" : "secondary"}>
                    {skill.mode}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{skill.category ?? "—"}</td>
                <td className="px-4 py-2 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={loading === skill.id}
                    onClick={() => toggleActive(skill.id, skill.isActive)}
                  >
                    {skill.isActive
                      ? <Eye className="size-4 text-green-600" />
                      : <EyeOff className="size-4 text-muted-foreground" />
                    }
                  </Button>
                </td>
                <td className="px-4 py-2 text-center text-muted-foreground">{skill.sortOrder}</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => { setEditingSkillId(skill.id); setView("edit") }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      disabled={loading === skill.id}
                      onClick={() => deleteSkill(skill.id, skill.name)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {skills.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Keine Skills vorhanden. <button className="underline" onClick={() => setView("import")}>Ersten Skill importieren</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
