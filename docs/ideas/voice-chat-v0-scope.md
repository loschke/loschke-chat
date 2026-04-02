# Voice Chat V0: Scope und Implementierungsplan

> Reduzierter Echtzeit-Voice-Mode basierend auf dem [Voice Chat PRD](prd-voice-chat.md).
> Fokus: Schnell eine funktionierende Voice-Experience shippen mit Transcript-Persistierung.
> **Status:** Entwurf
> **Stand:** 2026-04-02

---

## 1. Abgrenzung: V0 vs. Voll-PRD

Das Voice Chat PRD beschreibt den vollstaendigen Feature-Umfang. Dieses Dokument definiert einen reduzierten V0-Scope fuer einen schnelleren ersten Release.

### Was V0 enthaelt

| Feature                           | Details                                                                                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Gemini Live API + Ephemeral Token | Direkter Client-Gemini WebSocket, ~500ms Latenz                                                                                              |
| Audio-Pipeline                    | AudioWorklet (16kHz PCM) → WebSocket → Gemini → AudioContext (24kHz PCM) → Speaker                                                           |
| Google Search Grounding           | `tools: [{ googleSearch: {} }]` in Live-Session-Config. Gemini bezieht selbstaendig aktuelle Web-Infos ein. Kein eigenes Tool Calling noetig |
| Live-Transkription                | Input + Output Transcript in Echtzeit im Overlay                                                                                             |
| Barge-in                          | User kann jederzeit unterbrechen                                                                                                             |
| Transcript-Persistierung          | Nach Session-Ende: Transcript als Messages in DB speichern                                                                                   |
| Per-Minute Credits                | Minutenbasierte Abrechnung nach Session-Ende                                                                                                 |
| Feature Flag                      | `voiceChat.enabled` = Google API Key + `VOICE_CHAT_ENABLED=true`                                                                             |
| Voice als eigener Modus           | Eigener Tab im Empty State (neben Chat, Experten, Quicktasks). Kein Button im Chat-Input                                                    |
| Voice Chat Overlay                | Fullscreen-Overlay mit Audio-Visualizer, Timer, Live-Transcript, Mute/Beenden                                                               |
| Audio-Visualizer                  | Eigener CSS/Canvas-Visualizer basierend auf Audio-Amplitude. Keine externen Dependencies (kein Rive, kein WebGL)                             |
| Consent-Dialog                    | Einmaliger Hinweis: "Audio wird an Google gesendet"                                                                                          |
| Max-Duration                      | Client-seitiges 30-Min-Limit mit Warnung                                                                                                     |
| Default-Stimme                    | Kore (konfigurierbar per ENV `VOICE_CHAT_DEFAULT_VOICE`)                                                                                     |

### Was V0 weglasst (spaetere Iterationen)

| Feature                                       | Warum spaeter                                                              | Iteration |
| --------------------------------------------- | -------------------------------------------------------------------------- | --------- |
| Expert Voice-Mapping (DB-Migration, Admin-UI) | Alle Experts nutzen Default-Stimme. Spart Migration + Admin-UI             | V1        |
| Projekt-Kontext in Voice                      | Kein Dokument-Loading. Generischer Voice-Prompt reicht fuer V0             | V1        |
| Memory-Extraktion nach Session                | Erfordert Analyse des Transcripts. Kann auf persistierte Messages aufbauen | V1        |
| Chat-History Voice-Indikator                  | Visueller Polish. Messages werden gespeichert, Indikator kommt spaeter     | V1        |
| Expert-Card Voice-Badge                       | Braucht Voice-Mapping                                                      | V1        |
| Custom Tool Calling in Voice                  | Server-Proxy-Architektur, hohe Komplexitaet                                | V2        |
| Text + Voice Hybrid                           | Tippen waehrend Voice-Session                                              | V2        |
| Session Recording (Audio als Artifact)        | R2 Upload der Audio-Datei                                                  | V2        |

---

## 2. UX-Konzept: Voice als eigener Modus

### Designprinzip

