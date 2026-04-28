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

/** Clear user role cache. Pass authSub to clear one entry, omit to clear all. */
export function clearRoleCache(authSub?: string) {
  if (authSub) {
    roleCache.delete(authSub)
  } else {
    roleCache.clear()
  }
}

/** Get user role from DB with 60s cache. */
export async function getUserRole(authSub: string): Promise<UserRole> {
  const now = Date.now()
  const cached = roleCache.get(authSub)
  if (cached && now < cached.expires) {
    return cached.data
  }

  const db = getDb()
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.authSub, authSub))
    .limit(1)
  const role = (user?.role as UserRole) ?? "user"
  roleCache.set(authSub, { data: role, expires: now + ROLE_CACHE_TTL_MS })
  return role
}

/** Clear user status cache. Pass authSub to clear one entry, omit to clear all. */
export function clearStatusCache(authSub?: string) {
  if (authSub) {
    statusCache.delete(authSub)
  } else {
    statusCache.clear()
  }
}

/** Get user status from DB with 60s cache. */
export async function getUserStatus(authSub: string): Promise<UserStatus> {
  const now = Date.now()
  const cached = statusCache.get(authSub)
  if (cached && now < cached.expires) {
    return cached.data
  }

  const db = getDb()
  const [user] = await db
    .select({ status: users.status })
    .from(users)
    .where(eq(users.authSub, authSub))
    .limit(1)
  const status = (user?.status as UserStatus) ?? "pending"
  statusCache.set(authSub, { data: status, expires: now + STATUS_CACHE_TTL_MS })
  return status
}

/** List all users with their roles (for superadmin UI). */
export async function listUsersWithRoles() {
  const db = getDb()
  return db
    .select({
      authSub: users.authSub,
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
export async function updateUserRole(authSub: string, role: UserRole): Promise<UserRole> {
  const db = getDb()
  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.authSub, authSub))
  clearRoleCache(authSub)
  return role
}

/** Update a user's status (approve/reject). Returns the new status. */
export async function updateUserStatus(
  authSub: string,
  status: UserStatus,
  approvedByAuthSub?: string
): Promise<UserStatus> {
  const db = getDb()
  await db
    .update(users)
    .set({
      status,
      approvedAt: status === "approved" ? new Date() : null,
      approvedBy: status === "approved" ? (approvedByAuthSub ?? null) : null,
      updatedAt: new Date(),
    })
    .where(eq(users.authSub, authSub))
  clearStatusCache(authSub)
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
 * Ensure a user record exists in the local DB. Upsert by auth_sub —
 * creates on first login, updates email/name on subsequent logins.
 */
export async function ensureUserExists(params: {
  authSub: string
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
      authSub: params.authSub,
      email: params.email ?? undefined,
      name: params.name ?? undefined,
      status: initialStatus,
      approvedAt: initialStatus === "approved" ? new Date() : undefined,
    })
    .onConflictDoUpdate({
      target: users.authSub,
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
    await grantCredits(params.authSub, INITIAL_CREDITS, `Willkommens-Guthaben: ${INITIAL_CREDITS} Credits`)
  }

  // Auto-promote to superadmin if email matches SUPERADMIN_EMAIL
  if (isSuperadminEmail) {
    const currentRole = await getUserRole(params.authSub)
    if (currentRole !== "superadmin") {
      await updateUserRole(params.authSub, "superadmin")
    }
    // Superadmin is always approved
    const currentStatus = await getUserStatus(params.authSub)
    if (currentStatus !== "approved") {
      await updateUserStatus(params.authSub, "approved", params.authSub)
    }
  }
}

/** Look up a user by email. Returns authSub, name, email or null. */
export async function getUserByEmail(email: string) {
  const db = getDb()
  const [user] = await db
    .select({ authSub: users.authSub, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  return user ?? null
}

/** Get basic profile (name, email) by authSub. */
export async function getUserProfile(authSub: string) {
  const db = getDb()
  const [user] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.authSub, authSub))
    .limit(1)
  return user ?? null
}

export async function getCustomInstructions(authSub: string): Promise<string | null> {
  const db = getDb()
  const [user] = await db
    .select({ customInstructions: users.customInstructions })
    .from(users)
    .where(eq(users.authSub, authSub))
    .limit(1)
  return user?.customInstructions ?? null
}

export async function updateCustomInstructions(authSub: string, instructions: string | null) {
  const db = getDb()
  await db
    .update(users)
    .set({ customInstructions: instructions, updatedAt: new Date() })
    .where(eq(users.authSub, authSub))
}

export async function getUserPreferences(authSub: string): Promise<{
  customInstructions: string | null
  defaultModelId: string | null
  memoryEnabled: boolean
  suggestedRepliesEnabled: boolean
  safeChatEnabled: boolean
}> {
  const now = Date.now()
  const cached = prefsCache.get(authSub)
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
    .where(eq(users.authSub, authSub))
    .limit(1)
  const data = {
    customInstructions: user?.customInstructions ?? null,
    defaultModelId: user?.defaultModelId ?? null,
    memoryEnabled: user?.memoryEnabled ?? false,
    suggestedRepliesEnabled: user?.suggestedRepliesEnabled ?? true,
    safeChatEnabled: user?.safeChatEnabled ?? false,
  }
  prefsCache.set(authSub, { data, expires: now + PREFS_CACHE_TTL_MS })
  return data
}

export async function updateDefaultModelId(authSub: string, modelId: string | null) {
  const db = getDb()
  await db
    .update(users)
    .set({ defaultModelId: modelId, updatedAt: new Date() })
    .where(eq(users.authSub, authSub))
}

export async function updateMemoryEnabled(authSub: string, enabled: boolean) {
  const db = getDb()
  await db
    .update(users)
    .set({ memoryEnabled: enabled, updatedAt: new Date() })
    .where(eq(users.authSub, authSub))
}

export async function updateSuggestedRepliesEnabled(authSub: string, enabled: boolean) {
  const db = getDb()
  await db
    .update(users)
    .set({ suggestedRepliesEnabled: enabled, updatedAt: new Date() })
    .where(eq(users.authSub, authSub))
}

export async function updateSafeChatEnabled(authSub: string, enabled: boolean) {
  const db = getDb()
  await db
    .update(users)
    .set({ safeChatEnabled: enabled, updatedAt: new Date() })
    .where(eq(users.authSub, authSub))
}
