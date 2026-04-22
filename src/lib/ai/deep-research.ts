/**
 * Gemini Deep Research wrapper.
 * Uses @google/genai Interactions API to run async multi-step research tasks.
 *
 * Agent: "max" (default) or "standard", selectable via DEEP_RESEARCH_AGENT.
 * Pattern: Start background task → poll for status → retrieve result
 */

import { GoogleGenAI } from "@google/genai"

const DEEP_RESEARCH_AGENT_ALIASES: Record<string, string> = {
  max: "deep-research-max-preview-04-2026",
  standard: "deep-research-preview-04-2026",
}

function resolveDeepResearchAgent(): string {
  const raw = (process.env.DEEP_RESEARCH_AGENT ?? "max").trim()
  return DEEP_RESEARCH_AGENT_ALIASES[raw.toLowerCase()] ?? raw
}

const DEEP_RESEARCH_AGENT = resolveDeepResearchAgent()

/** Metadata tag used to identify Deep Research artifacts. */
export const DEEP_RESEARCH_TAG = "deepResearch"

/** Validation regex for Google Interaction IDs. */
export const INTERACTION_ID_REGEX = /^[a-zA-Z0-9_-]{1,200}$/

export interface StartResearchParams {
  /** The research query (max 2000 chars). */
  query: string
}

export interface ResearchStatus {
  interactionId: string
  status: "in_progress" | "completed" | "failed"
  /** Accumulated thought summaries showing what the agent is doing. */
  thoughtSummaries: string[]
  /** Final report text (only when status === "completed"). */
  outputText?: string
  /** Error message (only when status === "failed"). */
  error?: string
}

/**
 * In-memory mapping of interactionId -> userId for access control.
 * Prevents user A from polling/completing user B's research.
 */
const interactionOwners = new Map<string, string>()

export function registerInteractionOwner(interactionId: string, userId: string): void {
  interactionOwners.set(interactionId, userId)
}

export function verifyInteractionOwner(interactionId: string, userId: string): boolean {
  const owner = interactionOwners.get(interactionId)
  // Allow access if not tracked (e.g. server restart) — defense-in-depth via chatId ownership
  if (!owner) return true
  return owner === userId
}

/** Lazy singleton for the Google GenAI client. */
let _client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured")
    _client = new GoogleGenAI({ apiKey })
  }
  return _client
}

/**
 * Start a deep research task. Returns immediately with an interactionId.
 * The research runs asynchronously on Google's servers (up to 60 minutes).
 */
export async function startDeepResearch(params: StartResearchParams): Promise<{ interactionId: string }> {
  const ai = getClient()

  const interaction = await ai.interactions.create({
    input: params.query,
    agent: DEEP_RESEARCH_AGENT,
    background: true,
    store: true,
    agent_config: { type: "deep-research", thinking_summaries: "auto" },
  })

  if (!interaction.id) {
    throw new Error("Deep Research: no interaction ID returned")
  }

  console.log(`[DeepResearch] Started: ${interaction.id}`)
  return { interactionId: interaction.id }
}

/**
 * Poll the status of a running deep research task.
 * Returns current status, thought summaries, and output when complete.
 */
export async function getResearchStatus(interactionId: string): Promise<ResearchStatus> {
  const ai = getClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const interaction: any = await ai.interactions.get(interactionId)

  const thoughtSummaries: string[] = []
  let outputText: string | undefined

  if (interaction.outputs && Array.isArray(interaction.outputs)) {
    for (const output of interaction.outputs) {
      // New API (04-2026+): flat union — { type: "thought", summary: [...] } | { type: "text", text }
      if (output.type === "thought" && Array.isArray(output.summary)) {
        for (const item of output.summary) {
          if (item && typeof item.text === "string" && item.text.trim()) {
            thoughtSummaries.push(item.text)
          }
        }
        continue
      }
      if (output.type === "text" && typeof output.text === "string") {
        outputText = (outputText ?? "") + output.text
        continue
      }
      // Legacy shape: outputs[].parts[] with { thought: boolean, text: string }
      if (output.parts && Array.isArray(output.parts)) {
        for (const part of output.parts) {
          if (part.thought && part.text) {
            thoughtSummaries.push(part.text)
          } else if (part.text) {
            outputText = (outputText ?? "") + part.text
          }
        }
      }
      // Last-resort fallback: bare { text } on output
      if (output.text && typeof output.text === "string" && output.type !== "text") {
        outputText = (outputText ?? "") + output.text
      }
    }
  }

  const status = interaction.status === "completed"
    ? "completed" as const
    : interaction.status === "failed" || interaction.status === "cancelled"
      ? "failed" as const
      : "in_progress" as const

  const result: ResearchStatus = {
    interactionId,
    status,
    thoughtSummaries,
  }

  if (status === "completed" && outputText) {
    result.outputText = outputText
  }

  if (status === "failed") {
    result.error = interaction.error?.message ?? interaction.error ?? "Research failed"
  }

  return result
}
