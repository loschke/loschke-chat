# Next.js Handoff: lernen.diy Komponenten

Visuelle Nachbauten der folgenden Astro-Komponenten für ein Next.js-Projekt.
Ziel: Pixel-genaue Übernahme von Layout, Typografie, Farben und Animationen.

---

## Design-System / Tokens

```css
/* Fonts (Google Fonts / fontsource) */
--font-sans: "Noto Sans", sans-serif;    /* Body, Headlines */
--font-serif: "Instrument Serif", serif;  /* Sublines, Logos */

/* Colors */
--color-accent: #0F766E;      /* Teal — Primary Brand */
--color-dark: #151416;         /* Near-black — Headlines, dark sections */
--color-light-gray: #f5f5f5;  /* Subtle backgrounds */

/* Ecosystem Brand Colors */
--color-loschke: #FC2D01;     /* Orange */
--color-unlearn: #a855f7;     /* Purple */
--color-build: #4A7AE5;       /* Blue */

/* Text hierarchy */
body-text: #525252
labels: #737373
borders: #e5e5e5
alt-section-bg: #fafafa
```

### Typografie-Regeln

| Element | Font | Weight | Tracking | Leading |
|---------|------|--------|----------|---------|
| Headlines | Noto Sans | 900 (black) | -0.025em bis -0.04em | 0.88–0.95 |
| Serif Lead | Instrument Serif | 400 | default | 1.4–1.45 |
| Body | Noto Sans | 300 (light) | default | 1.75 |
| Labels | Noto Sans | 500 (medium) | 0.08em | default, uppercase |
| Card Titles | Noto Sans | 900 | -0.01em | default |

---

## 1. FrameLayout (Rahmen-Prinzip)

**Konzept:** Ein fester 18px Teal-Rahmen umgibt den gesamten Viewport. Der Content scrollt innerhalb.

```
┌──────────────────────────────────┐  ← fixed, 18px border, accent color
│  [Beta Banner - fixed top]       │  ← z-99999, accent bg
│  ┌────────────────────────────┐  │
│  │  [Nav]                     │  │  ← sticky
│  │  [Page Content]            │  │  ← scrollable
│  │  [Footer]                  │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

**Next.js Implementation:**

```tsx
// layout.tsx (oder ein FrameLayout wrapper)
export default function FrameLayout({ children }) {
  return (
    <body className="bg-white text-[#151416] font-sans min-h-screen">
      {/* Skip Link */}
      <a href="#main-content" className="sr-only focus:not-sr-only ...">
        Zum Inhalt springen
      </a>

      {/* Fixed Frame Border */}
      <div className="fixed inset-0 z-[9999] pointer-events-none border-[18px] border-[#0F766E] box-border" />

      {/* Beta Banner */}
      <div className="fixed top-0 left-0 right-0 z-[99999] bg-[#0F766E] text-white text-center text-xs sm:text-sm font-medium py-1.5 tracking-wide pointer-events-auto">
        <span className="opacity-90">Beta</span>
        <span className="mx-2 opacity-40">·</span>
        <span className="opacity-70 font-light">lernen.diy ist in aktiver Entwicklung</span>
      </div>

      {/* Scrollable Content Wrapper */}
      <div className="p-[18px] pt-[calc(18px+32px)]">
        <div className="bg-white min-h-[calc(100vh-36px-32px)] relative">
          <Nav />
          <main id="main-content">{children}</main>
          <Footer />
        </div>
      </div>
    </body>
  );
}
```

**Wichtig:**
- Der Frame ist `pointer-events-none` — klickbar bleibt nur der Content
- Das Beta-Banner ist `pointer-events-auto` (interaktiv)
- Content Wrapper hat `p-[18px]` und extra `pt` für das Banner
- Inner Container: `bg-white` damit der weiße Content-Bereich klar abgegrenzt ist

---

## 2. Hero Section

**Datei:** `src/components/sections/homepage/Hero.astro`

Fullscreen-Hero mit gestaffelten Slide-up-Animationen.

```
min-h-[calc(100vh-36px)]  ← volle Höhe minus Frame
px-6 sm:px-10 md:px-16 lg:px-20  ← responsive Padding
```

**Struktur:**
1. Label-Zeile: `Rico Loschke · AI · Visionen · Konzepte · Skills` (uppercase, #737373, xs/sm)
2. H1: `Prinzipien` / `statt Tricks.` (Der Punkt ist accent-farbig via Dot-Komponente)
3. Serif Lead: Beschreibungstext in Instrument Serif
4. CTAs: "Blog lesen" (dark bg, white text) + "Mein Manifest →" (text link, accent)

**H1 Fluid Sizing:**
```
text-5xl sm:text-6xl md:text-[clamp(80px,11vw,180px)]
font-black leading-[0.88] tracking-[-0.04em]
```

**Animation:** Jede Zeile hat ein `HeroLine`-Wrapper mit gestaffeltem Delay (0.15s, 0.25s, 0.38s, 0.6s, 0.75s). HeroLine clippt via `overflow: hidden` und schiebt Content von `translateY(100%)` auf `translateY(0)`.

---

## 3. Hero Animation Components (React, direkt übernehmbar)

### HeroLine

```tsx
"use client";
import { useState, useEffect, type ReactNode } from "react";

