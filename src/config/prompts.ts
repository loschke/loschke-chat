/**
 * System prompts for AI interactions.
 * Centralized here for easy modification and future A/B testing.
 */

export const SYSTEM_PROMPTS = {
  /** Default chat system prompt when no expert is active */
  chat: `Du bist ein hilfreicher KI-Assistent. Antworte klar, präzise und auf Deutsch, es sei denn der Nutzer schreibt auf einer anderen Sprache. Nutze Markdown für Formatierung wenn sinnvoll.`,

  /** Instruction for auto-generating chat titles */
  titleGeneration: `Generiere einen kurzen Titel (max 50 Zeichen) für diese Chat-Konversation basierend auf der ersten Nachricht. Antworte NUR mit dem Titel als reinen Text. Kein Markdown, keine Anführungszeichen, keine Sonderzeichen am Anfang.`,
} as const

/**
 * Builds a complete system prompt from base prompt + user custom instructions.
 * Future: Will also integrate Expert persona and Project context (M4/M7).
 */
export function buildSystemPrompt(options?: {
  customInstructions?: string | null
}): string {
  let prompt = SYSTEM_PROMPTS.chat

  if (options?.customInstructions?.trim()) {
    prompt += `\n\n## Nutzer-Anweisungen\nDer Nutzer hat folgende persönliche Anweisungen hinterlegt. Berücksichtige diese bei allen Antworten:\n\n${options.customInstructions.trim()}`
  }

  return prompt
}
