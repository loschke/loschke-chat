/**
 * File persistence: R2 storage for chat attachments and code execution outputs.
 */

import { features } from "@/config/features"
import { getErrorMessage } from "@/lib/errors"
import { uploadBuffer, isR2Url, fetchFromR2 } from "@/lib/storage"
import { extractDocumentContent, EXTRACTABLE_MIME_TYPES } from "@/lib/ai/document-extraction"
import { sanitizeFilename } from "@/lib/storage/validation"
import { ALLOWED_MIME_TYPES } from "@/lib/storage/types"
import { nanoid } from "nanoid"
import { createArtifact } from "@/lib/db/queries/artifacts"
import { extractFileRefs, ANTHROPIC_FILES_API_BASE, ANTHROPIC_FILES_API_BETA } from "@/lib/ai/anthropic-skills"

/** MIME types allowed for chat file attachments — derived from storage types */
const ALLOWED_PERSIST_TYPES: Set<string> = new Set(ALLOWED_MIME_TYPES)

/** Max file size for R2 persistence (10MB, matches client-side limit) */
const MAX_PERSIST_SIZE = 10 * 1024 * 1024

const PDF_MIME = "application/pdf"
const FILE_ID_PATTERN = /^file_[a-zA-Z0-9]{20,60}$/
const MAX_SKILL_FILES = 10

/**
 * Persist PDF files from code execution to R2 + Artifact.
 * Binary formats (PPTX/XLSX/DOCX) remain as temporary file references via Files API proxy.
 */
export async function persistCodeExecutionFiles(
  assistantParts: Array<Record<string, unknown>>,
  chatId: string,
  userId: string,
): Promise<void> {
  if (!features.anthropicSkills.enabled) return

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return

  // Collect PDF file refs from code_execution tool results (capped for safety)
  const pdfFiles: Array<{ fileId: string; fileName: string }> = []
  for (const part of assistantParts) {
    if (part.type !== "tool-result" || part.toolName !== "code_execution") continue
    for (const ref of extractFileRefs(part.result)) {
      if (ref.extension === "pdf" && FILE_ID_PATTERN.test(ref.fileId)) {
        pdfFiles.push({ fileId: ref.fileId, fileName: ref.fileName })
        if (pdfFiles.length >= MAX_SKILL_FILES) break
      }
    }
    if (pdfFiles.length >= MAX_SKILL_FILES) break
  }

  if (pdfFiles.length === 0) return

  await Promise.all(pdfFiles.map(async ({ fileId, fileName }) => {
    try {
      const response = await fetch(`${ANTHROPIC_FILES_API_BASE}/${fileId}/content`, {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": ANTHROPIC_FILES_API_BETA,
        },
      })
      if (!response.ok) {
        console.warn(`[persist] Failed to download file ${fileId}: ${response.status}`)
        return
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      if (buffer.length > MAX_PERSIST_SIZE) {
        console.warn(`[persist] Skill file ${fileId} exceeds size limit: ${buffer.length} bytes`)
        return
      }
      const storageKey = `skill-files/${userId}/${chatId}/${nanoid()}-${sanitizeFilename(fileName) || fileId}`
      const r2Url = await uploadBuffer(buffer, PDF_MIME, fileName, storageKey)

      await createArtifact({
        chatId,
        type: "code",
        title: fileName.replace(/\.[^.]+$/, ""),
        content: "",
        language: "pdf",
        fileUrl: r2Url,
      })

      console.log(`[persist] Persisted skill file: ${fileName} → R2 + Artifact`)
    } catch (err) {
      console.warn(`[persist] Skill file persistence failed for ${fileId}:`, getErrorMessage(err))
    }
  }))
}

/**
 * Persist file parts (data URLs) to R2 storage.
 * Replaces inline data URLs with R2 URLs for efficient DB storage.
 * Falls back silently if R2 is not configured or upload fails.
 */
export async function persistFilePartsToR2(
  parts: Array<Record<string, unknown>>,
  chatId: string,
  userId: string
): Promise<Array<Record<string, unknown>>> {
  if (!features.storage.enabled) return parts

  const result = await Promise.all(parts.map(async (part) => {
    // Files already uploaded to R2 (from pre-signed direct upload):
    // - Documents: extract text and persist as text part (avoids re-fetch on follow-up messages)
    // - Images: keep R2-URL as-is (must stay binary for LLM)
    if (part.type === "file" && typeof part.url === "string" && isR2Url(part.url as string)) {
      const mediaType = (part.mediaType as string) ?? ""
      const filename = (part.filename as string) ?? "attachment"

      if (EXTRACTABLE_MIME_TYPES.has(mediaType)) {
        try {
          const buffer = await fetchFromR2(part.url as string)
          const extractedText = await extractDocumentContent(buffer, mediaType, filename)
          // Single file part: UI shows file chip, LLM gets extractedText via build-messages.ts
          console.log(`[persist] Extracted text from ${filename} (${mediaType}, ${buffer.length} bytes)`)
          return {
            type: "file",
            url: part.url,
            mediaType,
            filename,
            extracted: true,
            extractedText,
          }
        } catch (err) {
          console.warn(`[persist] Extraction failed for ${filename}, keeping R2 URL:`, getErrorMessage(err))
          return part
        }
      } else {
        // Images and other non-extractable types: keep R2-URL
        return part
      }
    }

    // FileUIPart uses `url` for data URLs, but after fixFilePartsForGateway `data` may also exist
    const inlineData = (typeof part.url === "string" && (part.url as string).startsWith("data:"))
      ? (part.url as string)
      : (typeof part.data === "string" && (part.data as string).startsWith("data:"))
        ? (part.data as string)
        : null

    if (part.type === "file" && inlineData) {
      try {
        const dataUrl = inlineData
        const commaIdx = dataUrl.indexOf(",")
        if (commaIdx === -1) {
          return part
        }

        // Extract MIME type and base64 data
        const header = dataUrl.slice(0, commaIdx)
        const mimeMatch = header.match(/data:([^;]+)/)
        const mediaType = mimeMatch?.[1] ?? (part.mediaType as string) ?? "application/octet-stream"

        // Validate MIME type against allowlist
        if (!ALLOWED_PERSIST_TYPES.has(mediaType)) {
          console.warn(`Skipping file part with disallowed MIME type: ${mediaType}`)
          return part
        }

        const base64 = dataUrl.slice(commaIdx + 1)
        const buffer = Buffer.from(base64, "base64")

        // Validate file size
        if (buffer.length > MAX_PERSIST_SIZE) {
          console.warn(`Skipping file part exceeding size limit: ${buffer.length} bytes`)
          return part
        }

        const rawFilename = (part.filename as string) ?? `attachment-${nanoid(6)}`
        const filename = sanitizeFilename(rawFilename) || `attachment-${nanoid(6)}`
        const ext = filename.includes(".") ? "" : `.${mediaType.split("/")[1] ?? "bin"}`
        const storageKey = `chat-attachments/${userId}/${chatId}/${nanoid()}-${filename}${ext}`

        const url = await uploadBuffer(buffer, mediaType, filename, storageKey)

        return {
          type: "file",
          url,
          mediaType: part.mediaType ?? mediaType,
          filename: part.filename ?? filename,
        }
      } catch (err) {
        console.warn("R2 upload failed for file part, keeping data URL:", getErrorMessage(err))
        return part
      }
    } else {
      return part
    }
  }))

  return result
}
