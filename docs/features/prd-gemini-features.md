# PRD: Gemini-Powered Features

> **Status:** Bildgenerierung umgesetzt (2026-03). Audio, Video und Search Grounding offen.
>
> **Umgesetzt:**
> - Bildgenerierung via `generate_image` Tool + Image Artifacts (Gallery-Format)
> - Gemini Direct Provider (`@ai-sdk/google`, nicht Gateway)
> - Feature-Flag: `GOOGLE_GENERATIVE_AI_API_KEY` (opt-in)
> - Credits: Flat-Rate `IMAGE_GENERATION_CREDITS` (default 500)
> - Privacy Guard: Tool deaktiviert bei Privacy-Routing
>
> **Implementierung weicht vom PRD ab:** Kein `gemini-provider.ts` Router. Stattdessen wird `generateImage()` direkt in `src/lib/ai/image-generation.ts` aufgerufen. Der Gateway bleibt fuer Text-Chat, Gemini wird nur fuer `generateImage()` direkt angesprochen.
>
> **Offen:** Audio (TTS/STT), Video-Transkription, Google Search Grounding — nicht priorisiert.

---

## 1. Übersicht

### Warum Gemini?

Die Plattform nutzt Gemini-Modelle aktuell ausschließlich über den Vercel AI Gateway. Das funktioniert für Text-Chat, lässt aber Gemini-exklusive Capabilities ungenutzt:

- **Native Bildgenerierung** — Gemini 2.0 Flash generiert Bilder direkt im Conversation-Flow (kein separater DALL-E/Midjourney-Call)
- **Audio-I/O** — Speech-to-Text und Text-to-Speech nativ, Multi-Speaker-Unterstützung
- **Video-Verständnis** — YouTube-URLs als Input, Transkription und Analyse
- **Google Search Grounding** — Faktencheck mit Quellenangaben direkt im Model

Diese Features erfordern den nativen `@ai-sdk/google` Provider, da der Gateway sie nicht unterstützt.

### Was wird möglich?

| Feature                    | User-Wert                         | Umsetzungsaufwand |
| -------------------------- | --------------------------------- | ----------------- |
| Bildgenerierung im Chat    | Hoch — ersetzt externe Tools      | Mittel            |
| Audio-Quicktasks (STT/TTS) | Mittel — Nischen-Usecase          | Mittel            |
| Video-Transkription        | Mittel — YouTube-Workflow         | Gering            |
| Google Search Grounding    | Gering — Firecrawl deckt Suche ab | Gering            |

### Abgrenzung

Dieses PRD beschreibt **neue Gemini-exklusive Features**. Es ersetzt keine bestehende Funktionalität:

- Firecrawl bleibt primärer Search/Scrape-Provider
- Anthropic/OpenAI bleiben Haupt-Chat-Modelle
- Gateway-Routing bleibt Default für alle Standard-Chats

---

## 2. Foundation-Phase

Technische Voraussetzungen, die alle Gemini-Features brauchen.

### 2.1 Architektur-Entscheidung: Gateway beibehalten, Direct Provider ergänzen

#### Warum der Gateway bleibt

Das bestehende System funktioniert stabil: File-Upload, Tool-Calling, Artifacts und Model-Wechsel laufen zuverlässig über den Vercel AI Gateway. Eine Analyse der Gateway-Abhängigkeiten zeigt, dass der Gateway mehr leistet als reines Routing:

| Was der Gateway tut                                                                                                                                            | Risiko bei Ablösung                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **File-Part-Normalisierung** — `fixFilePartsForGateway()` in `build-messages.ts` konvertiert data-URLs zu Uint8Array, Gateway normalisiert pro Provider weiter | Hoch — jeder Provider erwartet anderes Format für Bilder/PDFs            |
| **Tool-Serialisierung** — Einheitliche `tool()` Definitionen, Gateway übersetzt pro Provider                                                                   | Hoch — Anthropic, OpenAI, Google haben unterschiedliche Tool-Formate     |
| **Model-Routing** — `gateway("anthropic/claude-sonnet-4-6")` parsed Provider-Prefix, routet automatisch                                                        | Mittel — müsste manuell in einer `resolveModel()` Funktion gebaut werden |
| **Prompt Caching** — `providerOptions.anthropic.cacheControl` wird transparent durchgereicht                                                                   | Gering — funktioniert auch mit Direct Provider                           |
| **Vercel-Integration** — Logging, Monitoring, Caching auf Vercel-Ebene                                                                                         | Gering — Nice-to-have, nicht kritisch                                    |

**Entscheidung:** Gateway bleibt Default für alle Standard-Chats. Direct Provider nur für Gemini-exklusive Features.

#### Bewährtes Pattern: Privacy-Provider

Das Pattern existiert bereits im Code. In `route.ts`:

```typescript
model: privacyModel ?? gateway(finalModelId)
```

Business Mode nutzt `@ai-sdk/mistral` und `@ai-sdk/openai-compatible` als Direct Provider neben dem Gateway. Das funktioniert stabil. Gemini-Features folgen dem gleichen Muster:

```typescript
model: geminiFeatureModel ?? privacyModel ?? gateway(finalModelId)
```

#### Drei Routing-Pfade

