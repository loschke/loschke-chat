import { features } from "@/config/features"
import { FeaturesOverview } from "@/components/admin/features-overview"

export const dynamic = "force-dynamic"

type DataFlowTarget = "local" | "eu" | "us"

interface FeatureInfo {
  name: string
  description: string
  enabled: boolean
  dataFlow: {
    target: DataFlowTarget
    label: string
  }
  envHint: string
}

function getRoutingMode(): string {
  return process.env.LLM_ROUTING ?? "gateway"
}

function buildFeatureList(): FeatureInfo[] {
  const routing = getRoutingMode()

  return [
    {
      name: "Chat",
      description: "Multi-Model Chat mit Artifacts",
      enabled: features.chat.enabled,
      dataFlow: {
        target: routing === "direct" ? "eu" : routing === "litellm" ? "local" : "us",
        label: routing === "direct" ? "Direct Provider" : routing === "litellm" ? "LiteLLM Proxy" : "Vercel AI Gateway",
      },
      envHint: "LLM_ROUTING + Provider Keys",
    },
    {
      name: "Web Search",
      description: "Websuche via Provider",
      enabled: features.search.enabled,
      dataFlow: {
        target: process.env.SEARXNG_URL ? "local" : process.env.JINA_API_KEY ? "eu" : "us",
        label: process.env.SEARCH_PROVIDER ?? (process.env.SEARXNG_URL ? "SearXNG" : "Firecrawl"),
      },
      envHint: "SEARCH_PROVIDER + Key/URL",
    },
    {
      name: "File Storage",
      description: "Datei-Upload und -Speicherung",
      enabled: features.storage.enabled,
      dataFlow: {
        target: process.env.S3_ENDPOINT ? "local" : "us",
        label: process.env.S3_ENDPOINT ? "S3-kompatibel (MinIO)" : "Cloudflare R2",
      },
      envHint: "S3_* oder R2_*",
    },
    {
      name: "Memory",
      description: "User-Memory (Extraktion + Recall)",
      enabled: features.memory.enabled,
      dataFlow: {
        target: process.env.MEM0_BASE_URL ? "local" : "us",
        label: process.env.MEM0_BASE_URL ? "Mem0 Self-Hosted" : "Mem0 Cloud",
      },
      envHint: "MEM0_API_KEY oder MEM0_BASE_URL",
    },
    {
      name: "Image Generation",
      description: "Bildgenerierung via Gemini",
      enabled: features.imageGeneration.enabled,
      dataFlow: { target: "us", label: "Google Gemini API" },
      envHint: "GOOGLE_GENERATIVE_AI_API_KEY",
    },
    {
      name: "Text-to-Speech",
      description: "Sprachausgabe via Gemini TTS",
      enabled: features.tts.enabled,
      dataFlow: { target: "us", label: "Google Gemini API" },
      envHint: "GOOGLE_GENERATIVE_AI_API_KEY",
    },
    {
      name: "Deep Research",
      description: "Mehrstufige Tiefenrecherche",
      enabled: features.deepResearch.enabled,
      dataFlow: { target: "us", label: "Google Gemini API" },
      envHint: "GOOGLE_GENERATIVE_AI_API_KEY + DEEP_RESEARCH_ENABLED",
    },
    {
      name: "Google Search",
      description: "Quellengestuetzte Suche via Gemini",
      enabled: features.googleSearch.enabled,
      dataFlow: { target: "us", label: "Google Gemini + Search" },
      envHint: "GOOGLE_GENERATIVE_AI_API_KEY + GOOGLE_SEARCH_ENABLED",
    },
    {
      name: "YouTube",
      description: "YouTube-Suche und -Analyse",
      enabled: features.youtube.enabled,
      dataFlow: { target: "us", label: "YouTube Data API + Gemini" },
      envHint: "YOUTUBE_API_KEY",
    },
    {
      name: "Stitch Design",
      description: "UI-Design-Generierung",
      enabled: features.stitch.enabled,
      dataFlow: { target: "us", label: "Google Stitch API" },
      envHint: "STITCH_API_KEY",
    },
    {
      name: "Anthropic Skills",
      description: "Agent Skills (PPTX, XLSX, DOCX, PDF)",
      enabled: features.anthropicSkills.enabled && !!process.env.ANTHROPIC_API_KEY,
      dataFlow: { target: "us", label: "Anthropic API" },
      envHint: "ANTHROPIC_API_KEY",
    },
    {
      name: "MCP Server",
      description: "Model Context Protocol Integration",
      enabled: features.mcp.enabled,
      dataFlow: { target: "local", label: "Konfigurationsabhaengig" },
      envHint: "MCP_ENABLED",
    },
    {
      name: "Business Mode",
      description: "PII-Erkennung und Privacy-Routing",
      enabled: features.businessMode.enabled,
      dataFlow: { target: "local", label: "Lokal (Regex PII)" },
      envHint: "NEXT_PUBLIC_BUSINESS_MODE",
    },
    {
      name: "Credits",
      description: "Token-basiertes Credit-System",
      enabled: features.credits.enabled,
      dataFlow: { target: "local", label: "Lokal (DB)" },
      envHint: "NEXT_PUBLIC_CREDITS_ENABLED",
    },
    {
      name: "Offene Registrierung",
      description: "Selbstregistrierung ohne Admin-Freischaltung",
      enabled: features.openRegistration.enabled,
      dataFlow: { target: "local", label: "Lokal (DB)" },
      envHint: "NEXT_PUBLIC_OPEN_REGISTRATION",
    },
    {
      name: "Model Picker (Input)",
      description: "Modellwechsel pro Nachricht im Prompt-Input fuer Power-User",
      enabled: features.modelPickerInInput.enabled,
      dataFlow: { target: "local", label: "Client-UI (kein zusaetzlicher Datenfluss)" },
      envHint: "NEXT_PUBLIC_MODEL_PICKER_ENABLED",
    },
  ]
}

export default function AdminFeaturesPage() {
  const featureList = buildFeatureList()
  const routingMode = getRoutingMode()

  return <FeaturesOverview features={featureList} routingMode={routingMode} />
}
