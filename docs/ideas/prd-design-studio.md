# PRD: Design Studio (v2)

> **Status:** Implementierungsbereit
> **Erstellt:** 2026-03-25
> **Ueberarbeitet:** 2026-04-01 (v2 — Galerie-Seite statt Chat-Empty-State)
> **Abhaengigkeiten:** Bildgenerierung (Gemini), Artifact-Panel, Design-Library DB (extern, Neon)

---

## 1. Feature-Uebersicht

### Was ist das Design Studio?

Eine dedizierte Galerie-Seite (`/design-library`) innerhalb der bestehenden Shell, die 68 erprobte Prompt-Formeln und 1.000+ Beispielbilder aus einer externen Design-Library browsebar macht. Von dort startet der User gezielte Bild-Sessions in neuen Chats.

Zusaetzlich: Ein verbesserter Bildgenerierungs-Flow im normalen Chat mit einer GenUI-Komponente die vor der Generierung Seitenverhaeltnis und Motiv-Details abfragt.

### Zwei getrennte Verbesserungen

| Feature | Wo | User-Wert |
|---------|------|-----------|
| **Design Library Browser** | `/design-library` (eigene Seite) | Exploration, Inspiration, gezielte Formel-Auswahl |
| **Image Generation GenUI** | Jeder Chat | Bessere Bildgenerierung durch Seitenverhaeltnis-Auswahl und Prompt-Vorschlaege |

### Was aendert sich gegenueber heute?

| Aspekt | Heute | Neu |
|--------|-------|-----|
| Bildgenerierung | Freitext, AI raet Seitenverhaeltnis | GenUI fragt Seitenverhaeltnis + Details ab |
| Prompt-Formeln | Nicht zugaenglich | Browsebar mit Filtern, Template + Legende sichtbar |
| Beispielbilder | Nicht vorhanden | 1.000+ Bilder als Inspiration oder Edit-Startpunkt |
| Image-to-Image | Nur eigene Uploads | Library-Bilder direkt als Referenz verwenden |

---

## 2. Scope

### In Scope

- `/design-library` Route mit Galerie-Grid (volle Shell-Breite)
- Sidepanel fuer Formel-Details (Template, Legende, Beispielbilder)
- Flow A: "Variante erstellen" → Neuer Chat mit Formel-Kontext + GenUI Eingabe
- Flow B: "Bild bearbeiten" → Neuer Chat mit Referenzbild + GenUI Eingabe
- GenUI-Komponente: `ImageGenerationForm` (Beschreibung + Seitenverhaeltnis)
- GenUI-Komponente: `ImageEditForm` (Referenzbild-Vorschau + Aenderungsbeschreibung)
- Erweiterte Seitenverhaeltnisse (Gemini unterstuetzt 14 Formate)
- "Neues Bild" im + Menue → `/design-library`
- Feature-Flag `designLibrary` via `DESIGN_LIBRARY_DATABASE_URL`
- `search_design_library` Tool fuer Chat-basierte Suche (alle Experts, kein Custom Renderer)

### Out of Scope

- Schreibzugriff auf Design-Library DB
- Eigene Formeln erstellen/bearbeiten
- Inpainting, Masking, Outpainting
- Batch-Generierung, Social Features
- Design Studio Expert (nicht noetig — Galerie + GenUI reichen)

---

## 3. Datenquelle: Design-Library

### Externe Neon-Datenbank

| Eigenschaft | Wert |
|-------------|------|
| Projekt | `calm-flower-41449143` |
| Region | `azure-gwc` (EU) |
| Zugriff | Read-only via `@neondatabase/serverless` |
| ENV-Variable | `DESIGN_LIBRARY_DATABASE_URL` |
| Filter | Formeln: `status = 'Fertig'` (68/72), Results: alle (1.039) |

**Wichtig:** `isPublished` ist in beiden Tabellen nie gesetzt. Formeln filtern auf `status = 'Fertig'`, Results ohne Filter.

### Schema (unveraendert)

- `image_prompt_formulas`: 72 Eintraege (68 mit status 'Fertig')
  - `name` (jsonb: de/en), `templateText`, `legend` (jsonb: de/en), `usageType`, `mediumType`, `tags`, `previewUrl`
- `image_formula_results`: 1.039 Eintraege
  - `formulaId` (FK), `promptText`, `promptTextDe`, `previewUrl`, `imageModel`, `category`, `tags`

---

## 4. Architektur

### 4.1 Galerie-Seite: `/design-library`

