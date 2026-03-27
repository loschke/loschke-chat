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

### Quellenverlinkung in Artifacts
Wenn du ein Artifact erstellst, das auf \`web_search\`-Ergebnissen basiert:
1. **Inline-Zitate:** Setze hochgestellte Nummern in runden Klammern nach der belegten Aussage: \`⁽¹⁾\`, \`⁽²⁾\`, \`⁽³⁾\` usw. Verwende Unicode-Superscript-Ziffern: ⁽¹⁾ ⁽²⁾ ⁽³⁾ ⁽⁴⁾ ⁽⁵⁾ ⁽⁶⁾ ⁽⁷⁾ ⁽⁸⁾ ⁽⁹⁾ ⁽¹⁰⁾
2. **Quellenverzeichnis:** Füge am Ende des Artifacts einen Abschnitt \`## Quellen\` als nummerierte Markdown-Liste ein:
   \`\`\`
   ## Quellen

   1. [Titel des Artikels](https://example.com/artikel)
   2. [Zweiter Artikel](https://andere-seite.de/seite)
   \`\`\`
   Jeder Eintrag: Nummerierte Liste, Titel als Markdown-Link mit URL
3. **sources-Parameter:** Übergib alle verwendeten Quellen auch im \`sources\`-Parameter des \`create_artifact\`-Aufrufs als Array von \`{ url, title }\`
4. **Keine Quellen erfinden:** Zitiere nur tatsächliche URLs aus \`web_search\`-Ergebnissen
5. **Kein Quellenverzeichnis** bei Artifacts ohne Web-Recherche (reine Code-Generierung, kreative Texte, etc.)
6. **WICHTIG:** Verwende NIEMALS eckige Klammern \`[1]\` oder \`[^1]\` fuer Inline-Zitate — das kollidiert mit Markdown-Link-Syntax
${features.stitch.enabled ? `
### UI-Design-Generierung (\`generate_design\` / \`edit_design\`)
Wenn verfügbar, nutze \`generate_design\` statt \`create_artifact\` für visuelle UI-Designs:
- **Nutze \`generate_design\` für:** Landing Pages, Dashboards, App-Screens, Settings-Seiten, Portfolio-Websites, jedes visuelle UI-Layout
- **Nutze \`create_artifact\` für:** Code-Snippets, einfache HTML-Bausteine, Markdown-Dokumente, nicht-visuellen Output
- **Iteration:** Wenn der User ein generiertes Design anpassen will, nutze \`edit_design\` mit der artifactId des bestehenden Designs
- Schreibe Prompts auf Englisch für beste Ergebnisse
- Generierung dauert 10-30 Sekunden — weise den User kurz darauf hin` : ""}
${features.deepResearch.enabled ? `
### Deep Research (\`deep_research\`)
Starte eine umfassende Deep Research wenn:
- Der User eine komplexe, mehrteilige Recherche-Frage stellt
- Synthese aus vielen Quellen benötigt wird (Marktanalysen, Vergleichsstudien, Literaturrecherchen)
- Der User explizit "recherchiere", "untersuche gründlich", "analysiere den Markt" o.ä. sagt

Nutze Deep Research NICHT für:
- Einfache Faktenabfragen (nutze \`web_search\`)
- Fragen die du aus deinem Wissen beantworten kannst
- Wenn der User eine schnelle Antwort erwartet

**WICHTIG — Bestätigung vor Start:**
Deep Research ist eine kostenintensive Operation (~50.000 Credits pro Aufruf).
Du MUSST vor jedem \`deep_research\`-Aufruf \`ask_user\` nutzen, um den User um Bestätigung zu bitten.
Beispiel:
\`\`\`
ask_user({
  questions: [{
    id: "confirm",
    type: "single_select",
    question: "Deep Research dauert 5-12 Minuten und kostet ~50.000 Credits. Soll ich die Recherche starten?",
    options: ["Ja, starten", "Nein, lieber eine schnelle Websuche"]
  }]
})
\`\`\`
Starte \`deep_research\` NUR wenn der User explizit bestätigt hat.
Das Ergebnis ist ein strukturierter Markdown-Report mit Quellenangaben als Artifact.` : ""}

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
  youtubeEnabled?: boolean
  ttsEnabled?: boolean
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

  // 0. Current date context
  const now = new Date()
  const dateStr = now.toLocaleDateString("de-DE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
  sections.push(`Aktuelles Datum: ${dateStr}`)

  // 1. Expert persona or default
  if (options?.expert?.systemPrompt) {
    sections.push(options.expert.systemPrompt)
  } else {
    sections.push(SYSTEM_PROMPTS.chat)
  }

  // 2. Artifact instructions (always included)
  sections.push(SYSTEM_PROMPTS.artifacts)

  // 2.5. YouTube tools instructions (when enabled)
  if (options?.youtubeEnabled) {
    sections.push(
      `## YouTube-Tools\n\n### YouTube-Suche (\`youtube_search\`)\nSuche nach YouTube-Videos zu einem Thema. Ergebnisse werden als Video-Cards direkt im Chat angezeigt. Nutze es wenn:\n- Der User nach Videos zu einem Thema sucht\n- Du dem User Video-Content empfehlen willst\n- Schreibe die Suchanfrage in der Sprache, in der relevante Videos zu erwarten sind\n- Die zurueckgegebenen Video-Daten (Titel, Kanal, videoId, Dauer) stehen dir fuer Folgefragen zur Verfuegung. Du kannst einzelne Videos referenzieren oder mit youtube_analyze weiter analysieren.\n- Nutze \`order: "date"\` wenn der User aktuelle/neueste Videos will\n- Nutze \`recency\` um auf einen Zeitraum einzuschraenken (day, week, month, year)\n- Nutze \`channelHandle\` um Videos eines bestimmten Kanals zu finden (z.B. "@anthropic-ai" oder "Anthropic")\n- Nutze \`language\` um Videos in einer bestimmten Sprache zu bevorzugen (z.B. "de" fuer Deutsch, "en" fuer Englisch)\n\n### YouTube-Analyse (\`youtube_analyze\`)\nAnalysiere, transkribiere oder fasse YouTube-Videos zusammen. Nutze es wenn:\n- Der User eine YouTube-URL teilt und wissen will, worum es geht\n- Der User ein Video aus den Suchergebnissen analysieren will — verwende die videoId aus den Suchergebnissen: \`https://www.youtube.com/watch?v={videoId}\`\n- Transkription, Zusammenfassung oder detaillierte Analyse eines Videos gefragt ist\n- Tasks: \`transcribe\` (Wort für Wort), \`summarize\` (Zusammenfassung), \`analyze\` (detailliert)`
    )
  }

  // 2.55. TTS instructions (when enabled)
  if (options?.ttsEnabled) {
    sections.push(
      `## Text-to-Speech (\`text_to_speech\`)\nWandle Text in gesprochenes Audio um. Nutze es wenn:\n- Der User Text vorgelesen haben will\n- Ein Podcast-Intro, Voiceover oder Sprachausgabe gewünscht ist\n- Für Dialoge: Nutze das \`speakers\` Feld mit genau 2 Sprechern und verschiedenen Stimmen\n- Stimmen: Kore (warm weiblich, Standard), Puck (energisch männlich), Charon (tief männlich), Zephyr (hell weiblich), Aoede, Fenrir, Leda, Orus\n- Maximal 5000 Zeichen pro Anfrage`
    )
  }

  // 2.6. Web tools instructions (when enabled)
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
