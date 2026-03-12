import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "./theme-toggle"

export function ChatHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 bg-primary px-4 text-primary-foreground">
      <SidebarTrigger className="-ml-1 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground" />
      <Separator orientation="vertical" className="mr-2 h-4 bg-primary-foreground/25" />
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  )
}
