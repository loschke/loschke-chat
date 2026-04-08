import { convertToModelMessages } from "ai"
import type { ModelMessage, UIMessage } from "ai"

import { isR2Url, fetchFromR2 } from "@/lib/storage"
import { extractDocumentContent, EXTRACTABLE_MIME_TYPES } from "@/lib/ai/document-extraction"
import { getErrorMessage } from "@/lib/errors"

/** Part types to keep — all others are filtered out before conversion. */
const ALLOWED_PART_TYPES = new Set(["text", "image", "file", "tool-invocation", "step-start"])

/**
 * Providers that support PDF natively (no text extraction needed).
 * - Anthropic: full native PDF support
 * - Google Gemini: full native PDF support
 * - Mistral: OCR-based PDF support (converts pages to images)
 */
const PDF_NATIVE_PROVIDERS = ["anthropic/", "google/", "mistral/"]


/**
 * Convert data-URL strings in file parts to Uint8Array so the AI Gateway's
 * `maybeEncodeFileParts` can re-encode them as proper data-URLs.
 */
export function fixFilePartsForGateway(messages: ModelMessage[]): ModelMessage[] {
  for (const msg of messages) {
    if (!Array.isArray(msg.content)) continue
    for (let i = 0; i < msg.content.length; i++) {
      const part = msg.content[i]
      if (
        part.type === "file" &&
        typeof part.data === "string" &&
        part.data.startsWith("data:")
      ) {
        const commaIdx = part.data.indexOf(",")
        if (commaIdx !== -1) {
          const base64 = part.data.slice(commaIdx + 1)
          msg.content[i] = { ...part, data: Buffer.from(base64, "base64") }
        }
      }
    }
  }
  return messages
}

/**
 * Add Anthropic cache control for prompt caching.
 * Marks the system message AND the first user message (which may contain
 * extracted file content) so they get cached across follow-up messages.
 * Only applies to Anthropic models (detected by model ID prefix).
 */
