# Tabellen-Slides

> Strukturierte Daten: Features, Specs, Vergleiche

---

## Übersicht

**Zweck:** Tabellarische Darstellung von strukturierten Daten

**Varianten:**
- A: `table-full` – Zeilen- UND Spaltenheader (Vergleichstabellen)
- B: `table-cols` – Nur Spaltenheader (Listen, Rankings)
- C: `table-rows` – Nur Zeilenheader (Key-Value, Specs)

---

## Variante A – Zeilen- und Spaltenheader

**Klasse:** `table-full`

**Use Case:** Vergleiche, Feature-Matrices, Gegenüberstellungen

**Struktur:**
```html
<div class="slide bg-dark table-full">
    <div class="content-area">
        <div class="table-header">
            <div class="top-label">Vergleich</div>
            <h1 class="table-title">Allrounder vs <span class="highlight">Reasoning</span></h1>
        </div>
        <div class="table-area">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Aspekt</th>
                        <th>Option A</th>
                        <th>Option B</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th>Kriterium 1</th>
                        <td>Wert A</td>
                        <td>Wert B</td>
                    </tr>
                    <!-- weitere Zeilen -->
                </tbody>
            </table>
        </div>
    </div>
</div>
```

**Elemente:**
| Element | Beschreibung |
|---------|--------------|
| `thead th` | Spaltenheader (font-source, 700) |
| `tbody th` | Zeilenheader (font-source, 700, width 240px) |
| `tbody td` | Datenzellen (font-source, 400, text-soft) |

**Styling:**
- Spaltenheader: Border-bottom 2px accent
- Zebra-Striping: Ungerade Zeilen bg-dark-alt

---

## Variante B – Nur Spaltenheader

**Klasse:** `table-cols`

**Use Case:** Tool-Listen, Rankings, Feature-Übersichten, Projektlisten

**Struktur:**
```html
<div class="slide bg-dark table-cols">
    <div class="content-area">
        <div class="table-header">
            <div class="top-label">Übersicht</div>
            <h1 class="table-title">Die wichtigsten <span class="highlight">Tools</span></h1>
        </div>
        <div class="table-area">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Tool</th>
                        <th>Kategorie</th>
                        <th>Stärke</th>
                        <th>Preis</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Name</td>
                        <td>Wert</td>
                        <td>Wert</td>
                        <td>Wert</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>
```

**Besonderheit:** Erste Spalte automatisch hervorgehoben (font-weight 600)

---

## Variante C – Nur Zeilenheader

**Klasse:** `table-rows`

**Use Case:** Key-Value Paare, Specs, Details, Steckbriefe

**Struktur:**
```html
<div class="slide bg-dark table-rows">
    <div class="content-area">
        <div class="table-header">
            <div class="top-label">Spezifikationen</div>
            <h1 class="table-title">Workshop <span class="highlight">Details</span></h1>
        </div>
        <div class="table-area">
            <table class="data-table">
                <tbody>
                    <tr>
                        <th>Format</th>
                        <td>Online Workshop via Zoom</td>
                    </tr>
                    <tr>
                        <th>Dauer</th>
                        <td>3 Stunden</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>
```

**Besonderheit:** 
- Zeilenheader mit border-left 4px accent
- Größere Schrift (font-body statt font-source)
- max-width 1400px für bessere Lesbarkeit

---

## Modifier & Hilfsklassen

**Kompakte Variante:**
```html
<div class="slide bg-dark table-cols table-compact">
```
- Kleinere Schrift (font-small)
- Weniger Padding
- Für mehr Zeilen/Spalten

**Zentrierte Spalten:**
```html
<th class="center">Status</th>
<td class="center"><span class="check">✓</span></td>
```

**Check/Cross Icons:**
```html
<td class="center"><span class="check">✓</span></td>
<td class="center"><span class="cross">✗</span></td>
```
- `.check` = Grün (#22c55e)
- `.cross` = Accent (Rot)

**Accent-Text:**
```html
<td class="accent">Wichtig</td>
```

**Spalten-Highlight:**
```html
<th class="col-highlight">Empfohlen</th>
<td class="col-highlight">Wert</td>
```
- Subtiler accent-Hintergrund

---

## Wann welche Variante?

| Situation | Variante |
|-----------|----------|
| Zwei Optionen vergleichen | A (table-full) |
| Feature-Matrix mit ✓/✗ | A (table-full) |
| Tool-Liste mit mehreren Attributen | B (table-cols) |
| Projekt-Übersicht | B (table-cols) + table-compact |
| Workshop-Details | C (table-rows) |
| Produkt-Specs | C (table-rows) |
| Key Facts auf einen Blick | C (table-rows) |

---

## Typografie-Referenz

| Element | Font | Größe |
|---------|------|-------|
| table-title | Noto Sans 900 | font-title-md (52px) |
| thead th | Noto Sans 700 | font-source (36px) |
| tbody th | Noto Sans 700 | font-source/font-body |
| tbody td | Noto Sans 400 | font-source/font-body |

---

## Beispiel-Folien

**Vorhanden in HTML:**
- A1: Vergleichstabelle (Allrounder vs Reasoning)
- A2: Feature-Matrix mit Check/Cross
- B1: Tool-Liste (4 Spalten)
- B2: Projektliste kompakt (5 Spalten)
- C1: Workshop-Details (Key-Value)
- C2: Projekt-Kennzahlen (Key-Value)
