# TOC – Seitentyp 02

Inhaltsverzeichnis. Typischerweise die rechte Seite im ersten Spread (neben Cover).

## Position

Seite 2 (right im ersten Spread). Bei langen Ebooks ggf. auch Seite 2+3 als eigener Spread.

## Struktur

```
┌─────────────────────────┐
│  Inhaltsverzeichnis     │  ← h1 oder h2
│                         │
│  [Highlight-Box:        │  ← Optional: Lernziele
│   Zusammenfassung]      │
│                         │
│  Kapitel  Thema   Seite │  ← Tabelle
│  1        ...     3–4   │
│  2        ...     5–6   │
│  ...                    │
│                         │
└─────────────────────────┘
```

## HTML-Template

```html
<h1>Inhaltsverzeichnis</h1>

<!-- Optional: Lernziele / Überblick -->
<div class="highlight-box">
    <h4>Was Sie erwartet</h4>
    <ul>
        <li>[Lernziel 1]</li>
        <li>[Lernziel 2]</li>
    </ul>
</div>

<table>
    <tr><th>Kapitel</th><th>Thema</th><th>Seite</th></tr>
    <tr><td><strong>1</strong></td><td>[Thema]</td><td>3–4</td></tr>
    <tr><td><strong>2</strong></td><td>[Thema]</td><td>5–6</td></tr>
    <!-- ... -->
</table>
```

## Regeln

- Seitenzahlen müssen mit tatsächlicher Spread-Verteilung übereinstimmen
- Kapitel-Nummern in `<strong>` für Accent-Wirkung
- Optional: Highlight-Box oben mit Lernzielen oder Zusammenfassung
- Bei 10+ Kapiteln: Schriftgröße ggf. auf 14px reduzieren
