# PRD: Design Studio

> **Status:** Konzeptphase
> **Erstellt:** 2026-03-25
> **Abhaengigkeiten:** Bildgenerierung (Gemini, vorhanden), Artifact-Panel (vorhanden), Design-Library DB (extern, Neon)

---

## 1. Feature-Uebersicht

### Was ist das Design Studio?

Ein dedizierter Modus innerhalb der bestehenden Chat-App, der den Chat als Steuerkanal mit einem erweiterten visuellen Panel fuer Bildsuche, Bildgenerierung und Bildbearbeitung kombiniert. Die Datenbasis bildet eine externe Design-Library mit 72 Prompt-Formeln und ueber 1.000 Beispielbildern.

### Was wird moeglich?

| Feature            | User-Wert                                   | Beschreibung                                                                  |
| ------------------ | ------------------------------------------- | ----------------------------------------------------------------------------- |
| Formel-Suche       | Schnell den richtigen Prompt-Bauplan finden | Volltextsuche und Filter ueber 72 erprobte Bildgenerierungs-Formeln           |
| Formula Generate   | Professionelle Bilder ohne Prompt-Expertise | Formel auswaehlen, Variablen im Chat ausfuellen, Bild generieren              |
| Bild-Browse        | Inspiration aus 1.000+ Beispielbildern      | Galerie mit Kategorie-Filter, Vorschaubilder, Detailansicht                   |
| Image Edit         | Bestehende Bilder als Ausgangspunkt nutzen  | Bild aus Library waehlen, Edit-Prompt formulieren, Variation generieren       |
| Iterations-History | Kreativprozess nachvollziehen               | Alle Schritte (Ausgangsbilder, Generierungen, Edits) in einem Chat persistent |

### Abgrenzung: Heute vs. mit Design Studio

| Aspekt            | Heute                                    | Mit Design Studio                                          |
| ----------------- | ---------------------------------------- | ---------------------------------------------------------- |
| Bildgenerierung   | Freitext-Prompt im Chat, Trial-and-Error | Erprobte Formeln mit Variablen-Legende und Beispielbildern |
| Bildsuche         | Nicht vorhanden                          | Browse/Filter ueber 1.000+ kategorisierte Beispielbilder   |
| Image-to-Image    | Nur mit Upload eigener Bilder            | Bestehende Library-Bilder direkt als Referenz verwenden    |
| Layout            | Chat fullwidth, Artifact 50/50           | Chat schmal (1/3), Studio-Panel gross (2/3)                |
| Wiederfindbarkeit | Bilder in normalen Chats verstreut       | Design-Chats als eigener Typ in der Sidebar erkennbar      |

---

## 2. Scope

### In Scope

- Mode-Switcher in der Sidebar (Chat / Design Studio)
- Studio-Layout: Chat 1/3 links, Studio-Panel 2/3 rechts
- API-Layer fuer read-only Zugriff auf externe Design-Library DB
- Formel-Suche (Volltext + Filter nach usageType, mediumType)
- Formel-Detailansicht mit Template, Variablen-Legende und Beispielbildern
- Gallery-Ansicht fuer Beispielbilder mit Kategorie-Filter
- Flow 1: Formel auswaehlen und via Chat-Prompt ausfuellen lassen, dann generieren
- Flow 2: Beispielbild auswaehlen und als Referenz an Bildgenerierung uebergeben
- Chat-Typ-Flag (`design`) fuer visuelle Unterscheidung in der Sidebar
- Automatischer Layout-Wechsel beim Oeffnen eines Design-Chats

### Out of Scope (bewusst ausgeschlossen)

- Schreibzugriff auf die Design-Library DB (bleibt read-only)
- Eigene Formeln erstellen oder bearbeiten (passiert ausserhalb der App)
- Weitere Bild-Modelle neben Gemini (spaetere Erweiterung)
- Inpainting, Masking, Outpainting (nicht vom aktuellen Modell unterstuetzt)
- Batch-Generierung (mehrere Bilder gleichzeitig)
- Social Features (Bilder teilen, Community-Galerie)
- Eigene Upload-Bibliothek (User-Bilder verwalten)

---

## 3. Datenquelle: Design-Library

### Externe Neon-Datenbank

| Eigenschaft  | Wert                                     |
| ------------ | ---------------------------------------- |
| Projekt      | `calm-flower-41449143` (Design-Library)  |
| Datenbank    | `neondb`                                 |
| Region       | `azure-gwc`                              |
| Zugriff      | Read-only via `@neondatabase/serverless` |
| ENV-Variable | `DESIGN_LIBRARY_DATABASE_URL`            |

### Schema: `image_prompt_formulas` (72 Eintraege)

