# PRD: Deep Research

> Umfassende, mehrstufige Recherche-Funktion auf Basis des Gemini Deep Research Agents.

---

## 1. Kontext und Ziel

### Problem

Komplexe Recherche-Fragen (Marktanalysen, Vergleichsstudien, Literaturrecherchen) erfordern heute mehrere manuelle `web_search`-Aufrufe, manuelles Zusammenfassen und fehleranfaellige Synthese. Der Nutzer muss iterativ nachfragen, Quellen pruefen und selbst strukturieren.

### Loesung

Ein `deep_research` Tool, das den **Gemini Deep Research Agent** (`deep-research-pro-preview-12-2025`) nutzt. Der Agent plant eigenstaendig, sucht das Web ab, liest Quellen, und erstellt einen strukturierten Forschungsbericht mit Quellenangaben. Ergebnis: ein Markdown-Artifact mit vollstaendigem Report.

### Warum jetzt

- `@google/genai` SDK v1.46.0 bereits im Projekt (Image Gen, TTS, YouTube)
- `GOOGLE_GENERATIVE_AI_API_KEY` bereits konfiguriert
- Die Interactions API ist seit Maerz 2026 stabil genug fuer Production

---

## 2. User Experience

### Ablauf aus Nutzersicht

```
1. User stellt komplexe Frage
   → "Recherchiere den aktuellen Stand von KI-Regulierung in der EU,
      vergleiche mit USA und China"

2. AI erkennt Recherche-Bedarf, ruft deep_research auf
   → Chat zeigt: "Deep Research gestartet..."

3. Fortschrittsanzeige (2-5 Minuten)
   → Phasen: Planung → Suche → Analyse → Bericht
   → Thought-Summaries zeigen, was der Agent gerade tut
   → User kann weiter im Chat navigieren

4. Ergebnis
   → Markdown-Artifact mit strukturiertem Report
   → Quellenverzeichnis mit Links
   → AI fasst die Kernpunkte im Chat zusammen
```

### Wann Deep Research vs. Web Search

| Kriterium | `web_search` | `deep_research` |
|-----------|-------------|-----------------|
| Dauer | Sekunden | 2-5 Minuten |
| Quellen | 1-3 Ergebnisse | ~80 Suchen, dutzende Quellen |
| Output | Kurze Antwort im Chat | Strukturierter Report als Artifact |
| Kosten | Minimal | ~$2-5 pro Recherche |
| Anwendung | Fakten, aktuelle Infos | Analysen, Vergleiche, Studien |

### Beispiel-Prompts

- "Erstelle eine Marktanalyse zum Thema Enterprise AI Agents"
- "Vergleiche die fuenf groessten Cloud-Anbieter fuer KI-Workloads"
- "Recherchiere aktuelle Studien zu Remote Work und Produktivitaet"
- "Was sind die wichtigsten Trends in der KI-Regulierung 2026?"

---

## 3. Architektur-Entscheidung

### Das Problem: Vercel Function Timeout

Die Chat-Route hat `maxDuration = 240` (4 Minuten). Deep Research laeuft bis zu 60 Minuten. Eine Vercel Function kann nicht so lange offen bleiben.

### Loesung: Hybrid-Ansatz (Tool-Trigger + Async Polling)

```
Chat-Route (4 min max)          Google Cloud (bis 60 min)
┌─────────────────────┐         ┌──────────────────────┐
│ AI ruft deep_research│         │ Gemini Deep Research │
│ Tool auf             │────────>│ Agent startet        │
│                      │<────────│ interactionId        │
│ Tool gibt sofort     │         │                      │
│ interactionId zurueck│         │ Plant...             │
└─────────────────────┘         │ Sucht...             │
                                │ Liest...             │
Client (Browser)                │ Schreibt...          │
┌─────────────────────┐         │                      │
│ DeepResearchProgress │         │                      │
│ pollt alle 5s        │────────>│                      │
│ /api/deep-research/  │<────────│ Status + Summaries   │
│ {interactionId}      │         │                      │
│                      │         │ ✓ Fertig             │
│ Zeigt Fortschritt    │<────────│ Report + Quellen     │
│ Erstellt Artifact    │         └──────────────────────┘
└─────────────────────┘
```

