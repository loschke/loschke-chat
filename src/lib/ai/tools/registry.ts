// ---------------------------------------------------------------------------
// Tool Registry — Central metadata for all built-in tools
// ---------------------------------------------------------------------------

export type ToolCategory = "core" | "search" | "media" | "memory" | "skill"

export interface ToolRegistration {
  name: string
  label: string
  icon: string // Lucide icon name (resolved to component on client)
  category: ToolCategory
  customRenderer: boolean
  privacySensitive?: boolean
}

// ---------------------------------------------------------------------------
// Internal store
// ---------------------------------------------------------------------------

const registry = new Map<string, ToolRegistration>()

export function registerTool(reg: ToolRegistration): void {
  registry.set(reg.name, reg)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getToolRegistration(name: string): ToolRegistration | undefined {
  return registry.get(name)
}

export function getToolLabel(name: string): string {
  return registry.get(name)?.label ?? name.replace(/_/g, " ")
}

export function getToolIcon(name: string): string {
  return registry.get(name)?.icon ?? "Wrench"
}

export function isCustomRendered(name: string): boolean {
  return registry.get(name)?.customRenderer ?? false
}

export function getAllRegistrations(): ToolRegistration[] {
  return Array.from(registry.values())
}

// ---------------------------------------------------------------------------
// Auto-register all built-in tools
// ---------------------------------------------------------------------------

import { registration as askUser } from "./ask-user"
import { registration as contentAlternatives } from "./content-alternatives"
import { registration as createArtifact } from "./create-artifact"
import { registration as createQuiz } from "./create-quiz"
import { registration as createReview } from "./create-review"
import { registration as webSearch } from "./web-search"
import { registration as webFetch } from "./web-fetch"
import { registration as loadSkill } from "./load-skill"
import { registration as loadSkillResource } from "./load-skill-resource"
import { registration as saveMemory } from "./save-memory"
import { registration as recallMemory } from "./recall-memory"
import { registration as suggestMemory } from "./suggest-memory"
import { registration as generateImage } from "./generate-image"
import { registration as youtubeSearch } from "./youtube-search"
import { registration as youtubeAnalyze } from "./youtube-analyze"
import { registration as textToSpeech } from "./text-to-speech"
import { registration as extractBranding } from "./extract-branding"
import { registration as generateDesign } from "./generate-design"
import { registration as deepResearch } from "./deep-research"
import { registration as googleSearch } from "./google-search"
import { registration as searchDesignLibrary } from "./search-design-library"

const builtins: ToolRegistration[] = [
  askUser,
  contentAlternatives,
  createArtifact,
  createQuiz,
  createReview,
  webSearch,
  webFetch,
  loadSkill,
  loadSkillResource,
  saveMemory,
  recallMemory,
  suggestMemory,
  generateImage,
  youtubeSearch,
  youtubeAnalyze,
  textToSpeech,
  extractBranding,
  generateDesign,
  deepResearch,
  googleSearch,
  searchDesignLibrary,
  // code_execution has no local file — registered inline
  {
    name: "code_execution",
    label: "Code ausführen",
    icon: "Terminal",
    category: "core",
    customRenderer: true,
  },
]

for (const reg of builtins) {
  registerTool(reg)
}
