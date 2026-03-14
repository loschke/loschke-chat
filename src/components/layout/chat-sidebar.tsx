import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { SidebarLogo } from "./sidebar-logo"
import { ChatSidebarContent } from "@/components/chat/chat-sidebar-content"
import { ChatSidebarNewChat } from "@/components/chat/chat-sidebar-new-chat"
import { NavUser } from "./nav-user"
import { getUser } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin-guard"

export async function ChatSidebar() {
  const user = await getUser()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarLogo />
        <ChatSidebarNewChat />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <ChatSidebarContent />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} isAdmin={isAdminEmail(user?.email)} />
      </SidebarFooter>
    </Sidebar>
  )
}
