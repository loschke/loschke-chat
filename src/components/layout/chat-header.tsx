"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Folder, Plus, MessageSquare, FolderPlus, Users, BookOpen } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useProject } from "@/components/chat/project-context"
import { ProjectSettingsDialog } from "@/components/chat/project-settings-dialog"
import { CreditIndicator } from "./credit-indicator"
import { NavUser } from "./nav-user"
import { ThemeToggle } from "./theme-toggle"
import { features } from "@/config/features"
import type { AppUser } from "@/lib/auth"

interface ChatHeaderProps {
  isAdmin?: boolean
  user?: AppUser | null
}

export function ChatHeader({ isAdmin, user }: ChatHeaderProps) {
  const pathname = usePathname()
  const { projectName, isSharedProject } = useProject()
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)

  const chatId = pathname.startsWith("/c/")
    ? pathname.split("/c/")[1]?.split("/")[0] ?? null
    : null

  function handleNewChat() {
    window.location.href = "/"
  }

  async function handleCreateProject(data: { name: string; description?: string; instructions?: string }) {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("chat-updated"))
      }
    } catch {
      // Silently fail
    }
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 bg-primary px-4 text-primary-foreground">
        <SidebarTrigger className="-ml-1 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground" />

        {/* Plus dropdown — New Chat / New Project / Admin items */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
            >
              <Plus className="size-4" />
              <span className="sr-only">Neu erstellen</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handleNewChat}>
              <MessageSquare className="mr-2 size-4" />
              Neuer Chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setProjectDialogOpen(true)}>
              <FolderPlus className="mr-2 size-4" />
              Neues Projekt
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/admin/experts" className="flex items-center gap-2">
                    <Users className="size-4" />
                    <span>Experten verwalten</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/admin/skills" className="flex items-center gap-2">
                    <BookOpen className="size-4" />
                    <span>Skills verwalten</span>
                  </a>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-4 bg-primary-foreground/25" />

        {projectName && (
          <div className="flex items-center gap-1 rounded-md bg-primary-foreground/10 px-2 py-1 text-xs font-medium text-primary-foreground md:gap-1.5 md:px-2.5">
            {isSharedProject ? <Users className="size-3" /> : <Folder className="size-3" />}
            <span className="max-w-[120px] truncate md:max-w-[200px]">{projectName}</span>
          </div>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-1 md:gap-1.5">
          {features.credits.enabled && <CreditIndicator />}
          <ThemeToggle />
          <NavUser user={user ?? null} isAdmin={isAdmin} />
        </div>
      </header>

      <ProjectSettingsDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onSave={handleCreateProject}
      />
    </>
  )
}
