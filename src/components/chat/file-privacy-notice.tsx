"use client"

import { ShieldAlertIcon, XIcon } from "lucide-react"
import { useState } from "react"

interface FilePrivacyNoticeProps {
  modelProvider?: string
  modelRegion?: "eu" | "us"
}

/**
 * Amber notice bar rendered directly above the PromptInput.
 * Uses matching rounded-top + amber border to visually merge with the input below.
 * Dismissible per session — reappears when files are re-attached.
 */
export function FilePrivacyNotice({ modelProvider, modelRegion }: FilePrivacyNoticeProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="flex items-center gap-2 rounded-t-xl border border-b-0 border-amber-400/40 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400">
      <ShieldAlertIcon className="size-3.5 shrink-0" />
      <span className="flex-1">
        Dateien werden an den KI-Anbieter
        {modelProvider ? ` (${modelProvider}` : ""}
        {modelRegion ? `, Region: ${modelRegion.toUpperCase()}` : ""}
        {modelProvider ? ")" : ""} gesendet.
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-0.5 hover:bg-amber-500/15"
      >
        <XIcon className="size-3.5" />
        <span className="sr-only">Hinweis schließen</span>
      </button>
    </div>
  )
}
