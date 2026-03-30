# PRD: Meeting Recorder & Notetaker

> Audio-Aufnahme mit KI-gestuetzter Transkription, Zusammenfassung und automatischer Artifact-Erstellung.
> **Status:** Entwurf
> **Prioritaet:** Mittel
> **Stand:** 2026-03-28

---

## 1. Kontext und Ziel

### Problem

Meetings, Telefongespraeche und Brainstorming-Sessions erzeugen wertvolle Informationen, die oft verloren gehen. Manuelle Notizen sind unvollstaendig, nachtraegliches Zusammenfassen kostet Zeit. Externe Meeting-Recorder (Otter, Fireflies) sind eigenstaendige Tools ohne Verbindung zum Projekt-Kontext.

### Loesung

Ein **Meeting Recorder** innerhalb der Chat-Plattform. Der User startet eine Aufnahme (z.B. waehrend eines Meetings, Telefonats oder Brainstormings), die Plattform transkribiert das Audio und generiert automatisch ein strukturiertes Artifact mit:

- **Zusammenfassung** — Die wichtigsten Punkte auf einen Blick
- **Action Items** — Konkrete naechste Schritte mit Zuordnung
- **Key Decisions** — Getroffene Entscheidungen
- **Vollstaendiges Transcript** — Durchsuchbar, referenzierbar

Durch die Projekt-Zuordnung kennt die KI den Kontext und kann relevanter zusammenfassen.

### Warum jetzt

- Gemini unterstuetzt Audio-Input nativ (multimodal, bis zu mehrere Stunden Audio)
- `@google/genai` SDK bereits im Projekt
- Artifact-System (Markdown, HTML) existiert und ist erprobt
- Projekt-System liefert Kontext fuer kontextbewusste Zusammenfassungen
- Browser MediaRecorder API ist ausgereift und breit unterstuetzt

### Abgrenzung zu Voice Chat

| Kriterium | Voice Chat (separates PRD) | Meeting Recorder |
|-----------|---------------------------|-----------------|
| Richtung | Bidirektional (Dialog mit KI) | Unidirektional (KI hoert zu) |
| Zweck | Konversation, Coaching, Brainstorming mit KI | Aufzeichnung externer Gespraeche |
| API | Gemini Live API (WebSocket, Echtzeit) | Gemini Multimodal (HTTP, Batch) |
| KI-Rolle | Aktiver Gespraechspartner | Passiver Zuhoerer + Analyst |
| Output | Chat-Messages (Transcript) | Strukturiertes Artifact |
| Latenz | Echtzeit (~500ms) | Batch (nach Aufnahme-Ende) |

---

## 2. User Experience

### Ablauf

```
1. User oeffnet die Plattform (optional: in einem Projekt-Kontext)
   → Im PromptInput-Bereich: "Aufnahme starten" Button

2. User drueckt "Aufnahme starten"
   → Browser fragt Mikrofon-Berechtigung (einmalig)
   → Aufnahme-Overlay erscheint
   → Timer laeuft, Waveform-Visualizer zeigt Audio-Level
   → User kann Aufnahme jederzeit pausieren/fortsetzen

3. Waehrend der Aufnahme
   → User fuehrt sein Meeting, Telefonat oder Brainstorming
   → Optional: User kann Textnotizen im Overlay hinzufuegen
     ("Marker: Entscheidung zu Budget getroffen")
   → Optional: User kann Sprecher taggen
     ("Ab hier spricht Maria")

4. User drueckt "Aufnahme beenden"
   → Overlay zeigt: "Wird verarbeitet..."
   → Audio wird an Gemini gesendet (chunked upload)
   → KI transkribiert und analysiert

5. Ergebnis: Artifact wird erstellt
   → Markdown-Artifact mit strukturierten Sektionen
   → Automatisch dem aktuellen Chat/Projekt zugeordnet
   → User kann Artifact bearbeiten, teilen, exportieren
```

### Beispiel-Output (Artifact)

