"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, BookOpen, Users, Cpu, Plug, Coins, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

const BASE_NAV_ITEMS = [
  { href: "/admin/skills", label: "Skills", icon: BookOpen },
  { href: "/admin/experts", label: "Experts", icon: Users },
  { href: "/admin/models", label: "Models", icon: Cpu },
  { href: "/admin/mcp-servers", label: "MCP Servers", icon: Plug },
  { href: "/admin/credits", label: "Credits", icon: Coins },
]

const SUPERADMIN_NAV_ITEMS = [
  { href: "/admin/users", label: "Users", icon: ShieldCheck },
]

interface AdminShellProps {
  children: React.ReactNode
  isSuperAdmin?: boolean
}

export function AdminShell({ children, isSuperAdmin }: AdminShellProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <span className="text-sm font-semibold">Admin</span>
          <nav className="flex items-center gap-1">
            {[...BASE_NAV_ITEMS, ...(isSuperAdmin ? SUPERADMIN_NAV_ITEMS : [])].map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Button
                  key={item.href}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  asChild
                >
                  <Link href={item.href} className="flex items-center gap-2">
                    <item.icon className="size-4" />
                    <span className="hidden md:inline">{item.label}</span>
                  </Link>
                </Button>
              )
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}
