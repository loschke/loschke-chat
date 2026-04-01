import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth"
import { ensureUserExists, getUserStatus, getUserRole } from "@/lib/db/queries/users"
import { isAdminRole } from "@/lib/admin-guard"
import { features } from "@/config/features"
import { ChatShell } from "@/components/layout/chat-shell"
import { DesignLibraryView } from "@/components/design-library/design-library-view"

export default async function DesignLibraryPage() {
  const user = await getUser()

  if (!user) redirect("/")

  await ensureUserExists({ logtoId: user.id, email: user.email, name: user.name })
  const [status, role] = await Promise.all([
    getUserStatus(user.id),
    getUserRole(user.id),
  ])

  if (status !== "approved" && !isAdminRole(role)) {
    redirect("/pending-approval")
  }

  if (!features.designLibrary.enabled) {
    redirect("/")
  }

  return (
    <ChatShell>
      <DesignLibraryView />
    </ChatShell>
  )
}
