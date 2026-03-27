import fs from "node:fs"
import path from "node:path"
import { upsertMcpServerByServerId } from "@/lib/db/queries/mcp-servers"
import { parseMcpServerMarkdown } from "./parse-mcp-server-markdown"

/**
 * Seed MCP servers from seeds/mcp-servers/*.md into database.
 * Idempotent via upsertMcpServerByServerId.
 */
export async function seedMcpServers() {
  const dir = path.join(process.cwd(), "seeds", "mcp-servers")

  if (!fs.existsSync(dir)) {
    console.log("  No seeds/mcp-servers/ directory found, skipping.")
    return
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"))
  let count = 0

  // ⚡ Bolt Performance Optimization: Replace sequential for...of loop with concurrent Promise.all
  // Expected impact: Faster database seeding by executing mcp servers upserts concurrently.
  await Promise.all(
    files.map(async (file) => {
      try {
        const raw = fs.readFileSync(path.join(dir, file), "utf-8")
        const parsed = parseMcpServerMarkdown(raw)
        if (!parsed) {
          console.log(`  - ${file}: Skipped (missing required fields)`)
          return
        }

        const result = await upsertMcpServerByServerId(parsed)
        console.log(`  + ${parsed.name} (${parsed.serverId}) -> ${result.id}`)
        count++
      } catch (err) {
        console.error(`  x ${file}:`, err instanceof Error ? err.message : err)
      }
    }),
  )

  console.log(`Seeded ${count} mcp-servers.`)
}
