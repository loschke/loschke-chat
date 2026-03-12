import { z } from "zod"

import { requireAuth } from "@/lib/api-guards"
import { getCustomInstructions, updateCustomInstructions } from "@/lib/db/queries/users"

const MAX_INSTRUCTIONS_LENGTH = 2000

const updateSchema = z.object({
  instructions: z.string().max(MAX_INSTRUCTIONS_LENGTH).nullable(),
})

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const instructions = await getCustomInstructions(auth.user.id)
  return Response.json({ instructions })
}

export async function PUT(req: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }

  await updateCustomInstructions(auth.user.id, parsed.data.instructions)
  return Response.json({ success: true })
}
