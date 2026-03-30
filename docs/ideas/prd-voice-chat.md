/p# PRD: Voice Chat

> Echtzeit-Sprachkonversation mit Experten und Projekten ueber die Gemini Live API.
> **Status:** Entwurf
> **Prioritaet:** Hoch
> **Stand:** 2026-03-28

---

## 1. Kontext und Ziel

### Problem

Die Plattform bietet heute Text-Chat mit optionalem TTS (Vorlesen) und STT (Spracheingabe per Web Speech API). Diese Features sind **disconnected**: Der User spricht, der Text wird transkribiert und abgeschickt, die AI antwortet schriftlich, optional wird vorgelesen. Das fuehlt sich nicht wie ein Gespraech an. Jeder Schritt hat Latenz und Medienbrueche.

### Loesung

Ein **Voice Chat Mode**, der den Text-Chat um eine Echtzeit-Sprachkonversation ergaenzt. Der User drueckt einen Button, spricht, und der Experte antwortet sofort mit Stimme. Bidirektional, unterbrechbar, mit Live-Transkription. Basiert auf der **Gemini Live API** (`gemini-3.1-flash-live-preview`).

Zwei Modi:

- **Talk to Experts**: Jeder Expert bekommt eine eigene Stimme und spricht mit seiner Persona
- **Talk to Projects**: Projekt-Kontext (Instructions + Dokumente) fliesst in die Voice-Session ein. Der User kann sein Projekt besprechen, Fragen stellen, Ideen diskutieren

### Warum jetzt

- **Gemini Live API** ist seit Maerz 2026 als Preview verfuegbar
- `@google/genai` SDK bereits im Projekt (TTS, Image Gen, Deep Research)
- `GOOGLE_GENERATIVE_AI_API_KEY` bereits konfiguriert
- 8 Stimmen bereits fuer TTS definiert und getestet
- **Ephemeral Token Pattern** erlaubt direkte Client-zu-Gemini WebSocket-Verbindung. Kein Server-seitiger WebSocket noetig. Kompatibel mit Vercel Serverless

---

## 2. User Experience

### Ablauf: Talk to Experts

```
1. User oeffnet Chat mit einem Experten
   → Expert-Card zeigt "Voice Chat verfuegbar" Indikator

2. User drueckt Voice-Chat-Button (neben bestehendem Text-Input)
   → Browser fragt Mikrofon-Berechtigung (einmalig)
   → Verbindung wird aufgebaut (~1-2s)

3. Voice-Session ist aktiv
   → Overlay erscheint mit Expert-Name, Visualizer, Transcript
   → User spricht frei, Expert antwortet sofort mit Stimme
   → Barge-in: User kann jederzeit unterbrechen
   → Live-Transkription zeigt was gesagt wird

4. User beendet Session (Disconnect-Button)
   → Transcript wird als Messages im Chat gespeichert
   → Chat-History zeigt das Gespraech mit Voice-Indikator
   → Credits werden abgezogen
   → Memory-Extraktion laeuft (fire-and-forget)
```

### Ablauf: Talk to Projects

```
1. User oeffnet Chat innerhalb eines Projekts
   → Projekt-Kontext (Instructions + Dokumente) ist geladen

2. User startet Voice Chat
   → Expert-Persona + Projekt-Kontext fliessen in die Session
   → "Du arbeitest am Projekt '{Projektname}'. {Projekt-Instructions}..."

3. Gespraech mit Projekt-Kontext
   → "Was waren nochmal die Kernpunkte aus dem Briefing?"
   → "Lass uns die Strategie fuer den naechsten Monat besprechen"
   → "Ich hab eine neue Idee zum Projekt, hoer zu..."

4. Session-Ende
   → Wie bei Talk to Experts (Persistenz, Credits, Memory)
```

### Vergleich: Bestehend vs. Voice Chat

| Kriterium      | Text + TTS/STT                                             | Voice Chat                                        |
| -------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| Latenz         | Hoch (tippen/transkribieren → senden → antwort → vorlesen) | Niedrig (~500ms Response)                         |
| Natuerlichkeit | Medienbrueche, mechanisch                                  | Fliessende Konversation                           |
| Unterbrechung  | Nicht moeglich                                             | Barge-in jederzeit                                |
| Haende frei    | Nur STT-Phase                                              | Gesamte Session                                   |
| Transkript     | Nur User-Input (STT)                                       | Beide Seiten, automatisch                         |
| Ideal fuer     | Praezise Instruktionen, Code, strukturierte Aufgaben       | Brainstorming, Diskussion, Coaching, Erklaerungen |

### Beispiel-Szenarien

