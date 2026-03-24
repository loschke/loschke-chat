import { brand } from "@/config/brand"

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-4">
          <span className="text-sm font-semibold text-muted-foreground">
            Geteilter Chat
          </span>
          <span className="text-xs text-muted-foreground">
            via {brand.name}
          </span>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  )
}
