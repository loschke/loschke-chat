# PRD: GenAI-Tutor — Lessons aus lernen.diy in build-jetzt

> Status: **In Planung**
> Erstellt: 2026-05-02
> Abhängigkeit: `lernen-diy` (Astro Content Collection), `build-jetzt` (Next.js 16, Vercel AI SDK)
> Verwandt: `prd-lernen-diy-v1.md`, bestehendes YouTube-Tool-Pattern in build-jetzt

---

## Zusammenfassung

Die Plattform `build-jetzt` (KI-Chat mit Experten-System, Tools, MCP) soll die ~20 Lessons aus `lernen.diy` als **proaktive Lernabsprünge** integrieren. Wenn ein User eine Frage zu generativer KI stellt — Prompting, Bildmodelle, Agenten, Compliance, KI-Strategie — soll der Assistant inhaltlich antworten **und** die thematisch passende Lesson als anklickbare Teaser-Card im Chat anbieten. Klick führt auf `lernen.diy/lessons/[slug]`.

**Kernidee:** Der Chat wird zum GenAI-Tutor. Beantwortet die akute Frage, weist gleichzeitig den Weg zu strukturiertem Lernen auf der Lernplattform.

**Technische Analogie:** Das vorhandene `youtube_search`-Tool ist das passende Vorbild — Tool-Call mit strukturierten Treffern, Generative UI im Chat (Card-Grid), externe Klick-Ziele. Wir spiegeln dieses Pattern für Lessons.

---

## Motivation

Heute existieren `loschke.ai` (Marke, Content) und `lernen.diy` (Lessons, Astro-Plattform) als getrennte Welten. Die Lessons sind ein wertvolles strukturiertes Lerngut, werden aber nicht aktiv aus den Chat-Touchpoints heraus angeboten. Gleichzeitig bekommt `build-jetzt` viele Fragen, deren Antwort eine Lesson exakt vertieft.

Der Tutor schlägt zwei Brücken:
1. **Vom akuten Hilfsbedarf zum vertieften Lernen** — User bekommt sowohl die Soforthilfe als auch den nächsten Schritt.
2. **Vom Chat-Funnel in die Lernplattform `lernen.diy`** — strukturierter Traffic-Aufbau zur Plattform, Rico Loschke wird als Autor sichtbar.

---

## Architektur-Entscheidungen

### Datenpfad: Embedded JSON + Sync-Skript (kein API-Feed, kein MCP)

Die Lesson-Metadaten liegen als **statisches JSON** direkt in `build-jetzt` (`src/data/lessons.json`). Ein **Sync-Skript** in build-jetzt liest die Lessons aus dem Schwester-Repo `lernen-diy/src/content/lessons/`, mappt sie auf das Teaser-Schema, validiert mit Zod und schreibt das Ergebnis raus. Das Tool `lessons_search` arbeitet rein lokal auf dieser Datei.

**Begründung gegen API-Feed:**
- Beide Repos werden von einer Person betrieben, liegen lokal nebeneinander unter `loschke-hub/`. Single-Source-of-Truth-Vorteil eines API-Feeds entfällt.
- Keine Runtime-Abhängigkeit zu lernen.diy → kein Failure-Modus „Lernplattform down → Tutor weg"
- Kein Cache-TTL, keine HTTP-Hops, keine CORS-/Auth-Komplikationen
- Lesson-Edit-Frequenz ist niedrig (Tage/Wochen) → manueller Sync-Schritt akzeptabel

**Begründung gegen MCP-Variante:**
- Lessons sind public — kein Auth-Vorteil von MCP
- Generative UI im Chat (Lesson-Card mit Cover, Disziplin, Dauer) ist UX-zentral; MCP-Tools liefern nur Strings, kein strukturiertes Renderer-Output
- Latenz, kein zusätzlicher HTTP-Hop

**Sync-Workflow:**
1. Lesson in lernen.diy editieren → committen
2. `pnpm sync:lessons` in build-jetzt → Diff prüfen → committen
3. Beide Deploys laufen unabhängig