```
┌─────────────────────────────────────────────────────┐
│                   Chat-Route                         │
│                                                      │
│  1. Gemini-Feature angefordert?                      │
│     → @ai-sdk/google (Direct Provider)               │
│     → Bild/Audio/Video/Search Grounding              │
│                                                      │
│  2. Privacy-Route aktiv? (Business Mode)             │
│     → @ai-sdk/mistral oder @ai-sdk/openai-compatible │
│     → EU-konform oder lokal                          │
│                                                      │
│  3. Standard-Chat (Default)                          │
│     → gateway(finalModelId)                          │
│     → Alle Provider, stabil, getestet                │
└─────────────────────────────────────────────────────┘
```

**Vorteile:**

- Zero Risiko für bestehende Funktionalität
- File-Handling, Tool-Calling, Streaming bleiben stabil
- Gemini-Features nutzen Direct Provider nur wenn sie müssen
- Wenn der Gateway irgendwann Gemini-Features unterstützt, fällt der Direct-Path weg

#### Implementierung

**Neue Datei: `src/lib/ai/gemini-provider.ts`** (analog zu `privacy-provider.ts`)

```typescript
import { google } from "@ai-sdk/google"

/**
 * Resolve a Gemini model for feature-specific usage.
 * Returns null if no Gemini-specific feature requested — caller falls back to gateway.
 */
export function resolveGeminiModel(options: {
  modelId: string
  imageGeneration?: boolean
  tts?: boolean
  searchGrounding?: boolean
}) {
  // Nur wenn Gemini-Model UND Gemini-Feature aktiv
  if (!options.modelId.startsWith("google/")) return null

  const model = options.modelId.replace(/^google\//, "")

  if (options.imageGeneration) {
    return google(model, { responseModalities: ["TEXT", "IMAGE"] })
  }
  if (options.tts) {
    return google(model, { responseModalities: ["AUDIO"] })
  }
  if (options.searchGrounding) {
    return google(model, { useSearchGrounding: true })
  }

  return null // Kein Gemini-Feature → Gateway
}
```

**ENV:** `GOOGLE_GENERATIVE_AI_API_KEY` — nur nötig wenn Gemini-Features genutzt werden (analog zu `MISTRAL_API_KEY`).

**Feature-Flag:** `features.gemini.enabled` — opt-in via `GOOGLE_GENERATIVE_AI_API_KEY` gesetzt.

### 2.2 Model-Capabilities erweitern

**Status quo:** `capabilities` in der Models-Tabelle kennt nur `vision` und `fileInput`.

**Neue Flags:**

```typescript
capabilities: {
  vision?: boolean           // Bestehend
  fileInput?: boolean        // Bestehend
  imageGeneration?: boolean  // NEU — Kann Bilder generieren
  tts?: boolean              // NEU — Text-to-Speech
  stt?: boolean              // NEU — Speech-to-Text
  googleSearch?: boolean     // NEU — Google Search Grounding
  codeExecution?: boolean    // NEU — Sandboxed Code Execution
  nativeToolCalling?: boolean // NEU — Echtes Tool-Calling (vs. Fake-Artifact-Parser)
}
```

**Warum `nativeToolCalling`?** Gemini über Gateway hat kein echtes Tool-Calling — der Fake-Artifact-Parser (`parse-fake-artifact.ts`) springt ein. Bei Direct-Provider könnte echtes Tool-Calling funktionieren. Das Flag steuert, ob der Parser als Fallback aktiv sein muss.

**Capabilities steuern Routing:** Die neuen Flags entscheiden, ob `resolveGeminiModel()` aktiviert wird. Beispiel: User wählt `google/gemini-2.0-flash` und das Model hat `imageGeneration: true` — dann wird bei Bild-Requests der Direct Provider genutzt.

**Migration:** Bestehende Capabilities bleiben. Neue Flags sind optional (`?`), Default `undefined`/`false`. Kein Breaking Change.

### 2.3 Quicktask File-Upload-Feld

**Status quo:** Quicktask-Felder unterstützen nur `text`, `textarea`, `select`.

**Anforderung:** Neuer Feldtyp `file` für Audio/Video/Bild-Upload in Quicktasks.

```yaml
fields:
  - key: audio_file
    label: Audiodatei
    type: file
    required: true
    accept: "audio/*"           # MIME-Filter für File-Picker
    maxSize: 25                  # MB, Default aus Storage-Config
```

**Technische Überlegungen:**

- File-Upload nutzt bestehende R2-Infrastruktur (`/api/upload`)
- Quicktask-Form rendert Dropzone/File-Input statt Textarea
- Upload passiert vor dem Chat-Request, File-URL wird als Part mitgesendet
- R2-Validation muss um Audio/Video-Typen erweitert werden (aktuell nur Bilder, PDF, Text, Office)

**Neue MIME-Types für R2:**

| Typ   | MIME                                                              | Extension                |
| ----- | ----------------------------------------------------------------- | ------------------------ |
| Audio | `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/mp4`, `audio/webm` | mp3, wav, ogg, m4a, webm |
| Video | `video/mp4`, `video/webm`                                         | mp4, webm                |

**Max-Size Überlegung:** Audio/Video-Dateien sind deutlich größer als Bilder. 25 MB als Limit für Quicktask-Uploads? Gemini akzeptiert bis 2 GB via File API, aber R2-Upload-Limit und Vercel-Body-Size (4.5 MB bei Serverless) sind Engpässe.

**Offene Frage:** Muss der File-Upload direkt an Gemini's File API gehen statt über R2? Bei großen Dateien könnte R2 als Zwischenspeicher unnötig sein. Alternativ: Client-seitiger Upload direkt zu Google, URL an Chat-Route weiterreichen.

