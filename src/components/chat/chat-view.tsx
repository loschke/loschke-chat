"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import type { ChatStatus } from "ai"
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai"

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  PromptInput,
  PromptInputBody,
  PromptInputHeader,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  AttachmentRemove,
} from "@/components/ai-elements/attachments"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PlusIcon, Users } from "lucide-react"
import { ArtifactPanel } from "@/components/assistant/artifact-panel"
import { ChatEmptyState } from "./chat-empty-state"
import { ChatMessage } from "./chat-message"
import { ArtifactErrorBoundary } from "./artifact-error-boundary"
import { SpeechButton } from "./speech-button"
import { SuggestedReplies } from "./suggested-replies"
import { ExpertSwitchPopover } from "./expert-switch-popover"
import { ExpertSwitchDivider } from "./expert-switch-divider"
import { useArtifact, mapSavedPartsToUI } from "@/hooks/use-artifact"
import { useResizeHandle } from "@/hooks/use-resize-handle"
import type { QuizDefinition, QuizResults } from "@/types/quiz"
import type { SectionFeedback } from "@/types/review"
import { DropZoneOverlay } from "./drop-zone-overlay"
import { FilePrivacyNotice } from "./file-privacy-notice"
import { BusinessModePiiDialog } from "./business-mode-pii-dialog"
import { BusinessModeFileDialog } from "./business-mode-file-dialog"
import { useBusinessMode, type PrivacyRoute, isPrivacyRouteAction } from "@/hooks/use-business-mode"
import { SessionWrapupPopover } from "./session-wrapup-popover"
import { SafeChatPopover } from "./safe-chat-popover"
import { useProject } from "./project-context"
import { useExpert } from "./expert-context"
import { EXPERT_ICON_MAP, DEFAULT_EXPERT_ICON } from "@/lib/icon-map"
import { chatConfig } from "@/config/chat"
import { features } from "@/config/features"
import { getErrorMessage } from "@/lib/errors"
import { WRAPUP_TYPES } from "@/config/wrapup"

interface ChatViewProps {
  chatId?: string
  initialModelId?: string
  initialProjectId?: string
  initialArtifactId?: string
  userName?: string
  ttsEnabled?: boolean
  memoryEnabled?: boolean
}

