# PRD: Podcast Factory

> Produktionspipeline fuer mehrminuetige Audio-Episoden (Monolog oder Zwei-Sprecher-Dialog) auf Basis von Gemini TTS — mit Chunking, konsistenter Regie und Website-fertigem Output.

Status: Ideen-Phase. Kein Commit zur Implementierung, keine Terminvorgabe.

---

## 1. Kontext und Ziel

### Problem

Rico will groessere Themenbereiche der Website (loschke.ai, unlearn.how, lernen.diy) als Podcast-Talks anbieten — typisch 5-15 Minuten, Host + Gast, mit Charakter und Pacing. Das bestehende `text_to_speech`-Tool generiert pro Aufruf eine einzelne Audio-Datei ueber einen `generateContent`-Call. Erste Tests zeigen zwei systemische Probleme:

- **Voice Drift:** Stimme veraendert sich im Laufe der Generierung, bei Multi-Speaker besonders sichtbar.
- **Pace Creep:** Sprechtempo zieht an — das Ende ist schwer zu folgen.

Google dokumentiert beide als Modell-Limit (*„Quality degrades beyond ~minutes of audio"*, *„Voice mismatch risk"*). Der Single-Call-Ansatz ist fuer Podcast-Laenge nicht geeignet.

### Loesung

Eine **Podcast Factory**: ein separates Feature (nicht das Chat-Tool), das

1. einen laengeren Podcast-Text nimmt oder aus einem Artikel/Thema generiert,
2. ihn in kleine TTS-Chunks (60-90 Sekunden) zerlegt,
3. jeden Chunk mit einem konstanten Director's-Notes-Header generiert,
4. die WAV-Segmente server-seitig zu einer Episode zusammenfuegt,
5. das Ergebnis als fertige Audio-Datei + Transkript + Metadata auf R2 ablegt,
6. optional zu MP3 transcodiert fuer Website-Einbindung.

Damit bleibt jeder einzelne TTS-Call kurz genug, dass Gemini keinen Drift produziert — und die Consistency ueber die Episode kommt aus identischer Voice-Config + identischen Director's Notes pro Chunk.

### Warum jetzt (nicht jetzt bauen)

- Gemini TTS ist heute die guenstigste plausible Option — ElevenLabs waere zehnfach teurer.
- `@google/genai`, R2-Storage, Audio-Artifact-Rendering sind bereits im Projekt.
- Preview-Qualitaet von `flash3` macht erst ein gechunkter Ansatz produktionsreif.
- Bevor wir bauen: erst mit dem bestehenden Chat-Tool + `TTS_MODEL=flash3` die Grenzen empirisch ausloten. Wenn Chunking sich bewaehrt, ist dieses PRD der Plan.

---

## 2. User Experience

### Nutzer-Perspektive (Rico intern)

```
1. Input: Artikel-Draft oder Themen-Skizze
   → „Erstelle einen Podcast-Talk (8-10 Min) zum Thema X,
      Host = Rico, Gast = eine skeptische Beraterin"

2. Factory generiert
   → Script wird erstellt oder uebernommen (Draft-Review moeglich)
   → Director's Notes pro Sprecher (Stil, Pace, Akzent) werden angelegt
   → Script wird segmentiert, Chunks gehen nacheinander durch TTS
   → Progress-UI wie Deep Research (Phasen: Script → Chunks → Mix → Export)

3. Ergebnis
   → Einzelne WAV/MP3-Episode, ~5-15 Minuten
   → Transkript mit Timecodes
   → Metadaten (Laenge, Sprecher, Modell, Erzeugungsdatum)
   → Download + Link zur Verwendung auf der Website
```

### Wann Podcast Factory vs. Chat-TTS

| Kriterium | Chat-TTS (bestehend) | Podcast Factory |
|---|---|---|
| Laenge | bis 1 Minute | 5-15 Minuten |
| Zweck | Antwort vorlesen, Schnipsel | Website-Content, Produktion |
| Qualitaet | „Gut genug" | Produktionsreif, konsistent |
| Dauer | Sekunden | 3-10 Minuten Generierung |
| Output | WAV im Chat-Artifact | WAV + MP3 + Transkript in R2 |

### Out-of-Scope fuer V1