**Spätere Erweiterungen möglich (nicht in V1):**
- Astro-Endpoint `/api/lessons.json` in lernen.diy ergänzen, falls dritte Konsumenten (Claude Desktop, Mobile) dazukommen. Schema bleibt gleich.
- MCP-Provider `astro-content` im `mcp-hub`, der denselben JSON-Feed liest.

### Tutor-Form: Universeller Skill für alle Experten

Die Tool-Anweisung wird im globalen System-Prompt verankert. Jeder Expert kann passende Lessons vorschlagen, sofern das Feature-Flag aktiv ist und das Tool in `allowedTools` erlaubt ist.

**Begründung gegen dedizierten „GenAI-Tutor"-Expert:**
- Breite Wirkung: Tutor-Charakter steht in jedem Chat zur Verfügung, nicht nur wenn aktiv ausgewählt
- Schnellster Time-to-Value
- Ein dedizierter Tutor-Expert kann später (V2) folgen, wenn das Tool stabil läuft

### Feature-Flag: opt-in via Env-Toggle

Das Feature ist standardmäßig aktiv (Lesson-Daten liegen im Repo), kann aber über `LESSONS_TUTOR_ENABLED=false` global deaktiviert werden — etwa für Instanzen, in denen der lernen.diy-Verweis unpassend wäre (B2B-White-Label, EU-Profil ohne Marketing-Cross-Promo).

---

## Tonalität: Plattform-First, Rico als Autor

Wenn der Tutor eine Lesson vorschlägt, steht die **Lernplattform** vorne, **Rico Loschke** wird als Autor genannt, **Lernen** als Aktivität ist klar. Nicht werblich, nicht autoritär — sondern als Hinweis auf eine vorhandene Quelle.

### Lead-in im LLM-Output (kontextabhängig, vom Modell formuliert)

Beispielsätze, an denen sich das Modell orientiert:
- „Auf lernen.diy gibt es dazu eine Lesson von Rico Loschke. Falls du seine Praxis sehen willst:"
- „Rico Loschke hat seine Arbeitsweise dazu auf lernen.diy festgehalten. Wenn du tiefer einsteigen willst:"
- „Auf lernen.diy kannst du das mit Rico Loschke vertiefen:"

