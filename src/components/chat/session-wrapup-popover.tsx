"use client"

import { useState } from "react"
import { FileOutput, FileText, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { WRAPUP_TYPES } from "@/config/wrapup"

interface SessionWrapupPopoverProps {
  onSubmit: (type: string, context?: string, format?: "text" | "audio") => void
  disabled?: boolean
  ttsEnabled?: boolean
  memoryEnabled?: boolean
}

export function SessionWrapupPopover({ onSubmit, disabled, ttsEnabled, memoryEnabled }: SessionWrapupPopoverProps) {
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
            {WRAPUP_TYPES.filter((t) => t.key !== "memories" || memoryEnabled).map((t) => (
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
            placeholder={selectedType === "memories" ? "Worauf soll ich mich konzentrieren? (optional)" : "Zusätzliche Hinweise (optional)"}
            rows={2}
            maxLength={1000}
            className="resize-none text-sm"
          />
          {ttsEnabled && selectedType !== "memories" && selectedType !== "prd" && (
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={format}
              onValueChange={(v) => { if (v) setFormat(v as "text" | "audio") }}
              className="w-full"
            >
              <ToggleGroupItem value="text" className="flex-1 gap-1.5 text-xs">
                <FileText className="size-3.5" />
                Text
              </ToggleGroupItem>
              <ToggleGroupItem value="audio" className="flex-1 gap-1.5 text-xs">
                <Volume2 className="size-3.5" />
                Audio
              </ToggleGroupItem>
            </ToggleGroup>
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
