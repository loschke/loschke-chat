"use client"

import { useState, useMemo, useCallback } from "react"
import { FileText, Check, AlertCircle } from "lucide-react"
import { useTheme } from "next-themes"
import CodeMirror from "@uiw/react-codemirror"
import { json } from "@codemirror/lang-json"
import { Button } from "@/components/ui/button"

const MODEL_TEMPLATE = JSON.stringify([
  {
    modelId: "anthropic/claude-sonnet-4-6",
    name: "Claude Sonnet 4",
    provider: "Anthropic",
    categories: ["allrounder"],
    region: "eu",
    contextWindow: 200000,
    maxOutputTokens: 16384,
    isDefault: true,
    capabilities: { vision: true, fileInput: true },
    isActive: true,
    sortOrder: 0,
  },
], null, 2)

interface ModelImportProps {
  onSuccess: () => void
}

export function ModelImport({ onSuccess }: ModelImportProps) {
  const [content, setContent] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const { resolvedTheme } = useTheme()
  const extensions = useMemo(() => [json()], [])
  const handleEditorChange = useCallback((val: string) => {
    setContent(val)
    setStatus("idle")
  }, [])

  const handleImport = async () => {
    if (!content.trim()) return

    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      setStatus("error")
      setMessage("Ungültiges JSON")
      return
    }

    setStatus("loading")
    setMessage("")

    try {
      const res = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus("success")
        setMessage(`${data.imported} Model(s) erfolgreich importiert.`)
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
        <Button variant="outline" size="sm" onClick={() => { setContent(MODEL_TEMPLATE); setStatus("idle") }}>
          <FileText className="mr-1 size-4" /> Model-Vorlage laden
        </Button>
      </div>

      {/* JSON Editor */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Model-Array (JSON)</label>
        <div className="overflow-hidden rounded-md border">
          <CodeMirror
            value={content}
            onChange={handleEditorChange}
            extensions={extensions}
            theme={resolvedTheme === "dark" ? "dark" : "light"}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
            }}
            className="min-h-[400px] text-sm [&_.cm-editor]:min-h-[400px] [&_.cm-scroller]:overflow-auto"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          JSON-Array mit Model-Konfigurationen. Pflichtfelder: modelId, name, provider, categories, region, contextWindow, maxOutputTokens.
        </p>
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