**Warum dieser Ansatz:**
1. **Tool-Trigger** hält die UX natuerlich. Kein neuer Modus, kein Mode-Switching
2. **Google hosted** die Recherche serverseitig. Kein eigener Worker noetig
3. **Polling-Route** ist leichtgewichtig (ein API-Call zu Google, <1s)
4. **Kein neues DB-Schema** noetig. `interactionId` lebt im Tool-Result, Report wird Artifact

---

## 4. Implementierung

### 4.1 Feature Flag

**Datei:** `src/config/features.ts`

```typescript
deepResearch: {
  enabled: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
    && process.env.DEEP_RESEARCH_ENABLED === "true",
},
```

Doppelte Bedingung: Google API Key vorhanden UND explizites Opt-in. Deep Research ist teuer ($2-5 pro Aufruf), daher kein Auto-Enable.

**ENV-Variablen:**

| Variable | Required | Default | Beschreibung |
|----------|----------|---------|-------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Ja | - | Bereits vorhanden (Image Gen, TTS) |
| `DEEP_RESEARCH_ENABLED` | Ja | - | Explizites Opt-in |
| `DEEP_RESEARCH_CREDITS` | Nein | `50000` | Flat-Rate Credits pro Recherche |

---

### 4.2 SDK Wrapper

**Neue Datei:** `src/lib/ai/deep-research.ts`

Kapselt die Gemini Interactions API. Folgt dem Pattern von `image-generation.ts` und `text-to-speech.ts` (direkte `@google/genai` SDK Nutzung).

**Kern-Funktionen:**

```typescript
// Recherche starten (async, gibt sofort interactionId zurueck)
startDeepResearch(params: {
  query: string
  formatInstructions?: string  // Report-Struktur vorgeben
}): Promise<{ interactionId: string }>

// Status abfragen (Polling)
getResearchStatus(interactionId: string): Promise<ResearchStatus>
```

**ResearchStatus Interface:**

```typescript
interface ResearchStatus {
  interactionId: string
  status: "in_progress" | "completed" | "failed"
  thoughtSummaries: string[]      // Was der Agent gerade tut
  outputText?: string             // Nur bei "completed"
  error?: string                  // Nur bei "failed"
}
```

**SDK-Aufruf intern:**

```typescript
import { GoogleGenAI } from "@google/genai"

const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })

// Starten
const interaction = await client.interactions.create({
  input: query,
  agent: "deep-research-pro-preview-12-2025",
  background: true,
  agent_config: {
    type: "deep-research",
    thinking_summaries: "auto",
  },
})

// Status abfragen
const result = await client.interactions.get(interactionId)
// result.status, result.outputs, etc.
```

**Streaming-Alternative (spaetere Optimierung):**

Fuer Echtzeit-Updates kann `interactions.get()` mit `stream: true` aufgerufen werden. Die Events (`content.delta` mit `thought_summary`) liefern Live-Fortschritt. Fuer V1 reicht Polling.

---

### 4.3 Tool-Definition

**Neue Datei:** `src/lib/ai/tools/deep-research.ts`

Factory-Pattern wie `generateImageTool()`:

