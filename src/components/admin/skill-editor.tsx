"use client"

import { useState, useEffect, useCallback } from "react"
import { Check, AlertCircle, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MarkdownEditor } from "@/components/shared/markdown-editor"

interface ResourceEntry {
  filename: string
  category: string
}

const CATEGORY_LABELS: Record<string, string> = {
  shared: "Shared",
  spec: "Spec",
  template: "Template",
  reference: "Reference",
  example: "Example",
  other: "Sonstige",
}

interface SkillEditorProps {
  skillId: string
  onSuccess: () => void
}

export function SkillEditor({ skillId, onSuccess }: SkillEditorProps) {
  const [content, setContent] = useState("")
  const [resources, setResources] = useState<ResourceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleEditorChange = useCallback((val: string) => {
    setContent(val)
    setStatus("idle")
  }, [])

  useEffect(() => {
    async function loadSkill() {
      try {
        const res = await fetch(`/api/admin/skills/${skillId}`)
        if (res.ok) {
          const data = await res.json()
          setContent(data.raw)
          if (data.resources?.length > 0) {
            setResources(data.resources)
          }
        } else {
          setMessage("Skill konnte nicht geladen werden")
          setStatus("error")
        }
      } catch {
        setMessage("Netzwerkfehler beim Laden")
        setStatus("error")
      } finally {
        setLoading(false)
      }
    }
    loadSkill()
  }, [skillId])

  const handleSave = async () => {
    setStatus("saving")
    setMessage("")

    try {
      const res = await fetch(`/api/admin/skills/${skillId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus("success")
        setMessage("Skill aktualisiert.")
        setTimeout(onSuccess, 1000)
      } else {
        setStatus("error")
        setMessage(data.error ?? "Speichern fehlgeschlagen")
      }
    } catch {
      setStatus("error")
      setMessage("Netzwerkfehler. Bitte erneut versuchen.")
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Lade Skill...</p>
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">SKILL.md-Content (Frontmatter + Markdown)</label>
        <MarkdownEditor
          value={content}
          onChange={handleEditorChange}
          minHeight="500px"
        />
      </div>

      {resources.length > 0 && (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">{resources.length} Ressourcen</h3>
          </div>
          <div className="space-y-1">
            {Object.entries(
              resources.reduce<Record<string, string[]>>((acc, r) => {
                const cat = r.category
                if (!acc[cat]) acc[cat] = []
                acc[cat].push(r.filename)
                return acc
              }, {})
            ).map(([category, filenames]) => (
              <div key={category} className="space-y-1">
                <Badge variant="secondary" className="text-xs">
                  {CATEGORY_LABELS[category] ?? category}
                </Badge>
                <ul className="ml-4 space-y-0.5 text-xs text-muted-foreground">
                  {filenames.map((f) => (
                    <li key={f}><code className="rounded bg-muted px-1 py-0.5">{f}</code></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Ressourcen werden per ZIP-Import aktualisiert.
          </p>
        </div>
      )}

      {message && (
        <div className={`flex items-center gap-2 rounded-md p-3 text-sm ${
          status === "success" ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"
        }`}>
          {status === "success" ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
          {message}
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={!content.trim() || status === "saving"}
      >
        {status === "saving" ? "Speichere..." : "Speichern"}
      </Button>
    </div>
  )
}
