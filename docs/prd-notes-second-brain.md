# PRD: Notes / Second Brain System

> Status: **Geplant**
> Erstellt: 2026-03-21

---

## Problem

Die Plattform hat mehrere Wissens-Schichten (Mem0 Memories, Project Documents, Artifacts), aber keinen Ort für **bewusst erstellte, strukturierte Notizen**. User können kein persönliches Wissen aufbauen, das über Chat-Sessions hinweg wächst und der KI als Kontext dient.

### Bestehende Systeme und ihre Grenzen

| System | Zweck | Limitation |
|--------|-------|-----------|
| **Mem0 Memories** | Auto-extrahierte semantische Fakten | Kein bewusstes Erstellen, keine Struktur, keine langen Texte |
| **Project Documents** | Injizierter Kontext für AI (projekt-gebunden) | Erfordert Projekt, `projectId` FK mit Cascade Delete, kein `userId` |
| **Artifacts** | Chat-Outputs (per-Chat, versioniert) | Ephemer, an Chat gebunden, kein übergreifender Zugriff |
| **Custom Instructions** | User-Präferenzen für KI-Verhalten | Ein einziges Textfeld, kein strukturiertes Wissen |

### Verworfener Ansatz: Vercel Bash-Tool

Das Vercel `bash-tool` (open-source Bash-Interpreter für AI SDK Agents) wurde evaluiert und verworfen:

- Bietet `bash`, `readFile`, `writeFile` auf einem virtuellen Filesystem
- **Kritische Limitation: Alles ist ephemer.** Nach Request-Ende sind alle Daten weg
- Designed für temporäres File-Processing (grep, jq, Pipes), nicht für persistenten Speicher
- Löst das Vercel-Serverless-Filesystem-Problem nicht

---

## Lösung

Ein **DB-basiertes Notizsystem** (Postgres/Neon) mit user-globalen Notizen, optionaler Projekt-Zuordnung, Tag-basierter Organisation und vollem AI-Zugriff über 5 dedizierte Tools.

### Design-Prinzipien

1. **User-global, nicht projekt-gebunden.** Notizen existieren unabhängig. Projekte sind eine optionale Dimension (wie in Obsidian: Vault hat viele Bereiche, Projekte sind nur einer davon).
2. **Tags statt Ordner.** Flache Organisation ermöglicht Multi-Kategorisierung ohne Hierarchie-Probleme. Area-Tags (`#project/seo-audit`, `#area/learning`) bieten Struktur ohne Rigidität.
3. **AI als First-Class Citizen.** Die KI kann Notizen suchen, lesen, erstellen und aktualisieren. On-demand über Tools, kein Auto-Inject in den Prompt.
4. **Progressive Disclosure.** System-Prompt erwähnt nur die Existenz des Notizsystems + Anzahl. AI lädt Inhalte on-demand über Tools.

### Abgrenzung zu bestehenden Systemen

| Frage | Antwort |
|-------|---------|
| Notes vs. Mem0? | Mem0 = auto-extrahierte Fakten (implizit). Notes = bewusst erstellte Inhalte (explizit). Komplementär. |
| Notes vs. Project Documents? | Project Docs = Referenzmaterial für AI-Kontext-Injection. Notes = persönliche Wissensbasis die über Zeit wächst. |
| Notes vs. Artifacts? | Artifacts = Chat-Outputs (per-Chat). Notes = übergreifend, persistent. Später: "Als Notiz speichern" Aktion. |
| Notes vs. Projects? | Notes haben optionale `projectId` FK. Projekt-Chats wissen über zugehörige Notizen via Tools. |

---

## 1. Schema

**Datei:** `src/lib/db/schema/notes.ts`

Eigene `notes`-Tabelle. Kein Extend von `project_documents` (dort: required `projectId` FK mit Cascade Delete, kein `userId`, keine Tags).

