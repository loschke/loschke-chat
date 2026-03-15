# PRD: AI Chat Platform

> **Projekt:** Eigene AI Chat Plattform mit Artifact-System, Expertensystem, MCP-Integration, Skills und Websearch
> **Stand:** 2026-03-15
> **Autor:** Rico Loschke
> **Aktueller Meilenstein:** M7 MCP Integration abgeschlossen. Nächster Schritt: M8 Memory System.

---

## 1. Produktvision

Eine vollständige, selbst gehostete AI Chat Plattform, die die besten Features moderner AI-Interfaces (Claude.ai, ChatGPT) in einer eigenen, erweiterbaren Architektur vereint. Die Plattform nutzt konsequent das Vercel-Ökosystem (AI SDK, AI Gateway, AI Elements) und Anthropic-APIs (Skills, MCP) und bietet darüber hinaus ein Expertensystem für kontextbasierte AI-Interaktion.

**Kernthese:** Nicht "noch ein Chat-UI", sondern eine Plattform, die durch das Expertensystem, flexible Artifact-Ausgaben und MCP-App-Integration einen Mehrwert über Standard-Chat-Interfaces hinaus bietet.

---

## 2. Tech-Stack

| Schicht           | Technologie                              | Rolle                                                             |
| ----------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| **Framework**     | Next.js 16 (App Router)                  | Fullstack-Framework, SSR, Server Actions, proxy.ts                |
| **Language**      | TypeScript (strict)                      | Durchgängig typisiert                                             |
| **Styling**       | Tailwind CSS v4                          | Utility-first CSS                                                 |
| **UI Components** | shadcn/ui                                | Basis-UI-Komponenten                                              |
| **AI Components** | AI Elements                              | Chat-spezifische UI (Message, Conversation, Tool, Artifact, etc.) |
| **AI Core**       | AI SDK v6 (`ai`, `@ai-sdk/react`)        | LLM-Integration, Streaming, Tool Calling, Agents                  |
| **AI Models**     | Vercel AI Gateway                        | Unified Model Access, Provider-Routing                            |
| **AI Rendering**  | Streamdown                               | Streaming Markdown mit Syntax-Highlighting, Math, Mermaid         |
| **MCP Client**    | `@ai-sdk/mcp`                            | Model Context Protocol Integration                                |
| **Skills**        | Anthropic Agent Skills API               | Document Generation (pptx, xlsx, docx, pdf), Custom Skills        |
| **Database**      | Neon (Serverless Postgres) + Drizzle ORM | Chat-Persistenz, User-Daten, pgvector für Embeddings              |
| **Caching**       | Redis (Upstash)                          | Session-Cache, Response-Cache, Rate Limiting                      |
| **File Storage**  | Cloudflare R2                            | User-Uploads, generierte Dateien, Artifact-Assets                 |
| **Auth**          | Logto (Cloud SaaS)                       | OIDC Authentication, User Management                              |

---

## 3. Feature-Spezifikation

### 3.1 Chat-Kern

#### 3.1.1 Streaming Chat

**Beschreibung:** Echtzeit-Streaming von AI-Responses mit Token-für-Token-Anzeige.

**Technische Umsetzung:**

- AI SDK `streamText` / `useChat` Hook als Kern
- Streamdown für Markdown-Rendering während des Streamings (unterminated block handling)
- AI Elements `Conversation`, `Message`, `MessageResponse` für UI
- Support für `message.parts` (text, tool_use, tool_result, reasoning)

**Anforderungen:**

- Streaming muss unterbrechbar sein (Cancel/Stop)
- Smooth Animations via Streamdown `animated` + `isAnimating`
- Syntax Highlighting via `@streamdown/code` (Shiki)
- Math-Rendering via `@streamdown/math` (KaTeX)
- Mermaid-Diagramme via `@streamdown/mermaid`
- Reasoning/Chain-of-Thought Anzeige via AI Elements `Reasoning` Component

#### 3.1.2 Multi-Model Support

**Beschreibung:** User können pro Chat ein AI-Model wählen.

**Technische Umsetzung:**

- Vercel AI Gateway als einziger Endpoint
- Model-String Format: `provider/model-name`
- AI Elements `ModelSelector` Component für UI
- Model-Konfiguration (verfügbare Models, Defaults) in DB

**Verfügbare Provider (über AI Gateway):**

- Anthropic (Claude Opus, Sonnet, Haiku)
- OpenAI (GPT-4o, o1, o3)
- Google (Gemini)
- Mistral (Mistral Large, Medium, Small) — **EU-Provider** (Paris, Hosting in EU)
- xAI (Grok)
- Meta (Llama)
- Weitere nach Bedarf

**EU-Konformität:** Mistral ist der designierte Provider wenn ein EU-konformer, DSGVO-naher Betrieb gefordert ist. Mistral AI ist ein französisches Unternehmen, Datenverarbeitung findet in der EU statt. Für Szenarien mit sensiblen Daten oder regulatorischen Anforderungen wird Mistral als Model-Präferenz gesetzt — konfigurierbar pro Expert oder pro Project.

**PII-Erkennung (Pre-Send Check):**

Bevor eine User-Nachricht an das LLM gesendet wird, prüft eine lokale PII-Detection-Library den Text auf personenbezogene Daten (Namen, E-Mail-Adressen, Telefonnummern, Adressen, IBAN, etc.). Bei Treffern wird dem User ein Bestätigungs-Dialog angezeigt.

```
Flow:
1. User tippt Nachricht und klickt "Senden"
2. Client-side PII-Check läuft lokal (kein Server-Call)
3. Wenn PII erkannt:
   → Confirmation-Dialog:
     "Deine Nachricht enthält möglicherweise personenbezogene Daten:
      • E-Mail-Adresse: j***@example.com
      • Name: Max M***
      Möchtest du die Nachricht trotzdem senden?"
     [Trotzdem senden] [Bearbeiten]
4. User bestätigt → Nachricht wird an LLM gesendet
5. User wählt "Bearbeiten" → zurück zum Input, Nachricht bleibt erhalten
```

**Technische Umsetzung:**

- Library: `openredaction` (TypeScript, 570+ Regex-Patterns, läuft komplett lokal)
- Alternativ: `redact-pii-core` (TypeScript, regex-basiert, kein externer Service)
- Check läuft im Client VOR dem API-Call (keine PII verlässt den Browser unbestätigt)
- Erkannte PII-Typen werden kategorisiert angezeigt (Name, E-Mail, Telefon, etc.)
- Werte werden im Dialog teilmaskiert angezeigt (Datenschutz im Dialog selbst)
- Feature ist konfigurierbar: An/Aus pro Project oder global in User-Preferences
- Bei aktivem DSGVO-Modus (Mistral + PII-Check) wird beides gemeinsam aktiviert

**Referenz-Libraries:**

- `openredaction`: https://github.com/sam247/openredaction
- `redact-pii-core`: https://www.npmjs.com/package/redact-pii-core

#### 3.1.3 Message Persistence

**Beschreibung:** Alle Chats werden persistent in der Datenbank gespeichert.

**Technische Umsetzung:**

- Neon Postgres + Drizzle ORM
- `UIMessage` Format für Persistenz (AI SDK Standard)
- Optimistic Updates im Client
- Streaming-kompatible Persistenz (onFinish Callback)

**Datenmodell Kern:**