```markdown
# Meeting Notes: Sprint Planning Q3

> Aufgenommen am 28.03.2026 | Dauer: 23 Minuten
> Projekt: Content-Strategie Q3

## Zusammenfassung

Das Team hat die Prioritaeten fuer Q3 besprochen. Fokus liegt auf
drei Saeulen: LinkedIn-Content-Serie, Workshop-Landing-Pages und
Newsletter-Relaunch. Budget wurde auf 12.000 EUR festgelegt.

## Key Decisions

1. LinkedIn-Serie startet in KW 16 (Rico verantwortlich)
2. Newsletter-Tool wechselt von Mailchimp zu Loops
3. Workshop-Landing-Pages werden mit neuem Design-System gebaut

## Action Items

- [ ] Rico: LinkedIn-Content-Plan fuer KW 16-20 erstellen (bis 04.04.)
- [ ] Maria: Loops-Account einrichten und Migration planen
- [ ] Team: Design-System Review am Donnerstag 14:00

## Offene Punkte

- Budget-Verteilung zwischen LinkedIn Ads und organischem Content
- Gastartikel-Strategie noch unklar

## Transcript

**00:00** Rico: "Okay, lass uns mit den Prioritaeten anfangen..."
**00:45** Maria: "Ich wuerde vorschlagen, dass wir den Newsletter..."
**02:30** Rico: "Guter Punkt. Zum Budget..."
[...]
```

### Beispiel-Szenarien

- **Kunden-Call:** Telefonat aufnehmen → Action Items + Follow-Up Draft
- **Brainstorming:** Solo-Brainstorming einsprechen → strukturierte Ideensammlung
- **Workshop-Vorbereitung:** Gedanken einsprechen → Workshop-Outline als Artifact
- **Projekt-Update:** Status-Meeting aufnehmen → Zusammenfassung fuer Projekt-Dokumente
- **Interview/Recherche:** Expertengespraech aufnehmen → Key Insights extrahieren

---

## 3. Architektur

### Ueberblick

Der Meeting Recorder nutzt **keine** Echtzeit-API. Audio wird lokal aufgenommen, nach Ende der Aufnahme als Batch an Gemini geschickt, und das Ergebnis als Artifact gespeichert.

```
Browser (MediaRecorder API)
  → Audio-Aufnahme (WebM/Opus oder WAV)
  → Lokaler Buffer (Client-seitig)

Nach Aufnahme-Ende:
  Client → POST /api/meeting-recorder/process
    Body: Audio-Datei + Metadata (Projekt-ID, Marker, Sprecher-Tags)

  Server:
    → Audio an Gemini senden (multimodal Input)
    → Prompt: "Transkribiere und analysiere dieses Meeting"
    → Projekt-Kontext als zusaetzlicher Kontext
    → Strukturiertes Ergebnis empfangen
    → Markdown-Artifact erstellen
    → Credits abziehen

  Client ← Artifact-ID + Zusammenfassung
```

### Warum Batch statt Echtzeit

| Aspekt | Echtzeit (Live API) | Batch (Multimodal) |
|--------|--------------------|--------------------|
| Komplexitaet | Hoch (WebSocket, Audio-Pipeline) | Niedrig (File Upload + API Call) |
| Kosten | Minutenbasiert waehrend Aufnahme | Nur Token-basiert fuer Verarbeitung |
| Qualitaet | Streaming-Transkription (inkrementell) | Vollstaendiges Audio → bessere Transkription |
| Latenz | Echtzeit-Transcript | Wartezeit nach Aufnahme (~30s-2min) |
| Ausfallsicherheit | WebSocket kann abbrechen | Audio lokal gespeichert, Retry moeglich |

Fuer den Recording-Use-Case ist Batch besser: Die Transkription muss nicht in Echtzeit sein, und die Qualitaet ist hoeher wenn Gemini das gesamte Audio auf einmal verarbeiten kann.

### Audio-Limits

| Parameter | Wert | Quelle |
|-----------|------|--------|
| Max Audio-Laenge | ~60 Minuten | Gemini API Limit (multimodal) |
| Audio-Format | WebM/Opus (Browser-nativ) oder WAV | MediaRecorder API |
| Max Dateigroesse | ~100 MB | Praxis-Limit fuer Upload |
| Verarbeitungszeit | ~30s-2min je nach Laenge | Geschaetzt |

