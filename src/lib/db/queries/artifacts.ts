import { eq, and, sql, desc } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { artifacts } from "@/lib/db/schema/artifacts"
import { chats } from "@/lib/db/schema/chats"

interface CreateArtifactInput {
  chatId: string
  messageId?: string
  type: "markdown" | "html" | "code" | "quiz" | "review" | "image" | "audio"
  title: string
  content: string
  language?: string
  fileUrl?: string
  metadata?: Record<string, unknown>
}

export async function createArtifact(input: CreateArtifactInput) {
  const db = getDb()

  // Defense-in-depth: verify referenced chatId exists
  const [chat] = await db
    .select({ id: chats.id })
    .from(chats)
    .where(eq(chats.id, input.chatId))
    .limit(1)

  if (!chat) {
    throw new Error(`Chat ${input.chatId} not found`)
  }

  const id = nanoid(12)
  const [artifact] = await db
    .insert(artifacts)
    .values({
      id,
      chatId: input.chatId,
      messageId: input.messageId ?? null,
      type: input.type,
      title: input.title,
      content: input.content,
      language: input.language ?? null,
      fileUrl: input.fileUrl ?? null,
      metadata: input.metadata ?? null,
    })
    .returning()
  return artifact
}

export async function getArtifactById(id: string) {
  const db = getDb()
  const [artifact] = await db
    .select()
    .from(artifacts)
    .where(eq(artifacts.id, id))
    .limit(1)
  return artifact ?? null
}

/**
 * Get artifact by ID with chat join.
 * Access control must be verified by caller via canAccessChat().
 */
export async function getArtifactByIdForUser(id: string) {
  const db = getDb()
  const [artifact] = await db
    .select({
      id: artifacts.id,
      chatId: artifacts.chatId,
      type: artifacts.type,
      title: artifacts.title,
      content: artifacts.content,
      language: artifacts.language,
      fileUrl: artifacts.fileUrl,
      metadata: artifacts.metadata,
      version: artifacts.version,
      createdAt: artifacts.createdAt,
    })
    .from(artifacts)
    .where(eq(artifacts.id, id))
    .limit(1)
  return artifact ?? null
}

/**
 * Get all artifacts for a chat.
 * Access control must be verified by caller via canAccessChat().
 */
export async function getArtifactsByChatId(chatId: string) {
  const db = getDb()
  return db
    .select({
      id: artifacts.id,
      messageId: artifacts.messageId,
      chatId: artifacts.chatId,
      type: artifacts.type,
      title: artifacts.title,
      content: artifacts.content,
      language: artifacts.language,
      fileUrl: artifacts.fileUrl,
      version: artifacts.version,
      createdAt: artifacts.createdAt,
      updatedAt: artifacts.updatedAt,
    })
    .from(artifacts)
    .where(eq(artifacts.chatId, chatId))
    .orderBy(artifacts.createdAt)
}

interface GetArtifactsByUserIdOptions {
  limit?: number
  offset?: number
  type?: string
  /** Filter by metadata key presence (e.g. "deepResearch" for research reports) */
  metadataTag?: string
  /** Filter artifacts by a specific chat */
  chatId?: string
}

export async function getArtifactsByUserId(
  userId: string,
  options: GetArtifactsByUserIdOptions = {}
) {
  const db = getDb()
  const { limit = 24, offset = 0, type, metadataTag, chatId } = options

  const conditions = [eq(chats.userId, userId)]
  if (chatId) {
    conditions.push(eq(artifacts.chatId, chatId))
  }
  if (type) {
    conditions.push(eq(artifacts.type, type))
  }
  if (metadataTag) {
    conditions.push(sql`${artifacts.metadata}->>${metadataTag} IS NOT NULL`)
  }

  const rows = await db
    .select({
      id: artifacts.id,
      title: artifacts.title,
      type: artifacts.type,
      language: artifacts.language,
      version: artifacts.version,
      chatId: artifacts.chatId,
      chatTitle: chats.title,
      fileUrl: artifacts.fileUrl,
      createdAt: artifacts.createdAt,
      updatedAt: artifacts.updatedAt,
    })
    .from(artifacts)
    .innerJoin(chats, eq(artifacts.chatId, chats.id))
    .where(and(...conditions))
    .orderBy(desc(artifacts.createdAt))
    .limit(limit + 1)
    .offset(offset)

  const hasMore = rows.length > limit
  return {
    artifacts: hasMore ? rows.slice(0, limit) : rows,
    hasMore,
  }
}

