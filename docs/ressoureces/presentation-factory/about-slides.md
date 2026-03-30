# About-Slides

> Vorstellung des Speakers/Autors in verschiedenen Ausprägungen

---

## Übersicht

**Zweck:** Speaker-Vorstellung, Bio, Credentials

**Varianten (von maximal bis minimal):**
- A: `about-full` – Bild + Text + Logo-Leiste (Maximal)
- B: `about-split` – Bild + Text (ohne Logos)
- C: `about-compact` – Rundes Avatar + Text
- D: `about-text-only` – Nur Text mit Credentials-Grid
- E: `about-minimal` – Nur Name, Rolle, Tagline

---

## Variante A – About Full

**Klasse:** `about-full`

**Use Case:** Ausführliche Vorstellung, externe Talks, neue Audiences

**Struktur:**
```html
<div class="slide bg-dark about-full">
    <div class="content-area">
        <div class="about-text">
            <div class="top-label">Wer bin ich?</div>
            <div class="about-header">
                <div class="about-name">Hi, ich bin Rico …</div>
            </div>
            <div class="about-points">
                <div class="about-point">
                    <div class="point-marker"></div>
                    <div class="point-text">Credential 1</div>
                </div>
                <!-- weitere Punkte -->
            </div>
            <div class="logo-bar">
                <div class="logo-item"><span>Partner 1</span></div>
                <!-- weitere Logos -->
            </div>
        </div>
        <div class="about-image">
            <div class="image-placeholder">Foto 560×1080</div>
            <div class="accent-bar"></div>
        </div>
    </div>
</div>
```

**Elemente:**
| Element | Beschreibung |
|---------|--------------|
| `.about-name` | Name (font-title-md, 900) |
| `.about-points` | Bullet-Liste mit Credentials |
| `.point-marker` | Roter Punkt (8px, accent) |
| `.logo-bar` | Horizontale Logo-Leiste |
| `.about-image` | 560px breites Foto rechts |
| `.accent-bar` | 40px Akzent-Streifen am rechten Rand |

**Hinweis:** Slide hat `padding: 0`, Layout geht edge-to-edge

---

## Variante B – About Split

**Klasse:** `about-split`

**Use Case:** Standard-Vorstellung mit Bild, ohne Logo-Überladung

**Struktur:**
```html
<div class="slide bg-dark about-split">
    <div class="content-area">
        <div class="about-text">
            <div class="top-label">Über mich</div>
            <h1 class="about-title">Rico <span class="highlight">Loschke</span></h1>
            <p class="about-intro">Kurze Bio...</p>
            <div class="about-credentials">
                <div class="credential">Credential 1</div>
                <div class="credential">Credential 2</div>
            </div>
        </div>
        <div class="about-image">
            <div class="image-placeholder">Foto 640×1080</div>
        </div>
    </div>
</div>
```

**Elemente:**
| Element | Beschreibung |
|---------|--------------|
| `.about-title` | Name mit Highlight |
| `.about-intro` | Bio-Text (font-body, text-soft) |
| `.credential` | Border-left 3px accent |
| `.about-image` | 640px breites Foto rechts |

---

## Variante C – About Compact

**Klasse:** `about-compact`

**Use Case:** Schnelle Vorstellung, bekannte Audiences

**Struktur:**
```html
<div class="slide bg-dark about-compact">
    <div class="content-area">
        <div class="about-avatar">
            <div class="image-placeholder">Avatar 280px</div>
        </div>
        <div class="about-text">
            <div class="about-name">Rico Loschke</div>
            <div class="about-role">KI-Generalist · Berater · Speaker</div>
            <p class="about-bio">Bio-Text...</p>
        </div>
    </div>
</div>
```

**Elemente:**
| Element | Beschreibung |
|---------|--------------|
| `.about-avatar` | 280px rundes Bild mit accent-Border |
| `.about-name` | Name (font-title-md, 900) |
| `.about-role` | Rolle (font-label, accent) |
| `.about-bio` | Bio-Text (font-body) |

---

## Variante D – About Text

**Klasse:** `about-text-only`

**Use Case:** Kein Foto verfügbar, Fokus auf Credentials

**Struktur:**
```html
<div class="slide bg-dark about-text-only">
    <div class="content-area">
        <div class="about-header">
            <div class="top-label">Wer spricht?</div>
            <h1 class="about-title">Rico <span class="highlight">Loschke</span></h1>
        </div>
        <p class="about-intro">Kurze Bio...</p>
        <div class="about-credentials">
            <div class="credential">
                <span class="credential-marker">01</span>
                <span class="credential-text">Credential 1</span>
            </div>
            <!-- weitere Credentials -->
        </div>
    </div>
</div>
```

**Elemente:**
| Element | Beschreibung |
|---------|--------------|
| `.about-credentials` | 2-Spalten Grid |
| `.credential-marker` | Nummer (font-body, 900, accent) |
| `.credential-text` | Text (font-source) |

---

## Variante E – About Minimal

**Klasse:** `about-minimal`

**Use Case:** Sehr kurze Vorstellung, bekanntes Publikum

**Struktur:**
```html
<div class="slide bg-dark about-minimal">
    <div class="content-area">
        <div class="about-name">Rico Loschke</div>
        <div class="about-role">KI-Generalist · Berater · Speaker</div>
        <p class="about-tagline">Tagline...</p>
    </div>
</div>
```

**Elemente:**
| Element | Beschreibung |
|---------|--------------|
| `.about-name` | Name groß (font-title-xl, 80px) |
| `.about-role` | Rolle (font-subline, accent) |
| `.about-tagline` | Tagline (font-label, muted) |

**Layout:** Zentriert

---

## Wann welche Variante?

| Situation | Variante |
|-----------|----------|
| Externes Event, neue Audience | A (Full) |
| Standard-Vortrag | B (Split) |
| Kurze Vorstellung, Workshops | C (Compact) |
| Kein Foto vorhanden | D (Text) |
| Bekanntes Publikum, Zeitdruck | E (Minimal) |

---

## Bild-Formate

| Variante | Format | Größe |
|----------|--------|-------|
| A (Full) | Hochformat | 560 × 1080 px |
| B (Split) | Hochformat | 640 × 1080 px |
| C (Compact) | Quadrat | 280 × 280 px (rund) |

---

## Beispiel-Folien

**Vorhanden in HTML:**
- A: Full mit Bullet-Points + Logo-Leiste
- B: Split mit Intro + Credentials
- C: Compact mit rundem Avatar
- D: Text-only mit 2-Spalten Grid
- E1: Minimal zentriert
- E2: Minimal auf dark-alt