```typescript
export function deepResearchTool(chatId: string, userId: string) {
  return tool({
    description:
      "Starte eine umfassende Deep Research fuer komplexe Recherche-Aufgaben. " +
      "Nutze dieses Tool wenn der User eine mehrteilige Analyse, Vergleichsstudie, " +
      "Marktrecherche oder Literaturuebersicht benoetigt. " +
      "NICHT fuer einfache Faktenabfragen (nutze web_search). " +
      "Deep Research dauert 2-5 Minuten und erstellt einen detaillierten Report. " +
      "Informiere den User BEVOR du startest, dass es einige Minuten dauert.",
    inputSchema: z.object({
      query: z.string().min(10).max(2000).describe(
        "Detaillierte Recherche-Frage. Je spezifischer, desto besser."
      ),
      focusAreas: z.array(z.string()).max(5).optional().describe(
        "Optionale Schwerpunkte fuer den Report"
      ),
      outputFormat: z.enum(["report", "summary", "comparison"]).optional().describe(
        "Report: ausfuehrlicher Bericht. Summary: kompakte Zusammenfassung. Comparison: Vergleichstabellen."
      ),
    }),
    execute: async ({ query, focusAreas, outputFormat }) => {
      // 1. Credit-Check + Abzug (Vorab, flat-rate)
      const creditError = await deductToolCredits(userId, DEEP_RESEARCH_CREDITS, {
        chatId, description: "Deep Research", toolName: "deep_research",
      })
      if (creditError) return { error: creditError }

      // 2. Format-Instruktionen zusammenbauen
      const formatInstructions = buildFormatInstructions(focusAreas, outputFormat)

      // 3. Recherche starten
      const { interactionId } = await startDeepResearch({
        query: formatInstructions ? `${query}\n\n${formatInstructions}` : query,
      })

      // 4. Sofort zurueckgeben (Client pollt weiter)
      return {
        interactionId,
        status: "in_progress",
        chatId,
        query,
        message: "Deep Research gestartet. Der Bericht wird in 2-5 Minuten fertig.",
      }
    },
  })
}
```

---

### 4.4 Tool-Registrierung

**Datei:** `src/app/api/chat/build-tools.ts`

```typescript
// Nach den anderen Google-Tools (generate_image, youtube, tts):
if (features.deepResearch.enabled && !effectivePrivacyRoute) {
  tools.deep_research = deepResearchTool(chatId, userId)
}
```

Deaktiviert bei Privacy-Routing (nutzt Google API).

---

### 4.5 Polling API Route

**Neue Datei:** `src/app/api/deep-research/[interactionId]/route.ts`

```
GET /api/deep-research/{interactionId}
→ { status, thoughtSummaries, outputText?, error? }

DELETE /api/deep-research/{interactionId}
→ { cancelled: true }
```

**Implementierung:**

```typescript
export const runtime = "nodejs"
export const maxDuration = 30  // Nur Proxy-Call, muss schnell sein

export async function GET(req, { params }) {
  const { userId } = await requireAuth()
  // Rate-Limit: api preset (60/min)

  const { interactionId } = await params
  // Validierung: alphanumerisch, max 100 Zeichen

  const status = await getResearchStatus(interactionId)
  return Response.json(status)
}
```

---

### 4.6 Completion + Artifact-Erstellung

**Neue Datei:** `src/app/api/deep-research/[interactionId]/complete/route.ts`

```
POST /api/deep-research/{interactionId}/complete
Body: { chatId, messageId }
→ { artifactId, title }
```

Wird vom Client aufgerufen, sobald `status === "completed"`:
1. Holt den vollstaendigen Report von Google
2. Erstellt ein `markdown` Artifact mit dem Report-Text
3. Speichert Quellen in `artifact.metadata.citations`
4. Gibt `artifactId` zurueck

---

### 4.7 Credits

**Datei:** `src/lib/credits.ts`

```typescript
const DEEP_RESEARCH_CREDITS = parseInt(
  process.env.DEEP_RESEARCH_CREDITS ?? "50000", 10
)

export function calculateDeepResearchCredits(): number {
  return DEEP_RESEARCH_CREDITS
}
```

**Wichtig:** Credits werden **vorab** abgezogen (nicht nach Completion). Google berechnet den API-Call unabhaengig vom Ergebnis. Kein Refund bei Fehlschlag.

Default: 50.000 Credits (~$0.50 bei 100k Credits/$). Bewusst hoch, da Google-seitig $2-5 pro Recherche anfallen.

---

### 4.8 System-Prompt

**Datei:** `src/config/prompts.ts`

Neuer Block in Layer 2 (Artifact/Tool-Instruktionen), nur wenn Feature aktiviert:

```markdown
### Deep Research (`deep_research`)
Starte eine umfassende Deep Research wenn:
- Der User eine komplexe, mehrteilige Recherche-Frage stellt
- Synthese aus vielen Quellen benoetigt wird
- Vergleichsanalysen, Marktrecherche oder Literaturrecherche gefragt sind
- Der User explizit "recherchiere", "untersuche gruendlich" o.ae. sagt

Nutze Deep Research NICHT fuer:
- Einfache Faktenabfragen (nutze web_search)
- Fragen die du aus deinem Wissen beantworten kannst
- Wenn der User eine schnelle Antwort erwartet

Ablauf: Deep Research dauert 2-5 Minuten. Informiere den User vorab.
Das Ergebnis ist ein strukturierter Markdown-Report mit Quellenangaben.
```