Voice ist **kein Chat-Feature**, sondern ein **eigener Interaktionsmodus**. Der Text-Chat ist text-first mit Tools, Artifacts und Experten-System. Voice ist audio-first, reduziert, konversationell. Diese Trennung vermeidet die Erwartung, dass Voice die gleichen Features wie der Text-Chat bietet.

### Einstieg: Neuer Tab im Empty State

Voice bekommt einen eigenen Tab in der bestehenden Tab-Leiste des Empty States:

```
[ Chat ]  [ Experten ]  [ Quicktasks ]  [ Voice ]
```

**Technisch:** Tab-Type erweitern (`type Tab = "chat" | "experts" | "quicktasks" | "voice"`), neuen Eintrag in `tabs`-Array, neuen Tab-Content rendern.

**Voice-Tab Inhalt (Startansicht):**

```
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│            ┌──────────────────┐             │
│            │                  │             │
│            │   ○ ○ ○ ○ ○ ○   │  ← Audio   │
│            │   Visualizer     │    Idle     │
│            │   (ruhend)       │             │
│            │                  │             │
│            └──────────────────┘             │
│                                             │
│        "Starte ein Sprachgespraech"         │
│   "Stelle Fragen und erhalte Antworten"     │
│          "in Echtzeit per Sprache"          │
│                                             │
│           [ 🎤 Voice starten ]              │
│                                             │
│      Kein Textfeld, keine Tool-Buttons      │
│                                             │
└─────────────────────────────────────────────┘
```

Kein PromptInput, keine Attachment-Buttons, kein Expert-Switcher. Nur der Visualizer, ein kurzer Beschreibungstext und der Start-Button. Klare visuelle Abgrenzung vom Text-Chat.

### Waehrend der Session: Fullscreen-Overlay

Nach Klick auf "Voice starten" oeffnet ein Fullscreen-Overlay ueber dem gesamten Chat-Bereich. Pattern analog zu `drop-zone-overlay.tsx` (`fixed inset-0 z-50`).

**Desktop-Layout:**

```
┌─────────────────────────────────────────────┐
│                                        [✕]  │
│                                             │
│            ┌──────────────────┐             │
│            │                  │             │
│            │   ≋≋≋≋≋≋≋≋≋≋   │  ← Audio   │
│            │   Visualizer     │    reagiert │
│            │   (animiert)     │    auf      │
│            │                  │    Amplitude│
│            └──────────────────┘             │
│                                             │
│              05:23 / 30:00                  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ Du: "Wie sieht die aktuelle Lage     │  │
│  │ bei Thema X aus?"                     │  │
│  │                                       │  │
│  │ Assistent: "Basierend auf aktuellen   │  │
│  │ Informationen sehe ich drei           │  │
│  │ Schwerpunkte..."                      │  │
│  └───────────────────────────────────────┘  │
│           Live-Transcript (scrollend)       │
│                                             │
│        [🔇 Mute]    [⏹ Beenden]            │
│                                             │
└─────────────────────────────────────────────┘
```

**Mobile:** Identisch, Fullscreen ist auf Mobile sogar natuerlicher (wie ein Telefonat).

### Audio-Visualizer

Eigener, leichtgewichtiger Visualizer ohne externe Dependencies:

- **Technologie:** CSS-Animationen + `AnalyserNode` aus der Web Audio API
- **Darstellung:** Kreisfoermige oder lineare Bars/Wellen die auf Audio-Amplitude reagieren
- **States:**
  - **Idle/Connecting:** Sanftes Pulsieren (CSS-only, kein Audio noetig)
  - **Listening (User spricht):** Visualizer reagiert auf Mikrofon-Input-Amplitude
  - **Speaking (AI antwortet):** Visualizer reagiert auf Output-Audio-Amplitude
  - **Muted:** Reduzierte Animation, gedimmt
- **Implementierung:** `AnalyserNode.getByteFrequencyData()` liefert Amplitude-Daten. Diese steuern CSS Custom Properties (`--amplitude`) die Hoehe/Skalierung der Bars animieren. Kein Canvas noetig, reine CSS-Transforms fuer Performance.

