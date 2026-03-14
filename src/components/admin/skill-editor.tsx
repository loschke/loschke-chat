"use client"

import { useState, useEffect } from "react"
import { Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface SkillEditorProps {
  skillId: string
  onSuccess: () => void
}

export function SkillEditor({ skillId, onSuccess }: SkillEditorProps) {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  useEffect(() => {
    async function loadSkill() {
      const res = await fetch(`/api/admin/skills/${skillId}`)
      if (res.ok) {
        const data = await res.json()
        setContent(data.raw)
      } else {
        setMessage("Skill konnte nicht geladen werden")
        setStatus("error")
      }
      setLoading(false)
    }
    loadSkill()
  }, [skillId])

  const handleSave = async () => {
    setStatus("saving")
    setMessage("")

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
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Lade Skill...</p>
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">SKILL.md-Content (Frontmatter + Markdown)</label>
        <Textarea
          value={content}
          onChange={(e) => { setContent(e.target.value); setStatus("idle") }}
          className="min-h-[500px] font-mono text-sm"
        />
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
