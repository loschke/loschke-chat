/**
 * System prompts for AI interactions.
 * Centralized here for easy modification and future A/B testing.
 */

import type { SkillMetadata } from "@/lib/ai/skills/discovery"

export const SYSTEM_PROMPTS = {
  /** Default chat system prompt when no expert is active */
  chat: `Du bist ein hilfreicher KI-Assistent. Antworte klar, präzise und auf Deutsch, es sei denn der Nutzer schreibt auf einer anderen Sprache. Nutze Markdown für Formatierung wenn sinnvoll.`,

  /** Artifact instructions — always included regardless of expert */
  artifacts: `## Artifacts

Du hast ein \`create_artifact\` Tool zur Verfügung. Nutze es wenn der User nach einem eigenständigen Output fragt:
- **Verwende es für:** Vollständige HTML-Seiten, Dokumente/Berichte (Markdown), Code-Dateien (Python, TypeScript, etc.)
- **Verwende es NICHT für:** Kurze Code-Snippets in Erklärungen, Listen, Zusammenfassungen, direkte Antworten
- **Vor dem Tool-Call:** Schreibe immer eine kurze einleitende Nachricht, was du erstellst
- **HTML-Artifacts:** Erstelle vollständige, selbstständige HTML-Dokumente mit eingebettetem CSS und optional JS
- **Code-Artifacts:** Setze das \`language\` Feld (z.B. "python", "typescript", "javascript", "css"). Schreibe sauberen, professionellen Code ohne Emojis in Strings oder Kommentaren
- **Markdown-Artifacts:** Für strukturierte Dokumente, Berichte, Anleitungen`,

  /** Instruction for auto-generating chat titles */
  titleGeneration: `Generiere einen kurzen Titel (max 50 Zeichen) für diese Chat-Konversation basierend auf der ersten Nachricht. Antworte NUR mit dem Titel als reinen Text. Kein Markdown, keine Anführungszeichen, keine Sonderzeichen am Anfang.`,
} as const

interface BuildSystemPromptOptions {
  expert?: { systemPrompt: string; skillSlugs?: string[] }
  skills?: SkillMetadata[]
  quicktask?: string | null
  projectDocs?: Array<{ title: string; content: string }> // M7 interface prepared
  customInstructions?: string | null
}

/**
 * Builds a complete system prompt from layered components:
 * 1. Expert Persona (or default chat prompt)
 * 2. Artifact instructions (always)
 * 3. Skills overview (if available)
 * 4. Project context (M7 preparation)
 * 5. Custom Instructions (always last, highest priority)
 */
export function buildSystemPrompt(options?: BuildSystemPromptOptions): string {
  const sections: string[] = []

  // 1. Expert persona or default
  if (options?.expert?.systemPrompt) {
    sections.push(options.expert.systemPrompt)
  } else {
    sections.push(SYSTEM_PROMPTS.chat)
  }

  // 2. Artifact instructions (always included)
  sections.push(SYSTEM_PROMPTS.artifacts)

  // 3. Quicktask layer (replaces skills overview when active)
  if (options?.quicktask) {
    sections.push(options.quicktask)
  } else if (options?.skills && options.skills.length > 0) {
    const expertSkillSlugs = options.expert?.skillSlugs ?? []

    // Sort: expert-preferred skills first, then alphabetical
    const sortedSkills = [...options.skills].sort((a, b) => {
      const aPreferred = expertSkillSlugs.includes(a.slug) ? 0 : 1
      const bPreferred = expertSkillSlugs.includes(b.slug) ? 0 : 1
      if (aPreferred !== bPreferred) return aPreferred - bPreferred
      return a.name.localeCompare(b.name)
    })

    const skillList = sortedSkills
      .map((s) => {
        const marker = expertSkillSlugs.includes(s.slug) ? " ⭐" : ""
        return `- **${s.name}** (\`${s.slug}\`)${marker}: ${s.description}`
      })
      .join("\n")

    sections.push(
      `## Verfügbare Skills\n\nDu kannst spezialisierte Anweisungen mit dem \`load_skill\` Tool laden. Nutze es wenn eine Anfrage von Expertenwissen profitiert.\n\n${skillList}`
    )
  }

  // 4. Project context (M7 preparation)
  if (options?.projectDocs && options.projectDocs.length > 0) {
    const docs = options.projectDocs
      .map((d) => `### ${d.title}\n${d.content}`)
      .join("\n\n")
    sections.push(`## Projekt-Kontext\n\n${docs}`)
  }

  // 5. Custom instructions (always last, highest priority)
  if (options?.customInstructions?.trim()) {
    sections.push(
      `## Nutzer-Anweisungen\nDer Nutzer hat folgende persönliche Anweisungen hinterlegt. Berücksichtige diese bei allen Antworten:\n\n${options.customInstructions.trim()}`
    )
  }

  return sections.join("\n\n")
}
