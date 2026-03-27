"use client"

import { memo, useCallback, useRef, useState, useEffect } from "react"
import { CopyIcon, DownloadIcon, PencilIcon } from "lucide-react"

import {
  Message,
  MessageContent,
  MessageResponse,
  MessageToolbar,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message"
import { ArtifactCard } from "@/components/assistant/artifact-card"
import { artifactTypeToIcon } from "@/components/assistant/artifact-utils"
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning"
import { AskUser } from "@/components/generative-ui/ask-user"
import { ContentAlternatives } from "@/components/generative-ui/content-alternatives"
import { YouTubeResults, YouTubeResultsSkeleton, type YouTubeVideo } from "@/components/generative-ui/youtube-results"
import { AudioPlayer, AudioPlayerSkeleton, type AudioPlayerData } from "@/components/generative-ui/audio-player"
import { DeepResearchProgress } from "./deep-research-progress"
import { ToolStatus } from "./tool-status"
import { FileDownloadCard } from "./file-download-card"
import { MemoryIndicator } from "./memory-indicator"
import { MessageAttachments } from "./message-attachment"
import { isCreateArtifactPart, isGenerateImagePart, isYouTubeSearchPart, isYouTubeAnalyzePart, isTextToSpeechPart, isExtractBrandingPart, isGenerateDesignPart, isEditDesignPart, isCodeExecutionPart, extractArtifactFromToolPart } from "@/hooks/use-artifact"
import { extractFileRefs } from "@/lib/ai/anthropic-skills"
import { unwrapToolOutput } from "@/lib/ai/tool-output"
import { safeDomain } from "@/lib/url-validation"
import type { SelectedArtifact } from "@/hooks/use-artifact"

interface MessageMetadata {
  modelId?: string
  modelName?: string
  totalTokens?: number
  expertName?: string
  memories?: Array<{ text: string; score?: number }>
  privacyRoute?: "masked" | "eu" | "local"
}

interface ChatMessageProps {
  message: {
    id: string
    role: "user" | "system" | "assistant"
    parts?: Array<{ type: string; [key: string]: unknown }>
    metadata?: unknown
  }
  isLastMessage: boolean
  isStreaming: boolean
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
  onEdit?: (messageId: string, messageText: string) => void
}

/** Tools that have their own dedicated rendering (not shown as ToolStatus) */
const CUSTOM_RENDERED_TOOLS = new Set(["ask_user", "create_artifact", "create_quiz", "create_review", "content_alternatives", "generate_image", "extract_branding", "youtube_search", "text_to_speech", "generate_design", "edit_design", "code_execution", "deep_research"])

/** Check if a part is a generic tool part that should show a ToolStatus */
function isGenericToolPart(part: { type: string; [key: string]: unknown }): boolean {
  // AI SDK 6 typed tool parts: "tool-{toolName}"
  if (part.type.startsWith("tool-") && part.type !== "tool-invocation") {
    const toolName = part.type.slice(5) // strip "tool-"
    return !CUSTOM_RENDERED_TOOLS.has(toolName)
  }
  // tool-invocation fallback
  if (part.type === "tool-invocation") {
    const toolName = (part as { toolName?: string }).toolName
    return !!toolName && !CUSTOM_RENDERED_TOOLS.has(toolName)
  }
  // dynamic-tool: MCP tools and other dynamically registered tools
  if (part.type === "dynamic-tool") {
    const toolName = (part as { toolName?: string }).toolName
    return !!toolName && !CUSTOM_RENDERED_TOOLS.has(toolName)
  }
  return false
}

/** Extract tool name, state, input, output, and error from a generic tool part */
function extractGenericToolData(part: { type: string; [key: string]: unknown }) {
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
    // tool-invocation and dynamic-tool share the same shape
    const inv = part as { toolName?: string; state?: string; input?: Record<string, unknown>; output?: unknown; errorText?: string; args?: Record<string, unknown>; result?: unknown }
    toolName = inv.toolName ?? "unknown"
    state = inv.state ?? "input-available"
    input = inv.input ?? inv.args
    output = inv.output ?? inv.result
    errorText = inv.errorText
  }

  // Extract a human-readable detail from input for the header
  let inputDetail: string | undefined
  if (input) {
    if (typeof input.query === "string") inputDetail = input.query
    else if (typeof input.url === "string") inputDetail = input.url
    else if (typeof input.name === "string") inputDetail = input.name
    else if (typeof input.memory === "string") inputDetail = input.memory.length > 80 ? input.memory.slice(0, 80) + "…" : input.memory
    else if (typeof input.libraryName === "string") inputDetail = input.libraryName
    else if (typeof input.libraryId === "string") inputDetail = input.libraryId
  }

  return { toolName, state, input, output, errorText, inputDetail }
}

