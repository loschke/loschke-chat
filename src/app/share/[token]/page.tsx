import { notFound } from "next/navigation"
import { getShareByToken } from "@/lib/db/queries/shared-chats"
import { SharedChatView } from "@/components/chat/shared-chat-view"

export default async function SharedChatPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  if (!token || token.length > 30) {
    notFound()
  }

  // Validate token exists (fast DB check)
  const share = await getShareByToken(token)
  if (!share) {
    notFound()
  }

  return <SharedChatView token={token} title={undefined} />
}
