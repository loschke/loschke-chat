import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core"
import { chats } from "./chats"
import { messages } from "./messages"

export const usageLogs = pgTable("usage_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  chatId: text("chat_id").references(() => chats.id, { onDelete: "set null" }),
  messageId: text("message_id").references(() => messages.id, { onDelete: "set null" }),
  modelId: text("model_id").notNull(),

  // Core token counts (from totalUsage — sum across all steps)
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  totalTokens: integer("total_tokens").notNull(),

  // Reasoning tokens (Extended Thinking, o1 etc.)
  reasoningTokens: integer("reasoning_tokens"),

  // Cache metrics (Anthropic prompt caching)
  cachedInputTokens: integer("cached_input_tokens"),
  cacheReadTokens: integer("cache_read_tokens"),
  cacheWriteTokens: integer("cache_write_tokens"),

  // Multi-step info (tool calls increase step count)
  stepCount: integer("step_count").default(1).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("usage_logs_user_id_idx").on(t.userId),
  index("usage_logs_chat_id_idx").on(t.chatId),
])
