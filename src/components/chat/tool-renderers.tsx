"use client"

import { type ReactNode } from "react"

import { ArtifactCard } from "@/components/assistant/artifact-card"
import { artifactTypeToIcon } from "@/components/assistant/artifact-utils"
import { AskUser } from "@/components/generative-ui/ask-user"
import { MemorySuggestion } from "@/components/generative-ui/memory-suggestion"
import { ContentAlternatives } from "@/components/generative-ui/content-alternatives"
import { YouTubeResults, YouTubeResultsSkeleton, type YouTubeVideo } from "@/components/generative-ui/youtube-results"
import { SearchGroundingResults, SearchGroundingResultsSkeleton, type GroundingSourceItem, type GroundingPlaceItem } from "@/components/generative-ui/search-grounding-results"
import { AudioPlayer, AudioPlayerSkeleton, type AudioPlayerData } from "@/components/generative-ui/audio-player"
import { DeepResearchProgress } from "./deep-research-progress"
import { ToolStatus } from "./tool-status"
import { FileDownloadCard } from "./file-download-card"
import { extractArtifactFromToolPart } from "@/hooks/use-artifact"
import { extractFileRefs } from "@/lib/ai/anthropic-skills"
import { unwrapToolOutput } from "@/lib/ai/tool-output"
import { safeDomain } from "@/lib/url-validation"
import type { SelectedArtifact } from "@/hooks/use-artifact"

// ---------------------------------------------------------------------------
// Context passed to every renderer
// ---------------------------------------------------------------------------

export interface ToolRenderContext {
  messageId: string
  part: { type: string; [key: string]: unknown }
  isStreaming: boolean
  isLastMessage: boolean
  selectedArtifact: SelectedArtifact | null
  onArtifactClick: (artifact: {
    title: string
    content: string
    type: string
    language?: string
    id?: string
    version?: number
    reviewMode?: boolean
  }) => void
  onToolResult?: (toolCallId: string, toolName: string, result: unknown) => void
}

// ---------------------------------------------------------------------------
// Helpers (moved from chat-message.tsx)
// ---------------------------------------------------------------------------

/** Extract tool data from inline tool part (typed or invocation fallback) */
function extractInlineToolData(part: { type: string; [key: string]: unknown }, toolName: string) {
  const expectedType = `tool-${toolName}`
  if (part.type === expectedType) {
    return {
      state: part.state as string | undefined,
      input: part.input as Record<string, unknown> | undefined,
      output: part.output as Record<string, unknown> | undefined,
      toolCallId: part.toolCallId as string | undefined,
    }
  }
  if (part.type === "tool-invocation" && (part as { toolName?: string }).toolName === toolName) {
    const inv = part as { state?: string; input?: unknown; output?: unknown; toolCallId?: string }
    return {
      state: inv.state,
      input: inv.input as Record<string, unknown> | undefined,
      output: inv.output as Record<string, unknown> | undefined,
      toolCallId: inv.toolCallId,
    }
  }
  return null
}

/** Extract generic tool data for ToolStatus rendering */
export function extractGenericToolData(part: { type: string; [key: string]: unknown }) {
  let toolName: string
  let state: string
  let input: Record<string, unknown> | undefined
  let output: unknown
  let errorText: string | undefined

  if (part.type.startsWith("tool-") && part.type !== "tool-invocation") {
    toolName = part.type.slice(5)
    state = (part.state as string) ?? "input-available"
    input = part.input as Record<string, unknown> | undefined
    output = part.output
    errorText = part.errorText as string | undefined
  } else {
    const inv = part as { toolName?: string; state?: string; input?: Record<string, unknown>; output?: unknown; errorText?: string; args?: Record<string, unknown>; result?: unknown }
    toolName = inv.toolName ?? "unknown"
    state = inv.state ?? "input-available"
    input = inv.input ?? inv.args
    output = inv.output ?? inv.result
    errorText = inv.errorText
  }

  let inputDetail: string | undefined
  if (input) {
    if (typeof input.query === "string") inputDetail = input.query
    else if (typeof input.url === "string") inputDetail = input.url
    else if (typeof input.name === "string") inputDetail = input.name
    else if (typeof input.memory === "string") inputDetail = input.memory.length > 80 ? input.memory.slice(0, 80) + "\u2026" : input.memory
    else if (typeof input.libraryName === "string") inputDetail = input.libraryName
    else if (typeof input.libraryId === "string") inputDetail = input.libraryId
  }

  return { toolName, state, input, output, errorText, inputDetail }
}

