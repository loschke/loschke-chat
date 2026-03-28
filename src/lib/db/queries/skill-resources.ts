import { eq, and, asc, inArray, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { skillResources } from "@/lib/db/schema/skill-resources"

export async function getResourcesBySkillId(skillId: string) {
  const db = getDb()
  return db
    .select()
    .from(skillResources)
    .where(eq(skillResources.skillId, skillId))
    .orderBy(asc(skillResources.category), asc(skillResources.sortOrder))
}

export async function getResourceManifest(skillId: string) {
  const db = getDb()
  return db
    .select({
      filename: skillResources.filename,
      category: skillResources.category,
    })
    .from(skillResources)
    .where(eq(skillResources.skillId, skillId))
    .orderBy(asc(skillResources.category), asc(skillResources.sortOrder))
}

export async function getResourcesByFilenames(skillId: string, filenames: string[]) {
  if (filenames.length === 0) return []
  const db = getDb()
  return db
    .select()
    .from(skillResources)
    .where(and(
      eq(skillResources.skillId, skillId),
      inArray(skillResources.filename, filenames)
    ))
}

export async function upsertResources(
  skillId: string,
  resources: Array<{ filename: string; content: string; category: string; sortOrder?: number }>
) {
  if (resources.length === 0) return []
  const db = getDb()
  const rows = resources.map((r, i) => ({
    id: nanoid(12),
    skillId,
    filename: r.filename,
    content: r.content,
    category: r.category,
    sortOrder: r.sortOrder ?? i,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
  return db
    .insert(skillResources)
    .values(rows)
    .onConflictDoUpdate({
      target: [skillResources.skillId, skillResources.filename],
      set: {
        content: sql`excluded.content`,
        category: sql`excluded.category`,
        sortOrder: sql`excluded.sort_order`,
        updatedAt: new Date(),
      },
    })
    .returning()
}

export async function deleteResourcesBySkillId(skillId: string) {
  const db = getDb()
  return db.delete(skillResources).where(eq(skillResources.skillId, skillId))
}
