"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Check, AlertCircle } from "lucide-react"
import { useTheme } from "next-themes"
import CodeMirror from "@uiw/react-codemirror"
import { markdown } from "@codemirror/lang-markdown"
import { yaml } from "@codemirror/lang-yaml"
import { languages } from "@codemirror/language-data"
import { Button } from "@/components/ui/button"

interface SkillEditorProps {
  skillId: string
  onSuccess: () => void
}

export function SkillEditor({ skillId, onSuccess }: SkillEditorProps) {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const { resolvedTheme } = useTheme()
  const extensions = useMemo(() => [
    markdown({ defaultCodeLanguage: yaml(), codeLanguages: languages }),
  ], [])
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
        <div className="overflow-hidden rounded-md border">
          <CodeMirror
            value={content}
            onChange={handleEditorChange}
            extensions={extensions}
            theme={resolvedTheme === "dark" ? "dark" : "light"}
            basicSetup={{
              lineNumbers: true,
              foldGutter: false,
              highlightActiveLine: true,
            }}
            className="min-h-[500px] text-sm [&_.cm-editor]:min-h-[500px] [&_.cm-scroller]:overflow-auto"
          />
        </div>
      </div>

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
