import { pgTable, text, timestamp, integer, index, uniqueIndex } from "drizzle-orm/pg-core"
import { skills } from "./skills"

export const skillResources = pgTable("skill_resources", {
  id: text("id").primaryKey(),
  skillId: text("skill_id").notNull()
    .references(() => skills.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  uniqueIndex("skill_resources_skill_filename_idx").on(t.skillId, t.filename),
  index("skill_resources_skill_id_idx").on(t.skillId),
])
