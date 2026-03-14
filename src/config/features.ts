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
      || process.env.TAVILY_API_KEY || process.env.PERPLEXITY_API_KEY),
  },
  storage: {
    enabled: !!process.env.R2_ACCESS_KEY_ID,
  },
  mcp: {
    enabled: !!process.env.MCP_ENABLED,
  },
  admin: {
    enabled: !!process.env.ADMIN_EMAILS,
  },
} as const
