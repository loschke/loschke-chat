# PRD: Anthropic Agent Skills Integration

> Feature-Dokumentation fuer die Integration von Anthropic Agent Skills in die KI-Chat-Plattform.
> Status: Recherche abgeschlossen, Implementierung ausstehend.

---

## 1. Feature-Uebersicht

### Was sind Anthropic Agent Skills?

Agent Skills erweitern Claude um spezialisierte Faehigkeiten zur Dokumenten-Erstellung. Skills laufen in einem sandboxed Code Execution Container (Python/Bash) und erzeugen herunterladbare Dateien.

Es gibt zwei Kategorien:

**Anthropic Standard-Skills (pre-built):**

| Skill ID | Ausgabe | Beschreibung |
|----------|---------|-------------|
| `pptx` | PowerPoint (.pptx) | Praesentationen erstellen |
| `xlsx` | Excel (.xlsx) | Tabellen und Daten-Analyse |
| `docx` | Word (.docx) | Dokumente und Berichte |
| `pdf` | PDF (.pdf) | PDF-Dokumente erstellen |

**Custom Skills (user-uploaded):**
- Eigene Skills mit SKILL.md, Skripten und Ressourcen
- IDs im Format `skill_01AbCdEfGh...`
- Versioniert (Epoch-Timestamp oder `"latest"`)
- Max. 8 MB pro Skill, max. 8 Skills pro Request

### Wie funktionieren Skills?

1. Skills werden per `container.skills` im API-Request konfiguriert
2. Claude entscheidet selbststaendig, wann ein Skill genutzt wird
3. Der Code Execution Container fuehrt den Skill-Code aus
4. Generierte Dateien sind ueber die Anthropic Files API abrufbar
5. Container bleibt zwischen Steps persistent (Multi-Turn)

### Voraussetzungen

- **Model:** Empfohlen `claude-opus-4-6`, unterstuetzt auch `claude-sonnet-4-5` und andere
- **Code Execution Tool:** Muss im Request aktiviert sein (Skills laufen im Container)
- **Beta Headers:** `code-execution-2025-08-25`, `skills-2025-10-02` (AI SDK handhabt diese automatisch)

---

## 2. Scope

### In Scope

- Anthropic Standard-Skills: pptx, xlsx, docx, pdf
- Custom Skills per ENV-Konfiguration (initial: Carousel Skill)
- Code Execution als implizite Voraussetzung (nicht als eigenstaendiges Feature)
- Hybrid Output-Rendering (Download-Card + Artifact-System)
- File-Download ueber Proxy-Route zur Anthropic Files API
- R2-Persistenz fuer previewbare Formate (PDF, HTML)

### Out of Scope (bewusst ausgeschlossen)

- Native Anthropic Web Search (eigenes Feature, separates PRD)
- Native Anthropic Web Fetch
- Standalone Code Execution als User-Feature
- Custom Skill Management UI (Skills werden per ENV konfiguriert)
- Anthropic Computer Use Tool

---

## 3. Technische Recherche

### AI SDK Integration

Das AI SDK (`@ai-sdk/anthropic` v3.0.49) unterstuetzt alle nativen Anthropic Tools:

```typescript
import { anthropic, forwardAnthropicContainerIdFromLastStep } from "@ai-sdk/anthropic"

// Code Execution Tool (Voraussetzung fuer Skills)
const codeExecutionTool = anthropic.tools.codeExecution_20260120()

// Skills werden per providerOptions konfiguriert
const result = await streamText({
  model: anthropic("claude-opus-4-6"),
  tools: {
    code_execution: codeExecutionTool,
  },
  providerOptions: {
    anthropic: {
      container: {
        skills: [
          { type: "anthropic", skillId: "pptx", version: "latest" },
          { type: "custom", skillId: "skill_01AbCdEf...", version: "latest" },
        ],
      },
    },
  },
  // Container-ID zwischen Steps weiterleiten
  prepareStep: forwardAnthropicContainerIdFromLastStep,
})
```

### Vercel AI Gateway Kompatibilitaet

Die Plattform routet alle Modelle ueber den Vercel AI Gateway (`gateway(finalModelId)`). Aus der Gateway-Dokumentation:

- Native Anthropic Tools (Web Search, Code Execution) werden ueber den Gateway unterstuetzt
- Der `anthropic` Import aus `@ai-sdk/anthropic` wird nur als **Tool-Factory** genutzt
- Das Model bleibt `gateway("anthropic/claude-sonnet-4-6")`
- Provider-spezifische `providerOptions` werden durchgereicht

**Verifizierung noetig:** Ob der Gateway die Beta-Headers fuer Skills (`skills-2025-10-02`) korrekt weiterleitet. Falls nicht: Fallback auf direkte Anthropic-Provider-Instanz.

