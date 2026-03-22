import { brand } from "@/config/brand"
import { BrandWordmark } from "@/components/layout/brand-wordmark"
import { FeatureOverview } from "@/components/landing/feature-overview"
import { getUser } from "@/lib/auth"
import { ChatShell } from "@/components/layout/chat-shell"
import { ChatView } from "@/components/chat/chat-view"

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const user = await getUser()

  // Authenticated: show chat interface
  if (user) {
    const { project: projectId } = await searchParams
    return (
      <ChatShell>
        <ChatView userName={user.name} initialProjectId={projectId} />
      </ChatShell>
    )
  }

  // Unauthenticated: show landing page
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Viewport Frame */}
      <div
        className="pointer-events-none fixed inset-0 z-50 border-[5px] border-primary"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="relative z-10 border-b border-border px-6 py-5 sm:px-8">
        <BrandWordmark />
      </header>

      {/* Feature Overview */}
      <main className="flex-1">
        <FeatureOverview />
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <p className="micro-label">{brand.name} · Feature-Übersicht</p>
          <p className="micro-label">&copy; 2026</p>
        </div>
      </footer>
    </div>
  )
}
