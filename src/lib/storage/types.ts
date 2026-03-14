export interface UploadOptions {
  /** Max file size in bytes. Default: 10MB */
  maxSize?: number
  /** Allowed MIME types. Default: see ALLOWED_MIME_TYPES */
  allowedTypes?: string[]
  /** Storage key prefix. Default: "uploads/{userId}/" */
  prefix?: string
}

export interface UploadResult {
  key: string
  url: string
  size: number
  contentType: string
  filename: string
}

export interface StorageFile {
  key: string
  size: number
  lastModified: Date
}

export const DEFAULT_MAX_SIZE = 10 * 1024 * 1024 // 10MB

export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/markdown",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",   // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",         // .xlsx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
] as const

export const BLOCKED_EXTENSIONS = [
  "exe", "bat", "cmd", "com", "msi", "scr",
  "js", "jsx", "ts", "tsx", "vbs", "wsf",
  "sh", "bash", "zsh", "ps1", "psm1",
  "php", "py", "rb", "pl", "cgi",
  "dll", "so", "dylib",
] as const
