"use client"

import { memo, useState } from "react"
import { BookmarkIcon, ChevronDownIcon } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

interface MemoryIndicatorProps {
  memories: Array<{ text: string; score?: number }>
}

export const MemoryIndicator = memo(function MemoryIndicator({
  memories,
}: MemoryIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (memories.length === 0) return null

  return (
    <Collapsible
      className="not-prose mb-4"
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-muted-foreground text-sm transition-colors hover:bg-muted/50 hover:text-foreground">
        <BookmarkIcon className="size-4" />
        <p>
          {memories.length} {memories.length === 1 ? "Memory" : "Memories"}{" "}
          geladen
        </p>
        <ChevronDownIcon
          className={cn(
            "size-4 transition-transform",
            isOpen ? "rotate-180" : "rotate-0",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          "mt-2 text-sm",
          "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-muted-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
        )}
      >
        <ul className="space-y-1 pl-6 list-disc">
          {memories.map((mem, i) => (
            <li key={i}>{mem.text}</li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
})