```typescript
// Konzept: Audio-Level → CSS Custom Property
const analyser = audioContext.createAnalyser()
const data = new Uint8Array(analyser.frequencyBinCount)

function updateVisualizer() {
  analyser.getByteFrequencyData(data)
  const amplitude = data.reduce((a, b) => a + b) / data.length / 255
  element.style.setProperty("--amplitude", String(amplitude))
  requestAnimationFrame(updateVisualizer)
}
```

```css
/* Bars reagieren auf --amplitude */
.voice-bar {
  transform: scaleY(calc(0.2 + var(--amplitude) * 0.8));
  transition: transform 50ms ease-out;
}
```

### Session-Ende

Nach "Beenden" wird das Overlay geschlossen und das Transcript als Messages im Chat gespeichert. Der User sieht die Konversation im normalen Chat-Verlauf. In V0 ohne speziellen Voice-Indikator — die Messages sehen aus wie normale Text-Messages.

### Consent-Dialog

Beim ersten Klick auf "Voice starten" erscheint ein einmaliger Dialog:

- Hinweis: "Audio wird direkt an Google gesendet und dort verarbeitet"
- Checkbox: "Nicht mehr anzeigen"
- Buttons: "Abbrechen" / "Verstanden, starten"
- Gespeichert in `localStorage` (`voice-chat-consent`)

---

## 3. Architektur V0

### Datenfluss

```
1. Client: POST /api/voice-chat/token
   Body: { chatId? }
   Server: requireAuth() → Feature-Check → Credit-Check
           → System-Prompt bauen (generisch, Voice-optimiert)
           → Ephemeral Token generieren → Session-ID speichern
   Response: { token, expiresAt, voice, systemPrompt, chatId, sessionId }

2. Client: WebSocket connect zu Gemini (mit Token)
   Setup: model, voice, systemInstruction, responseModalities: [AUDIO],
          tools: [{ googleSearch: {} }],
          inputAudioTranscription, outputAudioTranscription,
          automaticActivityDetection

3. Bidirektionale Audio-Session
   Client → Gemini: realtimeInput.audio (PCM 16kHz chunks)
   Gemini → Client: serverContent.modelTurn.parts (Audio + Text)
   Gemini → Client: inputTranscription / outputTranscription
   Gemini: kann selbstaendig Google Search nutzen fuer aktuelle Infos

4. Session-Ende
   Client: POST /api/voice-chat/persist
   Body: { chatId, sessionId, transcript[], durationSeconds }
   Server: Session-ID validieren → Transcript als Messages speichern
           → Usage loggen → Credits abziehen (minutenbasiert)
           → Title generieren (fire-and-forget, wenn neuer Chat)
```

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

Audio-Analyse (parallel, fuer Visualizer):
  → AudioContext.createAnalyser()
  → getByteFrequencyData() → CSS Custom Properties → Visualizer-Animation
