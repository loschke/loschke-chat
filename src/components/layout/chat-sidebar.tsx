import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { SidebarLogo } from "./sidebar-logo"
import { ChatSidebarContent } from "@/components/chat/chat-sidebar-content"

export async function ChatSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarLogo />
      </SidebarHeader>
      <SidebarContent>
        <ChatSidebarContent />
      </SidebarContent>
    </Sidebar>
  )
}
