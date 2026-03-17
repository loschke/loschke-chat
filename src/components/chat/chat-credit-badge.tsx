"use client"

import { useEffect, useState } from "react"
import { Coins } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatCredits } from "@/lib/credits"

interface ChatCreditBadgeProps {
  chatId: string
}

export function ChatCreditBadge({ chatId }: ChatCreditBadgeProps) {
  const [credits, setCredits] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const res = await fetch(`/api/credits?chatId=${chatId}`)
        if (res.ok && mounted) {
          const data = await res.json()
          setCredits(data.chatCredits)
        }
      } catch {
        // Non-critical
      }
    }

    load()

    const handleUpdate = () => { setTimeout(load, 2000) }
    window.addEventListener("chat-updated", handleUpdate)

    return () => {
      mounted = false
      window.removeEventListener("chat-updated", handleUpdate)
    }
  }, [chatId])

  if (credits === null || credits === 0) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 rounded-md bg-primary-foreground/10 px-2 py-0.5 text-xs font-medium text-primary-foreground">
          <Coins className="size-3" />
          <span>{formatCredits(credits)}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{credits.toLocaleString("de-DE")} Credits in diesem Chat</p>
      </TooltipContent>
    </Tooltip>
  )
}
