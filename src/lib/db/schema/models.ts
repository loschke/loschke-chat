import { pgTable, text, timestamp, boolean, integer, jsonb, uniqueIndex } from "drizzle-orm/pg-core"

export const models = pgTable("models", {
  id: text("id").primaryKey(),
  /** Gateway model ID (e.g. "anthropic/claude-sonnet-4-6") */
  modelId: text("model_id").notNull(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  categories: jsonb("categories").$type<string[]>().default([]).notNull(),
  region: text("region").notNull().default("us"),
  contextWindow: integer("context_window").notNull().default(200000),
  maxOutputTokens: integer("max_output_tokens").notNull().default(16384),
  isDefault: boolean("is_default").default(false).notNull(),
  capabilities: jsonb("capabilities").$type<{
    vision?: boolean
    pdfInput?: "native" | "extract" | "none"
    reasoning?: boolean
    tools?: boolean
  }>().default({}),
  inputPrice: jsonb("input_price").$type<{ per1m?: number }>(),
  outputPrice: jsonb("output_price").$type<{ per1m?: number }>(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  uniqueIndex("models_model_id_idx").on(t.modelId),
])
