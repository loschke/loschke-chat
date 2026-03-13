import { eq, and, or, isNull, asc } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { experts } from "@/lib/db/schema/experts"
import type { CreateExpertInput, UpdateExpertInput } from "@/types/expert"

export async function createExpert(userId: string, data: CreateExpertInput) {
  const db = getDb()
  const id = nanoid(12)
  const [expert] = await db
    .insert(experts)
    .values({
      id,
      userId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      icon: data.icon ?? null,
      systemPrompt: data.systemPrompt,
      skillSlugs: data.skillSlugs ?? [],
      modelPreference: data.modelPreference ?? null,
      temperature: data.temperature ?? null,
      allowedTools: data.allowedTools ?? [],
      mcpServerIds: data.mcpServerIds ?? [],
      isPublic: data.isPublic ?? true,
      sortOrder: data.sortOrder ?? 0,
    })
    .returning()
  return expert
}

/** Create a global expert (no userId). Used for seeding. */
export async function createGlobalExpert(data: CreateExpertInput) {
  const db = getDb()
  const id = nanoid(12)
  const [expert] = await db
    .insert(experts)
    .values({
      id,
      userId: null,
      name: data.name,
      slug: data.slug,
      description: data.description,
      icon: data.icon ?? null,
      systemPrompt: data.systemPrompt,
      skillSlugs: data.skillSlugs ?? [],
      modelPreference: data.modelPreference ?? null,
      temperature: data.temperature ?? null,
      allowedTools: data.allowedTools ?? [],
      mcpServerIds: data.mcpServerIds ?? [],
      isPublic: data.isPublic ?? true,
      sortOrder: data.sortOrder ?? 0,
    })
    .returning()
  return expert
}

/** Get expert by ID. No userId scoping — global experts are readable by all. */
export async function getExpertById(id: string) {
  const db = getDb()
  const [expert] = await db
    .select()
    .from(experts)
    .where(eq(experts.id, id))
    .limit(1)
  return expert ?? null
}

/** Get expert by slug. */
export async function getExpertBySlug(slug: string) {
  const db = getDb()
  const [expert] = await db
    .select()
    .from(experts)
    .where(eq(experts.slug, slug))
    .limit(1)
  return expert ?? null
}

/** Get all experts visible to a user: global (userId IS NULL) + own. */
export async function getExperts(userId: string) {
  const db = getDb()
  return db
    .select()
    .from(experts)
    .where(or(isNull(experts.userId), eq(experts.userId, userId)))
    .orderBy(asc(experts.sortOrder), asc(experts.name))
}

/** Update expert. Only own experts (not global). */
export async function updateExpert(id: string, userId: string, data: UpdateExpertInput) {
  const db = getDb()
  const [updated] = await db
    .update(experts)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(experts.id, id), eq(experts.userId, userId)))
    .returning()
  return updated ?? null
}

/** Delete expert. Only own experts (not global). */
export async function deleteExpert(id: string, userId: string) {
  const db = getDb()
  const [deleted] = await db
    .delete(experts)
    .where(and(eq(experts.id, id), eq(experts.userId, userId)))
    .returning()
  return deleted ?? null
}

/** Upsert expert by slug. Used for idempotent seeding. */
export async function upsertExpertBySlug(data: CreateExpertInput) {
  const db = getDb()
  const existing = await getExpertBySlug(data.slug)
  if (existing) {
    const [updated] = await db
      .update(experts)
      .set({
        name: data.name,
        description: data.description,
        icon: data.icon ?? null,
        systemPrompt: data.systemPrompt,
        skillSlugs: data.skillSlugs ?? [],
        modelPreference: data.modelPreference ?? null,
        temperature: data.temperature ?? null,
        allowedTools: data.allowedTools ?? [],
        mcpServerIds: data.mcpServerIds ?? [],
        isPublic: data.isPublic ?? true,
        sortOrder: data.sortOrder ?? 0,
        updatedAt: new Date(),
      })
      .where(eq(experts.slug, data.slug))
      .returning()
    return updated
  }
  return createGlobalExpert(data)
}