### 2.4 Neue Artifact-Types: `image` und `audio`

**Status quo:** Artifact-Types sind `markdown`, `html`, `code`, `quiz`, `review`. Der `type` ist ein Text-Feld in der DB — neue Types brauchen nur UI-Renderer.

**Neue Types:**

#### `image` Artifact

```typescript
{
  type: "image",
  title: "Logo-Entwurf in Blautönen",
  content: "https://r2.example.com/uploads/user123/abc-logo.png", // R2-URL
  // ODER base64 data-URL für Inline-Preview während Streaming
}
```

- **Renderer:** `src/components/assistant/image-renderer.tsx` (neu)
- **Panel-Actions:** Download (Original-Auflösung), Copy to Clipboard, "Variante generieren" (neuer Prompt)
- **Persistenz:** Bild wird in R2 hochgeladen, URL im Artifact-Content gespeichert
- **Versionierung:** Jede Iteration erzeugt neue Version (wie bei Text-Artifacts)

#### `audio` Artifact

```typescript
{
  type: "audio",
  title: "Podcast-Intro generiert",
  content: "https://r2.example.com/uploads/user123/xyz-speech.mp3",
  metadata: {
    duration: 180,        // Sekunden
    format: "mp3",
    sampleRate: 44100
  }
}
```

- **Renderer:** `src/components/assistant/audio-renderer.tsx` (neu)
- **Panel-Actions:** Download, Play/Pause, Playback-Speed
- **Persistenz:** Audio-Datei in R2, URL im Artifact-Content

**Entscheidung: Artifact-Panel, nicht Inline.**

Das Artifact-System bietet Versionierung, Download, Edit und Persistenz. Inline-Rendering würde das alles duplizieren. Image und Audio folgen dem gleichen Muster wie Quiz und Review: eigene Renderer im bestehenden Panel.

### 2.5 Integration mit dem Generative-UI-System

Das bestehende Generative-UI-System bietet zwei bewährte Patterns, die direkt für Gemini-Features genutzt werden können:

#### Bestehendes System — Kurzübersicht

| Pattern                         | Beispiel                                          | Wo           | Interaktion                         |
| ------------------------------- | ------------------------------------------------- | ------------ | ----------------------------------- |
| **Inline-Tool** (kein execute)  | `ask_user`, `content_alternatives`                | Im Chat-Flow | `addToolResult` Rückkanal zum Model |
| **Artifact-Tool** (mit execute) | `create_artifact`, `create_quiz`, `create_review` | Side-Panel   | Callback → User-Message             |

Beide Patterns haben eine vollständige Pipeline: Tool-Definition → Part-Detection in `chat-message.tsx` → State-Machine (streaming/available/output) → Renderer → Chat-Reload-Kompatibilität via `mapSavedPartsToUI()`.

#### Mapping: Gemini-Features → bestehende Patterns

| Gemini-Feature          | Pattern                                        | Begründung                                                                |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------------------------------- |
| **Bildgenerierung**     | Artifact-Tool (`create_image`)                 | Persistenz + Versionierung + Download nötig. Analog zu `create_artifact`. |
| **TTS-Output**          | Artifact-Tool (`create_audio`)                 | Audio muss in R2 persistiert werden. Player im Panel.                     |
| **STT-Transkription**   | Bestehender `create_artifact` (type: markdown) | Output ist Text. Kein neues Tool nötig, nur Quicktask-Routing.            |
| **Video-Transkription** | Bestehender `create_artifact` (type: markdown) | Output ist Text mit Timestamps. Kein neues Tool nötig.                    |
| **Google Search**       | Neues Inline-Tool (`google_search`)            | Quellen inline im Chat anzeigen, kein Panel nötig.                        |

**Erkenntnis:** Nur 2 der 5 Features brauchen neue Tools. STT und Video-Transkription nutzen den bestehenden `create_artifact` mit Type `markdown` — das Routing zum Gemini Direct Provider passiert auf Chat-Route-Ebene, nicht auf Tool-Ebene.

#### Neue Tools im Detail

**`create_image` — Artifact-Tool (mit execute)**

Folgt dem Pattern von `create_quiz`/`create_review`:

- Factory-Funktion mit `chatId` Closure
- `execute` speichert Bild in R2, erstellt Artifact-DB-Eintrag
- Client: Detection via `isCreateImagePart()` in `chat-message.tsx`
- Renderer: `ImageRenderer` im Artifact-Panel
- Inline: `ArtifactCard` mit Thumbnail-Preview

```
Dateien (analog zu create_quiz):
├── src/lib/ai/tools/create-image.ts        — Tool-Definition + execute
├── src/components/assistant/image-renderer.tsx — Panel-Renderer
├── src/components/chat/chat-message.tsx     — isCreateImagePart() + Rendering
├── src/hooks/use-artifact.ts               — Detection
├── src/components/assistant/artifact-panel.tsx — Panel-Branch
└── src/components/assistant/artifact-utils.ts — Icon (ImageIcon)
```

**`create_audio` — Artifact-Tool (mit execute)**

Gleiches Pattern:

```
Dateien:
├── src/lib/ai/tools/create-audio.ts        — Tool-Definition + execute
├── src/components/assistant/audio-renderer.tsx — Panel-Renderer (HTML5 Player)
├── src/components/chat/chat-message.tsx     — isCreateAudioPart() + Rendering
├── src/hooks/use-artifact.ts               — Detection
├── src/components/assistant/artifact-panel.tsx — Panel-Branch
└── src/components/assistant/artifact-utils.ts — Icon (Volume2Icon)
```

