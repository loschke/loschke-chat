import { ChatShell } from "@/components/layout/chat-shell"
import { ChatView } from "@/components/chat/chat-view"

export default async function ChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  const { chatId } = await params
  return (
    <ChatShell>
      <ChatView chatId={chatId} />
    </ChatShell>
  )
}