```
/design-library (Route innerhalb ChatShell)
┌─ Shell ──────────────────────────────────────────────────────────────┐
│ Sidebar | Header                                                     │
│         │                                                            │
│         │ ┌─ Hauptbereich ───────────────┬─ Sidepanel ─────────────┐│
│         │ │                              │                         ││
│         │ │  [Typ ▾] [Medium ▾] [🔍___]  │  Formelname             ││
│         │ │                              │  Preview-Bild           ││
│         │ │  ┌────┐ ┌────┐ ┌────┐ ┌────┐│                         ││
│         │ │  │Card│ │Card│ │Card│ │Card││  Template:              ││
│         │ │  └────┘ └────┘ └────┘ └────┘│  "A [subject] in..."    ││
│         │ │  ┌────┐ ┌────┐ ┌────┐ ┌────┐│                         ││
│         │ │  │Card│ │●akt│ │Card│ │Card││  Legende (de):          ││
│         │ │  └────┘ └────┘ └────┘ └────┘│  - subject: Hauptmotiv  ││
│         │ │  ┌────┐ ┌────┐ ┌────┐ ┌────┐│  - lighting: Licht      ││
│         │ │  │Card│ │Card│ │Card│ │Card││                         ││
│         │ │  └────┘ └────┘ └────┘ └────┘│  [Variante erstellen]   ││
│         │ │                              │                         ││
│         │ │                              │  Beispielbilder:        ││
│         │ │                              │  ┌───┐┌───┐┌───┐┌───┐  ││
│         │ │                              │  │img││img││img││img│  ││
│         │ │                              │  │[⎋]││[⎋]││[⎋]││[⎋]│  ││
│         │ │                              │  └───┘└───┘└───┘└───┘  ││
│         │ └──────────────────────────────┴─────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

**Server Component** `/design-library/page.tsx` innerhalb der ChatShell.
**Client Component** `DesignLibraryView` mit Grid + Sidepanel.

### 4.2 Flow A: Variante erstellen

```
User klickt [Variante erstellen] im Sidepanel
  → Navigation zu /?formula={formulaId}
  → Neuer Chat wird erstellt
  → System sendet erste AI-Nachricht die ImageGenerationForm rendert
  → User fuellt aus: Beschreibung + Seitenverhaeltnis
  → AI fuellt Template-Variablen aus dem User-Input
  → generate_image mit ausgefuelltem Prompt + gewaehltem Seitenverhaeltnis
  → Bild im Artifact-Panel, normaler Iterations-Flow
```

**Kontext-Uebergabe:** Die Formel-Daten (Template + Legende) werden als System-Kontext an den Chat uebergeben, z.B. via Query-Parameter `?formula={id}`. Die Chat-Route laedt die Formel und injiziert sie in den System-Prompt oder als erste Nachricht.

### 4.3 Flow B: Beispielbild bearbeiten

```
User klickt [Bearbeiten] auf Beispielbild im Sidepanel
  → Navigation zu /?referenceImage={encodedUrl}&originalPrompt={encodedPrompt}
  → Neuer Chat wird erstellt
  → System sendet erste AI-Nachricht die ImageEditForm rendert
  → User beschreibt gewuenschte Aenderungen
  → generate_image mit referenceImageUrl + Edit-Prompt
  → Bild im Artifact-Panel, normaler Iterations-Flow
