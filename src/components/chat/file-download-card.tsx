"use client"

import {
  FileSpreadsheetIcon,
  FileTextIcon,
  PresentationIcon,
  DownloadIcon,
  FileIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"

/** Map file extensions to icons */
const FILE_ICONS: Record<string, typeof FileIcon> = {
  pptx: PresentationIcon,
  xlsx: FileSpreadsheetIcon,
  docx: FileTextIcon,
  pdf: FileTextIcon,
}

/** Map file extensions to labels */
const FILE_LABELS: Record<string, string> = {
  pptx: "PowerPoint",
  xlsx: "Excel",
  docx: "Word",
  pdf: "PDF",
}

interface FileDownloadCardProps {
  fileId: string
  fileName: string
  /** File extension without dot (e.g. "pptx", "xlsx") */
  fileType: string
}

export function FileDownloadCard({ fileId, fileName, fileType }: FileDownloadCardProps) {
  const Icon = FILE_ICONS[fileType] ?? FileIcon
  const label = FILE_LABELS[fileType] ?? fileType.toUpperCase()

  return (
    <div className="flex items-center gap-3 rounded-xl border p-3 widget-card max-w-sm">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{fileName}</p>
        <p className="text-xs text-muted-foreground">{label}-Dokument</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        asChild
      >
        <a href={`/api/files/${fileId}`} download={fileName} target="_blank" rel="noopener noreferrer">
          <DownloadIcon className="size-4" />
          <span className="sr-only">Herunterladen</span>
        </a>
      </Button>
    </div>
  )
}