```

### System-Prompt Routing

V0 nutzt **Option A** aus dem PRD: Der Token-Endpoint gibt den System-Prompt in der Response mit zurueck, der Client leitet ihn im WebSocket Setup weiter.

Fuer V0 akzeptabel, da nur ein generischer Voice-Prompt exponiert wird (keine Expert-Personas, keine Projekt-Dokumente).

---

## 4. Google Search Grounding

Die Gemini Live API unterstuetzt `tools` in der `LiveConnectConfig`. Durch `tools: [{ googleSearch: {} }]` kann Gemini waehrend der Voice-Session selbstaendig aktuelle Informationen aus dem Web beziehen.

```typescript
// Im WebSocket Setup (Client-seitig)
ws.send(JSON.stringify({
  setup: {
    model: "gemini-3.1-flash-live-preview",
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
    systemInstruction: { parts: [{ text: systemPrompt }] },
    tools: [{ googleSearch: {} }],
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  },
}))
```

**Vorteile:**

- Null zusaetzlicher Implementierungsaufwand
- Keine Latenz-Einbusse (Gemini handhabt Suche nativ)
- User kann aktuelle Fragen stellen ("Was ist heute passiert?", "Aktueller Stand bei X?")

**Einschraenkung:** Google Search Grounding und Custom Tools sind nicht gleichzeitig moeglich. Fuer V0 kein Problem (keine Custom Tools). In V2 (mit Custom Tool Calling) muss entschieden werden: Grounding ODER Custom Tools.

---

## 5. Transcript-Persistierung

### Persist-Endpoint

```
POST /api/voice-chat/persist
Body: {
  chatId: string,
  sessionId: string,
  transcript: Array<{ role: "user" | "assistant", text: string, timestamp: number }>,
  durationSeconds: number,
}
Response: { success: true, creditsDeducted: number }
```

### Ablauf

1. `requireAuth()` + Chat-Ownership pruefen
2. Session-ID validieren (muss vorher via Token-Route erstellt worden sein)
3. Transcript als Messages speichern:
   - User-Turns → `role: "user"`, `parts: [{ type: "text", text }]`
   - Assistant-Turns → `role: "assistant"`, `parts: [{ type: "text", text }]`
   - Metadata auf allen Messages: `{ source: "voice-chat" }`
4. Usage in `usage_logs` protokollieren (Duration-basiert)
5. Credits abziehen: `calculateVoiceChatCredits(durationSeconds)`
6. Title-Generierung fuer neuen Chat (fire-and-forget)

### Sicherheit

Der Client sendet das Transcript. Das birgt das Risiko, dass manipulierte Clients beliebige Messages injizieren koennten.

**V0-Ansatz:** Session-ID bei Token-Generierung in DB speichern, beim Persist gegen diese Session-ID validieren. So ist sichergestellt, dass eine Token-Anfrage der Persist-Anfrage vorausgegangen ist. Keine perfekte Absicherung (Transcript-Inhalt ist nicht verifizierbar), aber ausreichend fuer eine Plattform mit authentifizierten Usern.

---

## 6. Dateien

### Neu erstellen

| Datei                                          | Beschreibung                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/app/api/voice-chat/token/route.ts`        | Ephemeral Token + System-Prompt + Feature/Credit-Check + Session-ID                     |
| `src/app/api/voice-chat/persist/route.ts`      | Transcript als Messages speichern + Credit-Abrechnung                                   |
| `src/lib/ai/voice-chat.ts`                     | Server-Utils: Token-Config, Voice-System-Prompt, Credit-Berechnung, Session-Validierung |
| `src/hooks/use-voice-chat.ts`                  | Core Hook: State Machine, WebSocket, Audio Pipeline, Transcript                         |
| `src/components/chat/voice-chat-tab.tsx`       | Voice-Tab im Empty State: Visualizer (idle), Beschreibung, Start-Button                 |
| `src/components/chat/voice-chat-overlay.tsx`    | Fullscreen-Overlay: Visualizer (animiert), Timer, Transcript, Controls                  |
| `src/components/chat/voice-chat-visualizer.tsx` | CSS/AnalyserNode Audio-Visualizer (Bars reagieren auf Amplitude)                        |

### Zu aendern

