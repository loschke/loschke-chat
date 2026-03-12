import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core"
import { chats } from "./chats"
import { messages } from "./messages"

export const usageLogs = pgTable("usage_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  chatId: text("chat_id").references(() => chats.id, { onDelete: "set null" }),
  messageId: text("message_id").references(() => messages.id, { onDelete: "set null" }),
  modelId: text("model_id").notNull(),
  promptTokens: integer("prompt_tokens").notNull(),
  completionTokens: integer("completion_tokens").notNull(),
  totalTokens: integer("total_tokens").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("usage_logs_user_id_idx").on(t.userId),
  index("usage_logs_chat_id_idx").on(t.chatId),
])
