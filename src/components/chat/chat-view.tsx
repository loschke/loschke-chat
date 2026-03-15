"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import { PlusIcon } from "lucide-react"
import { ArtifactPanel } from "@/components/assistant/artifact-panel"
import { ChatEmptyState } from "./chat-empty-state"
import { ChatMessage } from "./chat-message"
import { ArtifactErrorBoundary } from "./artifact-error-boundary"
import { SpeechButton } from "./speech-button"
import { useArtifact, mapSavedPartsToUI } from "@/hooks/use-artifact"
import { DropZoneOverlay } from "./drop-zone-overlay"
import { FilePrivacyNotice } from "./file-privacy-notice"
import { chatConfig } from "@/config/chat"
import { features } from "@/config/features"

interface ChatViewProps {
  chatId?: string
  initialModelId?: string
  userName?: string
}

export function ChatView({ chatId, initialModelId, userName }: ChatViewProps) {
  const [input, setInput] = useState("")
  const [initialMessagesLoaded, setInitialMessagesLoaded] = useState(!chatId)
  const [modelId, setModelId] = useState(initialModelId ?? "")
  const [expertId, setExpertId] = useState<string | null>(null)
  const [modelMeta, setModelMeta] = useState<{ provider?: string; region?: "eu" | "us" } | null>(null)
  const [hasAttachedFiles, setHasAttachedFiles] = useState(false)
  const quicktaskRef = useRef<{ slug: string; data: Record<string, string> } | null>(null)
  const navigatedRef = useRef(false)
  const currentChatIdRef = useRef(chatId)
  const modelIdRef = useRef(modelId)
  const expertIdRef = useRef(expertId)

  // Keep refs in sync with state
  modelIdRef.current = modelId
  expertIdRef.current = expertId

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
            .catch(() => {})
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

        // Resolve default model
        if (instrRes.ok) {
          const data = await instrRes.json()
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
          return {
            body: {
              ...body,
              messages,
              chatId: currentChatIdRef.current ?? chatId,
              modelId: modelIdRef.current,
              ...(expertIdRef.current && { expertId: expertIdRef.current }),
              ...(qt && { quicktaskSlug: qt.slug, quicktaskData: qt.data }),
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
  } = useChat({
    transport,
    id: chatId ?? "new",
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: ({ message }) => {
      // Navigate to chat URL for new chats using chatId from message metadata
      const meta = message.metadata as { chatId?: string } | undefined
      if (meta?.chatId && !chatId && !navigatedRef.current) {
        navigatedRef.current = true
        currentChatIdRef.current = meta.chatId
        window.history.replaceState(null, "", `/c/${meta.chatId}`)
        window.dispatchEvent(new CustomEvent("chat-updated"))
      }
    },
  })

  // Artifact state management (extracted hook)
  const {
    selectedArtifact,
    handleArtifactCardClick,
    handleArtifactSave,
    closeArtifact,
  } = useArtifact({ messages, status })

  // Load existing messages when chatId is provided
  useEffect(() => {
    if (!chatId) return

    const controller = new AbortController()

    async function loadChat() {
      try {
        const res = await fetch(`/api/chats/${chatId}`, { signal: controller.signal })
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
        if (data.expertId) setExpertId(data.expertId)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
      } finally {
        if (!controller.signal.aborted) setInitialMessagesLoaded(true)
      }
    }

    loadChat()
    return () => controller.abort()
  }, [chatId, setMessages])

  const handleExpertSelect = useCallback(
    (newExpertId: string | null) => {
      setExpertId(newExpertId)
    },
    []
  )

  const handleToolResult = useCallback(
    (toolCallId: string, result: unknown) => {
      addToolOutput({ toolCallId, tool: "ask_user", output: result })
    },
    [addToolOutput]
  )

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (!message.text.trim() && message.files.length === 0) return
      sendMessage({ text: message.text, files: message.files })
      setInput("")
    },
    [sendMessage]
  )

  const handleSuggestionSelect = useCallback(
    (text: string) => {
      sendMessage({ text })
    },
    [sendMessage]
  )

  const handleQuicktaskSubmit = useCallback(
    (slug: string, data: Record<string, string>) => {
      quicktaskRef.current = { slug, data }

      // Build a user-visible summary from the form data
      const summary = Object.entries(data)
        .filter(([, v]) => v.trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")

      sendMessage({ text: summary || `Quicktask: ${slug}` })

      // Clear quicktask ref after message is queued
      queueMicrotask(() => {
        quicktaskRef.current = null
      })
    },
    [sendMessage]
  )

  if (chatId && !initialMessagesLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  const isGenerating = status === "streaming" || status === "submitted"
  const hasArtifact = selectedArtifact !== null

  return (
    <div className="flex flex-1 min-h-0">
      <DropZoneOverlay />
      {/* Chat column */}
      <div className={`flex min-h-0 flex-col ${hasArtifact ? "w-1/2 border-r max-md:hidden" : "flex-1"}`}>
        {/* Messages area */}
        <Conversation className="flex-1">
          <ConversationContent className={`mx-auto w-full gap-6 p-6 ${hasArtifact ? "max-w-2xl" : "max-w-3xl"}`}>
            {messages.length === 0 ? (
              <ChatEmptyState
                onSuggestionSelect={handleSuggestionSelect}
                selectedExpertId={expertId}
                onExpertSelect={handleExpertSelect}
                onQuicktaskSubmit={handleQuicktaskSubmit}
                isSubmitting={isGenerating}
                userName={userName}
              />
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isLastMessage={message.id === messages[messages.length - 1]?.id}
                    isStreaming={status === "streaming"}
                    selectedArtifact={selectedArtifact}
                    onArtifactClick={handleArtifactCardClick}
                    onToolResult={handleToolResult}
                  />
                ))}
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
        <div className={`mx-auto w-full px-6 pb-6 ${hasArtifact ? "max-w-2xl" : "max-w-3xl"}`}>
          {features.businessMode.enabled && hasAttachedFiles && (
            <FilePrivacyNotice
              modelProvider={modelMeta?.provider}
              modelRegion={modelMeta?.region}
            />
          )}
          <PromptInput
            onSubmit={handleSubmit}
            className={
              features.businessMode.enabled && hasAttachedFiles
                ? "rounded-b-xl rounded-t-none border border-amber-400/40 bg-background shadow-sm dark:border-amber-500/25"
                : "rounded-xl border bg-background shadow-sm"
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
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <AttachButton />
              </PromptInputTools>
              <div className="flex items-center gap-1">
                <SpeechButton
                  lang="de-DE"
                  onTranscript={(text) => setInput((prev) => prev ? `${prev} ${text}` : text)}
                />
                <SubmitButton status={status} input={input} />
              </div>
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>

      {/* Artifact panel with error boundary */}
      {hasArtifact && (
        <div className="flex w-1/2 min-h-0 max-md:w-full max-md:absolute max-md:inset-0 max-md:z-50 max-md:bg-background">
          <ArtifactErrorBoundary onClose={closeArtifact}>
            <ArtifactPanel
              content={selectedArtifact.content}
              title={selectedArtifact.title}
              contentType={selectedArtifact.type}
              language={selectedArtifact.language}
              isStreaming={selectedArtifact.isStreaming}
              artifactId={selectedArtifact.id}
              version={selectedArtifact.version}
              onClose={closeArtifact}
              onSave={selectedArtifact.id ? handleArtifactSave : undefined}
            />
          </ArtifactErrorBoundary>
        </div>
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

/** Submit button that enables when text or files are present (must be inside PromptInput) */
function SubmitButton({ status, input }: { status: ChatStatus; input: string }) {
  const { files } = usePromptInputAttachments()
  return (
    <PromptInputSubmit
      status={status}
      disabled={!input.trim() && files.length === 0}
    />
  )
}
