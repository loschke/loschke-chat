"use client"

import { ModelSelector } from "./model-selector"

interface ChatToolbarProps {
  modelId: string
  onModelChange: (modelId: string) => void
  disabled?: boolean
}

export function ChatToolbar({ modelId, onModelChange, disabled }: ChatToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-6 py-1">
      <ModelSelector
        value={modelId}
        onChange={onModelChange}
        disabled={disabled}
      />
    </div>
  )
}