```
users
├── id (uuid, PK)
├── logtoId (string, unique)
├── email (string)
├── name (string)
├── avatarUrl (string?)
├── preferences (jsonb)       → Model-Defaults, UI-Settings
├── createdAt (timestamp)
└── updatedAt (timestamp)

experts
├── id (uuid, PK)
├── userId (uuid?, FK → users)    → null = globaler Expert, sonst user-spezifisch
├── name (string)
├── slug (string, unique)
├── description (text)            → Kurzbeschreibung für Auswahl-UI
├── icon (string?)                → Lucide Icon Name oder Custom URL
├── systemPrompt (text)           → Persona + Verhalten
├── skillSlugs (string[])         → Agent Skills die priorisiert geladen werden
├── modelPreference (string?)     → z.B. "anthropic/claude-opus-4-6"
├── temperature (float?)
├── allowedTools (string[]?)      → Tool-IDs die dieser Expert nutzen darf
├── mcpServerIds (uuid[]?)        → MCP Server die der Expert nutzt
├── isPublic (boolean)
├── sortOrder (integer)
├── createdAt (timestamp)
└── updatedAt (timestamp)

projects
├── id (uuid, PK)
├── userId (uuid, FK → users)
├── name (string)
├── description (text?)
├── defaultExpertId (uuid?, FK → experts)
├── mcpServerIds (uuid[])         → Erlaubte MCP-Server
├── settings (jsonb)              → Model-Default, Temperature, etc.
├── createdAt (timestamp)
└── updatedAt (timestamp)

project_documents                   → Dynamisches Domänenwissen
├── id (uuid, PK)
├── projectId (uuid, FK → projects)
├── title (string)
├── content (text)                  → Extrahierter Text-Content
├── fileUrl (string?)               → Original-Datei in R2 (optional)
├── mimeType (string?)
├── tokenCount (integer?)           → Für Context-Window-Management
├── sortOrder (integer)
├── createdAt (timestamp)
└── updatedAt (timestamp)

chats
├── id (uuid, PK)
├── userId (uuid, FK → users)
├── projectId (uuid?, FK → projects)
├── expertId (uuid?, FK → experts)
├── title (string)
├── isPinned (boolean, default false)
├── modelId (string?)             → z.B. "anthropic/claude-sonnet-4-20250514"
├── metadata (jsonb)              → Token Usage, etc.
├── createdAt (timestamp)
└── updatedAt (timestamp)

messages
├── id (uuid, PK)
├── chatId (uuid, FK → chats)
├── role (enum: user, assistant, system, tool)
├── parts (jsonb)             → AI SDK UIMessage parts Array
├── metadata (jsonb)          → Model ID, Token Count, Finish Reason
├── createdAt (timestamp)
└── updatedAt (timestamp)

artifacts
├── id (uuid, PK)
├── messageId (uuid, FK → messages)
├── chatId (uuid, FK → chats)
├── type (enum: html, markdown, code, jsx, file)
├── title (string)
├── content (text)
├── language (string?)
├── fileUrl (string?)         → R2 URL für generierte Dateien
├── version (integer)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

#### 3.1.4 Token-Management & Context Window

**Beschreibung:** Tracking des Token-Verbrauchs pro Chat, intelligentes Context-Window-Management bei langen Chats, und Prompt-Caching für Kosten- und Latenz-Reduktion.

**Token-Tracking:**

- `usage_logs` Tabelle erfasst `promptTokens`, `completionTokens`, `totalTokens` pro Message (bereits in M1 implementiert)
- Kumulierter Token-Count pro Chat (aggregiert aus `usage_logs` oder als Feld auf `chats`)
- Token-Verbrauch im UI sichtbar (Sidebar-Badge oder Chat-Header)
- Modell-spezifische Context-Window-Limits aus Model-Registry (`src/config/models.ts`)

**Anthropic Prompt Caching:**

- System-Prompt und wiederkehrende Message-Blöcke mit `providerOptions.anthropic.cacheControl: { type: 'ephemeral' }` markieren
- Cache-Metriken aus `usage.inputTokenDetails` tracken: `cacheReadTokens`, `cacheWriteTokens`
- Einsparung: Gecachte Tokens kosten ~10% des Normalpreises, Latenz sinkt signifikant

**Context Window Strategie (Sliding Window):**

- Wenn kumulierter Token-Count > 70% des Modell-Limits → Sliding Window aktivieren
- System-Prompt + letzte N Nachrichten behalten, ältere abschneiden
- Optional: Zusammenfassung älterer Nachrichten per LLM generieren, als synthetische "summary" Message am Anfang einfügen
- Umsetzung: Logik vor `convertToModelMessages()` in der Chat-Route, oder via AI SDK `prepareStep` Callback bei Agent-Loops
- Context-Window-Warnung im UI wenn Chat sich dem Limit nähert (z.B. 80%)

**Client-seitige Performance:**

- Lazy Loading der Chat-History bei langen Chats (nicht alle Messages auf einmal laden)
- Pagination oder virtualisiertes Scrolling ab einer Message-Schwelle

**Caching-Infrastruktur (optional):**

- Upstash Redis für Rate-Limiting (ersetzt In-Memory-Limiter)
- Redis Response-Cache für wiederholte/ähnliche Anfragen
- `ai-sdk-tools` `createCached()` für Tool-Call-Caching

---

### 3.2 Artifact System

**Beschreibung:** Flexibles System zur Darstellung von AI-generierten Outputs jenseits von reinem Text.

#### 3.2.1 Artifact-Typen

| Typ           | Rendering                                   | Use Case                                     |
| ------------- | ------------------------------------------- | -------------------------------------------- |
| **HTML**      | AI Elements `WebPreview` / Sandboxed iframe | Interaktive Outputs, Visualisierungen        |
| **Markdown**  | Streamdown (Static Mode)                    | Dokumente, Berichte                          |
| **Code**      | AI Elements `CodeBlock` + Shiki             | Code-Snippets mit Syntax-Highlighting        |
| **JSX/React** | AI Elements `JSXPreview`                    | Live React Components                        |
| **File**      | Download-Link + Preview                     | PPTX, XLSX, DOCX, PDF (via Anthropic Skills) |

#### 3.2.2 Artifact-Lifecycle

```
1. AI generiert Artifact-Content als Teil der Response
2. Frontend erkennt Artifact-Marker (Tool Call oder spezielle Formatierung)
3. Artifact wird separat gerendert (Split-View oder Panel)
4. Artifact wird in DB persistiert (content + metadata)
5. Files werden via R2 gespeichert, URL in artifact.fileUrl
6. User kann Artifacts versionieren (Edit → neue Version)
```

#### 3.2.3 Artifact UI

- Split-View: Chat links, Artifact rechts (responsive)
- Artifacts können maximiert/minimiert werden
- Code-Artifacts: Copy, Download, Language-Detection
- HTML-Artifacts: Sandboxed Preview mit Fullscreen-Option
- File-Artifacts: Preview-Thumbnail + Download-Button

### 3.2b Generative UI (Eigene interaktive Components)

**Beschreibung:** Neben statischen Artifacts kann der Chat eigene React-Components als Inline-UI rendern, gesteuert durch Tool-Calls des Models. Das ist der AI SDK "Generative UI" Ansatz — im Unterschied zu MCP Apps, wo externe Server die UI liefern.

**Abgrenzung der drei UI-Layer:**

| Layer             | Quelle                                               | Rendering                       | Isolation                          | Use Case                                                                          |
| ----------------- | ---------------------------------------------------- | ------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------- |
| **Artifacts**     | AI-generierter Content (Text/Code/HTML)              | Panel/Split-View                | Sandboxed iframe (HTML)            | Dokumente, Code-Output, statische Visualisierungen                                |
| **Generative UI** | Eigene React Components, getriggert durch Tool-Calls | Inline im Chat-Flow             | Keine (läuft im Host-Prozess)      | Eigene interaktive Features: Wetter-Cards, Charts, Formulare, Bestätigungsdialoge |
| **MCP Apps**      | Externer MCP Server liefert komplette HTML-App       | Sandboxed iframe inline im Chat | Voll isoliert (postMessage Bridge) | Third-Party-Integrationen: Jira-Board, Notion, Analytics-Dashboards               |

#### 3.2b.1 Wie Generative UI funktioniert

```
1. Tool wird im Backend definiert (z.B. show_weather, render_chart)
2. Model entscheidet via Tool-Call, dass UI gerendert werden soll
3. Tool-Call kommt als Part (type: "tool-invocation") im Message-Stream an
4. Frontend mappt Tool-Name → React Component
5. Component wird INLINE im Chat-Flow gerendert (nicht im Artifact-Panel)
6. Component hat vollen Zugriff auf App-State, DB, Styling
```

#### 3.2b.2 Technische Umsetzung (AI SDK v6 Pattern)

**Backend — Tool Definition:**

```typescript
// lib/ai/tools/weather.ts
import { tool } from 'ai';
import { z } from 'zod';

export const showWeather = tool({
  description: 'Zeigt eine interaktive Wetteranzeige für einen Ort',
  parameters: z.object({
    city: z.string(),
    unit: z.enum(['celsius', 'fahrenheit']).default('celsius'),
  }),
  execute: async ({ city, unit }) => {
    const data = await fetchWeatherData(city, unit);
    return data; // Daten, NICHT UI — UI kommt vom Frontend
  },
});
```

**Frontend — Tool-Result → Component Mapping:**

```tsx
// components/chat/chat-messages.tsx
import { useChat } from '@ai-sdk/react';
import { WeatherCard } from '@/components/generative-ui/weather-card';
import { ChartView } from '@/components/generative-ui/chart-view';

// Mapping: Tool-Name → React Component
const toolComponents: Record<string, React.ComponentType<any>> = {
  show_weather: WeatherCard,
  render_chart: ChartView,
  // ...
};

// In der Message-Rendering-Loop:
{message.parts.map((part, index) => {
  if (part.type === 'tool-invocation') {
    const Component = toolComponents[part.toolName];
    if (Component && part.state === 'result') {
      return <Component key={index} data={part.result} />;
    }
    // Fallback: AI Elements <Tool> Component für unbekannte Tools
    return <Tool key={index} {...part} />;
  }
  // ... text parts, etc.
})}
```

**Component selbst:**

```tsx
// components/generative-ui/weather-card.tsx
'use client';

export function WeatherCard({ data }: { data: WeatherData }) {
  // Voller Zugriff auf Tailwind, shadcn/ui, App-State, Hooks
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{data.city}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold">{data.temperature}°</div>
        {/* Interaktive Elemente: Tabs, Hover, Klick-Aktionen */}
      </CardContent>
    </Card>
  );
}
```

#### 3.2b.3 Wann Generative UI vs. Artifacts vs. MCP Apps

| Situation                                         | Verwende                                    |
| ------------------------------------------------- | ------------------------------------------- |
| User fragt "Erstelle mir ein HTML-Dashboard"      | **Artifact** (HTML im Panel)                |
| User fragt "Wie ist das Wetter in Berlin?"        | **Generative UI** (WeatherCard inline)      |
| User nutzt einen Jira-MCP-Server mit Board-UI     | **MCP Apps** (Server liefert UI)            |
| User fragt "Zeig mir meine Sales-Daten als Chart" | **Generative UI** (eigenes Chart-Component) |
| User fragt "Erstelle eine PowerPoint über Q4"     | **Artifact** (File via Anthropic Skills)    |
| User nutzt Analytics-MCP-Server mit Dashboard     | **MCP Apps** (Server liefert Dashboard)     |
| AI braucht Klarheit bevor es weiterarbeitet       | **Generative UI** (AskUser Widget)          |

#### 3.2b.4 Structured User Input (AskUser)

**Beschreibung:** Das Model kann strukturierte Rückfragen als interaktives Widget stellen, statt Fragen als Fließtext zu schreiben. Der User sieht klickbare Optionen, kann aber auch frei antworten. Mehrere Fragen gleichzeitig möglich.

**Warum das wichtig ist:**

- Bessere UX: Klick statt Tippen für Standardantworten
- Weniger Turns: Mehrere Fragen auf einmal statt Ping-Pong
- Kontextuelle Qualität: Model formuliert Fragen und Optionen basierend auf dem bisherigen Kontext
- Freie Antwort immer möglich: Optionen sind Vorschläge, kein Zwang

**Technische Umsetzung:**

Das ist ein AI SDK Tool OHNE `execute` — es pausiert den Stream und wartet auf User-Input.

**Backend — Tool-Definition:**

```typescript
// lib/ai/tools/ask-user.ts
import { tool } from 'ai';
import { z } from 'zod';

