"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, BookOpen, Users, Cpu, Plug } from "lucide-react"
import { Button } from "@/components/ui/button"

const NAV_ITEMS = [
  { href: "/admin/skills", label: "Skills", icon: BookOpen },
  { href: "/admin/experts", label: "Experts", icon: Users },
  { href: "/admin/models", label: "Models", icon: Cpu },
  { href: "/admin/mcp-servers", label: "MCP Servers", icon: Plug },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
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
            {NAV_ITEMS.map((item) => {
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
                    {item.label}
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
