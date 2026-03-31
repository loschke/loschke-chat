import { isToolPart } from "./use-artifact"
import type { SelectedArtifact } from "./use-artifact"
import { unwrapToolOutput } from "@/lib/ai/tool-output"
import { safeDomain } from "@/lib/url-validation"
import type { ArtifactContentType } from "@/types/artifact"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExtractorResult = {
  artifact: Omit<SelectedArtifact, "isStreaming">
  isStreaming: boolean
} | null

interface StreamingExtractorConfig {
  toolName: string
  mode: "streaming"
  /** Return null from mapInput to skip (e.g. when required fields are missing) */
  mapInput: (input: Record<string, unknown>) => {
    title: string
    content: string
    type: ArtifactContentType
    language?: string
    reviewMode?: boolean
  } | null
}

interface ServerSideExtractorConfig {
  toolName: string
  mode: "server-side"
  mapInput: (input: Record<string, unknown>, output: Record<string, unknown> | undefined) => {
    title: string
    type: ArtifactContentType
    language?: string
  }
  /** Return true from shouldSkipOutput to bail out at output-available (e.g. on error) */
  shouldSkipOutput?: (output: Record<string, unknown> | undefined) => boolean
}

type ExtractorConfig = StreamingExtractorConfig | ServerSideExtractorConfig

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createToolPartExtractor(config: ExtractorConfig) {
  return function extract(part: { type: string; [key: string]: unknown }): ExtractorResult {
    if (!isToolPart(part, config.toolName)) return null

    const state = part.state as string | undefined
    const input = (part.input as Record<string, unknown> | undefined) ?? {}
    const output = unwrapToolOutput<Record<string, unknown>>(part.output)

    if (config.mode === "streaming") {
      const mapped = config.mapInput(input)
      if (!mapped) return null

      if (state === "input-streaming" || state === "input-available") {
        return {
          artifact: { ...mapped, version: 1 },
          isStreaming: state === "input-streaming",
        }
      }

      if (state === "output-available") {
        return {
          artifact: {
            ...mapped,
            id: output?.artifactId as string | undefined,
            version: (output?.version as number | undefined) ?? 1,
          },
          isStreaming: false,
        }
      }
    }

    if (config.mode === "server-side") {
      if (state === "input-streaming" || state === "input-available") {
        const mapped = config.mapInput(input, undefined)
        return {
          artifact: { ...mapped, content: "", version: 1 },
          isStreaming: true,
        }
      }

      if (state === "output-available") {
        if (config.shouldSkipOutput?.(output)) return null
        const mapped = config.mapInput(input, output)
        return {
          artifact: {
            ...mapped,
            content: "",
            id: output?.artifactId as string | undefined,
            version: (output?.version as number | undefined) ?? 1,
          },
          isStreaming: false,
        }
      }
    }

    return null
  }
}

// ---------------------------------------------------------------------------
// Concrete extractors
// ---------------------------------------------------------------------------

/**
 * Extract artifact data from a create_artifact tool part.
 */
export const extractArtifactFromToolPart = createToolPartExtractor({
  toolName: "create_artifact",
  mode: "streaming",
  mapInput: (input) => {
    if (!input.content) return null
    return {
      title: (input.title as string) ?? "Artifact",
      content: input.content as string,
      type: ((input.type as ArtifactContentType) ?? "markdown"),
      language: input.language as string | undefined,
    }
  },
})

/**
 * Extract artifact data from a create_quiz tool part.
 * Constructs a SelectedArtifact with the quiz JSON as content.
 */
export const extractQuizFromToolPart = createToolPartExtractor({
  toolName: "create_quiz",
  mode: "streaming",
  mapInput: (input) => {
    const questions = input.questions as Array<Record<string, unknown>> | undefined
    if (!questions || questions.length === 0) return null
    const quizJson = JSON.stringify({
      title: (input.title as string) ?? "Quiz",
      description: input.description,
      questions: questions.map((q, i) => ({ id: `q${i + 1}`, ...q })),
    })
    return {
      title: (input.title as string) ?? "Quiz",
      content: quizJson,
      type: "quiz",
    }
  },
})

/**
 * Extract artifact data from a create_review tool part.
 * Review is a MODE of markdown artifacts -- content stored as raw markdown.
 */
export const extractReviewFromToolPart = createToolPartExtractor({
  toolName: "create_review",
  mode: "streaming",
  mapInput: (input) => {
    if (!input.content) return null
    return {
      title: (input.title as string) ?? "Review",
      content: input.content as string,
      type: "markdown",
      reviewMode: true,
    }
  },
})

/**
 * Extract artifact data from a generate_image tool part.
 * Image content is NOT available during streaming -- generated server-side.
 */
export const extractImageFromToolPart = createToolPartExtractor({
  toolName: "generate_image",
  mode: "server-side",
  mapInput: (input, output) => {
    if (output) {
      return {
        title: (output.title as string) ?? (input.title as string) ?? "Generiertes Bild",
        type: "image",
      }
    }
    return {
      title: (input.title as string) ?? "Bild wird generiert...",
      type: "image",
    }
  },
})

/**
 * Extract artifact data from an extract_branding tool part.
 * Branding JSON is created server-side.
 */
export const extractBrandingFromToolPart = createToolPartExtractor({
  toolName: "extract_branding",
  mode: "server-side",
  mapInput: (input, output) => {
    if (output) {
      return {
        title: (input.title as string) ?? `Branding: ${(output.domain as string) ?? "Website"}`,
        type: "code",
        language: "json",
      }
    }
    const domain = safeDomain(input.url as string | undefined)
    return {
      title: (input.title as string) ?? `Branding: ${domain}`,
      type: "code",
      language: "json",
    }
  },
})

/**
 * Extract artifact data from a youtube_analyze tool part.
 * Content is created server-side.
 */
export const extractYouTubeAnalyzeFromToolPart = createToolPartExtractor({
  toolName: "youtube_analyze",
  mode: "server-side",
  mapInput: (input, output) => {
    if (output) {
      return {
        title: (output.title as string) ?? "YouTube-Analyse",
        type: "markdown",
      }
    }
    return {
      title: (input.title as string) ?? "YouTube-Analyse\u2026",
      type: "markdown",
    }
  },
})

