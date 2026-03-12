"use client"

import Link from "next/link"
import { SquarePen } from "lucide-react"
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"

export function ChatSidebarNewChat() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="Neuer Chat">
          <Link href="/">
            <SquarePen className="size-4" />
            <span>Neuer Chat</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
