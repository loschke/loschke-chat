export type BrandId = "lernen" | "unlearn" | "loschke" | "prototype" | "aok" | "queo" | "queonext" | "build"

export interface BrandConfig {
  id: BrandId
  name: string
  description: string
  domain: string
  websiteUrl?: string
}

const brands: Record<BrandId, BrandConfig> = {
  lernen: {
    id: "lernen",
    name: "lernen.diy",
    description: "Praxisorientierte KI-Lernmodule",
    domain: "lernen.diy",
    websiteUrl: "https://lernen.diy",
  },
  unlearn: {
    id: "unlearn",
    name: "unlearn.how",
    description: "KI-Beratung und Workshops",
    domain: "unlearn.how",
    websiteUrl: "https://unlearn.how",
  },
  loschke: {
    id: "loschke",
    name: "loschke.ai",
    description: "AI Transformation Insights",
    domain: "loschke.ai",
    websiteUrl: "https://loschke.ai",
  },
  prototype: {
    id: "prototype",
    name: "Prototype",
    description: "Prototyp-Anwendung",
    domain: "prototype.local",
  },
  aok: {
    id: "aok",
    name: "AOK",
    description: "AOK Lernplattform",
    domain: "aok.lernen.diy",
  },
  queo: {
    id: "queo",
    name: "queo",
    description: "queo Lernplattform",
    domain: "queo.lernen.diy",
  },
  queonext: {
    id: "queonext",
    name: "queonext",
    description: "queonext Lernplattform",
    domain: "queonext.lernen.diy",
  },
  build: {
    id: "build",
    name: "build.jetzt",
    description: "KI-Chat-Plattform",
    domain: "build.jetzt",
    websiteUrl: "https://build.jetzt",
  },
}

const brandId = (process.env.NEXT_PUBLIC_BRAND ?? "lernen") as BrandId

export const brand: BrandConfig = brands[brandId] ?? brands.lernen