export const askUser = tool({
  description: `Stelle dem User strukturierte Rückfragen mit Auswahloptionen.
    Nutze das wenn du Klarheit brauchst bevor du weiterarbeitest.
    Bevorzuge das gegenüber Fließtext-Fragen.
    Stelle max. 3 Fragen auf einmal.
    Formuliere kurze, präzise Optionen.
    Biete 2-4 Optionen pro Frage.`,
  parameters: z.object({
    questions: z.array(z.object({
      question: z.string().describe('Die Frage an den User'),
      type: z.enum(['single_select', 'multi_select', 'free_text'])
        .describe('single_select: eine Option wählen, multi_select: mehrere, free_text: nur Freitext'),
      options: z.array(z.string()).min(2).max(5).optional()
        .describe('Auswahl-Optionen (nicht bei free_text)'),
    })).min(1).max(3),
  }),
  // KEIN execute → Tool wartet auf User-Response via addToolResult
});
```

**Frontend — AskUser Widget:**

```tsx
// components/generative-ui/ask-user.tsx
'use client';
import { useState } from 'react';

interface AskUserProps {
  data: {
    questions: Array<{
      question: string;
      type: 'single_select' | 'multi_select' | 'free_text';
      options?: string[];
    }>;
  };
  toolCallId: string;
  addToolResult: (params: { toolCallId: string; result: unknown }) => void;
}

export function AskUser({ data, toolCallId, addToolResult }: AskUserProps) {
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [freeText, setFreeText] = useState<Record<number, string>>({});

  const handleSubmit = () => {
    const result = data.questions.map((q, i) => ({
      question: q.question,
      answer: freeText[i] || answers[i] || null,
    }));
    addToolResult({ toolCallId, result: { answers: result } });
  };

  return (
    <Card className="my-3 max-w-lg">
      {data.questions.map((q, i) => (
        <div key={i} className="p-4">
          <p className="font-medium mb-2">{q.question}</p>

          {q.options && (
            <div className="flex flex-wrap gap-2 mb-2">
              {q.options.map((opt) => (
                <Button
                  key={opt}
                  variant={answers[i] === opt ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setAnswers(prev => ({ ...prev, [i]: opt }));
                    setFreeText(prev => ({ ...prev, [i]: '' }));
                  }}
                >
                  {opt}
                </Button>
              ))}
            </div>
          )}

          {/* Freitext-Fallback — immer verfügbar */}
          <Input
            placeholder="Oder eigene Antwort eingeben..."
            value={freeText[i] || ''}
            onChange={(e) => {
              setFreeText(prev => ({ ...prev, [i]: e.target.value }));
              setAnswers(prev => ({ ...prev, [i]: undefined }));
            }}
          />
        </div>
      ))}

      <Button onClick={handleSubmit} className="m-4">
        Antworten
      </Button>
    </Card>
  );
}
```

**Integration in ToolRenderer:**

```tsx
// Spezialfall: AskUser braucht toolCallId + addToolResult
if (part.toolName === 'ask_user' && part.state === 'call') {
  return (
    <AskUser
      key={index}
      data={part.args}
      toolCallId={part.toolCallId}
      addToolResult={addToolResult}  // aus useChat
    />
  );
}
```

**Wichtiger Unterschied zu anderen Generative UI Components:**

- Normale Components rendern bei `state === 'result'` (Tool hat Ergebnis)
- AskUser rendert bei `state === 'call'` (Tool wartet auf Input)
- AskUser nutzt `addToolResult` um die Antwort zurückzuschicken
- Danach macht das Model nahtlos weiter

**System Prompt Guidance (in Expert oder global):**

```
Wenn du Klarheit brauchst, nutze das ask_user Tool statt Fließtext-Fragen.
Stelle präzise Fragen mit sinnvollen Optionen.
Kombiniere verwandte Fragen in einem ask_user Aufruf (max. 3).
Biete immer die Möglichkeit einer eigenen Antwort.
Nutze single_select für Entweder-oder, multi_select für Mehrfachauswahl.
```

#### 3.2b.5 Generative UI Components (geplant)

- `AskUser` — Strukturierte Rückfragen mit Auswahl-Optionen (Prio 1)
- `ContentAlternatives` — Umschaltbare Varianten-Tabs (A/B/C) für alternative Inhalte (Prio 1)
- `WeatherCard` — Wetter-Anzeige mit Forecast
- `ChartView` — Recharts-basierte Datenvisualisierung
- `DataTable` — Sortierbare, filterbare Tabelle
- `ConfirmAction` — Bestätigungsdialog für Aktionen
- `LinkPreview` — URL-Preview Card
- `ImageGallery` — Bild-Galerie mit Lightbox
- Weitere nach Bedarf, erweiterbar durch Experts

**Ausblick: Declarative Generative UI**

Aktuell sind alle Generative UI Components statisch (vordefinierte React-Components). Für die Zukunft gibt es einen vierten UI-Ansatz: **Declarative Generative UI** — das Model beschreibt die UI als strukturierten JSON-Spec (Cards, Listen, Formulare), und ein generischer Renderer baut daraus UI. Das erlaubt dem Model, UIs zu erzeugen die nie explizit programmiert wurden.

Relevante Specs/Referenzen für spätere Evaluierung:

- **A2UI** (Google): https://github.com/google/A2UI
- **Open-JSON-UI** (CopilotKit): https://docs.copilotkit.ai/generative-ui/specs/open-json-ui
- **AG-UI Protocol**: https://github.com/ag-ui-protocol/ag-ui
- **CopilotKit Generative UI Guide**: https://www.copilotkit.ai/blog/the-developer-s-guide-to-generative-ui-in-2026

### 3.3 Expertensystem

**Beschreibung:** Experts sind kuratierte Persona-Pakete die festlegen, WIE der AI sich verhält. Ein Expert bringt statisches Fachwissen über Agent Skills mit, ohne dass der User davon weiß.

**Kernkonzept:** Expert = Persona (System Prompt) + Verhalten (Model, Tools, Temperature) + statisches Wissen (Agent Skills). Dynamisches, projektbezogenes Wissen kommt NICHT vom Expert, sondern vom Project (siehe 3.10.1).

#### 3.3.1 Expert-Auswahl

- Bei neuem Chat: Expert-Auswahl als Grid/Carousel (optional — User kann auch ohne Expert starten)
- Innerhalb eines Projects: Default-Expert vom Project, überschreibbar pro Chat
- Expert kann während des Chats gewechselt werden (neuer System Prompt ab nächster Message)
- Kein Expert = "General Assistant" (minimaler System Prompt, alle Skills verfügbar)

#### 3.3.2 Was ein Expert definiert

| Eigenschaft       | Beschreibung                                | Beispiel                                                              |
| ----------------- | ------------------------------------------- | --------------------------------------------------------------------- |
| `systemPrompt`    | Persona + Verhalten + Tonalität             | "Du bist ein erfahrener SEO-Berater. Du antwortest datengetrieben..." |
| `skillSlugs`      | Agent Skills die priorisiert geladen werden | `["seo-analysis", "keyword-research"]`                                |
| `modelPreference` | Bevorzugtes AI Model                        | `"anthropic/claude-opus-4-6"`                                         |
| `temperature`     | Kreativität vs. Präzision                   | `0.3` für Analyst, `0.8` für Kreativ-Schreiber                        |
| `allowedTools`    | Welche Tools aktiv sind                     | Web Search, Code Execution, etc.                                      |
| `mcpServerIds`    | Welche MCP Server verfügbar sind            | Analytics-MCP für den Analyst                                         |

#### 3.3.3 Was ein Expert NICHT ist

- Kein Container für Projektdokumente (→ das ist ein Project)
- Kein Wissens-Silo (→ Agent Skills sind auto-discoverable, auch ohne Expert)
- Keine Pflicht (→ Chat funktioniert ohne Expert)

#### 3.3.4 Beispiel-Experts

- **Code-Assistent:** Coding-Persona, Code-Tools aktiv, Skills: `react-patterns`, `typescript-best-practices`
- **SEO-Berater:** SEO-Persona, Web Search aktiv, Skills: `seo-analysis`, `content-optimization`
- **Analyst:** Daten-Persona, Chart-Tools aktiv, Skills: `data-analysis`, `reporting`
- **Forscher:** Research-Persona, Web Search + Quellen-Zitation, Skills: `deep-research`, `citation`
- **Content-Schreiber:** Schreib-Persona, hohe Temperature, Skills: `copywriting`, `blog-structure`
- **General:** Minimaler System Prompt, keine priorisierten Skills, alle Tools verfügbar

### 3.4 MCP-Anbindung

**Beschreibung:** Integration von MCP-Servern als dynamische Tool-Provider. MCP-Server können zusätzlich UI-Komponenten zurückgeben (MCP Apps Pattern).

#### 3.4.1 MCP-Strategie: Kuratiert → User-managed

**Phase 1 (Launch):** Kuratierte MCP-Server, vom Admin verwaltet.

- Fester Satz von MCP-Servern, die für alle User verfügbar sind
- Credentials werden als Service-Accounts / API Keys einmal konfiguriert
- Zuweisung zu Experts und Projects steuerbar
- Kein User-Level OAuth nötig
- Verbindung via `@ai-sdk/mcp` direkt

**Phase 2 (Später):** User-managed MCP-Server.

- User können eigene MCP-Server-URLs hinzufügen
- User-Level OAuth für personalisierte Integrationen (z.B. "mein Slack", "mein GitHub")
- Erfordert Managed Auth Layer → hier wird ein externer Provider relevant

**Managed MCP Provider für Phase 2 (Links für später):**

| Provider          | Was es macht                                                                                                                                               | Relevanz                                                                                  | URL                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Pipedream MCP** | Gehostete MCP-Server für 2.500+ APIs mit managed OAuth pro User. Endpoint-Pattern: `/:external_user_id/:app`. Übernimmt Token-Storage, Refresh, Isolation. | Stärkstes Argument wenn User eigene Accounts anbinden sollen (Slack, GitHub, Notion etc.) | https://mcp.pipedream.com / https://pipedream.com/docs/connect/mcp              |
| **Composio**      | 800+ Toolkits mit managed Auth. Direkte Vercel AI SDK Integration. Tool-Router (AI wählt dynamisch). Trigger-System (Events von externen Apps).            | Alternative zu Pipedream, weniger APIs aber tiefere Framework-Integration                 | https://docs.composio.dev / https://composio.dev/toolkits                       |
| **Smithery**      | MCP Server Registry (7.000+ Server). Discovery API, Hosting, CLI.                                                                                          | Nützlich als "MCP App Store" wenn User Server selbst entdecken und hinzufügen sollen      | https://smithery.ai / https://smithery.ai/docs/concepts/registry_search_servers |

**Hinweis:** Pipedream hat eine Demo-Chat-App (AI SDK + Neon) die fast identisch zum eigenen Stack ist: https://github.com/PipedreamHQ/mcp-chat

**Phase-1-Einschränkung:** Kuratierte Server funktionieren für Tools die keinen User-spezifischen Zugang brauchen (Search, Analyse, Generierung, externe Daten). Sobald Tools im Namen des Users handeln sollen ("sende in MEINEM Slack"), braucht es User-Level Auth → Phase 2.

#### 3.4.2 MCP Server Datenmodell

```
mcp_servers
├── id (uuid, PK)
├── name (string)
├── description (text?)
├── url (string)                  → MCP Server Endpoint
├── transport (enum: http, sse)
├── authType (enum: none, bearer, oauth)
├── credentials (text?, encrypted) → Service-Account Keys (Phase 1)
├── isActive (boolean)
├── enabledTools (string[]?)      → Tool-Filter (null = alle)
├── supportsApps (boolean)        → Hat UI-Resources (MCP Apps)
├── createdAt (timestamp)
└── updatedAt (timestamp)