- **Coaching-Session:** "Erklaer mir nochmal den Unterschied zwischen Jobs-to-be-Done und User Stories, und gib mir ein Beispiel aus meinem Projekt"
- **Brainstorming:** "Lass uns ueber die Content-Strategie fuer Q3 nachdenken. Ich fang an, du ergaenzt..."
- **Projekt-Review:** "Geh mal die Projekt-Dokumente durch und fass mir die drei wichtigsten Punkte zusammen"
- **Lerngespraech:** "Ich will verstehen wie Transformer-Architektur funktioniert. Erklaer es mir Schritt fuer Schritt"

---

## 3. Architektur

### Ueberblick

Voice Chat laeuft **parallel** zum bestehenden Text-Chat, nicht als Ersatz. Der Text-Chat (`useChat` + `streamText` via `/api/chat`) bleibt primaerer Modus. Voice Chat ist ein Opt-in-Modus mit separatem Kommunikationspfad.

```
Bestehender Text-Chat:
  Client ←SSE→ /api/chat (Next.js) ←HTTP→ AI Gateway/Provider

Voice Chat (neu):
  Client ←WSS→ Gemini Live API (direkt, via Ephemeral Token)
  Client ←HTTP→ /api/voice-chat/token     (Token-Generierung)
  Client ←HTTP→ /api/voice-chat/persist    (Post-Session Speicherung)
```

### Warum Ephemeral Tokens

Der Client verbindet **direkt** mit Gemini via WebSocket. Der Next.js Server generiert nur ein kurzlebiges Token und speichert nach Session-Ende. Vorteile:

- **Minimale Latenz** — kein Proxy-Layer zwischen User und Gemini
- **Vercel-kompatibel** — kein langlebiger WebSocket auf dem Server noetig
- **Sicher** — API Key bleibt server-seitig, Token ist kurzlebig (30 Min) und einmal verwendbar
- **Skalierbar** — Server-Load ist minimal (zwei kurze HTTP-Requests pro Session)

### Audio-Pipeline

```
Mikrofon (Browser)
  → getUserMedia() → AudioWorklet
  → PCM 16kHz 16-bit Mono → Base64
  → WebSocket → Gemini Live API

Gemini Live API
  → PCM 24kHz 16-bit Mono → Base64
  → WebSocket → AudioContext
  → Speaker (Browser)
```

### Datenfluss einer Session

```
1. Client: POST /api/voice-chat/token
   Body: { expertId, chatId, projectId? }
   Response: { token, expiresAt, voice }
      │
      │  Server: requireAuth() → Feature-Check → Credit-Check
      │          → Expert aufloesen → Projekt aufloesen
      │          → System-Prompt bauen → Ephemeral Token generieren
      │
2. Client: WebSocket connect zu Gemini (mit Token)
      │
      │  Setup-Message: model, voice, system instruction,
      │                 responseModalities, transcription config
      │
3. Bidirektionale Audio-Streaming-Session
      │
      │  Client → Gemini: realtimeInput.audio (PCM chunks)
      │  Gemini → Client: serverContent.modelTurn.parts (Audio + Text)
      │  Gemini → Client: inputTranscription / outputTranscription
      │  Client kann unterbrechen (Barge-in)
      │
4. Client: POST /api/voice-chat/persist
   Body: { chatId, transcript[], durationSeconds }
      │
      │  Server: Messages speichern → Usage loggen
      │          → Credits abziehen → Memory extrahieren
      │          → Title generieren (fire-and-forget)
```

---

## 4. Implementierung

### 4.1 Feature Flag

**Datei:** `src/config/features.ts`

```typescript
voiceChat: {
  enabled: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
    && process.env.VOICE_CHAT_ENABLED === "true",
},
```

Doppelte Bedingung: Google API Key vorhanden UND explizites Opt-in. Voice Chat erzeugt laufende Kosten (minutenbasiert), daher kein Auto-Enable.

**ENV-Variablen:**

| Variable                        | Required | Default | Beschreibung                                      |
| ------------------------------- | -------- | ------- | ------------------------------------------------- |
| `GOOGLE_GENERATIVE_AI_API_KEY`  | Ja       | -       | Bereits vorhanden (TTS, Image Gen, Deep Research) |
| `VOICE_CHAT_ENABLED`            | Ja       | -       | Explizites Opt-in                                 |
| `VOICE_CHAT_CREDITS_PER_MINUTE` | Nein     | `5000`  | Credits pro Minute Voice Chat                     |
| `VOICE_CHAT_MAX_DURATION`       | Nein     | `1800`  | Max Session-Dauer in Sekunden (Default: 30 Min)   |

