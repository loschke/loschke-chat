import { z } from "zod"

/** Zod schema for creating a project */
export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  instructions: z.string().max(5000).optional(),
  defaultExpertId: z.string().max(21).regex(/^[a-zA-Z0-9_-]+$/).optional(),
})

/** Zod schema for updating a project (all fields optional) */
export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  instructions: z.string().max(5000).nullable().optional(),
  defaultExpertId: z.string().max(21).regex(/^[a-zA-Z0-9_-]+$/).nullable().optional(),
  isArchived: z.boolean().optional(),
})