| Spalte                   | Typ       | Beschreibung                                                                                                                      |
| ------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `id`                     | text (PK) | UUID                                                                                                                              |
| `name`                   | jsonb     | `{ de: string, en: string }`                                                                                                      |
| `templateText`           | text      | Prompt-Template mit `[Platzhalter]`-Syntax                                                                                        |
| `variables`              | jsonb     | Array (aktuell leer, Platzhalter im Template)                                                                                     |
| `legend`                 | jsonb     | `{ de: string, en: string }` — Markdown mit Erklaerungen und Beispielen pro Variable                                              |
| `usageType`              | text      | Kategorie: Art, Assets, Konzept & Prototyping, Marketing Materialien, Real Life, Scrollstopper/Ads & Abstraktes, Stock Fotografie |
| `mediumType`             | text      | Medium: Fotografie, Hintergruende, Illustration, Stock, UX/UI, Variable                                                           |
| `tags`                   | jsonb     | `{ de: string[], en: string[] }`                                                                                                  |
| `previewUrl`             | text      | R2-URL zum Vorschaubild der Formel                                                                                                |
| `creator`                | text      | Ersteller                                                                                                                         |
| `isFree` / `isPublished` | boolean   | Sichtbarkeits-Flags                                                                                                               |
| `searchVector`           | jsonb     | Suchindex (optional)                                                                                                              |

### Schema: `image_formula_results` (1.039 Eintraege)

| Spalte                   | Typ       | Beschreibung                                                               |
| ------------------------ | --------- | -------------------------------------------------------------------------- |
| `id`                     | text (PK) | UUID                                                                       |
| `formulaId`              | text (FK) | Referenz auf `image_prompt_formulas.id`                                    |
| `promptText`             | text      | Ausgefuellter Prompt (konkretes Beispiel)                                  |
| `previewUrl`             | text      | R2-URL zum generierten Bild                                                |
| `imageModel`             | text      | Generierungs-Modell (99% Midjourney, Rest Flux Pro, SD, Leonardo)          |
| `category`               | text      | 68 Kategorien (z.B. "Breathtaking Landscapes", "Product Ads", "Icon Sets") |
| `tags`                   | jsonb     | `{ de: string[], en: string[] }`                                           |
| `isFree` / `isPublished` | boolean   | Sichtbarkeits-Flags                                                        |
| `notes`                  | text      | Optionale Anmerkungen                                                      |

### Beispiel-Formel: "Breathtaking Landscapes"

**Template:**

```
A breathtaking landscape photo of [Hauptmotiv], captured in a [Stil und Stimmung] style.
The scene is lit with [Beleuchtung und Atmosphaere], featuring a [Farbpalette] color scheme.
The composition follows [Komposition und Perspektive] principles, with [Details und Elemente]
elements to enhance the visual appeal.
```

**Legend (Variablen-Erklaerung):**

- **Hauptmotiv**: Das zentrale Thema, z.B. a mountain range, a tropical beach, a dense forest
- **Stil und Stimmung**: z.B. dramatic and moody, serene and peaceful, vibrant and colorful
- **Beleuchtung und Atmosphaere**: z.B. golden hour sunlight, misty morning light, stormy skies
- **Farbpalette**: z.B. warm earth tones, cool blues and grays, vibrant greens and golds
- **Komposition und Perspektive**: z.B. rule of thirds, leading lines, aerial perspective
- **Details und Elemente**: z.B. a winding river, scattered wildflowers, dramatic cloud formations

---

## 4. Architektur

### 4.1 Layout-Konzept

```
┌──────────────────────────────────────────────────────────┐
│  ChatHeader                                              │
├────────┬─────────────────────────────────────────────────┤
│Sidebar │  ┌──────────┬──────────────────────────────────┐│
│        │  │          │                                  ││
│[Chat]  │  │  Chat    │       Studio Panel               ││
│[Studio]│  │  (1/3)   │         (2/3)                    ││
│        │  │          │                                  ││
│--------|  │  Prompt   │  Browse | Preview | Generate    ││
│History │  │  Input   │                                  ││
│  💬 .. │  │          │                                  ││
│  🎨 .. │  └──────────┴──────────────────────────────────┘│
└────────┴─────────────────────────────────────────────────┘
```

**Desktop (>= 1024px):** Chat 1/3, Studio-Panel 2/3
**Tablet (768-1023px):** Sidebar collapsed, Chat 1/3, Studio-Panel 2/3
**Mobile (< 768px):** Chat und Studio-Panel als Tabs/Overlay (wie Artifact-Panel heute)

### 4.2 Mode-Switcher

Position: Sidebar-Header, unterhalb des Logos.

