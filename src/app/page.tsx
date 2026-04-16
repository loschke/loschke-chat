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
          voiceChatEnabled={features.voiceChat.enabled}
          designLibraryEnabled={features.designLibrary.enabled}
        />
      </ChatShell>
    )
  }

  // Unauthenticated: show landing page
  return (
    <div className="relative flex min-h-screen flex-col bg-[#151416] text-white">
      {/* Skip Link */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-6 focus:left-6 focus:z-[100000] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium">
        Zum Inhalt springen
      </a>

      {/* Fixed Frame Border — 18px Ecosystem Style */}
      <div
        className="pointer-events-none fixed inset-0 z-[9999] border-[18px] border-primary box-border"
        aria-hidden="true"
      />

      {/* Beta Banner */}
      <div className="fixed top-0 left-0 right-0 z-[99999] bg-primary text-white text-center text-xs sm:text-sm font-medium py-1.5 tracking-wide pointer-events-auto">
        <span className="opacity-90">Beta</span>
        <span className="mx-2 opacity-40">&middot;</span>
        <span className="opacity-70 font-light">{brand.name} ist in aktiver Entwicklung</span>
      </div>

      {/* Scrollable Content Wrapper */}
      <div className="p-[18px] pt-[calc(18px+32px)]">
        <div className="bg-[#151416] min-h-[calc(100vh-36px-32px)] relative">
          {/* Header — sticky inside frame */}
          <header className="sticky top-[18px] z-[999] flex items-center justify-between px-6 py-4 sm:px-10 md:px-16 lg:px-20 bg-[#151416]/90 backdrop-blur-sm border-b border-white/10">
            <BrandWordmark className="text-xl text-white [&>span]:text-white" />
            <a
              href="https://loschke.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
            >
              loschke.ai
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </header>

          {/* Landing Page */}
          <main id="main-content">
            <LandingPage />
          </main>

          {/* Footer — Accent Background */}
          <footer className="bg-primary text-primary-foreground px-6 py-12 sm:px-10 md:px-16 lg:px-20">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1fr_auto_auto_auto_auto] gap-12">
              {/* Brand */}
              <div className="max-w-[320px]">
                <div className="mb-3">
                  <BrandWordmark className="text-xl text-primary-foreground [&_span]:text-primary-foreground [&_span.text-primary]:text-primary-foreground/70" />
                </div>
                <p className="text-sm text-primary-foreground/70 leading-relaxed mb-2">
                  KI-Chat-Plattform mit Experten, Tools und Artifacts. Gebaut für den Arbeitsalltag.
                </p>
                <p className="text-xs text-primary-foreground/50">
                  Ein Projekt von Rico Loschke.
                </p>
              </div>

              {/* Plattform */}
              <div>
                <h4 className="text-xs sm:text-sm font-medium text-primary-foreground/60 tracking-[0.08em] uppercase mb-4">
                  Plattform
                </h4>
                <ul className="space-y-2">
                  <li>
                    <a href="/api/auth/sign-in" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                      Login
                    </a>
                  </li>
                  <li>
                    <a href="mailto:hallo@loschke.ai" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                      Kontakt
                    </a>
                  </li>
                </ul>
              </div>

              {/* Ökosystem */}
              <div>
                <h4 className="text-xs sm:text-sm font-medium text-primary-foreground/60 tracking-[0.08em] uppercase mb-4">
                  Ökosystem
                </h4>
                <ul className="space-y-2">
                  <li>
                    <a href="https://loschke.ai" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                      loschke.ai
                    </a>
                  </li>
                  <li>
                    <a href="https://unlearn.how" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                      unlearn.how
                    </a>
                  </li>
                  <li>
                    <a href="https://build.jetzt" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                      build.jetzt
                    </a>
                  </li>
                  <li>
                    <a href="https://lernen.diy" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                      lernen.diy
                    </a>
                  </li>
                </ul>
              </div>

              {/* Social */}
              <div>
                <h4 className="text-xs sm:text-sm font-medium text-primary-foreground/60 tracking-[0.08em] uppercase mb-4">
                  Social
                </h4>
                <ul className="space-y-2">
                  <li>
                    <a href="https://www.linkedin.com/in/rico-loschke/" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                      LinkedIn
                    </a>
                  </li>
                  <li>
                    <a href="https://www.youtube.com/@LoschkeAI" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                      YouTube
                    </a>
                  </li>
                  <li>
                    <a href="https://www.instagram.com/loschkeai/" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                      Instagram
                    </a>
                  </li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 className="text-xs sm:text-sm font-medium text-primary-foreground/60 tracking-[0.08em] uppercase mb-4">
                  Legal
                </h4>
                <ul className="space-y-2">
                  <li>
                    <Link href="/impressum" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                      Impressum
                    </Link>
                  </li>
                  <li>
                    <Link href="/datenschutz" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                      Datenschutz
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Copyright Bar */}
            <div className="pt-8 mt-8 border-t border-primary-foreground/20 flex flex-wrap justify-between gap-4">
              <p className="text-xs text-primary-foreground/50">
                &copy; {new Date().getFullYear()} Rico Loschke
              </p>
              <p className="text-xs text-primary-foreground/30">
                Built with Next.js & Claude
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
