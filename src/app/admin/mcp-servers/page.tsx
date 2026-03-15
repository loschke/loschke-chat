import { getAllMcpServers } from "@/lib/db/queries/mcp-servers"
import { McpServersAdmin } from "@/components/admin/mcp-servers-admin"

export const dynamic = "force-dynamic"

export default async function AdminMcpServersPage() {
  let servers: Awaited<ReturnType<typeof getAllMcpServers>> = []
  try {
    servers = await getAllMcpServers()
  } catch {
    // Table may not exist yet — show empty list
  }

  return <McpServersAdmin initialServers={servers} />
}
