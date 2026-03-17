"use client"

import { useMemo, useState } from "react"
import { useSidebar } from "@/components/ui/sidebar"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { KeyboardShortcutsDialog } from "./keyboard-shortcuts-dialog"

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const { toggleSidebar } = useSidebar()
  const [helpOpen, setHelpOpen] = useState(false)

  const shortcuts = useMemo(() => [
    {
      key: "k",
      ctrlOrMeta: true,
      action: () => {
        const el = document.getElementById("sidebar-search")
        if (el instanceof HTMLInputElement) {
          el.focus()
          el.select()
        }
      },
    },
    {
      key: "b",
      ctrlOrMeta: true,
      action: toggleSidebar,
    },
    {
      key: "n",
      alt: true,
      action: () => { window.location.href = "/" },
    },
    {
      key: ".",
      ctrlOrMeta: true,
      action: () => setHelpOpen((prev) => !prev),
    },
  ], [toggleSidebar])

  useKeyboardShortcuts(shortcuts)

  return (
    <>
      {children}
      <KeyboardShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  )
}