```
┌─────────────────┐
│  RL.             │
├─────────────────┤
│ [💬 Chat      ] │  ← aktiver Modus highlighted
│ [🎨 Studio    ] │
├─────────────────┤
│ Heute            │
│  💬 API Frage    │
│  🎨 Landschaft   │
│ Gestern          │
│  ...             │
└─────────────────┘
```

- Wechsel zwischen Modi erstellt keinen neuen Chat
- Neuer Chat im Studio-Modus bekommt automatisch `chatType: "design"`
- Oeffnen eines bestehenden Design-Chats wechselt automatisch ins Studio-Layout
- Oeffnen eines normalen Chats wechselt zurueck ins Standard-Layout

### 4.3 Studio-Panel Zustaende

Das Studio-Panel rechts ist kontextsensitiv und zeigt je nach Interaktionszustand unterschiedliche Views:

**A) Empty State — Formel-Browser**
Wird angezeigt wenn noch kein Bild generiert oder ausgewaehlt wurde.

```
┌──────────────────────────────────────┐
│ 🔍 Suche nach Formeln oder Bildern  │
├──────────────────────────────────────┤
│ Filter: [usageType ▾] [mediumType ▾]│
├──────────────────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│ │    │ │    │ │    │ │    │  Formel- │
│ │ 🖼 │ │ 🖼 │ │ 🖼 │ │ 🖼 │  Cards  │
│ │    │ │    │ │    │ │    │         │
│ └────┘ └────┘ └────┘ └────┘        │
│ Breatht.. App UI  3D Pro.. Freist.. │
│                                      │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│ │    │ │    │ │    │ │    │         │
│ ...                                  │
└──────────────────────────────────────┘
```

**B) Formel-Detail — Template + Beispiele**
Wird angezeigt nach Auswahl einer Formel (via Click oder Chat-Suche).

```
┌──────────────────────────────────────┐
│ ← Zurueck        Breathtaking Land. │
├──────────────────────────────────────┤
│ Template:                            │
│ ┌──────────────────────────────────┐ │
│ │ A breathtaking landscape photo   │ │
│ │ of [Hauptmotiv], captured in a   │ │
│ │ [Stil und Stimmung] style...     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Variablen:                           │
│ • Hauptmotiv — z.B. mountain range  │
│ • Stil und Stimmung — z.B. dramatic │
│ • Beleuchtung — z.B. golden hour    │
│                                      │
│ Beispielbilder (18):                 │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│ │    │ │    │ │    │ │    │         │
│ └────┘ └────┘ └────┘ └────┘        │
└──────────────────────────────────────┘
```

**C) Bild-Galerie — Kategorie-Browse**
Erreichbar ueber Tab-Umschalter oder Suchergebnis.

```
┌──────────────────────────────────────┐
│ [Formeln] [Bilder]   🔍 Suche       │
├──────────────────────────────────────┤
│ Kategorie: [Alle ▾]  Sortierung: ▾  │
├──────────────────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│ │    │ │    │ │    │ │    │         │
│ │    │ │    │ │    │ │    │  Bild-  │
│ │    │ │    │ │    │ │    │  Grid   │
│ └────┘ └────┘ └────┘ └────┘        │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│ │    │ │    │ │    │ │    │         │
│ └────┘ └────┘ └────┘ └────┘        │
│           Load more...               │
└──────────────────────────────────────┘
```

**D) Generierung / Edit — Ergebnis-Ansicht**
Wird angezeigt nach Bildgenerierung oder Edit. Nutzt die bestehende ImagePreview-Komponente (Artifact-Panel).

```
┌──────────────────────────────────────┐
│ ← Zurueck   "Alpenpanorama"    ⬇ 💾 │
├──────────────────────────────────────┤
│                                      │
│         ┌──────────────────┐         │
│         │                  │         │
│         │  Generiertes     │         │
│         │  Bild (gross)    │         │
│         │                  │         │
│         └──────────────────┘         │
│                                      │
│  Versionen: [v1] [v2] [v3]          │
│                                      │
│  Prompt: "A breathtaking landscape   │
│  photo of an alpine panorama..."     │
│                                      │
│  [Als Referenz verwenden]            │
└──────────────────────────────────────┘
```

### 4.4 Daten-Anbindung

```
┌──────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│ Studio-Panel │────▸│ /api/design-library/* │────▸│ Design-Library   │
│ (Client)     │     │ (API Routes)         │     │ Neon DB          │
└──────────────┘     └──────────────────────┘     │ (read-only)      │
                                                   └──────────────────┘
```

**API-Routes** (neuer Ordner `src/app/api/design-library/`):

