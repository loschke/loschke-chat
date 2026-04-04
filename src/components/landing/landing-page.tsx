import {
  Globe,
  Server,
  Cloud,
  Mail,
  Wrench,
  Users,
  Brain,
  Shield,
  Layers,
  FormInput,
  ArrowRight,
  LogIn,
} from "lucide-react"
import { Reveal } from "./reveal"
import { Dot } from "./dot"
import { EcosystemBanner } from "./ecosystem-banner"

/* ─── Layout ─── */

const sectionPadding = "py-16 md:py-24 lg:py-[100px] px-6 sm:px-10 md:px-16 lg:px-20"

function SectionGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(100px,240px)_1fr] gap-6 md:gap-12 lg:gap-15">
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:sticky md:top-24 md:self-start">
      <p className="text-xs sm:text-sm font-medium text-white/40 tracking-[0.08em] uppercase">
        {children}
      </p>
    </div>
  )
}

/* ─── Main Component ─── */

export function LandingPage() {
  return (
    <div>
      {/* ═══ HERO ═══ */}
      <section className="pt-28 md:pt-36 lg:pt-40 pb-16 md:pb-24 lg:pb-[100px] px-6 sm:px-10 md:px-16 lg:px-20">
        <SectionGrid>
          <Reveal>
            <div className="hidden md:block">
              <span className="text-xs font-medium text-white/30 tracking-[0.08em] uppercase">
                KI-Plattform
              </span>
            </div>
          </Reveal>

          <div>
            <Reveal>
              <h1 className="font-black text-4xl sm:text-5xl md:text-[clamp(44px,6vw,80px)] leading-[0.92] tracking-[-0.03em] mb-5 md:mb-6 text-white">
                KI sollte sich anfühlen<br />wie ein <span className="text-primary">gutes Team</span><Dot />
              </h1>
            </Reveal>

            <Reveal delay={0.08}>
              <p className="font-serif text-lg sm:text-xl md:text-[clamp(18px,2.2vw,24px)] leading-[1.45] text-white/50 max-w-full md:max-w-[520px] mb-8 md:mb-10">
                Nicht wie ein Textfeld das auf Befehle wartet. Sondern wie ein
                Kollege der mitdenkt, die richtigen Werkzeuge greift und trotzdem
                fragt bevor er Entscheidungen trifft.
              </p>
            </Reveal>

            <Reveal delay={0.14}>
              <div className="flex flex-wrap gap-5 md:gap-6 items-center">
                <a
                  href="/api/auth/sign-in"
                  className="inline-flex items-center gap-2 bg-white text-[#151416] px-7 py-3.5 text-sm font-medium tracking-wide transition-colors duration-300 hover:bg-primary hover:text-white"
                >
                  <LogIn className="h-4 w-4" />
                  Login & Ausprobieren
                </a>
              </div>
            </Reveal>
          </div>
        </SectionGrid>
      </section>

      {/* ═══ KI-ARBEITSPLATZ ═══ */}
      <section className={`bg-[#1E1E20] ${sectionPadding}`}>
        <SectionGrid>
          <SectionLabel>KI-Arbeitsplatz</SectionLabel>

          <div>
            <Reveal>
              <h2 className="text-2xl sm:text-3xl md:text-[clamp(28px,4vw,48px)] font-black leading-[0.95] tracking-[-0.025em] mb-5 text-white">
                Du sagst was du brauchst<Dot />
              </h2>
            </Reveal>

            <Reveal delay={0.06}>
              <p className="text-base sm:text-lg font-light leading-[1.75] text-white/60 max-w-[580px] mb-12">
                Kein Prompt-Engineering, kein manuelles Orchestrieren. Die Plattform
                wählt das passende Modell, die richtigen Werkzeuge und das richtige
                Format.
              </p>
            </Reveal>

            {/* Use Cases — 2-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              {[
                {
                  q: "Recherchiere KI-Regulierung in der EU",
                  a: "Startet Deep Research über mehrere Quellen. Erstellt einen strukturierten Report mit Quellenverzeichnis als eigenständiges Dokument im Side-Panel.",
                },
                {
                  q: "Neueste Entwicklungen bei Anthropic?",
                  a: "Nutzt Google Search Grounding für tagesaktuelle Informationen. Zeigt Inline-Quellen im Antworttext, direkt verlinkt und nachprüfbar.",
                },
                {
                  q: "Erstell mir eine Landing Page für einen Workshop",
                  a: "Generiert ein production-ready HTML-Design mit Tailwind CSS. Live-Preview im Side-Panel. Du sagst was sich ändern soll und sie iteriert.",
                },
                {
                  q: "Headerbild für einen Artikel über Remote Work",
                  a: "Generiert Bildvarianten mit iterativer Galerie. Oder starte in der Design Library: 68 erprobte Prompt-Formeln mit Beispielbildern.",
                },
                {
                  q: "Schau dir die Website meines Kunden an",
                  a: "Ruft die Seite ab, analysiert Struktur und Messaging. Extrahiert Branding als Grundlage für Redesign-Entwürfe oder SEO-Analyse.",
                },
                {
                  q: "Gutes YouTube-Video zu dem Thema?",
                  a: "Durchsucht YouTube, zeigt Ergebnisse mit Thumbnails. Analysiert das gewählte Video multimodal und fasst die Kernaussagen zusammen.",
                },
              ].map((item, i) => (
                <Reveal key={i} delay={i * 0.04}>
                  <div className="bg-white/[0.04] p-6 h-full">
                    <p className="text-[15px] font-semibold text-white mb-3 leading-snug">
                      &ldquo;{item.q}&rdquo;
                    </p>
                    <p className="text-[15px] font-light leading-[1.7] text-white/50">
                      {item.a}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.1}>
              <p className="text-[15px] text-white/40 font-light leading-[1.7]">
                Die KI entscheidet autonom welche Tools sie nutzt. Aber sie
                entscheidet nicht über deine Daten, deine Ergebnisse oder deine
                Arbeitsrichtung. Diese Balance ist der Kern der Plattform.
              </p>
            </Reveal>
          </div>
        </SectionGrid>
      </section>

      {/* ═══ WARUM EINE EIGENE PLATTFORM ═══ */}
      <section id="warum" className={`bg-[#151416] ${sectionPadding}`}>
        <SectionGrid>
          <SectionLabel>Warum eine eigene Plattform</SectionLabel>

          <div>
            <Reveal>
              <h2 className="text-2xl sm:text-3xl md:text-[clamp(28px,4vw,48px)] font-black leading-[0.95] tracking-[-0.025em] mb-5 text-white">
                Das Beste aus zwei Welten<Dot />
              </h2>
            </Reveal>

            <Reveal delay={0.06}>
              <p className="text-base sm:text-lg font-light leading-[1.75] text-white/60 max-w-[580px] mb-12">
                Ich nutze Claude und Gemini täglich, beide als Pro-Account. Die
                Modelle sind hervorragend. Aber in der täglichen Praxis bin ich immer
                wieder auf Lücken gestoßen. Also habe ich angefangen, das Beste
                zusammenzuführen und mit dem zu ergänzen, was mir gefehlt hat.
              </p>
            </Reveal>

            {/* Features — 2-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
              {([
                {
                  icon: Wrench,
                  title: "21 Werkzeuge, ein Arbeitsplatz",
                  text: "Recherchieren, gestalten, schreiben und analysieren an einem Ort. Bildgenerierung mit Design Library, YouTube-Analyse, Google Search Grounding, UI-Design-Generierung. Die KI wählt autonom was sie braucht.",
                },
                {
                  icon: Users,
                  title: "Spezialisierte Experten",
                  text: "Ein Code-Assistent der präzise denkt. Ein Content Writer der nie in KI-Sprech verfällt. Ein Researcher der gründlich ist statt schnell. Jeder mit eigener Temperatur, eigenen Skills und eigenem Tool-Zugang.",
                },
                {
                  icon: FormInput,
                  title: "Geführte Eingaben",
                  text: "Die Hürde ist nicht die KI, sondern das Prompting. Quicktasks lösen das: Formular ausfüllen, absenden, qualitätsgesichertes Ergebnis. Wiederholbar, konsistent, und jeder im Team kann sie nutzen.",
                },
                {
                  icon: Layers,
                  title: "Flexibles Output-System",
                  text: "Artifacts sind eigenständige Outputs im Side-Panel: HTML mit Live-Preview, Code, Bilder, Audio, UI-Designs, Office-Dokumente. Editierbar, versioniert, downloadbar. Chat ist Prozess, Artifact ist Ergebnis.",
                },
                {
                  icon: Shield,
                  title: "Eingebauter Datenschutz",
                  text: "Automatische Prüfung auf sensible Daten: E-Mail-Adressen, IBANs, Steuer-IDs, Telefonnummern. Bei einem Fund entscheidet der Nutzer: Maskieren, EU-Modell oder lokal verarbeiten.",
                  accent: true,
                },
                {
                  icon: Brain,
                  title: "Kontext der mitwächst",
                  text: "Persistentes Memory über Sessions hinweg, kombiniert mit Projekt-Kontext und Custom Instructions. Die KI erinnert sich, kennt die laufenden Projekte und respektiert individuelle Präferenzen.",
                },
              ] as const).map((item, i) => (
                <Reveal key={i} delay={i * 0.05}>
                  <div className={`p-6 h-full ${item.accent ? "bg-primary/[0.08] border-l-2 border-primary" : "bg-white/[0.04]"}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <item.icon className="h-5 w-5 text-primary flex-shrink-0" />
                      <h3 className="text-[17px] font-bold text-white">{item.title}</h3>
                    </div>
                    <p className="text-[15px] font-light leading-[1.7] text-white/55">
                      {item.text}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* Persönliche Motivation */}
            <Reveal delay={0.1}>
              <div className="bg-white/[0.04] p-6 lg:p-8">
                <p className="text-[15px] leading-[1.7] mb-3">
                  <span className="font-semibold text-primary">
                    Warum ich das selbst baue:
                  </span>{" "}
                  <span className="text-white/55 font-light">
                    Als KI-Berater muss ich verstehen wie agentische Systeme
                    funktionieren. Nicht aus Blogposts, sondern aus eigener
                    Entwicklung. Welche Probleme bei Tool-Orchestrierung auftreten,
                    wo Prompt-Architektur an Grenzen stößt. Das lernt man nur wenn
                    man es baut.
                  </span>
                </p>
                <p className="text-[15px] text-white/55 font-light leading-[1.7]">
                  Gleichzeitig sehe ich bei Unternehmen die ich berate eine Lücke:
                  Viele haben noch keine KI-Infrastruktur und brauchen etwas
                  Konfigurierbares für den Einstieg oder die Zeit der Begleitung.
                  Diese Plattform kann genau diese Lücke füllen.
                </p>
              </div>
            </Reveal>
          </div>
        </SectionGrid>
      </section>

      {/* ═══ DEPLOYMENT ═══ */}
      <section className={`bg-[#1E1E20] ${sectionPadding}`}>
        <SectionGrid>
          <SectionLabel>Deployment</SectionLabel>

          <div>
            <Reveal>
              <h2 className="text-2xl sm:text-3xl md:text-[clamp(28px,4vw,48px)] font-black leading-[0.95] tracking-[-0.025em] mb-5 text-white">
                Drei Wege, volle Kontrolle<Dot />
              </h2>
            </Reveal>

            <Reveal delay={0.06}>
              <p className="text-base sm:text-lg font-light leading-[1.75] text-white/60 max-w-[580px] mb-12">
                Die Plattform läuft dort wo sie soll. In der Cloud, in der EU oder
                auf eurer eigenen Hardware. Gleiche Codebase, unterschiedlicher
                Feature-Umfang.
              </p>
            </Reveal>

            {/* Deployment options */}
            <Reveal delay={0.1}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                <div className="bg-white/[0.04] p-6">
                  <Cloud className="h-5 w-5 text-primary mb-4" />
                  <h3 className="text-lg font-bold text-white mb-1">Cloud</h3>
                  <p className="text-xs font-medium text-primary mb-4">Voller Funktionsumfang</p>
                  <p className="text-[15px] font-light text-white/55 leading-[1.7] mb-5">
                    Managed Services, automatische Skalierung. Schnellster Weg zum
                    Start. Alle 21 Tools verfügbar.
                  </p>
                  <ul className="space-y-2 text-sm font-light text-white/50">
                    <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Setup in Minuten</li>
                    <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Kein DevOps nötig</li>
                    <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Deep Research, Bilder, YouTube, TTS</li>
                  </ul>
                </div>

                <div className="bg-primary/[0.08] border-t-2 border-primary p-6">
                  <Globe className="h-5 w-5 text-primary mb-4" />
                  <h3 className="text-lg font-bold text-white mb-1">EU-Only</h3>
                  <p className="text-xs font-medium text-primary mb-4">Kein US-Datenfluss</p>
                  <p className="text-[15px] font-light text-white/55 leading-[1.7] mb-5">
                    Europäische LLM-Provider, DSGVO von Anfang an. Einige Features
                    eingeschränkt.
                  </p>
                  <ul className="space-y-2 text-sm font-light text-white/50">
                    <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> EU-Modelle (Mistral, IONOS)</li>
                    <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> PII-Erkennung + Consent-Logging</li>
                    <li className="flex gap-2"><span className="text-white/25">&mdash;</span> <span className="text-white/35">Kein Grounding, kein Gemini</span></li>
                  </ul>
                </div>

                <div className="bg-white/[0.04] p-6">
                  <Server className="h-5 w-5 text-primary mb-4" />
                  <h3 className="text-lg font-bold text-white mb-1">Self-Hosted</h3>
                  <p className="text-xs font-medium text-primary mb-4">Maximale Datensouveränität</p>
                  <p className="text-[15px] font-light text-white/55 leading-[1.7] mb-5">
                    Alles auf eurer Infrastruktur. Chat, Experten, Skills, Projekte
                    komplett lokal.
                  </p>
                  <ul className="space-y-2 text-sm font-light text-white/50">
                    <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Docker Compose, Ollama</li>
                    <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Air-Gapped möglich</li>
                    <li className="flex gap-2"><span className="text-white/25">&mdash;</span> <span className="text-white/35">Keine externen APIs</span></li>
                  </ul>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <h3 className="text-xl font-black tracking-tight mb-5 text-white">
                Eine Codebase, beliebig viele Instanzen<Dot />
              </h3>
              <p className="text-[15px] font-light text-white/55 leading-[1.7] mb-8 max-w-[580px]">
                Jede Instanz hat eigenes Branding, eigene Domain, eigene Features
                und eigene Datenbank. 21 Feature-Flags steuern granular was aktiv
                ist. Neue Instanz = neues Deployment mit eigenen
                Environment-Variablen. Kein Fork, kein Branch.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { title: "White-Label", text: "Eigene Farben, eigene Domain, eigenes Logo. Die Plattform sieht aus wie euer Produkt." },
                  { title: "Feature-Konfiguration", text: "21 Flags steuern welche Tools, Provider und UI-Elemente aktiv sind. Per Environment-Variable." },
                  { title: "Admin-Verwaltung", text: "Skills, Experts, Modelle, Credits und User. Alles über eine Admin-UI steuerbar. Kein Code nötig." },
                ].map((item, i) => (
                  <Reveal key={i} delay={i * 0.06}>
                    <div className="bg-white/[0.04] p-5">
                      <h4 className="text-[15px] font-bold text-white mb-2">{item.title}</h4>
                      <p className="text-sm font-light text-white/50 leading-[1.7]">{item.text}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </Reveal>
          </div>
        </SectionGrid>
      </section>

      {/* ═══ WAS HEUTE FUNKTIONIERT ═══ */}
      <section className={`bg-[#151416] ${sectionPadding}`}>
        <SectionGrid>
          <SectionLabel>Status</SectionLabel>

          <div>
            <Reveal>
              <h2 className="text-2xl sm:text-3xl md:text-[clamp(28px,4vw,48px)] font-black leading-[0.95] tracking-[-0.025em] mb-5 text-white">
                Was heute funktioniert<Dot />
              </h2>
            </Reveal>

            <Reveal delay={0.06}>
              <p className="text-base sm:text-lg font-light leading-[1.75] text-white/60 max-w-[580px] mb-12">
                Keine Roadmap-Versprechen. Alles implementiert, deployed, im Einsatz.
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white/[0.04] p-6">
                  <h3 className="text-[15px] font-bold text-white mb-5">Chat und Kontext</h3>
                  <ul className="space-y-3 text-[15px] font-light text-white/55">
                    <li>Streaming-Chat mit Persistenz</li>
                    <li>7 spezialisierte KI-Experten</li>
                    <li>Quicktask-Formulare</li>
                    <li>On-demand Skill-Loading</li>
                    <li>Persistentes Memory</li>
                    <li>Projekt-Kontext und Dokumente</li>
                    <li>Custom Instructions</li>
                  </ul>
                </div>
                <div className="bg-white/[0.04] p-6">
                  <h3 className="text-[15px] font-bold text-white mb-5">Werkzeuge und Outputs</h3>
                  <ul className="space-y-3 text-[15px] font-light text-white/55">
                    <li>Deep Research mit Quellen</li>
                    <li>Google Search Grounding</li>
                    <li>Websuche (5 Provider)</li>
                    <li>Bildgenerierung + Design Library</li>
                    <li>UI-Design-Generierung</li>
                    <li>YouTube-Suche und Analyse</li>
                    <li>Text-to-Speech (8 Stimmen)</li>
                    <li>Office-Dokumente (PPTX, XLSX, DOCX, PDF)</li>
                  </ul>
                </div>
                <div className="bg-white/[0.04] p-6">
                  <h3 className="text-[15px] font-bold text-white mb-5">Plattform</h3>
                  <ul className="space-y-3 text-[15px] font-light text-white/55">
                    <li>Collaboration und Chat-Sharing</li>
                    <li>User Workspace mit KI-Wizard</li>
                    <li>Credit-System mit Audit-Log</li>
                    <li>PII-Erkennung + Maskierung</li>
                    <li>EU- und Self-Hosted Deployment</li>
                    <li>Multi-Instanz mit Branding</li>
                    <li>21 Feature-Flags</li>
                    <li>Admin-UI für alles</li>
                    <li>MCP für externe Tools</li>
                  </ul>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                {[
                  "Next.js 16",
                  "TypeScript Strict",
                  "Tailwind CSS v4",
                  "Vercel AI SDK",
                  "Neon Postgres",
                  "Drizzle ORM",
                  "Logto Auth",
                  "S3 Storage",
                  "Mem0",
                ].map((tech) => (
                  <span key={tech} className="text-sm text-white/25">{tech}</span>
                ))}
              </div>
            </Reveal>
          </div>
        </SectionGrid>
      </section>

      {/* ═══ ECOSYSTEM ═══ */}
      <EcosystemBanner />

      {/* ═══ CTA ═══ */}
      <section className={`bg-[#1E1E20] ${sectionPadding}`}>
        <SectionGrid>
          <SectionLabel>Loslegen</SectionLabel>

          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Reveal>
                <div className="bg-white/[0.04] p-6 lg:p-8 h-full">
                  <h2 className="text-xl font-black text-white mb-3">Ausprobieren</h2>
                  <p className="text-[15px] font-light text-white/55 leading-[1.7] mb-6">
                    Registriere dich und probier die Plattform aus. Nach der
                    Registrierung schaltet ein Admin deinen Zugang frei.
                  </p>
                  <div className="flex flex-col gap-4">
                    <a
                      href="/api/auth/sign-in"
                      className="inline-flex items-center justify-center gap-2 bg-white text-[#151416] px-6 py-3.5 text-sm font-medium transition-colors duration-300 hover:bg-primary hover:text-white w-fit"
                    >
                      <ArrowRight className="h-4 w-4" />
                      Jetzt registrieren
                    </a>
                    <a
                      href="mailto:hallo@loschke.ai"
                      className="inline-flex items-center gap-2 text-[15px] text-white/40 hover:text-white transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      Fragen? hallo@loschke.ai
                    </a>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.08}>
                <div className="bg-primary/[0.08] border-l-2 border-primary p-6 lg:p-8 h-full">
                  <h2 className="text-xl font-black text-white mb-3">Mitbauen</h2>
                  <p className="text-[15px] font-light text-white/55 leading-[1.7] mb-6">
                    Bisher ein Solo-Projekt. Die Technologie steht, aber es braucht
                    mehr als eine Person. Entwickler, Designer, Product-Leute. Wenn
                    dich das Problem interessiert und du mitgestalten willst, lass
                    uns reden.
                  </p>
                  <a
                    href="mailto:hallo@loschke.ai"
                    className="inline-flex items-center gap-2 text-[15px] font-medium text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    hallo@loschke.ai
                  </a>
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.12}>
              <p className="mt-12 text-sm text-white/30">
                Rico Loschke — AI Transformation Consultant, Dresden
              </p>
            </Reveal>
          </div>
        </SectionGrid>
      </section>
    </div>
  )
}
