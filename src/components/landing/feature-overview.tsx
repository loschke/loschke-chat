import {
  MessageSquare,
  Layers,
  Brain,
  ShieldCheck,
} from "lucide-react"

/* ─── Layout Primitives ─── */

function Section({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`border-t border-border px-6 py-10 sm:px-8 ${className}`}>
      {children}
    </section>
  )
}

function SectionHead({
  title,
  hint,
  lead,
}: {
  title: string
  hint?: string
  lead?: string
}) {
  return (
    <div className="mb-6">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-[0.95rem] font-medium tracking-tight">{title}</h3>
        {hint && (
          <span className="text-[0.78rem] text-muted-foreground">{hint}</span>
        )}
      </div>
      {lead && (
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {lead}
        </p>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   DATA — Features & Benefits (oben)
   ═══════════════════════════════════════════ */

const featureQuadrants = [
  {
    icon: MessageSquare,
    label: "Chatten",
    desc: "Spezialisierte Experten, formularbasierte Workflows, interaktive Rückfragen und Varianten-Vergleich.",
    items: [
      "KI-Experten (erweiterbar)",
      "Freies Chatten",
      "Quicktask-Formulare",
      "Strukturierte Rückfragen",
      "Varianten-Vergleich",
      "Session-Wrapup",
    ],
  },
  {
    icon: Layers,
    label: "Erstellen",
    desc: "Eigenständige Outputs im Side-Panel. Editierbar, downloadbar, versioniert.",
    items: [
      "Dokumente",
      "HTML-Seiten",
      "Code",
      "Quizzes",
      "Reviews",
      "Bilder",
    ],
  },
  {
    icon: Brain,
    label: "Wissen",
    desc: "Die KI lernt dazu, durchsucht das Web, lädt Skills nach und kennt den Projekt-Kontext.",
    items: [
      "KI merkt sich Dinge",
      "Websuche im Chat",
      "URL-Abruf",
      "On-demand Skills",
      "Projekt-Kontext",
      "Custom Instructions",
    ],
  },
  {
    icon: ShieldCheck,
    label: "Schützen",
    desc: "Abgestufter Datenschutz pro Nachricht. PII-Erkennung, Maskierung, EU-Routing.",
    items: [
      "PII-Erkennung",
      "Automatische Maskierung",
      "EU-Modell-Routing",
      "Lokale Verarbeitung",
      "Consent-Logging",
      "DSGVO-Export",
    ],
  },
]

const experts = [
  {
    name: "Allgemein",
    strength: "Vielseitig, passt sich an",
    example: "Erkläre mir … / Hilf mir bei …",
  },
  {
    name: "Code-Assistent",
    strength: "Präzise, strukturiert",
    example: "Schreib eine Funktion die … / Review diesen Code",
  },
  {
    name: "SEO-Berater",
    strength: "Datengetrieben, priorisiert",
    example: "Analysiere die SEO meiner Seite",
  },
  {
    name: "Daten-Analyst",
    strength: "Quantifiziert, visualisiert",
    example: "Werte diese Zahlen aus / Erstelle ein Dashboard",
  },
  {
    name: "Researcher",
    strength: "Gründlich, quellenbasiert",
    example: "Recherchiere den Markt für …",
  },
  {
    name: "Content Writer",
    strength: "Kreativ, kein KI-Sprech",
    example: "Schreib einen Blogpost über …",
  },
  {
    name: "Visual Designer",
    strength: "Bildkonzeption, Iteration",
    example: "Erstelle ein Headerbild für …",
  },
]

const artifacts = [
  {
    type: "Dokument",
    output: "Formatierter Text mit Überschriften, Listen, Tabellen",
    actions: "Kopieren · Download · Bearbeiten · Drucken",
  },
  {
    type: "HTML",
    output: "Interaktive Webseite mit Live-Preview",
    actions: "Kopieren · Download · Bearbeiten · Drucken",
  },
  {
    type: "Code",
    output: "Syntax-gehighlighteter Code (Python, JS, TS, …)",
    actions: "Kopieren · Download · Bearbeiten",
  },
  {
    type: "Quiz",
    output: "Interaktiver Wissenstest mit Auswertung",
    actions: "Beantworten · Feedback",
  },
  {
    type: "Review",
    output: "Abschnittsweise Durchsicht mit Bewertung",
    actions: "Passt / Ändern / Frage / Raus",
  },
  {
    type: "Bild",
    output: "Generiert via Gemini, Variations-Galerie",
    actions: "Iterieren · Kombinieren · Download",
  },
]

const smartBehaviors = [
  {
    situation: "User fragt nach aktuellen Infos",
    reaction: "Startet Websuche automatisch",
  },
  {
    situation: "User teilt eine URL",
    reaction: "Liest den Inhalt automatisch",
  },
  {
    situation: "User will ein Dokument",
    reaction: "Erstellt Artifact im Side-Panel",
  },
  {
    situation: "User will Feedback zu einem Konzept",
    reaction: "Erstellt Review mit Abschnitts-Bewertung",
  },
  {
    situation: "KI braucht Klärung",
    reaction: "Zeigt strukturierte Rückfrage (Auswahl-Widget)",
  },
  {
    situation: "User sagt \u201Emerk dir das\u201C",
    reaction: "Merkt sich das für künftige Gespräche",
  },
]

const valueProps = [
  {
    title: "Kein Prompt-Engineering nötig",
    desc: "Expert wählen oder Quicktask-Formular ausfüllen. Die Plattform kümmert sich um den Rest.",
  },
  {
    title: "Die KI vergisst nichts",
    desc: "Memory-System erinnert sich an relevante Informationen aus früheren Gesprächen. Automatisch.",
  },
  {
    title: "Ergebnisse statt Textwände",
    desc: "Dokumente, Code, HTML, Bilder und Quizzes als eigenständige Outputs im Side-Panel. Editierbar, downloadbar, druckbar.",
  },
  {
    title: "Iteration statt Alles-Nochmal",
    desc: "Review-Modus für abschnittsweises Feedback. Varianten-Ansicht für Vergleich. Bild-Galerie für visuelles Iterieren.",
  },
  {
    title: "Datenschutz eingebaut",
    desc: "PII-Erkennung, Maskierung, EU-Routing oder lokale Verarbeitung. Der Nutzer entscheidet pro Nachricht.",
  },
  {
    title: "Smarte Abkürzungen",
    desc: "Skills liefern intuitiv das richtige Wissen zur richtigen Zeit. Quicktasks bieten einen strukturierten Einstieg ohne Prompting.",
  },
]

const privacySteps = [
  {
    num: "01",
    label: "Erkennen",
    title: "PII-Prüfung vor dem Senden",
    desc: "Automatische Erkennung sensibler Daten: E-Mails, IBANs, Telefonnummern, Steuer-IDs, IP-Adressen.",
  },
  {
    num: "02",
    label: "Entscheiden",
    title: "5 Optionen pro Nachricht",
    desc: "Bearbeiten, maskiert senden, EU-Modell nutzen, lokal verarbeiten oder bewusst trotzdem senden.",
  },
  {
    num: "03",
    label: "Protokollieren",
    title: "Audit-Trail",
    desc: "Jede Entscheidung im Consent-Log. DSGVO-konformer Export. Separater Dialog für Datei-Uploads.",
  },
]

/* ═══════════════════════════════════════════
   DATA — Technik & Infrastruktur (unten)
   ═══════════════════════════════════════════ */

const modelCategories = [
  {
    useCase: "Allrounder",
    desc: "Täglicher Chat, Texte, Zusammenfassungen. Gute Balance aus Qualität und Geschwindigkeit.",
    providers: "Anthropic, Mistral (EU)",
  },
  {
    useCase: "Tiefgang",
    desc: "Komplexe Analysen, lange Dokumente, anspruchsvolle Aufgaben. Höchste Qualität, braucht mehr Zeit.",
    providers: "Anthropic, Google",
  },
  {
    useCase: "Schnell & günstig",
    desc: "Einfache Fragen, kurze Aufgaben, hoher Durchsatz. Ideal für Quicktasks.",
    providers: "Anthropic, Google, OpenAI",
  },
  {
    useCase: "Code & Reasoning",
    desc: "Schreiben, debuggen, reviewen. Niedrige Temperatur, strukturierte Ausgabe.",
    providers: "Anthropic, Google",
  },
  {
    useCase: "Bildgenerierung",
    desc: "Bilder erstellen, bearbeiten, kombinieren. Nativ im Chat, keine externen Tools.",
    providers: "Google",
  },
  {
    useCase: "EU / DSGVO",
    desc: "Daten bleiben in der EU. Für den Business Mode oder wenn Datensouveränität zählt.",
    providers: "Mistral, Lokal (Self-hosted)",
  },
]

const deploymentOptions = [
  {
    mode: "Cloud (SaaS)",
    desc: "Vercel + Managed Services. Schnellster Start, automatische Updates. Alle Features verfuegbar.",
    stack: "Vercel, Neon, R2, AI Gateway",
    dataFlow: "US/EU (je nach Provider)",
  },
  {
    mode: "EU-Only",
    desc: "Alle Daten in der EU. Mistral (Paris) oder IONOS (Frankfurt) als KI-Provider. Kein US-Datenfluss im Kern.",
    stack: "Docker, PostgreSQL, MinIO, Mistral/IONOS",
    dataFlow: "EU (Paris/Frankfurt)",
  },
  {
    mode: "Self-Hosted",
    desc: "Komplett im eigenen Netzwerk. Ollama fuer lokale Modelle. Kein Internet noetig fuer den Kernbetrieb.",
    stack: "Docker Compose, Ollama, MinIO, SearXNG",
    dataFlow: "Lokal (kein ext. Datenfluss)",
  },
]

const deploymentRows = [
  {
    label: "Instanzen",
    content:
      "Eine Codebasis, separate Deployments pro Instanz. Eigene DB, Auth, Branding, Feature-Flags.",
  },
  {
    label: "Auth",
    content: "Logto (OIDC). E-Mail OTP, Social Login oder SSO konfigurierbar. Self-Hosting moeglich.",
  },
  {
    label: "Datenbank",
    content: "PostgreSQL (Neon Serverless oder Self-Hosted). EU-Region verfuegbar.",
  },
  {
    label: "Storage",
    content: "S3-kompatibel: Cloudflare R2, MinIO oder AWS S3. Optional.",
  },
  {
    label: "LLM Routing",
    content:
      "Vercel AI Gateway (SaaS), Direct Provider SDKs (EU/Local) oder LiteLLM Proxy (Self-Hosted).",
  },
  {
    label: "Features",
    content:
      "Alles opt-in via ENV. Credits, Business Mode, Memory, Websuche, Bildgenerierung, MCP — einzeln aktivierbar.",
  },
  {
    label: "Admin",
    content:
      "Admin-UI fuer Experts, Skills, Models, MCP-Server, Credits. Datenfluss-Uebersicht pro Feature.",
  },
]

const promptLayers = [
  "Expert-Persona",
  "Artifact-Instruktionen",
  "Web-Tools",
  "MCP-Tools",
  "Skills-Übersicht",
  "Memory-Kontext",
  "Projekt-Instruktionen",
  "Custom Instructions",
]

const techStack = [
  "Next.js 16",
  "TypeScript",
  "Tailwind v4",
  "shadcn/ui",
  "Vercel AI SDK",
  "Vercel AI Gateway",
  "Neon Postgres",
  "Drizzle ORM",
  "Logto Auth",
  "Cloudflare R2",
  "Mem0",
  "Firecrawl",
  "MCP",
  "CodeMirror",
]

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */

export function FeatureOverview() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* ── Intro ── */}
      <div className="max-w-2xl px-6 pb-10 pt-12 sm:px-8">
        <h2 className="mb-3 text-xl font-medium tracking-tight sm:text-2xl">
          KI-Chat-Plattform mit Experten-System
        </h2>
        <p className="text-[0.9rem] leading-relaxed text-muted-foreground">
          Nicht noch ein ChatGPT-Wrapper. Eine konfigurierbare Infrastruktur mit
          spezialisierten Experten, automatischem Kontext, Generative UI und
          eingebautem Datenschutz. Eine Codebasis, beliebig viele Instanzen.
        </p>

        {/* Beta CTA */}
        <div className="mt-6 rounded-md border border-primary/20 bg-primary/5 px-5 py-4">
          <p className="text-sm font-medium">
            Aktuell in geschlossener Beta. Zugang nur auf Einladung.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Interesse? Schreib an{" "}
            <a
              href="mailto:hallo@loschke.ai"
              className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
            >
              hallo@loschke.ai
            </a>
          </p>
        </div>
      </div>

      {/* ── Feature-Quadranten ── */}
      <Section>
        <SectionHead title="Was drin ist" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {featureQuadrants.map((q) => {
            const Icon = q.icon
            return (
              <div
                key={q.label}
                className="rounded-md border border-border p-6 transition-colors hover:border-primary/30"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <h4 className="text-sm font-medium">{q.label}</h4>
                </div>
                <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                  {q.desc}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {q.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-sm bg-muted px-2 py-0.5 text-[0.65rem] text-muted-foreground"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* ── Kern-Versprechen ── */}
      <Section>
        <SectionHead title="Warum das besser ist" />
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {valueProps.map((v) => (
            <div key={v.title} className="bg-background p-5">
              <h4 className="mb-1.5 text-[0.82rem] font-medium">{v.title}</h4>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {v.desc}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Experten ── */}
      <Section>
        <SectionHead
          title="Experten-System"
          lead="Spezialisierte KI-Experten mit eigener Persönlichkeit, Temperatur und Tool-Zugang. Per Admin-UI beliebig erweiterbar. Der Nutzer wählt den Expert. Der Rest konfiguriert sich selbst."
        />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[0.82rem]">
            <thead>
              <tr>
                {["Expert", "Stärke", "Typische Aufgabe"].map((h) => (
                  <th
                    key={h}
                    className="border-b-2 border-border px-4 py-2 text-left font-mono text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {experts.map((e) => (
                <tr
                  key={e.name}
                  className="border-b border-border/50 last:border-b-0"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium">
                    {e.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {e.strength}
                  </td>
                  <td className="px-4 py-3 text-xs italic text-muted-foreground">
                    „{e.example}"
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Beispiele aus der Standardkonfiguration. Eigene Experten sind per Admin-UI frei konfigurierbar.
        </p>
      </Section>

      {/* ── Artifact-System ── */}
      <Section>
        <SectionHead
          title="Ergebnisse statt Textwände"
          lead="Die KI erstellt eigenständige Outputs als Artifacts im Side-Panel neben dem Chat. Editierbar, downloadbar, versioniert."
        />
        <div className="overflow-x-auto">
          <table className="w-full overflow-hidden rounded-md border border-border text-[0.82rem]">
            <thead>
              <tr>
                {["Typ", "Was du bekommst", "Aktionen"].map((h) => (
                  <th
                    key={h}
                    className="border-b border-border bg-muted/50 px-4 py-2 text-left font-mono text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {artifacts.map((a) => (
                <tr
                  key={a.type}
                  className="border-b border-border/50 last:border-b-0"
                >
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-xs font-medium">
                    {a.type}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {a.output}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {a.actions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Intelligentes Verhalten ── */}
      <Section>
        <SectionHead
          title="Die KI denkt mit"
          lead="Kein manuelles Steuern nötig. Die Plattform erkennt automatisch, was gebraucht wird."
        />
        <div className="grid grid-cols-1 overflow-hidden rounded-md border border-border text-sm md:grid-cols-[1fr_1fr]">
          {smartBehaviors.map((b, i) => (
            <div key={b.situation} className="contents">
              <div
                className={`bg-muted/50 px-4 py-3 text-[0.8rem] ${
                  i < smartBehaviors.length - 1
                    ? "border-b border-border/50"
                    : ""
                }`}
              >
                {b.situation}
              </div>
              <div
                className={`px-4 py-3 font-medium text-foreground/80 ${
                  i < smartBehaviors.length - 1
                    ? "border-b border-border/50"
                    : ""
                }`}
              >
                {b.reaction}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Datenschutz ── */}
      <Section>
        <SectionHead
          title="Datenschutz (Business Mode)"
          lead="Abgestuft, nicht binär. Der Nutzer entscheidet pro Nachricht, wie mit sensiblen Daten umgegangen wird."
        />
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-3">
          {privacySteps.map((step) => (
            <div key={step.num} className="bg-background p-5">
              <div className="mb-2 font-mono text-[0.65rem] text-muted-foreground/60">
                {step.num} {step.label}
              </div>
              <h4 className="mb-1.5 text-[0.82rem] font-medium">
                {step.title}
              </h4>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══════════════════════════════════════
         TEIL 2 — Technik & Infrastruktur
         ═══════════════════════════════════════ */}

      <div className="border-t-2 border-border px-6 pb-2 pt-10 sm:px-8">
        <p className="micro-label flex items-center gap-2">
          <span className="inline-block size-1.5 rounded-full bg-primary" />
          Unter der Haube
        </p>
      </div>

      {/* ── Modelle nach Einsatzzweck ── */}
      <Section>
        <SectionHead
          title="Modelle"
          lead="Mehrere KI-Anbieter, automatisch das passende Modell je nach Aufgabe. Anthropic, Google, OpenAI, Mistral und lokale Modelle verfügbar."
        />
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {modelCategories.map((c) => (
            <div key={c.useCase} className="bg-background p-5">
              <h4 className="mb-1.5 text-[0.82rem] font-medium">
                {c.useCase}
              </h4>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {c.desc}
              </p>
              <p className="mt-2 font-mono text-[0.65rem] text-muted-foreground/60">
                {c.providers}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── EU/Local Deployment ── */}
      <Section>
        <SectionHead
          title="Dein Betrieb. Deine Regeln."
          lead="Eine Codebasis, drei Deployment-Optionen. Von Cloud bis komplett lokal — ohne Abstriche bei Features."
        />
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-3">
          {deploymentOptions.map((opt) => (
            <div key={opt.mode} className="bg-background p-5">
              <h4 className="mb-1.5 text-[0.82rem] font-medium">
                {opt.mode}
              </h4>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {opt.desc}
              </p>
              <div className="mt-3 space-y-1">
                <p className="font-mono text-[0.65rem] text-muted-foreground/60">
                  {opt.stack}
                </p>
                <p className="font-mono text-[0.65rem] text-primary/70">
                  {opt.dataFlow}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Premium-Features wie Bildgenerierung oder Tiefenrecherche koennen auch im EU/Local-Betrieb
          optional zugeschaltet werden. Admin-Dashboard zeigt transparent, welche Daten wohin fliessen.
        </p>
      </Section>

      {/* ── Kontext-Assembly ── */}
      <Section>
        <SectionHead
          title="System-Prompt Assembly"
          lead="Bei jeder Nachricht baut das System einen 8-Layer-Kontext auf. Parallel geladen, in unter 200ms zusammengesetzt."
        />
        <div className="rounded-md border border-border bg-muted/50 px-5 py-4 font-mono text-[0.72rem] leading-8 text-muted-foreground">
          {promptLayers.map((layer, i) => (
            <span key={layer}>
              <span className="text-foreground/70">{layer}</span>
              {i < promptLayers.length - 1 && (
                <span className="mx-1 text-muted-foreground/50">→</span>
              )}
            </span>
          ))}
        </div>
      </Section>

      {/* ── Deployment ── */}
      <Section>
        <SectionHead
          title="Deployment & Konfiguration"
          hint="Multi-Instanz über ENV und Feature-Flags"
        />
        <div className="grid grid-cols-1 overflow-hidden rounded-md border border-border text-sm md:grid-cols-[140px_1fr]">
          {deploymentRows.map((row, i) => (
            <div key={row.label} className="contents">
              <div
                className={`bg-muted/50 px-4 py-3 text-[0.78rem] font-medium max-md:pb-0 ${
                  i < deploymentRows.length - 1
                    ? "border-b border-border/50 max-md:border-b-0"
                    : ""
                }`}
              >
                {row.label}
              </div>
              <div
                className={`px-4 py-3 leading-relaxed text-muted-foreground ${
                  i < deploymentRows.length - 1
                    ? "border-b border-border/50"
                    : ""
                }`}
              >
                {row.content}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Tech Stack ── */}
      <Section>
        <SectionHead title="Tech Stack" />
        <div className="flex flex-wrap gap-1.5">
          {techStack.map((t) => (
            <span
              key={t}
              className="rounded-sm bg-muted px-2.5 py-1 font-mono text-[0.65rem] text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      </Section>
    </div>
  )
}