---

## 4. Implementierung

### 4.1 Feature Flag

**Datei:** `src/config/features.ts`

```typescript
meetingRecorder: {
  enabled: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
    && process.env.MEETING_RECORDER_ENABLED === "true",
},
```

**ENV-Variablen:**

| Variable | Required | Default | Beschreibung |
|----------|----------|---------|-------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Ja | - | Bereits vorhanden |
| `MEETING_RECORDER_ENABLED` | Ja | - | Explizites Opt-in |
| `MEETING_RECORDER_MAX_DURATION` | Nein | `3600` | Max Aufnahme-Dauer in Sekunden (Default: 60 Min) |
| `MEETING_RECORDER_CREDITS_PER_MINUTE` | Nein | `3000` | Credits pro Minute aufgenommenem Audio |

---

### 4.2 Process Endpoint

**Neue Datei:** `src/app/api/meeting-recorder/process/route.ts`

```
POST /api/meeting-recorder/process
Content-Type: multipart/form-data
Body:
  - audio: File (WebM/Opus oder WAV)
  - chatId: string
  - projectId?: string
  - markers?: JSON string (Array<{ timestamp: number, text: string }>)
  - speakerTags?: JSON string (Array<{ timestamp: number, speaker: string }>)
  - language?: string (default: "de")

Response: {
  artifactId: string,
  title: string,
  summary: string,
  durationSeconds: number,
  creditsDeducted: number,
}
```

```
maxDuration = 300  // 5 Minuten fuer Verarbeitung
```

**Ablauf:**

1. `requireAuth()` + Feature-Check
2. Rate-Limit: `meetingRecorder: 5/min`
3. Audio-Datei validieren (Format, Groesse, Dauer)
4. Credit-Check (geschaetzte Kosten basierend auf Dateigroesse)
5. Projekt-Kontext laden (wenn `projectId`)
6. Prompt zusammenbauen (siehe 4.3)
7. Audio + Prompt an Gemini senden (`generateContent` mit multimodal Input)
8. Ergebnis parsen (strukturierter Markdown)
9. Artifact erstellen (`type: "markdown"`)
10. Audio-Datei auf R2 hochladen (optional, fuer spaetere Wiedergabe)
11. Credits abziehen
12. Usage loggen
13. Artifact-ID + Summary zurueckgeben

---

### 4.3 Analyse-Prompt

Der Prompt an Gemini kombiniert die Audio-Datei mit Kontext-Informationen:

```markdown
Du bist ein professioneller Meeting-Assistent. Transkribiere und analysiere
die folgende Audio-Aufnahme.

## Aufgabe
1. Erstelle ein vollstaendiges Transcript mit Zeitstempeln
2. Identifiziere Sprecher wenn moeglich (oder nutze "Sprecher 1", "Sprecher 2")
3. Fasse die wichtigsten Punkte zusammen
4. Extrahiere Action Items mit Verantwortlichen und Deadlines
5. Liste getroffene Entscheidungen auf
6. Identifiziere offene Punkte

## Ausgabe-Format
Erstelle ein Markdown-Dokument mit diesen Sektionen:
- Zusammenfassung (3-5 Saetze)
- Key Decisions (nummerierte Liste)
- Action Items (Checkbox-Liste mit Verantwortlichen und Deadlines)
- Offene Punkte (falls vorhanden)
- Vollstaendiges Transcript (mit Zeitstempeln und Sprecher-Zuordnung)

## Sprache
Antworte auf Deutsch. Das Audio kann Deutsch oder Englisch sein.

{projektKontext}  ← Wenn Projekt zugeordnet
{markerNotizen}   ← Wenn User Marker gesetzt hat
{sprecherTags}    ← Wenn User Sprecher getaggt hat
```

Projekt-Kontext wird angehaengt wenn verfuegbar:

```markdown
## Projekt-Kontext
Dieses Meeting gehoert zum Projekt "{projektName}".
{projekt.instructions}

Projekt-Dokumente:
{dokumente als Kontext}

Beziehe dich in der Zusammenfassung auf den Projekt-Kontext wenn relevant.
```

