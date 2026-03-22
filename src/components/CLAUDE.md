# Components

Guidance fuer `src/components/` — UI-Patterns, shadcn/ui, AI Elements und Chat-UI.

## Grundregeln

- **Server Components** als Default. `"use client"` nur bei Event Handlern, Hooks, Browser APIs.
- **shadcn/ui** (`ui/`): Generiert, NICHT manuell aendern. Wrapper bauen.
- **AI Elements** (`ai-elements/`): Lokale Kopien, NICHT manuell aendern. Hinzufuegen: `npx ai-elements@latest add <component>`.
- **Props-Interface** immer direkt ueber der Komponente, nicht in separater Datei.

## Ordner-Struktur

| Ordner | Beschreibung | Pattern |
|--------|-------------|---------|
| `ui/` | shadcn/ui Primitives | Nicht anfassen |
| `ai-elements/` | AI SDK UI-Komponenten | Nicht anfassen |
| `layout/` | App-Shell (Sidebar, Header, NavUser, CreditIndicator) | Server + Client gemischt |
| `chat/` | Chat-UI (ChatView, EmptyState, ExpertSelector, QuicktaskForm, ToolStatus) | Primaer Client |
| `assistant/` | Artifact-Panel (ArtifactPanel, HtmlPreview, CodePreview, ArtifactEditor, QuizRenderer, ReviewRenderer, ImagePreview) | Client |
| `generative-ui/` | Interaktive KI-Widgets (AskUser, ContentAlternatives) | Client |
| `admin/` | Admin-UI (SkillsAdmin, ExpertsAdmin, ModelsAdmin, McpServersAdmin, CreditsAdmin) | Server Page → Client Component |
| `shared/` | Geteilte Komponenten | Variiert |

## Chat-Typografie

Streamdown rendert semantisches HTML. Tailwind Preflight entfernt Default-Margins.

- **`.chat-prose`** Scope in `globals.css`: Line-height, Heading-Hierarchie, Listen, Tabellen, Inline-Code, Blockquotes
- **Code-Bloecke:** `[data-streamdown="code-block"]` Selektoren in `globals.css`
- **Streamdown Safelist:** `src/lib/streamdown-safelist.ts` — KEIN `@source` fuer node_modules (crasht Turbopack auf Windows)

## Elevation-Klassen

Definiert in `globals.css`, nicht inline:

- `.card-elevated` — Statische Cards, Chips
- `.card-interactive` — Klickbare Cards mit Hover-Lift
- `.input-prominent` — Chat-Input-Bereich
- `.glass-card` — Glasmorphism (Landing Page)

## Admin-Pattern

```
src/app/admin/skills/page.tsx (Server Component)
  → Daten laden via getAllSkills()
  → Rendern: <SkillsAdmin skills={skills} />

src/components/admin/skills-admin.tsx (Client Component)
  → "use client"
  → Tabelle, Import-Dialog, Editor, Toggle, Delete
  → API-Calls an /api/admin/skills
```

Jede Admin-Seite folgt diesem Pattern: Server-Page laedt Daten, Client-Component rendert interaktive UI.

## Generative UI

Zwei Patterns fuer KI-gesteuerte UI-Widgets:

### Inline-Tools (kein execute, `addToolResult` Rueckkanal)

| Tool | Component | Verhalten |
|------|-----------|-----------|
| `ask_user` | `generative-ui/ask-user.tsx` | Radio/Checkbox/Textarea, pausiert Stream |
| `content_alternatives` | `generative-ui/content-alternatives.tsx` | Tab-Ansicht, 2-5 Varianten |

### Artifact-Tools (mit execute, Side-Panel)

| Tool | Renderer | Artifact-Type |
|------|----------|--------------|
| `create_artifact` | ArtifactPanel | markdown, html, code |
| `create_quiz` | QuizRenderer | quiz |
| `create_review` | ReviewRenderer | review |
| `generate_image` | ImagePreview | image |

Neue Generative UI Tools: `docs/generative-ui-tools-guide.md`

## Artifact-Panel

Split-View Layout:
- Desktop: Chat 50% | Panel 50%
- Mobile: Panel als Overlay
- Ohne Artifact: Chat volle Breite

Artifact-Types: `markdown` (Streamdown), `html` (iframe sandbox), `code` (Shiki), `quiz`, `review`, `image` (Galerie)
