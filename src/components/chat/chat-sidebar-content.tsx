"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { MessageSquare, MoreHorizontal, Trash2, Pin, PinOff, FolderInput, Share2, Search, Folder, Plus, Settings, ChevronRight } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
import { ProjectMoveDialog } from "./project-move-dialog"
import { ProjectSettingsDialog } from "./project-settings-dialog"

interface ChatItem {
  id: string
  title: string
  updatedAt: string
  isPinned: boolean
  projectId?: string | null
}

interface ProjectItem {
  id: string
  name: string
  description: string | null
  chatCount: number
}

export function ChatSidebarContent() {
  const { state: sidebarState } = useSidebar()
  const isCollapsed = sidebarState === "collapsed"
  const [chats, setChats] = useState<ChatItem[]>([])
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null)
  const [moveChatId, setMoveChatId] = useState<string | null>(null)
  const [projectDialogState, setProjectDialogState] = useState<{
    open: boolean
    project?: ProjectItem | null
  }>({ open: false })
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  const fetchData = useCallback(async () => {
    try {
      const [chatsRes, projectsRes] = await Promise.all([
        fetch("/api/chats"),
        fetch("/api/projects"),
      ])
      if (chatsRes.ok) {
        setChats(await chatsRes.json())
      }
      if (projectsRes.ok) {
        setProjects(await projectsRes.json())
      }
    } catch {
      // Silently fail — sidebar is non-critical
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Listen for chat-updated events (e.g. after new chat title generated)
  useEffect(() => {
    const handler = () => fetchData()
    window.addEventListener("chat-updated", handler)
    return () => window.removeEventListener("chat-updated", handler)
  }, [fetchData])

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

  const handleMoveChat = useCallback(
    async (chatId: string, projectId: string | null) => {
      // Optimistic update
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, projectId } : c))
      )
      try {
        const res = await fetch(`/api/chats/${chatId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        })
        if (!res.ok) {
          // Revert — re-fetch to get correct state
          fetchData()
        }
      } catch {
        fetchData()
      }
    },
    [fetchData]
  )

  const handleUpdateProject = useCallback(
    async (projectId: string, data: { name: string; description?: string; instructions?: string }) => {
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        if (res.ok) {
          setProjects((prev) =>
            prev.map((p) =>
              p.id === projectId ? { ...p, ...data } : p
            )
          )
        }
      } catch {
        // Silently fail
      }
    },
    []
  )

  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      try {
        const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" })
        if (res.ok) {
          setProjects((prev) => prev.filter((p) => p.id !== projectId))
          // Unassign chats locally
          setChats((prev) =>
            prev.map((c) => (c.projectId === projectId ? { ...c, projectId: null } : c))
          )
        }
      } catch {
        // Silently fail
      }
    },
    []
  )

  const activeChatId = pathname.startsWith("/c/")
    ? pathname.split("/c/")[1]?.split("/")[0]
    : null

  // Filtered and grouped chats
  const { pinnedChats, projectGroups, groupedChats, isSearching } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const isSearching = query.length > 0

    const filtered = isSearching
      ? chats.filter((c) => c.title.toLowerCase().includes(query))
      : chats

    const pinned = filtered.filter((c) => c.isPinned)
    const unpinned = filtered.filter((c) => !c.isPinned)

    if (isSearching) {
      return {
        pinnedChats: pinned,
        projectGroups: [] as Array<{ project: ProjectItem; chats: ChatItem[] }>,
        groupedChats: [{ label: "Ergebnisse", items: unpinned }],
        isSearching,
      }
    }

    // Split into project chats and unassigned chats
    const projectMap = new Map<string, ChatItem[]>()
    const unassigned: ChatItem[] = []

    for (const chat of unpinned) {
      if (chat.projectId) {
        const list = projectMap.get(chat.projectId) ?? []
        list.push(chat)
        projectMap.set(chat.projectId, list)
      } else {
        unassigned.push(chat)
      }
    }

    // Build project groups (show all projects, even empty ones)
    const projectGroups = projects
      .map((project) => ({
        project,
        chats: projectMap.get(project.id) ?? [],
      }))

    return {
      pinnedChats: pinned,
      projectGroups,
      groupedChats: groupChatsByDate(unassigned),
      isSearching,
    }
  }, [chats, projects, searchQuery])

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

  if (chats.length === 0 && projects.length === 0) {
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
  const chatToMove = chats.find((c) => c.id === moveChatId)
  const projectToDelete = projects.find((p) => p.id === deleteProjectId)

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
            <DropdownMenuItem onClick={() => setMoveChatId(chat.id)}>
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
      {/* Search — hidden when sidebar is collapsed */}
      {!isCollapsed && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="sidebar-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Chats durchsuchen..."
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>
      )}

      {/* Pinned chats */}
      {pinnedChats.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>Angepinnt</SidebarGroupLabel>
          <SidebarMenu>
            {pinnedChats.map(renderChatItem)}
          </SidebarMenu>
        </SidebarGroup>
      )}

      {/* Project groups */}
      {projectGroups.map(({ project, chats: projectChats }) => (
        <Collapsible key={project.id} defaultOpen>
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <div className="flex w-full items-center">
                <CollapsibleTrigger className="flex flex-1 items-center gap-1 [&[data-state=open]>svg:first-child]:rotate-90">
                  <ChevronRight className="size-3 transition-transform" />
                  <Folder className="size-3" />
                  <span className="truncate">{project.name}</span>
                </CollapsibleTrigger>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                    onClick={() => window.location.href = `/?project=${project.id}`}
                    title="Neuer Chat im Projekt"
                  >
                    <Plus className="size-3" />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <Settings className="size-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start">
                      <DropdownMenuItem onClick={() => setProjectDialogState({ open: true, project })}>
                        <Settings className="mr-2 size-4" /> Bearbeiten
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteProjectId(project.id)}
                      >
                        <Trash2 className="mr-2 size-4" /> Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </SidebarGroupLabel>
            <CollapsibleContent>
              {projectChats.length > 0 ? (
                <SidebarMenu>
                  {projectChats.map(renderChatItem)}
                </SidebarMenu>
              ) : (
                <button
                  type="button"
                  onClick={() => window.location.href = `/?project=${project.id}`}
                  className="mx-3 my-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Plus className="size-3" />
                  Chat starten
                </button>
              )}
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      ))}

      {/* Ungrouped chats (chronological) */}
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

      {/* Delete chat confirmation */}
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

      {/* Delete project confirmation */}
      <AlertDialog open={!!deleteProjectId} onOpenChange={(open) => { if (!open) setDeleteProjectId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Projekt löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{projectToDelete?.name}&rdquo; wird gelöscht. Zugehörige Chats bleiben erhalten, werden aber nicht mehr zugeordnet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteProjectId) handleDeleteProject(deleteProjectId)
                setDeleteProjectId(null)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move chat to project dialog */}
      {moveChatId && (
        <ProjectMoveDialog
          open={!!moveChatId}
          onOpenChange={(open) => { if (!open) setMoveChatId(null) }}
          chatId={moveChatId}
          currentProjectId={chatToMove?.projectId ?? null}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          onMove={handleMoveChat}
        />
      )}

      {/* Project settings dialog (edit only) */}
      {projectDialogState.project && (
        <ProjectSettingsDialog
          open={projectDialogState.open}
          onOpenChange={(open) => { if (!open) setProjectDialogState({ open: false }) }}
          project={{
            id: projectDialogState.project.id,
            name: projectDialogState.project.name,
            description: projectDialogState.project.description,
            instructions: null,
            defaultExpertId: null,
          }}
          onSave={(data) => {
            handleUpdateProject(projectDialogState.project!.id, data)
          }}
        />
      )}
    </>
  )
}
