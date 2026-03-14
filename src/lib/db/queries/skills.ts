import { eq, and, asc } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { skills } from "@/lib/db/schema/skills"
import type { SkillFieldSchema } from "@/lib/db/schema/skills"

export interface CreateSkillInput {
  slug: string
  name: string
  description: string
  content: string
  mode?: "skill" | "quicktask"
  category?: string | null
  icon?: string | null
  fields?: SkillFieldSchema[]
  outputAsArtifact?: boolean
  temperature?: number | null
  modelId?: string | null
  isActive?: boolean
  sortOrder?: number
}

export interface UpdateSkillInput {
  name?: string
  slug?: string
  description?: string
  content?: string
  mode?: "skill" | "quicktask"
  category?: string | null
  icon?: string | null
  fields?: SkillFieldSchema[]
  outputAsArtifact?: boolean
  temperature?: number | null
  modelId?: string | null
  isActive?: boolean
  sortOrder?: number
}

/** Get all active skills, ordered by sortOrder */
export async function getActiveSkills() {
  const db = getDb()
  return db
    .select()
    .from(skills)
    .where(eq(skills.isActive, true))
    .orderBy(asc(skills.sortOrder), asc(skills.name))
}

/** Get a single skill by slug */
export async function getSkillBySlug(slug: string) {
  const db = getDb()
  const [skill] = await db
    .select()
    .from(skills)
    .where(eq(skills.slug, slug))
    .limit(1)
  return skill ?? null
}

/** Get a single skill by ID */
export async function getSkillById(id: string) {
  const db = getDb()
  const [skill] = await db
    .select()
    .from(skills)
    .where(eq(skills.id, id))
    .limit(1)
  return skill ?? null
}

/** Get all active quicktasks */
export async function getActiveQuicktasks() {
  const db = getDb()
  return db
    .select()
    .from(skills)
    .where(and(eq(skills.mode, "quicktask"), eq(skills.isActive, true)))
    .orderBy(asc(skills.sortOrder), asc(skills.name))
}

/** Get all skills including inactive (admin view) */
export async function getAllSkills() {
  const db = getDb()
  return db
    .select()
    .from(skills)
    .orderBy(asc(skills.mode), asc(skills.sortOrder), asc(skills.name))
}

/** Create a new skill */
export async function createSkill(data: CreateSkillInput) {
  const db = getDb()
  const id = nanoid(12)
  const [skill] = await db
    .insert(skills)
    .values({
      id,
      slug: data.slug,
      name: data.name,
      description: data.description,
      content: data.content,
      mode: data.mode ?? "skill",
      category: data.category ?? null,
      icon: data.icon ?? null,
      fields: data.fields ?? [],
      outputAsArtifact: data.outputAsArtifact ?? false,
      temperature: data.temperature ?? null,
      modelId: data.modelId ?? null,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    })
    .returning()
  return skill
}

/** Update an existing skill */
export async function updateSkill(id: string, data: UpdateSkillInput) {
  const db = getDb()
  const [updated] = await db
    .update(skills)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(skills.id, id))
    .returning()
  return updated ?? null
}

/** Delete a skill by ID */
export async function deleteSkill(id: string) {
  const db = getDb()
  const [deleted] = await db
    .delete(skills)
    .where(eq(skills.id, id))
    .returning()
  return deleted ?? null
}

/** Upsert skill by slug. Used for seeding and imports. */
export async function upsertSkillBySlug(data: CreateSkillInput) {
  const existing = await getSkillBySlug(data.slug)
  if (existing) {
    const updated = await updateSkill(existing.id, {
      name: data.name,
      description: data.description,
      content: data.content,
      mode: data.mode ?? "skill",
      category: data.category ?? null,
      icon: data.icon ?? null,
      fields: data.fields ?? [],
      outputAsArtifact: data.outputAsArtifact ?? false,
      temperature: data.temperature ?? null,
      modelId: data.modelId ?? null,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    })
    if (!updated) {
      // Race condition: skill was deleted between check and update
      return createSkill(data)
    }
    return updated
  }
  return createSkill(data)
}
