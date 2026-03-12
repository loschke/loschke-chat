import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { users } from "@/lib/db/schema/users"

/**
 * Ensure a user record exists in the local DB. Upsert by logto_id —
 * creates on first login, updates email/name on subsequent logins.
 */
export async function ensureUserExists(params: {
  logtoId: string
  email?: string | null
  name?: string | null
}) {
  const db = getDb()
  await db
    .insert(users)
    .values({
      logtoId: params.logtoId,
      email: params.email ?? undefined,
      name: params.name ?? undefined,
    })
    .onConflictDoUpdate({
      target: users.logtoId,
      set: {
        email: params.email ?? undefined,
        name: params.name ?? undefined,
        updatedAt: new Date(),
      },
    })
}

export async function getCustomInstructions(logtoId: string): Promise<string | null> {
  const db = getDb()
  const [user] = await db
    .select({ customInstructions: users.customInstructions })
    .from(users)
    .where(eq(users.logtoId, logtoId))
    .limit(1)
  return user?.customInstructions ?? null
}

export async function updateCustomInstructions(logtoId: string, instructions: string | null) {
  const db = getDb()
  await db
    .update(users)
    .set({ customInstructions: instructions, updatedAt: new Date() })
    .where(eq(users.logtoId, logtoId))
}
