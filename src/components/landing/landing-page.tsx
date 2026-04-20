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
import { BuilderSection } from "./builder-section"
import { ScreenshotGrid } from "./screenshot-grid"

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

            <Reveal delay={0.2}>
              <div className="mt-12 md:mt-16 lg:mt-20 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/screenshots/build-jetzt-app_home-screen.png"
                  alt="build.jetzt Startbildschirm: Begrüßung, Quicktasks und Chat-Input im Fokus"
                  width={1440}
                  height={900}
                  loading="eager"
                  className="block w-full h-auto"
                />
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
                Du musst kein Profi im Formulieren sein und nichts manuell
                zusammenführen. Die Plattform wählt das passende Modell, die
                richtigen Werkzeuge und das richtige Format.
              </p>
            </Reveal>

            {/* Use Cases — 2-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              {[
                {
                  q: "Recherchiere KI-Regulierung in der EU",
                  a: "Startet eine tiefe Recherche über mehrere Quellen. Erstellt einen strukturierten Bericht mit Quellenverzeichnis als eigenständiges Dokument im Seitenfenster.",
                },
                {
                  q: "Neueste Entwicklungen bei Anthropic?",
                  a: "Greift auf die Google-Suche zu für tagesaktuelle Informationen. Zeigt die Quellen direkt im Text, verlinkt und nachprüfbar.",
                },
                {
                  q: "Erstell mir eine Landing Page für einen Workshop",
                  a: "Erstellt ein einsatzfertiges HTML-Design mit Tailwind CSS. Live-Vorschau im Seitenfenster. Du sagst was sich ändern soll und sie macht weiter.",
                },
                {
                  q: "Headerbild für einen Artikel über Remote Work",
                  a: "Erstellt mehrere Bildvarianten in einer Galerie. Oder starte in der Design Library: 68 erprobte Bildvorlagen mit Beispielen.",
                },
                {
                  q: "Schau dir die Website meines Kunden an",
                  a: "Ruft die Seite ab, analysiert Struktur und Kernbotschaften. Übernimmt das Erscheinungsbild als Grundlage für neue Entwürfe oder SEO-Analyse.",
                },
                {
                  q: "Gutes YouTube-Video zu dem Thema?",
                  a: "Durchsucht YouTube, zeigt Ergebnisse mit Vorschaubildern. Analysiert Bild und Ton des gewählten Videos und fasst die Kernaussagen zusammen.",
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
                Die KI entscheidet selbstständig welche Werkzeuge sie nutzt. Aber
                sie entscheidet nicht über deine Daten, deine Ergebnisse oder deine
                Arbeitsrichtung. Dieses Gleichgewicht ist der Kern der Plattform.
              </p>
            </Reveal>
          </div>
        </SectionGrid>
      </section>

      {/* ═══ AGENTISCHER BEGLEITER ═══ */}
      <section id="warum" className={`bg-[#151416] ${sectionPadding}`}>
        <SectionGrid>
          <SectionLabel>Agentischer Begleiter</SectionLabel>

          <div>
            <Reveal>
              <h2 className="text-2xl sm:text-3xl md:text-[clamp(28px,4vw,48px)] font-black leading-[0.95] tracking-[-0.025em] mb-5 text-white">
                Agentisch statt reaktiv<Dot />
              </h2>
            </Reveal>

            <Reveal delay={0.06}>
              <p className="text-base sm:text-lg font-light leading-[1.75] text-white/60 max-w-[580px] mb-12">
                20+ Werkzeuge, spezialisierte Experten, ein Gedächtnis für Verläufe
                und Vorlieben und das Wissen um deine Projekte. Die KI erkennt was
                gebraucht wird, greift zu den passenden Werkzeugen und erinnert sich
                an laufende Projekte. Du sagst was du willst, sie kümmert sich um
                das Wie.
              </p>
            </Reveal>

            {/* Features — 2-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {([
                {
                  icon: Wrench,
                  title: "20+ Werkzeuge, ein Arbeitsplatz",
                  text: "Recherchieren, gestalten, schreiben und analysieren an einem Ort. Bildgenerierung mit Design Library, YouTube-Analyse, Google-Suche, Oberflächen-Entwürfe. Die KI wählt selbstständig was sie braucht.",
                },
                {
                  icon: Users,
                  title: "Spezialisierte Experten",
                  text: "Ein Code-Assistent, der präzise denkt. Ein Texter, der nie in KI-Sprech verfällt. Ein Rechercheur, der gründlich ist statt schnell. Jeder mit eigenem Charakter, eigenen Fähigkeiten und eigenem Werkzeug-Zugang.",
                },
                {
                  icon: FormInput,
                  title: "Geführte Eingaben",
                  text: "Die Hürde ist nicht die KI, sondern das richtige Formulieren. Quicktasks lösen das: Formular ausfüllen, absenden, geprüftes Ergebnis. Wiederholbar, einheitlich, und jeder im Team kann sie nutzen.",
                },
                {
                  icon: Layers,
                  title: "Flexibles Ergebnis-System",
                  text: "Artifacts sind eigenständige Ergebnisse im Seitenfenster: HTML mit Live-Vorschau, Code, Bilder, Audio, Oberflächen-Entwürfe, Office-Dokumente. Bearbeitbar, mit Versionen, zum Herunterladen. Im Chat entsteht was, als Artifact bleibt es.",
                },
                {
                  icon: Shield,
                  title: "Eingebauter Datenschutz",
                  text: "Automatische Prüfung auf sensible Daten: E-Mail-Adressen, IBANs, Steuer-IDs, Telefonnummern. Bei einem Fund entscheidet der Nutzer: Unkenntlich machen, EU-Modell oder lokal verarbeiten.",
                  accent: true,
                },
                {
                  icon: Brain,
                  title: "Gedächtnis, das mitwächst",
                  text: "Ein Gedächtnis für Verläufe und Vorlieben, das über einzelne Gespräche hinweg besteht. Kombiniert mit dem Wissen um laufende Projekte und eigenen Anweisungen. Die KI erinnert sich, kennt die Projekte und berücksichtigt was dir wichtig ist.",
                },
              ] as const).map((item, i) => {
                const accent = "accent" in item && item.accent
                return (
                <Reveal key={i} delay={i * 0.05}>
                  <div className={`p-6 h-full ${accent ? "bg-primary/[0.08] border-l-2 border-primary" : "bg-white/[0.04]"}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <item.icon className="h-5 w-5 text-primary flex-shrink-0" />
                      <h3 className="text-[17px] font-bold text-white">{item.title}</h3>
                    </div>
                    <p className="text-[15px] font-light leading-[1.7] text-white/55">
                      {item.text}
                    </p>
                  </div>
                </Reveal>
              )})}
            </div>
          </div>
        </SectionGrid>
      </section>

      {/* ═══ EINBLICKE ═══ */}
      <section className={`bg-[#1E1E20] ${sectionPadding}`}>
        <SectionGrid>
          <SectionLabel>Einblicke</SectionLabel>

          <div>
            <Reveal>
              <h2 className="text-2xl sm:text-3xl md:text-[clamp(28px,4vw,48px)] font-black leading-[0.95] tracking-[-0.025em] mb-5 text-white">
                So sieht es aus<Dot />
              </h2>
            </Reveal>

            <Reveal delay={0.06}>
              <p className="text-base sm:text-lg font-light leading-[1.75] text-white/60 max-w-[580px] mb-12">
                Sechs Ansichten aus der Plattform: vom Chat-Arbeitsplatz mit
                Rückfragen und Vorlagen bis zur strukturierten Ablage und dem
                Admin-Bereich. Klick aufs Bild für Vollbild.
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <ScreenshotGrid
                cols={3}
                items={[
                  {
                    src: "/screenshots/build-app.png",
                    alt: "Chat-Interface mit Tool-Calls und Artifact-Panel",
                    caption:
                      "Chat-Arbeitsplatz – Tool-Calls laufen inline, Ergebnisse landen als versionierte Artifacts im Seitenpanel.",
                  },
                  {
                    src: "/screenshots/build-ask-user.png",
                    alt: "Ask-User-Modul mit strukturierter Rückfrage",
                    caption:
                      "Strukturierte Rückfragen – der Assistent fragt gezielt nach, bevor er entscheidet: Tabs, Auswahl, Freitext.",
                  },
                  {
                    src: "/screenshots/build-quicktasks.png",
                    alt: "Quicktasks-Übersicht mit Vorlagen",
                    caption:
                      "Quicktasks – kuratierte Vorlagen für wiederkehrende Aufgaben: Brief schreiben, SWOT-Analyse, Landing Page.",
                  },
                  {
                    src: "/screenshots/build-design-library.png",
                    alt: "Design Library mit Bildstilen",
                    caption:
                      "Design-Library – erprobte Bildstile und Presets, die sich direkt aus dem Chat ansteuern lassen.",
                  },
                  {
                    src: "/screenshots/build-artifacts.png",
                    alt: "Meine Dateien: filterbare Artifact-Ablage",
                    caption:
                      "Meine Dateien – alles was im Chat entsteht, landet hier filterbar: Research, Dokumente, Bilder, Code.",
                  },
                  {
                    src: "/screenshots/build-admin.png",
                    alt: "Admin-Bereich mit Skill-Konfiguration",
                    caption:
                      "Admin-Bereich – Skills, Experten, Modelle und Features werden hier zentral konfiguriert.",
                  },
                ]}
              />
            </Reveal>
          </div>
        </SectionGrid>
      </section>

      {/* ═══ BUILDER ═══ */}
      <BuilderSection />

      {/* ═══ LOSLEGEN ═══ */}
      <section className={`bg-[#151416] ${sectionPadding}`}>
        <SectionGrid>
          <SectionLabel>Loslegen</SectionLabel>

          <div>
            <Reveal>
              <h2 className="text-2xl sm:text-3xl md:text-[clamp(28px,4vw,48px)] font-black leading-[0.95] tracking-[-0.025em] mb-5 text-white">
                Drei Wege, ein Login<Dot />
              </h2>
            </Reveal>

            <Reveal delay={0.06}>
              <p className="text-base sm:text-lg font-light leading-[1.75] text-white/60 max-w-[580px] mb-12">
                Die Plattform läuft dort wo sie soll. In der Cloud, in der EU oder
                auf eurer eigenen Hardware.
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                <div className="bg-white/[0.04] p-6">
                  <Cloud className="h-5 w-5 text-primary mb-4" />
                  <h3 className="text-lg font-bold text-white mb-1">Cloud</h3>
                  <p className="text-xs font-medium text-primary mb-4">Voller Funktionsumfang</p>
                  <p className="text-[15px] font-light text-white/55 leading-[1.7] mb-5">
                    Alles fertig eingerichtet, Start in Minuten. Alle 20+ Werkzeuge
                    verfügbar.
                  </p>
                  <ul className="space-y-2 text-sm font-light text-white/50">
                    <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Kein Technik-Team nötig</li>
                    <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Tiefe Recherche, Bilder, YouTube, Sprachausgabe</li>
                  </ul>
                </div>

                <div className="bg-primary/[0.08] border-t-2 border-primary p-6">
                  <Globe className="h-5 w-5 text-primary mb-4" />
                  <h3 className="text-lg font-bold text-white mb-1">EU-Only</h3>
                  <p className="text-xs font-medium text-primary mb-4">Kein US-Datenfluss</p>
                  <p className="text-[15px] font-light text-white/55 leading-[1.7] mb-5">
                    Europäische KI-Anbieter, DSGVO von Anfang an.
                  </p>
                  <ul className="space-y-2 text-sm font-light text-white/50">
                    <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> EU-Modelle (Mistral, IONOS)</li>
                    <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Erkennung sensibler Daten, dokumentierte Einwilligung</li>
                  </ul>
                </div>

                <div className="bg-white/[0.04] p-6">
                  <Server className="h-5 w-5 text-primary mb-4" />
                  <h3 className="text-lg font-bold text-white mb-1">Self-Hosted</h3>
                  <p className="text-xs font-medium text-primary mb-4">Maximale Datensouveränität</p>
                  <p className="text-[15px] font-light text-white/55 leading-[1.7] mb-5">
                    Alles auf euren eigenen Servern. Komplett vom Netz trennbar.
                  </p>
                  <ul className="space-y-2 text-sm font-light text-white/50">
                    <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Docker Compose, Ollama</li>
                    <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Keine Daten nach außen</li>
                  </ul>
                </div>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Reveal delay={0.14}>
                <div className="bg-white/[0.04] p-6 lg:p-8 h-full">
                  <h3 className="text-xl font-black text-white mb-3">Ausprobieren</h3>
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

              <Reveal delay={0.18}>
                <div className="bg-primary/[0.08] border-l-2 border-primary p-6 lg:p-8 h-full">
                  <h3 className="text-xl font-black text-white mb-3">Mitbauen</h3>
                  <p className="text-[15px] font-light text-white/55 leading-[1.7] mb-6">
                    Bisher alleine gebaut. Die Technologie steht, aber es braucht
                    mehr als eine Person. Entwickler, Designer, Leute aus der
                    Produktentwicklung. Wenn dich das Problem interessiert und du
                    mitgestalten willst, lass uns reden.
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
          </div>
        </SectionGrid>
      </section>

    </div>
  )
}
