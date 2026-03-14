"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
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
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import { ArtifactPanel } from "@/components/assistant/artifact-panel"
import { ChatEmptyState } from "./chat-empty-state"
import { ChatMessage } from "./chat-message"
import { ArtifactErrorBoundary } from "./artifact-error-boundary"
import { SpeechButton } from "./speech-button"
import { useArtifact, mapSavedPartsToUI } from "@/hooks/use-artifact"

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
  const quicktaskRef = useRef<{ slug: string; data: Record<string, string> } | null>(null)
  const navigatedRef = useRef(false)
  const currentChatIdRef = useRef(chatId)
  const modelIdRef = useRef(modelId)
  const expertIdRef = useRef(expertId)

  // Keep refs in sync with state
  modelIdRef.current = modelId
  expertIdRef.current = expertId

  // Load user default model from preferences
  useEffect(() => {
    if (modelId) return
    async function loadDefault() {
      try {
        const res = await fetch("/api/user/instructions")
        if (res.ok) {
          const data = await res.json()
          if (data.defaultModelId) {
            setModelId(data.defaultModelId)
            return
          }
        }
        // Fallback: use system default from models API
        const modelsRes = await fetch("/api/models")
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json()
          const defaultModel = modelsData.models?.find((m: { isDefault: boolean }) => m.isDefault)
          if (defaultModel) setModelId(defaultModel.id)
        }
      } catch {
        // Will use server default
      }
    }
    loadDefault()
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
      if (!message.text.trim()) return
      sendMessage({ text: message.text })
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
                {status === "submitted" &&
                  messages[messages.length - 1]?.role !== "assistant" && (
                    <div className="flex gap-2">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm">
                        ✦
                      </div>
                      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}
              </>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Input area */}
        <div className={`mx-auto w-full px-6 pb-6 ${hasArtifact ? "max-w-2xl" : "max-w-3xl"}`}>
          <PromptInput onSubmit={handleSubmit} className="rounded-xl border bg-background shadow-sm">
            <PromptInputBody>
              <PromptInputTextarea
                value={input}
                onChange={(e) => setInput(e.currentTarget.value)}
                placeholder="Nachricht eingeben..."
                maxLength={2000}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools />
              <div className="flex items-center gap-1">
                <SpeechButton
                  lang="de-DE"
                  onTranscript={(text) => setInput((prev) => prev ? `${prev} ${text}` : text)}
                />
                <PromptInputSubmit
                  status={status}
                  disabled={!input.trim()}
                />
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
