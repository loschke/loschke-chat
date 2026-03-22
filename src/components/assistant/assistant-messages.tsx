"use client"

import { memo } from "react"
import type { UIMessage, ChatStatus, SourceUrlUIPart } from "ai"

import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
} from "@/components/ai-elements/attachments"
import { getStatusBadge, type ToolPart } from "./tool"
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "./reasoning"
import type { ExpertConfig } from "@/lib/assistant/types"
import type { OutputFormat, ArtifactContentType } from "@/types/artifact"
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/components/ai-elements/sources"
import { ArtifactCard } from "./artifact-card"
import { SkillProgress } from "./skill-progress"
import {
  extractArtifactTitle,
  extractArtifactPreview,
  extractChatSummary,
  extractCodeExecutionFileId,
  fetchCodeExecutionFile,
} from "./artifact-utils"

const WEB_TOOL_LABELS: Record<string, string> = {
  web_search: "Websuche",
  web_fetch: "Seite abrufen",
  code_execution: "Code ausfuehren",
}

interface AssistantMessagesProps {
  messages: UIMessage[]
  turnExperts: string[]
  turnFormats: (string | null)[]
  turnThinking: boolean[]
  expertsMap: Map<string, ExpertConfig>
  formatsMap: Map<string, OutputFormat>
  currentExpert: ExpertConfig | undefined
  status: ChatStatus
  activeArtifactMessageId: string | null
  onOpenArtifact: (messageId: string, content: string, contentType?: ArtifactContentType) => void
}

