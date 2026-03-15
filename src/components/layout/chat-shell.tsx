import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ProjectProvider } from "@/components/chat/project-context"
import { getUser } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin-guard"
import { ChatSidebar } from "./chat-sidebar"
import { ChatHeader } from "./chat-header"

interface ChatShellProps {
  children: React.ReactNode
}

export async function ChatShell({ children }: ChatShellProps) {
  const user = await getUser()
  const isAdmin = isAdminEmail(user?.email)

  return (
    <SidebarProvider className="h-svh">
      <TooltipProvider>
        <ProjectProvider>
          {/* Viewport frame */}
          <div
            className="pointer-events-none fixed inset-0 z-50 border-[5px] border-primary"
            aria-hidden="true"
          />
          <ChatSidebar />
          <SidebarInset className="overflow-hidden">
            <ChatHeader isAdmin={isAdmin} user={user} />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {children}
            </div>
          </SidebarInset>
        </ProjectProvider>
      </TooltipProvider>
    </SidebarProvider>
  )
}