**`google_search` — Inline-Tool (mit execute, kein Artifact)**

Folgt dem Pattern von `content_alternatives`:

- Tool mit `execute` (ruft Gemini Search Grounding auf)
- Ergebnis wird inline im Chat gerendert (Quellen-Cards mit Links)
- Kein Artifact nötig — Suchergebnisse sind ephemer

```
Dateien:
├── src/lib/ai/tools/google-search.ts                — Tool-Definition + execute
├── src/components/generative-ui/search-results.tsx   — Inline-Renderer (Quellen-Cards)
├── src/components/chat/chat-message.tsx              — CUSTOM_RENDERED_TOOLS + Rendering
└── src/components/chat/tool-status.tsx               — Icon (SearchCheck)
```

#### Interaktions-Rückkanal für Bild-Iteration

Das Artifact-System hat bereits einen Rückkanal: Quiz-Ergebnisse und Review-Feedback werden als User-Message in den Chat gesendet. Für Bildgenerierung nutzen wir das gleiche Pattern:

```
User: "Erstelle ein Logo in Blautönen"
  → create_image Tool → Bild im Panel
User klickt "Variante generieren" im Panel
  → Panel sendet User-Message: "Erstelle eine Variante: [Kontext vom vorherigen Bild]"
  → Neuer create_image Call → Neue Version im Panel
```

Das funktioniert ohne neuen Mechanismus — der bestehende `onComplete`-Callback der Artifact-Renderer (`onQuizComplete`, `onReviewComplete`) wird um `onImageIterate` erweitert.

#### Chat-Reload-Kompatibilität

Alle neuen Tools müssen in `mapSavedPartsToUI()` (`use-artifact.ts`) registriert werden. Das Mapping konvertiert DB-Parts (`tool-call`/`tool-result`) zurück zu AI SDK 6 typed parts mit korrektem State. Dadurch zeigt ein neu geladener Chat:

- Generierte Bilder als ArtifactCard (klickbar → Panel mit Bild)
- Generierte Audio als ArtifactCard (klickbar → Panel mit Player)
- Google-Search-Ergebnisse als Inline-Quellen-Cards (read-only)

---

## 3. Feature 1: Native Bildgenerierung

### User Stories

1. **Als User** möchte ich im Chat ein Bild beschreiben und es direkt generiert bekommen, ohne ein externes Tool zu nutzen.
2. **Als User** möchte ich ein generiertes Bild iterieren ("mach den Hintergrund dunkler"), ohne den Kontext zu verlieren.
3. **Als User** möchte ich über den image-prompt Quicktask einen detaillierten Prompt eingeben und ein Bild als Artifact erhalten.
4. **Als User** möchte ich ein bestehendes Bild hochladen und bearbeiten lassen (Hintergrund entfernen, Stil ändern).

### Wie es funktioniert (Gemini Imagen / Gemini 2.0 Flash)

Gemini generiert Bilder nativ innerhalb des Conversation-Turns. Die Interactions API liefert Text und Bilder im selben Response-Stream. Kein separater API-Call nötig.

**Zwei Ansätze:**

| Ansatz                                     | API                                                           | Vorteil                                        | Nachteil                                  |
| ------------------------------------------ | ------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------- |
| **Gemini 2.0 Flash** (Imagen 3 integriert) | `generateContent` mit `responseModalities: ["TEXT", "IMAGE"]` | Conversational, Edit-Fähig, Text+Bild gemischt | Nur über Direct Provider, nicht Gateway   |
| **Imagen 3 standalone**                    | Eigener API-Endpoint                                          | Höhere Bildqualität, mehr Kontrolle            | Kein Conversation-Kontext, separater Call |

**Empfehlung:** Gemini 2.0 Flash für den Chat-Flow (conversational), Imagen 3 standalone als Option für den image-prompt Quicktask (maximale Qualität).

### Requirements

#### Must Have

- [ ] Bild-Output als `image` Artifact im Panel (Download, Zoom)
- [ ] R2-Upload des generierten Bildes (Persistenz über Session hinaus)
- [ ] Iteration: "Ändere X am Bild" nutzt vorheriges Bild als Kontext
- [ ] image-prompt Quicktask Upgrade: Generiert echtes Bild statt nur Prompt-Text

#### Should Have

- [ ] Bild-Upload als Input (Edit bestehender Bilder)
- [ ] Auflösungs-/Stil-Optionen (im Quicktask als Select-Feld)
- [ ] Inline-Preview im Chat (Thumbnail), Full-Size im Panel

#### Could Have

- [ ] Batch-Generierung (4 Varianten gleichzeitig)
- [ ] Aspect-Ratio Auswahl (1:1, 16:9, 9:16)

### Technische Überlegungen

**AI SDK Integration:**

```typescript
// Pseudocode — exakte API via context7 verifizieren
import { google } from "@ai-sdk/google"

const result = await generateContent({
  model: google("gemini-2.0-flash-exp", {
    responseModalities: ["TEXT", "IMAGE"],
  }),
  messages: [...],
})

// Response enthält text + image parts
for (const part of result.parts) {
  if (part.type === "image") {
    // Base64-Daten → R2 Upload → Artifact erstellen
  }
}
```

