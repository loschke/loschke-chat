import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth"
import { getUserStatus } from "@/lib/db/queries/users"
import { brand } from "@/config/brand"
import { BrandWordmark } from "@/components/layout/brand-wordmark"
import { Clock, XCircle } from "lucide-react"

export default async function PendingApprovalPage() {
  const user = await getUser()

  // Not authenticated — redirect to home (will show landing/sign-in)
  if (!user) {
    redirect("/")
  }

  // Check if user is actually still pending/rejected
  const status = await getUserStatus(user.id)
  if (status === "approved") {
    redirect("/")
  }

  const isRejected = status === "rejected"

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Viewport Frame */}
      <div
        className="pointer-events-none fixed inset-0 z-[9999] border-[18px] border-primary box-border"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="relative z-10 border-b border-border px-6 py-5 sm:px-8">
        <BrandWordmark />
      </header>

      {/* Content */}
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="mx-auto max-w-md space-y-6 text-center">
          {isRejected ? (
            <>
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="size-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold">Zugang nicht freigegeben</h1>
              <p className="text-muted-foreground">
                Dein Account wurde nicht freigegeben. Falls du denkst, dass dies ein Fehler ist,
                kontaktiere bitte den Administrator.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-500/10">
                <Clock className="size-8 text-amber-500" />
              </div>
              <h1 className="text-2xl font-bold">Freischaltung ausstehend</h1>
              <p className="text-muted-foreground">
                Dein Account wurde registriert und wartet auf Freischaltung durch einen Administrator.
                Du wirst benachrichtigt, sobald dein Zugang aktiviert wurde.
              </p>
            </>
          )}

          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Angemeldet als <span className="font-medium text-foreground">{user.email ?? user.name ?? "–"}</span>
          </div>

          <form action="/api/auth/sign-out" method="GET">
            <button
              type="submit"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Mit anderem Account anmelden
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{brand.name}</p>
          <p className="text-xs text-muted-foreground">&copy; 2026</p>
        </div>
      </footer>
    </div>
  )
}
