import { eq, desc, sql } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { users } from "@/lib/db/schema/users"
import type { UserRole, UserStatus } from "@/lib/db/schema/users"
import { features } from "@/config/features"

const INITIAL_CREDITS = Math.max(0, parseInt(process.env.INITIAL_CREDITS ?? "0", 10) || 0)

// --- User Preferences Cache (60s TTL, same pattern as models.ts) ---
const PREFS_CACHE_TTL_MS = 60_000
const prefsCache = new Map<string, { data: { customInstructions: string | null; defaultModelId: string | null; memoryEnabled: boolean; suggestedRepliesEnabled: boolean; safeChatEnabled: boolean }; expires: number }>()

// --- User Role Cache (60s TTL) ---
const ROLE_CACHE_TTL_MS = 60_000
const roleCache = new Map<string, { data: UserRole; expires: number }>()

// --- User Status Cache (60s TTL) ---
const STATUS_CACHE_TTL_MS = 60_000
const statusCache = new Map<string, { data: UserStatus; expires: number }>()

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

/** Clear user status cache. Pass logtoId to clear one entry, omit to clear all. */
export function clearStatusCache(logtoId?: string) {
  if (logtoId) {
    statusCache.delete(logtoId)
  } else {
    statusCache.clear()
  }
}

/** Get user status from DB with 60s cache. */
export async function getUserStatus(logtoId: string): Promise<UserStatus> {
  const now = Date.now()
  const cached = statusCache.get(logtoId)
  if (cached && now < cached.expires) {
    return cached.data
  }

  const db = getDb()
  const [user] = await db
    .select({ status: users.status })
    .from(users)
    .where(eq(users.logtoId, logtoId))
    .limit(1)
  const status = (user?.status as UserStatus) ?? "pending"
  statusCache.set(logtoId, { data: status, expires: now + STATUS_CACHE_TTL_MS })
  return status
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
      status: users.status,
      creditsBalance: users.creditsBalance,
      createdAt: users.createdAt,
      approvedAt: users.approvedAt,
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

/** Update a user's status (approve/reject). Returns the new status. */
export async function updateUserStatus(
  logtoId: string,
  status: UserStatus,
  approvedByLogtoId?: string
): Promise<UserStatus> {
  const db = getDb()
  await db
    .update(users)
    .set({
      status,
      approvedAt: status === "approved" ? new Date() : null,
      approvedBy: status === "approved" ? (approvedByLogtoId ?? null) : null,
      updatedAt: new Date(),
    })
    .where(eq(users.logtoId, logtoId))
  clearStatusCache(logtoId)
  return status
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

  // Determine initial status for new users
  const superadminEmail = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase()
  const isSuperadminEmail = superadminEmail && params.email?.trim().toLowerCase() === superadminEmail
  const initialStatus: UserStatus = (isSuperadminEmail || features.openRegistration.enabled)
    ? "approved"
    : "pending"

  const shouldGrantCredits = features.credits.enabled && INITIAL_CREDITS > 0

  const [upserted] = await db
    .insert(users)
    .values({
      logtoId: params.logtoId,
      email: params.email ?? undefined,
      name: params.name ?? undefined,
      status: initialStatus,
      approvedAt: initialStatus === "approved" ? new Date() : undefined,
    })
    .onConflictDoUpdate({
      target: users.logtoId,
      set: {
        email: params.email ?? undefined,
        name: params.name ?? undefined,
        updatedAt: new Date(),
      },
    })
    .returning({ createdAt: users.createdAt, updatedAt: users.updatedAt })

  // Grant welcome credits for newly created users (createdAt === updatedAt means just inserted)
  const isNewUser = upserted && upserted.createdAt.getTime() === upserted.updatedAt.getTime()
  if (isNewUser && shouldGrantCredits) {
    const { grantCredits } = await import("@/lib/db/queries/credits")
    await grantCredits(params.logtoId, INITIAL_CREDITS, `Willkommens-Guthaben: ${INITIAL_CREDITS} Credits`)
  }

  // Auto-promote to superadmin if email matches SUPERADMIN_EMAIL
  if (isSuperadminEmail) {
    const currentRole = await getUserRole(params.logtoId)
    if (currentRole !== "superadmin") {
      await updateUserRole(params.logtoId, "superadmin")
    }
    // Superadmin is always approved
    const currentStatus = await getUserStatus(params.logtoId)
    if (currentStatus !== "approved") {
      await updateUserStatus(params.logtoId, "approved", params.logtoId)
    }
  }
}

/** Look up a user by email. Returns logtoId, name, email or null. */
export async function getUserByEmail(email: string) {
  const db = getDb()
  const [user] = await db
    .select({ logtoId: users.logtoId, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  return user ?? null
}

/** Get basic profile (name, email) by logtoId. */
export async function getUserProfile(logtoId: string) {
  const db = getDb()
  const [user] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.logtoId, logtoId))
    .limit(1)
  return user ?? null
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
  safeChatEnabled: boolean
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
      safeChatEnabled: users.safeChatEnabled,
    })
    .from(users)
    .where(eq(users.logtoId, logtoId))
    .limit(1)
  const data = {
    customInstructions: user?.customInstructions ?? null,
    defaultModelId: user?.defaultModelId ?? null,
    memoryEnabled: user?.memoryEnabled ?? false,
    suggestedRepliesEnabled: user?.suggestedRepliesEnabled ?? true,
    safeChatEnabled: user?.safeChatEnabled ?? false,
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

export async function updateSafeChatEnabled(logtoId: string, enabled: boolean) {
  const db = getDb()
  await db
    .update(users)
    .set({ safeChatEnabled: enabled, updatedAt: new Date() })
    .where(eq(users.logtoId, logtoId))
}
