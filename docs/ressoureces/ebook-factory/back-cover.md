# Back Cover – Seitentyp 12

Abschlussseite mit CTA und Branding. Nutzt dunklen Brand-Hintergrund wie Cover.

## Position

Letzte Seite. Kann rechts im letzten Spread stehen (neben Summary oder Resources) oder als eigener Spread (mit leerer/schwarzer linker Seite).

## Spread-Config

```javascript
// Variante A: Neben Summary
{
    left: `<h2>Zusammenfassung</h2>...`,
    right: `<div class="page-back-cover">...</div>`,
    leftType: 'content',
    rightType: 'back-cover'
}

// Variante B: Eigener Spread
{
    left: `<div class="page-back-cover">...</div>`,
    right: `<div class="page-back-cover" style="opacity:0;"></div>`,
    leftType: 'back-cover',
    rightType: 'back-cover'
}
```

## Struktur

```
┌─────────────────────────┐
│                         │
│                         │
│   [Brand-Logo groß]     │  ← Optional
│                         │
│   [Abschluss-Headline]  │  ← h2, white
│   ── accent-bar ──      │
│   [Kurzer CTA-Text]     │  ← p, muted
│                         │
│   ┌─ CTA-Button ──────┐ │
│   │  Website besuchen  │ │  ← .cta-link
│   └────────────────────┘ │
│                         │
│   [Kontakt-Info]        │  ← Klein, muted
│                         │
└─────────────────────────┘
```

## HTML-Template

```html
<div class="page-back-cover">
    <h2>[Abschluss-Headline]</h2>
    <div class="accent-bar"></div>
    <p>[1–2 Sätze: Was soll der Leser jetzt tun?]</p>
    <a href="[URL]" class="cta-link">[CTA-Text]</a>
    <div class="cover-meta" style="margin-top: 3rem;">
        <p>[Kontakt oder Copyright]</p>
    </div>
</div>
```

## Regeln

- CTA muss konkret sein (nicht "Mehr erfahren", sondern "Erstgespräch vereinbaren")
- Headline max. 4 Wörter
- Kein Footer (rightType: 'back-cover')
- accent-bar als visueller Trenner
- Bei Kunden-Ebooks: Logo des Kunden oder neutral halten
