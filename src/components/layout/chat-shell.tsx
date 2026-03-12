import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ChatSidebar } from "./chat-sidebar"
import { ChatHeader } from "./chat-header"

interface ChatShellProps {
  children: React.ReactNode
}

export async function ChatShell({ children }: ChatShellProps) {
  return (
    <SidebarProvider>
      <TooltipProvider>
        {/* Viewport frame */}
        <div
          className="pointer-events-none fixed inset-0 z-50 border-[5px] border-primary"
          aria-hidden="true"
        />
        <ChatSidebar />
        <SidebarInset>
          <ChatHeader />
          <main className="flex flex-1 flex-col overflow-hidden">
            {children}
          </main>
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  )
}
