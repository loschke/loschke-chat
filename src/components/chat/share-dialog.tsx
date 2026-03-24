"use client"

import { useState, useCallback } from "react"
import { Copy, Check, LinkIcon, Unlink } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chatId: string
  chatTitle: string
  onShared: () => void
  onUnshared: () => void
}

export function ShareDialog({ open, onOpenChange, chatId, chatTitle, onShared, onUnshared }: ShareDialogProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const createShareLink = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/chats/${chatId}/share`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        const fullUrl = `${window.location.origin}${data.url}`
        setShareUrl(fullUrl)
        onShared()
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false)
    }
  }, [chatId, onShared])

  const revokeShare = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/chats/${chatId}/share`, { method: "DELETE" })
      if (res.ok) {
        setShareUrl(null)
        onUnshared()
        onOpenChange(false)
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false)
    }
  }, [chatId, onUnshared, onOpenChange])

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard not available
    }
  }, [shareUrl])

  // Load existing share when dialog opens
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (newOpen) {
      setShareUrl(null)
      setCopied(false)
      // Check if already shared
      fetch(`/api/chats/${chatId}/share`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.shared) {
            setShareUrl(`${window.location.origin}${data.url}`)
          }
        })
        .catch(() => {})
    }
    onOpenChange(newOpen)
  }, [chatId, onOpenChange])

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Chat teilen</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{chatTitle}&rdquo; per Link teilen. Jeder mit dem Link kann den Chat lesen.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {shareUrl ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="text-xs"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <AlertDialogFooter>
              <Button
                variant="ghost"
                size="sm"
                onClick={revokeShare}
                disabled={isLoading}
                className="text-destructive hover:text-destructive"
              >
                <Unlink className="mr-2 size-4" />
                Teilen aufheben
              </Button>
              <AlertDialogCancel>Schliessen</AlertDialogCancel>
            </AlertDialogFooter>
          </div>
        ) : (
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <Button onClick={createShareLink} disabled={isLoading}>
              <LinkIcon className="mr-2 size-4" />
              {isLoading ? "Wird erstellt..." : "Link erstellen"}
            </Button>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