export function addCacheControl(messages: ModelMessage[], modelId: string): ModelMessage[] {
  if (!modelId.startsWith("anthropic/")) return messages

  let firstUserFound = false
  return messages.map((msg, index) => {
    // Cache the system message
    if (index === 0 && msg.role === "system") {
      return {
        ...msg,
        providerOptions: {
          ...msg.providerOptions,
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      }
    }
    // Cache the first user message (contains extracted file content on follow-ups)
    if (!firstUserFound && msg.role === "user") {
      firstUserFound = true
      return {
        ...msg,
        providerOptions: {
          ...msg.providerOptions,
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      }
    }
    return msg
  })
}

/**
 * Resolve R2-URL file parts: fetch from R2 and either convert to binary
 * (for native LLM support) or extract text content (for document types).
 *
 * - Images: fetch → Uint8Array file part (all providers)
 * - PDF + Anthropic: fetch → Uint8Array file part (native PDF support)
 * - PDF + other providers: fetch → text extraction → text part
 * - DOCX/XLSX/PPTX/HTML: fetch → text extraction → text part (all providers)
 */
export async function resolveR2FileParts(
  messages: ModelMessage[],
  modelId: string,
): Promise<ModelMessage[]> {
  const supportsNativePdf = PDF_NATIVE_PROVIDERS.some((prefix) => modelId.startsWith(prefix))

  await Promise.all(
    messages.map(async (msg) => {
      if (!Array.isArray(msg.content)) return

      const resolvedContent = await Promise.all(
        msg.content.map(async (part) => {
          // Only process file parts with R2 URLs
          if (part.type !== "file") {
            return part
          }

          // After convertToModelMessages, file parts have: { type: "file", data: string | Uint8Array, mediaType }
          // If data is a string URL (not data: URL, not Uint8Array), check if it's an R2 URL
          const partRecord = part as unknown as Record<string, unknown>

          // Already-extracted file parts: use stored text instead of re-fetching from R2
          if (partRecord.extracted === true && typeof partRecord.extractedText === "string") {
            return { type: "text" as const, text: partRecord.extractedText }
          }

          const dataValue = partRecord.data
          const fileUrl = typeof dataValue === "string" && !dataValue.startsWith("data:") ? dataValue : null

          if (!fileUrl || !isR2Url(fileUrl)) {
            return part
          }

          const mediaType = (partRecord.mediaType as string) ?? ""
          const filename = (partRecord.filename as string) ?? "attachment"

          try {
            // Images: fetch, resize if needed (Anthropic 5MB base64 limit ≈ 3.75MB binary)
            if (mediaType.startsWith("image/")) {
              let buffer = await fetchFromR2(fileUrl)
              let resolvedMediaType = mediaType

              // Resize images > 3.5MB to stay under provider base64 limits
              if (buffer.length > 3.5 * 1024 * 1024) {
                const sharp = (await import("sharp")).default
                buffer = await sharp(buffer)
                  .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
                  .jpeg({ quality: 85 })
                  .toBuffer()
                resolvedMediaType = "image/jpeg"
              }

              return {
                type: "file" as const,
                data: new Uint8Array(buffer),
                mediaType: resolvedMediaType,
              }
            }

            // PDF: Anthropic, Gemini, Mistral handle natively, others need extraction
            if (mediaType === "application/pdf") {
              const buffer = await fetchFromR2(fileUrl)
              if (supportsNativePdf) {
                return {
                  type: "file" as const,
                  data: new Uint8Array(buffer),
                  mediaType,
                }
              } else {
                const text = await extractDocumentContent(buffer, mediaType, filename)
                return { type: "text" as const, text }
              }
            }

            // Document types: always extract text
            if (EXTRACTABLE_MIME_TYPES.has(mediaType)) {
              const buffer = await fetchFromR2(fileUrl)
              const text = await extractDocumentContent(buffer, mediaType, filename)
              return { type: "text" as const, text }
            }

            // Unknown type: keep original part
            return part
          } catch (error) {
            console.warn(`[build-messages] Failed to resolve R2 file part (${filename}):`, getErrorMessage(error))
            // Fallback: add a text note about the failed file
            return {
              type: "text" as const,
              text: `[Datei "${filename}" konnte nicht verarbeitet werden]`,
            }
          }
        })
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mixed part types from resolution
      msg.content = resolvedContent as any
    })
  )

  return messages
}

/** Client-side tools that have no server execute — tool results come via addToolOutput */
const CLIENT_SIDE_TOOLS = new Set(["ask_user", "content_alternatives"])

/**
 * Build model messages from raw UI messages:
 * 1. Filter non-standard parts
 * 2. Fix orphaned client-side tool calls (no result persisted)
 * 3. Convert to model messages
 * 4. Fix file parts for gateway
 * 5. Prepend system message
 * 6. Add cache control for Anthropic
 */
export async function buildModelMessages(
  rawMessages: UIMessage[],
  systemPrompt: string,
  modelId: string,
): Promise<ModelMessage[]> {
  // Filter out non-standard parts (source-url etc.) before conversion.
  // Keep text, image, file, tool-invocation, step-start, and typed tool parts (tool-*).
  // step-start parts are CRITICAL: convertToModelMessages uses them to split multi-step
  // responses into separate model messages, ensuring correct tool_use → tool_result pairing.
  //
  // Fix orphaned client-side tool calls: ask_user and content_alternatives have no server
  // execute, so their results come via addToolOutput and are never persisted to DB.
  // When a chat is reloaded, these parts have state "input-available" with no output,
  // causing AI_MissingToolResultsError in convertToModelMessages. We add a synthetic
  // output so the model knows the tool was called and responded to.
  const cleanedMessages = rawMessages.map((msg) => ({
    ...msg,
    parts: msg.parts
      ?.filter((part) => {
        // Allow standard types + typed tool parts
        if (!(ALLOWED_PART_TYPES.has(part.type) || part.type.startsWith("tool-"))) return false
        // Strip code_execution provider tool parts from history.
        // convertToModelMessages cannot handle provider tools (no schema, server-generated IDs).
        // Claude doesn't need the code execution logs for iteration — the text summary
        // and artifact contain the relevant context.
        if (part.type === "tool-code_execution") return false
        // Also strip DB-persisted format of code_execution
        const p = part as Record<string, unknown>
        if ((part.type === "tool-call" || part.type === "tool-result") && p.toolName === "code_execution") return false
        return true
      })
      .map((part) => {
        const p = part as Record<string, unknown>
        // Detect orphaned client-side tool parts: type "tool-ask_user" / "tool-content_alternatives"
        // with state "input-available" (= no result) or "call" (legacy)
        if (
          typeof p.type === "string" &&
          p.type.startsWith("tool-") &&
          CLIENT_SIDE_TOOLS.has(p.type.slice(5)) &&
          (p.state === "input-available" || p.state === "call") &&
          p.output === undefined
        ) {
          return { ...p, state: "output-available" as const, output: { skipped: true } } as typeof part
        }
        return part
      })
      // Clean up orphaned step-start parts (adjacent step-starts after code_execution removal)
      .filter((part, idx, arr) => {
        if (part.type !== "step-start") return true
        const next = arr[idx + 1]
        // Remove step-start at end of parts array or followed by another step-start
        return next !== undefined && next.type !== "step-start"
      }),
  })) satisfies UIMessage[]

  let modelMessages = fixFilePartsForGateway(
    await convertToModelMessages(cleanedMessages)
  )

  // Resolve R2-URL file parts: fetch and extract/convert for LLM processing
  modelMessages = await resolveR2FileParts(modelMessages, modelId)

  // Add system message with cache control for Anthropic
  modelMessages = [
    { role: "system" as const, content: systemPrompt },
    ...modelMessages,
  ]
  modelMessages = addCacheControl(modelMessages, modelId)

  return modelMessages
}
