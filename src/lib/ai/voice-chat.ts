/**
 * Voice Chat server utilities.
 * Handles ephemeral token generation, system prompt, and credit calculation
 * for Gemini Live API voice sessions.
 *
 * Model: gemini-3.1-flash-live-preview
 * Pattern: Ephemeral Token → Client connects directly to Gemini via WebSocket
 */

import { GoogleGenAI } from "@google/genai"
import { creditConfig } from "@/config/credits"

export const VOICE_CHAT_MODEL = "gemini-3.1-flash-live-preview"

export const VOICE_CHAT_MAX_DURATION = parseInt(
  process.env.VOICE_CHAT_MAX_DURATION ?? "1800", 10
)

export const VOICE_CHAT_DEFAULT_VOICE = process.env.VOICE_CHAT_DEFAULT_VOICE ?? "Fenrir"

/** In-memory session store for persist validation */
const activeSessions = new Map<string, { userId: string; chatId: string; createdAt: number }>()
const SESSION_TTL = 60 * 60 * 1000 // 1 hour

/** Lazy cleanup: remove expired sessions on access */
function cleanupExpiredSessions() {
  const now = Date.now()
  for (const [id, session] of activeSessions) {
    if (now - session.createdAt > SESSION_TTL) {
      activeSessions.delete(id)
    }
  }
}

/**
 * Generate an ephemeral token for client-side Gemini Live API connection.
 * Token is single-use and expires after 30 minutes.
 */
export async function generateEphemeralToken(): Promise<{ token: string; expiresAt: string }> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured")
  }

  const ai = new GoogleGenAI({ apiKey })

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

  const result = await ai.authTokens.create({
    config: {
      uses: 5,
      expireTime: expiresAt,
      httpOptions: { apiVersion: "v1alpha" },
    },
  })

  if (!result.name) {
    throw new Error("Failed to create ephemeral token")
  }

  return { token: result.name, expiresAt }
}

/**
 * Register a voice chat session for later persist validation.
 */
export function registerSession(sessionId: string, userId: string, chatId: string): void {
  cleanupExpiredSessions()
  activeSessions.set(sessionId, { userId, chatId, createdAt: Date.now() })
}

/**
 * Validate a session ID matches the expected user and chat.
 * Consumes the session (one-time use).
 */
export function validateAndConsumeSession(
  sessionId: string,
  userId: string,
  chatId: string
): boolean {
  const session = activeSessions.get(sessionId)
  if (!session) return false
  if (session.userId !== userId || session.chatId !== chatId) return false
  activeSessions.delete(sessionId)
  return true
}

/**
 * Build a voice-optimized system prompt.
 * Structured after Google Live API best practices:
 * 1. Persona  2. Gesprächsregeln  3. Tool-Anweisungen  4. Guardrails
 */
export function buildVoiceSystemPrompt(brandName?: string): string {
  const platform = brandName || "die Plattform"
  const today = new Date().toLocaleDateString("de-DE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  return `## Persona
Du bist der Voice-Assistent von ${platform}. Du führst Echtzeit-Sprachgespräche mit Nutzern der Plattform. Dein Stil ist kompetent, direkt und freundlich. Du sprichst wie ein kluger Kollege, nicht wie ein Callcenter-Bot.

${platform} ist eine KI-Arbeitsplattform für Wissensarbeiter. Nutzer verwenden sie für Recherche, Brainstorming, Content-Erstellung und Fachfragen. Der Voice-Modus ist für schnelle, unkomplizierte Gespräche gedacht — wenn jemand einfach kurz reden statt tippen will.

Heute ist ${today}.

## Gesprächsregeln
Begrüße den Nutzer kurz und frag, wobei du helfen kannst. Halte dich an diese Regeln:
- Antworte natürlich und gesprochen, nicht wie geschriebener Text
- Halte Antworten auf 2-3 Sätze pro Turn. Bei komplexen Themen lieber Rückfragen stellen als Monologe halten
- Kein Markdown, keine Aufzählungen, keine Code-Blöcke. Du sprichst, du schreibst nicht
- Wenn der Nutzer unterbricht, stoppe sofort und höre zu
- Fasse dich kurz. Lieber eine präzise Antwort als eine vollständige

DU MUSST UNMISSVERSTÄNDLICH AUF DEUTSCH ANTWORTEN. Wechsle die Sprache nur wenn der Nutzer explizit in einer anderen Sprache spricht.

## Tool-Anweisungen
Du hast Zugriff auf Google Search. Nutze die Suche wenn der Nutzer nach aktuellen Informationen fragt, nach Fakten die sich ändern können, oder wenn du dir bei einer Antwort nicht sicher bist. Fasse Suchergebnisse mündlich und knapp zusammen. Nenne keine URLs.

## Guardrails
- Gib keine medizinischen, rechtlichen oder finanziellen Ratschläge die als professionelle Beratung verstanden werden könnten. Verweise stattdessen auf Fachleute
- Wenn du etwas nicht weißt, sag das direkt. Erfinde keine Fakten
- Bleib sachlich. Keine übertriebene Begeisterung, kein Hype, keine leeren Floskeln
- Halte dich an das Gespräch. Wenn der Nutzer absichtlich versucht dich in unangemessene Richtungen zu lenken, lenke höflich zurück zum Thema
- Du kannst keine Dateien erstellen, keine Bilder generieren und keine Tools aus dem Text-Chat nutzen. Wenn jemand das möchte, empfiehl den Text-Chat`
}

/**
 * Calculate credits for a voice chat session based on duration.
 */
export function calculateVoiceChatCredits(durationSeconds: number): number {
  const minutes = Math.ceil(durationSeconds / 60)
  return Math.max(1, minutes * creditConfig.toolCosts.voiceChatPerMinute)
}