---

### 4.4 Credits

**Datei:** `src/lib/credits.ts`

```typescript
const MEETING_RECORDER_CREDITS_PER_MINUTE = parseInt(
  process.env.MEETING_RECORDER_CREDITS_PER_MINUTE ?? "3000", 10
)

export function calculateMeetingRecorderCredits(durationSeconds: number): number {
  return Math.max(1, Math.ceil((durationSeconds / 60) * MEETING_RECORDER_CREDITS_PER_MINUTE))
}
```

### Kosten-Kalkulation

| Aufnahme-Dauer | Google-Kosten (geschaetzt) | Credits (Default) |
|----------------|---------------------------|-------------------|
| 10 Minuten | ~$0.02 | 30.000 |
| 30 Minuten | ~$0.06 | 90.000 |
| 60 Minuten (Max) | ~$0.12 | 180.000 |

Guenstiger als Voice Chat, da keine Echtzeit-Verarbeitung. Audio-Input-Tokens bei Gemini sind relativ kosteneffizient.

---

## 5. UI-Komponenten

### 5.1 Recording Button

**Neue Datei:** `src/components/chat/recording-button.tsx`

Platzierung: Im PromptInput-Bereich. Wird nur angezeigt wenn `features.meetingRecorder.enabled`.

**Darstellung:** Kreis-Button mit Record-Icon (●). Deutlich unterscheidbar vom Voice-Chat-Button (falls beide aktiv).

### 5.2 Recording Overlay

**Neue Datei:** `src/components/chat/recording-overlay.tsx`

Erscheint ueber dem Chat-Bereich waehrend einer aktiven Aufnahme.

**Layout:**

```
┌─────────────────────────────────────────────┐
│                                             │
│        ● REC  23:45                         │
│                                             │
│        ≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋               │
│        Audio-Level Visualizer               │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ Marker:                             │    │
│  │ 05:23 — "Budget-Entscheidung"       │    │
│  │ 12:10 — "Ab hier Maria"             │    │
│  │                                     │    │
│  │ [+ Marker hinzufuegen]              │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Projekt: Content-Strategie Q3              │
│                                             │
│  [⏸ Pause]  [⏹ Beenden & Analysieren]     │
│                                             │
└─────────────────────────────────────────────┘
```

**Elemente:**

- **Record-Indikator:** Roter Punkt + "REC" + Timer
- **Waveform/Level-Meter:** CSS-basierte Visualisierung der Audio-Amplitude
- **Marker-Liste:** User kann waehrend der Aufnahme Textmarker setzen (Timestamp + Notiz)
- **Projekt-Badge:** Zeigt zugeordnetes Projekt
- **Controls:** Pause/Resume, Beenden & Analysieren
- **Sprecher-Tags:** Optional: Button um aktuellen Sprecher zu benennen

### 5.3 Processing State

Nach Beenden der Aufnahme, waehrend Gemini verarbeitet:

```
┌─────────────────────────────────────────────┐
│                                             │
│        ⟳ Aufnahme wird analysiert...        │
│                                             │
│        23:45 Audio | ~2 Min verbleibend     │
│                                             │
│        ████████████░░░░░  68%               │
│                                             │
└─────────────────────────────────────────────┘
```

Progress-Indikator ist geschaetzt (kein echtes Progress-Feedback von Gemini bei Batch).

### 5.4 Recording Hook

**Neue Datei:** `src/hooks/use-meeting-recorder.ts`

```typescript
interface UseMeetingRecorderReturn {
  state: "idle" | "recording" | "paused" | "processing" | "done" | "error"
  startRecording: () => Promise<void>
  pauseRecording: () => void
  resumeRecording: () => void
  stopAndProcess: () => Promise<{ artifactId: string }>
  addMarker: (text: string) => void
  addSpeakerTag: (speaker: string) => void
  duration: number
  audioLevel: number        // 0-1, fuer Visualizer
  markers: Array<{ timestamp: number, text: string }>
  error: string | null
}
```

**Interne Verantwortlichkeiten:**