// ---------------------------------------------------------------------------
// Individual renderers
// ---------------------------------------------------------------------------

function renderCreateArtifact(ctx: ToolRenderContext, key: string): ReactNode {
  const extracted = extractArtifactFromToolPart(ctx.part)
  if (!extracted) return null
  const { artifact } = extracted

  return (
    <ArtifactCard
      key={key}
      title={artifact.title}
      preview={artifact.content.slice(0, 120)}
      icon={artifactTypeToIcon(artifact.type)}
      isActive={
        ctx.selectedArtifact?.id === artifact.id ||
        (ctx.selectedArtifact?.title === artifact.title && !ctx.selectedArtifact?.id && !artifact.id)
      }
      onClick={() => ctx.onArtifactClick({
        id: artifact.id,
        title: artifact.title,
        content: artifact.content,
        type: artifact.type,
        language: artifact.language,
        version: artifact.version,
      })}
    />
  )
}

function renderAskUser(ctx: ToolRenderContext, key: string): ReactNode {
  // Support both typed and invocation fallback
  const part = ctx.part
  let data: { state?: string; input?: { questions?: unknown[] }; output?: Record<string, string | string[]>; toolCallId?: string } | null = null

  if (part.type === "tool-ask_user") {
    data = {
      state: part.state as string | undefined,
      input: part.input as { questions?: unknown[] } | undefined,
      output: part.output as Record<string, string | string[]> | undefined,
      toolCallId: part.toolCallId as string | undefined,
    }
  } else if (part.type === "tool-invocation" && (part as { toolName?: string }).toolName === "ask_user") {
    const inv = part as { state?: string; input?: unknown; output?: unknown; toolCallId?: string }
    data = {
      state: inv.state,
      input: inv.input as { questions?: unknown[] } | undefined,
      output: inv.output as Record<string, string | string[]> | undefined,
      toolCallId: inv.toolCallId,
    }
  }

  if (!data?.input?.questions) return null

  const questions = data.input.questions as Array<{
    question: string
    type: "single_select" | "multi_select" | "free_text"
    options?: string[]
  }>

  const isAnswered = data.state === "output-available" || data.state === "result"

  return (
    <AskUser
      key={key}
      questions={questions}
      isReadOnly={isAnswered}
      previousAnswers={isAnswered && data.output ? data.output : undefined}
      onSubmit={(answers) => {
        if (ctx.onToolResult && data?.toolCallId) {
          ctx.onToolResult(data.toolCallId, "ask_user", answers)
        }
      }}
    />
  )
}

function renderContentAlternatives(ctx: ToolRenderContext, key: string): ReactNode {
  const data = extractInlineToolData(ctx.part, "content_alternatives")
  const input = data?.input as { prompt?: string; alternatives?: Array<{ label: string; content: string }> } | undefined
  if (!data || !input?.alternatives) return null

  const isAnswered = data.state === "output-available" || data.state === "result"
  const output = data.output as { index?: number; feedback?: string } | undefined

  return (
    <ContentAlternatives
      key={key}
      prompt={input.prompt}
      alternatives={input.alternatives}
      isReadOnly={isAnswered}
      selectedIndex={isAnswered ? output?.index : undefined}
      previousFeedback={isAnswered ? output?.feedback : undefined}
      onSubmit={(selection) => {
        if (ctx.onToolResult && data.toolCallId) {
          ctx.onToolResult(data.toolCallId, "content_alternatives", selection)
        }
      }}
    />
  )
}