| Route                               | Methode | Beschreibung                                                                                       |
| ----------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `/api/design-library/formulas`      | GET     | Formeln suchen/filtern. Query-Params: `q` (Volltext), `usageType`, `mediumType`, `limit`, `offset` |
| `/api/design-library/formulas/[id]` | GET     | Einzelne Formel mit Legend und Beispielbildern                                                     |
| `/api/design-library/results`       | GET     | Beispielbilder suchen/filtern. Query-Params: `q`, `category`, `formulaId`, `limit`, `offset`       |
| `/api/design-library/results/[id]`  | GET     | Einzelnes Ergebnis mit Formel-Referenz                                                             |
| `/api/design-library/categories`    | GET     | Alle Kategorien mit Counts (fuer Filter-Dropdown)                                                  |
| `/api/design-library/meta`          | GET     | usageTypes + mediumTypes + Gesamtzahlen (fuer Filter-UI)                                           |

**DB-Zugriff:**

- Separate `@neondatabase/serverless` Instanz (nicht Drizzle, da externes Schema)
- Connection via `DESIGN_LIBRARY_DATABASE_URL` ENV-Variable
- Nur `SELECT` Queries, kein Schema-Management
- Auth: `requireAuth()` Guard wie alle anderen API-Routes
- Caching: `Cache-Control: public, max-age=300` (5 Min.) da sich Library-Daten selten aendern

### 4.5 Chat-Integration

#### Chat-Typ

Erweiterung der `chats`-Tabelle um ein Typ-Feld:

```sql
ALTER TABLE chats ADD COLUMN "chatType" text DEFAULT 'chat' NOT NULL;
```

Werte: `chat` (Standard) | `design` (Design Studio)

#### System-Prompt Erweiterung

Im Design-Studio-Modus erhaelt die AI einen zusaetzlichen System-Prompt-Layer:

```
Du bist im Design Studio Modus. Der User arbeitet mit einer Bibliothek
aus Prompt-Formeln fuer Bildgenerierung.

Deine Aufgaben:
1. Verstehe was der User visuell erstellen oder bearbeiten moechte
2. Schlage passende Formeln aus der Library vor (nutze search_design_library)
3. Hilf beim Ausfuellen der Template-Variablen
4. Generiere das Bild mit der ausgefuellten Formel (nutze generate_image)
5. Nimm Edit-Wuensche entgegen und iteriere

Wenn der User ein bestehendes Bild bearbeiten will:
- Zeige relevante Bilder aus der Library
- Uebergib das gewaehlte Bild als Referenz an generate_image
- Der User beschreibt Aenderungen in natuerlicher Sprache
```

#### Neue Tools

**`search_design_library`** — Sucht in der Design-Library nach Formeln und Bildern.

```typescript
{
  name: "search_design_library",
  description: "Sucht in der Prompt-Formel-Bibliothek nach passenden Formeln oder Beispielbildern fuer Bildgenerierung.",
  parameters: {
    query: string,           // Suchbegriff
    type: "formulas" | "results" | "both",  // Was suchen
    usageType?: string,      // Filter
    mediumType?: string,     // Filter
    category?: string,       // Filter (nur fuer results)
    limit?: number           // Max Ergebnisse (default 12)
  }
}
```

Das Tool gibt strukturierte Ergebnisse zurueck, die das Studio-Panel als Generative UI rendert (Formel-Cards oder Bild-Grid).

**`use_library_image`** — Waehlt ein Bild aus der Library als Referenz fuer Bearbeitung.

```typescript
{
  name: "use_library_image",
  description: "Waehlt ein Beispielbild aus der Design-Library als Referenz fuer die Bildbearbeitung.",
  parameters: {
    resultId: string,        // ID des image_formula_results Eintrags
    editPrompt: string       // Was soll am Bild geaendert werden
  }
}
```

Dieses Tool laedt das Library-Bild, uebergibt es als Referenz an `generate_image` und startet den Edit-Flow.

---

## 5. User Flows

### Flow 1: Formula Generate

