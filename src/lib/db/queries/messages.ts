import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { messages } from "@/lib/db/schema/messages"

interface MessageInput {
  chatId: string
  role: string
  parts: unknown
  metadata?: unknown
}

export async function saveMessages(inputs: MessageInput[]) {
  if (inputs.length === 0) return []

  const db = getDb()
  const values = inputs.map((input) => ({
    id: nanoid(12),
    chatId: input.chatId,
    role: input.role,
    parts: input.parts,
    metadata: input.metadata ?? null,
  }))

  return db.insert(messages).values(values).returning()
}
