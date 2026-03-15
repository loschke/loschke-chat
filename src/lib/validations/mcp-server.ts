import { z } from "zod"

/** Zod schema for creating/importing an MCP server */
export const createMcpServerSchema = z.object({
  serverId: z.string().min(1).max(30).regex(/^[a-z0-9]+$/, "Nur Kleinbuchstaben und Zahlen (keine Bindestriche, wird als Tool-Prefix genutzt)"),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullish(),
  url: z.string().min(1).max(500),
  transport: z.enum(["sse", "http"]).default("sse"),
  headers: z.record(z.string(), z.string()).nullish(),
  envVar: z.string().max(100).nullish(),
  enabledTools: z.array(z.string().max(200)).max(100).nullish(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

/** Zod schema for updating an MCP server (all fields optional) */
export const updateMcpServerSchema = createMcpServerSchema.partial()

/** Zod schema for bulk import (array of MCP servers) */
export const importMcpServersSchema = z.array(createMcpServerSchema).min(1).max(50)
