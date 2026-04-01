"use client"

import { useState, useRef } from "react"
import { Upload, FileText, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { HelpSection } from "@/components/shared/help-section"

const EXPERT_TEMPLATE = JSON.stringify({
  name: "Expert-Name",
  slug: "expert-slug",
  description: "Kurze Beschreibung des Experts",
  icon: "Sparkles",
  systemPrompt: "Du bist ein spezialisierter Assistent für...\n\nDeine Aufgaben:\n- ...\n- ...",
  skillSlugs: [],
  modelPreference: null,
  temperature: 0.7,
  allowedTools: [],
  mcpServerIds: [],
  isPublic: true,
  sortOrder: 0,
}, null, 2)

interface ExpertImportProps {
  onSuccess: () => void
}

export function ExpertImport({ onSuccess }: ExpertImportProps) {
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

    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      setStatus("error")
      setMessage("Ungültiges JSON")
      return
    }

    try {
      const res = await fetch("/api/admin/experts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus("success")
        setMessage(`Expert "${data.name}" (${data.slug}) erfolgreich importiert.`)
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
      <HelpSection title="Expert-Format und Felder">
        <div className="space-y-3">
          <p>Experten werden als JSON importiert. Ein Expert definiert eine KI-Persona mit eigenem Verhalten, Zugriff auf bestimmte Tools und Skills.</p>
          <div>
            <p className="font-medium text-foreground">Beispiel: SEO-Berater</p>
            <pre className="mt-1.5 rounded bg-muted p-2 text-xs leading-relaxed">{`{
  "name": "SEO-Berater",
  "slug": "seo-berater",
  "description": "Analysiert und optimiert Inhalte fuer Suchmaschinen",
  "icon": "Search",
  "systemPrompt": "Du bist ein erfahrener SEO-Spezialist...\\n\\nDeine Aufgaben:\\n- Keyword-Analyse\\n- Content-Optimierung\\n- Technische SEO-Empfehlungen",
  "skillSlugs": ["content-factory"],
  "temperature": 0.5,
  "allowedTools": [],
  "mcpServerIds": [],
  "isPublic": true,
  "sortOrder": 10
}`}</pre>
          </div>
          <div>
            <p className="font-medium text-foreground">Felder im Detail</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li><code className="rounded bg-muted px-1">name</code>, <code className="rounded bg-muted px-1">slug</code>, <code className="rounded bg-muted px-1">description</code> — Pflicht. Slug muss eindeutig sein (kebab-case).</li>
              <li><code className="rounded bg-muted px-1">icon</code> — Lucide-Icon-Name (z.B. <code className="rounded bg-muted px-1">Sparkles</code>, <code className="rounded bg-muted px-1">Briefcase</code>, <code className="rounded bg-muted px-1">Code</code>)</li>
              <li><code className="rounded bg-muted px-1">systemPrompt</code> — Definiert Verhalten und Persoenlichkeit. Nutze <code className="rounded bg-muted px-1">\\n</code> fuer Zeilenumbrueche.</li>
              <li><code className="rounded bg-muted px-1">skillSlugs</code> — Array von Skill-Slugs die der Expert nutzen kann. Leer = alle Skills.</li>
              <li><code className="rounded bg-muted px-1">temperature</code> — Kreativitaet: 0.0 (praezise) bis 1.0 (kreativ). Standard: 0.7</li>
              <li><code className="rounded bg-muted px-1">allowedTools</code> — Tool-Filter. Leer = alle Tools verfuegbar.</li>
              <li><code className="rounded bg-muted px-1">mcpServerIds</code> — MCP-Server-IDs fuer externe Tool-Anbindung</li>
              <li><code className="rounded bg-muted px-1">sortOrder</code> — Reihenfolge in der Expert-Auswahl (niedrig = weiter oben)</li>
            </ul>
          </div>
        </div>
      </HelpSection>

      {/* Template */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Vorlage</h3>
        <Button variant="outline" size="sm" onClick={() => { setContent(EXPERT_TEMPLATE); setStatus("idle") }}>
          <FileText className="mr-1 size-4" /> Expert-Vorlage laden
        </Button>
      </div>

      {/* File upload */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileUpload}
        />
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-1 size-4" /> .json-Datei hochladen
        </Button>
      </div>

      {/* Content textarea */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Expert JSON</label>
        <Textarea
          value={content}
          onChange={(e) => { setContent(e.target.value); setStatus("idle") }}
          placeholder='{\n  "name": "...",\n  "slug": "...",\n  ...\n}'
          className="min-h-[400px] font-mono text-sm"
        />
      </div>

      {/* Status message */}
      {message && (
        <div className={`flex items-center gap-2 rounded-md p-3 text-sm ${
          status === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
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