function renderCreateQuiz(ctx: ToolRenderContext, key: string): ReactNode {
  const data = extractInlineToolData(ctx.part, "create_quiz")
  if (!data) return null

  const input = data.input as { title?: string; description?: string; questions?: unknown[] } | undefined
  const output = data.output as { artifactId?: string; type?: string; version?: number; questionCount?: number } | undefined
  const quizTitle = input?.title ?? "Quiz"
  const questionCount = output?.questionCount ?? input?.questions?.length ?? 0
  const preview = `${questionCount} Frage${questionCount !== 1 ? "n" : ""}`

  return (
    <ArtifactCard
      key={key}
      title={quizTitle}
      preview={preview}
      icon={artifactTypeToIcon("quiz")}
      isActive={
        ctx.selectedArtifact?.id === output?.artifactId ||
        (ctx.selectedArtifact?.title === quizTitle && !ctx.selectedArtifact?.id && !output?.artifactId)
      }
      onClick={() => {
        const content = input?.questions
          ? JSON.stringify({ title: quizTitle, description: input.description, questions: (input.questions as Array<Record<string, unknown>>).map((q, idx) => ({ id: `q${idx + 1}`, ...q })) })
          : ""
        ctx.onArtifactClick({
          id: output?.artifactId,
          title: quizTitle,
          content,
          type: "quiz",
          version: output?.version,
        })
      }}
    />
  )
}

function renderCreateReview(ctx: ToolRenderContext, key: string): ReactNode {
  const data = extractInlineToolData(ctx.part, "create_review")
  if (!data) return null

  const input = data.input as { title?: string; content?: string } | undefined
  const output = data.output as { artifactId?: string; version?: number; reviewMode?: boolean } | undefined
  const reviewTitle = input?.title ?? "Review"

  return (
    <ArtifactCard
      key={key}
      title={reviewTitle}
      preview="Abschnitte zur Durchsicht"
      icon={artifactTypeToIcon("review")}
      isActive={
        ctx.selectedArtifact?.id === output?.artifactId ||
        (ctx.selectedArtifact?.title === reviewTitle && !ctx.selectedArtifact?.id && !output?.artifactId)
      }
      onClick={() => {
        ctx.onArtifactClick({
          id: output?.artifactId,
          title: reviewTitle,
          content: input?.content ?? "",
          type: "markdown",
          version: output?.version,
          reviewMode: true,
        })
      }}
    />
  )
}

function renderGenerateImage(ctx: ToolRenderContext, key: string): ReactNode {
  const data = extractInlineToolData(ctx.part, "generate_image")
  if (!data) return null

  const input = data.input as { title?: string; prompt?: string; aspectRatio?: string } | undefined
  const output = unwrapToolOutput<{ artifactId?: string; title?: string; version?: number }>(data.output)
  const imageTitle = output?.title ?? input?.title ?? "Generiertes Bild"
  const preview = input?.aspectRatio ? `Bild (${input.aspectRatio})` : "Generiertes Bild"

  return (
    <ArtifactCard
      key={key}
      title={imageTitle}
      preview={preview}
      icon={artifactTypeToIcon("image")}
      isActive={
        ctx.selectedArtifact?.id === output?.artifactId ||
        (ctx.selectedArtifact?.title === imageTitle && !ctx.selectedArtifact?.id && !output?.artifactId)
      }
      onClick={() => {
        ctx.onArtifactClick({
          id: output?.artifactId,
          title: imageTitle,
          content: "",
          type: "image",
          version: output?.version,
        })
      }}
    />
  )
}

function renderYouTubeSearch(ctx: ToolRenderContext, key: string): ReactNode {
  const data = extractInlineToolData(ctx.part, "youtube_search")
  if (!data) return null

  const isStreamingTool = data.state === "input-streaming" || data.state === "input-available"
  if (isStreamingTool) {
    return <YouTubeResultsSkeleton key={key} />
  }

  const output = unwrapToolOutput<{
    query?: string
    resultCount?: number
    videos?: YouTubeVideo[]
  }>(data.output)
  const input = data.input as { query?: string } | undefined
  const query = output?.query ?? input?.query ?? "YouTube"
  const videos = output?.videos ?? []

  return (
    <YouTubeResults
      key={key}
      query={query}
      videos={videos}
    />
  )
}

