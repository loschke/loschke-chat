"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageToolbar,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message"
import { CopyIcon, DownloadIcon, CoinsIcon } from "lucide-react"
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import { ChatEmptyState } from "./chat-empty-state"
import { SpeechButton } from "./speech-button"
import { ModelSelector } from "./model-selector"

interface ChatViewProps {
  chatId?: string
  initialModelId?: string
}

export function ChatView({ chatId, initialModelId }: ChatViewProps) {
  const [input, setInput] = useState("")
  const [initialMessagesLoaded, setInitialMessagesLoaded] = useState(!chatId)
  const [modelId, setModelId] = useState(initialModelId ?? "")
  const navigatedRef = useRef(false)
  const currentChatIdRef = useRef(chatId)

  // Load default model if none provided
  useEffect(() => {
    if (modelId) return
    async function loadDefault() {
      try {
        const res = await fetch("/api/models")
        if (res.ok) {
          const data = await res.json()
          const defaultModel = data.models?.find((m: { isDefault: boolean }) => m.isDefault)
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
      }),
    []
  )

  const {
    messages,
    sendMessage,
    status,
    setMessages,
  } = useChat({
    transport,
    id: chatId ?? "new",
    onFinish: ({ message }) => {
      // Navigate to chat URL for new chats using chatId from message metadata
      const meta = message.metadata as { chatId?: string } | undefined
      if (meta?.chatId && !chatId && !navigatedRef.current) {
        navigatedRef.current = true
        currentChatIdRef.current = meta.chatId
        window.history.replaceState(null, "", `/c/${meta.chatId}`)
        // Notify sidebar about new chat
        window.dispatchEvent(new CustomEvent("chat-updated"))
      }
    },
  })

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
          const uiMessages = data.messages.map((msg: { id: string; role: string; parts: unknown[]; metadata?: unknown }) => ({
            id: msg.id,
            role: msg.role,
            parts: msg.parts,
            content: "",
            metadata: msg.metadata ?? undefined,
          }))
          setMessages(uiMessages)
        }

        // Initialize model from loaded chat
        if (data.modelId) setModelId(data.modelId)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        // Failed to load — user will see empty chat
      } finally {
        if (!controller.signal.aborted) setInitialMessagesLoaded(true)
      }
    }

    loadChat()
    return () => controller.abort()
  }, [chatId, setMessages])

  const handleModelChange = useCallback(
    (newModelId: string) => {
      setModelId(newModelId)
      // Persist model change to existing chat
      const cid = currentChatIdRef.current
      if (cid) {
        fetch(`/api/chats/${cid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelId: newModelId }),
        }).catch(() => {})
      }
    },
    []
  )

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (!message.text.trim()) return

      sendMessage(
        { text: message.text },
        { body: { chatId: currentChatIdRef.current ?? chatId, modelId } }
      )
      setInput("")
    },
    [sendMessage, chatId, modelId]
  )

  const handleSuggestionSelect = useCallback(
    (text: string) => {
      sendMessage(
        { text },
        { body: { chatId: currentChatIdRef.current ?? chatId, modelId } }
      )
    },
    [sendMessage, chatId, modelId]
  )

  if (chatId && !initialMessagesLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  const isGenerating = status === "streaming" || status === "submitted"

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {/* Messages area */}
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 p-6">
          {messages.length === 0 ? (
            <ChatEmptyState onSuggestionSelect={handleSuggestionSelect} />
          ) : (
            <>
              {messages.map((message) => {
                const isUser = message.role === "user"
                const meta = message.metadata as {
                  modelId?: string
                  modelName?: string
                  totalTokens?: number
                } | undefined
                const messageText = message.parts
                  ?.filter((part) => part.type === "text")
                  .map((part) => part.text)
                  .join("") ?? ""
                return (
                  <Message from={message.role} key={message.id}>
                    {!isUser && (
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm">
                        ✦
                      </div>
                    )}
                    <MessageContent>
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{messageText}</p>
                      ) : (
                        message.parts
                          ?.filter((part) => part.type === "text")
                          .map((part, i) => (
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
                          ))
                      )}
                    </MessageContent>
                    {!isUser && !(status === "streaming" && message.id === messages[messages.length - 1]?.id) && (
                      <MessageToolbar className="mt-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {meta?.modelName && <span>{meta.modelName}</span>}
                          {meta?.totalTokens != null && (
                            <span className="flex items-center gap-0.5">
                              <CoinsIcon className="size-3" />
                              {meta.totalTokens.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <MessageActions>
                          <MessageAction
                            tooltip="Kopieren"
                            onClick={() => navigator.clipboard.writeText(messageText)}
                          >
                            <CopyIcon className="size-3" />
                          </MessageAction>
                          <MessageAction
                            tooltip="Als Markdown herunterladen"
                            onClick={() => {
                              const blob = new Blob([messageText], { type: "text/markdown" })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement("a")
                              a.href = url
                              a.download = `message-${message.id}.md`
                              a.click()
                              URL.revokeObjectURL(url)
                            }}
                          >
                            <DownloadIcon className="size-3" />
                          </MessageAction>
                        </MessageActions>
                      </MessageToolbar>
                    )}
                  </Message>
                )
              })}
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
      <div className="mx-auto w-full max-w-3xl px-6 pb-6">
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
            <PromptInputTools>
              <ModelSelector
                value={modelId}
                onChange={handleModelChange}
                disabled={isGenerating}
              />
            </PromptInputTools>
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
  )
}
