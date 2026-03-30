# Credit-Pricing-Varianten

> Grundlage: 1 Credit = 1 Cent. Token-basierte Berechnung, keine Festpreise.

---

## Variante A: Kostendeckung (Freunde, Akquise, Demos)

Ziel: Echte Provider-Kosten 1:1 weitergeben, kein Verlust, kein Gewinn.

### Konfiguration

```env
CREDITS_PER_DOLLAR=100

# Tool-Flatrates (= echte Kosten, gerundet)
IMAGE_GENERATION_CREDITS=8
DEEP_RESEARCH_CREDITS=400
YOUTUBE_SEARCH_CREDITS=1
YOUTUBE_ANALYZE_CREDITS=5
TTS_CREDITS=3
BRANDING_CREDITS=1
STITCH_GENERATION_CREDITS=5
STITCH_EDIT_CREDITS=3
GOOGLE_SEARCH_CREDITS=1
```

### Was kostet was?

| Aktion | Credits | Echte Kosten |
|--------|---------|-------------|
| Chat-Nachricht (Sonnet, normal) | 1–2 | $0.01–0.05 |
| Chat-Nachricht (Sonnet, lang/Skill) | 3–5 | $0.05–0.20 |
| Chat-Nachricht (Opus, normal) | 2–5 | $0.05–0.23 |
| Chat-Nachricht (Opus, lang/Skill) | 10–16 | $0.10–1.60 |
| Chat-Nachricht (Gemini Flash) | 1 | <$0.01 |
| HTML-Artifact (Sonnet, 30k Output) | 5 | $0.48 |
| HTML-Artifact (Opus, 30k Output) | 24 | $2.40 |
| Bild generieren | 8 | $0.08 |
| Deep Research | 400 | $3–6 |
| YouTube Analyse | 5 | $0.05 |
| TTS | 3 | $0.03 |
| Google Search | 1 | <$0.01 |

### Typische Sessions

| Szenario | Modell | Credits | Kosten |
|----------|--------|---------|--------|
| Quick Chat (5 Nachrichten) | Sonnet | ~7 | ~$0.07 |
| Arbeits-Session (20 Nachrichten) | Sonnet | ~30–50 | ~$0.30–0.50 |
| Design-Session (10 Chat + 2 Stitch) | Sonnet | ~25 | ~$0.25 |
| Research-Session (5 Chat + Deep Research) | Sonnet | ~410 | ~$4.10 |
| HTML-Erstellung (5 Chat + 3 Artifacts) | Sonnet | ~22 | ~$0.22 |
| Power-Session (15 Nachrichten) | Opus | ~100–200 | ~$1–2 |
| Heavy Day (alle Features) | Sonnet | ~500 | ~$5 |

### Empfohlene Grants

| Empfaenger | Grant | Reicht fuer |
|------------|-------|-------------|
| Demo/Akquise | 200 Credits (2€) | ~1 Session mit allen Features |
| Freunde/Familie | 1.000 Credits (10€) | ~2–4 Wochen normaler Nutzung |
| Power-User | 3.000 Credits (30€) | ~1 Monat intensiv |

---

## Variante B: SaaS (Marge fuer Weiterentwicklung)

Ziel: Echte Kosten + Marge fuer Betrieb, Hosting, Entwicklung. Faktor **3x** auf Token-Kosten, **2x** auf Tool-Flatrates.

### Konfiguration

```env
CREDITS_PER_DOLLAR=33

# Tool-Flatrates (echte Kosten x2, gerundet)
IMAGE_GENERATION_CREDITS=15
DEEP_RESEARCH_CREDITS=800
YOUTUBE_SEARCH_CREDITS=2
YOUTUBE_ANALYZE_CREDITS=10
TTS_CREDITS=5
BRANDING_CREDITS=2
STITCH_GENERATION_CREDITS=10
STITCH_EDIT_CREDITS=5
GOOGLE_SEARCH_CREDITS=2
```

**Mechanismus:** `CREDITS_PER_DOLLAR=33` bedeutet 33 Credits pro Dollar, also 1 Credit = ~3 Cent. Die Token-Formel produziert damit automatisch ~3x hoehere Credit-Werte bei gleichen Token-Zahlen. Tool-Flatrates werden separat auf ~2x gesetzt (Tools haben bereits Marge im Vergleich zu reinen API-Kosten).