### Beta-Status

| Feature | Beta Header | ZDR-faehig |
|---------|------------|-----------|
| Code Execution | `code-execution-2025-08-25` | Nein |
| Agent Skills | `skills-2025-10-02` | Nein |
| Files API | `files-api-2025-04-14` | N/A |

**Wichtig:** Agent Skills sind nicht ZDR-eligible (Zero Data Retention). Das bedeutet, dass Anthropic Daten aus Skill-Ausfuehrungen temporaer speichern kann.

### Anthropic Files API

Generierte Dateien werden ueber die Files API abgerufen:

```bash
# Datei-Metadaten
GET https://api.anthropic.com/v1/files/{file_id}
# Header: anthropic-beta: files-api-2025-04-14

# Datei-Inhalt herunterladen
GET https://api.anthropic.com/v1/files/{file_id}/content
# Header: anthropic-beta: files-api-2025-04-14

# Datei loeschen
DELETE https://api.anthropic.com/v1/files/{file_id}
# Header: anthropic-beta: files-api-2025-04-14
```

File-IDs erscheinen im Code Execution Tool-Result als `file_id` Attribute in `bash_code_execution_tool_result` Content-Blocks.

### Kosten

- **Code Execution:** Container-Laufzeit (Preis abhaengig von Dauer, separate Abrechnung)
- **Skills:** Keine zusaetzlichen Kosten ueber Code Execution hinaus
- **Files API:** Keine separaten Kosten fuer Downloads
- **Token:** Code Execution Output zaehlt als Input-Tokens bei Multi-Turn

Kosten werden ueber den AI Gateway abgerechnet. Nicht separat in Token-Counts sichtbar — Credit-Surcharge ggf. spaeter ergaenzen.

---

## 4. Architektur-Design

### Bestehende Architektur (relevant)

```
route.ts (Orchestrator)
├── resolve-context.ts → Expert, Model, Skills, Memory
├── build-messages.ts  → Message-Transformation, Cache Control
├── build-tools.ts     → Tool-Registry (conditional)
└── persist.ts         → onFinish: Save, Credits, Title, Memory
```

- Alle Modelle laufen ueber `gateway(finalModelId)`
- Tools werden bedingt registriert basierend auf Feature Flags
- Model-Erkennung per `modelId.startsWith("anthropic/")`
- Einziges Anthropic-spezifisches Feature: Prompt Caching (ephemeral)

### Integrations-Punkte

| Komponente | Aenderung |
|------------|-----------|
| `build-tools.ts` | `code_execution` Tool fuer Anthropic registrieren |
| `route.ts` | `providerOptions.anthropic.container.skills` setzen |
| `route.ts` | `prepareStep: forwardAnthropicContainerIdFromLastStep` |
| `route.ts` | `stepCountIs()` von 5 auf 8 erhoehen (Anthropic) |
| `persist.ts` | File-Output erkennen, previewbare Dateien → Artifact + R2 |
| `build-messages.ts` | Part-Filter fuer Code Execution Parts pruefen |

### Datenfluss

```
User Prompt
    │
    ▼
streamText() mit code_execution Tool + Skills Config
    │
    ▼
Claude entscheidet: Skill nutzen?
    │ ja
    ▼
Code Execution Container startet
    │
    ▼
Skill-Code laeuft (Python) → Datei generiert
    │
    ▼
Tool-Result mit file_id zurueck
    │
    ▼
┌─────────────────────────────────────┐
│ Dateityp pruefen                     │
├──────────┬──────────────────────────┤
│ PDF/HTML │ PPTX/XLSX/DOCX           │
│          │                          │
│ Artifact │ Download-Card            │
│ + R2     │ im Chat                  │
│ + Panel  │                          │
└──────────┴──────────────────────────┘
```

---

## 5. Output-Strategie (Hybrid)

### Previewbare Formate → Artifact-System

| Format | Rendering | Persistenz |
|--------|-----------|------------|
| **PDF** | `<embed>` im ArtifactPanel | R2 Upload + Artifact-DB |
| **HTML** (Custom Skills) | Bestehender `HtmlPreview` (iframe sandbox) | Artifact-DB (Content als Text) |

- ArtifactCard im Chat-Message (Klick oeffnet Panel)
- Artifact wird in `persist.ts` erstellt (wie bei `create_artifact`)
- PDF-Datei wird nach R2 kopiert, URL im Artifact gespeichert

### Binaer-Formate → Download-Card

| Format | Rendering | Persistenz |
|--------|-----------|------------|
| **PPTX** | Download-Card im Chat | File-Proxy (temporaer) |
| **XLSX** | Download-Card im Chat | File-Proxy (temporaer) |
| **DOCX** | Download-Card im Chat | File-Proxy (temporaer) |

