import { pgTable, text, timestamp, boolean, integer, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core"

export const experts = pgTable("experts", {
  id: text("id").primaryKey(),
  userId: text("user_id"), // nullable = global expert
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull(),
  icon: text("icon"), // lucide icon name
  systemPrompt: text("system_prompt").notNull(),
  skillSlugs: jsonb("skill_slugs").$type<string[]>().default([]).notNull(),
  modelPreference: text("model_preference"),
  temperature: jsonb("temperature").$type<number | null>().default(null),
  allowedTools: jsonb("allowed_tools").$type<string[]>().default([]).notNull(),
  mcpServerIds: jsonb("mcp_server_ids").$type<string[]>().default([]).notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("experts_user_id_idx").on(t.userId),
  uniqueIndex("experts_slug_idx").on(t.slug),
])
