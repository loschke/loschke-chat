"use client"

import { useState, useCallback } from "react"
import { ShieldCheck, Shield, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface UserRow {
  logtoId: string
  email: string | null
  name: string | null
  role: string
  creditsBalance: number
  createdAt: Date
}

interface UsersAdminProps {
  initialUsers: UserRow[]
}

const ROLE_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  superadmin: { label: "Superadmin", variant: "default" },
  admin: { label: "Admin", variant: "secondary" },
  user: { label: "User", variant: "outline" },
}

export function UsersAdmin({ initialUsers }: UsersAdminProps) {
  const [users, setUsers] = useState(initialUsers)
  const [updating, setUpdating] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const refreshUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
      }
    } catch {
      // Refresh failed silently
    }
  }, [])

  async function handleRoleChange(logtoId: string, newRole: "user" | "admin") {
    setUpdating(logtoId)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(logtoId)}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })
      if (res.ok) {
        setMessage({ type: "success", text: `Rolle erfolgreich auf "${newRole}" geaendert.` })
        await refreshUsers()
      } else {
        const err = await res.json().catch(() => ({ error: "Unbekannter Fehler" }))
        setMessage({ type: "error", text: err.error || "Fehler beim Aendern der Rolle." })
      }
    } catch {
      setMessage({ type: "error", text: "Netzwerkfehler." })
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Benutzerverwaltung</h1>
        <span className="text-sm text-muted-foreground">{users.length} Benutzer</span>
      </div>

      {message && (
        <div
          className={`rounded-md px-3 py-2 text-sm ${
            message.type === "success"
              ? "bg-green-500/10 text-green-700 dark:text-green-400"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">E-Mail</th>
              <th className="px-4 py-2 text-left font-medium">Rolle</th>
              <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Registriert</th>
              <th className="px-4 py-2 text-right font-medium">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const badge = ROLE_BADGE[user.role] ?? ROLE_BADGE.user
              const isSuperAdmin = user.role === "superadmin"

              return (
                <tr key={user.logtoId} className="border-b last:border-0">
                  <td className="px-4 py-2.5">
                    {user.name || <span className="text-muted-foreground">–</span>}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {user.email || "–"}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={badge.variant}>
                      {isSuperAdmin && <ShieldCheck className="mr-1 size-3" />}
                      {user.role === "admin" && <Shield className="mr-1 size-3" />}
                      {user.role === "user" && <User className="mr-1 size-3" />}
                      {badge.label}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-2.5 text-muted-foreground md:table-cell">
                    {new Date(user.createdAt).toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {isSuperAdmin ? (
                      <span className="text-xs text-muted-foreground">ENV-geschuetzt</span>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={updating === user.logtoId}
                          >
                            {updating === user.logtoId ? "..." : "Rolle aendern"}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {user.role !== "admin" && (
                            <DropdownMenuItem onClick={() => handleRoleChange(user.logtoId, "admin")}>
                              <Shield className="mr-2 size-4" /> Zum Admin machen
                            </DropdownMenuItem>
                          )}
                          {user.role !== "user" && (
                            <DropdownMenuItem onClick={() => handleRoleChange(user.logtoId, "user")}>
                              <User className="mr-2 size-4" /> Admin entfernen
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
