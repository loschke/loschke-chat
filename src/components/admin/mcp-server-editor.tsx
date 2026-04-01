"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Check, AlertCircle } from "lucide-react"
import { useTheme } from "next-themes"
import CodeMirror from "@uiw/react-codemirror"
import { json } from "@codemirror/lang-json"
import { Button } from "@/components/ui/button"

interface McpServerEditorProps {
  serverId: string
  onSuccess: () => void
}

export function McpServerEditor({ serverId, onSuccess }: McpServerEditorProps) {
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
    async function loadServer() {
      try {
        const res = await fetch(`/api/admin/mcp-servers/${serverId}`)
        if (res.ok) {
          const data = await res.json()
          const editable = {
            serverId: data.serverId,
            name: data.name,
            description: data.description,
            url: data.url,
            transport: data.transport,
            headers: data.headers,
            envVar: data.envVar,
            enabledTools: data.enabledTools,
            isActive: data.isActive,
            sortOrder: data.sortOrder,
          }
          setContent(JSON.stringify(editable, null, 2))
        } else {
          setMessage("MCP-Server konnte nicht geladen werden")
          setStatus("error")
        }
      } catch {
        setMessage("Netzwerkfehler beim Laden")
        setStatus("error")
      } finally {
        setLoading(false)
      }
    }
    loadServer()
  }, [serverId])

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
      const res = await fetch(`/api/admin/mcp-servers/${serverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus("success")
        setMessage("MCP-Server aktualisiert.")
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
    return <p className="text-sm text-muted-foreground">Lade MCP-Server...</p>
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">MCP-Server-Konfiguration (JSON)</label>
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
      </div>

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
        {status === "saving" ? "Speichere..." : "Speichern"}
      </Button>
    </div>
  )
}