function renderGoogleSearch(ctx: ToolRenderContext, key: string): ReactNode {
  const data = extractInlineToolData(ctx.part, "google_search")
  if (!data) return null

  const isStreamingTool = data.state === "input-streaming" || data.state === "input-available"
  if (isStreamingTool) {
    return <SearchGroundingResultsSkeleton key={key} />
  }

  const output = unwrapToolOutput<{
    query?: string
    answer?: string
    sources?: GroundingSourceItem[]
    places?: GroundingPlaceItem[]
    error?: string
  }>(data.output)
  const input = data.input as { query?: string } | undefined
  const query = output?.query ?? input?.query ?? "Google Search"

  if (output?.error) {
    return (
      <div key={key} className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        {output.error}
      </div>
    )
  }

  if (!output?.answer) return null

  return (
    <SearchGroundingResults
      key={key}
      query={query}
      answer={output.answer}
      sources={output.sources ?? []}
      places={output.places ?? []}
    />
  )
}

function renderYouTubeAnalyze(ctx: ToolRenderContext, key: string): ReactNode {
  const data = extractInlineToolData(ctx.part, "youtube_analyze")
  if (!data) return null

  const input = data.input as { title?: string; url?: string; task?: string } | undefined
  const output = unwrapToolOutput<{ artifactId?: string; title?: string; version?: number }>(data.output)
  const analyzeTitle = output?.title ?? input?.title ?? "YouTube-Analyse"
  const taskLabel = input?.task === "transcribe" ? "Transkript" : input?.task === "analyze" ? "Analyse" : "Zusammenfassung"

  return (
    <ArtifactCard
      key={key}
      title={analyzeTitle}
      preview={taskLabel}
      icon={artifactTypeToIcon("markdown")}
      isActive={ctx.selectedArtifact?.id === output?.artifactId}
      onClick={() => {
        ctx.onArtifactClick({
          id: output?.artifactId,
          title: analyzeTitle,
          content: "",
          type: "markdown",
          version: output?.version,
        })
      }}
    />
  )
}

function renderTextToSpeech(ctx: ToolRenderContext, key: string): ReactNode {
  const data = extractInlineToolData(ctx.part, "text_to_speech")
  if (!data) return null

  const isStreamingTool = data.state === "input-streaming" || data.state === "input-available"
  if (isStreamingTool) {
    return <AudioPlayerSkeleton key={key} />
  }

  const output = unwrapToolOutput<AudioPlayerData & { error?: string }>(data.output)
  if (!output?.url) {
    if (output?.error) {
      return (
        <div key={key} className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {output.error}
        </div>
      )
    }
    return null
  }

  return (
    <AudioPlayer
      key={key}
      audio={output}
    />
  )
}

function renderExtractBranding(ctx: ToolRenderContext, key: string): ReactNode {
  const data = extractInlineToolData(ctx.part, "extract_branding")
  if (!data) return null

  const input = data.input as { url?: string; title?: string } | undefined
  const output = unwrapToolOutput<{ artifactId?: string; title?: string; domain?: string; version?: number }>(data.output)
  const domain = output?.domain ?? safeDomain(input?.url)
  const brandingTitle = output?.title ?? input?.title ?? `Branding: ${domain}`

  return (
    <ArtifactCard
      key={key}
      title={brandingTitle}
      preview={`Brand-Profil von ${domain}`}
      icon={artifactTypeToIcon("code")}
      isActive={ctx.selectedArtifact?.id === output?.artifactId}
      onClick={() => {
        ctx.onArtifactClick({
          id: output?.artifactId,
          title: brandingTitle,
          content: "",
          type: "code",
          language: "json",
          version: output?.version,
        })
      }}
    />
  )
}

