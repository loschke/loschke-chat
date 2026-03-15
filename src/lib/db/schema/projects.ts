import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core"

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  instructions: text("instructions"),
  defaultExpertId: text("default_expert_id"),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("projects_user_updated_idx").on(t.userId, t.updatedAt),
  index("projects_user_archived_idx").on(t.userId, t.isArchived),
])
