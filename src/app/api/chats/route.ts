import { requireAuth } from "@/lib/api-guards"
import { getUserChats } from "@/lib/db/queries/chats"

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const chats = await getUserChats(auth.user.id)
  return Response.json(chats)
}
