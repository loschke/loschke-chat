import { redirect } from "next/navigation"
import { ChatShell } from "@/components/layout/chat-shell"
import { ChatView } from "@/components/chat/chat-view"
import { features } from "@/config/features"
import { customLanding } from "@/config/landing"
import { getUser } from "@/lib/auth"
import { getUserStatus, getUserRole } from "@/lib/db/queries/users"
import { isAdminRole } from "@/lib/admin-guard"

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ chatId: string }>
  searchParams: Promise<{ artifact?: string }>
}) {
  const user = await getUser()
  if (user) {
    const [status, role] = await Promise.all([
      getUserStatus(user.id),
      getUserRole(user.id),
    ])
    if (status !== "approved" && !isAdminRole(role)) {
      redirect("/pending-approval")
    }
  }

  const { chatId } = await params
  const { artifact: initialArtifactId } = await searchParams
  return (
    <ChatShell>
      <ChatView chatId={chatId} initialArtifactId={initialArtifactId} ttsEnabled={features.tts.enabled} memoryEnabled={features.memory.enabled} voiceChatEnabled={features.voiceChat.enabled} customStarterPrompts={customLanding?.starterPrompts} />
    </ChatShell>
  )
}
