import { eq, desc } from "drizzle-orm"
import { getShareByToken } from "@/lib/db/queries/shared-chats"
import { getDb } from "@/lib/db"
import { chats } from "@/lib/db/schema/chats"
import { messages } from "@/lib/db/schema/messages"
import { artifacts } from "@/lib/db/schema/artifacts"

const MESSAGE_LIMIT = 50

/**
 * Public endpoint: Load a shared chat by token.
 * No auth required. Returns chat, messages (last 50), and artifacts.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token || token.length > 30) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  const share = await getShareByToken(token)
  if (!share) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  const db = getDb()

  // Load chat metadata
  const [chat] = await db
    .select({
      id: chats.id,
      title: chats.title,
      expertId: chats.expertId,
      createdAt: chats.createdAt,
    })
    .from(chats)
    .where(eq(chats.id, share.chatId))
    .limit(1)

  if (!chat) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  // Load last N messages (DESC + reverse for chronological order)
  const chatMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, share.chatId))
    .orderBy(desc(messages.createdAt))
    .limit(MESSAGE_LIMIT)

  // Load artifacts for this chat
  const chatArtifacts = await db
    .select()
    .from(artifacts)
    .where(eq(artifacts.chatId, share.chatId))
    .orderBy(artifacts.createdAt)

  return Response.json({
    chat: {
      ...chat,
      sharedAt: share.createdAt,
    },
    messages: chatMessages.reverse(),
    artifacts: chatArtifacts,
  })
}
