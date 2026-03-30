---
name: whiteboard-factory
description: "Generiert LinkedIn-Post-Ideen mit passendem Bildprompt für handgezeichnete Whiteboard-Infografiken im Brand-Coded Dark Style. Multi-Brand-Support für loschke.ai, unlearn.how und lernen.diy. Trigger bei: Whiteboard-Post, Infografik für LinkedIn, visueller Post zu einem Thema. Liest Kontext aus Session, Artifacts oder Brainsidian."
---

# Whiteboard Post Factory

Erstellt LinkedIn-Posts mit handgezeichneten Whiteboard-Infografiken im Brand-Coded Dark Style.

## Workflow

### 1. Kontext erfassen

Identifiziere die Quelle:
- **Aktueller Chat**: Lies den relevanten Gesprächsverlauf oder das zuletzt generierte Artifact
- **Brainsidian**: Nutze die MCP-Tools um referenzierte Dokumente zu laden
- **Direkter Input**: Falls Rico ein Thema direkt nennt

Extrahiere:
- Kernthema/Konzept
- 3-5 Schlüsselpunkte oder Erkenntnisse
- Zielgruppe (falls erkennbar)

### 2. Brand wählen

Frage nach Brand oder nutze Default (loschke.ai):

| Brand | Hintergrund | Akzent | Footer |
|-------|-------------|--------|--------|
| **loschke.ai** | #151416 (Schwarz) | #FC2D01 (Rot-Orange) | loschke**.ai** |
| **unlearn.how** | #0f0a15 (Violett-Schwarz) | #a855f7 (Violett) | unlearn**.how** |
| **lernen.diy** | #0f1514 (Teal-Schwarz) | #0F766E (Teal) | lernen**.diy** |

**Vollständige Farbdefinitionen:** Brainsidian → `04_BRANDS/Visual-Identity-Reference.md`

### 3. Struktur wählen

| Struktur | Wann verwenden |
|----------|----------------|
| **Nummerierte Liste** | Schritte, Tipps, Gründe, Signale (3-5 Punkte) |
| **Vergleich (links/rechts)** | Alt vs. Neu, Junior vs. Senior, Mythos vs. Realität |
| **Framework-Box** | Eigene Modelle, Formeln, zentrale Konzepte |
| **Prozess-Pfeile** | Phasen, Entwicklungen, Transformationen |

### 4. Output generieren

#### A) Post-Idee

```
HOOK: [Provokante Eröffnung, max 2 Zeilen]

KERN: [2-3 Sätze Hauptaussage]

CTA: [Frage oder Handlungsaufforderung]
```

**Tonalität:** Brainsidian → `04_BRANDS/Voice-Reference.md`

#### B) Bildprompt

Nutze das Brand-spezifische Template unten.

---

## Prompt-Templates

### Basis-Template (alle Brands)

```
Generate a single image of a physical, hand-drawn infographic on [PAPER_COLOR] paper.

**Medium:** The image must look like a photograph of real dark paper ([BG_HEX]) with subtle paper fiber texture visible. No frame, no border – paper fills the entire image edge to edge.

**Texture:** All elements must look created by hand using a white paint marker or white gel pen, with ONE accent color in [ACCENT_NAME] ([ACCENT_HEX]). Lines should be slightly imperfect with the texture of paint marker on dark paper.

**No Digital Fonts:** All text must appear handwritten in white marker.

**Color Palette - STRICTLY LIMITED:**
- Background: [BG_DESCRIPTION]
- Primary text: Bright white paint marker
- ONE accent: [ACCENT_NAME] ([ACCENT_HEX]) for key highlights

**Layout:** Structure the 1080x1350 image as follows:

[STRUKTUR-SPEZIFISCHE ANWEISUNGEN]

**FOOTER AREA - IMPORTANT:**
- A subtle horizontal bar at the bottom (slightly lighter than the main background, like [FOOTER_BG_HEX]) spanning the full width, approximately 80px tall
- Inside this footer bar, centered:
  - "[DOMAIN]" where "[DOMAIN_NAME]" is white and "[DOMAIN_TLD]" is in [ACCENT_NAME] ([ACCENT_HEX]). Keep it small and refined.
- The CTA text "[CTA_TEXT]" should be positioned ABOVE the footer bar, centered, in white marker style.

The aesthetic should be bold, modern, high-contrast. Dark and sophisticated. The footer should feel integrated but subtle.
```

### Brand-Variablen

**loschke.ai:**
```
PAPER_COLOR: dark charcoal
BG_HEX: #151416
BG_DESCRIPTION: Very dark charcoal/almost black paper
ACCENT_NAME: red-orange
ACCENT_HEX: #FC2D01
FOOTER_BG_HEX: #1E1E20
DOMAIN: loschke.ai
DOMAIN_NAME: loschke
DOMAIN_TLD: .ai
```

**unlearn.how:**
```
PAPER_COLOR: very dark purple-black
BG_HEX: #0f0a15
BG_DESCRIPTION: Very dark purple-black paper
ACCENT_NAME: purple
ACCENT_HEX: #a855f7
FOOTER_BG_HEX: #1a1225
DOMAIN: unlearn.how
DOMAIN_NAME: unlearn
DOMAIN_TLD: .how
```

