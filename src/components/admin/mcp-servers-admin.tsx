"use client"

import { useState, useCallback } from "react"
import { Plus, Trash2, Pencil, X, Eye, EyeOff, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { McpServerImport } from "./mcp-server-import"
import { McpServerEditor } from "./mcp-server-editor"

interface McpServerRow {
  id: string
  serverId: string
  name: string
  description: string | null
  url: string
  transport: string
  envVar: string | null
  isActive: boolean
  sortOrder: number
}

interface McpServersAdminProps {
  initialServers: McpServerRow[]
}

export function McpServersAdmin({ initialServers }: McpServersAdminProps) {
  const [servers, setServers] = useState(initialServers)
  const [view, setView] = useState<"list" | "import" | "edit">("list")
  const [editingServerId, setEditingServerId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [healthResults, setHealthResults] = useState<Record<string, { status: string; toolCount?: number; message?: string }>>({})

  const refreshServers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/mcp-servers")
      if (res.ok) {
        const data = await res.json()
        setServers(data)
      }
    } catch {
      // Refresh failed silently
    }
  }, [])

  const toggleActive = async (id: string, isActive: boolean) => {
    setLoading(id)
    try {
      const res = await fetch(`/api/admin/mcp-servers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (res.ok) await refreshServers()
    } catch {
      // Toggle failed
    } finally {
      setLoading(null)
    }
  }

  const deleteServer = async (id: string, name: string) => {
    if (!confirm(`MCP-Server "${name}" wirklich löschen?`)) return
    setLoading(id)
    try {
      const res = await fetch(`/api/admin/mcp-servers/${id}`, { method: "DELETE" })
      if (res.ok) await refreshServers()
    } catch {
      // Delete failed
    } finally {
      setLoading(null)
    }
  }

  const checkHealth = async (id: string) => {
    setLoading(id)
    setHealthResults((prev) => ({ ...prev, [id]: { status: "checking" } }))
    try {
      const res = await fetch(`/api/admin/mcp-servers/${id}/health`, { method: "POST" })
      const data = await res.json()
      setHealthResults((prev) => ({ ...prev, [id]: data }))
    } catch {
      setHealthResults((prev) => ({ ...prev, [id]: { status: "error", message: "Netzwerkfehler" } }))
    } finally {
      setLoading(null)
    }
  }

  const handleImportSuccess = () => {
    refreshServers()
    setView("list")
  }

  const handleEditSuccess = () => {
    refreshServers()
    setView("list")
    setEditingServerId(null)
  }

  if (view === "import") {
    return (
      <div>
        <div className="mb-6 space-y-2">
          <Button variant="secondary" size="sm" onClick={() => setView("list")}>
            <X className="mr-1 size-4" /> Abbrechen
          </Button>
          <h1 className="text-lg font-semibold">MCP-Server importieren</h1>
        </div>
        <McpServerImport onSuccess={handleImportSuccess} />
      </div>
    )
  }

  if (view === "edit" && editingServerId) {
    return (
      <div>
        <div className="mb-6 space-y-2">
          <Button variant="secondary" size="sm" onClick={() => { setView("list"); setEditingServerId(null) }}>
            <X className="mr-1 size-4" /> Abbrechen
          </Button>
          <h1 className="text-lg font-semibold">MCP-Server bearbeiten</h1>
        </div>
        <McpServerEditor serverId={editingServerId} onSuccess={handleEditSuccess} />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">MCP-Server ({servers.length})</h1>
        <Button size="sm" onClick={() => setView("import")}>
          <Plus className="mr-1 size-4" /> Importieren
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium md:px-4">Name</th>
              <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Server ID</th>
              <th className="px-3 py-2 text-left font-medium md:px-4">Transport</th>
              <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Env Gate</th>
              <th className="hidden px-4 py-2 text-center font-medium md:table-cell">Health</th>
              <th className="px-3 py-2 text-center font-medium md:px-4">Aktiv</th>
              <th className="px-3 py-2 text-right font-medium md:px-4">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {servers.map((server) => {
              const health = healthResults[server.id]
              return (
                <tr key={server.id} className="border-b last:border-0 hover:bg-muted/25">
                  <td className="px-3 py-2 font-medium md:px-4">
                    {server.name}
                    {server.description && (
                      <p className="text-xs text-muted-foreground">{server.description}</p>
                    )}
                  </td>
                  <td className="hidden px-4 py-2 md:table-cell">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{server.serverId}</code>
                  </td>
                  <td className="px-3 py-2 md:px-4">
                    <Badge variant="secondary">{server.transport.toUpperCase()}</Badge>
                  </td>
                  <td className="hidden px-4 py-2 text-muted-foreground md:table-cell">
                    {server.envVar ? (
                      <code className="text-xs">{server.envVar}</code>
                    ) : (
                      <span className="text-xs">—</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-2 text-center md:table-cell">
                    {health?.status === "ok" ? (
                      <Badge variant="outline" className="text-xs text-success">
                        {health.toolCount} Tools
                      </Badge>
                    ) : health?.status === "error" ? (
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="outline" className="text-xs text-destructive">
                          Fehler
                        </Badge>
                        {health.message && (
                          <span className="max-w-48 truncate text-[10px] text-destructive" title={health.message}>
                            {health.message}
                          </span>
                        )}
                      </div>
                    ) : health?.status === "checking" ? (
                      <span className="text-xs text-muted-foreground">...</span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={loading === server.id}
                        onClick={() => checkHealth(server.id)}
                        title="Health Check"
                      >
                        <Heart className="size-4 text-muted-foreground" />
                      </Button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center md:px-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={loading === server.id}
                      onClick={() => toggleActive(server.id, server.isActive)}
                    >
                      {server.isActive
                        ? <Eye className="size-4 text-success" />
                        : <EyeOff className="size-4 text-muted-foreground" />
                      }
                    </Button>
                  </td>
                  <td className="px-3 py-2 text-right md:px-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => { setEditingServerId(server.id); setView("edit") }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        disabled={loading === server.id}
                        onClick={() => deleteServer(server.id, server.name)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {servers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Keine MCP-Server vorhanden. <button className="underline" onClick={() => setView("import")}>Server importieren</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
