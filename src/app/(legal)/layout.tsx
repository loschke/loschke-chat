import { brand } from "@/config/brand"
import { BrandWordmark } from "@/components/layout/brand-wordmark"
import { ExternalLink } from "lucide-react"
import Link from "next/link"

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Viewport Frame */}
      <div
        className="pointer-events-none fixed inset-0 z-[9999] border-[18px] border-primary box-border"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-border px-6 py-5 sm:px-8">
        <Link href="/">
          <BrandWordmark />
        </Link>
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

      {/* Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-8 sm:py-16">
          {children}
        </div>
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