---

### 4.2 Expert Voice Preference

**Datei:** `src/lib/db/schema/experts.ts`

Neue optionale Spalte:

```typescript
voicePreference: text("voice_preference"),  // nullable
```

Mapped auf die 8 Gemini Voices:

| Voice  | Charakter                          | Default fuer     |
| ------ | ---------------------------------- | ---------------- |
| Kore   | Weiblich, klar, professionell      | Fallback-Default |
| Puck   | Maennlich, freundlich, energetisch | -                |
| Charon | Maennlich, ruhig, tiefgruendig     | -                |
| Zephyr | Weiblich, warm, zugaenglich        | -                |
| Aoede  | Weiblich, ausducksstark, lebendig  | -                |
| Fenrir | Maennlich, kraftvoll, bestimmt     | -                |
| Leda   | Weiblich, sanft, beruhigend        | -                |
| Orus   | Maennlich, neutral, sachlich       | -                |

Die Admin-UI (`ExpertForm`) bekommt ein Dropdown fuer die Voice-Auswahl. Falls kein Voice gesetzt: Fallback auf "Kore".

**Migration:** `pnpm db:generate` + `pnpm db:push`

---

### 4.3 Token Endpoint

**Neue Datei:** `src/app/api/voice-chat/token/route.ts`

```
POST /api/voice-chat/token
Body: { expertId?: string, chatId?: string, projectId?: string }
Response: { token: string, expiresAt: string, voice: string, chatId: string }
```

**Ablauf:**

1. `requireAuth()` — Authentifizierung pruefen
2. Feature-Check — `features.voiceChat.enabled`
3. Rate-Limit — neues Preset `voiceChat: 10/min`
4. Credit-Balance pruefen — Minimum fuer 1 Minute vorhanden?
5. Expert aufloesen:
   - Expliziter `expertId` aus Request
   - Oder Projekt-Default-Expert (`project.defaultExpertId`)
   - Oder Platform-Default
6. Projekt aufloesen (wenn `projectId` oder Chat gehoert zu Projekt):
   - `getProjectById()` — Ownership pruefen
   - `getProjectDocumentsForPrompt()` — Dokumente laden
7. System-Prompt bauen — `buildSystemPrompt()` mit Expert + Projekt-Kontext
8. Ephemeral Token generieren via `@google/genai` SDK
9. ChatId erstellen (wenn neuer Chat) oder validieren (wenn bestehend)
10. Token + Metadata zurueckgeben

**Token-Generierung:**

```typescript
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })

const token = await ai.authTokens.create({
  config: {
    uses: 1,
    expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    httpOptions: { apiVersion: "v1alpha" },
  },
})
```

**Session-Setup (Client-seitig, mit Token):**

```typescript
const ws = new WebSocket(
  `wss://generativelanguage.googleapis.com/ws/...?access_token=${token}`
)

ws.send(JSON.stringify({
  setup: {
    model: "models/gemini-3.1-flash-live-preview",
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
    systemInstruction: { parts: [{ text: systemPrompt }] },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    realtimeInputConfig: {
      automaticActivityDetection: {
        disabled: false,
        silenceDurationMs: 2000,
        prefixPaddingMs: 500,
      },
    },
  },
}))
```

---

### 4.4 Persist Endpoint

**Neue Datei:** `src/app/api/voice-chat/persist/route.ts`

```
POST /api/voice-chat/persist
Body: {
  chatId: string,
  transcript: Array<{ role: "user" | "assistant", text: string, timestamp: number }>,
  durationSeconds: number,
  expertId?: string,
  projectId?: string,
}
Response: { success: true, creditsDeducted: number }
```

**Ablauf:**

1. `requireAuth()` + Chat-Ownership pruefen
2. Transcript als Messages speichern:
   - User-Turns → `role: "user"`, `parts: [{ type: "text", text }]`
   - Assistant-Turns → `role: "assistant"`, `parts: [{ type: "text", text }]`
   - Metadata auf allen Messages: `{ source: "voice-chat" }`
3. Usage in `usage_logs` protokollieren (Duration-basiert)
4. Credits abziehen: `calculateVoiceChatCredits(durationSeconds)`
5. Memory-Extraktion (fire-and-forget, Pattern aus `persist.ts`)
6. Title-Generierung fuer neuen Chat (fire-and-forget)

---

### 4.5 Credits

**Datei:** `src/lib/credits.ts`

```typescript
const VOICE_CHAT_CREDITS_PER_MINUTE = parseInt(
  process.env.VOICE_CHAT_CREDITS_PER_MINUTE ?? "5000", 10
)