```
User                          Chat (AI)                    Studio-Panel
  │                              │                              │
  │ "Ich brauche ein            │                              │
  │  Landschaftsbild"           │                              │
  │─────────────────────────────▸│                              │
  │                              │ search_design_library        │
  │                              │ (query: "Landschaft",        │
  │                              │  type: "formulas")           │
  │                              │─────────────────────────────▸│
  │                              │                              │ Zeigt 3-4 passende
  │                              │                              │ Formel-Cards
  │                              │ "Ich habe 3 passende        │
  │                              │  Formeln gefunden:           │
  │                              │  1. Breathtaking Landscapes  │
  │                              │  2. Authentic Landscapes     │
  │                              │  3. Minimalist. Naturhoriz." │
  │                              │◂─────────────────────────────│
  │                              │                              │
  │ *klickt Formel-Card*        │                              │
  │ oder: "Nimm Breathtaking"   │                              │
  │─────────────────────────────▸│                              │
  │                              │─────────────────────────────▸│ Formel-Detail:
  │                              │                              │ Template + Legend
  │                              │                              │ + Beispielbilder
  │                              │ "Gute Wahl! Fuer diese      │
  │                              │  Formel brauche ich:         │
  │                              │  - Hauptmotiv                │
  │                              │  - Stil und Stimmung         │
  │                              │  - Beleuchtung               │
  │                              │  ..."                        │
  │                              │◂─────────────────────────────│
  │                              │                              │
  │ "Alpenpanorama bei           │                              │
  │  Sonnenuntergang,            │                              │
  │  dramatisch, warme Toene"    │                              │
  │─────────────────────────────▸│                              │
  │                              │ generate_image               │
  │                              │ (ausgefuelltes Template)     │
  │                              │─────────────────────────────▸│ Generierung laeuft
  │                              │                              │ Ergebnis-Ansicht
  │                              │                              │ mit Bild + Prompt
  │                              │◂─────────────────────────────│
  │                              │                              │
  │ "Mach den Himmel             │                              │
  │  dramatischer"               │                              │
  │─────────────────────────────▸│                              │
  │                              │ generate_image               │
  │                              │ (Edit mit Referenz)          │
  │                              │─────────────────────────────▸│ Iteration v2
  │                              │◂─────────────────────────────│
```

### Flow 2: Image Edit

```
User                          Chat (AI)                    Studio-Panel
  │                              │                              │
  │ "Zeig mir Bilder zum         │                              │
  │  Thema Tiere"                │                              │
  │─────────────────────────────▸│                              │
  │                              │ search_design_library        │
  │                              │ (query: "Tiere",             │
  │                              │  type: "results")            │
  │                              │─────────────────────────────▸│
  │                              │                              │ Bild-Grid:
  │                              │                              │ Majestaetische Tiere,
  │                              │                              │ Sleeping Animals,
  │                              │                              │ Tiermenschen, etc.
  │                              │ "Hier sind Bilder zum        │
  │                              │  Thema Tiere aus der         │
  │                              │  Library..."                 │
  │                              │◂─────────────────────────────│
  │                              │                              │
  │ *klickt auf Bild*            │                              │
  │ oder: "Das dritte Bild"     │                              │
  │─────────────────────────────▸│                              │
  │                              │─────────────────────────────▸│ Bild gross anzeigen
  │                              │                              │ + Prompt-Info
  │                              │                              │
  │ "Setze den Loewen in eine    │                              │
  │  Winterlandschaft mit Schnee" │                              │
  │─────────────────────────────▸│                              │
  │                              │ use_library_image +          │
  │                              │ generate_image               │
  │                              │ (Library-Bild als Referenz   │
  │                              │  + Edit-Prompt)              │
  │                              │─────────────────────────────▸│ Generierung laeuft
  │                              │                              │ Ergebnis: Original
  │                              │                              │ + neue Version
  │                              │◂─────────────────────────────│
```

### Flow 3: Direkteinstieg via Panel

```
User                          Studio-Panel                  Chat (AI)
  │                              │                              │
  │ *browst im Panel*            │                              │
  │ *filtert: usageType =        │                              │
  │  "Marketing Materialien"*    │                              │
  │─────────────────────────────▸│ Gefilterte Formeln           │
  │                              │                              │
  │ *klickt "Product Ads"*       │                              │
  │─────────────────────────────▸│ Formel-Detail +              │
  │                              │ Beispielbilder               │
  │                              │                              │
  │ *klickt "Diese Formel        │                              │
  │  verwenden"*                 │                              │
  │─────────────────────────────▸│                              │
  │                              │                              │ Chat-Nachricht:
  │                              │                              │ "Ich moechte die Formel
  │                              │                              │  Product Ads verwenden.
  │                              │                              │  Welche Variablen
  │                              │                              │  soll ich ausfuellen?"
  │                              │◂─────────────────────────────│
```

---

## 6. Implementierungsplan

### Phase 0: Data Enrichment (Vorbereitung)

Die Design-Library hat Datenluecken, die die Suchqualitaet stark einschraenken. Ein einmaliger Batch-Job behebt das vor dem Feature-Bau.

#### Ist-Zustand

