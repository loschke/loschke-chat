"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface UseResizeHandleOptions {
  /** Minimum panel width as fraction (0-1). Default: 0.25 */
  min?: number
  /** Maximum panel width as fraction (0-1). Default: 0.75 */
  max?: number
  /** Initial panel width as fraction (0-1). Default: 0.5 */
  initial?: number
}

/**
 * Hook for a draggable resize handle between two panels.
 * Returns the right panel width as a fraction and a ref for the container.
 */
export function useResizeHandle(options: UseResizeHandleOptions = {}) {
  const { min = 0.25, max = 0.75, initial = 0.5 } = options
  const [panelWidth, setPanelWidth] = useState(initial)
  const [isResizing, setIsResizing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    isDragging.current = true
    setIsResizing(true)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const fraction = 1 - (e.clientX - rect.left) / rect.width
    setPanelWidth(Math.min(max, Math.max(min, fraction)))
  }, [min, max])

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
    setIsResizing(false)
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
  }, [])

  // Reset to default on double-click
  const handleDoubleClick = useCallback(() => {
    setPanelWidth(initial)
  }, [initial])

  // ESC cancels drag
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDragging.current) {
        isDragging.current = false
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
        setPanelWidth(initial)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [initial])

  return {
    panelWidth,
    isResizing,
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDoubleClick,
  }
}
