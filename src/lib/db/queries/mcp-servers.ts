import { eq, asc } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { mcpServers } from "@/lib/db/schema/mcp-servers"

export interface CreateMcpServerInput {
  serverId: string
  name: string
  description?: string | null
  url: string
  transport?: string
  headers?: Record<string, string> | null
  envVar?: string | null
  enabledTools?: string[] | null
  isActive?: boolean
  sortOrder?: number
}

export interface UpdateMcpServerInput {
  serverId?: string
  name?: string
  description?: string | null
  url?: string
  transport?: string
  headers?: Record<string, string> | null
  envVar?: string | null
  enabledTools?: string[] | null
  isActive?: boolean
  sortOrder?: number
}

/** Get all active MCP servers, ordered by sortOrder */
export async function getActiveMcpServers() {
  const db = getDb()
  return db
    .select()
    .from(mcpServers)
    .where(eq(mcpServers.isActive, true))
    .orderBy(asc(mcpServers.sortOrder), asc(mcpServers.name))
}

/** Get all MCP servers including inactive (admin view) */
export async function getAllMcpServers() {
  const db = getDb()
  return db
    .select()
    .from(mcpServers)
    .orderBy(asc(mcpServers.sortOrder), asc(mcpServers.name))
}

/** Get a single MCP server by DB primary key */
export async function getMcpServerById(id: string) {
  const db = getDb()
  const [server] = await db
    .select()
    .from(mcpServers)
    .where(eq(mcpServers.id, id))
    .limit(1)
  return server ?? null
}

/** Get a single MCP server by its serverId slug */
export async function getMcpServerByServerId(serverId: string) {
  const db = getDb()
  const [server] = await db
    .select()
    .from(mcpServers)
    .where(eq(mcpServers.serverId, serverId))
    .limit(1)
  return server ?? null
}

/** Create a new MCP server */
export async function createMcpServer(data: CreateMcpServerInput) {
  const db = getDb()
  const id = nanoid(12)
  const [server] = await db
    .insert(mcpServers)
    .values({
      id,
      serverId: data.serverId,
      name: data.name,
      description: data.description ?? null,
      url: data.url,
      transport: data.transport ?? "sse",
      headers: data.headers ?? null,
      envVar: data.envVar ?? null,
      enabledTools: data.enabledTools ?? null,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    })
    .returning()
  return server
}

/** Update an existing MCP server */
export async function updateMcpServer(id: string, data: UpdateMcpServerInput) {
  const db = getDb()
  const [updated] = await db
    .update(mcpServers)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(mcpServers.id, id))
    .returning()
  return updated ?? null
}

/** Delete an MCP server by DB primary key */
export async function deleteMcpServer(id: string) {
  const db = getDb()
  const [deleted] = await db
    .delete(mcpServers)
    .where(eq(mcpServers.id, id))
    .returning()
  return deleted ?? null
}

/** Upsert MCP server by serverId. Used for seeding and imports. */
export async function upsertMcpServerByServerId(data: CreateMcpServerInput) {
  const existing = await getMcpServerByServerId(data.serverId)
  if (existing) {
    const updated = await updateMcpServer(existing.id, {
      name: data.name,
      description: data.description ?? null,
      url: data.url,
      transport: data.transport ?? "sse",
      headers: data.headers ?? null,
      envVar: data.envVar ?? null,
      enabledTools: data.enabledTools ?? null,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    })
    if (!updated) {
      return createMcpServer(data)
    }
    return updated
  }
  return createMcpServer(data)
}
