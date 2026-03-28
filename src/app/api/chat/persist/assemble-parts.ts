/**
 * Response-parts assembly and fake-artifact detection.
 */

import { getErrorMessage } from "@/lib/errors"
import { parseFakeArtifactCall } from "@/lib/ai/tools/parse-fake-artifact"
import { createArtifact } from "@/lib/db/queries/artifacts"

/**
 * Assemble assistant response parts from response messages.
 * Pure data transform — no I/O.
 */
export function assembleAssistantParts(responseMessages: Array<{ role: string; content: unknown }>): Array<Record<string, unknown>> {
  const assistantParts: Array<Record<string, unknown>> = []
  let prevRole: string | null = null

  for (const m of responseMessages) {
    if (!Array.isArray(m.content)) continue

    if (m.role === "assistant" && prevRole === "tool") {
      assistantParts.push({ type: "step-start" })
    }
    prevRole = m.role

    if (m.role === "assistant") {
      for (const c of m.content) {
        if (c.type === "text") {
          assistantParts.push({ type: "text", text: c.text })
        } else if (c.type === "tool-call") {
          assistantParts.push({
            type: "tool-call",
            toolCallId: c.toolCallId,
            toolName: c.toolName,
            args: c.input ?? {},
          })
        }
      }
    } else if (m.role === "tool") {
      for (const c of m.content) {
        if (c.type === "tool-result") {
          assistantParts.push({
            type: "tool-result",
            toolCallId: c.toolCallId,
            toolName: c.toolName,
            result: c.output,
          })
        }
      }
    }
  }

  return assistantParts
}

/**
 * Detect fake artifact tool calls in text (models that can't do tool calling).
 * If detected, creates the artifact in DB and mutates assistantParts in place.
 */
export async function detectAndCreateFakeArtifact(
  assistantParts: Array<Record<string, unknown>>,
  chatId: string,
): Promise<void> {
  const fullText = assistantParts
    .filter((p) => p.type === "text")
    .map((p) => p.text as string)
    .join("")
  const fakeArtifact = parseFakeArtifactCall(fullText)
  if (!fakeArtifact) return

  try {
    const artifact = await createArtifact({
      chatId,
      type: fakeArtifact.type,
      title: fakeArtifact.title,
      content: fakeArtifact.content,
      language: fakeArtifact.language,
    })

    const cleanText = [fakeArtifact.textBefore, fakeArtifact.textAfter].filter(Boolean).join("\n\n")
    const nonTextParts = assistantParts.filter((p) => p.type !== "text")
    assistantParts.length = 0
    if (cleanText) {
      assistantParts.push({ type: "text", text: cleanText })
    }
    const fakeToolCallId = `fake-${artifact.id}`
    assistantParts.push({
      type: "tool-call",
      toolCallId: fakeToolCallId,
      toolName: "create_artifact",
      args: {
        type: fakeArtifact.type,
        title: fakeArtifact.title,
        content: fakeArtifact.content,
        language: fakeArtifact.language,
      },
    })
    assistantParts.push({
      type: "tool-result",
      toolCallId: fakeToolCallId,
      toolName: "create_artifact",
      result: {
        artifactId: artifact.id,
        title: artifact.title,
        type: artifact.type,
        version: artifact.version,
      },
    })
    assistantParts.push(...nonTextParts)
  } catch (err) {
    console.error("Failed to create artifact from fake tool call:", getErrorMessage(err))
  }
}
