import { pgTable, text, timestamp, boolean, integer, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core"

export const skills = pgTable("skills", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(), // Markdown body (without frontmatter)
  mode: text("mode").notNull().default("skill"), // 'skill' | 'quicktask'
  category: text("category"), // Quicktask grouping
  icon: text("icon"), // Lucide icon name
  fields: jsonb("fields").$type<SkillFieldSchema[]>().default([]).notNull(),
  outputAsArtifact: boolean("output_as_artifact").default(false).notNull(),
  temperature: jsonb("temperature").$type<number | null>().default(null),
  modelId: text("model_id"),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  uniqueIndex("skills_slug_idx").on(t.slug),
  index("skills_mode_idx").on(t.mode),
  index("skills_is_active_idx").on(t.isActive),
])

/** Field definition for quicktask forms (stored as jsonb) */
export interface SkillFieldSchema {
  key: string
  label: string
  type: "text" | "textarea" | "select"
  required?: boolean
  placeholder?: string
  options?: string[]
}
