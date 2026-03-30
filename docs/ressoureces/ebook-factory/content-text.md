# Content Text – Seitentyp 04

Die Haupt-Inhaltsseite. Fließtext mit eingebetteten Komponenten. Am häufigsten verwendeter Seitentyp.

## Position

Flexibel. Kann links oder rechts stehen.

## Struktur

```
┌─────────────────────────┐
│  [h2 oder h3]           │  ← Abschnittsüberschrift
│                         │
│  Fließtext mit max.     │  ← p-Tags, 16px, text-secondary
│  400–500 Wörtern pro    │
│  Seite.                 │
│                         │
│  ┌─ Komponente ───────┐ │  ← Auflockerung nach 2–3 Absätzen
│  │ z.B. Highlight-Box │ │
│  └────────────────────┘ │
│                         │
│  Weiterer Text...       │
│                         │
│  [Footer: Logo / Nr.]   │
└─────────────────────────┘
```

## HTML-Template

```html
<h2>[Abschnitts-Überschrift]</h2>

<p>[Einleitender Absatz zum Thema. Setzt den Kontext.]</p>

<h3>[Unterüberschrift]</h3>

<p>[Weiterer Text. Erklärt Details oder führt Argumente aus.]</p>

<!-- Komponente zur Auflockerung -->
<div class="highlight-box">
    <h4>[Kernaussage]</h4>
    <p>[Erläuterung der Kernaussage.]</p>
</div>

<p>[Weiterführender Text nach der Komponente.]</p>

<!-- Optional: Liste für Aufzählungen -->
<ul>
    <li><strong>[Punkt 1:]</strong> Erläuterung</li>
    <li><strong>[Punkt 2:]</strong> Erläuterung</li>
    <li><strong>[Punkt 3:]</strong> Erläuterung</li>
</ul>
```

## Varianten

### A: Reiner Fließtext
Nur h2/h3 + Absätze. Für narrative Passagen.

### B: Text + Komponente
Fließtext unterbrochen durch eine Box (Highlight, Tip, Warning, Definition).

### C: Text + Tabelle
Fließtext gefolgt von einer Datentabelle.

### D: Text + Liste
Fließtext gefolgt von einer strukturierten Liste.

### E: Text + Stat-Callout
Einleitender Text, dann eine große Zahl als Blickfang.

## Regeln

- **Max. 400–500 Wörter pro Seite** – lieber splitten
- **Nie zwei Absätze ohne visuelle Unterbrechung** – h3, Box, Liste oder Tabelle einfügen
- Überschriften h2 für Hauptabschnitte, h3 für Unterabschnitte
- Erste `<p>` nach h2 braucht kein `<strong>` am Anfang (Überschrift reicht als Orientierung)
- Komponenten nicht direkt aufeinander stapeln – immer Fließtext dazwischen
