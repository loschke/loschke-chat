import type { SearchProvider } from "../types"

export const tavilyProvider: SearchProvider = {
  async search() {
    throw new Error("Tavily search provider not implemented")
  },
  async fetch() {
    throw new Error("Tavily fetch provider not implemented")
  },
}