---

## 5. UI-Komponenten

### 5.1 Deep Research Progress

**Neue Datei:** `src/components/chat/deep-research-progress.tsx`

Client-Komponente, die im Tool-Result-Bereich rendert, wenn `deep_research` aktiv ist.

**Verhalten:**
- Empfaengt `interactionId` aus dem Tool-Result
- **Mount-Logik:** Sofort Status pruefen, nicht blind "in_progress" annehmen (siehe unten)
- Pollt `/api/deep-research/{interactionId}` alle 5 Sekunden
- Zeigt Phasen-Fortschritt als vertikale Timeline
- Thought-Summaries als Live-Updates (collapsible)
- "Abbrechen"-Button
- Bei Completion: Ruft `/complete` auf, zeigt Artifact-Link

**Nicht-blockierendes Verhalten (Session-Wechsel):**

Die Recherche laeuft komplett auf Googles Servern. Der User kann jederzeit:
- Einen neuen Chat oeffnen und normal weiterarbeiten
- Die App schliessen und spaeter zurueckkehren
- Zwischen Chats hin- und herwechseln

Beim Zurueckkehren zum Research-Chat wird die `interactionId` aus dem gespeicherten Tool-Result geladen und der Status automatisch abgefragt.

**Mount-Lifecycle:**

```
Komponente mounted (Chat wird geladen)
  → Sofort GET /api/deep-research/{interactionId}
  │
  ├─ status: "completed"
  │  → Kein Polling starten
  │  → Direkt /complete aufrufen → Artifact erstellen
  │  → Fertigen Report anzeigen
  │
  ├─ status: "in_progress"
  │  → Polling starten (alle 5 Sekunden)
  │  → Fortschrittsanzeige rendern
  │
  ├─ status: "failed"
  │  → Fehlermeldung anzeigen
  │  → Kein Polling
  │
  └─ HTTP 404 / Netzwerkfehler
     → "Recherche nicht mehr verfuegbar" anzeigen
     → Google loescht Interactions nach 55 Tagen (Paid Tier)
```

**Unmount-Cleanup:**

```
Komponente unmounted (User wechselt Chat)
  → Polling-Interval clearInterval()
  → Laufende Fetch-Requests abortController.abort()
  → Kein Cleanup bei Google noetig (Recherche laeuft weiter)
```

**Phasen-Erkennung** (aus Thought-Summaries abgeleitet):

| Phase | Keywords | Icon | Beschreibung |
|-------|----------|------|-------------|
| Planung | plan, research plan, strategy | ClipboardList | "Recherche-Plan wird erstellt..." |
| Suche | search, query, finding | Search | "Quellen werden durchsucht..." |
| Analyse | read, analyz, evaluat | BookOpen | "Quellen werden ausgewertet..." |
| Bericht | writ, draft, compil, summar | FileText | "Bericht wird verfasst..." |

**Visual Design:**

```
┌─────────────────────────────────────┐
│ 🔬 Deep Research                    │
│                                     │
│ ● Planung        ✓ abgeschlossen   │
│ │                                   │
│ ● Suche          ⟳ laeuft...       │
│ │ "Durchsuche 23 Quellen zu        │
│ │  KI-Regulierung in der EU..."    │
│ │                                   │
│ ○ Analyse        ausstehend        │
│ │                                   │
│ ○ Bericht        ausstehend        │
│                                     │
│ ⏱ ~3 Minuten verbleibend           │
│                          [Abbrechen]│
└─────────────────────────────────────┘
```

Nach Completion:

```
┌─────────────────────────────────────┐
│ 🔬 Deep Research                    │
│                                     │
│ ✓ Planung   ✓ Suche                │
│ ✓ Analyse   ✓ Bericht              │
│                                     │
│ Report erstellt: 47 Quellen, ~4 Min │
│                                     │
│ [📄 Report oeffnen]                │
└─────────────────────────────────────┘
```