**Streaming-Problem:** Bilder können nicht gestreamt werden (kein progressives Rendering). Der Image-Part kommt erst am Ende des Response. UX: ArtifactCard zeigt Skeleton/Spinner im State `input-streaming`, Bild erscheint bei `output-available` — analog zum Quiz-Renderer.

**Tool-Calling:** Da Bildgenerierung über den Direct Provider (`@ai-sdk/google`) läuft, steht echtes Tool-Calling zur Verfügung. `create_image` als eigenständiges Artifact-Tool (siehe Foundation 2.5). Für Standard-Gemini-Chats (Text-only) bleibt der Gateway mit Fake-Artifact-Parser als bewährter Fallback.

**Generative-UI-Integration:** Neues `create_image` Artifact-Tool folgt exakt dem `create_quiz`-Pattern (Factory mit chatId, execute mit R2-Upload + DB-Insert). Iteration über den bestehenden Artifact-Rückkanal (`onImageIterate` → User-Message). Details in Foundation 2.5.

**Content-Moderation:** Gemini hat eingebaute Safety-Filter. Abgelehnte Bilder (NSFW, Copyright) kommen als Text-Antwort zurück. UI muss diesen Fall graceful handeln — `output-error` State im Tool-Part.

### Offene Fragen

1. **Kosten:** Gemini Image-Generation verbraucht deutlich mehr Tokens/Credits. Wie wird das im Credit-System abgebildet? Fixer Aufschlag pro Bild?
2. **Rate Limits:** Gemini Image-Gen hat strenge Rate Limits (aktuell ~10 Bilder/Minute). Brauchen wir ein eigenes Limit neben dem Chat-Rate-Limit?
3. **NSFW-Filter:** Gemini blockiert bestimmte Inhalte. Wie kommunizieren wir das dem User? Generische Fehlermeldung oder spezifischer Hinweis?

---

## 4. Feature 2: Audio-Quicktasks

### User Stories

1. **Als User** möchte ich eine Audiodatei (Meeting-Aufnahme, Podcast) hochladen und eine Transkription als Artifact erhalten.
2. **Als User** möchte ich einen Text eingeben und als Sprach-Audio zurückbekommen (z.B. für Podcast-Intros, Voiceover).
3. **Als User** möchte ich Multi-Speaker-Audio generieren (Dialog zwischen zwei Stimmen).

### Quicktask: Speech-to-Text

```yaml
name: Audio-Transkription
slug: audio-transcription
mode: quicktask
category: Audio
icon: Mic
outputAsArtifact: true
modelId: google/gemini-2.0-flash
fields:
  - key: audio_file
    label: Audiodatei
    type: file                    # NEU — Foundation 2.3
    required: true
    accept: "audio/*"
  - key: language
    label: Sprache
    type: select
    options: ["Deutsch", "Englisch", "Auto-Erkennung"]
    required: false
  - key: output_format
    label: Ausgabeformat
    type: select
    options: ["Reiner Text", "Mit Zeitstempeln", "SRT-Untertitel"]
    required: false
```

**Technischer Flow:**

1. User wählt Quicktask, lädt Audio hoch (→ R2)
2. Quicktask-Form sendet R2-URL + Optionen als Chat-Message
3. Chat-Route erkennt Gemini-Model + Audio-File → Direct Provider
4. Gemini transkribiert → Output als `markdown` oder `code` (SRT) Artifact

**Einschränkung:** Gemini akzeptiert Audio-Input nativ (Inline-Daten oder File-URL). Die R2-URL ist keine Google-File-API-URL. Entweder:

- Audio als Base64 inline senden (bis ~10 MB machbar)
- Oder Google File API für Upload nutzen (für größere Dateien)

### Quicktask: Text-to-Speech

```yaml
name: Text zu Sprache
slug: text-to-speech
mode: quicktask
category: Audio
icon: Volume2
outputAsArtifact: true
modelId: google/gemini-2.5-flash-preview-tts
fields:
  - key: text
    label: Text
    type: textarea
    required: true
    placeholder: "Der zu sprechende Text..."
  - key: voice
    label: Stimme
    type: select
    options: ["Zephyr (weiblich)", "Puck (männlich)", "Charon (tief)", "Kore (warm)"]
    required: false
  - key: speed
    label: Geschwindigkeit
    type: select
    options: ["Langsam", "Normal", "Schnell"]
    required: false
```

**Technischer Flow:**

1. User gibt Text + Stimme ein
2. Chat-Route nutzt Gemini TTS-Modell (Direct Provider)
3. Audio-Response → R2-Upload → `audio` Artifact via `create_audio` Tool (siehe Foundation 2.5)

**Generative-UI-Integration:** TTS nutzt das neue `create_audio` Artifact-Tool. Der AudioRenderer im Panel bietet Play/Pause, Download und Playback-Speed. STT hingegen braucht kein neues Tool — das Ergebnis ist Text und nutzt den bestehenden `create_artifact` mit Type `markdown`.

**Multi-Speaker:**

```yaml
name: Dialog-Audio
slug: multi-speaker-audio
mode: quicktask
category: Audio
icon: Users
outputAsArtifact: true
fields:
  - key: script
    label: Dialog-Script
    type: textarea
    required: true
    placeholder: |
      Sprecher 1: Willkommen zum Podcast...
      Sprecher 2: Danke für die Einladung...
  - key: voice_1
    label: Stimme Sprecher 1
    type: select
    options: ["Zephyr", "Puck", "Charon", "Kore"]
  - key: voice_2
    label: Stimme Sprecher 2
    type: select
    options: ["Zephyr", "Puck", "Charon", "Kore"]
```

