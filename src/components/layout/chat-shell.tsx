import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ProjectProvider } from "@/components/chat/project-context"
import { ExpertProvider } from "@/components/chat/expert-context"
import { getUser } from "@/lib/auth"
import { getUserRole } from "@/lib/db/queries/users"
import { isAdminRole, isAdminEmail } from "@/lib/admin-guard"
import { KeyboardShortcutsProvider } from "@/components/chat/keyboard-shortcuts-provider"
import { ChatSidebar } from "./chat-sidebar"
import { ChatHeader } from "./chat-header"

interface ChatShellProps {
  children: React.ReactNode
}

export async function ChatShell({ children }: ChatShellProps) {
  const user = await getUser()
  const role = user ? await getUserRole(user.id) : null
  const isAdmin = (role && isAdminRole(role)) || isAdminEmail(user?.email)

  return (
    <SidebarProvider className="h-svh">
      <TooltipProvider>
        <ProjectProvider>
        <ExpertProvider>
        <KeyboardShortcutsProvider>
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
        </KeyboardShortcutsProvider>
        </ExpertProvider>
        </ProjectProvider>
      </TooltipProvider>
    </SidebarProvider>
  )
}