// ⚡ Bolt: memoized to prevent re-rendering the entire message list
// on every keystroke in the chat input or during streaming updates.
// This significantly improves responsiveness for long conversations.
export const AssistantMessages = memo(function AssistantMessages({
  messages,
  turnExperts,
  turnFormats,
  turnThinking,
  expertsMap,
  formatsMap,
  currentExpert,
  status,
  activeArtifactMessageId,
  onOpenArtifact,
}: AssistantMessagesProps) {
  let turnIndex = -1

  return (
    <>
      {messages.map((message) => {
        const isUser = message.role === "user"
        if (isUser) turnIndex++

        const turnExpertSlug = turnExperts[turnIndex]
        const turnExpert = turnExpertSlug
          ? expertsMap.get(turnExpertSlug)
          : currentExpert

        const textContent =
          message.parts
            ?.filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("") ?? ""

        const userFileParts = isUser
          ? message.parts?.filter((part) => part.type === "file") ?? []
          : []

        // Determine format for this turn
        const turnFormatId = turnFormats[turnIndex]
        const turnFormat = turnFormatId ? formatsMap.get(turnFormatId) : null

        // Collect source-url parts for web search citations
        const sourceParts = !isUser
          ? (message.parts?.filter((p) => p.type === "source-url") as SourceUrlUIPart[] ?? [])
          : []

        // For HTML formats, check for code execution file output
        const hasCodeExecutionFile = !isUser && turnFormat?.contentType === "html"
          ? !!extractCodeExecutionFileId(message.parts)
          : false

        return (
          <Message from={message.role} key={message.id}>
            {!isUser && turnExpert && (
              <div className="bg-primary/10 flex size-7 shrink-0 items-center justify-center rounded-full text-sm">
                {turnExpert.emoji}
              </div>
            )}
            <MessageContent>
              {isUser ? (
                <>
                  {userFileParts.length > 0 && (
                    <Attachments variant="inline">
                      {userFileParts.map((part, i) => (
                        <Attachment
                          key={`${message.id}-file-${i}`}
                          data={{
                            ...part,
                            id: `${message.id}-file-${i}`,
                          }}
                        >
                          <AttachmentPreview />
                          <AttachmentInfo />
                        </Attachment>
                      ))}
                    </Attachments>
                  )}
                  {textContent && (
                    <p className="whitespace-pre-wrap">{textContent}</p>
                  )}
                </>
              ) : turnFormat?.contentType === "markdown" ? (
                // Markdown format: summary + artifact card
                <>
                  <MessageResponse className="chat-prose">
                    {extractChatSummary(textContent)}
                  </MessageResponse>
                  <ArtifactCard
                    title={extractArtifactTitle(textContent)}
                    preview={extractArtifactPreview(textContent)}
                    icon={turnFormat.icon}
                    isActive={activeArtifactMessageId === message.id}
                    onClick={() => onOpenArtifact(message.id, textContent, "markdown")}
                  />
                  {sourceParts.length > 0 && (
                    <Sources>
                      <SourcesTrigger count={sourceParts.length} />
                      <SourcesContent>
                        {sourceParts.map((part, i) => (
                          <Source
                            key={`${message.id}-source-${i}`}
                            href={part.url}
                            title={part.title || part.url}
                          />
                        ))}
                      </SourcesContent>
                    </Sources>
                  )}
                </>
              ) : turnFormat?.contentType === "html" ? (
                // HTML format: text parts inline + skill progress / artifact card
                (() => {
                  const isLastMsg = message.id === messages[messages.length - 1]?.id
                  const isStreaming = status === "streaming" && isLastMsg

                  // Collect code_execution tool parts for progress display
                  const codeExecParts = (message.parts ?? []).filter(
                    (p) => p.type.startsWith("tool-") && p.type.slice(5) === "code_execution"
                  )
                  const isCodeExecRunning = codeExecParts.some((p) => {
                    const state = (p as unknown as ToolPart).state
                    return state !== "output-available" && state !== "output-error" && state !== "output-denied"
                  })
                  const showProgress = isStreaming && codeExecParts.length > 0 && !hasCodeExecutionFile

                  return (
                    <>
                      {message.parts?.map((part, i) => {
                        if (part.type === "text") {
                          return (
                            <MessageResponse
                              key={`${message.id}-${i}`}
                              className="chat-prose"
                              isAnimating={isStreaming}
                            >
                              {part.text}
                            </MessageResponse>
                          )
                        }
                        // Hide tool parts in HTML format — shown via SkillProgress instead
                        if (part.type.startsWith("tool-")) return null
                        if (part.type === "file") return null
                        if (part.type === "reasoning") return null
                        if (part.type === "source-url") return null
                        return null
                      })}
                      {showProgress && (
                        <SkillProgress
                          label={turnFormat.label}
                          icon={turnFormat.icon}
                          isRunning={isCodeExecRunning}
                        />
                      )}
                      {hasCodeExecutionFile && (
                        <ArtifactCard
                          title={turnFormat.label}
                          preview={turnFormat.description}
                          icon={turnFormat.icon}
                          isActive={activeArtifactMessageId === message.id}
                          onClick={() => {
                            const fileId = extractCodeExecutionFileId(message.parts)
                            if (fileId) {
                              fetchCodeExecutionFile(fileId).then((html) => {
                                if (html) onOpenArtifact(message.id, html, "html")
                              })
                            }
                          }}
                        />
                      )}
                      {sourceParts.length > 0 && (
                        <Sources>
                          <SourcesTrigger count={sourceParts.length} />
                          <SourcesContent>
                            {sourceParts.map((part, i) => (
                              <Source
                                key={`${message.id}-source-${i}`}
                                href={part.url}
                                title={part.title || part.url}
                              />
                            ))}
                          </SourcesContent>
                        </Sources>
                      )}
                    </>
                  )
                })()
              ) : (
                // Default: no format, full inline rendering
                <>
                  {turnThinking[turnIndex] && (() => {
                    const reasoningParts = message.parts?.filter(
                      (p) => p.type === "reasoning"
                    ) ?? []
                    const reasoningText = reasoningParts
                      .map((p) => (p as { type: "reasoning"; text: string }).text)
                      .join("\n\n")
                    if (!reasoningText) return null
                    const isLastMsg =
                      message.id === messages[messages.length - 1]?.id
                    const lastPart = message.parts?.[message.parts.length - 1]
                    const isReasoningStreaming =
                      status === "streaming" &&
                      isLastMsg &&
                      lastPart?.type === "reasoning"
                    return (
                      <Reasoning isStreaming={isReasoningStreaming}>
                        <ReasoningTrigger />
                        <ReasoningContent>{reasoningText}</ReasoningContent>
                      </Reasoning>
                    )
                  })()}
                  {message.parts?.map((part, i) => {
                    if (part.type === "text") {
                      return (
                        <MessageResponse
                          key={`${message.id}-${i}`}
                          className="chat-prose"
                          isAnimating={
                            status === "streaming" &&
                            message.id === messages[messages.length - 1]?.id
                          }
                        >
                          {part.text}
                        </MessageResponse>
                      )
                    }

                    if (part.type.startsWith("tool-")) {
                      const toolPart = part as unknown as ToolPart
                      const toolName = part.type.slice(5)
                      return (
                        <div
                          key={`${message.id}-tool-${i}`}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <span>{WEB_TOOL_LABELS[toolName] ?? toolName}</span>
                          {getStatusBadge(toolPart.state)}
                        </div>
                      )
                    }

                    if (part.type === "reasoning") return null
                    if (part.type === "source-url") return null

                    return null
                  })}
                  {sourceParts.length > 0 && (
                    <Sources>
                      <SourcesTrigger count={sourceParts.length} />
                      <SourcesContent>
                        {sourceParts.map((part, i) => (
                          <Source
                            key={`${message.id}-source-${i}`}
                            href={part.url}
                            title={part.title || part.url}
                          />
                        ))}
                      </SourcesContent>
                    </Sources>
                  )}
                </>
              )}
            </MessageContent>
          </Message>
        )
      })}
      {status === "submitted" &&
        messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2">
            <div className="bg-primary/10 flex size-7 shrink-0 items-center justify-center rounded-full text-sm">
              {currentExpert?.emoji}
            </div>
            <div className="bg-muted flex items-center gap-1 rounded-2xl rounded-bl-md px-4 py-3">
              <span className="bg-muted-foreground/40 size-1.5 animate-bounce rounded-full [animation-delay:0ms]" />
              <span className="bg-muted-foreground/40 size-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
              <span className="bg-muted-foreground/40 size-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
            </div>
          </div>
        )}
    </>
  )
})