- MediaRecorder API fuer Audio-Capture
- Audio-Level Tracking via AnalyserNode (Web Audio API)
- Pause/Resume Support
- Marker-Management (Timestamp + Text)
- Blob-Akkumulation (Audio-Chunks sammeln)
- Upload + Process-Call nach Stop
- Cleanup (MediaStream stoppen)

### 5.5 Artifact-Integration

Das generierte Artifact nutzt den bestehenden `markdown` Artifact-Typ. Zusaetzliche Metadata:

```typescript
metadata: {
  source: "meeting-recorder",
  durationSeconds: 1425,
  audioUrl: "https://r2.../meeting-abc123.webm",  // Optional: Audio-Datei
  markers: [...],
  language: "de",
}
```

Wenn `audioUrl` vorhanden: Der bestehende AudioPlayer kann im Artifact-Header eingebettet werden, sodass das Meeting nachgehoert werden kann.

---

## 6. Dateien-Uebersicht

### Neue Dateien

| Datei | Beschreibung |
|-------|-------------|
| `src/app/api/meeting-recorder/process/route.ts` | Audio-Verarbeitung + Artifact-Erstellung |
| `src/lib/ai/meeting-recorder.ts` | Prompt-Building, Audio-Analyse via Gemini |
| `src/hooks/use-meeting-recorder.ts` | Client Hook (MediaRecorder, State, Upload) |
| `src/components/chat/recording-button.tsx` | Aufnahme-Trigger im PromptInput |
| `src/components/chat/recording-overlay.tsx` | Aufnahme-UI mit Waveform + Marker |

### Zu aendernde Dateien

| Datei | Aenderung |
|-------|----------|
| `src/config/features.ts` | Feature Flag `meetingRecorder` |
| `src/lib/credits.ts` | `calculateMeetingRecorderCredits()` |
| `src/lib/rate-limit.ts` | Rate Limit Preset `meetingRecorder` |
| `src/components/chat/chat-view.tsx` | Hook + UI Integration |
| `src/components/chat/prompt-input.tsx` | Recording Button einbinden |
| `.env.example` | Neue ENV-Variablen |

---

## 7. Fehlerbehandlung

| Szenario | Verhalten |
|----------|----------|
| Kein Mikrofon | Button deaktiviert, Tooltip erklaert Anforderung |
| Mikrofon-Berechtigung verweigert | Fehlermeldung mit Browser-Einstellungs-Hinweis |
| Aufnahme ueberschreitet Max-Duration | 2 Min vorher: Warnung. Bei Limit: Automatisch stoppen und verarbeiten |
| Audio-Upload fehlgeschlagen | Audio ist lokal gespeichert. Retry-Button anbieten |
| Gemini-Verarbeitung fehlgeschlagen | Fehlermeldung. Audio bleibt auf R2. Manueller Retry moeglich |
| Browser-Tab geschlossen waehrend Aufnahme | `beforeunload` Warnung. Audio geht verloren wenn nicht gespeichert |
| Leere Aufnahme (Stille) | Gemini erkennt "keine relevanten Inhalte". Artifact wird trotzdem erstellt mit Hinweis |
| Schlechte Audio-Qualitaet | Gemini transkribiert best-effort. Unsichere Stellen markieren: "[unverstaendlich]" |
| Credits reichen nicht | Button deaktiviert. Tooltip: "Nicht genuegend Credits" |
| R2 Storage nicht konfiguriert | Audio-Aufnahme wird nicht persistent gespeichert. Nur Transcript/Artifact. Warnung in Admin |

---

## 8. Sicherheit

- **Auth:** Process-Route nutzt `requireAuth()`
- **Rate-Limit:** Dediziertes Preset `meetingRecorder: 5/min`
- **Dateigroesse:** Max 100 MB Audio-Upload (server-seitig validiert)
- **Dateityp:** Nur `audio/webm`, `audio/wav`, `audio/mp4` akzeptiert
- **Projekt-Ownership:** Wird bei Verarbeitung geprueft
- **Privacy-Routing:** Meeting Recorder deaktiviert wenn Business Mode Privacy aktiv (Audio geht an Google)
- **Audio-Speicherung:** Optional auf R2. User kann in Einstellungen deaktivieren (nur Transcript behalten)
- **Consent:** User muss bewusst "Aufnahme starten" druecken. Kein automatisches Recording
- **Hinweis:** Bei Start der Aufnahme: "Audio wird zur Verarbeitung an Google gesendet"

