import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core"
import { chats } from "./chats"
import { messages } from "./messages"

export const artifacts = pgTable("artifacts", {
  id: text("id").primaryKey(),
  messageId: text("message_id").references(() => messages.id, { onDelete: "cascade" }),
  chatId: text("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'html' | 'markdown' | 'code' | 'jsx' | 'file'
  title: text("title"),
  content: text("content"),
  language: text("language"),
  fileUrl: text("file_url"),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})
