import Image from "next/image"
import { Reveal } from "./reveal"
import { Dot } from "./dot"

export function BuilderSection() {
  return (
    <section className="py-16 md:py-24 lg:py-[100px] px-6 sm:px-10 md:px-16 lg:px-20 bg-[#1E1E20]">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(100px,240px)_1fr] gap-6 md:gap-12 lg:gap-15">
        {/* Sticky Label */}
        <div className="md:sticky md:top-24 md:self-start">
          <Reveal>
            <p className="text-xs sm:text-sm font-medium text-white/40 tracking-[0.08em] uppercase">
              Wer das hier baut
            </p>
          </Reveal>
        </div>

        {/* Content */}
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,600px)_320px] gap-12 lg:gap-16 items-start">
            {/* Story */}
            <div>
              <Reveal>
                <h2 className="text-3xl sm:text-4xl md:text-[clamp(38px,5vw,64px)] font-black leading-[0.92] tracking-[-0.03em] mb-3 text-white">
                  Hi, ich bin Rico<Dot />
                </h2>
              </Reveal>

              <Reveal delay={0.04}>
                <p className="text-sm text-white/40 mb-8">
                  Rico Loschke · KI-Stratege und Builder
                </p>
              </Reveal>

              <Reveal delay={0.08}>
                <p className="text-base md:text-[1.05rem] font-light leading-[1.75] text-white/60 mb-5 max-w-[600px]">
                  Ich nutze Claude und Gemini täglich, beide als Pro-Account. Beide
                  stark, aber keines konnte alles. Ich habe ständig zwischen Tabs
                  gewechselt und Kontext kopiert.{" "}
                  <span className="text-primary font-medium">build.jetzt ist meine Antwort darauf:</span>{" "}
                  ein agentischer Chat-Assistent, der das Beste aus zwei Welten
                  zusammenführt und mit dem ergänzt, was mir gefehlt hat.
                </p>
              </Reveal>

              <Reveal delay={0.11}>
                <p className="text-base md:text-[1.05rem] font-light leading-[1.75] text-white/60 mb-5 max-w-[600px]">
                  20+ integrierte Werkzeuge, spezialisierte Experten, ein System für
                  eigene Ergebnisse: HTML, Code, Bilder, Audio und Dokumente.
                  Bearbeitbar, mit Versionen, zum Herunterladen. Drei Varianten:
                  Cloud, EU-Only oder auf eigenen Servern.
                </p>
              </Reveal>

              <Reveal delay={0.14}>
                <p className="text-base md:text-[1.05rem] font-light leading-[1.75] text-white/60 mb-5 max-w-[600px]">
                  Als KI-Berater muss ich verstehen wie agentische Systeme
                  funktionieren. Nicht aus Blogposts, sondern aus eigener Entwicklung.
                  Heute ist build.jetzt fester Bestandteil meiner Beratungen und
                  Trainings. Kein Prototyp, sondern Arbeitsinstrument.
                </p>
              </Reveal>

              <Reveal delay={0.16}>
                <p className="text-base md:text-[1.05rem] font-light leading-[1.75] text-white/60 mb-8 max-w-[600px]">
                  Gleichzeitig sehe ich bei Unternehmen, die ich begleite, eine
                  Lücke: Viele haben noch keine eigene KI-Infrastruktur und brauchen
                  etwas Konfigurierbares für den Einstieg. Diese Plattform kann genau
                  das sein.
                </p>
              </Reveal>

              <Reveal delay={0.18}>
                <p className="text-sm leading-[1.7] text-white/40 pt-6 border-t border-white/10 mb-6 max-w-[600px]">
                  Davor: 11 Jahre Agenturseite, davon drei als Director Automation
                  & AI. Acht Jahre selbständig in Web, Design und Marketing. Seit
                  2021 täglich mit generativer KI. Trainer an der Haufe Akademie, IHK
                  und Fraunhofer. Ich kenne beide Seiten, die strategische und die
                  operative.
                </p>
              </Reveal>

              <Reveal delay={0.21}>
                <div className="flex flex-wrap items-center gap-5 mb-10">
                  <a
                    href="https://www.linkedin.com/in/rico-loschke/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-white/70 no-underline hover:text-primary transition-colors"
                  >
                    LinkedIn →
                  </a>
                  <a
                    href="https://www.youtube.com/@LoschkeAI"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-white/70 no-underline hover:text-primary transition-colors"
                  >
                    YouTube →
                  </a>
                  <a
                    href="https://www.instagram.com/loschkeai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-white/70 no-underline hover:text-primary transition-colors"
                  >
                    Instagram →
                  </a>
                </div>
              </Reveal>

              <Reveal delay={0.24}>
                <div className="pt-6 border-t border-white/10">
                  <span className="block text-xs font-medium text-white/40 tracking-[0.06em] uppercase mb-4">
                    Mehr von mir
                  </span>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="https://loschke.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2.5 px-4 py-2.5 border border-white/10 bg-white/[0.04] text-sm text-white/70 no-underline hover:border-white/30 hover:text-white transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FC2D01] shrink-0"></span>
                      loschke.ai
                      <span className="text-white/30 hidden sm:inline">Blog & Meinung</span>
                    </a>
                    <a
                      href="https://unlearn.how"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2.5 px-4 py-2.5 border border-white/10 bg-white/[0.04] text-sm text-white/70 no-underline hover:border-white/30 hover:text-white transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] shrink-0"></span>
                      unlearn.how
                      <span className="text-white/30 hidden sm:inline">Beratung & Workshops</span>
                    </a>
                    <a
                      href="https://lernen.diy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2.5 px-4 py-2.5 border border-white/10 bg-white/[0.04] text-sm text-white/70 no-underline hover:border-white/30 hover:text-white transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E] shrink-0"></span>
                      lernen.diy
                      <span className="text-white/30 hidden sm:inline">Guides & Lessons</span>
                    </a>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Portrait */}
            <div className="lg:mt-16">
              <Reveal delay={0.1}>
                <div className="aspect-[3/4] overflow-hidden bg-white/[0.04]">
                  <Image
                    src="/images/rico-loschke.jpg"
                    alt="Rico Loschke"
                    width={320}
                    height={427}
                    sizes="(min-width: 1024px) 320px, 100vw"
                    className="w-full h-full object-cover"
                  />
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