---

## 9. Implementierungs-Reihenfolge

### Schritt 1: Backend

1. Feature Flag in `features.ts`
2. Credits in `credits.ts`
3. Meeting Recorder Utilities in `meeting-recorder.ts` (Prompt-Building)
4. Process-Route `/api/meeting-recorder/process`

### Schritt 2: Client-Logik

5. `useMeetingRecorder` Hook (MediaRecorder, State Machine)
6. Audio-Level Tracking (AnalyserNode)
7. Upload-Logik (Chunked oder Blob)

### Schritt 3: UI

8. Recording Button
9. Recording Overlay (Timer, Waveform, Marker)
10. Processing State (Fortschritts-Anzeige)
11. Integration in ChatView + PromptInput

### Schritt 4: Integration

12. Artifact-Metadata fuer Meeting-Source
13. Audio-Player im Artifact-Header (wenn Audio auf R2)
14. ENV-Dokumentation

### Schritt 5: Test

15. Verschiedene Audio-Laengen (5 Min, 30 Min, 60 Min)
16. Verschiedene Sprachen (Deutsch, Englisch, gemischt)
17. Browser-Tests (Chrome, Firefox, Safari)
18. Mobile-Tests

---

## 10. Spaetere Erweiterungen (Out of Scope V1)

- **Echtzeit-Transkription** — Live-Transcript waehrend der Aufnahme (wuerde Live API erfordern, hoehere Kosten)
- **Sprecher-Diarization** — Automatische Sprecherzuordnung durch Gemini (abhaengig von Modell-Capabilities)
- **Meeting-Templates** — Verschiedene Output-Formate: Sprint Review, Kundengespraech, Workshop, 1:1
- **Automatische Projekt-Dokument-Erstellung** — Meeting-Artifact direkt als Projekt-Dokument speichern
- **Follow-Up-Generierung** — Aus Action Items automatisch Follow-Up-Mails oder Tasks generieren
- **Meeting-Serie** — Vergangene Meetings referenzieren ("Im letzten Meeting hatten wir beschlossen...")
- **Kalender-Integration** — Meeting-Titel und Teilnehmer aus Kalender-Event uebernehmen
- **Multi-Device Recording** — Audio von mehreren Geraeten zusammenfuehren

---

## 11. Verifikation

| ID | Kriterium | Testfall |
|----|-----------|---------|
| V-1 | Feature Flag | `MEETING_RECORDER_ENABLED` nicht gesetzt → Button nicht sichtbar |
| V-2 | Aufnahme starten | Button druecken → Mikrofon-Berechtigung → Aufnahme laeuft |
| V-3 | Pause/Resume | Aufnahme pausieren → Audio-Level bei 0 → Resume → Audio-Level wieder aktiv |
| V-4 | Marker setzen | Waehrend Aufnahme → Marker hinzufuegen → Marker in Ergebnis-Artifact sichtbar |
| V-5 | Aufnahme beenden | Stop → Processing-State → Artifact erstellt |
| V-6 | Artifact-Qualitaet | Transcript korrekt, Zusammenfassung relevant, Action Items identifiziert |
| V-7 | Projekt-Kontext | Aufnahme in Projekt → Zusammenfassung referenziert Projekt-Inhalte |
| V-8 | Credits | Balance korrekt reduziert (minutenbasiert) |
| V-9 | Audio-Persistenz | Wenn R2 konfiguriert → Audio-Datei abrufbar → AudioPlayer im Artifact |
| V-10 | Max-Duration | Aufnahme erreicht Limit → automatisch gestoppt und verarbeitet |
| V-11 | Fehlerfall | Gemini-Fehler → Fehlermeldung → Audio bleibt erhalten → Retry moeglich |
| V-12 | Mobile | Aufnahme-Overlay funktioniert auf Touchscreens |

---

## 12. Risiko-Bewertung

### Stabilitaet: Gering