| Feld                  | Formeln (72)                               | Ergebnisse (1.039)         |
| --------------------- | ------------------------------------------ | -------------------------- |
| `searchVector`        | alle `null`                                | alle `null`                |
| `tags`                | 71 befuellt, aber nur usageType wiederholt | **0 befuellt** — alle leer |
| `promptText`          | Template (EN) mit Platzhaltern             | Ausgefuellter Prompt (EN)  |
| Deutsche Uebersetzung | name.de vorhanden, legend.de vorhanden     | **nicht vorhanden**        |

**Probleme:**

- Suche nach "Löwe" findet nicht "A majestic lion sleeping on a rock"
- Kein Tag-basiertes Filtern bei Ergebnisbildern moeglich
- User sieht nur englische Prompts, obwohl die App deutsch ist

#### Batch-Job: AI-Tag-Enrichment + Prompt-Uebersetzung

Ein Node-Script, das ueber alle 1.039 `image_formula_results` iteriert und pro Eintrag einen Gemini-Call macht:

**Input:**

```
promptText: "A photo of a majestic lion sleeping on a warm rock"
category: "Majestätische Tiere"
```

**AI-Prompt:**

```
Analysiere diesen Bildgenerierungs-Prompt und liefere:
1. 5-8 beschreibende Tags auf Deutsch
2. 5-8 beschreibende Tags auf Englisch
3. Eine natuerliche deutsche Uebersetzung des Prompts

Prompt: "{promptText}"
Kategorie: "{category}"

Antwort als JSON:
{
  "tags_de": ["Löwe", "Wildtier", "Schlafend", ...],
  "tags_en": ["lion", "wildlife", "sleeping", ...],
  "promptText_de": "Ein Foto eines majestätischen Löwen..."
}
```

**Output (DB-Update):**

```sql
UPDATE image_formula_results
SET tags = '{"de": [...], "en": [...]}',
    notes = '{promptText_de}'  -- oder neue Spalte promptText_de
WHERE id = '...';
```

#### Schema-Erweiterung (optional)

Neue Spalte fuer deutsche Prompt-Uebersetzung:

```sql
ALTER TABLE image_formula_results ADD COLUMN "promptTextDe" text;
```

Alternativ: `notes`-Feld nutzen (ist aktuell fast ueberall `null`), aber eine eigene Spalte ist sauberer.

#### Batch-Job Details

| Eigenschaft        | Wert                                                    |
| ------------------ | ------------------------------------------------------- |
| Eintraege          | 1.039                                                   |
| API-Calls          | ~1.039 (1 pro Bild, kein Bild-Input noetig — nur Text)  |
| Modell             | Gemini Flash (guenstig, schnell)                        |
| Geschaetzte Kosten | < $1 (reine Text-Analyse, kurze Prompts)                |
| Laufzeit           | ~10-15 Min. mit Rate-Limiting                           |
| Idempotent         | Ja — ueberspringt Eintraege mit bereits gefuellten Tags |
| Script-Location    | `scripts/enrich-design-library.ts`                      |

**Aufwand Phase 0:** ~0.5 Tage (Script schreiben + laufen lassen + validieren)
**Risiko:** Gering. Schreibt nur in tags/promptTextDe, aendert keine bestehenden Daten.
**Mehrwert:** Suche funktioniert bilingual, Tags ermoeglichen Facetten-Filter.

### Phase 1: Fundament (Backend + DB-Anbindung)

| Feature             | Beschreibung                                                                                            | Aufwand |
| ------------------- | ------------------------------------------------------------------------------------------------------- | ------- |
| ENV + DB-Client     | `DESIGN_LIBRARY_DATABASE_URL` + `@neondatabase/serverless` Instanz in `src/lib/db/design-library.ts`    | S       |
| API-Routes          | `/api/design-library/*` (6 Endpunkte: formulas, formulas/[id], results, results/[id], categories, meta) | M       |
| Feature-Flag        | `features.designLibrary.enabled` basierend auf `DESIGN_LIBRARY_DATABASE_URL`                            | S       |
| Chat-Typ-Feld       | Migration: `chatType` Spalte in `chats`-Tabelle                                                         | S       |
| Chat-Typ-Persistenz | Create/Update Queries + API anpassen                                                                    | S       |

**Aufwand Phase 1:** ~1 Tag
**Risiko:** Gering. Read-only Zugriff, isoliert vom Rest.
**Mehrwert:** API-Layer steht, kann standalone getestet werden.

### Phase 2: Studio-Layout + Mode-Switcher

