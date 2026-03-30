"use client"

import { useEffect, useState, useCallback, useMemo, useDeferredValue, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { MessageSquare, MoreHorizontal, Trash2, Pin, PinOff, FolderInput, Share2, Search, Folder, Plus, Settings, ChevronRight, Loader2, Layers, Pencil, X, Users } from "lucide-react"
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
import { ShareDialog } from "./share-dialog"
import { UserShareDialog } from "./user-share-dialog"

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

interface SharedProjectItem {
  id: string
  name: string
  description: string | null
  role: string
  ownerName: string | null
  ownerEmail: string | null
}

interface SharedWithMeChat {
  id: string
  title: string
  projectId: string | null
  sharedAt: string
  ownerName: string | null
  ownerEmail: string | null
}

function LoadMoreSentinel({ loadMore, isLoading }: { loadMore: () => void; isLoading: boolean }) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore() },
      { rootMargin: "100px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  return (
    <div ref={sentinelRef} className="flex items-center justify-center px-3 py-2">
      {isLoading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
    </div>
  )
}

export function ChatSidebarContent() {
  const { state: sidebarState } = useSidebar()
  const isCollapsed = sidebarState === "collapsed"
  const [chats, setChats] = useState<ChatItem[]>([])
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [sharedProjects, setSharedProjects] = useState<SharedProjectItem[]>([])
  const [sharedWithMeChats, setSharedWithMeChats] = useState<SharedWithMeChat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null)
  const [moveChatId, setMoveChatId] = useState<string | null>(null)
  const [renameChatId, setRenameChatId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [sharedChatIds, setSharedChatIds] = useState<Set<string>>(new Set())
  const [shareChatId, setShareChatId] = useState<string | null>(null)
  const [userShareChatId, setUserShareChatId] = useState<string | null>(null)
  const [projectDialogState, setProjectDialogState] = useState<{
    open: boolean
    project?: ProjectItem | null
  }>({ open: false })
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  const fetchData = useCallback(async () => {
    try {
      const [chatsRes, projectsRes, sharedRes, sharedWithMeRes] = await Promise.all([
        fetch("/api/chats?limit=50"),
        fetch("/api/projects"),
        fetch("/api/chats/shared"),
        fetch("/api/chats/shared-with-me"),
      ])
      if (chatsRes.ok) {
        const data = await chatsRes.json()
        setChats(data.chats)
        setHasMore(data.hasMore)
        setNextCursor(data.nextCursor)
      }
      if (projectsRes.ok) {
        const data = await projectsRes.json()
        // API now returns { own, shared }
        setProjects(data.own ?? data)
        setSharedProjects(data.shared ?? [])
      }
      if (sharedRes.ok) {
        const data = await sharedRes.json()
        setSharedChatIds(new Set(data.chatIds))
      }
      if (sharedWithMeRes.ok) {
        setSharedWithMeChats(await sharedWithMeRes.json())
      }
    } catch {
      // Silently fail — sidebar is non-critical
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const res = await fetch(`/api/chats?limit=50&cursor=${encodeURIComponent(nextCursor)}`)
      if (res.ok) {
        const data = await res.json()
        setChats((prev) => [...prev, ...data.chats])
        setHasMore(data.hasMore)
        setNextCursor(data.nextCursor)
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoadingMore(false)
    }
  }, [nextCursor, isLoadingMore])

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

  const handleRenameChat = useCallback(
    async (chatId: string, newTitle: string) => {
      const trimmed = newTitle.trim()
      if (!trimmed) {
        setRenameChatId(null)
        return
      }
      // Optimistic update
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, title: trimmed } : c))
      )
      setRenameChatId(null)
      try {
        const res = await fetch(`/api/chats/${chatId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: trimmed }),
        })
        if (!res.ok) fetchData()
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

  const deferredSearchQuery = useDeferredValue(searchQuery)

  // Project groups — always computed (independent of search, used in nav section)
  const projectGroups = useMemo(() => {
    const unpinned = chats.filter((c) => !c.isPinned)
    const projectMap = new Map<string, ChatItem[]>()
    for (const chat of unpinned) {
      if (chat.projectId) {
        const list = projectMap.get(chat.projectId) ?? []
        list.push(chat)
        projectMap.set(chat.projectId, list)
      }
    }
    return projects.map((project) => ({
      project,
      chats: projectMap.get(project.id) ?? [],
    }))
  }, [chats, projects])

  // Filtered and grouped chats (search-dependent)
  const { pinnedChats, groupedChats, isSearching } = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase()
    const isSearching = query.length > 0

    const filtered = isSearching
      ? chats.filter((c) => c.title.toLowerCase().includes(query))
      : chats

    const pinned = filtered.filter((c) => c.isPinned)
    const unpinned = filtered.filter((c) => !c.isPinned)

    if (isSearching) {
      return {
        pinnedChats: pinned,
        groupedChats: [{ label: "Ergebnisse", items: unpinned }],
        isSearching,
      }
    }

    // Only unassigned chats in chronological groups
    const unassigned = unpinned.filter((c) => !c.projectId)

    return {
      pinnedChats: pinned,
      groupedChats: groupChatsByDate(unassigned),
      isSearching,
    }
  }, [chats, deferredSearchQuery])

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

  if (chats.length === 0 && projects.length === 0 && sharedProjects.length === 0 && sharedWithMeChats.length === 0) {
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
    const isShared = sharedChatIds.has(chat.id)
    return (
      <SidebarMenuItem key={chat.id}>
        <SidebarMenuButton
          asChild
          isActive={chat.id === activeChatId}
          tooltip={chat.title}
        >
          <a href={`/c/${chat.id}`}>
            {isShared ? <Share2 className="size-4 text-primary" /> : <MessageSquare className="size-4" />}
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
            <DropdownMenuItem onClick={() => {
              setRenameChatId(chat.id)
              setRenameValue(chat.title)
            }}>
              <Pencil className="mr-2 size-4" /> Umbenennen
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShareChatId(chat.id)}>
              <Share2 className="mr-2 size-4" /> {isShared ? "Link verwalten" : "Link teilen"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setUserShareChatId(chat.id)}>
              <Users className="mr-2 size-4" /> Mit Nutzer teilen
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
      {/* Navigation links — hidden when sidebar is collapsed */}
      {!isCollapsed && (
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/artifacts"}
                tooltip="Meine Dateien"
              >
                <a href="/artifacts">
                  <Layers className="size-4" />
                  <span>Meine Dateien</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {/* Projects accordion */}
          {projects.length > 0 && (
            <Collapsible>
              <SidebarMenu>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="[&[data-state=open]>svg:last-child]:rotate-90">
                      <Folder className="size-4" />
                      <span>Meine Projekte</span>
                      <ChevronRight className="ml-auto size-4 transition-transform" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                </SidebarMenuItem>
              </SidebarMenu>
              <CollapsibleContent>
                {projectGroups.map(({ project, chats: projectChats }) => (
                  <Collapsible key={project.id}>
                    <div className="group/project flex w-full items-center pl-4 pr-2">
                      <CollapsibleTrigger className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground [&[data-state=open]>svg:first-child]:rotate-90">
                        <ChevronRight className="size-3 shrink-0 transition-transform" />
                        <span className="truncate">{project.name}</span>
                      </CollapsibleTrigger>
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover/project:opacity-100">
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
                    <CollapsibleContent>
                      {projectChats.length > 0 ? (
                        <SidebarMenu className="pl-4">
                          {projectChats.map(renderChatItem)}
                        </SidebarMenu>
                      ) : (
                        <button
                          type="button"
                          onClick={() => window.location.href = `/?project=${project.id}`}
                          className="mx-3 my-1 ml-8 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Plus className="size-3" />
                          Chat starten
                        </button>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Shared projects */}
          {sharedProjects.length > 0 && (
            <Collapsible>
              <SidebarMenu>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="[&[data-state=open]>svg:last-child]:rotate-90">
                      <Users className="size-4" />
                      <span>Geteilte Projekte</span>
                      <ChevronRight className="ml-auto size-4 transition-transform" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                </SidebarMenuItem>
              </SidebarMenu>
              <CollapsibleContent>
                {sharedProjects.map((sp) => {
                  // Show own chats in this shared project
                  const projectChats = chats.filter((c) => !c.isPinned && c.projectId === sp.id)
                  // + chats shared with me that belong to this project
                  const sharedChatsInProject = sharedWithMeChats.filter((sc) => sc.projectId === sp.id)
                  return (
                    <Collapsible key={sp.id}>
                      <div className="group/project flex w-full items-center pl-4 pr-2">
                        <CollapsibleTrigger className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground [&[data-state=open]>svg:first-child]:rotate-90">
                          <ChevronRight className="size-3 shrink-0 transition-transform" />
                          <div className="flex flex-col truncate">
                            <span className="truncate">{sp.name}</span>
                            <span className="truncate text-[11px] font-normal text-muted-foreground/70">
                              {sp.ownerName ?? sp.ownerEmail}
                            </span>
                          </div>
                        </CollapsibleTrigger>
                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover/project:opacity-100">
                          <button
                            type="button"
                            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                            onClick={() => window.location.href = `/?project=${sp.id}`}
                            title="Neuer Chat im Projekt"
                          >
                            <Plus className="size-3" />
                          </button>
                          {sp.role === "editor" && (
                            <button
                              type="button"
                              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                              onClick={() => setProjectDialogState({ open: true, project: { id: sp.id, name: sp.name, description: sp.description, chatCount: 0 } })}
                              title="Bearbeiten"
                            >
                              <Settings className="size-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <CollapsibleContent>
                        {(projectChats.length > 0 || sharedChatsInProject.length > 0) ? (
                          <SidebarMenu className="pl-4">
                            {projectChats.map(renderChatItem)}
                            {sharedChatsInProject.map((sc) => (
                              <SidebarMenuItem key={sc.id}>
                                <SidebarMenuButton
                                  asChild
                                  isActive={sc.id === activeChatId}
                                  tooltip={`${sc.title} (${sc.ownerName ?? "geteilt"})`}
                                >
                                  <a href={`/c/${sc.id}`}>
                                    <Users className="size-4 text-muted-foreground" />
                                    <span className="truncate">{sc.title}</span>
                                  </a>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            ))}
                          </SidebarMenu>
                        ) : (
                          <button
                            type="button"
                            onClick={() => window.location.href = `/?project=${sp.id}`}
                            className="mx-3 my-1 ml-8 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Plus className="size-3" />
                            Chat starten
                          </button>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>
          )}
        </SidebarGroup>
      )}

      {/* Search — hidden when sidebar is collapsed */}
      {!isCollapsed && (
        <div className="px-3 pb-2 pt-3">
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

      {/* Shared with me — chats not in a shared project */}
      {(() => {
        const standaloneSharedChats = sharedWithMeChats.filter((sc) => !sharedProjects.some((sp) => sp.id === sc.projectId))
        if (standaloneSharedChats.length === 0) return null
        return (
        <SidebarGroup>
          <SidebarGroupLabel>Mit mir geteilt</SidebarGroupLabel>
          <SidebarMenu>
            {standaloneSharedChats.map((sc) => (
                <SidebarMenuItem key={sc.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={sc.id === activeChatId}
                    tooltip={`${sc.title} — von ${sc.ownerName ?? sc.ownerEmail}`}
                  >
                    <a href={`/c/${sc.id}`}>
                      <Users className="size-4 text-muted-foreground" />
                      <div className="flex flex-col truncate">
                        <span className="truncate">{sc.title}</span>
                        <span className="truncate text-[11px] text-muted-foreground/70">
                          {sc.ownerName ?? sc.ownerEmail}
                        </span>
                      </div>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
          </SidebarMenu>
        </SidebarGroup>
        )
      })()}

      {/* Ungrouped chats (chronological) */}
      {groupedChats.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map(renderChatItem)}
          </SidebarMenu>
        </SidebarGroup>
      ))}

      {/* Infinite scroll sentinel */}
      {hasMore && !isSearching && (
        <LoadMoreSentinel loadMore={loadMore} isLoading={isLoadingMore} />
      )}

      {/* No results */}
      {isSearching && pinnedChats.length === 0 && groupedChats.every((g) => g.items.length === 0) && (
        <div className="px-4 py-3 text-xs text-muted-foreground">
          Keine Ergebnisse.
        </div>
      )}

      {/* Search hint when paginated */}
      {isSearching && hasMore && (
        <div className="px-4 py-1 text-xs text-muted-foreground/60">
          Nur die letzten geladenen Chats werden durchsucht.
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

      {/* Rename chat dialog */}
      <AlertDialog open={!!renameChatId} onOpenChange={(open) => { if (!open) setRenameChatId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chat umbenennen</AlertDialogTitle>
          </AlertDialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            if (renameChatId) handleRenameChat(renameChatId, renameValue)
          }}>
            <div className="relative mb-4">
              <Input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                maxLength={200}
                placeholder="Neuer Titel"
                className="pr-8"
              />
              {renameValue && (
                <button
                  type="button"
                  onClick={() => setRenameValue("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (renameChatId) handleRenameChat(renameChatId, renameValue)
                }}
              >
                Umbenennen
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
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

      {/* Share dialog (public link) */}
      {shareChatId && (
        <ShareDialog
          open={!!shareChatId}
          onOpenChange={(open) => { if (!open) setShareChatId(null) }}
          chatId={shareChatId}
          chatTitle={chats.find((c) => c.id === shareChatId)?.title ?? ""}
          onShared={() => setSharedChatIds((prev) => new Set([...prev, shareChatId]))}
          onUnshared={() => setSharedChatIds((prev) => { const next = new Set(prev); next.delete(shareChatId); return next })}
        />
      )}

      {/* User share dialog (share with specific user) */}
      {userShareChatId && (
        <UserShareDialog
          open={!!userShareChatId}
          onOpenChange={(open) => { if (!open) setUserShareChatId(null) }}
          chatId={userShareChatId}
          chatTitle={chats.find((c) => c.id === userShareChatId)?.title ?? ""}
        />
      )}
    </>
  )
}