- Neue `FileDownloadCard` Komponente
- Dateiname, Typ-Icon, Groesse, Download-Button
- Download ueber `/api/files/{fileId}` Proxy-Route

### Limitierung Binaer-Formate

Anthropic Files API Dateien haben eine begrenzte Lebensdauer. Nach Ablauf ist der Download nicht mehr moeglich. Optionen fuer spaeter:
- Sofortiger R2-Upload aller Dateien in `persist.ts`
- Background-Job der Dateien kopiert
- User-Hinweis zur temporaeren Verfuegbarkeit

---

## 6. Konfiguration

### Feature Flags

```typescript
// src/config/features.ts
anthropicSkills: {
  enabled: process.env.ANTHROPIC_SKILLS_ENABLED !== "false", // opt-out, default enabled
},
```

Aktivierung: Skills werden nur registriert wenn:
1. Feature Flag enabled UND
2. Model ist Anthropic (`modelId.startsWith("anthropic/")`) UND
3. Kein Privacy-Routing aktiv

### ENV-Variablen

| Variable | Pflicht | Default | Beschreibung |
|----------|---------|---------|-------------|
| `ANTHROPIC_SKILLS_ENABLED` | Nein | `true` (opt-out) | Feature Flag fuer Agent Skills |
| `ANTHROPIC_CUSTOM_SKILL_IDS` | Nein | — | Komma-separierte Custom Skill IDs |
| `ANTHROPIC_CAROUSEL_SKILL_ID` | Nein | — | Spezifische Carousel Skill ID (Legacy, wird in CUSTOM_SKILL_IDS aufgehen) |

**Beispiel `.env`:**
```bash
# Agent Skills (opt-out, default enabled)
ANTHROPIC_SKILLS_ENABLED=true

# Custom Skills (komma-separiert)
ANTHROPIC_CUSTOM_SKILL_IDS=skill_01AbCdEfGh,skill_02XyZaBcDe
```

### Skills-Konfiguration zur Laufzeit

```typescript
function buildSkillsConfig(): SkillConfig[] | undefined {
  if (!features.anthropicSkills.enabled) return undefined

  const skills: SkillConfig[] = [
    // Standard Anthropic Skills
    { type: "anthropic", skillId: "pptx", version: "latest" },
    { type: "anthropic", skillId: "xlsx", version: "latest" },
    { type: "anthropic", skillId: "docx", version: "latest" },
    { type: "anthropic", skillId: "pdf", version: "latest" },
  ]

  // Custom Skills aus ENV
  const customIds = process.env.ANTHROPIC_CUSTOM_SKILL_IDS?.split(",").map(s => s.trim()).filter(Boolean)
  if (customIds?.length) {
    for (const id of customIds) {
      skills.push({ type: "custom", skillId: id, version: "latest" })
    }
  }

  return skills
}
```

---

## 7. Betroffene Dateien

### Bestehende Dateien (Aenderungen)

| Datei | Aenderung | Aufwand |
|-------|-----------|--------|
| `src/config/features.ts` | Feature Flag `anthropicSkills` | Gering |
| `src/app/api/chat/build-tools.ts` | `modelId` Parameter, `code_execution` Tool | Gering |
| `src/app/api/chat/route.ts` | `providerOptions`, `prepareStep`, `stepCount`, Import | Mittel |
| `src/app/api/chat/build-messages.ts` | `ALLOWED_PART_TYPES` pruefen/erweitern | Gering |
| `src/app/api/chat/persist.ts` | File-Output → Artifact + R2 Logik | Hoch |
| `src/components/chat/tool-status.tsx` | Label + Icon fuer `code_execution` | Gering |
| `src/components/chat/chat-message.tsx` | `code_execution` Custom Rendering | Mittel |
| `src/components/assistant/artifact-panel.tsx` | PDF embed Renderer | Mittel |

### Neue Dateien

| Datei | Zweck | Aufwand |
|-------|-------|--------|
| `src/app/api/files/[fileId]/route.ts` | Proxy zur Anthropic Files API | Mittel |
| `src/components/chat/file-download-card.tsx` | Download-Card fuer Binaer-Dateien | Gering |

---

## 8. Implementierungs-Reihenfolge

### Phase 1: Grundlagen (Backend)

| # | Schritt | Abhaengigkeit |
|---|---------|---------------|
| 1 | Feature Flag in `features.ts` | — |
| 2 | `build-tools.ts` — modelId + code_execution | 1 |
| 3 | `route.ts` — providerOptions, prepareStep, stepCount | 2 |
| 4 | `build-messages.ts` — Part-Filter | — |
| 5 | `api/files/[fileId]/route.ts` — File Proxy | — |

### Phase 2: UI (Frontend)