| Datei                                        | Aenderung                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/config/features.ts`                     | Feature Flag `voiceChat`                                                                                     |
| `src/config/credits.ts`                      | `calculateVoiceChatCredits()` + ENV                                                                          |
| `src/lib/rate-limit.ts`                      | Rate-Limit-Preset `voiceChat: 10/min`                                                                        |
| `src/components/chat/chat-empty-state.tsx`    | Voice-Tab hinzufuegen (Tab-Type + tabs-Array + Tab-Content)                                                  |
| `src/components/chat/chat-view.tsx`           | Hook + Overlay Integration                                                                                   |
| `.env.example`                               | `VOICE_CHAT_ENABLED`, `VOICE_CHAT_CREDITS_PER_MINUTE`, `VOICE_CHAT_MAX_DURATION`, `VOICE_CHAT_DEFAULT_VOICE` |

**Nicht mehr geaendert** (gegenueber frueherer Version):
- ~~`src/components/chat/prompt-input.tsx`~~ — Kein Voice-Button im Chat-Input. Voice ist ein eigener Tab.

---

## 7. Implementierungsreihenfolge

### Schritt 1: Backend (Tag 1)

1. Feature Flag in `features.ts`
2. Credits in `credits.ts` (`calculateVoiceChatCredits`, `VOICE_CHAT_CREDITS_PER_MINUTE`)
3. Rate-Limit-Preset in `rate-limit.ts`
4. `voice-chat.ts` — Server-Utils (Token-Config, Voice-System-Prompt, Session-ID-Verwaltung)
5. Token-Route `/api/voice-chat/token`
6. Persist-Route `/api/voice-chat/persist`

### Schritt 2: Audio-Pipeline + Hook (Tag 2-3)

7. `useVoiceChat` Hook — State Machine (idle → connecting → connected → speaking/listening → disconnected)
8. Audio-Capture: `getUserMedia()` → AudioWorklet → PCM 16kHz → Base64
9. Audio-Playback: Base64 → PCM 24kHz → AudioContext → Speaker
10. WebSocket-Management: Connect, Send, Receive, Close, Error-Recovery
11. Transcript-Akkumulation aus `inputTranscription` / `outputTranscription`
12. Barge-in: Output-Audio stoppen bei `serverContent.interrupted`
13. Duration-Tracking + Max-Duration-Warning
14. Persist-Call nach Session-Ende (Transcript + Duration an Server senden)
15. AnalyserNode-Integration fuer Visualizer-Daten (Input- und Output-Amplitude)

### Schritt 3: UI (Tag 4)

16. Audio-Visualizer Komponente (`voice-chat-visualizer.tsx`):
    - CSS Bars mit `--amplitude` Custom Property
    - States: idle (Pulsieren), listening (Mikrofon-Amplitude), speaking (Output-Amplitude), muted (gedimmt)
    - Keine externen Dependencies
17. Voice-Tab im Empty State (`voice-chat-tab.tsx`):
    - Visualizer (idle), Beschreibungstext, Start-Button
    - Consent-Dialog bei erstem Start (localStorage Flag)
18. Voice Chat Overlay (`voice-chat-overlay.tsx`):
    - Fullscreen (`fixed inset-0 z-50`)
    - Visualizer (animiert), Timer (current / max), Live-Transcript (scrollend), Mute/Beenden
    - Desktop + Mobile Layout
19. Integration in `chat-empty-state.tsx` (Tab hinzufuegen) und `chat-view.tsx` (Overlay mounten)

### Schritt 4: Test (Tag 5)

20. Browser-Tests (Chrome, Edge, Firefox — Safari mit AudioWorklet-Einschraenkungen)
21. Mobile-Tests (Touch, Permissions)
22. Latenz-Messung
23. Persistenz-Test: Session beenden → Messages in Chat-History sichtbar
24. Visualizer-Test: Amplitude reagiert korrekt auf Sprache
25. Edge-Cases: Verbindungsabbruch, Tab-Wechsel, kein Mikrofon, keine Credits

---

## 8. V0 → V1 Upgrade-Pfad

| Iteration | Feature                                                                      | Aufwand    |
| --------- | ---------------------------------------------------------------------------- | ---------- |
| V1.1      | Expert Voice-Mapping — DB-Migration `voicePreference` + Admin Voice-Dropdown | ~0.5 Tage  |
| V1.2      | Projekt-Kontext — Dokumente in Voice-Session laden                           | ~0.25 Tage |
| V1.3      | Memory-Extraktion — Fire-and-forget nach Session (auf persistierte Messages) | ~0.25 Tage |
| V1.4      | Chat-History Voice-Indikator — Mikrofon-Icon auf Voice-Messages              | ~0.25 Tage |
| V1.5      | Expert-Card Voice-Badge — Lautsprecher-Icon wenn Voice verfuegbar            | ~0.1 Tage  |
| V2.0      | Custom Tool Calling — Server-Proxy fuer Tools waehrend Voice                 | ~2 Tage    |

---

## 9. Risiko-Bewertung

### Architektonische Isolation (Risiko: Gering)

Voice Chat greift nicht in bestehenden Code ein:
- Kein Eingriff in `/api/chat/route.ts` (Kern der Plattform)
- Kein Eingriff in `useChat` oder den Text-Streaming-Flow
- Kein Eingriff in die Message-Rendering-Pipeline
- Einzige Beruehrungspunkte: `chat-empty-state.tsx` (Tab hinzufuegen) und `chat-view.tsx` (Overlay mounten)

**Worst Case:** Voice Chat funktioniert nicht → Feature Flag aus, Text-Chat bleibt komplett unberuehrt.

### Persist-Endpoint Manipulation (Risiko: Mittel)

Der Client sendet das Transcript. Manipulierter Client koennte Messages injizieren. User kann aber nur seinen eigenen Chat manipulieren — kein Multi-User-Risiko. Session-ID-Validierung als Mitigation.

### System-Prompt Exposure (Risiko: Gering in V0)

System-Prompt wird an Client geschickt (DevTools sichtbar). In V0 nur generischer Voice-Prompt, keine sensiblen Inhalte. Wird relevant in V1 mit Expert-Personas und Projekt-Dokumenten.

### Externe Abhaengigkeit (Risiko: Hoch)

Gemini Live API ist Preview. Google kann Breaking Changes machen, Latenz kann schwanken, Verfuegbarkeit ist nicht garantiert. Feature Flag faengt das ab — Voice ist nur im SaaS-Profil verfuegbar. Kein Fallback fuer EU/Local.

### Kosten-Explosion (Risiko: Gering)

Per-Minute Credits + Max-Duration (30 Min) + Rate-Limit (10 Sessions/Min) + Credit-Balance-Check vor Session-Start begrenzen Kosten.

### Audio-Visualizer Performance (Risiko: Gering)

`requestAnimationFrame` + CSS Transforms sind GPU-beschleunigt. Kein Canvas, kein WebGL. Selbst auf schwachen Geraeten performant.

---

## 10. Offene Fragen

1. ~~**Gemini Live API Modell-Name:**~~ Geklaert: `gemini-3.1-flash-live-preview` (bestaetigt via offizielle Google Docs). Unterstuetzt Function Calling, Search Grounding und Thinking. Context Window Compression aktivieren fuer Sessions ueber 15 Min.
2. **Browser-Scope:** AudioWorklet hat Safari-Macken. Nur Chrome/Edge/Firefox fuer V0? Oder Fallback-Strategie?
3. **Tab-Close Datenverlust:** Transcript geht verloren wenn Tab geschlossen wird bevor Persist-Call erfolgt. `beforeunload` ist unzuverlaessig (besonders mobile). Akzeptable Known Limitation fuer V0?
4. **Consent-Text:** Exakter Wortlaut fuer den Google-Hinweis-Dialog abstimmen.
5. **Voice-Tab Sichtbarkeit:** Tab nur anzeigen wenn Feature Flag aktiv, oder immer anzeigen mit "Feature nicht verfuegbar" Hinweis?

---

## 11. Verifikation

| ID   | Test                      | Erwartung                                              |
| ---- | ------------------------- | ------------------------------------------------------ |
| V-1  | Feature Flag aus          | Voice-Tab nicht sichtbar                               |
| V-2  | Voice-Tab oeffnen         | Visualizer (idle), Beschreibung, Start-Button          |
| V-3  | Start klicken (erstmalig) | Consent-Dialog erscheint                               |
| V-4  | Consent bestaetigen       | Mikrofon-Permission → Verbindung (~1-2s)               |
| V-5  | Sprechen                  | Gemini antwortet mit Stimme (~500ms)                   |
| V-6  | Visualizer                | Reagiert auf Sprache (User + AI), verschiedene States  |
| V-7  | "Was ist heute passiert?" | Gemini nutzt Google Search, antwortet aktuell          |
| V-8  | Barge-in                  | Audio stoppt sofort                                    |
| V-9  | Live-Transcript           | Input + Output werden angezeigt, scrollt mit           |
| V-10 | Mute                      | Kein Audio an Gemini, Visualizer gedimmt               |
| V-11 | Beenden                   | Overlay schliesst, Transcript in Chat-History sichtbar |
| V-12 | Credits                   | Balance korrekt reduziert (minutenbasiert)             |
| V-13 | 28 Min                    | Warnung "Noch 2 Minuten"                               |
| V-14 | 30 Min                    | Auto-Disconnect, Transcript gespeichert                |
| V-15 | Keine Credits             | Start-Button deaktiviert mit Hinweis                   |
| V-16 | Neuer Chat via Voice      | Chat wird erstellt, Title generiert                    |