Wenn die eigene Antwort methodisch von der Lesson abweicht: Hinweis darauf („Rico geht das etwas anders an — Details in seiner Lesson:").

### Statische Subline auf jeder Lesson-Card

**„lernen.diy · Lesson von Rico Loschke"**

Drei Signale in einer Zeile: Plattform, Format, Autor. Erscheint zwischen Title und Meta-Pills.

---

## Bestandsaufnahme

### lernen.diy

**Pfad:** `C:\Users\losch\Projekte\loschke-hub\lernen-diy`

- 20 Lessons als JSON-Dateien in `src/content/lessons/`
- Schema (Auszug `meta`-Objekt): `slug`, `title`, `summary`, `discipline`, `duration`, `level`, `tags`, `cover`, `status`, `access`, `brand`, `created`, `updated`, `order`
- 7 Disziplinen: `ai-essentials`, `ai-coding`, `ai-media`, `ai-automation`, `ai-tools`, `ai-strategy`, `ai-transformation`
- Schwierigkeitsgrade: `einsteiger`, `fortgeschritten`, `profi`
- URLs: `lernen.diy/lessons/[slug]`
- Cover öffentlich unter `lernen.diy/images/lessons/[slug]/cover.jpg`

### build-jetzt YouTube-Pattern (eins-zu-eins zu spiegeln)

| Schicht | Datei |
|---------|-------|
| Tool-Definition | `src/lib/ai/tools/youtube-search.ts` |
| Backend-Helper | `src/lib/ai/youtube.ts` |
| Bedingte Registrierung | `src/app/api/chat/build-tools.ts` (Z. 89–95) |
| Generative UI | `src/components/generative-ui/youtube-results.tsx` |
| Renderer-Mapping | `src/components/chat/tool-renderers.tsx` (Z. 310–335) |
| Prompt-Anweisung | `src/config/prompts/tools.ts` → `YOUTUBE_INSTRUCTIONS` |
| Feature-Flag | `src/config/features.ts` → `youtube.enabled` |

---

## Schritt 1: Sync-Skript in build-jetzt

**Neue Datei:** `build-jetzt/scripts/sync-lessons.mjs`

Aufgabe:
1. Glob alle JSONs in `../lernen-diy/src/content/lessons/*.json` (relativ zum build-jetzt-Repo)
2. Filtern auf `meta.status === 'published'` und `meta.access === 'public'`
3. Auf das Teaser-Schema mappen (siehe unten)
4. Mit Zod validieren (`LessonTeaserSchema` aus `src/lib/ai/lessons.ts` importieren)
5. Schreiben nach `src/data/lessons.json` mit Header-Kommentar (Zeitstempel, Anzahl Lessons)
6. Bei Schema-Verstoß sauber failen mit Slug-Hinweis

**Teaser-Schema:**
```ts
{
  slug: string,
  title: string,
  summary: string | null,
  discipline: enum (7 Werte),
  level: enum (3 Werte),
  duration: number,           // Minuten
  tags: string[],
  cover: string,              // absolute URL: https://lernen.diy/images/lessons/<slug>/cover.jpg
  url: string,                // absolute URL: https://lernen.diy/lessons/<slug>
  updated: string,            // ISO-Date
}
```

**package.json:** `"sync:lessons": "node scripts/sync-lessons.mjs"`

**Optional (Folgeausbau):** `pnpm prebuild`-Hook, der den Sync vor jedem Build automatisch ausführt — aktuell bewusst manuell, damit Lesson-Diffs vor Deploy gereviewt werden.

---

## Schritt 2: Tool und Generative UI in build-jetzt

### Backend-Helper

**Neue Datei:** `src/lib/ai/lessons.ts`
- `LessonTeaserSchema` (Zod) — wird vom Sync-Skript und vom Tool genutzt
- `loadLessonIndex()` — `import lessonsData from "@/data/lessons.json"`, einmaliges Validieren beim ersten Aufruf, Modul-Level-Cache
- `searchLessons({ query?, discipline?, level?, tags?, limit? })` — lokale Filterung über Tag-Overlap und Title-/Summary-Match. Bei 20 Lessons reicht das. Ranking: exakter Tag-Match > Substring im Title > Substring im Summary.

### Tool-Definition

**Neue Datei:** `src/lib/ai/tools/lessons-search.ts`
- Factory-Pattern analog `youtube-search.ts`: `createLessonsSearchTool({ chatId, userId })`
- Zod-Input: `{ query?: string, discipline?: enum (7 Werte), level?: enum (3 Werte), limit?: number (1–6, default 3) }`
- Output: `{ resultCount: number, lessons: LessonTeaser[] }`

### Generative UI

**Neue Datei:** `src/components/generative-ui/lessons-results.tsx`
- `LessonCard` — Cover-Image (`next/image`), Title, **statische Subline „lernen.diy · Lesson von Rico Loschke"**, Disziplin-Badge, Duration-Pill, Level-Pill, Tags, externer Link mit `target="_blank"` und `rel="noopener"`
- `LessonsResults` — Card-Stack analog `YouTubeResults`
- `LessonsResultsSkeleton` — Streaming-State

**Edit:** `src/components/chat/tool-renderers.tsx` — `renderLessonsSearch` ergänzen, im Tool-Map registrieren (analog `renderYouTubeSearch`)

### Prompt-Anweisung

**Edit:** `src/config/prompts/tools.ts` — neuen Block `LESSONS_INSTRUCTIONS` exportieren:

> Auf der Lernplattform `lernen.diy` hat Rico Loschke seine Praxiserfahrungen zu generativen KI-Themen als Lessons festgehalten. Wenn der User Fragen zu generativer KI stellt (Prompting, Bildmodelle, Agenten, KI-Strategie, KI-Tools, KI-Compliance, KI-Transformation), prüfe via `lessons_search`, ob eine passende Lesson existiert.
>
> Wenn ja: Beantworte die Frage zuerst inhaltlich aus eigenem Wissen. Schlage anschließend die Lesson mit **einem kurzen Satz** als Vertiefungsmöglichkeit vor. Lernplattform und Autor sollen erkennbar sein, ohne werbend zu klingen — z.B. „Auf lernen.diy gibt es dazu eine Lesson von Rico Loschke. Falls du seine Praxis sehen willst:" oder „Rico Loschke hat seine Arbeitsweise dazu auf lernen.diy festgehalten."
>
> Wenn deine Antwort methodisch von Ricos Vorgehen abweicht, weise darauf hin („Rico geht das etwas anders an").
>
> Nutze das Tool sparsam: maximal eine Suche pro Turn, nur wenn das Thema klar zu „generativer KI" gehört. Wenn keine passende Lesson existiert, weiter ohne Hinweis. Keine Lessons erfinden.

**Edit:** `src/config/prompts/index.ts` (`buildSystemPrompt`) — bedingt einfügen analog `YOUTUBE_INSTRUCTIONS`, wenn `features.lessons.enabled`.

### Feature-Flag

**Edit:** `src/config/features.ts`
```ts
lessons: {
  enabled: process.env.LESSONS_TUTOR_ENABLED !== 'false',
}
```
Default: aktiv (sobald `src/data/lessons.json` existiert). Explizit deaktivierbar via `LESSONS_TUTOR_ENABLED=false`.

**Edit:** `.env.example` und `.env.eu.example` — Eintrag mit Kommentar:
```
# GenAI-Tutor: Lessons aus lernen.diy als Teaser anbieten
# Default an, auf "false" setzen um Tutor zu deaktivieren (z.B. White-Label-Instanzen)
LESSONS_TUTOR_ENABLED=true
```

### Tool-Registrierung

**Edit:** `src/app/api/chat/build-tools.ts` — analog YouTube-Block (Z. 89–95):
```ts
if (features.lessons.enabled) {
  tools.lessons_search = createLessonsSearchTool({ chatId, userId });
}
```

---

## Kritische Dateien

| Repo | Datei | Status |
|------|-------|--------|
| build-jetzt | `scripts/sync-lessons.mjs` | neu |
| build-jetzt | `src/data/lessons.json` | neu (vom Sync-Skript erzeugt, committed) |
| build-jetzt | `src/lib/ai/lessons.ts` | neu |
| build-jetzt | `src/lib/ai/tools/lessons-search.ts` | neu |
| build-jetzt | `src/components/generative-ui/lessons-results.tsx` | neu |
| build-jetzt | `src/components/chat/tool-renderers.tsx` | edit |
| build-jetzt | `src/config/prompts/tools.ts` | edit |
| build-jetzt | `src/config/prompts/index.ts` | edit |
| build-jetzt | `src/config/features.ts` | edit |
| build-jetzt | `src/app/api/chat/build-tools.ts` | edit |
| build-jetzt | `package.json` | edit (Script `sync:lessons`) |
| build-jetzt | `.env.example`, `.env.eu.example` | edit |
| build-jetzt | `docs/system/feature-flags-konfiguration.md` | edit (Eintrag ergänzen) |
| build-jetzt | `docs/system/platform-capabilities.md` | edit (Tutor-Feature beschreiben) |

---

## Wiederverwendete Patterns

- `src/lib/ai/youtube.ts` — Backend-Helper-Struktur
- `src/lib/ai/tools/youtube-search.ts` — Tool-Factory mit Closure über `chatId`/`userId`
- `src/components/generative-ui/youtube-results.tsx` — Card-Grid, Skeleton, Klick-Verhalten
- `src/components/chat/tool-renderers.tsx` — Mapping Tool-Name → Renderer-Komponente
- `src/config/prompts/tools.ts` — Pattern für tool-spezifische Instruktionen, bedingt eingehängt in `buildSystemPrompt`

---

## Erfolgskriterien (V1)

1. **Funktional:** Bei Frage „Wie schreibe ich gute Prompts für ChatGPT?" erscheint nach der inhaltlichen Antwort eine Lesson-Card `prompt-baukasten` mit Subline „lernen.diy · Lesson von Rico Loschke", Klick öffnet `lernen.diy/lessons/prompt-baukasten` in neuem Tab.
2. **Tonalität:** Lead-in nennt Plattform und Autor („Auf lernen.diy ... Rico Loschke ..."), nicht werbend, max. ein Satz.
3. **Präzision:** Bei Frage außerhalb des KI-Themas („Hauptstadt von Frankreich") wird das Tool **nicht** aufgerufen.
4. **Latenz:** Tool-Call < 50 ms (rein lokal, kein I/O nach erstem Modul-Load).
5. **Robustheit:** Wenn `LESSONS_TUTOR_ENABLED=false`, fällt Tool weg, Chat bleibt funktional. Sync-Skript-Fehler bricht den Build nicht — `lessons.json` bleibt im letzten guten Stand.
6. **EU/Local-Kompatibilität:** Mit `LLM_ROUTING=direct` funktioniert das Tool unverändert (keine externe Abhängigkeit zur Runtime).

---

## Verifikation (End-to-End)

1. **Sync-Test:** `pnpm sync:lessons` → `src/data/lessons.json` enthält ≥ 1 Item, Zod-Validierung läuft sauber durch
2. **build-jetzt lokal:** `pnpm dev`. `/admin/features` zeigt `lessons.enabled = true`
3. **Positiv-Test:** Frage „Wie schreibe ich gute Prompts für ChatGPT?" → `lessons_search` wird aufgerufen → Antwort enthält Plattform-Lead-in → Lesson-Card erscheint mit korrekter Subline → Klick öffnet externe URL
4. **Negativ-Test:** Frage außerhalb GenAI-Domäne → kein Tool-Call, keine Card
5. **Disziplin-Filter:** Frage „Welche KI-Strategien gibt es für Mittelstand?" → Lessons aus `ai-strategy`
6. **Methoden-Abweichung:** Frage zu einem Thema, bei dem die generelle LLM-Antwort von Ricos Lesson abweicht → Lead-in enthält Hinweis „Rico geht das etwas anders an"
7. **Toggle-Test:** `LESSONS_TUTOR_ENABLED=false` → Tool weg, Lead-ins kommen nicht mehr
8. **Visual:** Lesson-Card ist Brand-konform — Cover sichtbar, Subline „lernen.diy · Lesson von Rico Loschke" zwischen Title und Meta-Pills, Disziplin-Badge in passender Akzentfarbe

---

## V2 / Folgeschritte (außerhalb dieser PRD)

- **Dedizierter „GenAI-Tutor"-Expert** — eigener DB-Eintrag mit pädagogischem Prompt (erst fragen, dann erklären, dann Lesson empfehlen). Frontend-Avatar in Brand-Teal.
- **Volltext-Tool `lessons_open(slug)`** — lädt komplette Lesson-Inhalte (Steps, Blocks, `context.systemPrompt`) für tieferes Q&A im Chat. Erfordert Body-Sync.
- **Public Astro-Endpoint** in lernen.diy + **MCP-Provider `astro-content`** im `mcp-hub` — falls Claude Desktop, Mobile-Apps oder andere MCP-Clients die Lessons konsumieren sollen.
- **Auto-Sync** als `prebuild`-Hook oder GitHub-Action, sobald lernen.diy-Edits regelmäßiger werden
- **Klick-Tracking** via UTM-Parameter (`?utm_source=build-jetzt&utm_medium=tutor`) für Conversion-Messung
- **Vector-Search** falls Lesson-Anzahl deutlich wächst (heute bei 20 → unnötig)
- **Cross-Brand-Erweiterung:** Analoges Pattern für `unlearn.how`-Inhalte (Workshops, Beratungs-Cases)

---

## Bewusst weggelassen (V1)

- Kein API-Feed in lernen.diy (Embedded-Sync ist für Solo-Setup pragmatischer)
- Kein Vector-Search / Embeddings — bei 20 Lessons reicht Tag-/Title-Match
- Kein eigener MCP-Server (kann später nachgezogen werden)
- Kein dedizierter Tutor-Expert (V2)
- Kein Klick-Tracking (V2)
- Keine Volltextsuche im Lesson-Body (nur Meta + Summary in V1)
- Keine personalisierten Empfehlungen basierend auf User-History (V2/V3)
- Kein Auto-Sync — sync ist bewusst manueller Schritt mit Diff-Review