# Phase 1: Kein userId → alle Server sind admin-kuratiert, global verfügbar
# Phase 2: userId (uuid?, FK → users) ergänzen → null = global, sonst user-spezifisch
```

#### 3.4.3 MCP Tool Flow

```
1. Chat startet → MCP Clients für aktive Server werden erstellt
2. Tools werden via mcpClient.tools() geladen
3. Tools werden an streamText/generateText übergeben
4. Model entscheidet über Tool-Nutzung
5. Tool-Call wird ausgeführt, Ergebnis zurück an Model
6. AI Elements <Tool> Component rendert Tool-Status
7. Bei needsApproval: AI Elements <Confirmation> Component
```

#### 3.4.3 MCP Apps UI Rendering (SEP-1865)

**Beschreibung:** MCP Apps ist eine offizielle MCP Extension (SEP-1865), die es MCP-Servern erlaubt, interaktive HTML-Interfaces inline im Chat zu rendern. Das Chat-System agiert als "Host" im MCP Apps Sinne.

**Standard:** https://modelcontextprotocol.io/extensions/apps/overview
**SDK:** `@modelcontextprotocol/ext-apps` (Server + App)
**Host-Framework:** `@mcp-ui/client` (React-Komponenten für Host-Implementierung)
**Spec:** https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx

**Wie MCP Apps funktionieren:**

```
1. DISCOVERY: Tool-Registration enthält _meta.ui.resourceUri → "ui://tool-name/app.html"
2. RESOURCE FETCH: Host lädt UI Resource vom MCP Server (HTML, gebundelt mit JS/CSS)
3. SANDBOXED RENDERING: Host rendert HTML in sandboxed iframe im Chat
4. COMMUNICATION: Bidirektionale JSON-RPC Kommunikation über postMessage
5. INTERACTIVE PHASE: App kann Tools aufrufen, Daten empfangen, UI aktualisieren
6. TEARDOWN: Host benachrichtigt App vor dem Entfernen
```

**Lifecycle im Detail:**

```
Host ←→ View (iframe) ←→ MCP Server

1. tools/list Response enthält:
   {
     name: "visualize_data",
     _meta: { ui: { resourceUri: "ui://charts/dashboard" } }
   }

2. Host erkennt UI-Tool, fetcht ui:// Resource → erhält HTML

3. Bei Tool-Call:
   - Host rendert iframe mit HTML
   - View sendet ui/initialize
   - Host antwortet mit Capabilities, Theme, Dimensions
   - Host sendet ui/notifications/tool-input (Streaming-fähig)
   - Host sendet ui/notifications/tool-result

4. Interactive Phase:
   - View → Host: tools/call (App kann MCP Tools aufrufen)
   - View → Host: ui/sendFollowUpMessage
   - View → Host: ui/updateContext
   - Host → View: Aktualisierte Daten

5. Teardown: Host sendet ui/resource-teardown
```

**Host-Implementierung (unser Chat als Host):**

Option A — `@mcp-ui/client` (empfohlen):

- React-Komponenten für MCP Apps Rendering
- Handelt iframe-Lifecycle, postMessage Bridge, Security
- https://mcpui.dev/

Option B — AppBridge aus `@modelcontextprotocol/ext-apps`:

- Lower-Level: Manuelles iframe-Management
- Mehr Kontrolle, mehr Aufwand
- Referenz: `examples/basic-host` im ext-apps Repo

**Security Model:**

- Sandboxed iframe (kein DOM-Zugriff auf Host, keine Cookies, kein localStorage)
- Alle Kommunikation über postMessage (auditierbar)
- CSP via `_meta.ui.csp`: Server deklariert erlaubte externe Domains
- Default: Keine externen Verbindungen erlaubt
- Host kontrolliert, welche Capabilities die App hat

**Tool Visibility:**

- `visibility: ["model", "app"]` — Default: Model UND App können Tool aufrufen
- `visibility: ["app"]` — App-only Tools (Refresh-Buttons, Pagination, UI-Interaktionen)
- `visibility: ["model"]` — Nur für Model (App sieht Tool nicht)

**UI-Integration im Chat:**

- MCP Apps werden inline im Chat gerendert (wie Artifacts)
- Apps können Fullscreen/Expanded/Collapsed sein
- Apps bleiben im Conversation-Flow erhalten
- Apps können Follow-Up Messages im Chat triggern

#### 3.4.5 MCP Server Administration (Phase 1)

- Admin-only Settings-Page für MCP Server Konfiguration
- Manuelles Hinzufügen via URL + Credentials
- Zuweisung zu Experts (welcher Expert nutzt welche MCP-Server)
- Zuweisung zu Projects (welches Project hat Zugriff auf welche Server)
- Health-Check und Connection-Status Anzeige
- Capability-Anzeige: Welche MCP Extensions der Server unterstützt (incl. Apps)
- User sehen MCP-Tools als verfügbare Fähigkeiten ihres Experts, nicht als separate Server

### 3.5 Skills-Architektur

Das Projekt nutzt zwei grundverschiedene Arten von "Skills". Aus User-Sicht sind beide unsichtbar — der User merkt nur, dass der AI kompetent ist.

#### 3.5.1 Agent Skills (lokale Wissenspakete)

**Was:** Markdown-basierte Skill-Dateien (offenes Format, agentskills.io) die dem Agent prozedurales Wissen und Workflows geben. Der Agent erkennt selbst, wann ein Skill relevant ist, und lädt ihn on-demand.

**User-Sichtbarkeit:** Keine. Skills sind ein interner Mechanismus.

**Wie es funktioniert (Progressive Disclosure):**

```
1. DISCOVERY: Beim Chat-Start werden alle verfügbaren Skills gescannt
   → Nur Name + Description in den System Prompt (wenige Tokens)
2. ACTIVATION: Agent erkennt anhand des User-Requests, dass ein Skill passt
   → loadSkill Tool wird aufgerufen → voller SKILL.md Content wird geladen
3. EXECUTION: Agent folgt den Instruktionen im Skill
   → Kann Scripts ausführen, Dateien lesen, Workflows abarbeiten
```

**Skill-Format:**

```
skills/
├── seo-analysis/
│   ├── SKILL.md              # Required: Instruktionen + Metadata
│   ├── scripts/              # Optional: ausführbarer Code
│   └── references/           # Optional: Referenz-Dokumente
├── react-patterns/
│   └── SKILL.md
└── data-analysis/
    ├── SKILL.md
    └── scripts/
        └── chart-templates.py
```

**SKILL.md Aufbau:**

```markdown
---
name: seo-analysis
description: SEO-Analyse-Workflows inkl. Keyword-Research, On-Page-Audit
  und Content-Optimization. Nutze diesen Skill wenn der User SEO-Analysen
  oder Content-Optimierung anfragt.
---

# SEO Analysis

## Wann diesen Skill nutzen
- User fragt nach Keyword-Analyse
- User will Content SEO-optimieren
- User braucht ein On-Page-Audit

## Workflow: Keyword-Analyse
1. Zielgruppe und Thema klären
2. Seed-Keywords identifizieren
...
```

**Zusammenspiel mit Experts:**

- Ein Expert hat `skillSlugs: ["seo-analysis", "content-optimization"]`
- Diese Skills werden beim Chat-Start priorisiert im System Prompt gelistet
- ABER: Auch ohne Expert kann der Agent jeden Skill laden, wenn der Request passt
- Expert priorisiert Skills, sperrt sie aber nicht

**Technische Umsetzung (AI SDK v6):**

```typescript
// 1. loadSkill als Tool definieren
const loadSkillTool = tool({
  description: 'Load a skill to get specialized instructions',
  parameters: z.object({ name: z.string() }),
  execute: async ({ name }) => {
    const skill = availableSkills.find(s => s.name === name);
    const content = await readFile(`${skill.path}/SKILL.md`);
    return { skillDirectory: skill.path, content: stripFrontmatter(content) };
  },
});