- Live-Schnitt / Editing-UI im Browser.
- Voice Cloning (Gemini bietet keines, waere ElevenLabs-Territorium).
- Musik-Intros / Outros / Jingles — separate Post-Production ausserhalb der Factory.
- Mehr als 2 Sprecher — Gemini-Hard-Limit.
- Automatisches Script-Writing in V1. User liefert Script oder einen Brand-kompatiblen Skill tut es separat (siehe 5.).

---

## 3. Technisches Konzept

### Chunking-Strategie

**Ziel:** Jeder TTS-Call < 90 Sekunden Audio (ca. 200-250 Woerter im Deutschen bei normalem Pace).

**Segmentierung:**

1. Script-Parser identifiziert Sprecher-Turns (`Sprecher 1:`, `Rico:`, etc.).
2. Lange Turns werden an Satz-Grenzen gesplittet (niemals mitten im Satz).
3. Ein Chunk enthaelt moeglichst nur **einen** Sprecher — reduziert Kontext-Schaden beim Boundary-Crossing.
4. Falls ein Turn zu lang bleibt: Split auf Absatz-Ebene, sonst groesste Satzgrenze unter Limit.

**Pro Chunk:**

- Director's-Notes-Header wird vorangestellt (siehe unten).
- Bei Multi-Speaker: `multiSpeakerVoiceConfig` bleibt konstant ueber alle Chunks.
- Bei Single-Speaker-Chunk innerhalb eines Multi-Speaker-Scripts: trotzdem Multi-Speaker-Config, nur der andere Sprecher kommt in diesem Chunk nicht vor.

### Director's Notes Template

Vor jedem Chunk (identisch, nicht variierend) wird ein Markdown-Header mitgesendet, den Gemini als Produktions-Direktive interpretiert, aber nicht vorliest:

```
# AUDIO PROFILE
Host: Rico — AI Transformation Consultant, klar, pointiert, dezent sarkastisch.
Gast: Beraterin — kritisch, direkt, fragt nach.

## SCENE
Studio-Aufnahme, ruhige Atmosphaere, niederschwelliges Fach-Publikum.

## DIRECTOR'S NOTES
Style: Wach, keine Euphorie. Technisch korrekt, aber zugaenglich.
Pace: Normal, mit bewussten Pausen vor Kernaussagen. Niemals beschleunigen.
Tone: Nuechtern mit gelegentlichem trockenem Humor.

## TRANSCRIPT
{chunk_text}
```

Der Header wird einmal zentral konfiguriert und pro Chunk identisch wiederverwendet — das ist der Kern-Mechanismus gegen Drift.

### Audio-Post-Processing

1. **Concat:** WAV-Chunks werden binaer aneinandergehaengt (Header nur einmal, Data-Chunks summieren). Vorhandene `prependWavHeader`-Logik in `src/lib/ai/tts.ts:116-141` wird zu einem `concatWavBuffers([...])`-Helper erweitert.
2. **Crossfade (optional V2):** Kurzer 50-100ms-Crossfade zwischen Chunks, um Click-Artefakte zu eliminieren. In V1: harte Kante akzeptieren.
3. **MP3-Transcoding (V1 notwendig fuer Website):** via `@ffmpeg-installer/ffmpeg` + `fluent-ffmpeg` oder serverless-kompatibles WASM-Tool. Alternativ Cloudflare Workers oder externes Transcoding-Service. → **Offene Frage, siehe 6.**
4. **Metadata:** ID3-Tags (Titel, Autor, Datum) werden beim MP3-Encoding gesetzt.

### Fehlerbehandlung pro Chunk

| Fehler | Strategie |
|---|---|
| HTTP 500 von Gemini (text tokens statt audio) | Retry mit Backoff, max 3x. Dann Chunk-Fail. |
| Timeout | Chunk verkleinern (Half-Split) und retrien. |
| Voice Mismatch Erkennung | Nicht automatisch erkennbar — User hoert Endresultat. |
| Partielle Episode | Nach n fehlgeschlagenen Chunks: gesamte Episode als failed markieren, fehlgeschlagene Chunks re-run-faehig machen. |

---

## 4. Architektur

### Async-Pattern (analog Deep Research)