### Requirements

#### Must Have

- [ ] File-Upload-Feld in Quicktasks (Foundation 2.3)
- [ ] STT Quicktask: Audio → Markdown-Artifact (Transkription)
- [ ] TTS Quicktask: Text → Audio-Artifact mit Player
- [ ] R2-Upload für generierte Audio-Dateien

#### Should Have

- [ ] Multi-Speaker TTS mit Stimmenauswahl pro Sprecher
- [ ] Sprach-Erkennung (Auto-Detect) bei STT
- [ ] SRT-Export bei Transkription

#### Could Have

- [ ] Inline-Audio-Player im Chat (ohne Artifact-Panel)
- [ ] Audio-Edit im Panel (Trim, Speed-Anpassung)

### Offene Fragen

1. **File-Size:** Gemini akzeptiert bis 2 GB Audio. Vercel Serverless hat 4.5 MB Body-Limit. Muss der Upload direkt an Google File API gehen? Oder reicht Base64 für typische Meeting-Aufnahmen?
2. **Kosten:** TTS-Pricing ist token-basiert (Input-Text-Länge). Wie bildet das Credit-System das ab? Fixer Aufschlag oder proportional?
3. **Latenz:** TTS-Generierung kann mehrere Sekunden dauern. Streaming-Audio oder erst nach Completion abspielen?
4. **Stimmen:** Gemini bietet ~30 Stimmen. Welche Auswahl für die MVP-Quicktasks? Deutschsprachige Stimmen priorisieren.

---

## 5. Feature 3: Video-Transkription Quicktask

### User Stories

1. **Als User** möchte ich eine YouTube-URL eingeben und eine strukturierte Transkription erhalten.
2. **Als User** möchte ich Key-Moments mit Zeitstempeln als Quick-Buttons sehen, um direkt zu relevanten Stellen zu springen.
3. **Als User** möchte ich eine Zusammenfassung des Videos als Markdown-Artifact erhalten.

### Quicktask: YouTube-Transkription

```yaml
name: Video-Transkription
slug: video-transcription
mode: quicktask
category: Content
icon: Youtube
outputAsArtifact: true
modelId: google/gemini-2.0-flash
fields:
  - key: youtube_url
    label: YouTube-URL
    type: text
    required: true
    placeholder: "https://www.youtube.com/watch?v=..."
  - key: output_type
    label: Ausgabe
    type: select
    options: ["Zusammenfassung", "Vollständige Transkription", "Key-Moments", "Alles"]
    required: false
```

**Technischer Flow:**

1. User gibt YouTube-URL ein
2. Validierung: URL-Format prüfen (YouTube-Regex)
3. Chat-Route: YouTube-URL als `file` Part an Gemini (Direct Provider)
4. Gemini analysiert Video → Output als `markdown` Artifact

**Key-Moments Format:**

```markdown
## Key Moments

- **[0:00]** Einleitung und Vorstellung
- **[2:34]** Hauptthese: Warum X wichtig ist
- **[8:12]** Praxisbeispiel: Firma Y
- **[15:00]** Zusammenfassung und Takeaways
```

Timestamps könnten als Links gerendert werden, die zum YouTube-Player mit Zeitstempel navigieren (`?t=154`).

### Requirements

#### Must Have

- [ ] YouTube-URL als Input (Validierung im Quicktask-Form)
- [ ] Zusammenfassung als Markdown-Artifact
- [ ] Key-Moments mit Zeitstempeln

#### Should Have

- [ ] Vollständige Transkription mit Speaker-Labels
- [ ] Timestamp-Links die zu YouTube navigieren
- [ ] Sprach-Erkennung (DE/EN)

#### Could Have

- [ ] Video-Upload statt nur YouTube-URL (via File-Upload-Feld)
- [ ] Chapter-basierte Navigation im Artifact

### Technische Überlegungen

**Gemini Video-Input:** Gemini akzeptiert YouTube-URLs direkt als Input (kein Download nötig). Das vereinfacht den Flow erheblich — kein R2-Upload, keine File-Size-Probleme.

**Einschränkung:** Gemini's YouTube-Support hat Limits:

- Maximale Video-Länge: ~1 Stunde (verifizieren via Docs)
- Nur öffentliche Videos (kein Auth-Flow für private Videos)
- Rate Limits für Video-Processing

### Offene Fragen

1. **Video-Upload:** Soll neben YouTube-URLs auch direkter Video-Upload möglich sein? Erhöht Komplexität (File-Size, Processing-Zeit) erheblich.
2. **Sprache:** Funktioniert die Transkription zuverlässig für deutschsprachige Videos?
3. **Copyright:** Gibt es Einschränkungen bei der Transkription urheberrechtlich geschützter Inhalte?

---

## 6. Feature 4: Google Search Grounding

### User Stories

1. **Als User** möchte ich eine Behauptung fakten-checken lassen, mit Quellenangaben.
2. **Als User** möchte ich aktuelle Informationen zu einem Thema erhalten, die über das Trainings-Cutoff hinausgehen.

### Abgrenzung zu Firecrawl

