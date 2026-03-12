"use client"

import { useRouter } from "next/navigation"
import { SquarePen } from "lucide-react"
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"

export function ChatSidebarNewChat() {
  const router = useRouter()

  function handleNewChat() {
    // Force navigation even if already on "/"
    // This also handles the case where replaceState changed the URL to /c/[id]
    router.push("/")
    router.refresh()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={handleNewChat} tooltip="Neuer Chat" className="cursor-pointer">
          <SquarePen className="size-4" />
          <span>Neuer Chat</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
