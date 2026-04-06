import { NextRequest } from "next/server"
import { deleteExpiredChats } from "@/lib/db/queries/chats"
import { timingSafeCompare } from "@/lib/crypto"

const CRON_SECRET = process.env.CRON_SECRET

/**
 * Chat retention cron job.
 * Deletes unpinned chats older than CHAT_RETENTION_DAYS (default 90).
 * Protected by CRON_SECRET bearer token.
 *
 * Vercel Cron or manual: GET /api/cron/retention
 */
export async function GET(req: NextRequest) {
  // Auth check
  if (!CRON_SECRET) {
    return Response.json({ error: "CRON_SECRET nicht konfiguriert" }, { status: 500 })
  }

  const authHeader = req.headers.get("authorization") || ""
  const expectedAuth = `Bearer ${CRON_SECRET}`

  if (!timingSafeCompare(authHeader, expectedAuth)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const retentionDays = parseInt(process.env.CHAT_RETENTION_DAYS ?? "90", 10)

  if (retentionDays <= 0) {
    return Response.json({ skipped: true, reason: "CHAT_RETENTION_DAYS ist 0 oder negativ" })
  }

  try {
    const deletedCount = await deleteExpiredChats(retentionDays)
    return Response.json({
      ok: true,
      deletedCount,
      retentionDays,
      cutoff: new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString(),
    })
  } catch (error) {
    console.error("[cron/retention] Fehler:", error)
    return Response.json({ error: "Interner Fehler" }, { status: 500 })
  }
}
