import {
  MessageSquare,
  Bot,
  Sparkles,
  Brain,
  BrainCircuit,
  Lightbulb,
  Zap,
  FileText,
  BookOpen,
  GraduationCap,
  Users,
  Shield,
  Lock,
  Workflow,
  Layers,
  Settings,
  CheckCircle,
  MessageSquareQuote,
  ListChecks,
  Search,
  PenLine,
  LogIn,
  type LucideIcon,
} from "lucide-react"
import type { CustomLandingConfig, LandingIconName } from "@/config/landing"

const iconMap: Record<LandingIconName, LucideIcon> = {
  MessageSquare,
  Bot,
  Sparkles,
  Brain,
  BrainCircuit,
  Lightbulb,
  Zap,
  FileText,
  BookOpen,
  GraduationCap,
  Users,
  Shield,
  Lock,
  MessageSquareQuote,
  ListChecks,
  Search,
  PenLine,
  Workflow,
  Layers,
  Settings,
  CheckCircle,
}

interface CustomLandingProps {
  config: CustomLandingConfig
}

export function CustomLanding({ config }: CustomLandingProps) {
  return (
    <div className="px-6 py-16 sm:px-10 sm:py-24 md:px-16 lg:px-20 lg:py-32">
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
          {config.hero.title}
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-white/70 leading-relaxed">
          {config.hero.subline}
        </p>

        <div className="mt-10 flex justify-center">
          <a
            href="/api/auth/sign-in"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-base font-medium hover:opacity-90 transition-opacity"
          >
            <LogIn className="h-4 w-4" />
            {config.cta.loginLabel}
          </a>
        </div>
      </section>

      {config.intro && (
        <section className="mx-auto max-w-2xl mt-20 sm:mt-28">
          <p className="text-base sm:text-lg text-white/80 leading-relaxed whitespace-pre-line">
            {config.intro}
          </p>
        </section>
      )}

      <section className="mx-auto max-w-5xl mt-20 sm:mt-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {config.features.map((feature, i) => {
            const Icon = iconMap[feature.icon]
            return (
              <div
                key={i}
                className="card-elevated p-6 flex flex-col gap-3"
              >
                <Icon className="h-6 w-6 text-primary" />
                <h3 className="text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  {feature.text}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {config.footerNote && (
        <section className="mx-auto max-w-2xl mt-20 sm:mt-28 text-center">
          <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">
            {config.footerNote}
          </p>
        </section>
      )}
    </div>
  )
}
