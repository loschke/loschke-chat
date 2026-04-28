"use client"

import { useState, useCallback } from "react"
import { ShieldCheck, Shield, User, Clock, CheckCircle, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface UserRow {
  authSub: string
  email: string | null
  name: string | null
  role: string
  status: string
  creditsBalance: number
  createdAt: Date
  approvedAt: Date | null
}

interface UsersAdminProps {
  initialUsers: UserRow[]
}

const ROLE_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  superadmin: { label: "Superadmin", variant: "default" },
  admin: { label: "Admin", variant: "secondary" },
  user: { label: "User", variant: "outline" },
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof Clock }> = {
  pending: { label: "Ausstehend", variant: "outline", icon: Clock },
  approved: { label: "Freigegeben", variant: "secondary", icon: CheckCircle },
  rejected: { label: "Abgelehnt", variant: "destructive", icon: XCircle },
}

type StatusFilter = "all" | "pending" | "approved" | "rejected"

export function UsersAdmin({ initialUsers }: UsersAdminProps) {
  const [users, setUsers] = useState(initialUsers)
  const [updating, setUpdating] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

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

  async function handleRoleChange(authSub: string, newRole: "user" | "admin") {
    setUpdating(authSub)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(authSub)}/role`, {
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

  async function handleStatusChange(authSub: string, newStatus: "approved" | "rejected") {
    setUpdating(authSub)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(authSub)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        const label = newStatus === "approved" ? "freigegeben" : "abgelehnt"
        setMessage({ type: "success", text: `Benutzer erfolgreich ${label}.` })
        await refreshUsers()
      } else {
        const err = await res.json().catch(() => ({ error: "Unbekannter Fehler" }))
        setMessage({ type: "error", text: err.error || "Fehler beim Aendern des Status." })
      }
    } catch {
      setMessage({ type: "error", text: "Netzwerkfehler." })
    } finally {
      setUpdating(null)
    }
  }

  const pendingCount = users.filter((u) => u.status === "pending").length
  const filteredUsers = statusFilter === "all" ? users : users.filter((u) => u.status === statusFilter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Benutzerverwaltung</h1>
        <span className="text-sm text-muted-foreground">{users.length} Benutzer</span>
      </div>

      {pendingCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <Clock className="size-4" />
          {pendingCount} {pendingCount === 1 ? "Benutzer wartet" : "Benutzer warten"} auf Freischaltung
        </div>
      )}

      {message && (
        <div
          className={`rounded-md px-3 py-2 text-sm ${
            message.type === "success"
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex gap-1">
        {(["all", "pending", "approved", "rejected"] as const).map((filter) => (
          <Button
            key={filter}
            variant={statusFilter === filter ? "default" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter(filter)}
          >
            {filter === "all" ? "Alle" : STATUS_BADGE[filter].label}
            {filter === "pending" && pendingCount > 0 && (
              <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 text-xs">{pendingCount}</span>
            )}
          </Button>
        ))}
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">E-Mail</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-left font-medium">Rolle</th>
              <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Registriert</th>
              <th className="px-4 py-2 text-right font-medium">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const roleBadge = ROLE_BADGE[user.role] ?? ROLE_BADGE.user
              const statusBadge = STATUS_BADGE[user.status] ?? STATUS_BADGE.pending
              const StatusIcon = statusBadge.icon
              const isSuperAdmin = user.role === "superadmin"
              const isPending = user.status === "pending"
              const isRejected = user.status === "rejected"

              return (
                <tr key={user.authSub} className={`border-b last:border-0 ${isPending ? "bg-amber-500/5" : ""}`}>
                  <td className="px-4 py-2.5">
                    {user.name || <span className="text-muted-foreground">–</span>}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {user.email || "–"}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={statusBadge.variant}>
                      <StatusIcon className="mr-1 size-3" />
                      {statusBadge.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={roleBadge.variant}>
                      {isSuperAdmin && <ShieldCheck className="mr-1 size-3" />}
                      {user.role === "admin" && <Shield className="mr-1 size-3" />}
                      {user.role === "user" && <User className="mr-1 size-3" />}
                      {roleBadge.label}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-2.5 text-muted-foreground md:table-cell">
                    {new Date(user.createdAt).toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {isSuperAdmin ? (
                      <span className="text-xs text-muted-foreground">ENV-geschuetzt</span>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        {(isPending || isRejected) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-success hover:text-success"
                            disabled={updating === user.authSub}
                            onClick={() => handleStatusChange(user.authSub, "approved")}
                          >
                            <CheckCircle className="mr-1 size-4" />
                            Freigeben
                          </Button>
                        )}
                        {isPending && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={updating === user.authSub}
                            onClick={() => handleStatusChange(user.authSub, "rejected")}
                          >
                            <XCircle className="mr-1 size-4" />
                            Ablehnen
                          </Button>
                        )}
                        {user.status === "approved" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={updating === user.authSub}
                              >
                                {updating === user.authSub ? "..." : "Verwalten"}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {user.role !== "admin" && (
                                <DropdownMenuItem onClick={() => handleRoleChange(user.authSub, "admin")}>
                                  <Shield className="mr-2 size-4" /> Zum Admin machen
                                </DropdownMenuItem>
                              )}
                              {user.role !== "user" && (
                                <DropdownMenuItem onClick={() => handleRoleChange(user.authSub, "user")}>
                                  <User className="mr-2 size-4" /> Admin entfernen
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleStatusChange(user.authSub, "rejected")}
                              >
                                <XCircle className="mr-2 size-4" /> Zugang sperren
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Keine Benutzer mit diesem Status gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
