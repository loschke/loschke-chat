"use client"

import { useEffect, useState, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { MessageSquare, Trash2 } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
} from "@/components/ui/sidebar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ChatItem {
  id: string
  title: string
  updatedAt: string
  isPinned: boolean
}

export function ChatSidebarContent() {
  const [chats, setChats] = useState<ChatItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch("/api/chats")
      if (res.ok) {
        const data = await res.json()
        setChats(data)
      }
    } catch {
      // Silently fail — sidebar is non-critical
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchChats()
  }, [fetchChats, pathname])

  const handleDelete = useCallback(
    async (chatId: string) => {
      try {
        const res = await fetch(`/api/chats/${chatId}`, { method: "DELETE" })
        if (res.ok) {
          setChats((prev) => prev.filter((c) => c.id !== chatId))
          if (pathname === `/c/${chatId}`) {
            router.push("/")
          }
        }
      } catch {
        // Silently fail
      }
    },
    [pathname, router]
  )

  if (isLoading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Chats</SidebarGroupLabel>
        <SidebarMenu>
          {[1, 2, 3].map((i) => (
            <SidebarMenuItem key={i}>
              <SidebarMenuButton disabled>
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  if (chats.length === 0) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Chats</SidebarGroupLabel>
        <div className="px-4 py-3 text-xs text-muted-foreground">
          Noch keine Unterhaltungen.
        </div>
      </SidebarGroup>
    )
  }

  const activeChatId = pathname.startsWith("/c/")
    ? pathname.split("/c/")[1]?.split("/")[0]
    : null

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Chats</SidebarGroupLabel>
      <SidebarMenu>
        {chats.map((chat) => (
          <SidebarMenuItem key={chat.id}>
            <SidebarMenuButton
              asChild
              isActive={chat.id === activeChatId}
              tooltip={chat.title}
            >
              <a href={`/c/${chat.id}`}>
                <MessageSquare className="size-4" />
                <span className="truncate">{chat.title}</span>
              </a>
            </SidebarMenuButton>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <SidebarMenuAction className="cursor-pointer opacity-0 group-hover/menu-item:opacity-100">
                  <Trash2 className="size-3.5" />
                  <span className="sr-only">Löschen</span>
                </SidebarMenuAction>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Chat löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    &ldquo;{chat.title}&rdquo; wird unwiderruflich gelöscht.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(chat.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Löschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