**lernen.diy:**
```
PAPER_COLOR: very dark teal-black
BG_HEX: #0f1514
BG_DESCRIPTION: Very dark teal-black paper
ACCENT_NAME: teal
ACCENT_HEX: #0F766E
FOOTER_BG_HEX: #1a2220
DOMAIN: lernen.diy
DOMAIN_NAME: lernen
DOMAIN_TLD: .diy
```

---

## Struktur-Templates

### Nummerierte Liste

```
**HEADER:**
- Large headline at top in white marker: "[HEADLINE]"
- The "[ZAHL]" rendered in [ACCENT_NAME]
- Subtitle in white: "[SUBTITLE]"

**MAIN CONTENT:**
- Numbered list ([ANZAHL] items) going down the page vertically
- Each number in a hand-drawn circle with [ACCENT_NAME] fill
- Text for each point in white:

1. "[PUNKT_1]"
   [Small icon description]

2. "[PUNKT_2]"
   [Small icon description]

3. "[PUNKT_3]"
   [Small icon description]

[weitere Punkte...]

- Small annotation on the side: "[SIDE_NOTE]"
```

### Vergleich (links/rechts)

```
**HEADER:**
- Large headline at top in white marker: "[LINKS] vs [RECHTS]"
- The "vs" rendered in [ACCENT_NAME]
- Subtitle in white: "[SUBTITLE]"

**MAIN CONTENT:**
- Thick vertical line dividing page in half, drawn in white
- Left side header: "[LINKS]" with [ACCENT_NAME] X next to it
- Right side header: "[RECHTS]" with [ACCENT_NAME] checkmark next to it

LEFT SIDE (4 points in white):
- "[PUNKT_L1]"
  [Small icon]
- "[PUNKT_L2]"
- "[PUNKT_L3]"
- "[PUNKT_L4]"

RIGHT SIDE (4 points in white, key words underlined in [ACCENT_NAME]):
- "[PUNKT_R1]" ([KEYWORD] underlined)
  [Small icon]
- "[PUNKT_R2]"
- "[PUNKT_R3]" ([KEYWORD] underlined)
- "[PUNKT_R4]"

- Small annotation at bottom left: "[LABEL_L]"
- Small annotation at bottom right: "[LABEL_R]"
```

### Framework-Box

```
**HEADER:**
- Large headline at top in white marker: "[FRAMEWORK_NAME]"
- The "[HIGHLIGHT_WORD]" rendered in [ACCENT_NAME]
- Subtitle in white: "[SUBTITLE]"

**MAIN CONTENT:**
- Central circle/box in the middle with text "[CORE_CONCEPT]" inside, white outline
- [ANZAHL] boxes arranged around the central element, connected by white arrows pointing to the center

Each box in white outline contains:
TOP: "[ELEMENT_1]" / "[SUB_1]" / [icon]
RIGHT: "[ELEMENT_2]" / "[SUB_2]" / [icon]
BOTTOM: "[ELEMENT_3]" / "[SUB_3]" / [icon]
LEFT: "[ELEMENT_4]" / "[SUB_4]" / [icon]

- Labels have small [ACCENT_NAME] underline
- Arrows in white connecting to center
- Small note: "[SIDE_NOTE]"
```

### Prozess-Pfeile

```
**HEADER:**
- Large headline at top in white marker: "[ANZAHL] PHASEN"
- The "[ANZAHL]" rendered in [ACCENT_NAME]
- Subtitle in white: "[SUBTITLE]"

**MAIN CONTENT:**
- [ANZAHL] boxes arranged vertically, connected by downward arrows:

PHASE 1 (top):
- Number "1" in [ACCENT_NAME] circle
- Box with "[PHASE_1]" as label
- Subtext: "[BESCHREIBUNG_1]"
- [Small icon]
- Arrow pointing down

PHASE 2:
- Number "2" in [ACCENT_NAME] circle
- Box with "[PHASE_2]" as label
- Subtext: "[BESCHREIBUNG_2]"
- [Small icon]
- Arrow pointing down

[weitere Phasen...]

LETZTE PHASE (highlighted with [ACCENT_NAME] border):
- Number "[N]" in [ACCENT_NAME] circle
- Box with "[PHASE_N]" as label, [ACCENT_NAME] underline
- Subtext: "[BESCHREIBUNG_N]"
- [Small icon]

- Small annotation on the side: "[SIDE_NOTE]"
```

---

## Hinweise

- CTA unten sollte zum Post passen (Frage, die Engagement erzeugt)
- Prompts sind für Google Imagen / Gemini optimiert
- Bei Unsicherheit über Struktur: Frag Rico kurz nach
- Kombiniere mit content-factory Skill wenn Content-Steckbrief gewünscht

## Beispiel-Trigger

- "Mach aus dem letzten Artifact einen Whiteboard-Post"
- "Whiteboard-Infografik zu [Thema] für unlearn"
- "Lies die Notiz XY in Brainsidian und bau mir einen Infografik-Post für lernen.diy"
- "Erstelle eine Infografik zum 4-Powers-Modell"