### Was kostet was?

| Aktion | Credits | Endpreis (User zahlt) | Davon Marge |
|--------|---------|----------------------|-------------|
| Chat-Nachricht (Sonnet, normal) | 1–2 | $0.03–0.06 | ~$0.02–0.04 |
| Chat-Nachricht (Sonnet, lang/Skill) | 3–9 | $0.09–0.27 | ~$0.04–0.12 |
| Chat-Nachricht (Opus, normal) | 3–7 | $0.09–0.21 | ~$0.04–0.10 |
| Chat-Nachricht (Opus, lang/Skill) | 15–30 | $0.45–0.90 | ~$0.20–0.40 |
| Chat-Nachricht (Gemini Flash) | 1 | $0.03 | ~$0.02 |
| HTML-Artifact (Sonnet, 30k Output) | 8 | $0.24 | ~$0.12 |
| HTML-Artifact (Opus, 30k Output) | 40 | $1.20 | ~$0.60 |
| Bild generieren | 15 | $0.45 | ~$0.37 |
| Deep Research | 800 | $24.00 | ~$19 |
| YouTube Analyse | 10 | $0.30 | ~$0.25 |
| TTS | 5 | $0.15 | ~$0.12 |
| Google Search | 2 | $0.06 | ~$0.05 |

### Typische Sessions

| Szenario | Modell | Credits | User zahlt |
|----------|--------|---------|-----------|
| Quick Chat (5 Nachrichten) | Sonnet | ~8 | ~$0.24 |
| Arbeits-Session (20 Nachrichten) | Sonnet | ~50–80 | ~$1.50–2.40 |
| Design-Session (10 Chat + 2 Stitch) | Sonnet | ~40 | ~$1.20 |
| Research-Session (5 Chat + Deep Research) | Sonnet | ~810 | ~$24.50 |
| HTML-Erstellung (5 Chat + 3 Artifacts) | Sonnet | ~30 | ~$0.90 |
| Power-Session (15 Nachrichten) | Opus | ~150–350 | ~$4.50–10.50 |
| Heavy Day (alle Features) | Sonnet | ~900 | ~$27 |

### Empfohlene Preispakete

| Paket | Credits | Preis | Reicht fuer |
|-------|---------|-------|-------------|
| Starter | 500 Credits | 15€ | ~1–2 Wochen leicht |
| Standard | 2.000 Credits | 60€ | ~1 Monat normal |
| Pro | 5.000 Credits | 150€ | ~1 Monat intensiv |
| Enterprise | 15.000 Credits | 450€ | ~1 Monat Team/Heavy |

### Marge-Uebersicht

| Kostenart | Faktor | Begruendung |
|-----------|--------|-------------|
| Token-Kosten (Chat) | ~3x | Hosting, Infra, Gateway, Entwicklung |
| Tool-Flatrates | ~2x | Geringerer Aufschlag, da bereits feste Kosten |
| Deep Research | ~4x | Hohe Einzelkosten, Risiko bei Fehlversuchen |

---

## Vergleich auf einen Blick

| Metrik | Variante A (Kostendeckung) | Variante B (SaaS) |
|--------|---------------------------|-------------------|
| 1 Credit = | 1 Cent | ~3 Cent |
| `CREDITS_PER_DOLLAR` | 100 | 33 |
| Sonnet-Nachricht | 1–2 Credits | 1–3 Credits |
| Opus-Nachricht | 2–16 Credits | 3–30 Credits |
| Bild | 8 Credits | 15 Credits |
| Deep Research | 400 Credits | 800 Credits |
| 1.000 Credits kosten | 10€ | 30€ |
| Marge | 0% | ~200% auf Tokens |

---

## Umschaltung

Wechsel zwischen Varianten erfolgt ausschliesslich ueber ENV-Variablen — kein Code-Aenderung noetig. Auf Vercel pro Projekt individuell setzbar.

**Wichtig:** Bei Wechsel der Skala muessen bestehende User-Balances nicht migriert werden, solange `CREDITS_PER_DOLLAR` und die Flatrates gleichzeitig geaendert werden. Die Credit-Zahlen bleiben gleich, nur ihr Euro-Gegenwert aendert sich.
