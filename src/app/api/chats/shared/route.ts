import { requireAuth } from "@/lib/api-guards"
import { getUserSharedChatIds } from "@/lib/db/queries/shared-chats"

/** Returns the set of chatIds that the current user has shared. */
export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const sharedIds = await getUserSharedChatIds(auth.user.id)
  return Response.json({ chatIds: [...sharedIds] })
}
