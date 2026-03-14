import {
  ALLOWED_MIME_TYPES,
  BLOCKED_EXTENSIONS,
  DEFAULT_MAX_SIZE,
  type UploadOptions,
} from "./types"

const SAFE_FILENAME_PATTERN = /^[a-zA-Z0-9._-]+$/

export type FileValidationCode =
  | "EMPTY"
  | "TOO_LARGE"
  | "INVALID_TYPE"
  | "BLOCKED_EXTENSION"
  | "INVALID_FILENAME"
  | "INVALID_MAGIC_BYTES"

export class FileValidationError extends Error {
  code: FileValidationCode

  constructor(code: FileValidationCode, message: string) {
    super(message)
    this.name = "FileValidationError"
    this.code = code
  }
}

export interface ValidationResult {
  valid: boolean
  error?: string
  code?: FileValidationCode
}

export function validateFile(
  file: File,
  options?: UploadOptions
): ValidationResult {
  const maxSize = options?.maxSize ?? DEFAULT_MAX_SIZE
  const allowedTypes = options?.allowedTypes ?? [...ALLOWED_MIME_TYPES]

  // Size check
  if (file.size === 0) {
    return { valid: false, error: "Datei ist leer.", code: "EMPTY" }
  }
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / 1024 / 1024)
    return { valid: false, error: `Datei zu gross. Maximum: ${maxMB}MB.`, code: "TOO_LARGE" }
  }

  // MIME type check
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: "Dateityp nicht erlaubt.", code: "INVALID_TYPE" }
  }

  // Extension check
  const ext = file.name.split(".").pop()?.toLowerCase()
  if (ext && (BLOCKED_EXTENSIONS as readonly string[]).includes(ext)) {
    return { valid: false, error: "Dateityp nicht erlaubt.", code: "BLOCKED_EXTENSION" }
  }

  // Filename check
  if (!SAFE_FILENAME_PATTERN.test(file.name)) {
    return { valid: false, error: "Dateiname enthaelt ungueltige Zeichen.", code: "INVALID_FILENAME" }
  }

  return { valid: true }
}

/**
 * Magic byte signatures for common file types.
 * Used to verify file content matches the declared MIME type.
 */
const MAGIC_BYTES: Record<string, number[][]> = {
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP container)
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
  // Office Open XML (.docx, .xlsx, .pptx) — ZIP container format
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [[0x50, 0x4b, 0x03, 0x04]],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [[0x50, 0x4b, 0x03, 0x04]],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [[0x50, 0x4b, 0x03, 0x04]],
}

export function validateMagicBytes(
  buffer: ArrayBuffer,
  mimeType: string
): boolean {
  const signatures = MAGIC_BYTES[mimeType]
  if (!signatures) {
    // No signature check for text-based types (markdown, plaintext)
    return true
  }

  const bytes = new Uint8Array(buffer.slice(0, 8))
  return signatures.some((sig) =>
    sig.every((byte, i) => bytes[i] === byte)
  )
}

/**
 * Sanitize a filename to only safe characters.
 * Replaces unsafe characters with dashes.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}