// 2. System Prompt enthält Skill-Übersicht
function buildSystemPrompt(expert?: Expert, skills: SkillMetadata[]) {
  let prompt = expert?.systemPrompt ?? 'Du bist ein hilfreicher Assistent.';

  // Expert-Skills priorisiert, dann alle anderen
  const prioritized = expert?.skillSlugs ?? [];
  const sorted = [...skills].sort((a, b) =>
    (prioritized.includes(b.name) ? 1 : 0) - (prioritized.includes(a.name) ? 1 : 0)
  );

  prompt += '\n\n## Verfügbare Skills\n';
  prompt += 'Nutze das loadSkill Tool wenn ein Request von spezialisiertem Wissen profitiert.\n\n';
  prompt += sorted.map(s => `- ${s.name}: ${s.description}`).join('\n');

  return prompt;
}
```

**Referenz:** https://ai-sdk.dev/cookbook/guides/agent-skills / https://agentskills.io/specification

#### 3.5.2 Anthropic Skills API (Dokumenten-Generierung)

**Was:** Remote-Capabilities in Anthropics Cloud-VM für Dokumentengenerierung. Kein lokales Wissen, sondern eine System-Capability die immer verfügbar ist.

**User-Sichtbarkeit:** Indirekt — User sagt "erstelle mir eine PowerPoint" und es funktioniert.

**Abgrenzung:** Agent Skills geben dem AI **Wissen** (wie man etwas tut). Anthropic Skills API gibt dem AI **Fähigkeiten** (Dateien generieren in einer Sandbox).

**Architektur:** Läuft in Anthropics Container-VM, nicht lokal.

- API-Calls gehen direkt an `api.anthropic.com` (nicht über AI Gateway)
- Skills brauchen `code_execution` Tool + `container.skills` Parameter
- Generierte Dateien kommen als `file_id` zurück → Download via Files API
- Heruntergeladene Dateien werden in R2 gespeichert und dem User served

**Verfügbare Anthropic Skills:**

| Skill ID | Beschreibung                        |
| -------- | ----------------------------------- |
| `pptx`   | PowerPoint-Präsentationen           |
| `xlsx`   | Excel-Spreadsheets                  |
| `docx`   | Word-Dokumente                      |
| `pdf`    | PDF-Generierung                     |
| Custom   | Eigene Skills via Skills API Upload |

**Flow:**

```
1. User-Request impliziert Dokument-Generierung
2. Route Handler erkennt Bedarf (Heuristik oder expliziter Trigger)
3. API-Call an Anthropic mit container.skills + code_execution
4. Response enthält file_id
5. Backend lädt Datei via Files API herunter
6. Datei wird in R2 gespeichert
7. Artifact mit type="file" und fileUrl wird erstellt
8. Frontend zeigt File-Preview + Download
```

**Referenz:** https://platform.claude.com/docs/en/build-with-claude/skills-guide

#### 3.5.3 Kontext-Zusammenbau (System Prompt Assembly)

So fließen Expert, Project, und Skills zusammen:

```
System Prompt wird in dieser Reihenfolge assembliert:

┌─────────────────────────────────────────────┐
│ 1. Expert System Prompt (Persona)           │
│    "Du bist ein SEO-Berater. Du fokussierst │
│    auf datengetriebene Empfehlungen..."     │
├─────────────────────────────────────────────┤
│ 2. Agent Skills Übersicht (Discovery)       │
│    "Verfügbare Skills:                      │
│    - seo-analysis: SEO-Analyse-Workflows    │  ← priorisiert (vom Expert)
│    - content-optimization: Content-Opt...   │  ← priorisiert (vom Expert)
│    - react-patterns: React Best Practices   │  ← alle anderen
│    - data-analysis: Datenanalyse..."        │
├─────────────────────────────────────────────┤
│ 3. Project Context (Dynamisches Wissen)     │
│    "## Projektkontext                       │
│    ### Brand Guidelines Kunde X             │
│    [Inhalt des Dokuments]                   │
│    ### Aktuelle Keyword-Recherche           │
│    [Inhalt des Dokuments]"                  │
├─────────────────────────────────────────────┤
│ 4. Zur Laufzeit: Agent lädt Skills on-demand│
│    → loadSkill("seo-analysis")              │
│    → Voller SKILL.md Content wird zum       │
│      Kontext hinzugefügt                    │
└─────────────────────────────────────────────┘

Jede Schicht ist optional. Ein Chat kann auch nur aus
Schicht 2 (Skills) bestehen — kein Expert, kein Project.
```

### 3.6 Websearch

**Beschreibung:** AI kann aktuelle Informationen aus dem Web abrufen.

**Umsetzung als AI SDK Tool:**

```
webSearch Tool:
├── Provider: Tavily (AI-optimiert) oder Exa
├── Integration: AI SDK tool() mit Zod Schema
├── Parameters: query (string), maxResults (number)
├── Response: Array von {title, url, content, score}
└── Rendering: AI Elements <Sources> + <InlineCitation>
```

**Optional:** Anthropic's eingebautes `web_search` Tool verwenden (wenn via Anthropic API direkt, nicht Gateway).

### 3.7 File & Image Uploads

**Beschreibung:** User können Dateien und Bilder hochladen und in den Chat einbinden.

#### 3.7.1 Upload-Flow

```
1. User wählt Datei(en) im UI
2. Client requestet Presigned URL von /api/upload
3. Client uploaded direkt zu R2 (kein Server-Proxy)
4. Upload-Referenz wird als Attachment an Chat-Message angehängt
5. AI SDK sendet File als multimodal Content an Model
```

#### 3.7.2 Unterstützte Formate

| Kategorie | Formate                      |
| --------- | ---------------------------- |
| Bilder    | PNG, JPEG, GIF, WebP, SVG    |
| Dokumente | PDF, DOCX, TXT, MD, CSV      |
| Code      | JS, TS, PY, JSON, YAML, etc. |

#### 3.7.3 UI

- Drag & Drop Zone im Chat-Input
- Paste aus Clipboard (Bilder)
- AI Elements `Attachments` Component
- Preview-Thumbnails vor dem Senden
- Fortschrittsanzeige beim Upload

### 3.8 Business Mode (Datenschutz & Compliance)

**Beschreibung:** Opt-in Datenschutz-Modus für den Einsatz in regulierten Umgebungen (B2B, DSGVO-sensible Daten). Wird schrittweise über mehrere Meilensteine aufgebaut.

**Basis (M5):** Feature-Flag (`NEXT_PUBLIC_BUSINESS_MODE`), Config-Datei (`src/config/business.ts`), File-Privacy-Dialog (Warnung bei Datei-Upload an Cloud-Provider).

**Erweiterung (M7):** Privacy-Routing in Chat-Route — automatische Auswahl von EU-Modellen oder lokalen Modellen wenn Business Mode aktiv.

**Vollausbau (M9):** PII-Detection (Composite-Stack aus Regex + optionalem ML), PII-Check + Redact API-Endpoints, PII-Dialog vor dem Senden (Client), Consent-Logging (DB + API), Audit-Trail.

**Detail-PRD:** `docs/prd-business-mode.md`

### 3.9 Monetarisierung (Credit-System)

**Beschreibung:** Credit-basiertes Abrechnungssystem mit Tier-Modell (free/pro/enterprise). Ermöglicht die Plattform als SaaS zu betreiben.

**Scope (M10):** Credit-System, Tier-Guard (Feature-Gating, Model-Gating, Rate-Limits per Tier), Credit-Berechnung im `onFinish`, Stripe-Integration (Checkout, Webhook, Portal), UI (Credit-Anzeige, Upgrade-Prompts, Billing-Seite).

**Konzept:** `docs/monetization-concept.md`

### 3.10 Chat-Organisation

#### 3.10.1 Projects (MVP — Minimal Viable)

**Kernkonzept:** Ein Project ist ein Arbeitsraum mit Kontext. Es beantwortet die Frage "WORÜBER weiß der AI Bescheid?" — im Gegensatz zum Expert (WIE er sich verhält) und Skills (WAS er prozedural kann).

**MVP-Scope (M6):**

- DB-Schema: `projects` Tabelle (kein `project_documents` — Instruktionen als Text-Feld)
- Name, Beschreibung, Instruktionen (Textfeld, wie Custom Instructions aber pro Projekt)
- Default-Expert-Zuweisung
- Projekt-CRUD API + UI
- Chat-zu-Projekt-Zuordnung (`chats.projectId`)
- Sidebar: Projekt-Sektion mit zugeordneten Chats
- Context-Injection: Projekt-Instruktionen werden in System-Prompt injiziert

**Bewusst verschoben (nach MVP):**

- Dokument-Upload und Text-Extraktion (`project_documents` Tabelle)
- Token-Count-Tracking pro Dokument
- Drag & Drop Sortierung
- RAG / Embedding-basierte Suche
- MCP-Server-Zuweisung pro Projekt

#### 3.10.2 Pinned Chats

- Chats können gepinnt werden (isPinned Toggle)
- Pinned Chats erscheinen im Sidebar oben, separiert von der Chronologie
- Pin-Status ist unabhängig vom Project

#### 3.10.3 Sidebar/Navigation

```
Sidebar:
├── [New Chat] Button
├── Pinned Chats (sortiert nach updatedAt)
├── ─── Trennlinie ───
├── Today
│   ├── Chat A
│   └── Chat B
├── Yesterday
│   └── Chat C
├── Previous 7 Days
│   ├── Chat D
│   └── Chat E
└── Projects
    ├── Project Alpha
    │   ├── Chat F
    │   └── Chat G
    └── Project Beta
        └── Chat H
