import { desc, eq, and } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { consentLogs } from "@/lib/db/schema/consent-logs"

interface ConsentInput {
  userId: string
  chatId?: string
  consentType: string
  decision: string
  fileMetadata?: unknown
  piiFindings?: unknown
  routedModel?: string
  messagePreview?: string
}

export async function logConsent(input: ConsentInput) {
  const db = getDb()
  await db.insert(consentLogs).values({
    id: nanoid(12),
    userId: input.userId,
    chatId: input.chatId ?? null,
    consentType: input.consentType,
    decision: input.decision,
    fileMetadata: input.fileMetadata ?? null,
    piiFindings: input.piiFindings ?? null,
    routedModel: input.routedModel ?? null,
    messagePreview: input.messagePreview?.slice(0, 100) ?? null,
  })
}

export async function getConsentLogs(userId: string, limit = 50) {
  const db = getDb()
  return db
    .select()
    .from(consentLogs)
    .where(eq(consentLogs.userId, userId))
    .orderBy(desc(consentLogs.createdAt))
    .limit(limit)
}
