import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core"
import { chats } from "./chats"

export const creditTransactions = pgTable("credit_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),

  /** Transaction type */
  type: text("type").notNull(), // "usage" | "grant" | "admin_adjust"

  /** Credit amount — negative for usage, positive for grants */
  amount: integer("amount").notNull(),

  /** Balance snapshot after this transaction */
  balanceAfter: integer("balance_after").notNull(),

  /** Human-readable description */
  description: text("description"),

  /** Reference to usage_logs.id for usage transactions */
  referenceId: text("reference_id"),

  /** Model used (for usage transactions) */
  modelId: text("model_id"),

  /** Chat reference */
  chatId: text("chat_id").references(() => chats.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("credit_tx_user_created_idx").on(t.userId, t.createdAt),
])