Isoliertes Feature. Kein Eingriff in `/api/chat`, `useChat` oder bestehende Flows. Eigene Route, eigener Hook, eigene UI-Komponenten. Bestehende Funktionalitaet wird nicht beruehrt.

### Performance: Gering

Audio-Aufnahme laeuft im Browser (MediaRecorder API). Server-Last: ein HTTP-Request pro Session (Process-Call). Kein WebSocket, kein Streaming waehrend der Aufnahme.

### Sicherheit: Gering-Mittel

Weniger exponiert als Voice Chat — kein System-Prompt im Client, kein langlebiger Kanal. Hauptrisiko: Dateigrösse und Dateityp-Validierung auf dem Server.

### Externe Abhaengigkeit: Mittel

Gemini Multimodal API ist stable (kein Preview wie Live API). Aber: Audio-Input-Limits und Token-Kosten pro Minute Audio muessen verifiziert werden (siehe Abschnitt 13).

### EU/Local-Kompatibilitaet

Meeting Recorder ist Google-only. Kein Fallback fuer EU-Deployment (Direct) oder Local (Ollama). Feature Flag faengt das ab — Meeting Recorder ist **nur im SaaS-Profil verfuegbar**.

---

## 13. Architektur-Entscheidung: Audio-Upload-Strategie

### Problem

Vercel Serverless hat ein Body-Limit von ~4.5 MB. Ein 30-Minuten WebM/Opus ist ~15-30 MB, WAV waere 150+ MB. Der aktuelle PRD definiert den Process-Endpoint als `multipart/form-data` mit direktem Audio-Upload — das funktioniert nicht fuer laengere Aufnahmen.

### Optionen

| Option | Ablauf | Trade-off |
|--------|--------|-----------|
| **A: Presigned URL → R2 → Gemini Files API** | Client holt Presigned URL → Upload direkt zu R2 → Server liest von R2 → Upload zu Gemini Files API → `generateContent` mit File-Referenz | Zuverlaessig, skaliert bis 100 MB+. Aber: drei Schritte, R2 als Pflicht-Abhaengigkeit, Gemini Files API Limits pruefen |
| **B: Presigned URL → R2 → Inline fuer kurze, Files API fuer lange** | Wie A, aber unter 20 MB wird Audio inline (Base64) an Gemini geschickt | Weniger API-Calls fuer kurze Aufnahmen. Komplexerer Code (zwei Pfade) |
| **C: Direkt zu Gemini Files API** | Client holt Presigned Upload-URL von unserem Server → Upload direkt zu Google → Server referenziert File in `generateContent` | Kein R2 noetig fuer den Upload-Schritt. Aber: Audio ist dann nur bei Google, nicht bei uns persistent |

### Empfehlung

Option A. R2 ist bereits konfiguriert und der Upload-Flow (Presigned URLs) existiert fuer den File-Upload. Audio-Persistenz auf R2 ist ohnehin gewuenscht (Wiedergabe im Artifact).

### Revidierter Ablauf

```
1. Client: POST /api/meeting-recorder/prepare
   → Server: Auth, Feature-Check, Credit-Check
   → Server: Presigned R2 Upload URL generieren
   → Response: { uploadUrl, audioKey, chatId }

2. Client: PUT uploadUrl (direkt zu R2, kein Vercel-Limit)
   → Audio-Datei wird auf R2 gespeichert

3. Client: POST /api/meeting-recorder/process
   Body: { audioKey, chatId, projectId?, markers?, speakerTags? }
   → Server: Audio von R2 lesen
   → Server: An Gemini Files API uploaden (oder inline wenn klein genug)
   → Server: generateContent mit Audio + Analyse-Prompt
   → Server: Artifact erstellen, Credits abziehen
   → Response: { artifactId, title, summary }
```

**Entscheidung offen.** Gemini Files API Limits und Inline-Audio-Limits muessen verifiziert werden.

---

## 14. Architektur-Entscheidung: Processing-Resilienz

### Problem

Die Analyse durch Gemini dauert geschaetzt 30s-2min. Was passiert wenn:
- Der User den Tab schliesst waehrend Processing laeuft?
- Der Vercel Function Timeout (300s) ueberschritten wird?
- Die Gemini API einen transienten Fehler wirft?

