import { eq, asc } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { models } from "@/lib/db/schema/models"

export interface CreateModelInput {
  modelId: string
  name: string
  provider: string
  categories: string[]
  region: string
  contextWindow: number
  maxOutputTokens: number
  isDefault?: boolean
  capabilities?: {
    vision?: boolean
    pdfInput?: "native" | "extract" | "none"
    reasoning?: boolean
    tools?: boolean
  } | null
  inputPrice?: { per1m?: number } | null
  outputPrice?: { per1m?: number } | null
  isActive?: boolean
  sortOrder?: number
}

export interface UpdateModelInput {
  modelId?: string
  name?: string
  provider?: string
  categories?: string[]
  region?: string
  contextWindow?: number
  maxOutputTokens?: number
  isDefault?: boolean
  capabilities?: {
    vision?: boolean
    pdfInput?: "native" | "extract" | "none"
    reasoning?: boolean
    tools?: boolean
  } | null
  inputPrice?: { per1m?: number } | null
  outputPrice?: { per1m?: number } | null
  isActive?: boolean
  sortOrder?: number
}

/** Get all active models, ordered by sortOrder */
export async function getActiveModels() {
  const db = getDb()
  return db
    .select()
    .from(models)
    .where(eq(models.isActive, true))
    .orderBy(asc(models.sortOrder), asc(models.name))
}

/** Get all models including inactive (admin view) */
export async function getAllModels() {
  const db = getDb()
  return db
    .select()
    .from(models)
    .orderBy(asc(models.sortOrder), asc(models.name))
}

/** Get a single model by its gateway model ID */
export async function getModelByModelId(modelId: string) {
  const db = getDb()
  const [model] = await db
    .select()
    .from(models)
    .where(eq(models.modelId, modelId))
    .limit(1)
  return model ?? null
}

/** Get a single model by DB primary key */
export async function getModelByPk(id: string) {
  const db = getDb()
  const [model] = await db
    .select()
    .from(models)
    .where(eq(models.id, id))
    .limit(1)
  return model ?? null
}

/** Create a new model */
export async function createModel(data: CreateModelInput) {
  const db = getDb()
  const id = nanoid(12)
  const [model] = await db
    .insert(models)
    .values({
      id,
      modelId: data.modelId,
      name: data.name,
      provider: data.provider,
      categories: data.categories,
      region: data.region,
      contextWindow: data.contextWindow,
      maxOutputTokens: data.maxOutputTokens,
      isDefault: data.isDefault ?? false,
      capabilities: data.capabilities ?? {},
      inputPrice: data.inputPrice ?? null,
      outputPrice: data.outputPrice ?? null,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    })
    .returning()
  return model
}

/** Update an existing model */
export async function updateModel(id: string, data: UpdateModelInput) {
  const db = getDb()
  const [updated] = await db
    .update(models)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(models.id, id))
    .returning()
  return updated ?? null
}

/** Delete a model by DB primary key */
export async function deleteModel(id: string) {
  const db = getDb()
  const [deleted] = await db
    .delete(models)
    .where(eq(models.id, id))
    .returning()
  return deleted ?? null
}

/** Upsert model by gateway model ID. Used for seeding and imports. */
export async function upsertModelByModelId(data: CreateModelInput) {
  const db = getDb()
  const id = nanoid(12)
  const [model] = await db
    .insert(models)
    .values({
      id,
      modelId: data.modelId,
      name: data.name,
      provider: data.provider,
      categories: data.categories,
      region: data.region,
      contextWindow: data.contextWindow,
      maxOutputTokens: data.maxOutputTokens,
      isDefault: data.isDefault ?? false,
      capabilities: data.capabilities ?? {},
      inputPrice: data.inputPrice ?? null,
      outputPrice: data.outputPrice ?? null,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    })
    .onConflictDoUpdate({
      target: models.modelId,
      set: {
        name: data.name,
        provider: data.provider,
        categories: data.categories,
        region: data.region,
        contextWindow: data.contextWindow,
        maxOutputTokens: data.maxOutputTokens,
        isDefault: data.isDefault ?? false,
        capabilities: data.capabilities ?? {},
        inputPrice: data.inputPrice ?? null,
        outputPrice: data.outputPrice ?? null,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        updatedAt: new Date(),
      },
    })
    .returning()
  return model
}
