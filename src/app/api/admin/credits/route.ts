import { z } from "zod"
import { requireAdmin } from "@/lib/admin-guard"
import { features } from "@/config/features"
import { grantCredits, getUsersWithBalances } from "@/lib/db/queries/credits"

const grantSchema = z.object({
  logtoId: z.string().min(1),
  amount: z.number().int().positive().max(10_000_000),
  description: z.string().max(200).optional(),
})

export async function GET() {
  if (!features.credits.enabled) {
    return Response.json({ error: "Credits sind deaktiviert" }, { status: 404 })
  }

  try {
    await requireAdmin()
  } catch (res) {
    return res as Response
  }

  const users = await getUsersWithBalances()
  return Response.json({ users })
}

export async function POST(req: Request) {
  if (!features.credits.enabled) {
    return Response.json({ error: "Credits sind deaktiviert" }, { status: 404 })
  }

  try {
    await requireAdmin()
  } catch (res) {
    return res as Response
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Ungültiges JSON" }, { status: 400 })
  }

  const parsed = grantSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Ungültige Daten", details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { logtoId, amount, description } = parsed.data
  const result = await grantCredits(logtoId, amount, description)

  return Response.json({ success: true, newBalance: result.newBalance })
}
