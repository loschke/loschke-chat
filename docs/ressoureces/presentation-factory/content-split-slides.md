# Content-Split-Slides

Split-Layouts für Content + Fazit – zwei Bereiche mit unterschiedlichen Hintergründen für visuelle Trennung und Betonung.

---

## Varianten-Übersicht

| Variante | Klasse | Aufteilung | Use Case |
|----------|--------|------------|----------|
| A | `split-5050` | 50% / 50% | Content + Fazit gleichwertig |
| D | `split-asymmetric` | 66% / 33% | Content dominant, Fazit kompakt |

Beide Varianten unterstützen:
- Accent-Hintergrund für Fazit-Seite
- Subtle-Variante (dark-alt statt accent)
- Alle drei Brands (loschke.ai, unlearn.how, lernen.diy)

---

## Variante A – 50/50 Split

**Klasse:** `split-5050`

**Use Case:** Content und Fazit sind gleichwertig, z.B. Aufzählung links + Kernaussage rechts

**Modifier:**
- Standard: Fazit auf Accent-Hintergrund
- `.subtle`: Fazit auf bg-dark-alt

**Elemente Links (Content):**
- `top-label`: Instrument Serif, var(--font-label), text-muted
- `content-title`: Noto Sans 900, var(--font-title-md), text-primary
- `content-title .highlight`: accent
- `content-list` + `content-item`: Bullet-Liste mit Accent-Punkt

**Elemente Rechts (Fazit auf Accent):**
- `fazit-label`: Instrument Serif, var(--font-label), text-primary opacity 0.7
- `fazit-title`: Noto Sans 900, var(--font-title-md), text-primary
- `fazit-text`: Instrument Serif, var(--font-subline), text-primary opacity 0.9

**Elemente Rechts (Fazit auf Subtle):**
- `fazit-label`: accent
- `fazit-list` + `fazit-item`: Pfeil-Liste mit Accent-Pfeil

**Struktur (Accent):**
```html
<div class="slide split-5050">
    <div class="split-left">
        <div class="top-label">Kategorie</div>
        <h1 class="content-title">Titel mit <span class="highlight">Akzent</span></h1>
        <div class="content-list">
            <div class="content-item">Punkt eins</div>
            <div class="content-item">Punkt zwei</div>
            <div class="content-item">Punkt drei</div>
        </div>
    </div>
    <div class="split-right">
        <div class="fazit-label">Fazit</div>
        <h2 class="fazit-title">Kernaussage</h2>
        <p class="fazit-text">Erläuternder Text zur Kernaussage.</p>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

**Struktur (Subtle mit Liste):**
```html
<div class="slide split-5050 subtle">
    <div class="split-left">
        <div class="top-label">Kategorie</div>
        <h1 class="content-title">Titel mit <span class="highlight">Akzent</span></h1>
        <div class="content-list">
            <div class="content-item">Punkt eins</div>
            <div class="content-item">Punkt zwei</div>
        </div>
    </div>
    <div class="split-right">
        <div class="fazit-label">Kernpunkte</div>
        <div class="fazit-list">
            <div class="fazit-item">Takeaway eins</div>
            <div class="fazit-item">Takeaway zwei</div>
            <div class="fazit-item">Takeaway drei</div>
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

---

## Variante D – Asymmetrischer Split (2/3 + 1/3)

**Klasse:** `split-asymmetric`

**Use Case:** Content braucht mehr Platz (Text + Liste), Fazit ist kompakte Nebeninfo

**Modifier:**
- Standard: Aside auf bg-dark-alt
- `.accent`: Aside auf Accent-Hintergrund

**Elemente Links (Main Content):**
- `top-label`: Instrument Serif, var(--font-label), text-muted
- `content-title`: Noto Sans 900, var(--font-title-md), text-primary
- `content-title .highlight`: accent
- `content-text`: Noto Sans 400, var(--font-body), text-soft (Fließtext)
- `content-list` + `content-item`: Bullet-Liste, var(--font-source)

**Elemente Rechts (Aside):**
- `aside-label`: Instrument Serif, var(--font-source), accent
- `aside-title`: Noto Sans 900, var(--font-title-md), text-primary
- `aside-text`: Instrument Serif, var(--font-subline), text-muted

**Elemente Rechts (Aside auf Accent):**
- `aside-label`: text-primary opacity 0.7
- `aside-title`: text-primary
- `aside-text`: text-primary opacity 0.9

**Struktur:**
```html
<div class="slide split-asymmetric">
    <div class="split-main">
        <div class="top-label">Kategorie</div>
        <h1 class="content-title">Titel mit <span class="highlight">Akzent</span></h1>
        <p class="content-text">Einleitender Fließtext mit Kontext und Erklärung.</p>
        <div class="content-list">
            <div class="content-item">Detailpunkt eins mit mehr Text</div>
            <div class="content-item">Detailpunkt zwei mit mehr Text</div>
            <div class="content-item">Detailpunkt drei mit mehr Text</div>
        </div>
    </div>
    <div class="split-aside">
        <div class="aside-label">Merke</div>
        <h2 class="aside-title">Kompakte Kernaussage</h2>
        <p class="aside-text">Kurzer erläuternder Satz.</p>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

**Struktur (Accent):**
```html
<div class="slide split-asymmetric accent">
    <!-- identisch, nur .accent Modifier -->
</div>
```

---

## Brand-Varianten

Alle Split-Varianten funktionieren mit allen drei Brands:

```html
<!-- loschke.ai (Default) -->
<div class="slide split-5050">...</div>

<!-- unlearn.how -->
<div class="slide split-5050 brand-unlearn">...</div>

<!-- lernen.diy -->
<div class="slide split-asymmetric brand-lernen">...</div>
```

---

## Entscheidungshilfe

| Situation | Empfehlung |
|-----------|------------|
| Content + Fazit gleichwertig | A (50/50) |
| Fazit soll herausstechen | A mit Accent |
| Fazit ist Liste von Takeaways | A Subtle |
| Content braucht viel Platz | D (Asymmetrisch) |
| Kompakte Nebeninfo/Merke-Box | D |
| Starke visuelle Betonung der Aside | D mit Accent |

---

## Design-Konstanten

- Split-Padding: var(--slide-padding) = 120px
- Aside-Padding (D): 80px horizontal
- Abstände Titel → Content: 48-64px
- Listen-Gap: 28-32px
- Bullet-Marker: 12px Kreis, Accent
- Pfeil-Marker (Subtle): → in Accent

---

## Farbverhalten auf Accent-Hintergrund

Alle Texte auf Accent-Hintergrund nutzen helle Farben:
- Labels: text-primary mit opacity 0.7
- Titel: text-primary
- Fließtext: text-primary mit opacity 0.9

Dies gilt für alle drei Brands.
