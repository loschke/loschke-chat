import { memoryConfig } from "@/config/memory"

// --- Types ---

export interface MemoryEntry {
  id: string
  memory: string
  metadata?: Record<string, unknown>
  score?: number
  created_at?: string
  updated_at?: string
}

// --- Circuit Breaker ---

const FAILURE_THRESHOLD = 5
const COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

let failureCount = 0
let lastFailureTime = 0

function isCircuitOpen(): boolean {
  if (failureCount < FAILURE_THRESHOLD) return false
  const elapsed = Date.now() - lastFailureTime
  if (elapsed >= COOLDOWN_MS) {
    // Half-open: allow one attempt
    failureCount = 0
    return false
  }
  return true
}

function recordFailure(): void {
  failureCount++
  lastFailureTime = Date.now()
}

function recordSuccess(): void {
  failureCount = 0
}

// --- Timeout ---

const MEM0_TIMEOUT_MS = 8000

function withTimeout<T>(promise: Promise<T>, ms = MEM0_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Memory service timeout")), ms)
    ),
  ])
}

// --- Search ---

export async function searchMemories(
  userId: string,
  query: string,
  limit?: number,
): Promise<MemoryEntry[]> {
  if (isCircuitOpen()) {
    return []
  }

  try {
    // Dynamic import — mem0ai only loaded when this function is called
    const { getMemoryClient } = await import("@/config/memory")
    const client = await getMemoryClient()

    const results = await client.search(query, {
      user_id: userId,
      limit: limit ?? memoryConfig.searchLimit,
    })

    recordSuccess()

    if (!Array.isArray(results)) return []

    return results.map((r) => ({
      id: r.id,
      memory: r.memory ?? "",
      metadata: r.metadata as Record<string, unknown> | undefined,
      score: r.score,
      created_at: r.created_at ? String(r.created_at) : undefined,
      updated_at: r.updated_at ? String(r.updated_at) : undefined,
    }))
  } catch (error) {
    recordFailure()
    console.error("[memory] Search failed:", error instanceof Error ? error.message : error)
    return []
  }
}

// --- Extraction ---

/**
 * Convert chat messages (UIMessage-style with parts) to Mem0-compatible format.
 * Only text parts are included — files, tool-calls and tool-results are skipped.
 */
function toMem0Messages(
  messages: Array<{ role: string; parts?: Array<Record<string, unknown>>; content?: string | unknown[] }>
): Array<{ role: "user" | "assistant"; content: string }> {
  const result: Array<{ role: "user" | "assistant"; content: string }> = []

  for (const msg of messages) {
    if (msg.role !== "user" && msg.role !== "assistant") continue

    let text = ""
    if (msg.parts) {
      text = msg.parts
        .filter((p) => p.type === "text" && typeof p.text === "string")
        .map((p) => p.text as string)
        .join("")
    } else if (typeof msg.content === "string") {
      text = msg.content
    }

    if (text.trim()) {
      result.push({ role: msg.role as "user" | "assistant", content: text })
    }
  }

  return result
}

/**
 * Extract memories from a chat conversation via Mem0 client.add().
 * Fire-and-forget — errors are logged, never thrown.
 */
export async function extractMemories(
  userId: string,
  chatId: string,
  messages: Array<{ role: string; parts?: Array<Record<string, unknown>>; content?: string | unknown[] }>
): Promise<void> {
  if (isCircuitOpen()) return

  const mem0Messages = toMem0Messages(messages)
  if (mem0Messages.length === 0) return

  try {
    const { getMemoryClient } = await import("@/config/memory")
    const client = await getMemoryClient()

    await client.add(mem0Messages, {
      user_id: userId,
      metadata: { chatId },
    })

    recordSuccess()
  } catch (error) {
    recordFailure()
    console.error("[memory] Extraction failed:", error instanceof Error ? error.message : error)
  }
}

/**
 * Save a single explicit memory for a user.
 * Used by the save_memory tool.
 */
export async function saveMemory(
  userId: string,
  memory: string
): Promise<void> {
  if (isCircuitOpen()) {
    throw new Error("Memory service temporarily unavailable")
  }

  try {
    const { getMemoryClient } = await import("@/config/memory")
    const client = await getMemoryClient()

    await client.add(
      [{ role: "user", content: memory }],
      { user_id: userId }
    )

    recordSuccess()
  } catch (error) {
    recordFailure()
    throw error
  }
}

// --- List & Delete ---

/**
 * List all memories for a user.
 * Used by the Memory Management UI.
 */
export async function listMemories(userId: string): Promise<MemoryEntry[]> {
  if (isCircuitOpen()) {
    throw new Error("Memory service temporarily unavailable")
  }

  try {
    const { getMemoryClient } = await import("@/config/memory")
    const client = await getMemoryClient()

    const results = await withTimeout(client.getAll({ user_id: userId }))

    recordSuccess()

    if (!Array.isArray(results)) return []

    return results.map((r) => ({
      id: r.id,
      memory: r.memory ?? "",
      metadata: r.metadata as Record<string, unknown> | undefined,
      score: r.score,
      created_at: r.created_at ? String(r.created_at) : undefined,
      updated_at: r.updated_at ? String(r.updated_at) : undefined,
    }))
  } catch (error) {
    recordFailure()
    throw error
  }
}

/**
 * Delete a specific memory by ID with ownership verification.
 * Mem0's delete() API takes only memoryId (no user_id), so we must verify
 * that the memory belongs to the requesting user before deleting.
 */
export async function deleteMemory(memoryId: string, userId: string): Promise<void> {
  if (isCircuitOpen()) {
    throw new Error("Memory service temporarily unavailable")
  }

  try {
    const { getMemoryClient } = await import("@/config/memory")
    const client = await getMemoryClient()

    // Ownership check: list user's memories and verify the ID belongs to them.
    // Mem0's delete() has no user_id param — without this check, any user
    // could delete any memory by guessing the ID.
    const userMemories = await withTimeout(client.getAll({ user_id: userId }))
    const isOwned = Array.isArray(userMemories) && userMemories.some((m) => m.id === memoryId)
    if (!isOwned) {
      throw new Error("Memory not found")
    }

    await withTimeout(client.delete(memoryId))

    recordSuccess()
  } catch (error) {
    recordFailure()
    throw error
  }
}

/**
 * Delete ALL memories for a user (DSGVO bulk delete).
 */
export async function deleteAllMemories(userId: string): Promise<void> {
  if (isCircuitOpen()) {
    throw new Error("Memory service temporarily unavailable")
  }

  try {
    const { getMemoryClient } = await import("@/config/memory")
    const client = await getMemoryClient()

    await withTimeout(client.deleteAll({ user_id: userId }), 15000)

    recordSuccess()
  } catch (error) {
    recordFailure()
    throw error
  }
}

// --- Prompt Formatting ---

const MAX_MEMORY_CHARS = 4000

export function formatMemoriesForPrompt(memories: MemoryEntry[]): string {
  if (memories.length === 0) return ""

  const header = "## Kontext aus früheren Sessions\n\n"
  let budget = MAX_MEMORY_CHARS - header.length
  const lines: string[] = []

  for (const mem of memories) {
    const line = `- ${mem.memory}`
    if (line.length > budget) break
    lines.push(line)
    budget -= line.length + 1 // +1 for newline
  }

  if (lines.length === 0) return ""

  return header + lines.join("\n")
}
