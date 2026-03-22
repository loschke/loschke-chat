import { pgTable, text, timestamp, uuid, boolean, integer } from "drizzle-orm/pg-core"

export type UserRole = "user" | "admin" | "superadmin"

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  logtoId: text("logto_id").notNull().unique(),
  email: text("email"),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  role: text("role").$type<UserRole>().default("user").notNull(),
  customInstructions: text("custom_instructions"),
  defaultModelId: text("default_model_id"),
  memoryEnabled: boolean("memory_enabled").default(false).notNull(),
  suggestedRepliesEnabled: boolean("suggested_replies_enabled").default(true).notNull(),
  creditsBalance: integer("credits_balance").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})
