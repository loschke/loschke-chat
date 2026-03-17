import { useEffect } from "react"

interface Shortcut {
  key: string
  ctrlOrMeta?: boolean
  alt?: boolean
  shift?: boolean
  action: () => void
}

function isInputElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  return el.isContentEditable
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (isInputElement(e.target)) return

      for (const s of shortcuts) {
        const ctrlMeta = s.ctrlOrMeta ? (e.metaKey || e.ctrlKey) : (!e.metaKey && !e.ctrlKey)
        const alt = s.alt ? e.altKey : !e.altKey
        const shift = s.shift ? e.shiftKey : !e.shiftKey

        if (e.key.toLowerCase() === s.key.toLowerCase() && ctrlMeta && alt && shift) {
          e.preventDefault()
          s.action()
          return
        }
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [shortcuts])
}
