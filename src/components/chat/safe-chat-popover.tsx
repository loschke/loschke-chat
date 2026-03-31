"use client"

import { Shield, Cloud, HardDrive } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { SafeChatState, SafeChatMode } from "@/hooks/use-business-mode"

interface SafeChatPopoverProps {
  safeChat: SafeChatState
}

export function SafeChatPopover({ safeChat }: SafeChatPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "size-8",
            safeChat.isActive && "text-primary"
          )}
        >
          <Shield className={cn("size-4", safeChat.isActive && "fill-current")} />
          <span className="sr-only">{safeChat.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-64 p-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className={cn(
                "size-4",
                safeChat.isActive ? "text-primary fill-current" : "text-muted-foreground"
              )} />
              <span className="text-sm font-medium">{safeChat.label}</span>
            </div>
            <Switch
              checked={safeChat.isActive}
              onCheckedChange={safeChat.toggleSession}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Nachrichten ueber datenschutzkonforme Modelle senden.
          </p>

          {safeChat.isActive && safeChat.hasLocalModel && (
            <div className="flex gap-1.5">
              <ModeButton
                active={safeChat.mode === "safe"}
                icon={<Cloud className="size-3.5" />}
                label="Sicher"
                description="EU/DE-Modell"
                onClick={() => safeChat.setMode("safe")}
              />
              <ModeButton
                active={safeChat.mode === "local"}
                icon={<HardDrive className="size-3.5" />}
                label="Lokal"
                description="Ollama"
                onClick={() => safeChat.setMode("local")}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ModeButton({ active, icon, label, description, onClick }: {
  active: boolean
  icon: React.ReactNode
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition-colors",
        active
          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
          : "bg-muted/50 text-muted-foreground hover:bg-muted"
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
      <span className="text-[10px] opacity-70">{description}</span>
    </button>
  )
}
