import { eq, desc, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { users } from "@/lib/db/schema/users"
import { creditTransactions } from "@/lib/db/schema/credit-transactions"

interface DeductMeta {
  modelId?: string
  chatId?: string
  referenceId?: string
  description?: string
}

/**
 * Atomically deduct credits from user balance and log the transaction.
 * Uses sequential queries (neon-http does not support transactions).
 * UPDATE is atomic at SQL level. Balance may go negative (soft block is pre-flight only).
 */
export async function deductCredits(
  userId: string,
  amount: number,
  meta?: DeductMeta
): Promise<{ newBalance: number }> {
  const db = getDb()

  const [updated] = await db
    .update(users)
    .set({
      creditsBalance: sql`${users.creditsBalance} - ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(users.logtoId, userId))
    .returning({ creditsBalance: users.creditsBalance })

  const newBalance = updated?.creditsBalance ?? 0

  await db.insert(creditTransactions).values({
    id: nanoid(12),
    userId,
    type: "usage",
    amount: -amount,
    balanceAfter: newBalance,
    description: meta?.description,
    referenceId: meta?.referenceId,
    modelId: meta?.modelId,
    chatId: meta?.chatId,
  })

  return { newBalance }
}

/**
 * Get current credit balance for a user.
 */
export async function getCreditBalance(userId: string): Promise<number> {
  const db = getDb()
  const [row] = await db
    .select({ creditsBalance: users.creditsBalance })
    .from(users)
    .where(eq(users.logtoId, userId))
    .limit(1)
  return row?.creditsBalance ?? 0
}

/**
 * Grant credits to a user (admin action).
 * Sequential queries (neon-http has no transaction support).
 */
export async function grantCredits(
  userId: string,
  amount: number,
  description?: string
): Promise<{ newBalance: number }> {
  const db = getDb()

  const [updated] = await db
    .update(users)
    .set({
      creditsBalance: sql`${users.creditsBalance} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(users.logtoId, userId))
    .returning({ creditsBalance: users.creditsBalance })

  const newBalance = updated?.creditsBalance ?? 0

  await db.insert(creditTransactions).values({
    id: nanoid(12),
    userId,
    type: "grant",
    amount,
    balanceAfter: newBalance,
    description: description ?? `Admin-Grant: ${amount} Credits`,
  })

  return { newBalance }
}

/**
 * Admin-adjust credits (can be negative).
 * Sequential queries (neon-http has no transaction support).
 */
export async function adjustCredits(
  userId: string,
  amount: number,
  description?: string
): Promise<{ newBalance: number }> {
  const db = getDb()

  const [updated] = await db
    .update(users)
    .set({
      creditsBalance: sql`${users.creditsBalance} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(users.logtoId, userId))
    .returning({ creditsBalance: users.creditsBalance })

  const newBalance = updated?.creditsBalance ?? 0

  await db.insert(creditTransactions).values({
    id: nanoid(12),
    userId,
    type: "admin_adjust",
    amount,
    balanceAfter: newBalance,
    description: description ?? `Admin-Korrektur: ${amount} Credits`,
  })

  return { newBalance }
}

/**
 * Get total credit usage for a specific chat.
 */
export async function getCreditUsageByChat(chatId: string, userId: string): Promise<number> {
  const db = getDb()
  const [row] = await db
    .select({
      total: sql<number>`COALESCE(SUM(ABS(${creditTransactions.amount})), 0)`,
    })
    .from(creditTransactions)
    .where(
      sql`${creditTransactions.chatId} = ${chatId} AND ${creditTransactions.userId} = ${userId} AND ${creditTransactions.type} = 'usage'`
    )
    .limit(1)
  return row?.total ?? 0
}

export interface CreditTransaction {
  id: string
  type: string
  amount: number
  balanceAfter: number
  description: string | null
  modelId: string | null
  chatId: string | null
  createdAt: Date
}

/**
 * Get paginated credit transactions for a user.
 */
export async function getCreditTransactions(
  userId: string,
  limit = 20,
  offset = 0
): Promise<CreditTransaction[]> {
  const db = getDb()
  return db
    .select({
      id: creditTransactions.id,
      type: creditTransactions.type,
      amount: creditTransactions.amount,
      balanceAfter: creditTransactions.balanceAfter,
      description: creditTransactions.description,
      modelId: creditTransactions.modelId,
      chatId: creditTransactions.chatId,
      createdAt: creditTransactions.createdAt,
    })
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit)
    .offset(offset)
}

/**
 * Get all users with their credit balances (admin).
 */
export async function getUsersWithBalances(): Promise<
  Array<{ logtoId: string; email: string | null; name: string | null; creditsBalance: number }>
> {
  const db = getDb()
  return db
    .select({
      logtoId: users.logtoId,
      email: users.email,
      name: users.name,
      creditsBalance: users.creditsBalance,
    })
    .from(users)
    .orderBy(desc(users.creditsBalance))
}