```typescript
notes (
  id            TEXT PRIMARY KEY,              // nanoid(12)
  userId        TEXT NOT NULL,                 // Logto sub
  title         TEXT NOT NULL,
  content       TEXT NOT NULL DEFAULT '',       // Markdown
  tags          TEXT[] DEFAULT '{}',            // Postgres text array
  projectId     TEXT REFERENCES projects(id) ON DELETE SET NULL,  // optional
  isPinned      BOOLEAN NOT NULL DEFAULT false,
  isArchived    BOOLEAN NOT NULL DEFAULT false,
  tokenCount    INTEGER NOT NULL DEFAULT 0,    // Approximation für Prompt-Budget
  searchVector  TSVECTOR,                      // Phase 5: auto-generated
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedAt     TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

### Indexes

| Index | Spalten | Zweck |
|-------|---------|-------|
| Primary listing | `(userId, updatedAt DESC)` | Haupt-Query sortiert nach Aktualität |
| Tag filter | `GIN(tags)` | Tag-basierte Filterung |
| Project filter | `(userId, projectId) WHERE projectId IS NOT NULL` | Projekt-gefilterte Queries |
| Archive filter | `(userId, isArchived)` | Aktive vs. archivierte Notizen |
| Full-text search | `GIN(searchVector)` | Phase 5: Volltextsuche |

### Limits

| Limit | Wert | Begründung |
|-------|------|-----------|
| Notes pro User | 500 | Großzügig für 100+ Target, Postgres handelt das problemlos |
| Content-Größe | 100.000 Zeichen (~25k Tokens) | Lange Dokumente möglich, aber nicht unbegrenzt |
| Title-Länge | 200 Zeichen | |
| Tags pro Note | 10 | Genug für Multi-Kategorisierung |
| Tag-Länge | 50 Zeichen | Ermöglicht Area-Tags wie `project/seo-audit` |
| Token-Budget pro AI-Tool-Call | 8.000 Zeichen | Verhindert Prompt-Overflow |

### Storage-Entscheidung

Alles in Postgres (nicht R2). Full-text Search erfordert Content in der DB. Bei 100–200 Notizen pro User mit Markdown-Content gut innerhalb der Postgres-Grenzen.

---

## 2. API Routes

**Datei-Struktur:**
- `src/app/api/notes/route.ts` — GET (list) + POST (create)
- `src/app/api/notes/[noteId]/route.ts` — GET + PATCH + DELETE
- `src/app/api/notes/tags/route.ts` — GET (alle Tags des Users mit Häufigkeit)

### Endpoints

| Route | Methode | Beschreibung | Rate Limit |
|-------|---------|-------------|-----------|
| `/api/notes` | GET | Liste mit Filter + Cursor-Pagination | 60/min |
| `/api/notes` | POST | Neue Notiz erstellen | 60/min |
| `/api/notes/[noteId]` | GET | Einzelne Notiz lesen | 60/min |
| `/api/notes/[noteId]` | PATCH | Notiz aktualisieren | 60/min |
| `/api/notes/[noteId]` | DELETE | Notiz löschen | 60/min |
| `/api/notes/tags` | GET | Alle Tags + Häufigkeit | 60/min |

### Query-Parameter (GET /api/notes)

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `q` | string | Suchbegriff (ILIKE auf title + content) |
| `tags` | string | Komma-separiert, AND-Logik |
| `projectId` | string | Filter auf Projekt |
| `pinned` | boolean | Nur angepinnte |
| `archived` | boolean | Default `false` |
| `limit` | number | Default 50 |
| `cursor` | string | Cursor-basierte Pagination auf `updatedAt` |

Alle Routes nutzen `requireAuth()`, userId-Scoping auf allen Queries.

---

## 3. AI Tool Integration

5 Tools, alle nach dem Factory-Pattern aus `save-memory.ts` (userId-Closure + Zod-Validierung).

### Tool-Definitionen

| Tool | Parameter | Return |
|------|-----------|--------|
| `search_notes` | `query`, `tags?`, `projectId?`, `limit?` | `{ found: number, notes: [{ id, title, tags, snippet, score }] }` |
| `read_note` | `noteId` | `{ id, title, content, tags, projectId, updatedAt }` |
| `create_note` | `title`, `content`, `tags?`, `projectId?` | `{ noteId, title }` |
| `update_note` | `noteId`, `title?`, `content?`, `tags?`, `projectId?` | `{ noteId, updated: true }` |
| `list_notes` | `tags?`, `projectId?`, `limit?` | `{ notes: [{ id, title, tags, updatedAt }] }` |

### Design-Entscheidungen

- **`search_notes` liefert nur Snippets (200 Zeichen).** Die KI muss `read_note` für den vollen Inhalt nutzen. Verhindert versehentliches Laden von zu viel Content in den Kontext.
- **`list_notes` liefert nur Metadaten.** Kein Content. Für Übersicht und Navigation.
- **Tool-basiert, kein Auto-Inject.** Der System-Prompt erwähnt nur die Existenz. Die KI entscheidet wann sie Notizen laden muss. Analog zu Skills: Übersicht im Prompt, `load_skill` für On-demand-Loading.

### System-Prompt Layer

Neuer Layer in `prompts.ts` (nach Memory, vor Custom Instructions):

```markdown
## Notizen (Second Brain)
Der Nutzer hat ein persönliches Notizsystem mit {noteCount} Notizen.
{Wenn Projekt aktiv: Im aktiven Projekt: {projectNoteCount} Notizen.}
Verfügbare Tools: search_notes, read_note, create_note, update_note, list_notes
Nutze search_notes um relevante Notizen zu finden. Nutze read_note für den vollständigen Inhalt.
```

### Dateien

| Datei | Beschreibung |
|-------|-------------|
| `src/lib/ai/tools/search-notes.ts` | Suche mit Snippets |
| `src/lib/ai/tools/read-note.ts` | Vollständigen Inhalt laden |
| `src/lib/ai/tools/create-note.ts` | Neue Notiz erstellen |
| `src/lib/ai/tools/update-note.ts` | Bestehende Notiz aktualisieren |
| `src/lib/ai/tools/list-notes.ts` | Metadaten-Übersicht |

### Integration in Chat-Route

- **`resolve-context.ts`:** Note-Count parallel in Phase A laden (analog zu Memory-Search)
- **`build-tools.ts`:** 5 Note-Tools registrieren wenn Feature-Flag aktiv
- **`tool-status.tsx`:** Icons für Note-Tools (Notebook, BookOpen etc.)

---

## 4. UI

### Notes-Übersicht (`/notes`)

Folgt dem Pattern von `src/app/artifacts/page.tsx` + `ArtifactsOverview`:

- **Liste:** NotesOverview mit Suche + Tag-Filter + Projekt-Filter
- **Karten:** NoteCard (Title, Tags, Snippet, updatedAt)
- **Sidebar:** Link "Meine Notizen" (BookOpen Icon, neben "Meine Dateien")
- **Leer-State:** Erklärung + "Erste Notiz erstellen" CTA

### Note-Editor (`/notes/[noteId]`)

CodeMirror Markdown-Editor, wiederverwendet Pattern aus `artifact-editor.tsx`:

- **Header:** Title (editierbar), Tags (TagInput), Projekt-Zuweisung, Pin/Archive Toggle
- **Editor:** CodeMirror mit Markdown-Mode, Dark-Mode Support
- **Preview:** Optional Split-View mit Streamdown-Rendering
- **Speichern:** Auto-Save nach Debounce (1s) oder explizit

### Neue Notiz (`/notes/new`)

- Leerer Editor mit Title-Focus
- Optionale Tag-Vorschläge basierend auf existierenden Tags

### Komponenten

| Datei | Beschreibung |
|-------|-------------|
| `src/components/notes/notes-overview.tsx` | Liste + Filter + Suche |
| `src/components/notes/note-card.tsx` | Karten-Darstellung |
| `src/components/notes/note-editor.tsx` | CodeMirror Editor |
| `src/components/notes/tag-input.tsx` | Tag-Eingabe mit Autocomplete |

---

## 5. Feature Flag

```typescript
// src/config/features.ts
notes: { enabled: process.env.NEXT_PUBLIC_NOTES_ENABLED !== "false" },  // Opt-out
```

Opt-out Pattern (Default enabled), da Notes rein DB-basiert sind ohne externe Dependency.

---

## 6. Phasenplan

### Phase 1: Schema + API + Feature Flag (Core CRUD)

1. `notes`-Tabelle + Drizzle Schema + Migration
2. DB Queries (`src/lib/db/queries/notes.ts`) — CRUD + ILIKE-Suche
3. API Routes: `/api/notes`, `/api/notes/[noteId]`, `/api/notes/tags`
4. Feature Flag: `NEXT_PUBLIC_NOTES_ENABLED` (Opt-out)
5. Types in `src/types/note.ts`

**Ergebnis:** Funktionierendes Backend, per API testbar.

### Phase 2: Notes UI

1. `/notes` Page mit NotesOverview (Liste + Suche + Tag-Filter + Projekt-Filter)
2. `/notes/[noteId]` Page mit NoteEditor (CodeMirror Markdown)
3. `/notes/new` Page
4. Sidebar-Link "Meine Notizen" (BookOpen Icon)
5. NoteCard + TagInput Komponenten

**Ergebnis:** User kann Notizen erstellen, bearbeiten, suchen, filtern.

### Phase 3: AI Tool Integration

1. 5 Tool-Dateien in `src/lib/ai/tools/`
2. Tool-Registrierung in `build-tools.ts`
3. Notes-Section im System-Prompt (`prompts.ts`)
4. Note-Stats Query in `resolve-context.ts` (parallel in Phase A)
5. Tool-Status Icons in `tool-status.tsx`

**Ergebnis:** KI kann Notizen suchen, lesen, erstellen und aktualisieren.

### Phase 4: Projekt-Integration

1. Projekt-Settings zeigen Anzahl verknüpfter Notizen
2. Notes-Übersicht: Projekt-Filter
3. AI-Tools akzeptieren `projectId` Parameter
4. "Notiz zu Projekt zuordnen" im Note-Editor

**Ergebnis:** Notizen und Projekte sind verknüpfbar.

### Phase 5: Full-Text Search + Polish

1. PostgreSQL `tsvector`-Spalte + GIN-Index
2. Trigger oder App-Level tsvector-Update bei Content-Änderungen
3. Deutsch + Englisch Language-Support
4. "Als Notiz speichern" Aktion auf Artifacts und Chat-Nachrichten
5. Note-Pinning in Sidebar
6. Tag-Autocomplete mit Häufigkeits-Sortierung

**Ergebnis:** Schnelle Volltextsuche, nahtlose Integration mit Chat und Artifacts.

---

## 7. Datei-Übersicht

### Neue Dateien (19)

| Datei | Phase |
|-------|-------|
| `src/lib/db/schema/notes.ts` | 1 |
| `src/lib/db/queries/notes.ts` | 1 |
| `src/types/note.ts` | 1 |
| `src/app/api/notes/route.ts` | 1 |
| `src/app/api/notes/[noteId]/route.ts` | 1 |
| `src/app/api/notes/tags/route.ts` | 1 |
| `src/components/notes/notes-overview.tsx` | 2 |
| `src/components/notes/note-card.tsx` | 2 |
| `src/components/notes/note-editor.tsx` | 2 |
| `src/components/notes/tag-input.tsx` | 2 |
| `src/app/notes/page.tsx` | 2 |
| `src/app/notes/[noteId]/page.tsx` | 2 |
| `src/app/notes/new/page.tsx` | 2 |
| `src/lib/ai/tools/search-notes.ts` | 3 |
| `src/lib/ai/tools/read-note.ts` | 3 |
| `src/lib/ai/tools/create-note.ts` | 3 |
| `src/lib/ai/tools/update-note.ts` | 3 |
| `src/lib/ai/tools/list-notes.ts` | 3 |
| `src/app/notes/loading.tsx` | 2 |

### Modifizierte Dateien (7)

| Datei | Phase | Änderung |
|-------|-------|---------|
| `src/lib/db/schema/index.ts` | 1 | Re-Export notes Schema |
| `src/config/features.ts` | 1 | Notes Feature Flag |
| `src/app/api/chat/build-tools.ts` | 3 | Note-Tools registrieren |
| `src/config/prompts.ts` | 3 | Notes System-Prompt Layer |
| `src/app/api/chat/resolve-context.ts` | 3 | Note-Count laden |
| `src/components/layout/chat-sidebar-content.tsx` | 2 | "Meine Notizen" Link |
| `src/components/chat/tool-status.tsx` | 3 | Note-Tool Icons |

---

## 8. Bewusst nicht enthalten

- **Kein Embedding-basierter Search.** Mem0 deckt semantische Suche ab. Notes nutzen Keyword/Tag-Suche.
- **Kein Ordner-System.** Tags sind flexibler und vermeiden Single-Categorization-Problem.
- **Kein Collaborative Editing.** Single-User System.
- **Kein Markdown-WYSIWYG.** CodeMirror mit Markdown-Syntax, kein Rich-Text-Editor.
- **Keine Backlinks / Graph-View.** Obsidian-Feature das in einer Chat-Plattform keinen Mehrwert bringt.
- **Keine Import/Export-Funktion in Phase 1–3.** Kann später als Admin-Feature ergänzt werden.
- **Kein Note-Versioning.** Anders als Artifacts — Notizen sind living documents, nicht versionierte Outputs.

---

## 9. Referenz-Patterns

Bestehende Dateien die als Vorlage dienen:

| Pattern | Referenz-Datei |
|---------|---------------|
| DB Schema | `src/lib/db/schema/artifacts.ts` |
| DB Queries | `src/lib/db/queries/artifacts.ts` |
| API Routes | `src/app/api/artifacts/[artifactId]/route.ts` |
| AI Tool (Factory) | `src/lib/ai/tools/save-memory.ts` |
| Übersichts-Page | `src/app/artifacts/page.tsx` |
| Editor | `src/components/assistant/artifact-editor.tsx` |
| Feature Flag | `src/config/features.ts` (bestehendes Pattern) |