```

**Original-Prompt:** Wird unsichtbar fuer den User mitgeschickt, gibt der AI Kontext ueber das Bild.

### 4.4 GenUI-Komponenten

#### ImageGenerationForm (fuer Flow A + normaler Chat)

```typescript
interface ImageGenerationFormProps {
  formulaName?: string        // Nur bei Library-Flow
  formulaTemplate?: string    // Nur bei Library-Flow
  onSubmit: (data: { description: string; aspectRatio: string }) => void
  isReadOnly?: boolean
  previousData?: { description: string; aspectRatio: string }
}
```

Rendert:
- Optional: Formel-Name + Template-Vorschau (wenn aus Library)
- Textarea: "Was moechtest du erstellen?"
- Seitenverhaeltnis-Auswahl (visuelle Buttons, nicht Dropdown):
  - 1:1 (Quadrat), 16:9 (Quer), 9:16 (Hoch), 3:2 (Foto quer), 2:3 (Foto hoch)
  - 4:3 (Klassisch), 3:4 (Portrait), 4:5 (Instagram), 21:9 (Ultrawide)
- [Bild generieren] Button

**Auch im normalen Chat nutzbar:** Wenn die AI `generate_image` aufrufen will, kann sie stattdessen zuerst `image_generation_form` (no-execute Tool) aufrufen, das diese Komponente rendert. Der User waehlt Seitenverhaeltnis, die AI generiert dann mit den exakten Parametern.

#### ImageEditForm (fuer Flow B)

```typescript
interface ImageEditFormProps {
  referenceImageUrl: string
  onSubmit: (data: { editDescription: string }) => void
  isReadOnly?: boolean
  previousData?: { editDescription: string }
}
```

Rendert:
- Referenzbild-Vorschau (Thumbnail)
- Textarea: "Was moechtest du aendern?"
- [Bild bearbeiten] Button

### 4.5 Seitenverhaeltnisse (erweitert)

Gemini unterstuetzt 14 Formate. Wir bieten eine kuratierte Auswahl:

| Verhaeltnis | Label | Use Case |
|-------------|-------|----------|
| 1:1 | Quadrat | Social Media, Profilbilder |
| 16:9 | Querformat | Header, Banner, Desktop |
| 9:16 | Hochformat | Stories, Reels, Mobile |
| 3:2 | Foto quer | Klassische Fotografie |
| 2:3 | Foto hoch | Portrait, Poster |
| 4:3 | Klassisch | Praesentationen |
| 3:4 | Portrait | Pinterest, Print |
| 4:5 | Instagram | Instagram Feed |
| 21:9 | Ultrawide | Cinematic, Hero-Banner |

Aktuell im Tool: nur 5 Optionen (`1:1, 16:9, 9:16, 3:2, 2:3`). Wird auf 9 erweitert.

### 4.6 Tool: search_design_library (unveraendert)

- `customRenderer: false` — zeigt Text-Output als ToolStatus
- Global verfuegbar fuer alle Experts
- Fuer Chat-basierte Suche, nicht fuer den Galerie-Flow

### 4.7 Tool: image_generation_form (neu, no-execute)

```typescript
{
  name: "image_generation_form",
  description: "Zeigt dem User ein Formular zur Bildgenerierung mit Seitenverhaeltnis-Auswahl. Nutze dieses Tool BEVOR du generate_image aufrufst, damit der User das gewuenschte Format waehlen kann.",
  inputSchema: z.object({
    formulaName: z.string().optional(),
    formulaTemplate: z.string().optional(),
    suggestedDescription: z.string().optional(),
  }),
  // NO execute — pauses stream, client renders ImageGenerationForm
}
```

**Flow im normalen Chat:**
1. User: "Erstelle mir ein Bild von einem Sonnenuntergang"
2. AI ruft `image_generation_form` auf (statt direkt `generate_image`)
3. User sieht Formular: Beschreibung (pre-filled) + Seitenverhaeltnis
4. User waehlt 16:9, klickt [Generieren]
5. AI erhaelt Antwort, ruft `generate_image` mit Prompt + aspectRatio auf

---

## 5. Implementierungsplan

### Phase 1: Backend (bestehend, neu aufbauen)

| Task | Beschreibung | Size |
|------|-------------|------|
| Feature-Flag | `designLibrary` in features.ts | S |
| DB-Client | `src/lib/db/design-library.ts` | S |
| API Routes | 6 Endpunkte unter `/api/design-library/` | M |
| ENV | `.env.example` + `.env.eu.example` | S |
| search_design_library Tool | Tool + Registry + build-tools (customRenderer: false) | M |
| generate_image Erweiterung | `referenceImageUrl` Parameter, erweiterte aspectRatios | S |

### Phase 2: Galerie-Seite

| Task | Beschreibung | Size |
|------|-------------|------|
| Route | `/design-library/page.tsx` innerhalb ChatShell | S |
| DesignLibraryView | Client Component: Grid + Filter + Sidepanel | L |
| Formel-Cards | Card-Komponente mit Preview, Name, Badges | S |
| Sidepanel | Formel-Detail: Template, Legende, Beispielbilder, Aktionen | M |
| "Neues Bild" im + Menue | Link zu `/design-library` | S |

### Phase 3: GenUI-Komponenten + Chat-Integration

| Task | Beschreibung | Size |
|------|-------------|------|
| ImageGenerationForm | GenUI-Komponente (Beschreibung + Seitenverhaeltnis) | M |
| ImageEditForm | GenUI-Komponente (Referenzbild + Aenderungsbeschreibung) | S |
| image_generation_form Tool | No-execute Tool + Renderer | M |
| Chat-Einstieg Formula | `/?formula={id}` → Formel laden → ImageGenerationForm | M |
| Chat-Einstieg Reference | `/?referenceImage={url}` → ImageEditForm | S |

### Phase 4: Polish

| Task | Beschreibung | Size |
|------|-------------|------|
| Error Handling | DB-Fehler, fehlende Bilder, leere Suche | S |
| System-Prompt Anpassung | AI soll image_generation_form nutzen statt direkt generieren | S |
| next/image oder img-Tags | Bilder mit lazy loading, feste Dimensionen | S |

**Gesamtaufwand:** ~5-7 Tage

---

## 6. Dateien-Uebersicht

### Neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/lib/db/design-library.ts` | Separater Neon DB Client |
| `src/app/api/design-library/formulas/route.ts` | Formeln API |
| `src/app/api/design-library/formulas/[id]/route.ts` | Formel-Detail API |
| `src/app/api/design-library/results/route.ts` | Bilder API |
| `src/app/api/design-library/results/[id]/route.ts` | Bild-Detail API |
| `src/app/api/design-library/categories/route.ts` | Kategorien API |
| `src/app/api/design-library/meta/route.ts` | Meta-Daten API |
| `src/lib/ai/tools/search-design-library.ts` | Tool (customRenderer: false) |
| `src/lib/ai/tools/image-generation-form.ts` | No-execute Tool |
| `src/app/design-library/page.tsx` | Galerie-Route |
| `src/components/design-library/design-library-view.tsx` | Galerie Client Component |
| `src/components/design-library/formula-card.tsx` | Formel-Card |
| `src/components/design-library/formula-detail-panel.tsx` | Sidepanel |
| `src/components/generative-ui/image-generation-form.tsx` | GenUI: Beschreibung + Seitenverhaeltnis |
| `src/components/generative-ui/image-edit-form.tsx` | GenUI: Referenzbild + Edit |

