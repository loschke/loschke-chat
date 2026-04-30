export const features = {
  chat: {
    enabled: process.env.NEXT_PUBLIC_CHAT_ENABLED !== "false",
  },
  mermaid: {
    enabled: process.env.NEXT_PUBLIC_MERMAID_ENABLED !== "false",
  },
  darkMode: {
    enabled: process.env.NEXT_PUBLIC_DARK_MODE !== "false",
    defaultTheme: (process.env.NEXT_PUBLIC_DEFAULT_THEME ?? "light") as "light" | "dark" | "system",
  },
  web: {
    enabled: !!process.env.FIRECRAWL_API_KEY,
  },
  search: {
    enabled: !!(process.env.FIRECRAWL_API_KEY || process.env.JINA_API_KEY
      || process.env.TAVILY_API_KEY || process.env.PERPLEXITY_API_KEY
      || process.env.SEARXNG_URL),
  },
  storage: {
    enabled: !!(process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID),
  },
  mcp: {
    enabled: !!process.env.MCP_ENABLED,
  },
  admin: {
    enabled: !!(process.env.ADMIN_EMAILS || process.env.SUPERADMIN_EMAIL),
  },
  memory: {
    enabled: !!(process.env.MEM0_API_KEY || process.env.MEM0_BASE_URL),
  },
  businessMode: {
    enabled: process.env.NEXT_PUBLIC_BUSINESS_MODE === "true",
  },
  credits: {
    enabled: process.env.NEXT_PUBLIC_CREDITS_ENABLED === "true",
  },
  imageGeneration: {
    enabled: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  },
  youtube: {
    enabled: !!process.env.YOUTUBE_API_KEY,
  },
  tts: {
    enabled: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  },
  branding: {
    enabled: !!process.env.FIRECRAWL_API_KEY,
  },
  stitch: {
    enabled: !!process.env.STITCH_API_KEY,
  },
  designLibrary: {
    enabled: !!process.env.DESIGN_LIBRARY_DATABASE_URL,
  },
  anthropicSkills: {
    enabled: process.env.ANTHROPIC_SKILLS_ENABLED !== "false",
  },
  deepResearch: {
    enabled: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
      && process.env.DEEP_RESEARCH_ENABLED === "true",
  },
  googleSearch: {
    enabled: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
      && process.env.GOOGLE_SEARCH_ENABLED === "true",
  },
  userSkills: {
    enabled: process.env.NEXT_PUBLIC_USER_SKILLS_ENABLED === "true",
  },
  openRegistration: {
    enabled: process.env.NEXT_PUBLIC_OPEN_REGISTRATION === "true",
  },
  voiceChat: {
    enabled: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
      && process.env.VOICE_CHAT_ENABLED === "true",
  },
  modelPickerInInput: {
    enabled: process.env.NEXT_PUBLIC_MODEL_PICKER_ENABLED === "true",
  },
} as const
