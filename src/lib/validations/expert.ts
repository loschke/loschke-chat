import { z } from "zod"

/** Zod schema for creating an expert (used by both public and admin routes) */
export const createExpertSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Nur Kleinbuchstaben, Zahlen und Bindestriche"),
  description: z.string().min(2).max(500),
  icon: z.string().max(50).nullable().optional(),
  systemPrompt: z.string().min(10).max(50000),
  skillSlugs: z.array(z.string()).max(20).default([]),
  modelPreference: z.string().max(100).nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  allowedTools: z.array(z.string()).max(50).default([]),
  mcpServerIds: z.array(z.string()).max(20).default([]),
  isPublic: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

/** Zod schema for updating an expert (all fields optional) */
export const updateExpertSchema = createExpertSchema.partial()