### Modifizierte Dateien

| Datei | Aenderung |
|-------|----------|
| `src/config/features.ts` | `designLibrary` Feature Flag |
| `src/lib/ai/tools/registry.ts` | 2 neue Tool-Registrierungen |
| `src/app/api/chat/build-tools.ts` | 2 neue Tools conditional |
| `src/lib/ai/tools/generate-image.ts` | `referenceImageUrl` + erweiterte aspectRatios |
| `src/lib/ai/image-generation.ts` | Erweiterte aspectRatio-Type |
| `src/components/layout/chat-header.tsx` | "Neues Bild" im + Menue |
| `src/components/layout/chat-shell.tsx` | designLibraryEnabled Prop |
| `src/components/chat/tool-renderers.tsx` | 2 neue Renderer |
| `src/app/page.tsx` | `?formula=` und `?referenceImage=` Parameter |
| `.env.example` + `.env.eu.example` | ENV Variable |

---

## 7. EU/Local-Kompatibilitaet

| Aspekt | Status |
|--------|--------|
| Design-Library DB | EU (azure-gwc) |
| Feature-Flag | Opt-in via ENV |
| Tool-Registrierung | Bedingt in build-tools.ts |
| Bildgenerierung | Bestehender generate_image Flow |
| Galerie-Seite | Nur sichtbar wenn Feature aktiv |

---

## 8. Entscheidungen (geklaert)

1. **Sidepanel:** shadcn Sheet von rechts
2. **image_generation_form:** Immer als Zwischenschritt vor jeder Bildgenerierung (AI ruft zuerst image_generation_form auf, dann generate_image)
3. **Formel-Kontext:** Sichtbare erste AI-Nachricht im Chat (keine System-Prompt-Erweiterung)
4. **Design Studio Expert:** Kommt zurueck (schlank) — gibt der AI Kontext fuer bessere Bildgenerierung, steuert aber nicht die Library. Wird automatisch gesetzt wenn User ueber Library-Flow in den Chat kommt.

---

## 9. Design Studio Expert (schlank)

Wird via `seeds/experts/design-studio.md` angelegt. Kein Library-Steuerungswissen, nur Bildgenerierungs-Kompetenz.

**Kern-Aufgaben:**
- Nutze IMMER `image_generation_form` bevor du ein Bild generierst
- Fuelle Template-Variablen basierend auf User-Beschreibung aus
- Generiere englische Prompts, erklaere auf Deutsch
- Biete bei Unsicherheit 2-3 Varianten an (via content_alternatives)
- Iteriere basierend auf Feedback

**allowedTools:** `image_generation_form`, `generate_image`, `create_artifact`, `content_alternatives`, `search_design_library`
