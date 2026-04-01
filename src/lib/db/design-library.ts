/**
 * Separate Neon DB client for the external Design-Library database.
 * Read-only access, no Drizzle — raw SQL queries only.
 *
 * Includes in-memory query cache with 1h TTL.
 * Design-Library data changes ~1-2x per month, so aggressive caching is safe.
 */

import { Pool } from "@neondatabase/serverless"

let cachedPool: Pool | null = null

function getDesignLibraryPool(): Pool {
  if (cachedPool) return cachedPool

  const connectionString = process.env.DESIGN_LIBRARY_DATABASE_URL
  if (!connectionString) {
    throw new Error(
      "DESIGN_LIBRARY_DATABASE_URL ist nicht gesetzt. Design-Library ist nicht verfuegbar."
    )
  }

  cachedPool = new Pool({ connectionString })
  return cachedPool
}

// --- Query cache (1h TTL) ---

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CacheEntry {
  data: unknown[]
  timestamp: number
}

const queryCache = new Map<string, CacheEntry>()

function getCacheKey(sql: string, params: unknown[]): string {
  return `${sql}::${JSON.stringify(params)}`
}

/** Clear the entire design library cache (call after known data updates) */
export function clearDesignLibraryCache() {
  queryCache.clear()
}

/**
 * Execute a read-only SQL query against the Design-Library database.
 * Results are cached in-memory for 1 hour.
 */
export async function queryDesignLibrary<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const key = getCacheKey(sql, params)
  const cached = queryCache.get(key)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as T[]
  }

  const pool = getDesignLibraryPool()
  const result = await pool.query(sql, params)
  const rows = result.rows as T[]

  queryCache.set(key, { data: rows, timestamp: Date.now() })

  return rows
}
