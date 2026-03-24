"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { ArtifactPanel } from "@/components/assistant/artifact-panel"
import { ArtifactErrorBoundary } from "./artifact-error-boundary"
import { ChatMessage } from "./chat-message"
import { mapSavedPartsToUI } from "@/hooks/use-artifact"
import type { SelectedArtifact } from "@/hooks/use-artifact"

interface SharedMessage {
  id: string
  role: string
  parts: unknown[]
  metadata?: unknown
}

interface SharedArtifact {
  id: string
  messageId: string | null
  type: string
  title: string
  content: string
  language: string | null
  fileUrl: string | null
  version: number
}

interface SharedChatViewProps {
  token: string
  title?: string
}

export function SharedChatView({ token }: SharedChatViewProps) {
  const [messages, setMessages] = useState<Array<{
    id: string
    role: "user" | "system" | "assistant"
    parts: Array<{ type: string; [key: string]: unknown }>
    content: string
    metadata?: unknown
  }>>([])
  const [artifacts, setArtifacts] = useState<SharedArtifact[]>([])
  const [chatTitle, setChatTitle] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedArtifact, setSelectedArtifact] = useState<SelectedArtifact | null>(null)

  useEffect(() => {
    async function loadSharedChat() {
      try {
        const res = await fetch(`/api/share/${token}`)
        if (!res.ok) {
          setError("Dieser geteilte Chat ist nicht mehr verfuegbar.")
          return
        }
        const data = await res.json()

        setChatTitle(data.chat.title)
        setArtifacts(data.artifacts ?? [])

        const uiMessages = data.messages.map((msg: SharedMessage) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          parts: mapSavedPartsToUI(msg.parts),
          content: "",
          metadata: msg.metadata ?? undefined,
        }))
        setMessages(uiMessages)
      } catch {
        setError("Fehler beim Laden des geteilten Chats.")
      } finally {
        setIsLoading(false)
      }
    }
    loadSharedChat()
  }, [token])

  const handleArtifactClick = useCallback(
    (artifact: { title: string; content: string; type: string; language?: string; id?: string; version?: number }) => {
      setSelectedArtifact({
        title: artifact.title,
        content: artifact.content,
        type: artifact.type as SelectedArtifact["type"],
        language: artifact.language,
        id: artifact.id,
        version: artifact.version ?? 1,
        isStreaming: false,
      })
    },
    []
  )

  const closeArtifact = useCallback(() => setSelectedArtifact(null), [])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="rounded-lg border px-6 py-4 text-sm text-muted-foreground">
          {error}
        </div>
      </div>
    )
  }

  const hasArtifact = selectedArtifact !== null

  return (
    <div className="flex flex-1 min-h-0">
      {/* Chat column */}
      <div className={`flex min-h-0 flex-col ${hasArtifact ? "w-1/2 border-r max-md:hidden" : "flex-1"}`}>
        {/* Title */}
        {chatTitle && (
          <div className="border-b px-4 py-3">
            <h1 className="text-sm font-semibold">{chatTitle}</h1>
          </div>
        )}

        {/* Messages */}
        <Conversation className="flex-1">
          <ConversationContent className={`mx-auto w-full gap-4 p-4 md:gap-6 md:p-6 ${hasArtifact ? "max-w-2xl" : "max-w-3xl"}`}>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isLastMessage={false}
                isStreaming={false}
                selectedArtifact={selectedArtifact}
                onArtifactClick={handleArtifactClick}
              />
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      {/* Artifact panel */}
      {hasArtifact && (
        <div className="flex w-1/2 min-h-0 max-md:w-full max-md:absolute max-md:inset-0 max-md:z-50 max-md:bg-background">
          <ArtifactErrorBoundary onClose={closeArtifact}>
            <ArtifactPanel
              content={selectedArtifact.content}
              title={selectedArtifact.title}
              contentType={selectedArtifact.type}
              language={selectedArtifact.language}
              isStreaming={false}
              artifactId={selectedArtifact.id}
              version={selectedArtifact.version}
              onClose={closeArtifact}
            />
          </ArtifactErrorBoundary>
        </div>
      )}
    </div>
  )
}
