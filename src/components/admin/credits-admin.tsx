"use client"

import { useState, useCallback } from "react"
import { Coins, Gift, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { formatCredits, getBalanceColorClass } from "@/lib/credits"
import { cn } from "@/lib/utils"

interface UserRow {
  logtoId: string
  email: string | null
  name: string | null
  creditsBalance: number
}

interface CreditsAdminProps {
  initialUsers: UserRow[]
}

export function CreditsAdmin({ initialUsers }: CreditsAdminProps) {
  const [users, setUsers] = useState(initialUsers)
  const [view, setView] = useState<"list" | "grant">("list")
  const [grantTarget, setGrantTarget] = useState<UserRow | null>(null)
  const [grantAmount, setGrantAmount] = useState("")
  const [grantDescription, setGrantDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const refreshUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/credits")
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
      }
    } catch {
      // Refresh failed silently
    }
  }, [])

  function startGrant(user: UserRow) {
    setGrantTarget(user)
    setGrantAmount("")
    setGrantDescription("")
    setMessage(null)
    setView("grant")
  }

  async function handleGrant() {
    if (!grantTarget) return
    const amount = parseInt(grantAmount, 10)
    if (!amount || amount <= 0) {
      setMessage({ type: "error", text: "Bitte einen positiven Betrag eingeben." })
      return
    }

    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logtoId: grantTarget.logtoId,
          amount,
          description: grantDescription || undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessage({ type: "success", text: `${formatCredits(amount)} Credits vergeben. Neuer Stand: ${formatCredits(data.newBalance)}` })
        await refreshUsers()
        setGrantAmount("")
        setGrantDescription("")
      } else {
        const err = await res.json().catch(() => ({ error: "Unbekannter Fehler" }))
        setMessage({ type: "error", text: err.error || "Fehler beim Vergeben." })
      }
    } catch {
      setMessage({ type: "error", text: "Netzwerkfehler." })
    } finally {
      setSubmitting(false)
    }
  }

  // Derive current target from users array so balance stays fresh after grant
  const currentTarget = grantTarget
    ? users.find((u) => u.logtoId === grantTarget.logtoId) ?? grantTarget
    : null

  if (view === "grant" && currentTarget) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView("list")}>
            <ArrowLeft className="size-4" />
          </Button>
          <h2 className="text-lg font-semibold">Credits vergeben</h2>
        </div>

        <div className="max-w-md space-y-4 rounded-lg border p-4">
          <div>
            <Label className="text-muted-foreground">User</Label>
            <p className="text-sm font-medium">{currentTarget.name || currentTarget.email || currentTarget.logtoId}</p>
            <p className="text-xs text-muted-foreground">{currentTarget.email}</p>
          </div>

          <div>
            <Label className="text-muted-foreground">Aktueller Stand</Label>
            <p className="text-sm font-medium">{currentTarget.creditsBalance.toLocaleString("de-DE")} Credits</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="grant-amount">Betrag</Label>
            <Input
              id="grant-amount"
              type="number"
              min="1"
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              placeholder="z.B. 100000"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="grant-desc">Beschreibung (optional)</Label>
            <Input
              id="grant-desc"
              value={grantDescription}
              onChange={(e) => setGrantDescription(e.target.value)}
              placeholder="z.B. Onboarding-Guthaben"
              maxLength={200}
            />
          </div>

          {message && (
            <p className={cn("text-sm", message.type === "success" ? "text-success" : "text-destructive")}>
              {message.text}
            </p>
          )}

          <Button onClick={handleGrant} disabled={submitting || !grantAmount}>
            <Gift className="mr-2 size-4" />
            {submitting ? "Wird vergeben..." : "Credits vergeben"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Credit-Verwaltung</h2>
        <Badge variant="outline" className="gap-1">
          <Coins className="size-3" />
          {users.length} User
        </Badge>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine User vorhanden.</p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Balance</th>
                <th className="px-4 py-2 font-medium text-right">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.logtoId} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <div className="font-medium">{user.name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{user.email || user.logtoId}</div>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        getBalanceColorClass(user.creditsBalance)
                      )}
                    >
                      <Coins className="size-3" />
                      {formatCredits(user.creditsBalance)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="outline" size="sm" onClick={() => startGrant(user)}>
                      <Gift className="mr-1.5 size-3" />
                      Grant
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
