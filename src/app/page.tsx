import { redirect } from "next/navigation"
import Link from "next/link"
import { brand } from "@/config/brand"
import { BrandWordmark } from "@/components/layout/brand-wordmark"
import { LandingPage } from "@/components/landing/landing-page"
import { getUser } from "@/lib/auth"
import { ChatShell } from "@/components/layout/chat-shell"
import { ChatView } from "@/components/chat/chat-view"
import { features } from "@/config/features"
import { ensureUserExists, getUserStatus, getUserRole } from "@/lib/db/queries/users"
import { isAdminRole } from "@/lib/admin-guard"
import { ExternalLink } from "lucide-react"
import { queryDesignLibrary } from "@/lib/db/design-library"

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; formula?: string; referenceImage?: string; originalPrompt?: string; expert?: string; mode?: string }>
}) {
  const user = await getUser()

  // Authenticated: check approval status before showing chat
  if (user) {
    await ensureUserExists({ logtoId: user.id, email: user.email, name: user.name })
    const [status, role] = await Promise.all([
      getUserStatus(user.id),
      getUserRole(user.id),
    ])

    if (status !== "approved" && !isAdminRole(role)) {
      redirect("/pending-approval")
    }

    const { project: projectId, formula: formulaId, referenceImage, originalPrompt, mode } = await searchParams

    // Load formula context if coming from Design Library
    let formulaContext: { name: string; templateText: string; legend: string } | undefined
    if (formulaId && features.designLibrary.enabled) {
      try {
        const rows = await queryDesignLibrary<{
          name: { de: string; en: string }
          templateText: string
          legend: { de: string; en: string } | null
        }>(
          `SELECT name, "templateText", legend FROM image_prompt_formulas WHERE id = $1 AND status = 'Fertig'`,
          [formulaId]
        )
        if (rows[0]) {
          formulaContext = {
            name: rows[0].name?.de ?? rows[0].name?.en ?? "Formel",
            templateText: rows[0].templateText,
            legend: rows[0].legend?.de ?? rows[0].legend?.en ?? "",
          }
        }
      } catch { /* Library not reachable — proceed without context */ }
    }

    return (
      <ChatShell>
        <ChatView
          userName={user.name}
          initialProjectId={projectId}
          formulaContext={formulaContext}
          promptOnlyMode={mode === "prompt-only"}
          referenceImageContext={referenceImage ? { url: referenceImage, originalPrompt: originalPrompt ?? "" } : undefined}
          ttsEnabled={features.tts.enabled}
          memoryEnabled={features.memory.enabled}
        />
      </ChatShell>
    )
  }

  // Unauthenticated: show landing page
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Viewport Frame — breiter als in der App Shell */}
      <div
        className="pointer-events-none fixed inset-0 z-50 border-[5px] border-primary sm:border-[8px]"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-border px-6 py-5 sm:px-8">
        <BrandWordmark />
        {brand.websiteUrl && (
          <a
            href={brand.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {brand.domain}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </header>

      {/* Landing Page */}
      <main className="flex-1">
        <LandingPage />
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <p className="micro-label">{brand.name}</p>
          <div className="flex items-center gap-4">
            <Link href="/impressum" className="micro-label hover:text-foreground transition-colors">
              Impressum
            </Link>
            <Link href="/datenschutz" className="micro-label hover:text-foreground transition-colors">
              Datenschutz
            </Link>
            <p className="micro-label">&copy; 2026</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
