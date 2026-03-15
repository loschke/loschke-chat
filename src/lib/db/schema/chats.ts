import { pgTable, text, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core"

export const chats = pgTable("chats", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").default("Neuer Chat").notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  modelId: text("model_id"),
  expertId: text("expert_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("chats_user_id_idx").on(t.userId),
  index("chats_user_updated_idx").on(t.userId, t.updatedAt),
])