/** Check if a part is an ask_user tool part */
function isAskUserPart(part: { type: string; [key: string]: unknown }): boolean {
  return part.type === "tool-ask_user" || (part.type === "tool-invocation" && (part as { toolName?: string }).toolName === "ask_user")
}

/** Extract ask_user data from a tool part */
function extractAskUserData(part: { type: string; [key: string]: unknown }) {
  // AI SDK 6 typed tool parts
  if (part.type === "tool-ask_user") {
    const state = part.state as string | undefined
    const input = part.input as { questions?: unknown[] } | undefined
    const output = part.output as Record<string, string | string[]> | undefined
    const toolCallId = part.toolCallId as string | undefined
    return { state, input, output, toolCallId }
  }
  // tool-invocation fallback
  if (part.type === "tool-invocation") {
    const invocation = part as { toolName?: string; state?: string; input?: unknown; output?: unknown; toolCallId?: string }
    if (invocation.toolName === "ask_user") {
      return {
        state: invocation.state,
        input: invocation.input as { questions?: unknown[] } | undefined,
        output: invocation.output as Record<string, string | string[]> | undefined,
        toolCallId: invocation.toolCallId,
      }
    }
  }
  return null
}

/**
 * Generic helper for inline tool part detection and extraction.
 * Reusable for any tool that follows the typed-part pattern.
 */
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

/** Check if a part is a deep_research tool part */
function isDeepResearchPart(part: { type: string }): boolean {
  return part.type === "tool-deep_research" || (part.type === "tool-invocation" && (part as { toolName?: string }).toolName === "deep_research")
}

/** Check if a part is a content_alternatives tool part */
function isContentAlternativesPart(part: { type: string }): boolean {
  return part.type === "tool-content_alternatives"
}

/** Check if a part is a create_quiz tool part */
function isCreateQuizPart(part: { type: string }): boolean {
  return part.type === "tool-create_quiz"
}

/** Check if a part is a create_review tool part */
function isCreateReviewPart(part: { type: string }): boolean {
  return part.type === "tool-create_review"
}

