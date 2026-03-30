# Summary – Seitentyp 10

Zusammenfassung mit nummerierten Takeaways. Kann pro Kapitel oder als Gesamt-Summary verwendet werden.

## Position

Am Ende eines Kapitels oder als vorletzter Spread (vor Back-Cover).

## Struktur

```
┌─────────────────────────┐
│  Zusammenfassung        │  ← h2
│                         │
│  ┌─ summary-box ──────┐ │
│  │  Die wichtigsten    │ │  ← h3 in accent
│  │  Erkenntnisse       │ │
│  │                     │ │
│  │  1  Takeaway eins   │ │  ← .takeaway-item
│  │  2  Takeaway zwei   │ │
│  │  3  Takeaway drei   │ │
│  │  4  Takeaway vier   │ │
│  └─────────────────────┘ │
│                         │
│  [Optional: Tip-Box     │
│   mit nächsten Schritt] │
│                         │
└─────────────────────────┘
```

## HTML-Template

```html
<h2>Zusammenfassung</h2>

<div class="summary-box">
    <h3>Die wichtigsten Erkenntnisse</h3>
    
    <div class="takeaway-item">
        <span class="takeaway-number">1</span>
        <span class="takeaway-text"><strong>[Kernaussage]</strong> – [Erläuterung in einem Satz]</span>
    </div>
    
    <div class="takeaway-item">
        <span class="takeaway-number">2</span>
        <span class="takeaway-text"><strong>[Kernaussage]</strong> – [Erläuterung]</span>
    </div>
    
    <div class="takeaway-item">
        <span class="takeaway-number">3</span>
        <span class="takeaway-text"><strong>[Kernaussage]</strong> – [Erläuterung]</span>
    </div>
</div>

<!-- Optional: Handlungsaufforderung -->
<div class="tip-box">
    <h4>💡 Nächster Schritt</h4>
    <p>[Konkrete Empfehlung, was der Leser als nächstes tun sollte.]</p>
</div>
```

## Regeln

- Max. 5 Takeaways (3–4 ist ideal)
- Jeder Takeaway: Bold-Kernaussage + kurze Erläuterung
- Nummern in Accent-Farbe für visuelle Orientierung
- Optional Tip-Box am Ende für Call-to-Action
- Keine neuen Informationen – nur Wiederholung und Verdichtung
