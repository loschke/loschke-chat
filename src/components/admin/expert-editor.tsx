"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Check, AlertCircle } from "lucide-react"
import { useTheme } from "next-themes"
import CodeMirror from "@uiw/react-codemirror"
import { json } from "@codemirror/lang-json"
import { Button } from "@/components/ui/button"

interface ExpertEditorProps {
  expertId: string
  onSuccess: () => void
}

export function ExpertEditor({ expertId, onSuccess }: ExpertEditorProps) {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const { resolvedTheme } = useTheme()
  const extensions = useMemo(() => [json()], [])
  const handleEditorChange = useCallback((val: string) => {
    setContent(val)
    setStatus("idle")
  }, [])

  useEffect(() => {
    async function loadExpert() {
      try {
        const res = await fetch(`/api/admin/experts/${expertId}`)
        if (res.ok) {
          const data = await res.json()
          // Remove non-editable fields for display
          const { id: _id, createdAt: _c, updatedAt: _u, isGlobal: _g, userId: _uid, ...editable } = data
          setContent(JSON.stringify(editable, null, 2))
        } else {
          setMessage("Expert konnte nicht geladen werden")
          setStatus("error")
        }
      } catch {
        setMessage("Netzwerkfehler beim Laden")
        setStatus("error")
      } finally {
        setLoading(false)
      }
    }
    loadExpert()
  }, [expertId])

  const handleSave = async () => {
    setStatus("saving")
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
      const res = await fetch(`/api/admin/experts/${expertId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus("success")
        setMessage("Expert aktualisiert.")
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
    return <p className="text-sm text-muted-foreground">Lade Expert...</p>
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Expert JSON (alle editierbaren Felder)</label>
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
