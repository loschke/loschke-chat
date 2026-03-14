"use client"

import { useEffect, useState } from "react"
import { UploadIcon } from "lucide-react"

export function DropZoneOverlay() {
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    let dragCounter = 0

    function handleDragEnter(e: DragEvent) {
      if (!e.dataTransfer?.types.includes("Files")) return
      dragCounter++
      if (dragCounter === 1) setIsDragging(true)
    }

    function handleDragLeave() {
      dragCounter--
      if (dragCounter === 0) setIsDragging(false)
    }

    function handleDrop() {
      dragCounter = 0
      setIsDragging(false)
    }

    document.addEventListener("dragenter", handleDragEnter)
    document.addEventListener("dragleave", handleDragLeave)
    document.addEventListener("drop", handleDrop)

    return () => {
      document.removeEventListener("dragenter", handleDragEnter)
      document.removeEventListener("dragleave", handleDragLeave)
      document.removeEventListener("drop", handleDrop)
    }
  }, [])

  if (!isDragging) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary/50 bg-background/80 px-12 py-8">
        <UploadIcon className="size-8 text-primary/70" />
        <p className="text-sm font-medium text-muted-foreground">Dateien hier ablegen</p>
      </div>
    </div>
  )
}