| Feature                   | Beschreibung                                                           | Aufwand |
| ------------------------- | ---------------------------------------------------------------------- | ------- |
| Mode-Switcher Komponente  | Toggle in Sidebar-Header (Chat / Studio)                               | S       |
| Studio-Layout in ChatView | Bedingtes Layout: Chat 1/3 + Panel 2/3 wenn `chatType === "design"`    | M       |
| Studio-Panel Shell        | Panel-Komponente mit Tab-Navigation (Formeln / Bilder) und View-States | M       |
| Sidebar Chat-Icons        | Visuelles Flag (💬 vs. 🎨) basierend auf `chatType`                    | S       |
| Auto-Layout-Switch        | Beim Oeffnen eines Design-Chats automatisch Studio-Layout aktivieren   | S       |
| Mobile Responsive         | Tab-basierte Navigation zwischen Chat und Panel auf Mobile             | M       |

**Aufwand Phase 2:** ~2 Tage
**Risiko:** Mittel. Layout-Aenderung in ChatView erfordert sorgfaeltige Abstimmung mit bestehendem Artifact-Panel.
**Mehrwert:** Studio-Oberflaeche nutzbar, Chat-Steuerung funktioniert.

### Phase 3: Formel-Browser + Bild-Galerie (Panel-UI)

| Feature                      | Beschreibung                                              | Aufwand |
| ---------------------------- | --------------------------------------------------------- | ------- |
| Formel-Cards Grid            | Responsive Grid mit Preview-Bild, Name, usageType-Badge   | M       |
| Formel-Detailansicht         | Template-Anzeige, Variablen-Legende, Beispielbilder-Grid  | M       |
| Bild-Galerie Grid            | Responsive Masonry/Grid mit Lazy Loading, Lightbox        | M       |
| Such-Input                   | Volltextsuche mit Debounce, durchsucht Formeln und Bilder | S       |
| Filter-Dropdowns             | usageType, mediumType, category                           | S       |
| Pagination / Infinite Scroll | Cursor-basiert fuer Bilder-Grid                           | S       |
| Empty States                 | Keine Ergebnisse, Lade-Zustaende, Error States            | S       |

**Aufwand Phase 3:** ~2-3 Tage
**Risiko:** Gering. Reine UI-Arbeit mit bekannten Patterns.
**Mehrwert:** Browse-Experience komplett. User kann die Library erkunden.

### Phase 4: AI-Tools + Chat-Flows

| Feature                      | Beschreibung                                                              | Aufwand |
| ---------------------------- | ------------------------------------------------------------------------- | ------- |
| `search_design_library` Tool | Tool-Factory mit API-Aufruf, Generative UI fuer Ergebnisse                | M       |
| `use_library_image` Tool     | Bild laden, als Buffer an generate_image uebergeben                       | M       |
| Studio System-Prompt         | Zusaetzlicher Prompt-Layer fuer Design-Modus                              | S       |
| Generative UI: Formel-Cards  | Chat-Inline-Rendering von Suchergebnissen (Formel-Cards)                  | M       |
| Generative UI: Bild-Grid     | Chat-Inline-Rendering von Bild-Suchergebnissen                            | M       |
| Panel-Chat-Sync              | Klick im Panel sendet Nachricht in Chat, Chat-Ergebnis aktualisiert Panel | M       |
| Formel-Ausfuell-Flow         | AI erkennt Template-Variablen, fragt gezielt nach, fuellt aus             | S       |

**Aufwand Phase 4:** ~3 Tage
**Risiko:** Mittel. Synchronisation zwischen Panel-State und Chat-State ist das komplexeste Element.
**Mehrwert:** Vollstaendiger Generate- und Edit-Flow funktioniert.

### Phase 5: Polish + Edge Cases

| Feature            | Beschreibung                                               | Aufwand |
| ------------------ | ---------------------------------------------------------- | ------- |
| Keyboard Shortcuts | Schnellzugriff Studio-Modus, Navigation                    | S       |
| Bild-Download      | Generierte Bilder direkt aus Studio-Panel herunterladen    | S       |
| Sidebar-Filter     | Optional: Filter in Sidebar (alle / nur Chat / nur Design) | S       |
| Performance        | Bild-Preloading, Placeholder, optimierte Queries           | S       |
| Error Handling     | Fehlermeldungen bei DB-Verbindung, fehlenden Bildern etc.  | S       |
| Onboarding         | Empty-State im Studio erklaert die Funktionsweise          | S       |

**Aufwand Phase 5:** ~1 Tag
**Risiko:** Gering.
**Mehrwert:** Poliertes Erlebnis.

---

## 7. Technische Entscheidungen

### Warum separater DB-Client statt Drizzle?

Die Design-Library hat ein eigenes Schema, das nicht von unserer App verwaltet wird. Drizzle wuerde eigene Schema-Definitionen und Migrations-Management erfordern. `@neondatabase/serverless` ist bereits installiert, leichtgewichtig, und fuer read-only Queries ideal.

### Warum API-Routes statt direktem Client-Zugriff?