### 5.2 Tool-Status Labels

**Datei:** `src/components/chat/tool-status.tsx`

```typescript
// Labels ergaenzen:
deep_research: "Deep Research"

// Icons ergaenzen:
deep_research: FlaskConical  // oder BookSearch aus lucide-react
```

### 5.3 Chat-Message Integration

**Datei:** `src/components/chat/chat-message.tsx` (oder zustaendige Rendering-Stelle)

Tool-Part `deep_research` rendert `<DeepResearchProgress>` statt dem generischen `<ToolStatus>`. Folgt dem Pattern von `generate_image` (Custom-Rendering fuer bestimmte Tools).

### 5.4 Artifact-Panel Erweiterung

**Datei:** `src/components/assistant/artifact-panel.tsx`

Minimale Erweiterung: Wenn `artifact.metadata.deepResearch === true`, zeige unter dem Markdown-Content eine Quellenleiste:

```
─── 47 Quellen ──────────────────────
📖 EU AI Act Compliance Guide (europa.eu)
📖 US Executive Order on AI (whitehouse.gov)
📖 China AI Regulations 2026 (reuters.com)
... [alle anzeigen]
```

Nutzt die existierende `Sources`-Komponente aus `src/components/ai-elements/sources.tsx`.

---

## 6. Dateien-Uebersicht

### Neue Dateien

| Datei | Beschreibung |
|-------|-------------|
| `src/lib/ai/deep-research.ts` | SDK Wrapper (startDeepResearch, getResearchStatus) |
| `src/lib/ai/tools/deep-research.ts` | Tool-Definition (Factory Pattern) |
| `src/app/api/deep-research/[interactionId]/route.ts` | Polling + Cancel Route |
| `src/app/api/deep-research/[interactionId]/complete/route.ts` | Artifact-Erstellung nach Completion |
| `src/components/chat/deep-research-progress.tsx` | Fortschritts-UI (Client Component) |

### Zu aendernde Dateien

| Datei | Aenderung |
|-------|----------|
| `src/config/features.ts` | Feature Flag `deepResearch` hinzufuegen |
| `src/lib/credits.ts` | `DEEP_RESEARCH_CREDITS` + `calculateDeepResearchCredits()` |
| `src/app/api/chat/build-tools.ts` | Tool-Import und bedingte Registrierung |
| `src/config/prompts.ts` | System-Prompt Block fuer Deep Research |
| `src/components/chat/tool-status.tsx` | Label + Icon fuer `deep_research` |
| `src/components/chat/chat-message.tsx` | Custom Rendering fuer `deep_research` Tool |
| `src/components/assistant/artifact-panel.tsx` | Quellen-Anzeige fuer Deep Research Artifacts |
| `.env.example` | Neue ENV-Variablen dokumentieren |

---

## 7. Fehlerbehandlung

| Szenario | Verhalten |
|----------|----------|
| Google API Key fehlt | Feature Flag verhindert Tool-Registrierung |
| Recherche schlaegt fehl | Polling gibt `status: "failed"` + Error. UI zeigt Fehlermeldung |
| User navigiert weg | Polling stoppt (Cleanup). Recherche laeuft weiter bei Google. Beim Zurueckkehren: interactionId aus gespeichertem Tool-Result, Mount-Check erkennt Status (completed/in_progress/failed) und reagiert entsprechend |
| User schliesst App | Wie "navigiert weg". Beim naechsten Oeffnen des Chats: Mount-Lifecycle greift |
| User oeffnet neuen Chat | Kein Problem. Neuer Chat ist unabhaengig. Research-Chat bleibt in Sidebar zugaenglich |
| Interaction abgelaufen | Google loescht nach 55 Tagen (Paid). Poll gibt 404. UI zeigt "Recherche nicht mehr verfuegbar" |
| Credits reichen nicht | Tool prueft vor Start. Gibt Fehlermeldung zurueck, keine Recherche gestartet |
| Mehrere parallele Recherchen | Erlaubt. Jede hat eigene interactionId. Client trackt alle unabhaengig |
| Timeout (>15 min) | UI zeigt Warnung. Nach 30 min: Abbruch anbieten |

---

## 8. Sicherheit

