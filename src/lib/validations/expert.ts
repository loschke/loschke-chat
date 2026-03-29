import { z } from "zod"

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{1,2}$/
const SLUG_ERROR = "Nur Kleinbuchstaben, Zahlen und Bindestriche. Muss mit Buchstabe/Zahl beginnen und enden."

/** Zod schema for creating an expert (used by both public and admin routes) */
export const createExpertSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(80).regex(SLUG_REGEX, SLUG_ERROR),
  description: z.string().min(5).max(500),
  icon: z.string().max(50).regex(/^[A-Za-z][A-Za-z0-9]*$/, "Ungültiger Icon-Name").nullable().optional(),
  systemPrompt: z.string().min(10).max(10000),
  skillSlugs: z.array(z.string().max(80)).max(20).default([]),
  modelPreference: z.string().max(100).nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  allowedTools: z.array(z.string().max(80)).max(50).default([]),
  mcpServerIds: z.array(z.string().max(21)).max(20).default([]),
  isPublic: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

/** Admin schema — higher limits for system prompts */
export const createExpertAdminSchema = createExpertSchema.extend({
  systemPrompt: z.string().min(10).max(50000),
  isPublic: z.boolean().default(true),
})

/** Zod schema for updating an expert (all fields optional) */
export const updateExpertSchema = createExpertSchema.partial()

/** Admin update schema */
export const updateExpertAdminSchema = createExpertAdminSchema.partial()
