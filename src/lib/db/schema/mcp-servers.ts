import { pgTable, text, timestamp, boolean, integer, jsonb, uniqueIndex } from "drizzle-orm/pg-core"

export const mcpServers = pgTable("mcp_servers", {
  id: text("id").primaryKey(),
  /** Unique slug, used as tool name prefix (e.g. "github" → "github__list_repos") */
  serverId: text("server_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  /** SSE/HTTP endpoint URL. Supports ${VAR} env var interpolation */
  url: text("url").notNull(),
  /** Transport type: "sse" or "http" */
  transport: text("transport").notNull().default("sse"),
  /** Auth headers with ${VAR} env var interpolation */
  headers: jsonb("headers").$type<Record<string, string>>(),
  /** Env var that gates this server. Only active if this var is set */
  envVar: text("env_var"),
  /** Tool allowlist. null = all tools, string[] = only these tools */
  enabledTools: jsonb("enabled_tools").$type<string[]>(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  uniqueIndex("mcp_servers_server_id_idx").on(t.serverId),
])
