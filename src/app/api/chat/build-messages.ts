import { convertToModelMessages } from "ai"
import type { ModelMessage, UIMessage } from "ai"

/** Part types to keep — all others are filtered out before conversion. */
const ALLOWED_PART_TYPES = new Set(["text", "image", "file", "tool-invocation", "step-start"])

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
 * Add Anthropic cache control to system message for prompt caching.
 * Only applies to Anthropic models (detected by model ID prefix).
 */
export function addSystemCacheControl(messages: ModelMessage[], modelId: string): ModelMessage[] {
  if (!modelId.startsWith("anthropic/")) return messages

  return messages.map((msg, index) => {
    if (index === 0 && msg.role === "system") {
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
 * Build model messages from raw UI messages:
 * 1. Filter non-standard parts
 * 2. Convert to model messages
 * 3. Fix file parts for gateway
 * 4. Prepend system message
 * 5. Add cache control for Anthropic
 */
export async function buildModelMessages(
  rawMessages: UIMessage[],
  systemPrompt: string,
  modelId: string,
): Promise<ModelMessage[]> {
  // Filter out non-standard parts (source-url etc.) before conversion.
  // Keep text, image, file, tool-invocation, step-start, and typed tool parts (tool-*).
  // step-start parts are CRITICAL: convertToModelMessages uses them to split multi-step
  // responses into separate model messages, ensuring correct tool_use → tool_result pairing
  const cleanedMessages = rawMessages.map((msg) => ({
    ...msg,
    parts: msg.parts?.filter((part) =>
      ALLOWED_PART_TYPES.has(part.type) || part.type.startsWith("tool-")
    ),
  }))

  let modelMessages = fixFilePartsForGateway(
    await convertToModelMessages(cleanedMessages)
  )

  // Add system message with cache control for Anthropic
  modelMessages = [
    { role: "system" as const, content: systemPrompt },
    ...modelMessages,
  ]
  modelMessages = addSystemCacheControl(modelMessages, modelId)

  return modelMessages
}