interface HeroLineProps {
  children: ReactNode;
  delay?: number;
}

export function HeroLine({ children, delay = 0 }: HeroLineProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const t = setTimeout(() => setVis(true), delay * 1000);
    return () => clearTimeout(t);
  }, [delay]);

  const isVisible = !isMounted || vis;

  return (
    <span style={{ display: "block", overflow: "hidden", paddingBottom: "0.1em" }}>
      <span
        style={{
          display: "block",
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(100%)",
          transition: isMounted
            ? "opacity 1.1s cubic-bezier(0.16,1,0.3,1), transform 1.1s cubic-bezier(0.16,1,0.3,1)"
            : "none",
        }}
      >
        {children}
      </span>
    </span>
  );
}
```

### Reveal (Scroll-triggered fade-up)

```tsx
"use client";
import { useState, useEffect, useRef, type ReactNode, type CSSProperties } from "react";

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}

export function Reveal({ children, delay = 0, className = "", style = {} }: RevealProps) {
  const [ref, inView] = useInView(0.08);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const isVisible = !isMounted || inView;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(28px)",
        transition: isMounted
          ? `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s`
          : "none",
      }}
    >
      {children}
    </div>
  );
}
```

### Dot (accent-farbiger Punkt)

```tsx
export function Dot({ className = "" }: { className?: string }) {
  return <span className={`text-[#0F766E] ${className}`}>.</span>;
}
```

---

## 4. Ecosystem Banner

**Datei:** `src/components/sections/homepage/EcosystemBanner.astro`

Dunkle Section (`bg-[#151416] text-white`) mit Two-Column-Grid:

```
grid grid-cols-1 md:grid-cols-[minmax(100px,240px)_1fr] gap-6 md:gap-12 lg:gap-15
```

**Links:** Sticky Label "Ökosystem" (uppercase, white/40)
**Rechts:**
1. H2: "Hi, ich bin Rico." (font-black, accent Dot)
2. Intro-Text (font-light, white/60, max-w-580px)
3. 2x2 Card Grid (`grid-cols-1 sm:grid-cols-2 gap-5`)

**4 Brand Cards:**

| Brand | Border Top | Accent | Logo-Style |
|-------|-----------|--------|------------|
| RL. | #FC2D01 | Orange | "RL" + orange Dot |
| unlearn.how | #a855f7 | Purple | Instrument Serif italic + purple ".how" |
| build.jetzt | #4A7AE5 | Blue | "build" + italic blue ".jetzt" |
| lernen.diy | #0F766E | Teal | "lernen" + italic teal ".diy" + "Du bist hier" Badge |

Card-Styling:
```
p-6 border-t-[3px] border-[ACCENT] bg-white/5 hover:bg-white/10 transition-colors
```

lernen.diy-Card ist **kein Link** (div statt a), hat `bg-accent/10` und ein Badge:
```
text-[11px] font-medium text-accent bg-accent/20 px-2.5 py-1 rounded-full
```

---

## 5. Newsletter Section

**Datei:** `src/components/sections/Newsletter.astro`

Dunkle Section (`bg-[#151416] text-white`), gleicher Two-Column-Grid wie Ecosystem.

**Props (mit Defaults):**
- `headline` = "Nichts verpassen"
- `text` = "Neue Artikel direkt ins Postfach. Kein Spam, keine Werbung. Etwa 2× im Monat."
- `label` = "Newsletter"

**Form:**
```
flex gap-3 flex-wrap
```
- Email Input: `flex-[1_1_240px] px-4 py-3.5 text-sm border border-white/20 bg-white/10 text-white placeholder-white/40`
- Button: `px-7 py-3.5 bg-[#0F766E] text-white text-[13px] font-medium hover:bg-white hover:text-[#151416]`

**API Endpoint:**
```
POST https://list.sevenx.cloud/api/public/subscription
Content-Type: application/json
Body: { email: "...", list_uuids: ["f36321e9-f304-48d0-8329-f0b248206dd0"] }
```

**States:**
- Loading: Button zeigt "…", disabled
- Success: Form versteckt, grüne Meldung "✓ Vielen Dank! Bitte bestätige deine E-Mail-Adresse."
- Error: Rote Meldung unter dem Form

**Disclaimer:** "Kein Tracking. Jederzeit abbestellbar." (`text-[11px] text-white/30`)

---

## 6. Footer

**Datei:** `src/components/Footer.astro`

Accent-Hintergrund (`bg-[#0F766E] text-white`).

**Grid:**
```
grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1fr_auto_auto_auto_auto] gap-12
```

**5 Spalten:**

1. **Brand** (max-w-320px):
   - Logo: `lernen` (white/70) `.diy` (italic, white) — Instrument Serif
   - Tagline: "KI lernen. Im eigenen Tempo. Praxisnah, verständlich, DIY."
   - Sub: "Ein Projekt von Rico Loschke." (white/60)

2. **Plattform:** Lessons, Kontakt
3. **Ökosystem:** loschke.ai, unlearn.how, build.jetzt (externe Links)
4. **Social:** LinkedIn, Instagram, YouTube (externe Links)
5. **Legal:** Impressum, Datenschutz, llms.txt

**Section Headers:** `text-xs sm:text-sm font-medium text-white/60 tracking-[0.08em] uppercase`
**Links:** `text-sm sm:text-base text-white/80 hover:text-white transition-colors`

**Copyright Bar:**
```
pt-8 border-t border-white/20 flex justify-between
```
Links: "© {year} Rico Loschke" (white/60)
Rechts: "Built with Astro & Claude" (white/40) — im Next.js Projekt anpassen

---

## Responsive Breakpoints

Tailwind defaults:
- `sm:` 640px
- `md:` 768px
- `lg:` 1024px

Standard Section Padding: `py-16 md:py-24 lg:py-[100px] px-6 sm:px-10 md:px-16 lg:px-20`

---

## Zusammenfassung: Was zu bauen ist

| # | Komponente | Typ | Animationen |
|---|-----------|-----|-------------|
| 1 | `FrameLayout` | Layout Wrapper | Nein |
| 2 | `BetaBanner` | Fixed Banner | Nein |
| 3 | `Hero` | Section | HeroLine (staggered slide-up) |
| 4 | `EcosystemBanner` | Section | Reveal (scroll fade-up) |
| 5 | `Newsletter` | Section + Form | Reveal + Form States |
| 6 | `Footer` | Section | Nein |
| 7 | `HeroLine` | UI Primitive | Timer-based slide-up |
| 8 | `Reveal` | UI Primitive | IntersectionObserver fade-up |
| 9 | `Dot` | UI Primitive | Nein (rein visuell) |

Alle React-Komponenten (HeroLine, Reveal, Dot) sind bereits als `"use client"` Next.js-kompatibel.
