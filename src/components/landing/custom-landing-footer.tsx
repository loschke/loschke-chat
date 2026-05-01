import Link from "next/link"
import { BrandWordmark } from "@/components/layout/brand-wordmark"
import type { CustomLandingConfig } from "@/config/landing"

interface CustomLandingFooterProps {
  config: CustomLandingConfig
}

export function CustomLandingFooter({ config }: CustomLandingFooterProps) {
  return (
    <footer className="bg-primary text-primary-foreground px-6 py-12 sm:px-10 md:px-16 lg:px-20">
      <div className="flex flex-wrap items-start justify-between gap-8">
        <div>
          <BrandWordmark className="text-xl text-primary-foreground [&_span]:text-primary-foreground [&_span.text-primary]:text-primary-foreground/70" />
        </div>

        <ul className="flex flex-wrap gap-6">
          <li>
            <a
              href="/api/auth/sign-in"
              className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              {config.cta.loginLabel}
            </a>
          </li>
          <li>
            <Link
              href="/impressum"
              className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              Impressum
            </Link>
          </li>
          <li>
            <Link
              href="/datenschutz"
              className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              Datenschutz
            </Link>
          </li>
        </ul>
      </div>

      <div className="pt-8 mt-8 border-t border-primary-foreground/20">
        <p className="text-xs text-primary-foreground/50">
          &copy; {new Date().getFullYear()} {config.companyName}
        </p>
      </div>
    </footer>
  )
}
