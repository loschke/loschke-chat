import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

export const LANDING_ICON_NAMES = [
  "MessageSquare",
  "Bot",
  "Sparkles",
  "Brain",
  "BrainCircuit",
  "Lightbulb",
  "Zap",
  "FileText",
  "BookOpen",
  "GraduationCap",
  "Users",
  "Shield",
  "Lock",
  "Workflow",
  "Layers",
  "Settings",
  "CheckCircle",
  "MessageSquareQuote",
  "ListChecks",
  "Search",
  "PenLine",
] as const

export type LandingIconName = (typeof LANDING_ICON_NAMES)[number]

const featureSchema = z.object({
  icon: z.enum(LANDING_ICON_NAMES),
  title: z.string().min(1).max(60),
  text: z.string().min(1).max(280),
})

const starterPromptSchema = z.object({
  icon: z.enum(LANDING_ICON_NAMES),
  text: z.string().min(1).max(80),
  description: z.string().min(1).max(160),
  prompt: z.string().min(1).max(2000).optional(),
})

const customLandingSchema = z.object({
  companyName: z.string().min(1).max(80),
  hero: z.object({
    title: z.string().min(1).max(120),
    subline: z.string().min(1).max(220),
  }),
  intro: z.string().min(1).max(1200).optional(),
  features: z.array(featureSchema).min(1).max(8),
  starterPrompts: z.array(starterPromptSchema).min(1).max(8).optional(),
  cta: z.object({
    loginLabel: z.string().min(1).max(40).default("Anmelden"),
  }),
  footerNote: z.string().min(1).max(200).optional(),
})

export type CustomStarterPrompt = z.infer<typeof starterPromptSchema>

export type CustomLandingConfig = z.infer<typeof customLandingSchema>

const instance = process.env.LANDING_CONFIG?.trim()

function loadConfig(): CustomLandingConfig | null {
  if (!instance) return null

  if (!/^[a-z0-9-]+$/.test(instance)) {
    throw new Error(
      `LANDING_CONFIG must match /^[a-z0-9-]+$/, got "${instance}"`,
    )
  }

  const filePath = path.join(
    process.cwd(),
    "src/config/landings",
    `${instance}.json`,
  )

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `LANDING_CONFIG="${instance}" but file not found: ${filePath}`,
    )
  }

  const raw = fs.readFileSync(filePath, "utf-8")
  return customLandingSchema.parse(JSON.parse(raw))
}

export const customLanding: CustomLandingConfig | null = loadConfig()
