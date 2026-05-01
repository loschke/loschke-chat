import { z } from "zod"

/** Shared category enum — single source of truth for model categories */
export const modelCategoryEnum = z.enum(["enterprise", "allrounder", "creative", "coding", "analysis", "fast", "image", "dsgvo-safe"])

/** Zod schema for creating/importing a model (used by admin routes) */
export const createModelSchema = z.object({
  modelId: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  provider: z.string().min(1).max(100),
  categories: z.array(modelCategoryEnum).min(1),
  region: z.enum(["eu", "us"]),
  contextWindow: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive(),
  isDefault: z.boolean().default(false),
  capabilities: z.object({
    vision: z.boolean().optional(),
    fileInput: z.boolean().optional(),
  }).nullish(),
  inputPrice: z.object({
    per1m: z.number().optional(),
  }).nullish(),
  outputPrice: z.object({
    per1m: z.number().optional(),
  }).nullish(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

/** Zod schema for updating a model (all fields optional) */
export const updateModelSchema = createModelSchema.partial()

/** Zod schema for bulk import (array of models) */
export const importModelsSchema = z.array(createModelSchema).min(1).max(100)
