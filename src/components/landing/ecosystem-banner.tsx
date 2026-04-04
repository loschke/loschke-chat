import { brand } from "@/config/brand"
import { Reveal } from "./reveal"
import { Dot } from "./dot"

const ecosystemBrands = [
  {
    id: "loschke",
    accent: "#FC2D01",
    category: "Denken & Meinung",
    description: "Mein persönlicher Blog. Perspektiven zu KI und Transformation, Experimente und was ich auf dem Weg lerne. Kein Marketing, keine Versprechen. Klares Denken, ehrliche Einschätzungen.",
    url: "https://loschke.ai",
    linkText: "loschke.ai",
    logo: (
      <p className="text-2xl font-black tracking-[-0.02em] mb-1">
        RL<span style={{ color: "#FC2D01" }}>.</span>
      </p>
    ),
  },
  {
    id: "unlearn",
    accent: "#a855f7",
    category: "Begleiten & Transformieren",
    description: "KI-Transformation für Führungskräfte und Organisationen. Beratung, Workshops und strategisches Sparring. Erst verstehen, dann verändern.",
    url: "https://unlearn.how",
    linkText: "unlearn.how",
    logo: (
      <p className="font-serif text-2xl mb-1">
        <span className="italic text-white">unlearn</span><span style={{ color: "#a855f7" }}>.how</span>
      </p>
    ),
  },
  {
    id: "build",
    accent: "#4A7AE5",
    category: "Bauen & Anwenden",
    description: "Chat-Agent mit spezialisierten Experten. Deep Research, Bildgenerierung, Coding und mehr. Alle Tools vereint, fühlt sich an wie ein gutes Team.",
    url: "https://build.jetzt",
    linkText: "build.jetzt",
    logo: (
      <p className="font-serif text-2xl mb-1">
        <span className="text-white">build</span><span className="italic" style={{ color: "#4A7AE5" }}>.jetzt</span>
      </p>
    ),
  },
  {
    id: "lernen",
    accent: "#0F766E",
    category: "Lehren & Lernen",
    description: "Kostenlose interaktive Lessons, Guides und Ressourcen. KI praxisnah lernen, im eigenen Tempo. Keine Theorie-Schlachten, keine Hype-Versprechen.",
    url: "https://lernen.diy",
    linkText: "lernen.diy",
    logo: (
      <p className="font-serif text-2xl mb-1">
        <span className="text-white">lernen</span><span className="italic" style={{ color: "#0F766E" }}>.diy</span>
      </p>
    ),
  },
] as const

export function EcosystemBanner() {
  const currentBrandId = brand.id

  return (
    <section className="py-16 md:py-24 lg:py-[100px] px-6 sm:px-10 md:px-16 lg:px-20 bg-[#151416] text-white">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(100px,240px)_1fr] gap-6 md:gap-12 lg:gap-15 items-start">
        {/* Sticky Label */}
        <Reveal>
          <p className="text-xs sm:text-sm font-medium text-white/40 tracking-[0.08em] uppercase md:sticky md:top-24">
            Ökosystem
          </p>
        </Reveal>

        {/* Content */}
        <div>
          <Reveal>
            <h2 className="text-2xl sm:text-3xl md:text-[clamp(28px,4vw,48px)] font-black leading-[0.95] tracking-[-0.025em] mb-4 text-white">
              Hi, ich bin Rico<Dot />
            </h2>
          </Reveal>

          <Reveal delay={0.06}>
            <p className="text-base sm:text-lg font-light leading-[1.75] text-white/60 max-w-[580px] mb-10 md:mb-12">
              11 Jahre Agenturerfahrung, davon drei im Aufbau einer KI-Abteilung als
              Director Automation & AI. Heute helfe ich Menschen und Organisationen,
              KI sinnvoll einzusetzen. Vier Projekte, ein Ziel.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {ecosystemBrands.map((b) => {
                const isCurrent = b.id === currentBrandId

                if (isCurrent) {
                  return (
                    <div
                      key={b.id}
                      className="block p-6 border-t-[3px]"
                      style={{ borderTopColor: b.accent, backgroundColor: `${b.accent}1A` }}
                    >
                      <div className="flex items-center gap-3 mb-1">
                        {b.logo}
                        <span
                          className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                          style={{ color: b.accent, backgroundColor: `${b.accent}33` }}
                        >
                          Du bist hier
                        </span>
                      </div>
                      <p className="text-[13px] font-medium text-white/40 tracking-[0.04em] uppercase mb-4">
                        {b.category}
                      </p>
                      <p className="text-[15px] font-light leading-[1.65] text-white/70 mb-6">
                        {b.description}
                      </p>
                      <span className="text-base font-medium" style={{ color: b.accent }}>
                        Du bist bereits hier &#10003;
                      </span>
                    </div>
                  )
                }

                return (
                  <a
                    key={b.id}
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block p-6 border-t-[3px] bg-white/5 hover:bg-white/10 transition-colors duration-300"
                    style={{ borderTopColor: b.accent }}
                  >
                    {b.logo}
                    <p className="text-[13px] font-medium text-white/40 tracking-[0.04em] uppercase mb-4">
                      {b.category}
                    </p>
                    <p className="text-[15px] font-light leading-[1.65] text-white/70 mb-6">
                      {b.description}
                    </p>
                    <span
                      className="text-base font-medium group-hover:underline"
                      style={{ color: b.accent }}
                    >
                      {b.linkText} &rarr;
                    </span>
                  </a>
                )
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
