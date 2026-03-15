import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { users } from "@/lib/db/schema/users"

// --- User Preferences Cache (60s TTL, same pattern as models.ts) ---
const PREFS_CACHE_TTL_MS = 60_000
const prefsCache = new Map<string, { data: { customInstructions: string | null; defaultModelId: string | null }; expires: number }>()

/** Clear user preferences cache. Pass userId to clear one entry, omit to clear all. */
export function clearUserPrefsCache(userId?: string) {
  if (userId) {
    prefsCache.delete(userId)
  } else {
    prefsCache.clear()
  }
}

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

export async function getUserPreferences(logtoId: string): Promise<{
  customInstructions: string | null
  defaultModelId: string | null
}> {
  const now = Date.now()
  const cached = prefsCache.get(logtoId)
  if (cached && now < cached.expires) {
    return cached.data
  }

  const db = getDb()
  const [user] = await db
    .select({
      customInstructions: users.customInstructions,
      defaultModelId: users.defaultModelId,
    })
    .from(users)
    .where(eq(users.logtoId, logtoId))
    .limit(1)
  const data = {
    customInstructions: user?.customInstructions ?? null,
    defaultModelId: user?.defaultModelId ?? null,
  }
  prefsCache.set(logtoId, { data, expires: now + PREFS_CACHE_TTL_MS })
  return data
}

export async function updateDefaultModelId(logtoId: string, modelId: string | null) {
  const db = getDb()
  await db
    .update(users)
    .set({ defaultModelId: modelId, updatedAt: new Date() })
    .where(eq(users.logtoId, logtoId))
}
