"use client"

import { useState, useEffect, useCallback } from "react"
import { Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarkdownEditor } from "@/components/shared/markdown-editor"
import { HelpSection } from "@/components/shared/help-section"

interface WorkspaceSkillEditorProps {
  skillId?: string
  initialContent?: string
  onSuccess: () => void
}

export function WorkspaceSkillEditor({ skillId, initialContent, onSuccess }: WorkspaceSkillEditorProps) {
  const isNew = !skillId
  const [content, setContent] = useState(initialContent ?? "")
  const [loading, setLoading] = useState(!isNew)
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleEditorChange = useCallback((val: string) => {
    setContent(val)
    setStatus("idle")
  }, [])

  useEffect(() => {
    if (!skillId) return
    async function loadSkill() {
      try {
        const res = await fetch(`/api/user/skills/${skillId}`)
        if (res.ok) {
          const data = await res.json()
          setContent(data.raw)
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
      const url = isNew ? "/api/user/skills" : `/api/user/skills/${skillId}`
      const method = isNew ? "POST" : "PUT"
      const body = { content }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus("success")
        setMessage(isNew ? "Skill erstellt." : "Skill aktualisiert.")
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

  if (loading) {
    return <p className="text-sm text-muted-foreground">Lade Skill...</p>
  }

  return (
    <div className="space-y-4">
      {isNew && (
        <HelpSection title="So erstellst du einen Skill">
          <div className="space-y-2">
            <p>Ein Skill ist eine Markdown-Datei mit YAML-Frontmatter. Der Frontmatter definiert Metadaten, der Markdown-Body enthalt die Anweisungen fuer die KI.</p>
            <p className="font-medium text-foreground">Pflichtfelder im Frontmatter:</p>
            <ul className="list-inside list-disc space-y-0.5">
              <li><code className="rounded bg-muted px-1">name</code> — Anzeigename des Skills</li>
              <li><code className="rounded bg-muted px-1">slug</code> — Eindeutiger Bezeichner (kebab-case, z.B. <code className="rounded bg-muted px-1">mein-skill</code>)</li>
              <li><code className="rounded bg-muted px-1">description</code> — Kurzbeschreibung</li>
              <li><code className="rounded bg-muted px-1">mode</code> — <code className="rounded bg-muted px-1">skill</code> (frei im Chat nutzbar) oder <code className="rounded bg-muted px-1">quicktask</code> (Formular mit definierten Feldern)</li>
            </ul>
            <p>Der Markdown-Body nach dem Frontmatter enthaelt die eigentlichen Anweisungen. Du kannst Ueberschriften, Listen und Codebeispiele verwenden.</p>
          </div>
        </HelpSection>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">SKILL.md (Frontmatter + Markdown)</label>
        <MarkdownEditor
          value={content}
          onChange={handleEditorChange}
        />
      </div>

      {/* Public visibility is admin-only — user skills are always private */}

      {message && (
        <div className={`flex items-center gap-2 rounded-md p-3 text-sm ${
          status === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        }`}>
          {status === "success" ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
          {message}
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={!content.trim() || status === "saving"}
      >
        {status === "saving" ? "Speichere..." : isNew ? "Erstellen" : "Speichern"}
      </Button>
    </div>
  )
}
