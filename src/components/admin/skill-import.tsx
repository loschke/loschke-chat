"use client"

import { useState, useRef } from "react"
import { Upload, FileText, Check, AlertCircle, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { HelpSection } from "@/components/shared/help-section"

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
  const zipInputRef = useRef<HTMLInputElement>(null)

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus("loading")
    setMessage("")

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/admin/skills/import-zip", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        setStatus("success")
        const resourceInfo = data.resourceCount > 0 ? ` mit ${data.resourceCount} Ressourcen` : ""
        setMessage(`Skill "${data.name}" (${data.slug})${resourceInfo} erfolgreich importiert.`)
        setTimeout(onSuccess, 1500)
      } else {
        setStatus("error")
        setMessage(data.error ?? "ZIP-Import fehlgeschlagen")
      }
    } catch {
      setStatus("error")
      setMessage("Netzwerkfehler. Bitte erneut versuchen.")
    } finally {
      // Reset file input so same file can be re-uploaded
      if (zipInputRef.current) zipInputRef.current.value = ""
    }
  }

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

    try {
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
    } catch {
      setStatus("error")
      setMessage("Netzwerkfehler. Bitte erneut versuchen.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Help */}
      <HelpSection title="So funktionieren Skills und der Import">
        <div className="space-y-3">
          <div>
            <p className="font-medium text-foreground">SKILL.md-Format</p>
            <p>Jeder Skill ist eine Markdown-Datei mit YAML-Frontmatter. Pflichtfelder im Frontmatter:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li><code className="rounded bg-muted px-1">name</code> — Anzeigename</li>
              <li><code className="rounded bg-muted px-1">slug</code> — Eindeutiger Bezeichner (kebab-case)</li>
              <li><code className="rounded bg-muted px-1">description</code> — Kurzbeschreibung fuer die Skill-Auswahl</li>
              <li><code className="rounded bg-muted px-1">mode</code> — <code className="rounded bg-muted px-1">skill</code> (frei im Chat) oder <code className="rounded bg-muted px-1">quicktask</code> (mit Formular)</li>
            </ul>
            <p className="mt-1.5">Optionale Felder: <code className="rounded bg-muted px-1">category</code>, <code className="rounded bg-muted px-1">icon</code> (Lucide-Name), <code className="rounded bg-muted px-1">outputAsArtifact</code>, <code className="rounded bg-muted px-1">temperature</code>, <code className="rounded bg-muted px-1">modelId</code>, <code className="rounded bg-muted px-1">fields</code> (nur bei Quicktasks).</p>
          </div>
          <div>
            <p className="font-medium text-foreground">ZIP-Import (Skills mit Ressourcen)</p>
            <p>Komplexe Skills (z.B. Design-Factories) koennen zusaetzliche Dateien mitbringen. Die ZIP-Datei muss diese Struktur haben:</p>
            <pre className="mt-1.5 rounded bg-muted p-2 text-xs leading-relaxed">{`skill-name/
├── SKILL.md              ← Pflicht
├── shared/               ← Basis-Assets (CSS, Shell-HTML)
├── specs/                ← Spezifikationen pro Typ
├── templates/            ← HTML-Vorlagen
├── references/           ← Hintergrunddokumente
└── examples/             ← Referenz-Implementierungen`}</pre>
            <p className="mt-1.5">Max 10 MB ZIP, nur Textdateien. Binaerdateien (Bilder, Fonts) werden uebersprungen. Existierende Ressourcen werden beim Re-Import ersetzt.</p>
          </div>
        </div>
      </HelpSection>

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
      <div className="flex gap-2">
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
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={handleZipUpload}
        />
        <Button variant="outline" size="sm" onClick={() => zipInputRef.current?.click()}>
          <Archive className="mr-1 size-4" /> ZIP hochladen
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
