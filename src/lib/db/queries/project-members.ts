import { eq, and, ne } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { projectMembers } from "@/lib/db/schema/project-members"
import { projects } from "@/lib/db/schema/projects"
import { users } from "@/lib/db/schema/users"

/** Add a member to a project. Idempotent — returns existing if already member. */
export async function addProjectMember(
  projectId: string,
  userId: string,
  role: "owner" | "editor",
  addedBy: string
) {
  const db = getDb()

  const [existing] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1)

  if (existing) return existing

  const id = nanoid(12)
  const [member] = await db
    .insert(projectMembers)
    .values({ id, projectId, userId, role, addedBy })
    .returning()
  return member
}

/** Remove a member from a project by member ID. */
export async function removeProjectMember(memberId: string, projectId: string) {
  const db = getDb()
  const [deleted] = await db
    .delete(projectMembers)
    .where(and(eq(projectMembers.id, memberId), eq(projectMembers.projectId, projectId)))
    .returning()
  return deleted ?? null
}

/** Get all members of a project with user info (name, email). */
export async function getProjectMembers(projectId: string) {
  const db = getDb()
  return db
    .select({
      id: projectMembers.id,
      userId: projectMembers.userId,
      role: projectMembers.role,
      addedBy: projectMembers.addedBy,
      createdAt: projectMembers.createdAt,
      name: users.name,
      email: users.email,
    })
    .from(projectMembers)
    .innerJoin(users, eq(users.authSub, projectMembers.userId))
    .where(eq(projectMembers.projectId, projectId))
}

/** Check if a user is a member of a project. */
export async function isProjectMember(projectId: string, userId: string): Promise<boolean> {
  const db = getDb()
  const [row] = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1)
  return !!row
}

/** Get a user's role in a project, or null if not a member. */
export async function getProjectMemberRole(
  projectId: string,
  userId: string
): Promise<string | null> {
  const db = getDb()
  const [row] = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1)
  return row?.role ?? null
}

/** Get projects shared with a user (where user is member but NOT owner). */
export async function getUserSharedProjects(userId: string) {
  const db = getDb()
  return db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      defaultExpertId: projects.defaultExpertId,
      isArchived: projects.isArchived,
      updatedAt: projects.updatedAt,
      role: projectMembers.role,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .innerJoin(users, eq(users.authSub, projects.userId))
    .where(
      and(
        eq(projectMembers.userId, userId),
        ne(projectMembers.role, "owner"),
        eq(projects.isArchived, false)
      )
    )
}

/**
 * Ensure the project creator is recorded as owner member.
 * Call after createProject(). Idempotent.
 */
export async function ensureProjectOwnerMember(projectId: string, userId: string) {
  return addProjectMember(projectId, userId, "owner", userId)
}
