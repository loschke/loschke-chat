"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  ArrowLeft,
  Menu,
  BookOpen,
  Users,
  Cpu,
  Plug,
  Coins,
  Activity,
  ShieldCheck,
  FolderOpen,
  Layers,
  Settings,
  Zap,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  Users,
  Cpu,
  Plug,
  Coins,
  Activity,
  ShieldCheck,
  FolderOpen,
  Layers,
  Settings,
  Zap,
}

export interface NavItem {
  href: string
  label: string
  icon: string
}

interface ManagementShellProps {
  title: string
  backHref: string
  items: NavItem[]
  children: React.ReactNode
}

function NavItems({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[]
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive = pathname.startsWith(item.href)
        const Icon = ICON_MAP[item.icon]
        return (
          <Button
            key={item.href}
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            className={cn("justify-start gap-2", !isActive && "text-muted-foreground")}
            asChild
          >
            <Link href={item.href} onClick={onNavigate}>
              {Icon && <Icon className="size-4" />}
              {item.label}
            </Link>
          </Button>
        )
      })}
    </nav>
  )
}

export function ManagementShell({ title, backHref, items, children }: ManagementShellProps) {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex items-center gap-2 border-b bg-background/95 px-4 backdrop-blur lg:hidden h-14">
        <Button variant="ghost" size="icon" asChild title="Zurück" aria-label="Zurück">
          <Link href={backHref}>
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
        </Button>
        <span className="text-sm font-semibold">{title}</span>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto" title="Menü öffnen" aria-label="Menü öffnen">
              <Menu className="size-4" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-56">
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
            </SheetHeader>
            <div className="px-4">
              <NavItems
                items={items}
                pathname={pathname}
                onNavigate={() => setSheetOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex h-[calc(100vh)] sticky top-0 w-52 shrink-0 flex-col border-r bg-background">
          <div className="flex h-14 items-center gap-2 border-b px-4">
            <Button variant="ghost" size="icon" asChild title="Zurück" aria-label="Zurück">
              <Link href={backHref}>
                <ArrowLeft className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <span className="text-sm font-semibold">{title}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <NavItems items={items} pathname={pathname} />
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
