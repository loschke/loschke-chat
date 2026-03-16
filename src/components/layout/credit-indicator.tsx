"use client"

import { useEffect, useState } from "react"
import { Coins } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

function formatCredits(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return n.toLocaleString("de-DE")
}

function getColorClass(balance: number): string {
  if (balance > 10_000) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
  if (balance > 1_000) return "bg-amber-500/15 text-amber-600 dark:text-amber-400"
  return "bg-red-500/15 text-red-600 dark:text-red-400"
}

export function CreditIndicator() {
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const res = await fetch("/api/credits")
        if (res.ok && mounted) {
          const data = await res.json()
          setBalance(data.balance)
        }
      } catch {
        // Non-critical
      }
    }

    load()

    // Refresh balance periodically and after chat messages
    const interval = setInterval(load, 60_000)
    const handleUpdate = () => { setTimeout(load, 2000) }
    window.addEventListener("chat-updated", handleUpdate)

    return () => {
      mounted = false
      clearInterval(interval)
      window.removeEventListener("chat-updated", handleUpdate)
    }
  }, [])

  if (balance === null) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            getColorClass(balance)
          )}
        >
          <Coins className="size-3" />
          <span>{formatCredits(balance)}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{balance.toLocaleString("de-DE")} Credits</p>
      </TooltipContent>
    </Tooltip>
  )
}
