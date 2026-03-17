import { Pool } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-serverless"
import type { NeonDatabase } from "drizzle-orm/neon-serverless"
import * as schema from "./schema"

const connectionString = process.env.DATABASE_URL

let cachedDb: NeonDatabase<typeof schema> | null = null

export function getDb() {
  if (cachedDb) return cachedDb

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL ist nicht gesetzt. Bitte .env.local konfigurieren."
    )
  }

  const pool = new Pool({ connectionString })
  cachedDb = drizzle({ client: pool, schema })
  return cachedDb
}
