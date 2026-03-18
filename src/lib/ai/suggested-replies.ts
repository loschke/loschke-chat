import { generateText, gateway } from "ai"
import { aiDefaults } from "@/config/ai"
import { updateMessageMetadata } from "@/lib/db/queries/messages"

const SUGGESTION_TIMEOUT_MS = 5000
const MAX_CONTEXT_CHARS = 2000
const MAX_SUGGESTIONS = 3

/**
 * Generate follow-up suggestions for a chat message.
 * Fire-and-forget: writes suggestions into message metadata.
 */
export async function generateSuggestedReplies(
  chatId: string,
  userId: string,
  messages: Array<{ role: string; parts?: Array<Record<string, unknown>>; content?: string | unknown[] }>,
  assistantMessageId: string,
  modelId: string
): Promise<void> {
  // Extract last 3 user/assistant messages as context (text parts only)
  const contextMessages: Array<{ role: string; text: string }> = []
  for (let i = messages.length - 1; i >= 0 && contextMessages.length < 3; i--) {
    const msg = messages[i]
    if (msg.role !== "user" && msg.role !== "assistant") continue

    let text = ""
    if (msg.parts) {
      text = msg.parts
        .filter((p) => p.type === "text" && typeof p.text === "string")
        .map((p) => p.text as string)
        .join(" ")
    } else if (typeof msg.content === "string") {
      text = msg.content
    }

    if (text.trim()) {
      contextMessages.unshift({ role: msg.role, text: text.slice(0, MAX_CONTEXT_CHARS) })
    }
  }

  if (contextMessages.length === 0) return

  const contextStr = contextMessages
    .map((m) => `${m.role}: ${m.text}`)
    .join("\n\n")
    .slice(0, MAX_CONTEXT_CHARS)

  const result = await Promise.race([
    generateText({
      model: gateway(aiDefaults.model),
      system: `Du generierst Vorschläge für den NUTZER — kurze Folgefragen oder Anweisungen die der Nutzer als nächstes an den Assistenten senden könnte. Perspektive: Ich-Form des Nutzers, z.B. "Erkläre mir X genauer" oder "Kannst du das als Tabelle darstellen?". Generiere exakt ${MAX_SUGGESTIONS} Vorschläge (max 60 Zeichen je) als JSON-Array von Strings. Keine Ja/Nein-Fragen. Deutsch. Antworte NUR mit dem JSON-Array.`,
      prompt: contextStr,
      maxOutputTokens: 150,
      temperature: 0.8,
    }),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), SUGGESTION_TIMEOUT_MS)),
  ])

  if (!result) return // Timeout

  try {
    const text = result.text.trim()
    // Extract JSON array from response (may be wrapped in markdown code block)
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return

    const suggestions = JSON.parse(jsonMatch[0])
    if (!Array.isArray(suggestions) || suggestions.length === 0) return

    const validSuggestions = suggestions
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .slice(0, MAX_SUGGESTIONS)
      .map((s) => s.trim().slice(0, 80))

    if (validSuggestions.length === 0) return

    await updateMessageMetadata(assistantMessageId, { suggestedReplies: validSuggestions })
  } catch {
    // Silent fail — suggestions are nice-to-have
  }
}
