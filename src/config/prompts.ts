/**
 * System prompts for AI interactions.
 * Centralized here for easy modification and future A/B testing.
 */

import type { SkillMetadata } from "@/lib/ai/skills/discovery"
import { features } from "@/config/features"

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
- **Markdown-Artifacts:** Für strukturierte Dokumente, Berichte, Anleitungen

## Interaktive Tools

### Quiz (\`create_quiz\`)
Erstelle interaktive Quizzes um Wissen abzufragen oder Verständnis zu prüfen. Nutze es wenn:
- Der User einen Wissenstest will ("Teste mein Wissen über...")
- Du Verständnis prüfen willst nach einer Erklärung
- Ein Expert Lernfortschritt messen soll
- Fragetypen: \`single_choice\` (eine richtige Antwort), \`multiple_choice\` (mehrere richtige), \`free_text\` (offene Antwort die du nach Abgabe bewertest)
- Schreibe immer eine kurze Einleitung bevor du das Quiz erstellst
- Bei \`correctAnswer\`: Verwende den 0-basierten Index der Option (z.B. 0 für die erste Option)
- Nach der Abgabe bekommst du die Ergebnisse und sollst Feedback geben

### Varianten (\`content_alternatives\`)
Präsentiere 2-5 inhaltliche Alternativen zur Auswahl. Nutze es wenn:
- Du mehrere Varianten generiert hast (Überschriften, Textversionen, Ansätze)
- Der User zwischen Optionen wählen soll bevor du weiterarbeitest
- Jede Alternative braucht ein kurzes Label und den vollständigen Inhalt als Markdown
- Nutze es NICHT für triviale Ja/Nein-Fragen (dafür \`ask_user\`)

### Review (\`create_review\`)
Erstelle strukturierte Dokumente zur abschnittsweisen Durchsicht. Nutze es wenn:
- Du Konzepte, Strategien, Blog-Entwürfe, Pläne oder andere längere Inhalte erstellst
- Der User die Möglichkeit haben soll, jeden Abschnitt einzeln zu bewerten (Passt / Ändern / Frage / Raus)
- **Struktur:** Schreibe den Inhalt als Markdown mit \`##\` Überschriften — jede \`##\` Sektion wird ein eigener Review-Block
- **Iteration:** Wenn du nach Feedback eine überarbeitete Version erstellst, übergib \`previousFeedback\` mit den genehmigten Abschnitten der Vorrunde. So muss der User nur geänderte/neue Abschnitte erneut bewerten.
- **Bevorzuge \`create_review\` statt \`create_artifact\` (Markdown)** wenn der Inhalt iterativ verbessert werden soll
- **Abschluss:** Wenn alle Abschnitte genehmigt sind, erstelle ein finales \`create_artifact\` (type: markdown) mit dem bereinigten Inhalt. Entferne dabei Abschnitte die als "Raus" markiert waren. Das finale Artifact hat Copy/Download/Edit — das Review-Artifact bleibt als Prozess-Dokumentation im Chat.
- Nutze \`create_artifact\` nur für finale Dokumente die keiner Durchsicht bedürfen
${features.mermaid.enabled ? `
## Mermaid-Diagramme

Der Chat rendert Mermaid-Codeblöcke nativ als interaktive Diagramme. Verwende dafür Standard-Markdown:

\\\`\\\`\\\`mermaid
graph TD
    A[Start] --> B[Ende]
\\\`\\\`\\\`

- **Nutze Mermaid-Codeblöcke direkt in der Antwort** — sie werden automatisch als SVG-Diagramm gerendert
- **Erstelle KEIN HTML-Artifact mit Mermaid-CDN** — externe Scripts werden in der Sandbox blockiert
- Unterstützte Diagrammtypen: flowchart, sequence, state, class, pie, gantt, ER, gitGraph, mindmap
- Halte Diagramme übersichtlich, verwende Emojis sparsam in Labels` : ""}`,

  /** Instruction for auto-generating chat titles */
  titleGeneration: `Generiere einen kurzen Titel (max 50 Zeichen) für diese Chat-Konversation basierend auf der ersten Nachricht. Antworte NUR mit dem Titel als reinen Text. Kein Markdown, keine Anführungszeichen, keine Sonderzeichen am Anfang.`,
} as const

interface BuildSystemPromptOptions {
  expert?: { systemPrompt: string; skillSlugs?: string[] }
  skills?: SkillMetadata[]
  quicktask?: string | null
  wrapup?: string | null
  memoryContext?: string | null
  projectInstructions?: string | null
  projectDocuments?: Array<{ title: string; content: string }> | null
  customInstructions?: string | null
  webToolsEnabled?: boolean
  mcpToolNames?: string[]
}

/**
 * Builds a complete system prompt from layered components:
 * 1. Expert Persona (or default chat prompt)
 * 2. Artifact instructions (always)
 * 3. Skills overview (if available)
 * 4. Project instructions (if chat belongs to a project)
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

  // 2.5. Web tools instructions (when enabled)
  if (options?.webToolsEnabled) {
    sections.push(
      `## Web-Tools\n\nDu hast zwei Web-Tools zur Verfügung:\n- **web_search**: Suche im Web nach aktuellen Informationen.\n- **web_fetch**: Rufe den Inhalt einer URL ab und lies ihn als Markdown.\n\nWenn der User eine URL teilt, nutze web_fetch um den Inhalt zu lesen. Wenn der User nach aktuellen Informationen fragt, nutze web_search.`
    )
  }

  // 2.6. MCP tools section (when available)
  if (options?.mcpToolNames && options.mcpToolNames.length > 0) {
    const toolList = options.mcpToolNames.map((name) => `- \`${name}\``).join("\n")
    sections.push(
      `## Externe Tools\n\nDu hast zusätzliche externe Tools zur Verfügung:\n${toolList}\n\nNutze diese Tools wenn die Anfrage des Nutzers davon profitiert.`
    )
  }

  // 3. Quicktask / Wrapup layer (replaces skills overview when active)
  if (options?.quicktask) {
    sections.push(options.quicktask)
  } else if (options?.wrapup) {
    sections.push(options.wrapup)
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

  // 4. Memory context (from previous sessions)
  if (options?.memoryContext?.trim()) {
    sections.push(options.memoryContext.trim())
  }

  // 5. Project instructions + documents
  if (options?.projectInstructions?.trim() || (options?.projectDocuments && options.projectDocuments.length > 0)) {
    const projectParts: string[] = ["## Projekt-Kontext"]

    if (options?.projectInstructions?.trim()) {
      projectParts.push(options.projectInstructions.trim())
    }

    if (options?.projectDocuments && options.projectDocuments.length > 0) {
      projectParts.push("## Projekt-Dokumente")
      for (const doc of options.projectDocuments) {
        projectParts.push(`### ${doc.title}\n${doc.content}`)
      }
    }

    sections.push(projectParts.join("\n\n"))
  }

  // 6. Custom instructions (always last, highest priority)
  if (options?.customInstructions?.trim()) {
    sections.push(
      `## Nutzer-Anweisungen\nDer Nutzer hat folgende persönliche Anweisungen hinterlegt. Berücksichtige diese bei allen Antworten:\n\n${options.customInstructions.trim()}`
    )
  }

  return sections.join("\n\n")
}