| Aspekt       | Firecrawl (bestehend)           | Google Search Grounding                   |
| ------------ | ------------------------------- | ----------------------------------------- |
| **Zweck**    | Webseiten scrapen, durchsuchen  | Fakten verifizieren                       |
| **Trigger**  | `web_search` / `web_fetch` Tool | Eigenes `fact_check` Tool oder Model-Flag |
| **Output**   | Raw Content (Markdown)          | Behauptung + Quellen + Confidence         |
| **Kosten**   | Firecrawl-Credits               | Google API (in Gemini-Preis enthalten)    |
| **Provider** | Provider-agnostisch             | Nur Gemini                                |

Google Search Grounding ist kein Ersatz für Firecrawl. Es ist ein Zusatz-Tool für Verifikation.

### Mögliche Integration

**Option A: Als eigenes Tool (`google_search`)**

```typescript
// Nur verfügbar wenn Gemini-Model aktiv + Capability-Flag
tool("google_search", {
  description: "Verifiziere Fakten und finde aktuelle Informationen via Google Search",
  parameters: z.object({
    query: z.string().describe("Die zu verifizierende Behauptung oder Suchanfrage"),
  }),
  execute: async ({ query }) => {
    // Gemini mit googleSearchRetrieval Tool
    // Gibt grounded Response mit Quellen zurück
  }
})
```

**Option B: Als Model-Config-Flag**

```typescript
// Google Search als "Tool" des Models, nicht der App
const model = google("gemini-2.0-flash", {
  useSearchGrounding: true, // Aktiviert für alle Responses
})
```

**Empfehlung:** Option A (eigenes Tool). Der User/Expert entscheidet wann Search-Grounding nötig ist, nicht das System. Sonst werden alle Antworten langsamer und teurer.

### Generative-UI-Integration

Google Search Grounding wird als **Inline-Tool mit Custom-Rendering** umgesetzt — das gleiche Pattern wie `content_alternatives`:

- Tool mit `execute` (ruft Gemini mit Search Grounding auf)
- Ergebnis: Strukturierte Quellen-Daten (URL, Titel, Snippet, Confidence)
- Neue Komponente: `src/components/generative-ui/search-results.tsx`
- Registrierung in `CUSTOM_RENDERED_TOOLS` in `chat-message.tsx`
- Inline-Rendering als Quellen-Cards mit klickbaren Links

```typescript
// Beispiel: SearchResults Component
interface SearchResult {
  url: string
  title: string
  snippet: string
  confidence?: number
}

// Rendert als kompakte Card-Liste im Chat-Flow
// Analog zu content_alternatives, aber read-only (kein Rückkanal nötig)
```

**Warum Inline statt Artifact?** Suchergebnisse sind kontextgebunden und ephemer — sie gehören zur Konversation, nicht als eigenständiges Dokument ins Panel. Das bestehende `web_search` Tool zeigt Ergebnisse bereits als ToolStatus. Google Search bekommt ein visuell aufgewertetes Rendering mit Quellen-Cards.

### Requirements

#### Must Have

- [ ] Faktencheck-Tool mit Quellenangaben
- [ ] Quellen als klickbare Links inline im Chat (Custom Renderer)
- [ ] Nur aktiv bei Gemini-Modellen (graceful degrade bei anderen)

#### Should Have

- [ ] Confidence-Score pro Quelle (visuell als Badge)
- [ ] Integration mit Researcher-Expert (automatisch aktiv)

#### Could Have

- [ ] Vergleich: Model-Antwort vs. Ground-Truth (Side-by-Side)
- [ ] Inline Grounding-Badges bei Behauptungen

### Offene Fragen

1. **Tool vs. Flag:** Soll Google Search als explizites Tool oder als Model-Konfiguration laufen?
2. **Kosten:** Ist Google Search in den Gemini-API-Kosten enthalten oder separat?
3. **Kombination:** Wie verhält sich Google Search Grounding wenn gleichzeitig Firecrawl `web_search` verfügbar ist? Klare Rollentrennung nötig.

---

## 7. Phasenplan

### Phase 0: Foundation (Voraussetzung für alles)

```
Dauer: ~1 Woche
Abhängigkeiten: Keine
Risiko: Gering — Gateway bleibt unangetastet, nur Ergänzung

□ @ai-sdk/google installieren + konfigurieren
□ gemini-provider.ts anlegen (analog zu privacy-provider.ts)
□ Chat-Route: resolveGeminiModel() in die Model-Kaskade einbauen
□ Model-Capabilities Schema erweitern (Migration)
□ Gemini-Modelle in DB mit neuen Capability-Flags
□ Feature-Flag: features.gemini.enabled (opt-in via GOOGLE_GENERATIVE_AI_API_KEY)
□ Smoke-Test: Gemini Direct Provider im Chat (Text-only, verifizieren dass Fallback auf Gateway funktioniert)
□ Smoke-Test: Standard-Chats unverändert (Regression-Check)
```

### Phase 1: Native Bildgenerierung

```
Dauer: ~2 Wochen
Abhängigkeiten: Foundation

Generative-UI (Artifact-Tool Pattern — wie create_quiz):
□ create_image Tool-Definition (Factory mit chatId, execute mit R2-Upload)
□ ImageRenderer Komponente (src/components/assistant/image-renderer.tsx)
□ isCreateImagePart() Detection in chat-message.tsx
□ Panel-Branch in artifact-panel.tsx
□ Icon + artifactTypeToIcon Erweiterung
□ mapSavedPartsToUI() Erweiterung für Chat-Reload

Feature-Logik:
□ R2-Upload für generierte Bilder (Base64 → R2)
□ Bild-Iteration via Artifact-Rückkanal (onImageIterate → User-Message)
□ image-prompt Quicktask Upgrade
□ Content-Moderation Handling (Safety-Filter → output-error State)
```