```
Client Chat Tool / Admin-UI         Server / Background Queue           Storage (R2)
┌────────────────────────┐          ┌─────────────────────────┐         ┌─────────────┐
│ generate_podcast start │─────────>│ Job-Queue-Entry anlegen │         │             │
│ returns episodeId      │<─────────│ episodeId               │         │             │
└────────────────────────┘          └──────────┬──────────────┘         │             │
                                                │                        │             │
┌────────────────────────┐                      │ Background Worker     │             │
│ Poll /api/podcast/[id] │                      │ pro Chunk:            │             │
│ Phasen + Fortschritt   │<─────────────────────┤  TTS-Call             │             │
└────────────────────────┘                      │  WAV-Buffer           │             │
                                                │                        │             │
                                                │ Concat + Transcode ──> │ episode.mp3 │
                                                │ Artifact erstellen     │ transcript  │
                                                └────────────────────────┘             │
```

### Trigger-Pfade

| Pfad | Eignung |
|---|---|
| **Admin-UI** (`/admin/podcast` oder `/admin/factories/podcast`) | Hauptpfad — Rico pflegt Episoden systematisch. |
| **Chat-Tool** `generate_podcast` | Quick-Preview-Pfad fuer kurze Test-Episoden (< 5 Min). |
| **Skill** (`_skills/podcast-factory/`) im loschke-hub | Bringt Script-Generierung + Director's-Notes-Defaults pro Brand mit. |

### Datenmodell

Neue Tabelle `podcast_episodes` (nanoid PK):

| Feld | Typ | Zweck |
|---|---|---|
| `id` | text | Episoden-ID |
| `userId` | text | Owner (Logto sub) |
| `chatId` | text nullable | Wenn aus Chat gestartet |
| `title` | text | Episoden-Titel |
| `status` | enum | `pending` / `running` / `completed` / `failed` |
| `script` | jsonb | Strukturiertes Script (Turns + Meta) |
| `directorNotes` | jsonb | Der konstante Header-Block |
| `chunks` | jsonb | Array mit `{ index, text, status, url?, error? }` |
| `episodeUrl` | text nullable | R2-URL der finalen Episode |
| `transcriptUrl` | text nullable | R2-URL des Transkripts |
| `model` | text | verwendete Model-ID (Provenance) |
| `durationSeconds` | int nullable | finale Laenge |
| `createdAt` / `updatedAt` | timestamptz | Standard |

Ein **Artifact**-Eintrag (Type `audio`) wird bei Fertigstellung wie beim Chat-Tool erzeugt, damit das bestehende Artifact-Panel / „Meine Dateien" die Episode listet.

### Konfiguration

Neue ENV-Variablen:

```bash
# Modell fuer Podcast Factory (uebersteuert TTS_MODEL fuer dieses Feature)
# PODCAST_TTS_MODEL=flash3

# Chunk-Ziel-Laenge in Woertern (Default 200, entspricht ~60-80s Deutsch)
# PODCAST_CHUNK_WORDS=200

# Max parallele Chunk-Jobs pro Episode (Default 2)
# PODCAST_CHUNK_CONCURRENCY=2

# Credits pro Minute finaler Audio-Laenge
# PODCAST_CREDITS_PER_MINUTE=200
```

Feature-Flag in `src/config/features.ts`:

```ts
podcastFactory: {
  enabled: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
    && process.env.PODCAST_FACTORY_ENABLED === "true",
}
```

---

## 5. Integration mit bestehendem System

### TTS-Wrapper wiederverwenden

`src/lib/ai/tts.ts` bleibt die einzige Stelle, die Gemini TTS aufruft. Die Factory ruft `generateSpeech()` mehrfach auf — dadurch profitiert sie automatisch vom ENV-gesteuerten Model-Switch und kuenftigen Verbesserungen.

Erweiterungen am Wrapper:

- Optionale `systemPrompt` bzw. `directorNotes` Param, der vor `contents` gesetzt wird.
- Rueckgabe des rohen PCM-Buffers (statt WAV), damit die Factory sie ohne Header-Overhead concatenieren kann.

### Skill im loschke-hub

Analog zur Carousel-Factory ein `_skills/podcast-factory/SKILL.md` im loschke-hub-Repo:

- Script-Templates pro Brand (loschke.ai: Interviewer-Duo, unlearn.how: Trainer-Gast, lernen.diy: zwei Praktiker).
- Director's-Notes-Defaults pro Brand (Voice-Paarungen, Pace-Vorgaben).
- Input-Form: Thema, Episode-Laenge, Brand → Output: Script + Director's Notes als JSON, direkt nutzbar fuer die Factory-API.

### Audio-Storage

Wiederverwendung der bestehenden `uploadBuffer`-Infrastruktur. Neuer R2-Pfad: `podcast-episodes/{userId}/{episodeId}/episode.mp3` + `podcast-episodes/{userId}/{episodeId}/transcript.vtt`.

### Voice-Chat-Modul (vorhandenes)

Keine Beruehrung. Voice Chat ist Live-Input-STT, Podcast Factory ist Batch-TTS — disjunkt.

---

## 6. Risiken und offene Fragen

| Thema | Status |
|---|---|
| **MP3-Transcoding in Vercel-Functions** | ffmpeg ist nicht serverless-freundlich (Binary-Groesse). Optionen: (a) externes Transcoding-Service, (b) Cloudflare Workers mit WASM-Encoder, (c) Output nur als WAV, Website-Einbettung direkt als WAV/Opus. Muss vor V1 entschieden sein. |
| **Chunk-Boundary-Artefakte** | Harte Schnitte hoerbar. V1 akzeptiert das. V2 mit Crossfade. |
| **Voice-Konsistenz ueber Chunks** | Gleicher `voiceName` sollte gleiche Stimme liefern. Muss empirisch bestaetigt werden — wenn selbst das drifted, ist Gemini fuer Production-Podcasts ungeeignet → Fallback-Plan ElevenLabs. |
| **Preview-Status von `flash3`** | Modell kann ohne Vorwarnung brechen. `PODCAST_TTS_MODEL=flash25` als Fallback immer offen halten. |
| **Kosten pro Episode** | Ca. 10 Chunks a 60s bei `flash3`-Preview: noch unklar, muss beim Dry-Run gemessen werden. Credits-Formel im PRD ist erstmal Schaetzung. |
| **Rate-Limits bei Gemini** | Parallele Chunk-Jobs duerfen Gemini-QPS nicht sprengen. Concurrency-Limit ist konfigurierbar, Default 2. |
| **Script-Qualitaet** | Ohne gutes Script ist jedes TTS flach. Skill im loschke-hub muss Brand-Voice-Regeln durchsetzen — das ist Vorproduktion, nicht TTS. |

---

## 7. Rollout-Schritte (wenn entschieden wird, zu bauen)

1. **Empirische Validierung mit Chat-Tool:** Chunking-Prinzip manuell nachstellen (3-4 Kurz-Aufrufe + externes Concat in Audacity), hoeren, ob Consistency haelt. Ohne dieses Gate kein Bau.
2. **MP3-Transcoding-Entscheidung** (Risiko oben) loesen.
3. **TTS-Wrapper** um Director's-Notes und PCM-Rueckgabe erweitern.
4. **DB-Schema + Queries + Migration** (`podcast_episodes`).
5. **Background-Worker / Job-Queue** (einfachster Start: `/api/podcast/run` mit `maxDuration: 300`, seriell; spaeter Queue).
6. **Admin-UI** unter `/admin/podcast` — Form + Liste + Playback.
7. **Skill** `_skills/podcast-factory/` im loschke-hub mit Brand-Templates.
8. **Chat-Tool** `generate_podcast` als Thin-Wrapper um die Factory-API.
9. **Metrics-Instrumentierung:** Chunk-Laenge, Drift-Feedback vom User, Fehlerquote pro Modell.

---

## 8. Abgrenzung zu Deep Research und Chat-TTS

- **Chat-TTS** bleibt unveraendert fuer kurze Snippets im Gespraechskontext.
- **Podcast Factory** ist ein Produktions-Feature mit eigener Lebensdauer: Episoden existieren, werden gelistet, werden auf Websites eingebunden.
- **Deep Research** ist der Referenz-Vergleich fuer das Async-Pattern — keine inhaltliche Ueberschneidung.

Das PRD beschreibt bewusst **keine konkreten Terminierungen**. Es ist die Grundlage, wenn sich aus empirischen Tests der Chat-TTS-Varianten zeigt, dass Gemini TTS die Basis tragen kann.