export function calculateVoiceChatCredits(durationSeconds: number): number {
  return Math.max(1, Math.ceil((durationSeconds / 60) * VOICE_CHAT_CREDITS_PER_MINUTE))
}
```

### Kosten-Kalkulation

| Typ                      | Google-Kosten (geschaetzt) | Credits (Default) |
| ------------------------ | -------------------------- | ----------------- |
| 5-Minuten-Gespraech      | ~$0.04                     | 25.000            |
| 15-Minuten-Session       | ~$0.12                     | 75.000            |
| 30-Minuten-Session (Max) | ~$0.25                     | 150.000           |

Gemini Live API wird nach Audio-Dauer abgerechnet. Deutlich guenstiger als Deep Research.

---

### 4.6 System-Prompt fuer Voice Sessions

**Datei:** `src/config/prompts.ts`

Zusaetzliche Instruktion wenn Session-Typ "voice" ist:

```markdown
## Voice-Session Hinweise
Du befindest dich in einer Echtzeit-Sprachkonversation.
- Antworte natuerlich und gesprochem, nicht schriftlich
- Halte Antworten kurz und praegnant (2-3 Saetze pro Turn)
- Nutze keine Markdown-Formatierung, Aufzaehlungen oder Code-Bloecke
- Fasse lange Informationen muendlich zusammen statt aufzulisten
- Bei komplexen Themen: lieber in Dialog-Schritten erklaeren
- Wenn der User unterbricht (Barge-in), stoppe sofort und hoere zu
```

Projekt-Kontext wird wie im Text-Chat angehaengt:

```markdown
## Projekt-Kontext
{project.instructions}

## Projekt-Dokumente
### {document.title}
{document.content}
```

---

## 5. UI-Komponenten

### 5.1 Voice Chat Button

**Neue Datei:** `src/components/chat/voice-chat-button.tsx`

Platzierung: Im PromptInput-Bereich, neben dem bestehenden SpeechButton. Wird nur angezeigt wenn `features.voiceChat.enabled`.

**States:**

| State         | Darstellung                                      |
| ------------- | ------------------------------------------------ |
| `idle`        | Mikrofon-Icon mit "Live"-Badge                   |
| `connecting`  | Pulsierender Kreis, "Verbinde..."                |
| `error`       | Rot, Fehlermeldung als Tooltip                   |
| `unavailable` | Grau, deaktiviert (kein Mikrofon, keine Credits) |

### 5.2 Voice Chat Overlay

**Neue Datei:** `src/components/chat/voice-chat-overlay.tsx`

Erscheint ueber dem Chat-Bereich waehrend einer aktiven Voice-Session.

**Layout (Desktop):**

```
┌─────────────────────────────────────────────┐
│                                             │
│        ┌──────────────────────┐             │
│        │   Expert-Avatar      │             │
│        │   "Strategie-Berater"│             │
│        │                      │             │
│        │   ◉ Voice Active     │             │
│        │   ≋≋≋≋≋≋≋≋≋≋≋≋≋     │  ← Waveform│
│        │                      │             │
│        │   05:23              │  ← Timer    │
│        └──────────────────────┘             │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ Du: "Wie sieht die Strategie fuer  │    │
│  │ Q3 aus?"                            │    │
│  │                                     │    │
│  │ Expert: "Basierend auf den Projekt- │    │
│  │ dokumenten sehe ich drei Schwer-    │    │
│  │ punkte..."                          │    │
│  └─────────────────────────────────────┘    │
│          Live-Transcript (scrolling)        │
│                                             │
│     [🔇 Mute]    [⏹ Beenden]              │
│                                             │
└─────────────────────────────────────────────┘
```

**Layout (Mobile):** Vollbild-Overlay mit gleichen Elementen, kompakter.

**Elemente:**

- **Expert-Info:** Name, Avatar, Voice-Indikator
- **Waveform/Visualizer:** CSS-Animation basierend auf Audio-Level (kein Canvas noetig)
- **Timer:** Session-Dauer (mit Warnung bei Annaeherung an Max-Duration)
- **Live-Transcript:** Echtzeit-Anzeige der Input/Output-Transkription, scrollend
- **Controls:** Mute/Unmute Toggle, Session beenden
- **Projekt-Badge:** Wenn in Projekt-Kontext, Projekt-Name anzeigen

### 5.3 Voice Chat Hook

**Neue Datei:** `src/hooks/use-voice-chat.ts`

State Machine:

```
idle → connecting → connected ←→ speaking/listening → disconnected
                        ↓
                      error