### Aktuelle Annahme im PRD

Synchroner Request: Client wartet auf Response. Wenn Tab geschlossen wird, laeuft der Server-Call weiter (bis Timeout), das Artifact wird erstellt — aber der Client bekommt kein Ergebnis.

### Optionen

| Option | Ansatz | Trade-off |
|--------|--------|-----------|
| **A: Synchron (aktuell)** | Client wartet. Fake-Progressbar. Bei Tab-Close: Artifact existiert, User findet es im Chat | Einfach. Aber: schlechte UX bei langen Aufnahmen. User muss Tab offen lassen |
| **B: Asynchron mit Polling** | Process-Endpoint startet Job, gibt `interactionId` zurueck. Client pollt Status. Artifact erscheint wenn fertig | Resilient gegen Tab-Close. Pattern existiert bereits (Deep Research). Mehr Aufwand |
| **C: Streaming** | `streamGenerateContent` statt `generateContent`. User sieht Artifact schrittweise entstehen | Bessere UX. Aber: Tab-Close Problem bleibt. Und: Artifact muesste inkrementell aufgebaut werden |

### Empfehlung

Fuer V1: **Option A mit klarem UX-Hinweis** ("Bitte Tab geoeffnet lassen"). Das Artifact wird auch bei Tab-Close erstellt und taucht beim naechsten Besuch im Chat auf.

Fuer V1.1: Option B (Deep Research Polling-Pattern wiederverwenden) wenn User-Feedback zeigt, dass Tab-Close ein Problem ist.

---

## 15. Drittparteien-Hinweis bei Aufnahmen

### Problem

Wenn ein Meeting aufgenommen wird, werden auch andere Teilnehmer aufgezeichnet. Der User ist rechtlich verantwortlich (nicht wir), aber ein UX-Hinweis ist sinnvoll und schuetzt uns.

### Vorschlag

Beim ersten Start einer Aufnahme (einmalig, per localStorage-Flag): Dialog mit zwei Punkten:

1. "Audio wird zur Verarbeitung an Google gesendet" (Datenschutz)
2. "Stellen Sie sicher, dass alle Teilnehmer der Aufnahme zugestimmt haben" (Recht)

Danach: Kompakter Hinweis im Overlay ("Aufnahme aktiv — alle Teilnehmer muessen zugestimmt haben").

---

## 16. Offene Fragen (vor Implementierung zu klaeren)

### Muss geklaert werden

1. **Audio-Upload-Strategie:** Presigned URL → R2 → Gemini? Oder anderer Pfad? (siehe Abschnitt 13)
2. **Gemini Audio-Input-Limits verifizieren:** Max Dauer, Max Dateigroesse, Inline vs. Files API Grenzen, Token-Kosten pro Minute Audio
3. **Vercel Function Timeout:** Reichen 300s fuer die Analyse eines 60-Minuten-Meetings? Falls nicht: asynchrones Pattern noetig

### Sollte geklaert werden

4. **Audio-Format:** WebM/Opus (kleiner, Browser-nativ) vs. WAV (universeller, aber groesser). WebM ist vermutlich optimal
5. **Sprecher-Erkennung:** Wie zuverlaessig ist Geminis Speaker-Diarization bei Multi-Speaker Audio? Testen
6. **Processing-Resilienz:** Synchron (V1) akzeptabel oder direkt asynchron? (siehe Abschnitt 14)
7. **Drittparteien-Consent:** Einmaliger Dialog ausreichend oder staerkerer Hinweis noetig? (siehe Abschnitt 15)

### Nice to know

8. **Echtzeit-Transcript als V1.5?** Live API nur fuer Transkription (kein Dialog), Batch-Analyse am Ende
9. **Zusammenspiel mit Voice Chat:** Voice-Chat-Transcript nachtraeglich als Meeting Notes analysieren lassen — guter Brueckenschlag, Scope V1 oder V2?
10. **Offline-Aufnahme:** Audio ist lokal, Upload erst am Ende. Funktioniert bei kurzer Unterbrechung. Explizit unterstuetzen?
