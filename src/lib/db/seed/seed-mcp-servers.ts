import fs from "node:fs"
import path from "node:path"
import { upsertMcpServerByServerId } from "@/lib/db/queries/mcp-servers"
import { parseMcpServerMarkdown } from "./parse-mcp-server-markdown"
import { getErrorMessage } from "@/lib/errors"

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

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8")
      const parsed = parseMcpServerMarkdown(raw)
      if (!parsed) {
        console.log(`  - ${file}: Skipped (missing required fields)`)
        continue
      }

      const result = await upsertMcpServerByServerId(parsed)
      console.log(`  + ${parsed.name} (${parsed.serverId}) -> ${result.id}`)
      count++
    } catch (err) {
      console.error(`  x ${file}:`, getErrorMessage(err))
    }
  }

  console.log(`Seeded ${count} mcp-servers.`)
}