- **Auth:** Polling-Route nutzt `requireAuth()`. Nur authentifizierte User
- **Rate-Limit:** API-Preset (60/min) auf Polling-Route
- **Input-Validierung:** Query max 2000 Zeichen (Zod), interactionId alphanumerisch max 100 Zeichen
- **Privacy-Routing:** Deep Research deaktiviert wenn Business Mode Privacy aktiv (Google API)
- **Keine User-Daten an Google:** Nur die Recherche-Query geht an den Deep Research Agent. Keine Chat-History, keine Uploads
- **Expert-Filter:** `allowedTools` greift auch fuer `deep_research`

---

## 9. Kosten und Credits

### Google-seitige Kosten

| Typ | Geschaetzte Kosten |
|-----|-------------------|
| Standard-Recherche | $2-3 |
| Komplexe Recherche | $3-5 |
| Typisch: ~80 Suchen, ~250k Input-Tokens, ~60k Output-Tokens |

### Credit-Kalkulation

- Default: 50.000 Credits pro Recherche
- Konfigurierbar via `DEEP_RESEARCH_CREDITS` ENV
- Vorab-Abzug (kein Refund bei Fehlschlag)
- Bei 100k Credits/$: 50.000 Credits = $0.50 (Subvention moeglich, da Google $2-5 berechnet)

### Empfehlung fuer Instanz-Betreiber

Credit-Preis so setzen, dass Deep Research wirtschaftlich tragbar bleibt. Moeglichkeiten:
- Credits teurer machen (weniger Credits pro Dollar)
- `DEEP_RESEARCH_CREDITS` erhoehen (z.B. 300.000)
- Feature nur fuer bestimmte Experts freischalten (`allowedTools`)

---

## 10. Implementierungs-Reihenfolge

### Schritt 1: Backend-Infrastruktur
1. Feature Flag in `features.ts`
2. Credits in `credits.ts`
3. SDK Wrapper in `deep-research.ts`
4. Tool-Definition in `tools/deep-research.ts`
5. Tool-Registrierung in `build-tools.ts`

### Schritt 2: API Routes
6. Polling Route `/api/deep-research/[interactionId]`
7. Completion Route `/api/deep-research/[interactionId]/complete`

### Schritt 3: UI
8. `DeepResearchProgress` Komponente
9. Tool-Status Label + Icon
10. Chat-Message Custom Rendering
11. System-Prompt Erweiterung

### Schritt 4: Feinschliff
12. Artifact-Panel Quellen-Anzeige
13. ENV-Dokumentation
14. Manueller Test End-to-End

---

## 11. Verifikation

### Manueller Test-Plan

1. **Feature Flag:** `DEEP_RESEARCH_ENABLED` nicht gesetzt → Tool nicht in Chat verfuegbar
2. **Feature Flag aktiv:** Tool erscheint in Tool-Aufruf-Moeglichkeiten der AI
3. **Recherche starten:** "Recherchiere den Stand der KI-Regulierung in der EU" → AI ruft `deep_research` auf
4. **Fortschritt:** Progress-Komponente zeigt Phasen + Thought-Summaries
5. **Completion:** Report als Markdown-Artifact, Quellen-Liste sichtbar
6. **Credits:** Balance korrekt reduziert (vorab)
7. **Fehlerfall:** Google API Key entfernen → Feature nicht verfuegbar
8. **Cancel:** Abbruch-Button funktioniert
9. **Page Reload:** Zurueck zum Chat → Polling wird fortgesetzt (interactionId aus Message)
10. **Expert-Filter:** Expert mit `allowedTools` ohne `deep_research` → Tool nicht verfuegbar

---

## 12. Abgrenzung (Out of Scope fuer V1)

- **SSE-Streaming** statt Polling (V2 Optimierung)
- **Follow-up Research** via `previous_interaction_id` (V2)
- **File Search** mit eigenen Dokumenten (V2, benoetigt Google File Search Stores)
- **Multimodale Inputs** (Bilder, PDFs als Research-Input) (V2)
- **Research History** (eigene Uebersicht vergangener Recherchen) (V2)
- **Eigene Research-UI** (separater Modus/Seite) (nicht geplant, Tool-Integration reicht)