export function ChatView({ chatId, initialModelId, initialProjectId, initialArtifactId, userName, ttsEnabled, memoryEnabled }: ChatViewProps) {
  const [input, setInput] = useState("")
  const [initialMessagesLoaded, setInitialMessagesLoaded] = useState(!chatId)
  const [modelId, setModelId] = useState(initialModelId ?? "")
  const [expertId, setExpertId] = useState<string | null>(null)
  const { setProject } = useProject()
  const { expertName, expertIcon, setExpert } = useExpert()
  const [modelMeta, setModelMeta] = useState<{ provider?: string; region?: "eu" | "us" } | null>(null)
  const [hasAttachedFiles, setHasAttachedFiles] = useState(false)
  const [creditError, setCreditError] = useState<string | null>(null)
  const [suggestedRepliesEnabled, setSuggestedRepliesEnabled] = useState(true)
  const [readOnly, setReadOnly] = useState(false)
  const [sharedByName, setSharedByName] = useState<string | null>(null)
  const projectIdRef = useRef<string | null>(initialProjectId ?? null)
  const quicktaskRef = useRef<{ slug: string; data: Record<string, string> } | null>(null)
  const navigatedRef = useRef(false)
  const currentChatIdRef = useRef(chatId)
  const modelIdRef = useRef(modelId)
  const expertIdRef = useRef(expertId)
  const privacyRouteRef = useRef<PrivacyRoute | undefined>(undefined)
  const wrapupRef = useRef<{ type: string; context?: string; format?: "text" | "audio" } | null>(null)

  // Business Mode — PII detection + file consent
  const businessMode = useBusinessMode()

  // Lock SafeChat for existing chats (cannot toggle mid-conversation)
  useEffect(() => {
    if (chatId) businessMode.safeChat.lock()
  }, [chatId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep refs in sync with state
  modelIdRef.current = modelId
  expertIdRef.current = expertId

  // Set or clear project context based on URL
  useEffect(() => {
    if (initialProjectId) {
      projectIdRef.current = initialProjectId
      fetch(`/api/projects/${initialProjectId}`)
        .then((res) => res.ok ? res.json() : null)
        .then((project) => {
          if (project) setProject(initialProjectId, project.name)
        })
        .catch((e) => console.warn("[chat-view]", getErrorMessage(e)))
    } else if (!chatId) {
      // New chat without project — clear context
      projectIdRef.current = null
      setProject(null, null)
      setExpert(null, null, null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProjectId, chatId])

  // Cached models data shared between default model resolution and metadata lookup
  const modelsDataRef = useRef<{ models: Array<{ id: string; provider: string; region: string; isDefault: boolean }> } | null>(null)

  // Load user default model + models data in a single parallel fetch
  useEffect(() => {
    if (modelId) {
      // Model already set — only need models data for business mode metadata
      if (features.businessMode.enabled && !modelMeta) {
        const cached = modelsDataRef.current
        if (cached) {
          const m = cached.models?.find((m) => m.id === modelId)
          if (m) {
            const region = m.region === "eu" || m.region === "us" ? m.region : undefined
            setModelMeta({ provider: m.provider, region })
          }
        } else {
          fetch("/api/models")
            .then((res) => res.ok ? res.json() : null)
            .then((data) => {
              if (!data) return
              modelsDataRef.current = data
              const m = data.models?.find((m: { id: string }) => m.id === modelId)
              if (m) {
                const region = m.region === "eu" || m.region === "us" ? m.region : undefined
                setModelMeta({ provider: m.provider, region })
              }
            })
            .catch((e) => console.warn("[chat-view]", getErrorMessage(e)))
        }
      }
      return
    }
    async function loadDefaults() {
      try {
        // Parallel fetch: user preferences + models
        const [instrRes, modelsRes] = await Promise.all([
          fetch("/api/user/instructions"),
          fetch("/api/models"),
        ])

        // Cache models data
        let modelsData = null
        if (modelsRes.ok) {
          modelsData = await modelsRes.json()
          modelsDataRef.current = modelsData
        }

        // Resolve default model + SafeChat preference
        if (instrRes.ok) {
          const data = await instrRes.json()
          if (data.suggestedRepliesEnabled !== undefined) {
            setSuggestedRepliesEnabled(data.suggestedRepliesEnabled)
          }
          if (data.safeChatEnabled !== undefined) {
            businessMode.initSafeChatPreference(data.safeChatEnabled)
          }
          if (data.defaultModelId) {
            setModelId(data.defaultModelId)
            // Set model metadata from already-fetched models
            if (features.businessMode.enabled && modelsData) {
              const m = modelsData.models?.find((m: { id: string }) => m.id === data.defaultModelId)
              if (m) {
                const region = m.region === "eu" || m.region === "us" ? m.region : undefined
                setModelMeta({ provider: m.provider, region })
              }
            }
            return
          }
        }

        // Fallback: use system default from models API
        if (modelsData) {
          const defaultModel = modelsData.models?.find((m: { isDefault: boolean }) => m.isDefault)
          if (defaultModel) {
            setModelId(defaultModel.id)
            if (features.businessMode.enabled) {
              const region = defaultModel.region === "eu" || defaultModel.region === "us" ? defaultModel.region : undefined
              setModelMeta({ provider: defaultModel.provider, region })
            }
          }
        }
      } catch {
        // Will use server default
      }
    }
    loadDefaults()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId])

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, body }) => {
          const qt = quicktaskRef.current
          const pr = privacyRouteRef.current
          const wu = wrapupRef.current
          // Clear one-shot refs after reading (prevents stale data on next message)
          quicktaskRef.current = null
          privacyRouteRef.current = undefined
          wrapupRef.current = null
          return {
            body: {
              ...body,
              messages,
              chatId: currentChatIdRef.current ?? chatId,
              modelId: modelIdRef.current,
              ...(expertIdRef.current && { expertId: expertIdRef.current }),
              ...(projectIdRef.current && { projectId: projectIdRef.current }),
              ...(qt && { quicktaskSlug: qt.slug, quicktaskData: qt.data }),
              ...(pr && { privacyRoute: pr }),
              ...(wu && { wrapupType: wu.type, wrapupContext: wu.context, ...(wu.format === "audio" && { wrapupFormat: wu.format }) }),
            },
          }
        },
      }),
    [chatId]
  )

  const {
    messages,
    sendMessage,
    addToolOutput,
    status,
    setMessages,
    stop,
  } = useChat({
    transport,
    id: chatId ?? "new",
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onError: (error) => {
      // Detect 403 User Not Approved — redirect to pending page
      if (error?.message?.includes("USER_NOT_APPROVED")) {
        window.location.href = "/pending-approval"
        return
      }
      // Detect 402 Payment Required (credits exhausted)
      if (error?.message?.includes("402") || (error as { status?: number })?.status === 402) {
        setCreditError("Dein Credit-Guthaben ist aufgebraucht. Bitte wende dich an den Administrator.")
      }
    },
    onFinish: ({ message }) => {
      // Navigate to chat URL for new chats using chatId from message metadata
      const meta = message.metadata as { chatId?: string; projectId?: string; projectName?: string; expertId?: string; expertName?: string } | undefined
      if (meta?.chatId && !chatId && !navigatedRef.current) {
        navigatedRef.current = true
        currentChatIdRef.current = meta.chatId
        window.history.replaceState(null, "", `/c/${meta.chatId}`)
        window.dispatchEvent(new CustomEvent("chat-updated"))
      }
      // Set project context from metadata
      if (meta?.projectId) {
        setProject(meta.projectId, meta.projectName ?? null)
      }
      // Set expert context from metadata
      if (meta?.expertId) {
        setExpert(meta.expertId, meta.expertName ?? null, null)
      }
    },
  })

  // Artifact state management (extracted hook)
  const {
    selectedArtifact,
    handleArtifactCardClick,
    handleArtifactSave,
    closeArtifact,
    openArtifactById,
  } = useArtifact({ messages, status })

  // Load existing messages when chatId is provided
  useEffect(() => {
    if (!chatId) return

    const controller = new AbortController()

    async function loadChat() {
      try {
        const res = await fetch(`/api/chats/${chatId}?limit=50`, { signal: controller.signal })
        if (!res.ok) return
        const data = await res.json()

        if (data.messages) {
          const uiMessages = data.messages.map((msg: { id: string; role: string; parts: unknown[]; metadata?: unknown }) => {
            const parts = mapSavedPartsToUI(msg.parts)
            return {
              id: msg.id,
              role: msg.role,
              parts,
              content: "",
              metadata: msg.metadata ?? undefined,
            }
          })
          setMessages(uiMessages)
        }

        if (data.modelId) setModelId(data.modelId)
        if (data.expertId) {
          setExpertId(data.expertId)
          // Use enriched data from API response (no extra fetch needed)
          if (data.expertName) {
            setExpert(data.expertId, data.expertName, data.expertIcon ?? null)
          }
        }
        if (data.projectId) {
          projectIdRef.current = data.projectId
          if (data.projectName) {
            const isShared = data.accessVia === "project_member"
            setProject(data.projectId, data.projectName, isShared)
          }
        }
        // Collaboration: read-only mode for shared chats
        if (data.readOnly) {
          setReadOnly(true)
        }
        if (data.accessVia === "chat_share") {
          // Find owner name from enriched response or sharedWithMe data
          setSharedByName(data.ownerName ?? null)
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
      } finally {
        if (!controller.signal.aborted) setInitialMessagesLoaded(true)
      }
    }

    loadChat()
    return () => controller.abort()
  }, [chatId, setMessages])

  // Deep-link: open artifact panel when initialArtifactId is provided
  useEffect(() => {
    if (initialArtifactId && initialMessagesLoaded) {
      openArtifactById(initialArtifactId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialArtifactId, initialMessagesLoaded])

  const handleExpertSelect = useCallback(
    (newExpertId: string | null, expertName?: string, expertIcon?: string | null) => {
      setExpertId(newExpertId)
      setExpert(newExpertId, expertName ?? null, expertIcon ?? null)
    },
    [setExpert]
  )

  const handleStop = useCallback(() => {
    stop()
    // Clean up incomplete tool calls so the next request doesn't fail with missing tool results
    setMessages(prev => {
      const lastMsg = prev[prev.length - 1]
      if (!lastMsg || lastMsg.role !== "assistant") return prev

      const hasIncompleteTools = lastMsg.parts.some(part => {
        if ("state" in part && "toolCallId" in part) {
          return part.state !== "output-available" && part.state !== "output-error" && part.state !== "output-denied"
        }
        return false
      })

      if (!hasIncompleteTools) return prev

      const cleanParts = lastMsg.parts.filter(part => {
        if ("state" in part && "toolCallId" in part) {
          return part.state === "output-available" || part.state === "output-error" || part.state === "output-denied"
        }
        return true
      })

      const updated = [...prev]
      updated[updated.length - 1] = { ...lastMsg, parts: cleanParts }
      return updated
    })
  }, [stop, setMessages])

  const handleToolResult = useCallback(
    (toolCallId: string, toolName: string, result: unknown) => {
      addToolOutput({ toolCallId, tool: toolName, output: result })
    },
    [addToolOutput]
  )

  const handleEditMessage = useCallback(
    (messageId: string, text: string) => {
      const idx = messages.findIndex((m) => m.id === messageId)
      if (idx < 0) return
      setMessages(messages.slice(0, idx))
      setInput(text)
      closeArtifact()
    },
    [messages, setMessages, setInput, closeArtifact]
  )

  /** Quiz completion: save results to artifact + send summary message for model feedback */
  const handleQuizComplete = useCallback(
    async (quiz: QuizDefinition, results: QuizResults) => {
      // 1. Persist completed quiz (answers + results) to artifact via PATCH
      if (selectedArtifact?.id) {
        const completedContent = JSON.stringify({ ...quiz, answers: quiz.answers, results })
        await handleArtifactSave(completedContent)
      }

      // 2. Build result summary message for model evaluation
      const autoGraded = results.correct + results.incorrect
      const freeTextDetails = results.details
        .filter((d) => d.needsReview && d.userAnswer)
        .map((d) => {
          const q = quiz.questions.find((q) => q.id === d.questionId)
          return q ? `- "${q.question}": "${d.userAnswer}"` : null
        })
        .filter(Boolean)

      let summary = `Quiz "${quiz.title}" abgeschlossen: ${results.correct}/${autoGraded} automatisch bewertete Fragen richtig (${results.percentage}%).`

      if (freeTextDetails.length > 0) {
        summary += `\n\nBitte bewerte diese offenen Antworten:\n${freeTextDetails.join("\n")}`
      }

      // 3. Send as user message — model reacts
      sendMessage({ text: summary })
    },
    [selectedArtifact?.id, handleArtifactSave, sendMessage]
  )

  /** Review completion: send structured feedback as user message (artifact stays clean markdown) */
  const handleReviewComplete = useCallback(
    (feedback: SectionFeedback[]) => {
      const LABEL_EMOJI: Record<string, string> = { approve: "✓", change: "✏️", question: "❓", remove: "✗" }
      const lines = feedback.map((fb) => {
        const emoji = LABEL_EMOJI[fb.label] ?? "•"
        const base = `- "${fb.title}": ${emoji} ${fb.label === "approve" ? "Passt" : fb.label === "change" ? "Ändern" : fb.label === "question" ? "Frage" : "Raus"}`
        return fb.comment ? `${base} — ${fb.comment}` : base
      })

      const reviewTitle = selectedArtifact?.title ?? "Dokument"
      const approvedCount = feedback.filter((f) => f.label === "approve").length
      const summary = `Review für "${reviewTitle}" (${approvedCount}/${feedback.length} Abschnitte genehmigt):\n${lines.join("\n")}`

      sendMessage({ text: summary })
    },
    [selectedArtifact?.title, sendMessage]
  )

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      if (!message.text.trim() && message.files.length === 0) return

      // Lock SafeChat state after first message (no mid-chat switching)
      businessMode.safeChat.lock()

      // SafeChat: auto-route to configured privacy model, skip PII dialog
      if (businessMode.safeChat.isActive) {
        privacyRouteRef.current = businessMode.safeChat.route
        sendMessage({ text: message.text, files: message.files })
        setInput("")
        return
      }

      // Business Mode: check for PII + file consent before sending
      if (businessMode.isEnabled) {
        const filesMeta = message.files.length > 0
          ? message.files.map((f) => ({ name: f.filename ?? "file", type: f.mediaType, size: 0 }))
          : undefined
        const decision = await businessMode.checkBeforeSend(message.text, filesMeta)

        if (decision.action === "cancel") return

        // Clear privacyRoute ref before setting
        privacyRouteRef.current = undefined

        if (decision.action === "send_redacted") {
          sendMessage({ text: decision.text, files: message.files })
          setInput("")
          return
        }

        if (isPrivacyRouteAction(decision.action)) {
          privacyRouteRef.current = decision.privacyRoute
          sendMessage({ text: decision.text, files: message.files })
          setInput("")
          return
        }
      }

      sendMessage({ text: message.text, files: message.files })
      setInput("")
    },
    [sendMessage, businessMode]
  )

  const handleSuggestionSelect = useCallback(
    (text: string) => {
      sendMessage({ text })
    },
    [sendMessage]
  )

  const handleQuicktaskSubmit = useCallback(
    async (slug: string, data: Record<string, string>) => {
      const summary = Object.entries(data)
        .filter(([, v]) => v.trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")

      const text = summary || `Quicktask: ${slug}`

      // Lock SafeChat state after first message
      businessMode.safeChat.lock()

      // SafeChat: auto-route for quicktasks too
      if (businessMode.safeChat.isActive) {
        privacyRouteRef.current = businessMode.safeChat.route
        quicktaskRef.current = { slug, data }
        sendMessage({ text })
        return
      }

      // Business Mode: PII check for quicktask data too
      if (businessMode.isEnabled) {
        const decision = await businessMode.checkBeforeSend(text)
        if (decision.action === "cancel") return

        privacyRouteRef.current = undefined

        if (isPrivacyRouteAction(decision.action)) {
          privacyRouteRef.current = decision.privacyRoute
        }

        quicktaskRef.current = { slug, data }
        const sendText = decision.action === "send_redacted" ? decision.text : text
        sendMessage({ text: sendText })
        return
      }

      quicktaskRef.current = { slug, data }
      sendMessage({ text })
    },
    [sendMessage, businessMode]
  )

  const handleWrapupSubmit = useCallback(
    (type: string, context?: string, format?: "text" | "audio") => {
      wrapupRef.current = { type, context, format }
      const label = WRAPUP_TYPES.find((t) => t.key === type)?.label ?? type
      let text = `Session abschließen: ${label}`
      if (context?.trim()) text += `\n\n${context.trim()}`
      sendMessage({ text })
    },
    [sendMessage]
  )

  const [artifactFullscreen, setArtifactFullscreen] = useState(false)
  const { panelWidth, isResizing, containerRef, handlePointerDown, handlePointerMove, handlePointerUp, handleDoubleClick } = useResizeHandle()

  const hasArtifact = selectedArtifact !== null

  // Reset fullscreen when artifact closes
  useEffect(() => {
    if (!hasArtifact) setArtifactFullscreen(false)
  }, [hasArtifact])

  if (chatId && !initialMessagesLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  const isGenerating = status === "streaming" || status === "submitted"

  return (
    <div ref={containerRef} className="flex flex-1 min-h-0" onPointerMove={hasArtifact ? handlePointerMove : undefined} onPointerUp={hasArtifact ? handlePointerUp : undefined}>
      <DropZoneOverlay />
      {/* Chat column */}
      <div
        className={`flex min-h-0 flex-col ${!isResizing ? "chat-column-animated" : ""} ${hasArtifact ? (artifactFullscreen ? "hidden" : "max-md:hidden") : "flex-1"}`}
        style={hasArtifact && !artifactFullscreen ? { width: `${(1 - panelWidth) * 100}%` } : undefined}
      >
        {/* Messages area */}
        <Conversation className="flex-1">
          <ConversationContent className={`mx-auto w-full gap-4 p-4 md:gap-6 md:p-6 ${hasArtifact ? "max-w-2xl" : "max-w-3xl"}`}>
            {messages.length === 0 ? (
              <ChatEmptyState
                onSuggestionSelect={handleSuggestionSelect}
                selectedExpertId={expertId}
                onExpertSelect={handleExpertSelect}
                onQuicktaskSubmit={handleQuicktaskSubmit}
                isSubmitting={isGenerating}
                userName={userName}
                activeProjectId={projectIdRef.current}
              />
            ) : (
              <>
                {messages.map((message, idx) => {
                  // Check for expert switch between messages
                  let divider: React.ReactNode = null
                  if (idx > 0 && message.role === "assistant") {
                    const meta = message.metadata as { expertId?: string; expertName?: string } | undefined
                    const prevAssistant = messages.slice(0, idx).reverse().find((m) => m.role === "assistant")
                    const prevMeta = prevAssistant?.metadata as { expertId?: string; expertName?: string } | undefined
                    const currentExpert = meta?.expertId ?? null
                    const prevExpert = prevMeta?.expertId ?? null
                    if (currentExpert !== prevExpert && (meta?.expertName || !currentExpert)) {
                      divider = (
                        <ExpertSwitchDivider
                          key={`divider-${message.id}`}
                          expertName={meta?.expertName ?? "Kein Experte"}
                          expertIcon={null}
                        />
                      )
                    }
                  }
                  return (
                    <React.Fragment key={message.id}>
                      {divider}
                      <ChatMessage
                        message={message}
                        isLastMessage={message.id === messages[messages.length - 1]?.id}
                        isStreaming={status === "streaming"}
                        selectedArtifact={selectedArtifact}
                        onArtifactClick={handleArtifactCardClick}
                        onToolResult={handleToolResult}
                        onEdit={handleEditMessage}
                      />
                    </React.Fragment>
                  )
                })}
                {suggestedRepliesEnabled && status === "ready" && (() => {
                  const lastMsg = messages[messages.length - 1]
                  if (lastMsg?.role !== "assistant") return null
                  const meta = lastMsg.metadata as { chatId?: string } | undefined
                  const cId = meta?.chatId ?? currentChatIdRef.current ?? chatId
                  if (!cId) return null
                  return (
                    <SuggestedReplies
                      key={`suggestions-${lastMsg.id}`}
                      chatId={cId}
                      onSelect={handleSuggestionSelect}
                      disabled={isGenerating}
                    />
                  )
                })()}
                {(status === "submitted" || status === "streaming") &&
                  (() => {
                    const lastMsg = messages[messages.length - 1]
                    // Show indicator if no assistant message yet, or assistant message has no visible content
                    if (lastMsg?.role !== "assistant") return true
                    const hasContent = lastMsg.parts?.some(
                      (p) => (p.type === "text" && "text" in p && (p.text as string)?.length > 0)
                        || p.type === "reasoning"
                        || p.type.startsWith("tool-")
                    )
                    return !hasContent
                  })() && (
                    <PendingIndicator messages={messages} />
                  )}
              </>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Input area */}
        <div className={`mx-auto w-full px-3 pb-3 md:px-6 md:pb-6 ${hasArtifact ? "max-w-2xl" : "max-w-3xl"}`}>
          {readOnly ? (
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              <Users className="size-4 shrink-0" />
              <span>
                {sharedByName
                  ? `Von ${sharedByName} geteilt`
                  : "Geteilter Chat"}
                {" — nur Ansicht"}
              </span>
            </div>
          ) : (<>
          {creditError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {creditError}
            </div>
          )}
          {features.businessMode.enabled && !businessMode.isEnabled && hasAttachedFiles && (
            <FilePrivacyNotice
              modelProvider={modelMeta?.provider}
              modelRegion={modelMeta?.region}
            />
          )}
          <PromptInput
            onSubmit={handleSubmit}
            className={
              features.businessMode.enabled && !businessMode.isEnabled && hasAttachedFiles
                ? "rounded-b-2xl rounded-t-none border border-amber-400/40 bg-background input-prominent dark:border-amber-500/25"
                : "rounded-2xl border bg-background input-prominent"
            }
            accept={chatConfig.upload.accept}
            maxFiles={chatConfig.upload.maxFiles}
            maxFileSize={chatConfig.upload.maxFileSize}
            globalDrop
          >
            <AttachmentPreviews onFilesChange={setHasAttachedFiles} />
            <PromptInputBody>
              <PromptInputTextarea
                value={input}
                onChange={(e) => setInput(e.currentTarget.value)}
                placeholder="Nachricht eingeben..."
                maxLength={2000}
                autoFocus={!chatId}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <AttachButton />
                <ExpertSwitchButton
                  expertId={expertId}
                  expertName={expertName}
                  expertIcon={expertIcon}
                  onSelect={handleExpertSelect}
                />
                {businessMode.safeChat.available && (
                  <SafeChatPopover safeChat={businessMode.safeChat} />
                )}
              </PromptInputTools>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <>
                    <SessionWrapupPopover
                      onSubmit={handleWrapupSubmit}
                      disabled={isGenerating}
                      ttsEnabled={ttsEnabled}
                      memoryEnabled={memoryEnabled}
                    />
                    <div className="mx-0.5 h-4 w-px bg-border" />
                  </>
                )}
                <SpeechButton
                  lang="de-DE"
                  onTranscript={(text) => setInput((prev) => prev ? `${prev} ${text}` : text)}
                />
                <SubmitButton status={status} input={input} onStop={handleStop} />
              </div>
            </PromptInputFooter>
          </PromptInput>
          </>)}
        </div>
      </div>

      {/* Resize handle */}
      {hasArtifact && !artifactFullscreen && (
        <div
          className="hidden md:flex w-1.5 shrink-0 cursor-col-resize items-center justify-center hover:bg-primary/10 active:bg-primary/20 transition-colors resize-handle-enter"
          onPointerDown={handlePointerDown}
          onDoubleClick={handleDoubleClick}
          title="Ziehen zum Anpassen, Doppelklick fuer 50/50"
        >
          <div className="h-8 w-0.5 rounded-full bg-border" />
        </div>
      )}

      {/* Artifact panel with error boundary */}
      {hasArtifact && (
        <div
          className={`flex min-h-0 ${artifactFullscreen ? "fixed inset-0 z-50 bg-background" : "max-md:w-full max-md:absolute max-md:inset-0 max-md:z-50 max-md:bg-background artifact-panel-enter"}`}
          style={!artifactFullscreen ? { width: `${panelWidth * 100}%` } : undefined}
        >
          <ArtifactErrorBoundary onClose={closeArtifact}>
            <ArtifactPanel
              content={selectedArtifact.content}
              title={selectedArtifact.title}
              contentType={selectedArtifact.type}
              language={selectedArtifact.language}
              isStreaming={selectedArtifact.isStreaming}
              artifactId={selectedArtifact.id}
              version={selectedArtifact.version}
              reviewMode={selectedArtifact.reviewMode}
              onClose={closeArtifact}
              onSave={selectedArtifact.id ? handleArtifactSave : undefined}
              onQuizComplete={selectedArtifact.type === "quiz" ? handleQuizComplete : undefined}
              onReviewComplete={selectedArtifact.type === "markdown" ? handleReviewComplete : undefined}
              fullscreen={artifactFullscreen}
              onToggleFullscreen={() => setArtifactFullscreen(f => !f)}
            />
          </ArtifactErrorBoundary>
        </div>
      )}

      {/* Business Mode Dialogs */}
      {businessMode.isEnabled && (
        <>
          <BusinessModePiiDialog
            open={businessMode.piiDialog.open}
            findings={businessMode.piiDialog.findings}
            options={businessMode.options}
            onDecision={businessMode.handlePiiDecision}
          />
          <BusinessModeFileDialog
            open={businessMode.fileDialog.open}
            files={businessMode.fileDialog.files}
            options={businessMode.options}
            onDecision={businessMode.handleFileDecision}
          />
        </>
      )}
    </div>
  )
}

