"use client"

import { useState, useRef } from "react"
import { Upload, FileText, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const SKILL_TEMPLATE = `---
name: Skill-Name
slug: skill-slug
description: Kurze Beschreibung des Skills
mode: skill
---

# Anweisungen

Hier kommt der Skill-Content als Markdown.
`

const QUICKTASK_TEMPLATE = `---
name: Quicktask-Name
slug: quicktask-slug
description: Kurze Beschreibung
mode: quicktask
category: Content
icon: FileText
outputAsArtifact: true
temperature: 0.7
fields:
  - key: thema
    label: Thema
    type: textarea
    required: true
    placeholder: "Worum geht es?"
  - key: stil
    label: Stil
    type: select
    options:
      - Professionell
      - Locker
      - Akademisch
---

# Anweisungen

Erstelle basierend auf dem Thema "{{thema}}" im Stil "{{stil | default: "Professionell"}}" folgendes...
`

interface SkillImportProps {
  onSuccess: () => void
}

export function SkillImport({ onSuccess }: SkillImportProps) {
  const [content, setContent] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setContent(reader.result as string)
      setStatus("idle")
      setMessage("")
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!content.trim()) return

    setStatus("loading")
    setMessage("")

    const res = await fetch("/api/admin/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })

    const data = await res.json()

    if (res.ok) {
      setStatus("success")
      setMessage(`Skill "${data.name}" (${data.slug}) erfolgreich importiert.`)
      setTimeout(onSuccess, 1500)
    } else {
      setStatus("error")
      setMessage(data.error ?? "Import fehlgeschlagen")
    }
  }

  return (
    <div className="space-y-6">
      {/* Templates */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Vorlagen</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setContent(SKILL_TEMPLATE); setStatus("idle") }}>
            <FileText className="mr-1 size-4" /> Skill-Vorlage
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setContent(QUICKTASK_TEMPLATE); setStatus("idle") }}>
            <FileText className="mr-1 size-4" /> Quicktask-Vorlage
          </Button>
        </div>
      </div>

      {/* File upload */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md"
          className="hidden"
          onChange={handleFileUpload}
        />
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-1 size-4" /> .md-Datei hochladen
        </Button>
      </div>

      {/* Content textarea */}
      <div className="space-y-2">
        <label className="text-sm font-medium">SKILL.md-Content (Frontmatter + Markdown)</label>
        <Textarea
          value={content}
          onChange={(e) => { setContent(e.target.value); setStatus("idle") }}
          placeholder="---\nname: ...\nslug: ...\ndescription: ...\n---\n\n# Content..."
          className="min-h-[400px] font-mono text-sm"
        />
      </div>

      {/* Status message */}
      {message && (
        <div className={`flex items-center gap-2 rounded-md p-3 text-sm ${
          status === "success" ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"
        }`}>
          {status === "success" ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
          {message}
        </div>
      )}

      {/* Import button */}
      <Button
        onClick={handleImport}
        disabled={!content.trim() || status === "loading"}
      >
        {status === "loading" ? "Importiere..." : "Importieren"}
      </Button>
    </div>
  )
}