| # | Schritt | Abhaengigkeit |
|---|---------|---------------|
| 6 | `tool-status.tsx` — Labels/Icons | — |
| 7 | `file-download-card.tsx` — Download-Komponente | 5 |
| 8 | `chat-message.tsx` — code_execution Rendering | 6, 7 |

### Phase 3: Persistenz + Preview

| # | Schritt | Abhaengigkeit |
|---|---------|---------------|
| 9 | `persist.ts` — File-Detection + Artifact/R2 | 5 |
| 10 | `artifact-panel.tsx` — PDF Renderer | 9 |

### Phase 4: Polish

| # | Schritt | Abhaengigkeit |
|---|---------|---------------|
| 11 | `.env.example` aktualisieren | 1 |
| 12 | `feature-flags-konfiguration.md` aktualisieren | 1 |
| 13 | End-to-End Tests | Alles |

---

## 9. Risiken & Offene Fragen

### Risiken

| Risiko | Schwere | Mitigation |
|--------|---------|------------|
| Gateway leitet Beta-Headers nicht weiter | Hoch | Testen; Fallback: direkte Anthropic-Provider-Instanz |
| Files API Dateien laufen ab | Mittel | Sofortiger R2-Upload in persist.ts |
| Code Execution Kosten unkontrolliert | Mittel | stepCount-Limit; spaeter Credit-Surcharge |
| Skills produzieren unerwartete Output-Formate | Gering | Generischer Fallback auf Download-Card |
| Multi-Turn Container-State verloren | Gering | forwardAnthropicContainerIdFromLastStep |

### Offene Fragen

1. **Files API Lebensdauer:** Wie lange sind Dateien ueber die Files API verfuegbar? Dokumentation unklar. Testen.
2. **Gateway + Skills Beta:** Wird `skills-2025-10-02` Beta-Header vom AI Gateway korrekt durchgereicht? Muss getestet werden.
3. **Custom Skill Output-Format:** Was genau gibt der Carousel Skill zurueck? HTML, Bilder, oder beides? Bestimmt die Rendering-Strategie.
4. **Credit-Tracking:** Sollen Code Execution Kosten separat in Credits abgebildet werden? Aktuell nicht in Token-Counts enthalten.
5. **R2-Upload fuer alle Dateien:** Sollen auch Binaer-Dateien (pptx, xlsx) sofort nach R2 kopiert werden fuer Persistenz, oder reicht die temporaere Files API?
6. **`pause_turn` Handling:** Code Execution kann `pause_turn` als stop_reason zurueckgeben bei langen Operationen. Muss die Route das behandeln?

---

## 10. Verifizierung

### Testszenarien

| # | Test | Erwartung |
|---|------|-----------|
| 1 | "Erstelle eine PowerPoint ueber KI mit 5 Slides" (Anthropic Model) | Code Execution laeuft, PPTX generiert, Download-Card im Chat |
| 2 | "Erstelle ein PDF-Dokument mit einer Zusammenfassung" | PDF generiert, Artifact im Panel mit embed Preview |
| 3 | Carousel Skill triggern (Custom Skill) | HTML Output im Artifact-System |
| 4 | "Erstelle eine Excel-Tabelle mit Budget-Daten" | XLSX generiert, Download-Card |
| 5 | Model auf OpenAI/Mistral wechseln | Keine Skills, kein Code Execution, keine Fehler |
| 6 | Privacy-Routing aktiv | Skills deaktiviert |
| 7 | Zweite Nachricht im selben Chat | Container-ID weitergeleitet, Context erhalten |
| 8 | Chat neu laden | Artifacts weiterhin sichtbar, Downloads verfuegbar |
| 9 | `ANTHROPIC_SKILLS_ENABLED=false` | Keine Skills registriert |
| 10 | Mehrere Skills in einem Request | Alle Skills verfuegbar, max 8 |

### Smoke Test Reihenfolge

1. Feature Flag pruefen (kein Fehler bei deaktiviert)
2. Einfache Skill-Nutzung (pptx erstellen)
3. File-Download funktioniert
4. Artifact-Erstellung fuer PDF
5. Multi-Turn mit Container-Persistenz
6. Non-Anthropic Fallback

---

## Referenzen

- [Anthropic Skills Guide](https://platform.claude.com/docs/en/build-with-claude/skills-guide)
- [Anthropic Web Search Tool](https://platform.claude.com/docs/en/build-with-claude/tool-use/web-search-tool)
- [Anthropic Code Execution](https://platform.claude.com/docs/en/build-with-claude/tool-use/code-execution-tool)
- [AI SDK Anthropic Provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic)
- [Vercel AI Gateway — Anthropic](https://vercel.com/docs/ai-gateway/sdks-and-apis/anthropic-messages-api/advanced)
- [Anthropic Files API](https://platform.claude.com/docs/en/api/files-content)