```

#### 3.10.4 Chat-Titel

- Auto-generiert via AI nach der ersten User-Message
- Editierbar durch User
- Suchbar (Volltextsuche über Chat-Titel und Messages)

---

## 4. Nicht-funktionale Anforderungen

### 4.1 Performance

- Time-to-First-Token: < 500ms (nach API-Call)
- Streaming: Smooth, keine Ruckler
- Page Load: < 2s (mit SSR)
- Sidebar-Navigation: Instant (optimistic UI)

### 4.2 Sicherheit

- Auth via Logto (OIDC, Session-basiert)
- API Routes geschützt via Auth Middleware
- File Uploads: Content-Type Validation, Size Limits (50MB)
- MCP Credentials: Encrypted at Rest
- R2 Presigned URLs: Zeitlich begrenzt (1h)
- Sandboxed iframes für HTML-Artifacts und MCP Apps UI
- CSP Headers für iframe-Isolation

### 4.3 Responsiveness

- Desktop-First, aber mobile-fähig
- Sidebar collapsible auf Mobile
- Chat-Input immer erreichbar
- Artifact-Panel als Sheet/Drawer auf Mobile

---

## 5. Meilensteine

### Meilenstein 1: Foundation ✅ (2026-03-12)

**Status:** Abgeschlossen. Commit `12bc85b`.

**Erledigt:**

- ✅ DB Schema erweitert: `chats`, `messages`, `artifacts`, `usage_logs` in `src/lib/db/schema/`
- ✅ DB Queries: CRUD für chats, messages, usage in `src/lib/db/queries/`
- ✅ Unified Chat API `/api/chat/route.ts` — streaming + DB-Persistenz + Token-Logging + Auto-Titel
- ✅ Chat History API `/api/chats/` — list, get, patch, delete
- ✅ Route-Struktur: `/` (Landing oder Chat je nach Auth) + `/c/[chatId]`
- ✅ Layout: ChatShell, ChatSidebar (Chat-Verlauf), ChatHeader
- ✅ Chat UI: ChatView (useChat + messageMetadata für Navigation), ChatEmptyState
- ✅ Web Tools: web_search + web_fetch via Anthropic Tools
- ✅ Cleanup: alte (app)/ Routes, Assistant-System, Modul-Navigation entfernt
- ✅ CLAUDE.md aktualisiert, Recherche-Pflicht verankert
- ✅ DB-Push auf Neon, E2E-Test bestanden

**Entscheidungen:**

- nanoid (text) statt UUID für Chat-IDs (URL-freundlich: `/c/V1StGXR8_Z`)
- Logto `sub` direkt als `userId` (kein FK zu users-Tabelle in M1)
- `messageMetadata` statt Response-Header für chatId-Übertragung Server→Client

### Meilenstein 2: Chat Features ✅ (2026-03-12)

**Status:** Abgeschlossen. Commits `baf6a2b` (Features), `99cd30e` (UI), `e3bc9a5` (Security Hardening).

**Erledigt — Chat-UX:**

- ✅ Model Registry mit ENV-basierter Konfiguration (`MODELS_CONFIG` JSON, Zod-validiert)
- ✅ ModelSelector UI mit Zweck-Gruppen (allrounder, creative, coding, analysis, fast) und Region-Flags (EU/US)
- ✅ Model-Persistenz pro Chat (PATCH `/api/chats/[chatId]`)
- ✅ Chat-Sidebar: Chronologie-Gruppen (Heute, Gestern, 7 Tage, Älter), Pinned-Section, Client-Suche
- ✅ Chat-Titel Auto-Generation (via `generateText` in `onFinish`)
- ✅ Pinned Chats (Toggle via API, optimistic UI)
- ✅ Custom Instructions Dialog (User-spezifische System-Prompt-Erweiterungen)
- ✅ Spracheingabe (Web Speech API, SpeechButton)
- ✅ Message Metadata Toolbar (Model-Name, Token-Count, Copy, Download als MD)
- ✅ Auto-Scroll mit Scroll-to-Bottom Button (use-stick-to-bottom)
- ✅ `/api/models` GET-Endpoint für Client-seitige Model-Discovery

**Erledigt — Token-Tracking (Credit-System-ready):**

- ✅ `usage_logs` mit allen Token-Typen: input, output, total, reasoning, cachedInput, cacheRead, cacheWrite, stepCount
- ✅ Token-Verbrauch in Message-Metadata (UI-Anzeige per Hover-Toolbar)
- ✅ Anthropic Prompt Caching auf System-Prompt (`cacheControl: { type: "ephemeral" }`)
- ✅ Cache-Metriken (read/write) in `usage_logs` persistiert

**Erledigt — Security Hardening:**

- ✅ CSP: `unsafe-eval` entfernt, unused `react-jsx-parser` Dependency entfernt
- ✅ HSTS Header (63072000s, includeSubDomains, preload)
- ✅ Zod-Validierung für `MODELS_CONFIG` ENV-Parsing mit Fallback
- ✅ userId-Scoping auf allen DB-Mutation-Queries (defense-in-depth)
- ✅ Rate Limiting auf allen API-Endpoints (chat, chats, models, instructions)
- ✅ Input-Validierung: chatId-Format, message-Rollen (user/assistant only), limit/offset Bounds
- ✅ ModelId-Validierung gegen Registry in Chat-Route und PATCH
- ✅ Auth null-Guards in `getUser()`/`getUserFull()`
- ✅ DB-Connection-Caching für Serverless (module-level Singleton)
- ✅ `ensureUserExists()` mit In-Memory-Cache
- ✅ Error/Loading Boundaries (`error.tsx`, `loading.tsx`)
- ✅ Console-Error-Sanitization (keine vollen Error-Objekte)
- ✅ SQL-Level Pagination in `getChatWithMessages`

**Bewusst verschoben (kein Blocker für M2):**

- ⏭️ Context Window UI + Truncation-Strategie → eigenes Feature, ggf. M3 oder später
- ⏭️ Upstash Redis für Rate-Limiting (aktuell In-Memory, ausreichend für Single-User)
- ⏭️ `chats.totalTokens` Spalte (Aggregation aus `usage_logs` reicht)

**Entscheidungen:**

- Model Registry initial via ENV (kein Admin-UI nötig). Ab M5: DB-backed mit ENV-Fallback + Admin-UI
- Kategorien statt Provider als UI-Gruppierung (Nutzer denken in Zweck, nicht Provider)
- In-Memory Rate Limiter akzeptabel für aktuelle Nutzerzahl (Serverless-Limitation dokumentiert)
- `totalUsage` aus AI SDK `onFinish` statt per-Step-Tracking (summiert automatisch über Tool-Call-Steps)

### Meilenstein 3: Artifact System ✅ (2026-03-12)

**Status:** Abgeschlossen. Commits `4f1ab6e` (Features), `e3bc9a5` (Security & Code Quality Hardening).

**Erledigt — Artifact Core:**

- ✅ `create_artifact` Tool-Definition mit Zod-Schema (type, title, content, language) und Size-Limits
- ✅ Tool-basierte Erstellung: Model erstellt Artifacts via Tool-Call, `execute` persistiert in DB
- ✅ Streaming: Tool-Argumente streamen automatisch zum Client via AI SDK 6 typed tool parts
- ✅ Chat-Reload: Gespeicherte `tool-call`/`tool-result` Parts werden zu AI SDK 6 typed parts gemappt
- ✅ Fake-Artifact-Parser für Models ohne Tool-Calling-Support (z.B. Gemini)
- ✅ System-Prompt Artifact-Guidance (wann create_artifact nutzen, wann nicht)
- ✅ maxTokens auf 16384 erhöht für umfangreiche Artifact-Inhalte

**Erledigt — UI & Rendering:**

- ✅ Split-View Layout: Chat 50% | Panel 50% (Desktop), Overlay (Mobile)
- ✅ ArtifactPanel: View/Edit-Toggle, Copy, Download (File + PDF-Druck), Save, Version-Badge
- ✅ ArtifactCard: Inline-Karte im Chat (klickbar, öffnet Panel mit DB-Fetch für aktuelle Version)
- ✅ HTML Artifact Rendering: Sandboxed iframe (`allow-scripts`, kein `allow-same-origin`)
- ✅ Code Artifact: Syntax-Highlighting via Shiki (JavaScript RegExp Engine, CSP-safe)
- ✅ CodePreview-Komponente für Code-Artifacts im View-Mode
- ✅ Markdown Artifact Rendering via Streamdown/MessageResponse
- ✅ ArtifactEditor: CodeMirror mit Dark-Mode-Support (JS/TS/Python/CSS/JSON/HTML/Markdown)
- ✅ HTML Streaming Placeholder während Generierung

**Erledigt — Persistenz & API:**

- ✅ DB Schema: `artifacts`-Tabelle mit notNull auf title/content, Index auf chatId
- ✅ DB Queries: create, getById, getByChatId (mit userId-Scoping via innerJoin), updateContent
- ✅ Artifact API `/api/artifacts/[artifactId]`: GET + PATCH mit Ownership-Check
- ✅ Optimistic Locking: `expectedVersion` Parameter, 409 Conflict bei Version-Mismatch
- ✅ Artifact-Versionierung mit automatischem Version-Bump

**Erledigt — Security & Code Quality Hardening:**

- ✅ CSP Meta-Tag Injection in HTML-Preview iframe (blockiert fetch/XHR/WebSocket)
- ✅ Print-iframe: `srcdoc`-Pattern statt `iframeDoc.write()` (kein `allow-same-origin` nötig)
- ✅ `escapeHtml()` für Titel in Print-HTML (XSS-Prevention)
- ✅ ArtifactErrorBoundary: React Error Boundary um ArtifactPanel (isoliert Shiki/CodeMirror/iframe Crashes)
- ✅ ID-Pattern-Validierung auf API-Endpoints (`/^[a-zA-Z0-9_-]{1,21}$/`)
- ✅ Body-Size-Check auf PATCH (1MB), Content-Limit (500k Zeichen)
- ✅ Defense-in-depth: chatId-Existenz-Check bei Artifact-Erstellung
- ✅ Clipboard writeText in try/catch für insecure Contexts
- ✅ Cleanup: Print-iframes und Copy-Timeouts auf Unmount

**Erledigt — Refactoring:**

- ✅ `useArtifact` Custom Hook extrahiert aus chat-view.tsx (~150 Zeilen)
- ✅ `ChatMessage` Komponente mit `memo()` extrahiert aus chat-view.tsx
- ✅ chat-view.tsx von 577 auf ~210 Zeilen reduziert
- ✅ Type Guards statt `as`-Casts für TypeScript Strict Mode
- ✅ `any[]` durch `unknown[]` ersetzt in artifact-utils.ts

**Entscheidungen:**

- Tool-basierte Artifact-Erstellung statt Content-Detection (explizit, zuverlässig)
- Fake-Artifact-Parser als Fallback für Models ohne Tool-Support (server + client)
- Shiki JavaScript RegExp Engine statt WASM (CSP-kompatibel, kein `unsafe-eval`)
- `srcdoc` statt `iframeDoc.write()` für Print (eliminiert `allow-same-origin` Risiko)
- Optimistic Locking statt pessimistic Locking (bessere UX, einfacher)

### Meilenstein 4: Experts & Agent Skills ✅

**Erledigt — Expert System (M4):**

- ✅ Expert CRUD (DB Schema, Queries, API Routes, Types)
- ✅ Expert-Auswahl UI (Grid bei neuem Chat, toggle/skip)
- ✅ System Prompt Assembly (Expert Persona → Artifacts → Web Tools → Skills → Custom Instructions)
- ✅ Agent Skills Discovery (DB-basiert, 60s TTL-Cache)
- ✅ loadSkill Tool (Factory mit Slug-Validierung gegen Allowlist)
- ✅ Expert-spezifische Skill-Priorisierung (Star-Marker im System-Prompt)
- ✅ Expert-spezifische Model-Präferenzen (Resolution Chain: Quicktask → Expert → User → System)
- ✅ Expert-spezifische Temperature Overrides
- ✅ Built-in Default Experts (6: general, code, seo, analyst, researcher, writer)
- ✅ Idempotentes Seeding (`pnpm db:seed`)
- ✅ ask_user Tool (Generative UI, Stream-Pause-Pattern)

**Erledigt — Quicktask System (M4.5):**

- ✅ Quicktasks als Skills mit `mode: quicktask` (kein eigenes Schema)
- ✅ Dynamisches Formular aus Skill-Fields (text/textarea/select)
- ✅ Template-Rendering (`{{variable | default: "X"}}`)
- ✅ Quicktask API-Endpoint (GET, public-safe)
- ✅ Tabs in ChatEmptyState (Experten/Quicktasks)
- ✅ Model-Resolution: Quicktask modelId > Expert > User > System

**Erledigt — Admin System (M4.5):**

- ✅ Admin-Guard via ADMIN_EMAILS ENV
- ✅ Skills Admin-UI (Tabelle, Aktiv-Toggle, Edit SKILL.md, Import, Delete)
- ✅ Experts Admin-UI (Tabelle, Edit JSON, Import, Delete)
- ✅ Admin API Routes (Skills + Experts: CRUD, Import, Export)
- ✅ Skills DB-Migration (Filesystem → DB, Seed-Script)
- ✅ Cache-Invalidierung nach Admin-Mutations

**Erledigt — Web Search/Fetch (M4.5):**

- ✅ Provider-agnostische Search-Abstraktion (`src/lib/search/`)
- ✅ 4 Provider: Firecrawl, Jina, Tavily, Perplexity
- ✅ Eigene web_search/web_fetch Tools (nicht Anthropic-spezifisch)
- ✅ Content-Truncation (~8000 Tokens)
- ✅ SSRF-Schutz via URL-Validierung

**Erledigt — Security Hardening (M4 Review):**

- ✅ Expert IDOR behoben (Visibility-Check: global oder eigene)
- ✅ gray-matter JS-Engine deaktiviert (keine Code-Execution via Frontmatter)
- ✅ Chat-Schema `.passthrough()` entfernt (explizite Feld-Definitionen)
- ✅ quicktaskData Key-Limit (max 20 Felder)
- ✅ Skill fields Zod-Validierung im Parser
- ✅ Admin ID-Pattern-Validierung auf allen Routes
- ✅ Admin Export Field-Picking (kein userId-Leak)

**Erledigt — Code Quality (M4 Review):**

- ✅ SkillField Typ-Duplikation aufgelöst (Schema → Re-Export)
- ✅ createExpert/createGlobalExpert zusammengeführt
- ✅ Shared Expert Zod-Schemas (`src/lib/validations/expert.ts`)
- ✅ dbRowToParsedSkill Helper (eliminiert Mapping-Duplikation)
- ✅ Quicktask-Cache-Bug behoben (separate Timestamps)
- ✅ Non-null Assertion durch Null-Check ersetzt
- ✅ Admin-UI Error-Handling (try/catch auf allen fetch-Calls)
- ✅ Fehlersprache deutsch, Error-Response-Format konsistent JSON
- ✅ Accessibility (ARIA-Rollen für Tabs, Toggles, Radiogroups)
- ✅ Dead Imports/Code entfernt, Imports sortiert

**Entscheidungen:**

- Expert = Persona + Verhalten, nicht Wissen (Skills sind auto-discoverable)
- Skills DB-basiert statt Filesystem (Admin-Management ohne Deployment)
- Quicktasks als Skill-Subtyp (kein eigenes Schema, `mode: quicktask`)
- ask_user ohne `execute` (Stream-Pause via addToolResult)
- Eigene web_search/web_fetch Tools statt Anthropic Provider-Tools (provider-agnostisch, kein Reload-Bug)
- ModelPicker entfernt, Modell in Einstellungen-Dialog

**Bekannte Einschränkungen (bewusst nicht in M4):**

- `allowedTools` Feld existiert, wird nicht enforced (M7-Scope)
- `mcpServerIds` Feld existiert, wird nicht enforced (M7-Scope)
- ~~Chat-Route hat 15 Responsibilities (~430 Zeilen)~~ → Refactored in M5 (4 Module + Orchestrator)
- In-Memory Rate-Limiter (resets bei Serverless Cold-Start)

### Meilenstein 5: File Upload & Multimodal Chat ✅ (2026-03-14)

**Status:** Abgeschlossen. Commits `9195781` (Features), `6dee5bd` (Refactoring + Security Review).

**Erledigt — File Upload & Multimodal:**

- ✅ Drag & Drop, Clipboard Paste, File Dialog (via AI Elements PromptInput)
- ✅ Attachment-Previews mit Remove-Button (inline im Input)
- ✅ Multimodal Messages: Bilder, PDFs, Office-Dokumente an AI SDK
- ✅ File-Part-Persistenz: data-URLs → R2-Upload in onFinish (Fallback auf inline)
- ✅ Model Capabilities: `vision`/`fileInput` Flags in ModelConfig
- ✅ Drop Zone Overlay (visuelles Drag-Feedback über gesamtem Chat)
- ✅ mapSavedPartsToUI: File-Parts durchreichen für Chat-Reload

**Erledigt — Chat-Route Refactoring:**

- ✅ Chat-Route von 584 auf ~120 Zeilen refactored (Orchestrator-Pattern)
- ✅ `resolve-context.ts` — Chat/Expert/Model/Skills-Auflösung, System-Prompt Assembly
- ✅ `build-messages.ts` — Part-Filtering, convertToModelMessages, Cache Control
- ✅ `build-tools.ts` — Tool-Registry Assembly
- ✅ `persist.ts` — onFinish: R2-Upload, Message Save, Fake-Artifact, Usage Logging, Title Generation

**Erledigt — Model Management via DB:**

- ✅ `models`-Schema (id, modelId, name, provider, categories, region, capabilities, pricing, isActive)
- ✅ DB Queries: CRUD + upsert by modelId
- ✅ `getModels()` async mit 60s TTL-Cache, Fallback-Kette: DB → ENV → FALLBACK_MODELS
- ✅ `getModelById()` sync (Cache/ENV Fallback) für Abwärtskompatibilität
- ✅ Admin-API: `/api/admin/models` (GET/POST), `/api/admin/models/[id]` (GET/PATCH/PUT/DELETE)
- ✅ Admin-Export: `/api/admin/export/models` (GET)
- ✅ Admin-UI: `/admin/models` — Tabelle, Active-Toggle, CodeMirror JSON-Editor, Import
- ✅ Seed: `pnpm db:seed` importiert Models aus `MODELS_CONFIG` ENV
- ✅ Cache-Invalidierung nach Admin-Mutations (`clearModelCache()`)
- ✅ Kategorie-Enum als Single Source of Truth (`modelCategoryEnum` in validations)

**Erledigt — Business Mode Basis:**

- ✅ Feature-Flag `NEXT_PUBLIC_BUSINESS_MODE`
- ✅ Inline Privacy Notice über PromptInput (Amber-Banner, wegklickbar)
- ✅ Zeigt Provider + Region des aktiven Models
- ✅ Visuell zusammenhängend mit Input (gleiche Border-Farbe, rounded-top)

**Erledigt — Security Review:**

- ✅ `persistFilePartsToR2`: MIME-Allowlist, `sanitizeFilename()`, Size-Limit (4MB)
- ✅ MIME-Validierung auf alle Messages (nicht nur letzte)
- ✅ Admin-Model-Route: ID-Pattern-Validierung (`/^[a-zA-Z0-9_-]{1,21}$/`)
- ✅ `messagePartSchema`: Größenlimits auf allen String-Feldern (data 6MB, filename 255, type 100)
- ✅ Admin-POST: Body-Size-Check via `checkBodySize()`
- ✅ API-Errors konsistent deutsch
- ✅ Verwaiste `file-privacy-dialog.tsx` gelöscht

**Entscheidungen:**

- Chat-Route als Orchestrator mit 4 Modulen (statt monolithische Route)
- Model Registry DB-backed mit ENV-Fallback (statt nur ENV)
- `getModelById()` bleibt sync für Abwärtskompatibilität (nutzt Cache)
- Business Mode Privacy Notice als Inline-Banner (nicht als blockierender Dialog)
- Filename-Sanitization in R2-Persist (gleiche Funktion wie regulärer Upload)

**Bekannte Einschränkungen:**

- `allowedTools` und `mcpServerIds` existieren im Schema, werden nicht enforced (M7)
- In-Memory Rate-Limiter (Serverless-Limitation, Upstash Redis für Produktion)

### Meilenstein 6: Projekte (Minimal MVP) ⬜

**Fokus:** Ein Hauptfeature — Projekte als Arbeitsräume mit Text-Instruktionen.

**Scope:**

- DB-Schema: `projects` Tabelle (id, userId, name, description, instructions, defaultExpertId, isArchived, createdAt, updatedAt)
- `chats`-Tabelle erweitern: `projectId` (FK → projects, nullable)
- Projekt-CRUD API (`/api/projects`, `/api/projects/[projectId]`)
- Projekt-UI: Erstellen, Bearbeiten, Archivieren
- Projekt-Instruktionen als Freitext (wie Custom Instructions, aber pro Projekt)
- Context-Injection: Projekt-Instruktionen in System-Prompt (zwischen Skills und Custom Instructions)
- Chat-zu-Projekt-Zuordnung (bei neuem Chat oder nachträglich)
- Sidebar: Projekt-Sektion mit zugeordneten Chats (gruppiert unter Projekt-Name)
- Projekt-Default-Expert: Neuer Chat in Projekt startet automatisch mit zugewiesenem Expert
- Admin: `/admin/projects` für Projekt-Übersicht (optional, low priority)

**Integration mit bestehendem System:**

- `resolve-context.ts`: Projekt-Instruktionen laden wenn `projectId` gesetzt
- `buildSystemPrompt()`: Neuer Layer zwischen Skills und Custom Instructions
- Sidebar: Projekt-Gruppen neben chronologischen Gruppen
- Chat-Header: Projekt-Badge wenn Chat einem Projekt zugeordnet

**Bewusst nicht in M6:**

- Kein Dokument-Upload, kein Token-Counting, kein Drag&Drop-Sorting
- Kein `project_documents` Schema (kommt als Deferred Feature)
- Kein RAG / Embedding-basierte Suche
- Keine Projekt-Templates

### Meilenstein 7: MCP Integration (Phase 1) ⬜

**Fokus:** Ein Hauptfeature — MCP-Server als Tool-Provider.

**Scope:**

- DB-Schema: `mcp_servers` Tabelle (aktuell config-basiert in `src/config/mcp.ts`)
- Admin-UI: Server verwalten, Health-Check
- Chat-Route: MCP-Tools integrieren (`@ai-sdk/mcp`) — Chat-Route ist bereits modular (M5 Refactoring)
- Expert ↔ MCP-Server Zuweisung (`mcpServerIds` Enforcement in `build-tools.ts`)
- `allowedTools` Enforcement in `build-tools.ts`
- Tool-Call UI + Approval Flow
- **Business Mode Erweiterung:** Privacy-Routing (EU-Modell bei aktivem Business Mode) in `resolve-context.ts`

### Meilenstein 8: Memory System ⬜

**Fokus:** Persistenter Memory-Layer über Chat-Sessions hinweg.

**Technologie:** Mem0 (Open Source, Apache 2.0) — Start mit Cloud, späterer Wechsel auf On-Prem möglich.

**Scope (4 Phasen):**

- **Phase 1 — MVP:** Automatische Memory-Extraktion nach Chat (Mem0), Memory-Injektion bei Session-Start (semantische Suche), Memory-Toggle in Settings, Memory-Verwaltung (Liste, Suche, Löschen)
- **Phase 2 — Explizite Tools:** `save_memory` Tool (strukturierte Memories mit Metadaten), `recall_memory` Tool (gezielte Suche mid-session), Memory-Export (DSGVO)
- **Phase 3 — Optimierung:** Deduplizierung, Memory-Konflikte erkennen, Memory-Limits pro User
- **Phase 4 — On-Prem:** Optionaler Wechsel von Mem0 Cloud auf Self-Hosted

**Prompt-Integration:** Memory-Kontext als neuer Layer 5 im System-Prompt (nach Skills, vor Custom Instructions).

**Detail-PRD:** `docs/prd-memory-system.md`

### Meilenstein 9: Business Mode (Vollausbau) ⬜

**Fokus:** Datenschutz und Compliance.

**Scope:**

- PII-Detection-Modul (Composite-Stack: Regex + optional ML)
- PII-Check + Redact API-Endpoints
- PII-Dialog vor dem Senden (Client)
- Consent-Logging (DB + API)
- Audit-Trail komplett
- Integration aller Business-Mode-Teile aus M5/M7

**Detail-PRD:** `docs/prd-business-mode.md`

### Meilenstein 10: Monetarisierung ⬜

**Fokus:** Credit-System und Stripe-Integration.

**Scope:**

- Credit-System + Tier-Modell (free/pro/enterprise)
- DB: `users` erweitern (tier, credits), `credit_transactions` Tabelle
- Tier-Guard (Feature-Gating, Model-Gating, Rate-Limits per Tier)
- Credit-Berechnung + Deduktion im `onFinish`
- Stripe-Integration (Checkout, Webhook, Portal)
- UI: Credit-Anzeige, Upgrade-Prompts, Billing-Seite

**Konzept:** `docs/monetization-concept.md`

### Ausblick: Verschobene Features (kein Meilenstein zugeordnet)

Folgende Features wurden bewusst aus der aktuellen Roadmap herausgenommen. Sie können als eigenständige Meilensteine oder als Ergänzungen zu bestehenden Meilensteinen später aufgenommen werden.

| Feature                   | Beschreibung                                               | Abhängigkeit       |
| ------------------------- | ---------------------------------------------------------- | ------------------ |
| Anthropic Skills API      | PPTX/XLSX/DOCX-Generierung via Anthropic Container-VM      | R2 Storage         |
| MCP Apps (SEP-1865)       | UI-Rendering von externen MCP-Servern via `@mcp-ui/client` | M7 MCP Integration |
| Managed MCP (Phase 2)     | User-OAuth via Pipedream/Composio, User-eigene Server      | M7 MCP Integration |
| Volltextsuche über Chats  | Suche in Chat-Inhalten, nicht nur Titeln                   | -                  |
| Keyboard Shortcuts        | Globale und kontextuelle Tastenkürzel                      | -                  |
| RAG / Embedding-Suche     | Semantische Suche über Projekt-Dokumente                   | M6 Projekte        |
| Project Documents         | Dokument-Upload mit Text-Extraktion und Token-Counting     | M6 Projekte        |
| Declarative Generative UI | Model beschreibt UI als JSON-Spec (A2UI, Open-JSON-UI)     | -                  |

---

## 6. Referenz-Dokumentation

| Ressource                               | URL                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| AI SDK Docs (Full)                      | `https://ai-sdk.dev/llms.txt`                                                |
| AI SDK v6 Blog                          | `https://vercel.com/blog/ai-sdk-6`                                           |
| AI Elements Docs                        | `https://ai-sdk.dev/elements`                                                |
| AI Elements GitHub                      | `https://github.com/vercel/ai-elements`                                      |
| AI Gateway Docs                         | `https://vercel.com/docs/ai-gateway`                                         |
| Streamdown Docs                         | `https://streamdown.ai/`                                                     |
| Streamdown GitHub                       | `https://github.com/vercel/streamdown`                                       |
| MCP in AI SDK                           | `https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools`                              |
| MCP Apps Extension (Standard)           | `https://modelcontextprotocol.io/extensions/apps/overview`                   |
| MCP Apps SDK + API Docs                 | `https://apps.extensions.modelcontextprotocol.io`                            |
| MCP Apps Repo + Examples                | `https://github.com/modelcontextprotocol/ext-apps`                           |
| MCP-UI Client (Host-Framework)          | `https://mcpui.dev/`                                                         |
| Anthropic Skills Overview               | `https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview` |
| Anthropic Skills API                    | `https://platform.claude.com/docs/en/build-with-claude/skills-guide`         |
| Anthropic Skills Cookbook               | `https://github.com/anthropics/claude-cookbooks/blob/main/skills/README.md`  |
| Anthropic Skills Repo                   | `https://github.com/anthropics/skills`                                       |
| Agent Skills (AI SDK Guide)             | `https://ai-sdk.dev/cookbook/guides/agent-skills`                            |
| Agent Skills Spec                       | `https://agentskills.io/specification`                                       |
| Agent Skills Community                  | `https://skills.sh`                                                          |
| Neon Docs                               | `https://neon.com/docs/llms.txt`                                             |
| Neon AI Rules                           | `https://neon.com/docs/ai/ai-rules.md`                                       |
| Logto Next.js App Router                | `https://docs.logto.io/quick-starts/next-app-router`                         |
| Cloudflare R2 Docs                      | `https://developers.cloudflare.com/r2/`                                      |
| OpenChat Template (Referenz)            | `https://vercel.com/blog/introducing-openchat`                               |
| Vercel Academy AI SDK                   | `https://vercel.com/academy/ai-sdk`                                          |
| **Managed MCP Provider (Phase 2)**      |                                                                              |
| Pipedream MCP Docs                      | `https://pipedream.com/docs/connect/mcp`                                     |
| Pipedream MCP Portal                    | `https://mcp.pipedream.com`                                                  |
| Pipedream MCP Chat Demo (AI SDK + Neon) | `https://github.com/PipedreamHQ/mcp-chat`                                    |
| Composio Docs                           | `https://docs.composio.dev`                                                  |
| Composio Toolkits                       | `https://composio.dev/toolkits`                                              |
| Composio AI SDK Integration             | `https://docs.composio.dev/docs/providers/vercel`                            |
| Smithery Registry                       | `https://smithery.ai`                                                        |
| Smithery Registry API                   | `https://smithery.ai/docs/concepts/registry_search_servers`                  |

