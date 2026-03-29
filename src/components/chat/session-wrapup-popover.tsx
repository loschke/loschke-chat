"use client"

import { useState } from "react"
import { FileOutput, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { WRAPUP_TYPES } from "@/config/wrapup"

interface SessionWrapupPopoverProps {
  onSubmit: (type: string, context?: string, format?: "text" | "audio") => void
  disabled?: boolean
  ttsEnabled?: boolean
}

export function SessionWrapupPopover({ onSubmit, disabled, ttsEnabled }: SessionWrapupPopoverProps) {
  const [open, setOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [context, setContext] = useState("")
  const [format, setFormat] = useState<"text" | "audio">("text")

  function handleSubmit() {
    if (!selectedType) return
    onSubmit(selectedType, context.trim() || undefined, format)
    setOpen(false)
    setSelectedType(null)
    setContext("")
    setFormat("text")
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setSelectedType(null)
      setContext("")
      setFormat("text")
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg"
              disabled={disabled}
            >
              <FileOutput className="size-4" />
              <span className="sr-only">Session abschließen</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">Session abschließen</TooltipContent>
      </Tooltip>
      <PopoverContent side="top" align="start" className="w-[min(320px,calc(100vw-2rem))] p-4">
        <div className="space-y-3">
          <p className="text-sm font-medium">Session abschließen</p>
          <div className="flex flex-wrap gap-1.5">
            {WRAPUP_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setSelectedType(t.key === selectedType ? null : t.key)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  selectedType === t.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {selectedType && (
            <p className="text-xs text-muted-foreground">
              {WRAPUP_TYPES.find((t) => t.key === selectedType)?.description}
            </p>
          )}
          <Textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Zusätzliche Hinweise (optional)"
            rows={2}
            maxLength={1000}
            className="resize-none text-sm"
          />
          {ttsEnabled && (
            <button
              type="button"
              onClick={() => setFormat((f) => f === "text" ? "audio" : "text")}
              className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-xs transition-colors hover:bg-muted/50"
            >
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Volume2 className="size-3.5" />
                Audio-Ausgabe
              </span>
              <span
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                  format === "audio" ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${
                    format === "audio" ? "translate-x-4" : "translate-x-0.5"
                  } mt-0.5`}
                />
              </span>
            </button>
          )}
          <Button
            size="sm"
            className="w-full"
            disabled={!selectedType}
            onClick={handleSubmit}
          >
            Erstellen
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