function renderDeepResearch(ctx: ToolRenderContext, key: string): ReactNode {
  const data = extractInlineToolData(ctx.part, "deep_research")
  if (!data) return null
  const output = unwrapToolOutput<{ interactionId?: string; chatId?: string; query?: string; error?: string }>(data.output)
  if (output?.error) {
    return (
      <ToolStatus
        key={key}
        toolName="deep_research"
        state="output-error"
        input={data.input as Record<string, unknown> | undefined}
        errorText={output.error}
      />
    )
  }
  if (output?.interactionId) {
    return (
      <DeepResearchProgress
        key={key}
        interactionId={output.interactionId}
        chatId={output.chatId ?? ""}
        query={output.query ?? ""}
        onArtifactCreated={(artifactId) => {
          ctx.onArtifactClick({
            title: "Deep Research Report",
            content: "",
            type: "markdown",
            id: artifactId,
          })
        }}
      />
    )
  }
  return null
}

function renderCodeExecution(ctx: ToolRenderContext, key: string): ReactNode {
  const data = extractGenericToolData(ctx.part)
  const files = extractFileRefs(data.output)
  return (
    <div key={key} className="space-y-2">
      <ToolStatus
        toolName={data.toolName}
        state={data.state}
        input={data.input}
        output={data.output}
        errorText={data.errorText}
      />
      {files.map((file) => (
        <FileDownloadCard
          key={file.fileId}
          fileId={file.fileId}
          fileName={file.fileName}
          fileType={file.extension}
        />
      ))}
    </div>
  )
}

function renderSuggestMemory(ctx: ToolRenderContext, key: string): ReactNode {
  const data = extractInlineToolData(ctx.part, "suggest_memory")
  if (!data?.input) return null

  const input = data.input as { suggestions?: Array<{ memory: string; reason: string }> }
  if (!input.suggestions?.length) return null

  const isAnswered = data.state === "output-available" || data.state === "result"
  const rawOutput = data.output as { saved?: string[]; dismissed?: string[] } | undefined
  const previousResult = isAnswered && rawOutput
    ? { saved: rawOutput.saved ?? [], dismissed: rawOutput.dismissed ?? [] }
    : undefined

  return (
    <MemorySuggestion
      key={key}
      suggestions={input.suggestions}
      isReadOnly={isAnswered}
      previousResult={previousResult}
      onSubmit={(result) => {
        if (ctx.onToolResult && data.toolCallId) {
          ctx.onToolResult(data.toolCallId, "suggest_memory", result)
        }
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

type ToolRenderer = (ctx: ToolRenderContext, key: string) => ReactNode | null

const TOOL_RENDERERS: Record<string, ToolRenderer> = {
  create_artifact: renderCreateArtifact,
  ask_user: renderAskUser,
  content_alternatives: renderContentAlternatives,
  create_quiz: renderCreateQuiz,
  create_review: renderCreateReview,
  generate_image: renderGenerateImage,
  youtube_search: renderYouTubeSearch,
  google_search: renderGoogleSearch,
  youtube_analyze: renderYouTubeAnalyze,
  text_to_speech: renderTextToSpeech,
  extract_branding: renderExtractBranding,
  deep_research: renderDeepResearch,
  code_execution: renderCodeExecution,
  suggest_memory: renderSuggestMemory,
}

/**
 * Render a tool part by looking up its tool name in the registry.
 * Returns null if no renderer is registered for this tool.
 */
export function renderToolPart(toolName: string, ctx: ToolRenderContext, key: string): ReactNode | null {
  const renderer = TOOL_RENDERERS[toolName]
  if (!renderer) return null
  return renderer(ctx, key)
}

/**
 * Check if a tool name has a custom renderer registered.
 * Used to distinguish custom-rendered tools from generic ToolStatus tools.
 */
export function hasToolRenderer(toolName: string): boolean {
  return toolName in TOOL_RENDERERS
}