---

## 7. Explore Later (nicht Teil des aktuellen Stacks)

Frameworks und Tools die evaluiert wurden und für zukünftige Erweiterungen oder separate Projekte relevant sein könnten.

| Tool                        | Was es macht                                                                                                                                                                                  | Wann relevant                                                                                                                             | URL                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **CopilotKit**              | Frontend-Orchestrierung für Agents: Generative UI Hooks, MCP Apps Middleware (AG-UI), Declarative UI (A2UI/Open-JSON-UI). Komplementär zu AI Elements (die UI-Komponenten), nicht alternativ. | Wenn Declarative Generative UI oder AG-UI Sync-Protokoll gebraucht wird. Auch als MCP Apps Host-Alternative zu `@mcp-ui/client`.          | https://docs.copilotkit.ai / https://www.copilotkit.ai/mcp-apps |
| **CopilotKit + Mastra**     | CopilotKit-Frontend + Mastra-Backend als Kombination. Mastra liefert Agent-Logik (Workflows, Memory, RAG, Evals), CopilotKit das Frontend. Nahtlose Integration dokumentiert.                 | Für Projekte wo der Agent die Hauptsache ist (Automations-Agents, Backend-Pipelines, interne Tools) und weniger custom UI gebraucht wird. | https://mastra.ai / https://mastra.ai/blog/changelog-2025-11-14 |
| **Mastra (standalone)**     | TypeScript AI Framework über AI SDK. Agents, durable Workflows (suspend/resume), Observational Memory, RAG, Evals, MCP Server Authoring, Playground. Von den Gatsby-Gründern, YC-backed.      | Für Agent-first Projekte. Besonders interessant: Observational Memory Pattern als Konzept für langfristige Chat-Memory.                   | https://mastra.ai/docs                                          |
| **ai-sdk-tools (Cache)**    | `createCached()` Wrapper für AI SDK Tools. LRU oder Redis (Upstash). Zero-Config.                                                                                                             | Wenn Tool-Calls sich wiederholen und Kosten/Latenz relevant werden. Triviale Integration.                                                 | https://ai-sdk-tools.dev/cache                                  |
| **ai-sdk-tools (Devtools)** | React-Query-style Devtools Panel für AI SDK. Tool-Calls, State, Metrics, Errors. Dev-only, tree-shaked in Production.                                                                         | Prüfen gegen Vercel's offizielles AI SDK DevTools Feature (v6).                                                                           | https://ai-sdk-tools.dev/devtools                               |
