import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { users } from "@/lib/db/schema/users"

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
