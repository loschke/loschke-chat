/**
 * Base system prompts: default persona and title generation.
 */

/** Default chat system prompt when no expert is active */
export const CHAT_DEFAULT_PROMPT = `Du bist ein hilfreicher KI-Assistent. Antworte klar, präzise und auf Deutsch, es sei denn der Nutzer schreibt auf einer anderen Sprache. Nutze Markdown für Formatierung wenn sinnvoll.`

/** Instruction for auto-generating chat titles */
export const TITLE_GENERATION_PROMPT = `Generiere einen kurzen Titel (max 50 Zeichen) für diese Chat-Konversation basierend auf der ersten Nachricht. Antworte NUR mit dem Titel als reinen Text. Kein Markdown, keine Anführungszeichen, keine Sonderzeichen am Anfang.`
