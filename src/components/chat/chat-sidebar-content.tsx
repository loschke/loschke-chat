"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { MessageSquare, MoreHorizontal, Trash2, Pin, PinOff, FolderInput, Share2, Search } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { groupChatsByDate } from "@/lib/utils/date-groups"

interface ChatItem {
  id: string
  title: string
  updatedAt: string
  isPinned: boolean
}

export function ChatSidebarContent() {
  const [chats, setChats] = useState<ChatItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null)
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

  // Listen for chat-updated events (e.g. after new chat title generated)
  useEffect(() => {
    const handler = () => fetchChats()
    window.addEventListener("chat-updated", handler)
    return () => window.removeEventListener("chat-updated", handler)
  }, [fetchChats])

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

  const handleTogglePin = useCallback(
    async (chatId: string, currentlyPinned: boolean) => {
      const newPinned = !currentlyPinned
      // Optimistic update
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, isPinned: newPinned } : c))
      )
      try {
        const res = await fetch(`/api/chats/${chatId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPinned: newPinned }),
        })
        if (!res.ok) {
          // Revert on failure
          setChats((prev) =>
            prev.map((c) => (c.id === chatId ? { ...c, isPinned: currentlyPinned } : c))
          )
        }
      } catch {
        setChats((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, isPinned: currentlyPinned } : c))
        )
      }
    },
    []
  )

  const activeChatId = pathname.startsWith("/c/")
    ? pathname.split("/c/")[1]?.split("/")[0]
    : null

  // Filtered and grouped chats
  const { pinnedChats, groupedChats, isSearching } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const isSearching = query.length > 0

    const filtered = isSearching
      ? chats.filter((c) => c.title.toLowerCase().includes(query))
      : chats

    const pinned = filtered.filter((c) => c.isPinned)
    const unpinned = filtered.filter((c) => !c.isPinned)

    return {
      pinnedChats: pinned,
      groupedChats: isSearching ? [{ label: "Ergebnisse", items: unpinned }] : groupChatsByDate(unpinned),
      isSearching,
    }
  }, [chats, searchQuery])

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

  const chatToDelete = chats.find((c) => c.id === deleteChatId)

  function renderChatItem(chat: ChatItem) {
    return (
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction className="cursor-pointer opacity-0 group-hover/menu-item:opacity-100">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Aktionen</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem onClick={() => handleTogglePin(chat.id, chat.isPinned)}>
              {chat.isPinned ? (
                <><PinOff className="mr-2 size-4" /> Lösen</>
              ) : (
                <><Pin className="mr-2 size-4" /> Anpinnen</>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <FolderInput className="mr-2 size-4" /> In Projekt verschieben
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Share2 className="mr-2 size-4" /> Teilen
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteChatId(chat.id)}
            >
              <Trash2 className="mr-2 size-4" /> Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    )
  }

  return (
    <>
      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Chats durchsuchen..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Pinned chats */}
      {pinnedChats.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>Angepinnt</SidebarGroupLabel>
          <SidebarMenu>
            {pinnedChats.map(renderChatItem)}
          </SidebarMenu>
        </SidebarGroup>
      )}

      {/* Grouped chats */}
      {groupedChats.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map(renderChatItem)}
          </SidebarMenu>
        </SidebarGroup>
      ))}

      {/* No results */}
      {isSearching && pinnedChats.length === 0 && groupedChats.every((g) => g.items.length === 0) && (
        <div className="px-4 py-3 text-xs text-muted-foreground">
          Keine Ergebnisse.
        </div>
      )}

      {/* Shared delete confirmation dialog */}
      <AlertDialog open={!!deleteChatId} onOpenChange={(open) => { if (!open) setDeleteChatId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chat löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{chatToDelete?.title}&rdquo; wird unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteChatId) handleDelete(deleteChatId)
                setDeleteChatId(null)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
