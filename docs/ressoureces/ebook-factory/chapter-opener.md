# Chapter Opener – Seitentyp 03

Kapitel-Trenner mit großer Nummer und Titel. Nutzt dunklen Brand-Hintergrund.

## Position

Immer auf der linken Seite eines Spreads. Right-Seite beginnt mit dem Kapitelinhalt.

## Spread-Config

```javascript
{
    left: `<div class="chapter-opener">...</div>`,
    right: `<h2>...</h2><p>...</p>`,
    leftType: 'chapter',
    rightType: 'content'
}
```

## Struktur

```
┌─────────────────────────┐
│                         │
│                         │
│  01                     │  ← .chapter-number, 80px, 900, accent
│  ── accent-bar ──       │  ← 60×4px
│  Kapitel-Titel          │  ← h2, 36px, white
│  Untertitel optional    │  ← .subline, Instrument Serif, muted
│                         │
│                         │
└─────────────────────────┘
```

## HTML-Template

```html
<div class="chapter-opener">
    <div class="chapter-number">01</div>
    <div class="accent-bar"></div>
    <h2>[Kapitel-Titel]</h2>
    <p class="subline">[Optionaler Untertitel]</p>
</div>
```

## Regeln

- Nummer immer zweistellig mit führender Null: 01, 02, ...
- Titel max. 5 Wörter
- Untertitel optional, Instrument Serif
- Kein regulärer Footer (leftType: 'chapter'), aber Seitenzahl kann dezent angezeigt werden
- Vertikale Zentrierung (flexbox justify-content: center)
