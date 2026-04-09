"use client"

import { LogOut, LayoutGrid, Shield, User } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AppUser } from "@/lib/auth"

interface NavUserProps {
  user: AppUser | null
  isAdmin?: boolean
}

/** Anzeigename: Name > E-Mail-Lokalteil > "Lernender" */
function getDisplayName(user: AppUser): string {
  if (user.name) return user.name
  if (user.email) return user.email.split("@")[0]
  return "Lernender"
}

/** Initialen aus Name oder E-Mail ableiten */
function getInitials(user: AppUser): string {
  if (user.name) {
    return user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }
  if (user.email) {
    return user.email[0].toUpperCase()
  }
  return "🎓"
}

export function NavUser({ user, isAdmin }: NavUserProps) {
  if (!user) {
    return (
      <Button variant="ghost" size="sm" asChild>
        <a href="/api/auth/sign-in" className="flex items-center gap-2">
          <User className="size-4" />
          <span>Anmelden</span>
        </a>
      </Button>
    )
  }

  const displayName = getDisplayName(user)
  const initials = getInitials(user)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative size-8 rounded-full hover:bg-primary-foreground/15" title="Benutzermenü" aria-label="Benutzermenü">
            <Avatar className="size-7" aria-hidden="true">
              <AvatarImage src={user.avatar} alt={displayName} />
              <AvatarFallback className="bg-primary-foreground/20 text-xs text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {displayName}
              </p>
              {user.email && (
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="/workspace" className="flex items-center gap-2">
              <LayoutGrid className="size-4" />
              <span>Workspace</span>
            </a>
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem asChild>
              <a href="/admin/skills" className="flex items-center gap-2">
                <Shield className="size-4" />
                <span>Admin</span>
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="/api/auth/sign-out" className="flex items-center gap-2">
              <LogOut className="size-4" />
              <span>Abmelden</span>
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

    </>
  )
}