```

**Exposed Interface:**

```typescript
interface UseVoiceChatReturn {
  state: "idle" | "connecting" | "connected" | "speaking" | "listening" | "error" | "disconnected"
  connect: (params: { expertId?: string, chatId?: string, projectId?: string }) => Promise<void>
  disconnect: () => void
  mute: () => void
  unmute: () => void
  isMuted: boolean
  duration: number          // Sekunden seit Session-Start
  transcript: TranscriptEntry[]
  error: string | null
}

interface TranscriptEntry {
  role: "user" | "assistant"
  text: string
  timestamp: number
  finished: boolean         // Transkription abgeschlossen?
}
```

**Interne Verantwortlichkeiten:**

- Audio-Capture via `getUserMedia()` + AudioWorklet (Resampling auf 16kHz PCM)
- Audio-Playback via AudioContext (24kHz PCM → Speaker)
- WebSocket-Management (connect, send, receive, close)
- Transcript-Akkumulation aus `inputTranscription` / `outputTranscription` Events
- Barge-in Handling (Output-Audio stoppen bei `serverContent.interrupted`)
- Duration Tracking (Interval-basiert)
- Cleanup bei Disconnect (MediaStream stoppen, AudioContext schliessen, WebSocket schliessen)
- Persist-Call nach Session-Ende

### 5.4 Chat-History Integration

**Datei:** `src/components/chat/message-response.tsx` (oder zustaendige Rendering-Stelle)

Messages mit `metadata.source === "voice-chat"` bekommen einen visuellen Indikator:

- Kleines Mikrofon-Icon neben dem Timestamp
- Optionaler Hinweis: "Voice Chat Session" als Trennlinie vor dem ersten Voice-Message-Block

### 5.5 Expert-Card Voice-Indikator

**Datei:** `src/components/chat/expert-card.tsx`

Wenn Voice Chat aktiviert und Expert eine Voice hat:

- Kleines Lautsprecher-Icon oder "Voice"-Badge auf der Expert-Card
- Tooltip: "Voice Chat verfuegbar"

---

## 6. Dateien-Uebersicht

### Neue Dateien

| Datei                                           | Beschreibung                                        |
| ----------------------------------------------- | --------------------------------------------------- |
| `src/app/api/voice-chat/token/route.ts`         | Ephemeral Token Generierung                         |
| `src/app/api/voice-chat/persist/route.ts`       | Post-Session Speicherung                            |
| `src/lib/ai/voice-chat.ts`                      | Server-Side Utilities (Token-Config, Voice-Mapping) |
| `src/hooks/use-voice-chat.ts`                   | Core Client Hook (WebSocket + Audio Pipeline)       |
| `src/components/chat/voice-chat-button.tsx`     | Trigger-Button im PromptInput                       |
| `src/components/chat/voice-chat-overlay.tsx`    | Session-Overlay UI                                  |
| `src/components/chat/voice-chat-transcript.tsx` | Echtzeit-Transcript Anzeige                         |

### Zu aendernde Dateien

| Datei                                  | Aenderung                                |
| -------------------------------------- | ---------------------------------------- |
| `src/config/features.ts`               | Feature Flag `voiceChat`                 |
| `src/lib/credits.ts`                   | `calculateVoiceChatCredits()`            |
| `src/lib/rate-limit.ts`                | Rate Limit Preset `voiceChat`            |
| `src/lib/db/schema/experts.ts`         | `voicePreference` Spalte                 |
| `src/components/chat/chat-view.tsx`    | Hook + UI Integration                    |
| `src/components/chat/prompt-input.tsx` | Voice Chat Button einbinden              |
| `src/app/api/chat/persist.ts`          | Memory-Extraktion exportieren fuer Reuse |
| `src/app/admin/experts/`               | Voice-Dropdown in Expert-Admin           |
| `.env.example`                         | Neue ENV-Variablen                       |

---

## 7. Fehlerbehandlung

| Szenario                         | Verhalten                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Kein Mikrofon verfuegbar         | Button deaktiviert, Tooltip: "Mikrofon nicht verfuegbar"                                                                              |
| Mikrofon-Berechtigung verweigert | Fehlermeldung mit Anleitung zur Browser-Einstellung                                                                                   |
| Token-Generierung fehlgeschlagen | Toast: "Voice Chat konnte nicht gestartet werden"                                                                                     |
| WebSocket-Verbindung bricht ab   | Overlay zeigt "Verbindung verloren". Option: "Erneut verbinden" oder "Beenden". Bisheriges Transcript wird gespeichert                |
| Credits reichen nicht            | Button deaktiviert, Tooltip: "Nicht genuegend Credits"                                                                                |
| Max-Duration erreicht            | 2 Minuten vorher: Warnung im Overlay. Bei Erreichen: Session wird automatisch beendet und gespeichert                                 |
| Browser-Tab wird geschlossen     | Session endet. Transcript bis dahin geht verloren (kein Persist-Call moeglich). Ggf. `beforeunload` Event nutzen fuer Partial-Persist |
| AudioContext Autoplay Policy     | Erst nach User-Interaktion (Button-Click) AudioContext erstellen. Standard-Pattern                                                    |
| Gleichzeitige Sessions           | Nur eine Voice-Session gleichzeitig erlaubt (Client-seitig enforced via Hook-Singleton)                                               |

---

## 8. Sicherheit

- **Auth:** Token-Route und Persist-Route nutzen `requireAuth()`
- **Rate-Limit:** Dediziertes Preset `voiceChat: 10/min` auf Token-Route
- **Token-Scope:** Ephemeral Token ist einmal verwendbar, 30 Minuten gueltig
- **API Key:** Bleibt server-seitig. Client sieht nur das Ephemeral Token
- **Projekt-Ownership:** Wird bei Token-Generierung geprueft (`project.userId === userId`)
- **Chat-Ownership:** Wird bei Persist geprueft
- **Input-Validierung:** `expertId`, `chatId`, `projectId` max 20 Zeichen `[a-zA-Z0-9_-]`
- **Transcript-Validierung:** Max-Laenge pro Entry, Max-Entries pro Session
- **Privacy-Routing:** Voice Chat deaktiviert wenn Business Mode Privacy aktiv (Google API)
- **Keine User-Daten ausser System-Prompt:** Audio wird direkt an Google gestreamt. Kein Logging auf unserem Server. Nur das Transcript (Text) wird nach Session-Ende gespeichert

---

## 9. Implementierungs-Reihenfolge

### Schritt 1: Backend-Infrastruktur

1. Feature Flag in `features.ts`
2. Credits in `credits.ts`
3. Expert `voicePreference` Migration
4. Voice-Chat Utilities in `voice-chat.ts`
5. Token-Route `/api/voice-chat/token`
6. Persist-Route `/api/voice-chat/persist`

### Schritt 2: Audio-Pipeline (Client)

7. `useVoiceChat` Hook — State Machine + WebSocket
8. Audio-Capture via AudioWorklet (PCM 16kHz Encoding)
9. Audio-Playback via AudioContext (PCM 24kHz Decoding)
10. Transcript-Akkumulation

### Schritt 3: UI

11. Voice Chat Button
12. Voice Chat Overlay (Desktop + Mobile)
13. Live-Transcript Komponente
14. Integration in ChatView + PromptInput

### Schritt 4: Integration

15. Chat-History Voice-Indikator
16. Expert-Admin Voice-Dropdown
17. Expert-Card Voice-Badge
18. ENV-Dokumentation

### Schritt 5: Test & Feinschliff

19. Browser-Tests (Chrome, Firefox, Safari)
20. Mobile-Tests (Touch, Permissions)
21. Latenz-Optimierung
22. Edge-Case Handling (Verbindungsabbrueche, Tab-Wechsel)

---

## 10. Spaetere Erweiterungen (Out of Scope V1)

- **Tool Calling in Voice** — Server-Proxy fuer Tool-Ausfuehrung waehrend Voice-Session (`web_search`, `recall_memory`). Limitation: Google Search Grounding und Custom Tools nicht gleichzeitig moeglich
- **Text + Voice Hybrid** — Tippen waehrend Voice-Session (Live API unterstuetzt Text-Input neben Audio)
- **Session Recording** — Audio-Aufnahme als Artifact speichern (R2 Upload, WAV Format)
- **Voice Persona Preview** — "Stimme anhoeren" Button im Expert-Picker (nutzt bestehende Batch-TTS)
- **Conversation Continuity** — Voice-Session kennt vorherigen Text-Chat-Kontext (Summary der bisherigen Messages)
- **Voice-to-Artifact** — Nach Session: "Erstelle Artifact aus Gespraech" (Meeting Notes, Action Items)
- **Multimodale Sessions** — Bild/Screen-Sharing waehrend Voice-Session (Live API unterstuetzt Video-Input)
- **Proaktive Audio** — KI spricht von sich aus wenn sie etwas Relevantes erkannt hat

---

## 11. Verifikation

| ID   | Kriterium            | Testfall                                                          |
| ---- | -------------------- | ----------------------------------------------------------------- |
| V-1  | Feature Flag         | `VOICE_CHAT_ENABLED` nicht gesetzt → Button nicht sichtbar        |
| V-2  | Token-Generierung    | POST `/api/voice-chat/token` → gueltiges Token zurueck            |
| V-3  | WebSocket-Verbindung | Token → WebSocket connect → Setup Complete Event                  |
| V-4  | Audio-Input          | Mikrofon-Audio → PCM 16kHz → WebSocket → Gemini empfaengt         |
| V-5  | Audio-Output         | Gemini antwortet → PCM 24kHz → AudioContext → Speaker             |
| V-6  | Transkription        | Input- und Output-Transkription erscheinen in Echtzeit            |
| V-7  | Barge-in             | User unterbricht → Audio-Playback stoppt sofort                   |
| V-8  | Persistenz           | Session beenden → Messages in Chat-History sichtbar               |
| V-9  | Credits              | Balance korrekt reduziert (minutenbasiert)                        |
| V-10 | Projekt-Kontext      | Voice Chat in Projekt → Expert kennt Projekt-Dokumente            |
| V-11 | Expert Voice         | Verschiedene Experts → verschiedene Stimmen                       |
| V-12 | Mobile               | Overlay funktioniert, Mikrofon-Permission korrekt                 |
| V-13 | Max-Duration         | Session endet automatisch nach konfiguriertem Limit               |
| V-14 | Memory               | Nach Session → Memory-Extraktion laeuft, Erinnerungen gespeichert |

---

## 12. Risiko-Bewertung

### Stabilitaet: Gering

Voice Chat ist architektonisch isoliert. Kein Eingriff in `/api/chat`, `useChat` oder bestehende Middleware. Zwei neue API-Routes, ein Hook, drei UI-Komponenten. Worst case: Voice Chat Button funktioniert nicht. Text-Chat bleibt komplett unberuehrt.

### Performance: Gering

Audio-Pipeline laeuft im Browser (AudioWorklet). Server-Last minimal — zwei kurze HTTP-Requests pro Session (Token + Persist). Kein Server-seitiger WebSocket, kein Streaming-Proxy.

### Sicherheit: Mittel — zwei Punkte muessen vor Implementierung geklaert werden

1. **Persist-Endpoint nimmt Transcript vom Client entgegen.** Der Server hat keine Moeglichkeit zu verifizieren, dass die Session tatsaechlich stattgefunden hat. Ein manipulierter Client koennte beliebige Messages in einen Chat injizieren. **Loesung:** Session-ID bei Token-Generierung in DB speichern, beim Persist gegen diese Session-ID validieren.

2. **System-Prompt wird an den Client exponiert.** Das Ephemeral Token Pattern erfordert, dass der Client den System-Prompt im WebSocket Setup an Gemini sendet (siehe Abschnitt 13: Architektur-Entscheidung). Expert-Personas und Projekt-Dokumente sind damit in den Browser DevTools sichtbar. Fuer eigene Experten/Projekte akzeptabel — aber bei Collaboration (geteilte Projekte) koennten fremde Dokumente exponiert werden.

### Externe Abhaengigkeit: Hoch

Gemini Live API ist Preview. Google kann Breaking Changes machen, Latenz kann schwanken, Verfuegbarkeit ist nicht garantiert. Das ist das groesste Risiko und liegt ausserhalb unserer Kontrolle.

### EU/Local-Kompatibilitaet

Voice Chat ist Google-only. Kein Fallback fuer EU-Deployment (Direct) oder Local (Ollama). Feature Flag faengt das ab — Voice Chat ist **nur im SaaS-Profil verfuegbar**.

---

## 13. Architektur-Entscheidung: System-Prompt Routing

### Problem

Der Client verbindet direkt mit Gemini via WebSocket (Ephemeral Token). Gemini braucht den System-Prompt (Expert-Persona + Projekt-Kontext) im WebSocket Setup. Der System-Prompt muss also vom Server zum Client und vom Client zu Gemini fliessen.

Im Text-Chat passiert das nicht — dort baut der Server den Prompt und schickt ihn direkt an den Provider. Der Client sieht den System-Prompt nie.

### Optionen

| Option                              | Ansatz                                                                                                      | Trade-off                                                                                                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A: Client bekommt System-Prompt** | Token-Endpoint gibt `systemPrompt` in der Response mit zurueck, Client leitet ihn im WebSocket Setup weiter | Expert-Personas und Projekt-Dokumente im Client sichtbar (DevTools). Fuer eigene Inhalte akzeptabel. Bei Collaboration pruefen.                                         |
| **B: Server-Proxy**                 | Server haelt die WebSocket-Verbindung, Client spricht nur mit unserem Server                                | System-Prompt bleibt server-seitig. Aber: Vercel-inkompatibel (kein langlebiger WebSocket), braucht eigene Infrastruktur (z.B. Fly.io), hoehere Latenz, hoehere Kosten. |
| **C: Session-Config im Token**      | System-Prompt wird beim Token-Erstellen an die Session gebunden (server-seitig)                             | Muss geprueft werden ob die Gemini API das unterstuetzt. Waere die sauberste Loesung.                                                                                   |

### Aktuelle Annahme

Option A. Token-Response muss um `systemPrompt` erweitert werden:

```
POST /api/voice-chat/token
Response: { token, expiresAt, voice, chatId, systemPrompt }
```

**Entscheidung offen.** Option C pruefen — wenn die Gemini API erlaubt, den System-Prompt server-seitig an das Token zu binden, ist das vorzuziehen.

---

## 14. Limitierung V1: Kein Tool Calling

Voice Chat in V1 ist ein reines Gespraech. Der Experte kann waehrend der Session **keine Aktionen ausfuehren** — kein Artifact erstellen, keine Web-Suche, kein Memory speichern.

### Warum

Tool Calling in einer Live-Audio-Session erfordert einen Client-Side Tool Execution Layer: Gemini ruft Tool auf → Client faengt ab → Client schickt an unseren Server → Server fuehrt aus → Ergebnis zurueck an Client → Client schickt an Gemini. Das ist ein anderes Architektur-Pattern und widerspricht dem Ephemeral-Token-Vorteil (minimale Server-Last).

Zusaetzlich: Tool-Aufrufe dauern 1-5 Sekunden. In einem fluessigen Gespraech entsteht eine merkbare Pause.

### Pragmatischer Mittelweg fuer V1

Nach Session-Ende: **Post-Session Actions** auf Basis des gespeicherten Transcripts. Beispiel: Button "Zusammenfassung erstellen" der das Transcript an den Text-Chat-Flow weitergibt und ein Artifact generiert. Kein Live-Tool-Calling noetig, aber der User bekommt sein Dokument.

### Was der User erwarten kann vs. nicht kann

| User sagt                             | V1 Verhalten                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| "Erklaer mir das nochmal anders"      | Experte erklaert muendlich — funktioniert                                                            |
| "Fass das in einem Dokument zusammen" | Experte kann es muendlich zusammenfassen, aber kein Artifact erstellen. Post-Session Action moeglich |
| "Such mal im Web nach X"              | Experte muss passen — kein Tool-Zugriff                                                              |
| "Merk dir das fuer naechstes Mal"     | Wird nach Session via Memory-Extraktion erfasst (automatisch)                                        |

---

## 15. Offene Fragen (vor Implementierung zu klaeren)

### Muss geklaert werden

1. **Persist-Endpoint Absicherung:** Session-ID Pattern implementieren? (siehe Risiko-Bewertung Punkt 1)
2. **Consent-Dialog:** Audio fliesst direkt an Google. Einmaliger Hinweis-Dialog vor erster Voice-Session noetig. Design und Text abstimmen
3. **System-Prompt Routing:** Option A (Client sieht Prompt) akzeptabel? Option C (Token-gebunden) technisch moeglich? (siehe Abschnitt 13)
4. **Collaboration-Kontext:** Wenn Projekte geteilt werden — duerfen Projekt-Dokumente im Client sichtbar sein?

### Sollte geklaert werden

5. **Gemini 3.1 Flash Live Verfuegbarkeit:** Preview-Status — stabil genug fuer Production?
6. **Kosten-Monitoring:** Wie tracken wir tatsaechliche Google-Kosten pro Session (nicht nur Credits)?
7. **Browser-Support:** AudioWorklet in Safari hat Macken. Hard Requirement (Chrome/Edge/Firefox only) oder Fallback?
8. **Memory-Qualitaet:** Memory-Extraktion arbeitet auf Text-Chat-Messages. Voice-Transcripts sind kuerzer und gesprochener Stil — Qualitaet testen
9. **Tab-Close Datenverlust:** Transcript geht verloren wenn Tab geschlossen wird (kein Persist-Call). `beforeunload` ist unzuverlaessig (besonders mobile). Akzeptable Known Limitation?

### Nice to know

10. **Audio-Qualitaet:** Reicht PCM 16kHz? Tests mit verschiedenen Mikrofonen noetig
11. **Concurrent Sessions:** Mehrere Voice-Sessions in verschiedenen Tabs?
12. **Post-Session Actions:** "Zusammenfassung erstellen" Button nach Session-Ende — Scope V1 oder V2?