export interface ArtifactGroup {
  chatId: string
  chatTitle: string | null
  artifactCount: number
  lastArtifactAt: Date
  types: string[]
  previewFileUrl: string | null
}

interface GetArtifactGroupedByChatOptions {
  limit?: number
  offset?: number
  type?: string
  metadataTag?: string
}

export async function getArtifactGroupedByChat(
  userId: string,
  options: GetArtifactGroupedByChatOptions = {}
) {
  const db = getDb()
  const { limit = 24, offset = 0, type, metadataTag } = options

  const conditions = [eq(chats.userId, userId)]
  if (type) {
    conditions.push(eq(artifacts.type, type))
  }
  if (metadataTag) {
    conditions.push(sql`${artifacts.metadata}->>${metadataTag} IS NOT NULL`)
  }

  const rows = await db
    .select({
      chatId: artifacts.chatId,
      chatTitle: chats.title,
      artifactCount: sql<number>`count(*)::int`.as("artifactCount"),
      lastArtifactAt: sql<Date>`max(${artifacts.createdAt})`.as("lastArtifactAt"),
      types: sql<string[]>`array_agg(distinct ${artifacts.type})`.as("types"),
      previewFileUrl: sql<string | null>`(
        SELECT a2."file_url" FROM artifacts a2
        WHERE a2."chat_id" = ${artifacts.chatId} AND a2."type" = 'image' AND a2."file_url" IS NOT NULL
        ORDER BY a2."created_at" DESC LIMIT 1
      )`.as("previewFileUrl"),
    })
    .from(artifacts)
    .innerJoin(chats, eq(artifacts.chatId, chats.id))
    .where(and(...conditions))
    .groupBy(artifacts.chatId, chats.title)
    .orderBy(sql`max(${artifacts.createdAt}) desc`)
    .limit(limit + 1)
    .offset(offset)

  const hasMore = rows.length > limit
  return {
    groups: hasMore ? rows.slice(0, limit) : rows,
    hasMore,
  }
}

export async function updateArtifactContent(
  id: string,
  userId: string,
  content: string,
  expectedVersion?: number,
  metadata?: Record<string, unknown>
) {
  const db = getDb()

  // Ownership check: artifact → chat → userId
  const [artifact] = await db
    .select({ chatId: artifacts.chatId })
    .from(artifacts)
    .where(eq(artifacts.id, id))
    .limit(1)

  if (!artifact) return null

  const [chat] = await db
    .select({ userId: chats.userId })
    .from(chats)
    .where(and(eq(chats.id, artifact.chatId), eq(chats.userId, userId)))
    .limit(1)

  if (!chat) return null

  // Build WHERE clause with optional optimistic locking
  const conditions = [eq(artifacts.id, id)]
  if (expectedVersion !== undefined) {
    conditions.push(eq(artifacts.version, expectedVersion))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setValues: Record<string, any> = {
    content,
    version: sql`${artifacts.version} + 1`,
    updatedAt: new Date(),
  }
  if (metadata !== undefined) {
    setValues.metadata = metadata
  }

  const [updated] = await db
    .update(artifacts)
    .set(setValues)
    .where(and(...conditions))
    .returning()

  // If expectedVersion was provided and no rows updated, it's a version conflict
  if (!updated && expectedVersion !== undefined) return null

  return updated ?? null
}
