import { eq, and, desc, count } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { projects } from "@/lib/db/schema/projects"
import { chats } from "@/lib/db/schema/chats"
import type { CreateProjectInput, UpdateProjectInput } from "@/types/project"

export async function createProject(userId: string, data: CreateProjectInput) {
  const db = getDb()
  const id = nanoid(12)
  const [project] = await db
    .insert(projects)
    .values({
      id,
      userId,
      name: data.name,
      description: data.description ?? null,
      instructions: data.instructions ?? null,
      defaultExpertId: data.defaultExpertId ?? null,
    })
    .returning()
  return project
}

/** Get all non-archived projects for a user with chat counts. */
export async function getUserProjects(userId: string) {
  const db = getDb()
  const result = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      defaultExpertId: projects.defaultExpertId,
      isArchived: projects.isArchived,
      updatedAt: projects.updatedAt,
      chatCount: count(chats.id),
    })
    .from(projects)
    .leftJoin(chats, eq(chats.projectId, projects.id))
    .where(and(eq(projects.userId, userId), eq(projects.isArchived, false)))
    .groupBy(projects.id)
    .orderBy(desc(projects.updatedAt))
  return result
}

/** Get project by ID. No userId scoping — ownership check in caller. */
export async function getProjectById(id: string) {
  const db = getDb()
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1)
  return project ?? null
}

/** Update project. userId-scoped for safety. */
export async function updateProject(id: string, userId: string, data: UpdateProjectInput) {
  const db = getDb()
  const [updated] = await db
    .update(projects)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .returning()
  return updated ?? null
}

/** Delete project. Unassigns all chats first, then deletes. */
export async function deleteProject(id: string, userId: string) {
  const db = getDb()

  // Unassign chats from project
  await db
    .update(chats)
    .set({ projectId: null, updatedAt: new Date() })
    .where(eq(chats.projectId, id))

  // Delete project
  const [deleted] = await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .returning()
  return deleted ?? null
}

/** Archive project. */
export async function archiveProject(id: string, userId: string) {
  return updateProject(id, userId, { isArchived: true })
}
