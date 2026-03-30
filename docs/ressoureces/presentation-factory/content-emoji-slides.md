# Content-Emoji-Slides

> Emojis als visueller Anker für emotionale Wirkung

---

## Übersicht

**Zweck:** Emotionen visualisieren, Typen unterscheidbar machen, Aufmerksamkeit erzeugen

**Varianten:**
- A: `emoji-row` – 3-5 Emojis horizontal mit Labels
- B: `emoji-duo` – Gegenüberstellung zweier Typen/Positionen
- C: `emoji-statement` – Großes Emoji + Headline für emotionalen Punch

---

## Variante A – Emoji Row

**Klasse:** `emoji-row`

**Use Case:** Typologien, Optionen zeigen, Kategorien visualisieren

**Struktur:**
```html
<div class="slide bg-dark emoji-row">
    <div class="emoji-header">
        <div class="top-label">Typologie</div>
        <h1 class="emoji-title">Welcher <span class="highlight">Typ</span> bist du?</h1>
    </div>
    <div class="emoji-area">
        <div class="row-items">
            <div class="row-item">
                <div class="item-icon">🚀</div>
                <div class="item-label">Der Macher</div>
            </div>
            <div class="row-item">
                <div class="item-icon">🔍</div>
                <div class="item-label">Der Analyst</div>
            </div>
            <!-- weitere Items -->
        </div>
    </div>
    <!-- optional: emoji-conclusion -->
</div>
```

**Elemente:**
| Element | Beschreibung |
|---------|--------------|
| `.row-items` | Flex-Container, zentriert, gap 80px |
| `.row-item` | Einzelnes Element, min-width 200px |
| `.item-icon` | Emoji, 100px |
| `.item-label` | Label (font-source, 700) |
| `.item-sub` | Optional: Sublabel (Instrument Serif, text-muted) |

**Optionale Elemente:**
- `.item-sub` – Kurze Beschreibung unter dem Label
- `.emoji-conclusion` – Fazit am Ende der Folie

**Constraints:**
- 3-5 Items optimal
- Labels max. 2 Wörter
- Sub-Labels max. 1 Zeile

---

## Variante B – Emoji Duo

**Klasse:** `emoji-duo`

**Use Case:** Gegenüberstellung, zwei Seiten einer Medaille, Vergleich

**Struktur:**
```html
<div class="slide bg-dark emoji-duo">
    <div class="emoji-header">
        <div class="top-label">Das Dilemma</div>
        <h1 class="emoji-title">Zwei Typen, <span class="highlight">ein Problem</span></h1>
    </div>
    <div class="emoji-area">
        <div class="duo-card">
            <div class="card-icon">😎</div>
            <div class="card-title">Der Enthusiast</div>
            <div class="card-text">
                Kennt 47 Tools<br>
                Probiert alles aus<br>
                Hat 1000 Ideen
            </div>
            <div class="card-quote">"Wo fange ich an?"</div>
        </div>
        <div class="duo-card">
            <div class="card-icon">🤨</div>
            <div class="card-title">Der Skeptiker</div>
            <div class="card-text">
                Wartet ab<br>
                Sieht die Risiken<br>
                Hat 1000 Bedenken
            </div>
            <div class="card-quote">"Wo fange ich an?"</div>
        </div>
    </div>
    <div class="emoji-conclusion">
        Beide stellen die <span class="accent">gleiche Frage.</span>
    </div>
</div>
```

**Elemente:**
| Element | Beschreibung |
|---------|--------------|
| `.emoji-area` | Grid 1fr 1fr, gap 120px |
| `.duo-card` | Zentrierte Karte |
| `.card-icon` | Emoji, 100px |
| `.card-title` | Titel (font-body, 900) |
| `.card-text` | Beschreibung (font-source, text-soft) |
| `.card-quote` | Optional: Zitat (Instrument Serif, accent) |

**Optionale Elemente:**
- `.card-quote` – Gemeinsames oder unterschiedliches Zitat
- `.emoji-conclusion` – Verbindendes Fazit

**Constraints:**
- Genau 2 Cards
- Text-Zeilen parallel halten (beide gleich viele)
- Titel max. 3 Wörter

---

## Variante C – Emoji Statement

**Klasse:** `emoji-statement`

**Use Case:** Emotionaler Punch, Frustration/Freude zeigen, Pattern-Interrupt

**Struktur:**
```html
<div class="slide bg-dark emoji-statement">
    <div class="emoji-area">
        <div class="statement-icon">😤</div>
        <div class="statement-content">
            <div class="statement-headline">Das nervt <span class="highlight">alle.</span></div>
            <div class="statement-sub">Dieselbe E-Mail zum zehnten Mal schreiben. Daten aus PDFs abtippen.</div>
        </div>
    </div>
</div>
```

**Elemente:**
| Element | Beschreibung |
|---------|--------------|
| `.emoji-area` | Flex, zentriert, gap 64px |
| `.statement-icon` | Großes Emoji, 160px |
| `.statement-content` | max-width 900px |
| `.statement-headline` | Headline (font-title-lg, 900) |
| `.statement-sub` | Subline (Instrument Serif, font-subline) |

**Hinweise:**
- Kein Header – das Emoji IST der Einstieg
- Headline kurz und punchy
- Subline erklärt/konkretisiert

**Constraints:**
- Headline max. 5-6 Wörter
- Subline max. 2 Sätze
- Emoji passend zur Emotion wählen

---

## Emoji-Auswahl

**Positiv:**
- 💡 Idee, Erkenntnis
- 🎯 Fokus, Ziel
- 🚀 Aufbruch, Energie
- ✅ Erfolg, Check

**Negativ:**
- 😤 Frustration
- 🤯 Überforderung
- ❌ Fehler, Ablehnung
- 😵‍💫 Verwirrung

**Neutral/Typen:**
- 🔍 Analyst, Suche
- 🤝 Zusammenarbeit
- 🛡️ Vorsicht, Schutz
- 🤨 Skepsis

**Konzepte:**
- 👤 Individuum
- 👥 Team
- 🏢 Organisation
- ⚡ Geschwindigkeit

---

## Wann welche Variante?

| Situation | Variante |
|-----------|----------|
| Typen/Optionen zeigen | A (Row) |
| Zwei Positionen gegenüberstellen | B (Duo) |
| Emotionaler Einstieg/Punch | C (Statement) |
| Frustration visualisieren | C mit 😤 oder ähnlich |
| Aha-Moment zeigen | C mit 💡 |

---

## Beispiel-Folien

**Vorhanden in HTML:**
- A1: Emoji Row basic (4 Typen)
- A2: Emoji Row mit Sub-Labels + Conclusion (3 Hebel)
- B1: Emoji Duo mit Quote (Enthusiast vs Skeptiker)
- B2: Emoji Duo ohne Quote (Schnell vs Gründlich)
- C1: Emoji Statement negativ (😤 Das nervt alle)
- C2: Emoji Statement positiv (💡 Der Moment wenn es klickt)
