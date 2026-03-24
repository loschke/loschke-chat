import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core"
import { chats } from "./chats"

export const sharedChats = pgTable("shared_chats", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("shared_chats_token_idx").on(t.token),
  index("shared_chats_chat_id_idx").on(t.chatId),
  index("shared_chats_user_id_idx").on(t.userId),
])
