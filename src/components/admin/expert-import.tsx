"use client"

import { useState, useRef } from "react"
import { Upload, FileText, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

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