/** Attachment previews shown above the textarea — only renders when files are attached */
function AttachmentPreviews({ onFilesChange }: { onFilesChange?: (hasFiles: boolean) => void }) {
  const { files, remove } = usePromptInputAttachments()

  // Report file presence to parent for privacy notice positioning
  useEffect(() => {
    onFilesChange?.(files.length > 0)
  }, [files.length, onFilesChange])

  if (files.length === 0) return null
  return (
    <PromptInputHeader>
      <Attachments variant="inline">
        {files.map((file) => (
          <Attachment key={file.id} data={file} onRemove={() => remove(file.id)}>
            <AttachmentPreview />
            <AttachmentInfo />
            <AttachmentRemove label="Entfernen" />
          </Attachment>
        ))}
      </Attachments>
    </PromptInputHeader>
  )
}

/** Direct attach button — opens file dialog on click, no dropdown */
function AttachButton() {
  const { openFileDialog } = usePromptInputAttachments()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 rounded-lg"
          onClick={openFileDialog}
        >
          <PlusIcon className="size-4" />
          <span className="sr-only">Dateien anhängen</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">Dateien anhängen</TooltipContent>
    </Tooltip>
  )
}

/** Pending indicator that shows context-aware status while waiting for AI response */
function PendingIndicator({ messages }: { messages: Array<{ parts?: Array<{ type: string; [key: string]: unknown }> }> }) {
  // Check if the last user message contains file parts
  const lastUserMsg = [...messages].reverse().find((m) => (m as { role: string }).role === "user")
  const fileParts = lastUserMsg?.parts?.filter((p) => p.type === "file") ?? []
  const hasFiles = fileParts.length > 0

  // Determine status label
  let statusLabel: string | null = null
  if (hasFiles) {
    const imageCount = fileParts.filter((p) => (p.mediaType as string | undefined)?.startsWith("image/")).length
    const docCount = fileParts.length - imageCount
    if (docCount > 0 && imageCount > 0) {
      statusLabel = "Dateien werden analysiert…"
    } else if (docCount > 0) {
      statusLabel = docCount === 1 ? "Dokument wird gelesen…" : `${docCount} Dokumente werden gelesen…`
    } else {
      statusLabel = imageCount === 1 ? "Bild wird analysiert…" : `${imageCount} Bilder werden analysiert…`
    }
  }

  return (
    <div className="flex gap-2 pl-9">
      <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3">
        <span className="flex items-center gap-1">
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
        </span>
        {statusLabel && (
          <span className="text-xs text-muted-foreground">{statusLabel}</span>
        )}
      </div>
    </div>
  )
}