- DB-Credentials bleiben server-side
- Auth-Guard (`requireAuth`) schuetzt die Endpunkte
- Caching-Header moeglich
- Spaeter erweiterbar (z.B. Rate-Limiting, Analytics)

### Warum Chat-basiert statt eigener State-Machine?

- Chat-Persistenz ist vorhanden (Messages, Artifacts)
- Iterations-History ergibt sich natuerlich aus dem Chat-Verlauf
- Kein neues Speichersystem noetig
- Wiederaufrufbar ueber bestehende Sidebar-Navigation

### Warum kein eigener Artifact-Typ?

Die generierten Bilder nutzen weiterhin `type: "image"` im bestehenden Artifact-System. Der Unterschied liegt im Layout (Studio-Panel statt Artifact-Panel) und den zusaetzlichen Tools, nicht im Datenmodell.

### Studio-Panel vs. Artifact-Panel

Wenn im Design-Studio ein Bild generiert wird, ersetzt das Studio-Panel das Artifact-Panel. Es gibt keine Situation in der beide gleichzeitig sichtbar sein muessen. Das Studio-Panel ist eine erweiterte Version des Artifact-Panels mit zusaetzlichen Browse- und Filter-Funktionen.

---

## 8. Offene Entscheidungen

| Entscheidung                | Optionen                                                               | Entscheidung                                                    |
| --------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| Suchstrategie               | SQL LIKE vs. pg_trgm vs. vorhandener `searchVector`                    | Siehe Suchstrategie-Abschnitt unten (geloest)                   |
| Bild-Grid Layout            | Gleichmaessiges Grid vs. Masonry                                       | Gleichmaessiges Grid (einfacher, Bilder sind meist quadratisch) |
| Formel-Sprache              | Nur DE, nur EN, oder sprachabhaengig                                   | DE als Default (name.de, legend.de), Formeln selbst sind EN     |
| Panel bei normalem Chat     | Studio-Panel nur im Design-Modus oder auch im normalen Chat verfuegbar | Nur im Design-Modus (klare Trennung)                            |
| Credits fuer Library-Browse | Kostenlos oder Credits verbrauchen                                     | Kostenlos. Nur Generierung kostet Credits (wie bisher)          |

### Suchstrategie (geloest)

Dreistufiger Ansatz, aufbauend auf dem Data Enrichment (Phase 0):

**Stufe 1 — ILIKE (Phase 1, sofort)**
Einfache Textsuche ueber vorhandene Felder. Funktioniert als Baseline.

```sql
-- Formeln suchen
SELECT * FROM image_prompt_formulas
WHERE name->>'de' ILIKE '%landschaft%'
   OR "templateText" ILIKE '%landschaft%'
   OR "usageType" ILIKE '%landschaft%';

-- Ergebnisse suchen (nach Enrichment)
SELECT * FROM image_formula_results
WHERE "promptText" ILIKE '%lion%'
   OR "promptTextDe" ILIKE '%löwe%'
   OR category ILIKE '%lion%'
   OR tags::text ILIKE '%löwe%';
```

**Stufe 2 — Bilinguale Tag-Suche (nach Phase 0)**
Nach dem Enrichment koennen Tags strukturiert durchsucht werden. Suche in DE-Tags UND EN-Tags gleichzeitig, damit "Löwe" und "lion" beide funktionieren.

```sql
-- Tag-basierte Suche (nach Enrichment)
SELECT * FROM image_formula_results
WHERE tags->'de' @> '["Löwe"]'::jsonb
   OR tags->'en' @> '["lion"]'::jsonb
   OR "promptTextDe" ILIKE '%löwe%'
   OR "promptText" ILIKE '%lion%';
```

**Stufe 3 — pg_trgm Fuzzy Search (optional, spaeter)**
Falls noetig: Trigram-Index fuer unscharfe Suche (findet "Landschft" bei Suche nach "Landschaft"). Erfordert `CREATE EXTENSION pg_trgm` auf der Design-Library DB.

Empfehlung: Mit Stufe 1+2 starten, Stufe 3 nur bei Bedarf.

---

## 9. Metriken

| Metrik           | Messung                                                    |
| ---------------- | ---------------------------------------------------------- |
| Studio-Adoption  | Anteil Design-Chats an allen Chats                         |
| Formel-Nutzung   | Welche Formeln werden am haeufigsten gewaehlt              |
| Generate-Rate    | Wie viele Studio-Sessions fuehren zu einer Bildgenerierung |
| Edit-Rate        | Wie oft wird ein Library-Bild als Edit-Referenz verwendet  |
| Iterations-Tiefe | Durchschnittliche Anzahl Edits pro Session                 |
