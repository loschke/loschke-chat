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
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import { ChatEmptyState } from "./chat-empty-state"

interface ChatViewProps {
  chatId?: string
}

export function ChatView({ chatId }: ChatViewProps) {
  const [input, setInput] = useState("")
  const [initialMessagesLoaded, setInitialMessagesLoaded] = useState(!chatId)
  const navigatedRef = useRef(false)

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
        window.history.replaceState(null, "", `/c/${meta.chatId}`)
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
          const uiMessages = data.messages.map((msg: { id: string; role: string; parts: unknown[] }) => ({
            id: msg.id,
            role: msg.role,
            parts: msg.parts,
            content: "",
          }))
          setMessages(uiMessages)
        }
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

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (!message.text.trim()) return

      sendMessage(
        { text: message.text },
        { body: { chatId } }
      )
      setInput("")
    },
    [sendMessage, chatId]
  )

  const handleSuggestionSelect = useCallback(
    (text: string) => {
      sendMessage(
        { text },
        { body: { chatId } }
      )
    },
    [sendMessage, chatId]
  )

  if (chatId && !initialMessagesLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 p-6">
          {messages.length === 0 ? (
            <ChatEmptyState onSuggestionSelect={handleSuggestionSelect} />
          ) : (
            <>
              {messages.map((message) => {
                const isUser = message.role === "user"
                return (
                  <Message from={message.role} key={message.id}>
                    {!isUser && (
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm">
                        ✦
                      </div>
                    )}
                    <MessageContent>
                      {isUser ? (
                        <p className="whitespace-pre-wrap">
                          {message.parts
                            ?.filter((part) => part.type === "text")
                            .map((part) => part.text)
                            .join("")}
                        </p>
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
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            placeholder="Nachricht eingeben..."
            maxLength={2000}
            className="min-h-12"
          />
          <PromptInputSubmit
            status={status}
            disabled={!input.trim()}
          />
        </PromptInput>
      </div>
    </div>
  )
}