/** Expert switch button in PromptInputTools */
function ExpertSwitchButton({
  expertId,
  expertName,
  expertIcon,
  onSelect,
}: {
  expertId: string | null
  expertName: string | null
  expertIcon: string | null
  onSelect: (id: string | null, name?: string, icon?: string | null) => void
}) {
  const Icon = expertIcon ? (EXPERT_ICON_MAP[expertIcon] ?? DEFAULT_EXPERT_ICON) : Users
  const hasExpert = expertId !== null

  return (
    <ExpertSwitchPopover currentExpertId={expertId} onSelect={onSelect}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`size-8 rounded-lg ${hasExpert ? "text-primary" : ""}`}
        title={expertName ?? "Experte wählen"}
      >
        <div className="relative">
          <Icon className="size-4" />
          {hasExpert && (
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary" />
          )}
        </div>
        <span className="sr-only">{expertName ?? "Experte wählen"}</span>
      </Button>
    </ExpertSwitchPopover>
  )
}

/** Submit button that enables when text or files are present (must be inside PromptInput) */
function SubmitButton({ status, input, onStop }: { status: ChatStatus; input: string; onStop: () => void }) {
  const { files } = usePromptInputAttachments()
  const isGenerating = status === "submitted" || status === "streaming"
  return (
    <PromptInputSubmit
      status={status}
      onStop={onStop}
      disabled={isGenerating ? false : !input.trim() && files.length === 0}
      className={isGenerating ? "streaming-stop-btn" : ""}
    />
  )
}
