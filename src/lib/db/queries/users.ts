import { eq, desc } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { users } from "@/lib/db/schema/users"
import type { UserRole } from "@/lib/db/schema/users"

// --- User Preferences Cache (60s TTL, same pattern as models.ts) ---
const PREFS_CACHE_TTL_MS = 60_000
const prefsCache = new Map<string, { data: { customInstructions: string | null; defaultModelId: string | null; memoryEnabled: boolean; suggestedRepliesEnabled: boolean }; expires: number }>()

// --- User Role Cache (60s TTL) ---
const ROLE_CACHE_TTL_MS = 60_000
const roleCache = new Map<string, { data: UserRole; expires: number }>()

/** Clear user role cache. Pass logtoId to clear one entry, omit to clear all. */
export function clearRoleCache(logtoId?: string) {
  if (logtoId) {
    roleCache.delete(logtoId)
  } else {
    roleCache.clear()
  }
}

/** Get user role from DB with 60s cache. */
export async function getUserRole(logtoId: string): Promise<UserRole> {
  const now = Date.now()
  const cached = roleCache.get(logtoId)
  if (cached && now < cached.expires) {
    return cached.data
  }

  const db = getDb()
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.logtoId, logtoId))
    .limit(1)
  const role = (user?.role as UserRole) ?? "user"
  roleCache.set(logtoId, { data: role, expires: now + ROLE_CACHE_TTL_MS })
  return role
}

/** List all users with their roles (for superadmin UI). */
export async function listUsersWithRoles() {
  const db = getDb()
  return db
    .select({
      logtoId: users.logtoId,
      email: users.email,
      name: users.name,
      role: users.role,
      creditsBalance: users.creditsBalance,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
}

/** Update a user's role. Returns the new role. */
export async function updateUserRole(logtoId: string, role: UserRole): Promise<UserRole> {
  const db = getDb()
  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.logtoId, logtoId))
  clearRoleCache(logtoId)
  return role
}

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

  // Auto-promote to superadmin if email matches SUPERADMIN_EMAIL
  const superadminEmail = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase()
  if (superadminEmail && params.email?.trim().toLowerCase() === superadminEmail) {
    const currentRole = await getUserRole(params.logtoId)
    if (currentRole !== "superadmin") {
      await updateUserRole(params.logtoId, "superadmin")
    }
  }
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
  memoryEnabled: boolean
  suggestedRepliesEnabled: boolean
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
      memoryEnabled: users.memoryEnabled,
      suggestedRepliesEnabled: users.suggestedRepliesEnabled,
    })
    .from(users)
    .where(eq(users.logtoId, logtoId))
    .limit(1)
  const data = {
    customInstructions: user?.customInstructions ?? null,
    defaultModelId: user?.defaultModelId ?? null,
    memoryEnabled: user?.memoryEnabled ?? false,
    suggestedRepliesEnabled: user?.suggestedRepliesEnabled ?? true,
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

export async function updateMemoryEnabled(logtoId: string, enabled: boolean) {
  const db = getDb()
  await db
    .update(users)
    .set({ memoryEnabled: enabled, updatedAt: new Date() })
    .where(eq(users.logtoId, logtoId))
}

export async function updateSuggestedRepliesEnabled(logtoId: string, enabled: boolean) {
  const db = getDb()
  await db
    .update(users)
    .set({ suggestedRepliesEnabled: enabled, updatedAt: new Date() })
    .where(eq(users.logtoId, logtoId))
}
