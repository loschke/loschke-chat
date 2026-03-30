# Cover – Seitentyp 01

Die Titelseite des Ebooks. Nutzt immer den dunklen Brand-Hintergrund (bg-cover), unabhängig vom Light/Dark-Modus.

## Position

Immer Seite 1 (left im ersten Spread). Right-Seite ist typischerweise TOC.

## Spread-Config

```javascript
{
    left: `<div class="page-cover">...</div>`,
    right: `...`,
    leftType: 'cover',
    rightType: 'content'
}
```

## Struktur

```
┌─────────────────────────┐
│                         │
│       [Buchtitel]       │  ← h1, 44px, 900, white
│     ── accent-bar ──    │  ← 60×4px Akzentlinie
│       [Untertitel]      │  ← .subline, Instrument Serif
│                         │
│   [Beschreibung, max    │  ← .cover-description
│    3 Zeilen, zentriert] │
│                         │
│                         │
│   [Meta: Autor/Version] │  ← .cover-meta
│                         │
└─────────────────────────┘
```

## HTML-Template

```html
<div class="page-cover">
    <h1>[Buchtitel]</h1>
    <div class="accent-bar"></div>
    <p class="subline">[Untertitel / Zielgruppe]</p>
    <p class="cover-description">[2–3 Sätze Beschreibung]</p>
    <div class="cover-meta">
        <p>[Autor oder Brand] · [Version / Datum]</p>
    </div>
</div>
```

## Regeln

- Titel max. 6 Wörter (Zeilenumbruch vermeiden)
- Untertitel als Instrument Serif, kontrastiert zur Noto Sans Headline
- Beschreibung optional, max. 3 Zeilen
- Meta-Info am unteren Rand, dezent
- Kein Footer auf der Cover-Seite (leftType: 'cover')
