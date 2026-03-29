export interface MemoryConfig {
  apiKey: string
  baseUrl?: string
  searchLimit: number
  minMessages: number
}

const config: MemoryConfig = {
  apiKey: process.env.MEM0_API_KEY ?? "",
  baseUrl: process.env.MEM0_BASE_URL,
  searchLimit: parseInt(process.env.MEMORY_SEARCH_LIMIT ?? "10", 10),
  minMessages: parseInt(process.env.MEMORY_MIN_MESSAGES ?? "6", 10),
}

// Lazy singleton — mem0ai is only imported when actually needed
let clientPromise: Promise<import("mem0ai").default> | null = null

export async function getMemoryClient(): Promise<import("mem0ai").default> {
  if (!clientPromise) {
    clientPromise = import("mem0ai").then(({ default: MemoryClient }) => {
      return new MemoryClient({
        apiKey: config.apiKey,
        ...(config.baseUrl && { host: config.baseUrl }),
      })
    })
  }
  return clientPromise
}

export { config as memoryConfig }
