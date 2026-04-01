"use client"

import { useState, useCallback } from "react"
import { Plus, Trash2, Pencil, X, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ModelImport } from "./model-import"
import { ModelEditor } from "./model-editor"

interface ModelRow {
  id: string
  modelId: string
  name: string
  provider: string
  categories: string[]
  region: string
  isDefault: boolean
  isActive: boolean
  sortOrder: number
}

interface ModelsAdminProps {
  initialModels: ModelRow[]
}

export function ModelsAdmin({ initialModels }: ModelsAdminProps) {
  const [models, setModels] = useState(initialModels)
  const [view, setView] = useState<"list" | "import" | "edit">("list")
  const [editingModelId, setEditingModelId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const refreshModels = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/models")
      if (res.ok) {
        const data = await res.json()
        setModels(data)
      }
    } catch {
      // Refresh failed silently
    }
  }, [])

  const toggleActive = async (id: string, isActive: boolean) => {
    setLoading(id)
    try {
      const res = await fetch(`/api/admin/models/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (res.ok) await refreshModels()
    } catch {
      // Toggle failed
    } finally {
      setLoading(null)
    }
  }

  const deleteModel = async (id: string, name: string) => {
    if (!confirm(`Model "${name}" wirklich löschen?`)) return
    setLoading(id)
    try {
      const res = await fetch(`/api/admin/models/${id}`, { method: "DELETE" })
      if (res.ok) await refreshModels()
    } catch {
      // Delete failed
    } finally {
      setLoading(null)
    }
  }

  const handleImportSuccess = () => {
    refreshModels()
    setView("list")
  }

  const handleEditSuccess = () => {
    refreshModels()
    setView("list")
    setEditingModelId(null)
  }

  if (view === "import") {
    return (
      <div>
        <div className="mb-6 space-y-2">
          <Button variant="secondary" size="sm" onClick={() => setView("list")}>
            <X className="mr-1 size-4" /> Abbrechen
          </Button>
          <h1 className="text-lg font-semibold">Models importieren</h1>
        </div>
        <ModelImport onSuccess={handleImportSuccess} />
      </div>
    )
  }

  if (view === "edit" && editingModelId) {
    return (
      <div>
        <div className="mb-6 space-y-2">
          <Button variant="secondary" size="sm" onClick={() => { setView("list"); setEditingModelId(null) }}>
            <X className="mr-1 size-4" /> Abbrechen
          </Button>
          <h1 className="text-lg font-semibold">Model bearbeiten</h1>
        </div>
        <ModelEditor modelId={editingModelId} onSuccess={handleEditSuccess} />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Models ({models.length})</h1>
        <Button size="sm" onClick={() => setView("import")}>
          <Plus className="mr-1 size-4" /> Importieren
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium md:px-4">Name</th>
              <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Model ID</th>
              <th className="px-3 py-2 text-left font-medium md:px-4">Provider</th>
              <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Region</th>
              <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Kategorien</th>
              <th className="px-3 py-2 text-center font-medium md:px-4">Aktiv</th>
              <th className="px-3 py-2 text-right font-medium md:px-4">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model.id} className="border-b last:border-0 hover:bg-muted/25">
                <td className="px-3 py-2 font-medium md:px-4">
                  {model.name}
                  {model.isDefault && (
                    <Badge variant="outline" className="ml-2 text-xs">Default</Badge>
                  )}
                </td>
                <td className="hidden px-4 py-2 md:table-cell">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{model.modelId}</code>
                </td>
                <td className="px-3 py-2 text-muted-foreground md:px-4">{model.provider}</td>
                <td className="hidden px-4 py-2 md:table-cell">
                  <Badge variant="secondary">{model.region.toUpperCase()}</Badge>
                </td>
                <td className="hidden px-4 py-2 md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {model.categories.map((cat) => (
                      <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-center md:px-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={loading === model.id}
                    onClick={() => toggleActive(model.id, model.isActive)}
                  >
                    {model.isActive
                      ? <Eye className="size-4 text-success" />
                      : <EyeOff className="size-4 text-muted-foreground" />
                    }
                  </Button>
                </td>
                <td className="px-3 py-2 text-right md:px-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => { setEditingModelId(model.id); setView("edit") }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      disabled={loading === model.id}
                      onClick={() => deleteModel(model.id, model.name)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {models.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Keine Models vorhanden. <button className="underline" onClick={() => setView("import")}>Models importieren</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