### Phase 2: Audio-Quicktasks

```
Dauer: ~2 Wochen
Abhängigkeiten: Foundation + Quicktask File-Upload

Foundation-Erweiterung:
□ Quicktask File-Upload-Feld (Foundation 2.3)
□ R2-Validation: Audio MIME-Types

Generative-UI (Artifact-Tool Pattern — wie create_quiz):
□ create_audio Tool-Definition (Factory mit chatId, execute mit R2-Upload)
□ AudioRenderer Komponente (src/components/assistant/audio-renderer.tsx)
□ isCreateAudioPart() Detection in chat-message.tsx
□ Panel-Branch in artifact-panel.tsx
□ mapSavedPartsToUI() Erweiterung

Feature-Logik:
□ STT Quicktask: nutzt bestehenden create_artifact (type: markdown) — kein neues Tool
□ TTS Quicktask: nutzt create_audio für Output
□ Multi-Speaker TTS
```

### Phase 3: Video-Transkription

```
Dauer: ~1 Woche
Abhängigkeiten: Foundation (kein File-Upload nötig, YouTube-URL reicht)

□ Video-Transkription Quicktask
□ YouTube-URL Validierung
□ Key-Moments Format + Timestamp-Links
□ Output-Optionen (Summary / Full / Key-Moments)

Kein neues Generative-UI-Tool nötig — Output ist Markdown via bestehenden create_artifact.
```

### Phase 4: Google Search Grounding

```
Dauer: ~1 Woche
Abhängigkeiten: Foundation

Generative-UI (Inline-Tool Pattern — wie content_alternatives):
□ google_search Tool-Definition (mit execute)
□ SearchResults Komponente (src/components/generative-ui/search-results.tsx)
□ CUSTOM_RENDERED_TOOLS Registrierung in chat-message.tsx
□ mapSavedPartsToUI() Erweiterung für Chat-Reload

Feature-Logik:
□ Quellen-Rendering als Cards mit Links + Confidence
□ Expert-Integration (Researcher)
```

### Abhängigkeits-Graph

```
Foundation ──┬── Phase 1 (Bildgenerierung)
             ├── Phase 2 (Audio) ← braucht auch File-Upload-Feld
             ├── Phase 3 (Video)
             └── Phase 4 (Search Grounding)
```

Phase 1-4 sind untereinander unabhängig. Jede Phase kann einzeln implementiert und released werden.

---

## 8. Technische Einschränkungen

| Einschränkung                             | Impact                             | Workaround                                                           |
| ----------------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| Gateway unterstützt keine Gemini-Features | Direct Provider nötig              | `resolveGeminiModel()` neben Gateway (wie Privacy-Provider, bewährt) |
| Gemini Tool-Calling nur via Direct        | Fake-Artifact-Parser bei Gateway   | Direct Provider für Gemini-Features hat echtes Tool-Calling          |
| Vercel Serverless 4.5 MB Body-Limit       | Audio/Video-Upload limitiert       | Google File API für große Dateien oder Client-Direct-Upload          |
| Quicktask-Felder nur text/textarea/select | Kein File-Upload möglich           | Foundation 2.3 muss zuerst gebaut werden                             |
| Credit-System token-basiert               | Bild/Audio-Kosten schwer abbildbar | Fixer Aufschlag pro Medien-Generierung                               |
| R2 Max 10 MB Upload                       | Reicht nicht für lange Audio/Video | Limit erhöhen oder Google File API nutzen                            |
| Gateway bleibt für Standard-Chats         | Zwei Routing-Pfade zu warten       | Pattern ist bewährt (Privacy-Provider), kein zusätzliches Risiko     |

---

## 9. Offene Entscheidungen

1. **Priorität:** Welches Feature zuerst nach Foundation? Bildgenerierung hat den höchsten User-Wert, Audio die höchste Novelty.
2. **Credit-Modell für Medien:** Token-basiert (wie Text) oder fixer Aufschlag pro Generierung?
3. **File-Upload-Architektur:** R2 als Zwischenspeicher oder direkter Upload an Google File API?
4. **Scope von Phase 1:** Reicht Gemini 2.0 Flash (conversational) oder brauchen wir auch Imagen 3 standalone (maximale Qualität)?
5. **Feature-Flags:** Ein Flag pro Feature (`GEMINI_IMAGE_GEN=true`) oder ein globales via `GOOGLE_GENERATIVE_AI_API_KEY` (analog zum bestehenden Opt-in-Pattern)?
6. **Gateway-Migration langfristig:** Wenn alle Provider Direct Packages nutzen, lohnt sich der Gateway-Overhead noch? Periodisch re-evaluieren, aber nicht proaktiv migrieren.

---

## 10. Nicht in Scope

- **Gemini Live / Realtime API** — Bidirektionales Audio-Streaming (zu komplex für MVP)
- **Gemini Code Execution** — Sandboxed Python/JS (Nice-to-have, aber kein Kernfeature)
- **Fine-Tuning** — Gemini-Modelle tunen (Enterprise-Feature)
- **Gemini Context Caching** — Kostenoptimierung (erst bei hohem Volumen relevant)
- **Multimodal Chat** — Bilder/Audio als reguläre Chat-Inputs (M5 File Upload deckt Bilder bereits ab)
