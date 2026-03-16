"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowDown, ArrowUp, Coins } from "lucide-react"
import { cn } from "@/lib/utils"

interface Transaction {
  id: string
  type: string
  amount: number
  balanceAfter: number
  description: string | null
  modelId: string | null
  createdAt: string
}

interface CreditHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreditHistoryDialog({ open, onOpenChange }: CreditHistoryDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [balance, setBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const loadTransactions = useCallback(async (offset = 0) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/credits?limit=20&offset=${offset}`)
      if (res.ok) {
        const data = await res.json()
        if (offset === 0) {
          setTransactions(data.transactions)
          setBalance(data.balance)
        } else {
          setTransactions((prev) => [...prev, ...data.transactions])
        }
        setHasMore(data.transactions.length === 20)
      }
    } catch {
      // Non-critical
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadTransactions(0)
  }, [open, loadTransactions])

  const typeLabels: Record<string, string> = {
    usage: "Verbrauch",
    grant: "Aufladung",
    admin_adjust: "Korrektur",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="size-5" />
            Credit-Verlauf
          </DialogTitle>
          <DialogDescription>
            Aktuelles Guthaben: {balance.toLocaleString("de-DE")} Credits
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto">
          {transactions.length === 0 && !isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Noch keine Transaktionen vorhanden.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/50"
                >
                  <div className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full",
                    tx.amount > 0
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {tx.amount > 0 ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium">
                        {typeLabels[tx.type] ?? tx.type}
                      </span>
                      <span className={cn(
                        "shrink-0 tabular-nums font-medium",
                        tx.amount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                      )}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString("de-DE")}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{tx.description ?? ""}</span>
                      <span className="shrink-0">
                        {new Date(tx.createdAt).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasMore && transactions.length > 0 && (
            <div className="pt-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadTransactions(transactions.length)}
                disabled={isLoading}
              >
                {isLoading ? "Laden..." : "Mehr laden"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