export const ChatMessage = memo(function ChatMessage({
  message,
  isLastMessage,
  isStreaming,
  selectedArtifact,
  onArtifactClick,
  onToolResult,
  onEdit,
}: ChatMessageProps) {
  const isUser = message.role === "user"
  const meta = (message.metadata ?? undefined) as MessageMetadata | undefined
  const messageText = message.parts
    ?.filter((part): part is { type: string; text: string; [key: string]: unknown } => part.type === "text" && "text" in part)
    .map((part) => part.text)
    .join("") ?? ""

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(messageText).catch(() => {
      // Clipboard may not be available in insecure contexts
    })
  }, [messageText])

  const handleDownload = useCallback(() => {
    const blob = new Blob([messageText], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `message-${message.id}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [messageText, message.id])

  const handleEdit = useCallback(() => {
    if (onEdit && messageText) {
      onEdit(message.id, messageText)
    }
  }, [onEdit, message.id, messageText])

  return (
    <Message from={message.role}>
      {!isUser && (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm shadow-sm">
          ✦
        </div>
      )}
      <MessageContent>
        {isUser ? (
          <>
            <MessageAttachments
              messageId={message.id}
              parts={message.parts?.filter((part) => part.type === "file") ?? []}
            />
            {messageText && <CollapsibleText text={messageText} maxHeight={200} />}
            {onEdit && !isStreaming && messageText && (
              <MessageToolbar className="mt-1 opacity-0 transition-opacity group-hover:opacity-100">
                <MessageActions>
                  <MessageAction tooltip="Nachricht bearbeiten" onClick={handleEdit}>
                    <PencilIcon className="size-3" />
                  </MessageAction>
                </MessageActions>
              </MessageToolbar>
            )}
          </>
        ) : (
          <>
            {meta?.memories && meta.memories.length > 0 && (
              <MemoryIndicator memories={meta.memories} />
            )}
            {message.parts?.map((part, i) => {
              if (part.type === "reasoning") {
                const reasoningText = "text" in part ? String(part.text) : ""
                if (!reasoningText) return null
                return (
                  <Reasoning
                    key={`${message.id}-reasoning-${i}`}
                    className="w-full"
                    isStreaming={isStreaming && isLastMessage}
                  >
                    <ReasoningTrigger
                      getThinkingMessage={(streaming, duration) =>
                        streaming
                          ? "Denkt nach…"
                          : duration
                            ? `${duration}s nachgedacht`
                            : "Nachgedacht"
                      }
                    />
                    <ReasoningContent>{reasoningText}</ReasoningContent>
                  </Reasoning>
                )
              }
              if (part.type === "text") {
                return (
                  <MessageResponse
                    key={`${message.id}-text-${i}`}
                    className="chat-prose"
                    isAnimating={isStreaming && isLastMessage}
                  >
                    {"text" in part ? String(part.text) : ""}
                  </MessageResponse>
                )
              }
              if (isCreateArtifactPart(part)) {
                const extracted = extractArtifactFromToolPart(part)
                if (!extracted) return null
                const { artifact } = extracted

                return (
                  <ArtifactCard
                    key={`${message.id}-artifact-${i}`}
                    title={artifact.title}
                    preview={artifact.content.slice(0, 120)}
                    icon={artifactTypeToIcon(artifact.type)}
                    isActive={
                      selectedArtifact?.id === artifact.id ||
                      (selectedArtifact?.title === artifact.title && !selectedArtifact?.id && !artifact.id)
                    }
                    onClick={() => onArtifactClick({
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
              if (isAskUserPart(part)) {
                const data = extractAskUserData(part)
                if (!data?.input?.questions) return null

                const questions = data.input.questions as Array<{
                  question: string
                  type: "single_select" | "multi_select" | "free_text"
                  options?: string[]
                }>

                const isAnswered = data.state === "output-available" || data.state === "result"

                return (
                  <AskUser
                    key={`${message.id}-askuser-${i}`}
                    questions={questions}
                    isReadOnly={isAnswered}
                    previousAnswers={isAnswered && data.output ? data.output as Record<string, string | string[]> : undefined}
                    onSubmit={(answers) => {
                      if (onToolResult && data.toolCallId) {
                        onToolResult(data.toolCallId, "ask_user", answers)
                      }
                    }}
                  />
                )
              }
              if (isContentAlternativesPart(part)) {
                const data = extractInlineToolData(part, "content_alternatives")
                const input = data?.input as { prompt?: string; alternatives?: Array<{ label: string; content: string }> } | undefined
                if (!data || !input?.alternatives) return null

                const isAnswered = data.state === "output-available" || data.state === "result"
                const output = data.output as { index?: number; feedback?: string } | undefined

                return (
                  <ContentAlternatives
                    key={`${message.id}-alternatives-${i}`}
                    prompt={input.prompt}
                    alternatives={input.alternatives}
                    isReadOnly={isAnswered}
                    selectedIndex={isAnswered ? output?.index : undefined}
                    previousFeedback={isAnswered ? output?.feedback : undefined}
                    onSubmit={(selection) => {
                      if (onToolResult && data.toolCallId) {
                        onToolResult(data.toolCallId, "content_alternatives", selection)
                      }
                    }}
                  />
                )
              }
              if (isCreateQuizPart(part)) {
                const data = extractInlineToolData(part, "create_quiz")
                if (!data) return null

                // Quiz uses the artifact system — render as ArtifactCard
                const input = data.input as { title?: string; questions?: unknown[] } | undefined
                const output = data.output as { artifactId?: string; type?: string; version?: number; questionCount?: number } | undefined
                const quizTitle = input?.title ?? "Quiz"
                const questionCount = output?.questionCount ?? input?.questions?.length ?? 0
                const preview = `${questionCount} Frage${questionCount !== 1 ? "n" : ""}`

                return (
                  <ArtifactCard
                    key={`${message.id}-quiz-${i}`}
                    title={quizTitle}
                    preview={preview}
                    icon={artifactTypeToIcon("quiz")}
                    isActive={
                      selectedArtifact?.id === output?.artifactId ||
                      (selectedArtifact?.title === quizTitle && !selectedArtifact?.id && !output?.artifactId)
                    }
                    onClick={() => {
                      // Build content from input for streaming, or fetch from DB via artifact click
                      const content = input?.questions
                        ? JSON.stringify({ title: quizTitle, description: (input as { description?: string }).description, questions: (input.questions as Array<Record<string, unknown>>).map((q, idx) => ({ id: `q${idx + 1}`, ...q })) })
                        : ""
                      onArtifactClick({
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
              if (isCreateReviewPart(part)) {
                const data = extractInlineToolData(part, "create_review")
                if (!data) return null

                const input = data.input as { title?: string; content?: string } | undefined
                const output = data.output as { artifactId?: string; version?: number; reviewMode?: boolean } | undefined
                const reviewTitle = input?.title ?? "Review"

                return (
                  <ArtifactCard
                    key={`${message.id}-review-${i}`}
                    title={reviewTitle}
                    preview="Abschnitte zur Durchsicht"
                    icon={artifactTypeToIcon("review")}
                    isActive={
                      selectedArtifact?.id === output?.artifactId ||
                      (selectedArtifact?.title === reviewTitle && !selectedArtifact?.id && !output?.artifactId)
                    }
                    onClick={() => {
                      onArtifactClick({
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
              if (isGenerateImagePart(part)) {
                const data = extractInlineToolData(part, "generate_image")
                if (!data) return null

                const input = data.input as { title?: string; prompt?: string; aspectRatio?: string } | undefined
                const output = unwrapToolOutput<{ artifactId?: string; title?: string; version?: number }>(data.output)
                const imageTitle = output?.title ?? input?.title ?? "Generiertes Bild"
                const preview = input?.aspectRatio ? `Bild (${input.aspectRatio})` : "Generiertes Bild"

                return (
                  <ArtifactCard
                    key={`${message.id}-image-${i}`}
                    title={imageTitle}
                    preview={preview}
                    icon={artifactTypeToIcon("image")}
                    isActive={
                      selectedArtifact?.id === output?.artifactId ||
                      (selectedArtifact?.title === imageTitle && !selectedArtifact?.id && !output?.artifactId)
                    }
                    onClick={() => {
                      onArtifactClick({
                        id: output?.artifactId,
                        title: imageTitle,
                        content: "", // Fetched from DB via artifact click handler
                        type: "image",
                        version: output?.version,
                      })
                    }}
                  />
                )
              }
              if (isYouTubeSearchPart(part)) {
                const data = extractInlineToolData(part, "youtube_search")
                if (!data) return null

                const isStreaming = data.state === "input-streaming" || data.state === "input-available"
                if (isStreaming) {
                  return <YouTubeResultsSkeleton key={`${message.id}-yt-search-${i}`} />
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
                    key={`${message.id}-yt-search-${i}`}
                    query={query}
                    videos={videos}
                  />
                )
              }
              if (isYouTubeAnalyzePart(part)) {
                const data = extractInlineToolData(part, "youtube_analyze")
                if (!data) return null

                const input = data.input as { title?: string; url?: string; task?: string } | undefined
                const output = unwrapToolOutput<{ artifactId?: string; title?: string; version?: number }>(data.output)
                const analyzeTitle = output?.title ?? input?.title ?? "YouTube-Analyse"
                const taskLabel = input?.task === "transcribe" ? "Transkript" : input?.task === "analyze" ? "Analyse" : "Zusammenfassung"

                return (
                  <ArtifactCard
                    key={`${message.id}-yt-analyze-${i}`}
                    title={analyzeTitle}
                    preview={taskLabel}
                    icon={artifactTypeToIcon("markdown")}
                    isActive={selectedArtifact?.id === output?.artifactId}
                    onClick={() => {
                      onArtifactClick({
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
              if (isTextToSpeechPart(part)) {
                const data = extractInlineToolData(part, "text_to_speech")
                if (!data) return null

                const isStreaming = data.state === "input-streaming" || data.state === "input-available"
                if (isStreaming) {
                  return <AudioPlayerSkeleton key={`${message.id}-tts-${i}`} />
                }

                const output = unwrapToolOutput<AudioPlayerData & { error?: string }>(data.output)
                if (!output?.url) {
                  if (output?.error) {
                    return (
                      <div key={`${message.id}-tts-${i}`} className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                        {output.error}
                      </div>
                    )
                  }
                  return null
                }

                return (
                  <AudioPlayer
                    key={`${message.id}-tts-${i}`}
                    audio={output}
                  />
                )
              }
              if (isExtractBrandingPart(part)) {
                const data = extractInlineToolData(part, "extract_branding")
                if (!data) return null

                const input = data.input as { url?: string; title?: string } | undefined
                const output = unwrapToolOutput<{ artifactId?: string; title?: string; domain?: string; version?: number }>(data.output)
                const domain = output?.domain ?? safeDomain(input?.url)
                const brandingTitle = output?.title ?? input?.title ?? `Branding: ${domain}`

                return (
                  <ArtifactCard
                    key={`${message.id}-branding-${i}`}
                    title={brandingTitle}
                    preview={`Brand-Profil von ${domain}`}
                    icon={artifactTypeToIcon("code")}
                    isActive={selectedArtifact?.id === output?.artifactId}
                    onClick={() => {
                      onArtifactClick({
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
              if (isGenerateDesignPart(part) || isEditDesignPart(part)) {
                const toolName = isGenerateDesignPart(part) ? "generate_design" : "edit_design"
                const data = extractInlineToolData(part, toolName)
                if (!data) return null

                const input = data.input as { title?: string; prompt?: string } | undefined
                const output = unwrapToolOutput<{ artifactId?: string; title?: string; version?: number; error?: string }>(data.output)
                if (output?.error) return null
                const designTitle = output?.title ?? input?.title ?? "UI Design"

                return (
                  <ArtifactCard
                    key={`${message.id}-design-${i}`}
                    title={designTitle}
                    preview={isEditDesignPart(part) ? "Design-Iteration" : "Stitch Design"}
                    icon={artifactTypeToIcon("html")}
                    isActive={selectedArtifact?.id === output?.artifactId}
                    onClick={() => {
                      onArtifactClick({
                        id: output?.artifactId,
                        title: designTitle,
                        content: "",
                        type: "html",
                        version: output?.version,
                      })
                    }}
                  />
                )
              }
              if (isDeepResearchPart(part)) {
                const data = extractInlineToolData(part, "deep_research")
                if (!data) return null
                const output = unwrapToolOutput<{ interactionId?: string; chatId?: string; query?: string; error?: string }>(data.output)
                // Show error if tool failed to start
                if (output?.error) {
                  return (
                    <ToolStatus
                      key={`${message.id}-deepresearch-${i}`}
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
                      key={`${message.id}-deepresearch-${i}`}
                      interactionId={output.interactionId}
                      chatId={output.chatId ?? ""}
                      query={output.query ?? ""}
                      onArtifactCreated={(artifactId) => {
                        onArtifactClick({
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
              if (isCodeExecutionPart(part)) {
                const data = extractGenericToolData(part)
                const files = extractFileRefs(data.output)
                return (
                  <div key={`${message.id}-codeexec-${i}`} className="space-y-2">
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
              if (isGenericToolPart(part)) {
                const { toolName, state, input, output, errorText, inputDetail } = extractGenericToolData(part)
                return (
                  <ToolStatus
                    key={`${message.id}-tool-${i}`}
                    toolName={toolName}
                    state={state}
                    input={input}
                    output={output}
                    errorText={errorText}
                    inputDetail={inputDetail}
                  />
                )
              }
              return null
            })}
          </>
        )}
      </MessageContent>
      {!isUser && !(isStreaming && isLastMessage) && (
        <MessageToolbar className="mt-1 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {meta?.privacyRoute && (
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                {meta.privacyRoute === "eu" ? "EU-Modell" : meta.privacyRoute === "local" ? "Lokal" : "Maskiert"}
              </span>
            )}
            {meta?.expertName && <span className="text-primary">{meta.expertName}</span>}
            {meta?.modelName && <span>{meta.modelName}</span>}
          </div>
          <MessageActions>
            <MessageAction tooltip="Kopieren" onClick={handleCopy}>
              <CopyIcon className="size-3" />
            </MessageAction>
            <MessageAction tooltip="Als Markdown herunterladen" onClick={handleDownload}>
              <DownloadIcon className="size-3" />
            </MessageAction>
          </MessageActions>
        </MessageToolbar>
      )}
    </Message>
  )
})

/** Collapsible text for long user messages */
function CollapsibleText({ text, maxHeight }: { text: string; maxHeight: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setIsOverflowing(el.scrollHeight > maxHeight)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [maxHeight])

  return (
    <div className="relative">
      <div
        ref={ref}
        className="whitespace-pre-wrap transition-[max-height] duration-200"
        style={!isExpanded && isOverflowing ? { maxHeight, overflow: "hidden" } : undefined}
      >
        {text}
      </div>
      {isOverflowing && !isExpanded && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center h-12 bg-gradient-to-t from-background to-transparent">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors pb-1"
            onClick={() => setIsExpanded(true)}
          >
            Mehr anzeigen
          </button>
        </div>
      )}
      {isOverflowing && isExpanded && (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
          onClick={() => setIsExpanded(false)}
        >
          Weniger anzeigen
        </button>
      )}
    </div>
  )
}
