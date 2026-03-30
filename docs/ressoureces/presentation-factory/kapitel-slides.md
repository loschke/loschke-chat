# Kapitel-Slides

> Trenner für Themenblöcke (Level 1) und Vertiefungen (Level 2) innerhalb einer Präsentation.

---

## Brands

Alle Varianten sind Multi-Brand-fähig. Brand-Klasse auf `.slide` setzen:

| Brand | Klasse | Accent |
|-------|--------|--------|
| loschke.ai | (default) | #FC2D01 |
| unlearn.how | `.brand-unlearn` | #a855f7 |
| lernen.diy | `.brand-lernen` | #0F766E |

---

## Einsatz

Kapitel-Trenner strukturieren längere Präsentationen und Seminare. Zwei Hierarchie-Ebenen:

- **Level 1:** Themenblöcke (3–5 pro Seminar) – große Zäsur, klare Orientierung
- **Level 2:** Vertiefungen innerhalb eines Blocks – subtiler, Unterkapitel-Charakter

---

## Level 1 – Themenblock

### Varianten

| Variante | Klasse | Beschreibung |
|----------|--------|--------------|
| A | `kapitel-l1-nummer` | Große Nummer rechts oben (dezent), Titel links unten |
| B | `kapitel-l1-akzent` | Akzent-Hintergrund, maximale Signalwirkung |
| C | `kapitel-l1-center` | Zentriert, Nummer + Linie + Titel |

---

### Variante A: Nummer Prominent

**Use Case:** Standard-Themenblock, klare Nummerierung ohne zu dominieren.

**Struktur:**
- `kapitel-nummer`: Absolut rechts oben, Noto Sans 900, 220px, Accent, opacity 0.15
- `kapitel-label`: Instrument Serif, 32px muted, uppercase
- `kapitel-titel`: Noto Sans 900, 64px
- `kapitel-beschreibung`: Instrument Serif, 36px muted

**Hintergrund:** `bg-dark-alt` empfohlen

---

### Variante B: Akzent-Hintergrund

**Use Case:** Maximale Signalwirkung für wichtige Zäsuren.

**Struktur:**
- `kapitel-nummer`: Absolut rechts oben, Noto Sans 900, 180px, text-primary, opacity 0.15
- `kapitel-label`: Instrument Serif, 32px, text-primary, opacity 0.7
- `kapitel-titel`: Noto Sans 900, 72px, text-primary
- `kapitel-beschreibung`: Instrument Serif, 36px, text-soft, opacity 0.9

**Hintergrund:** `bg-accent`

**Wichtig:** Bei Akzent-Hintergrund immer helle Schriftfarben verwenden (text-primary/text-soft), nie dunkle.

---

### Variante C: Zentriert Clean

**Use Case:** Weniger dominant als A/B, klare Mitte.

**Struktur:**
- `kapitel-nummer`: Noto Sans 900, 120px, Accent, zentriert
- `accent-line`: 120×4px, zentriert
- `kapitel-titel`: Noto Sans 900, 56px, zentriert
- `kapitel-beschreibung`: Instrument Serif, 32px muted, zentriert

**Hintergrund:** `bg-dark`

---

## Level 2 – Vertiefung

### Varianten

| Variante | Klasse | Beschreibung |
|----------|--------|--------------|
| A | `kapitel-l2-kompakt` | Nummer "1.1" + Label, Linie, Titel – kompakt links |
| B | `kapitel-l2-inline` | Nummer und Titel in einer Zeile |

---

### Variante A: Kompakt Links

**Use Case:** Standard-Unterkapitel mit klarer Hierarchie durch "1.1"-Notation.

**Struktur:**
- `kapitel-meta`: Flex-Container für Nummer + Label
  - `kapitel-nummer`: Noto Sans 900, 56px, Accent
  - `kapitel-label`: Instrument Serif, 28px muted, uppercase
- `accent-line`: 80×4px
- `kapitel-titel`: Noto Sans 900, 52px
- `kapitel-beschreibung`: Instrument Serif, 32px muted

**Hintergrund:** `bg-dark-alt` empfohlen

---

### Variante B: Inline Nummer

**Use Case:** Kompakter, Nummer und Titel auf gleicher Ebene.

**Struktur:**
- `kapitel-label`: Instrument Serif, 28px muted, uppercase
- `kapitel-header`: Flex-Container
  - `kapitel-nummer`: Noto Sans 900, 72px, Accent
  - `kapitel-titel`: Noto Sans 900, 56px
- `accent-line`: 120×4px

**Hintergrund:** `bg-dark`

---

## Entscheidungshilfe

| Situation | Empfehlung |
|-----------|------------|
| Standard-Themenblock | L1-A (Nummer Prominent) |
| Wichtige Zäsur, maximale Aufmerksamkeit | L1-B (Akzent) |
| Weniger dominanter Blockstart | L1-C (Zentriert) |
| Standard-Unterkapitel | L2-A (Kompakt) |
| Kompakter Unterkapitel-Trenner | L2-B (Inline) |

---

## Design-Konstanten

**Logo-Position:** Immer rechts unten bei Inhaltsfolien

**Typografie Level 1:**
- Nummer: 120–220px (dezent via Opacity)
- Titel: 56–72px
- Label: 32px
- Beschreibung: 36px

**Typografie Level 2:**
- Nummer: 56–72px
- Titel: 52–56px
- Label: 28px
- Beschreibung: 32px

**Kontrast bei bg-accent:**
- Alle Texte in hellen Farben (text-primary, text-soft)
- Nummer/Linie mit reduzierter Opacity (0.15–0.4)

---

## HTML-Vorlage

Siehe `kapitel-slides.html` für vollständige Templates aller Varianten.
