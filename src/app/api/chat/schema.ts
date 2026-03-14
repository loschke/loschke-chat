import { z } from "zod"

export const messagePartSchema = z.object({
  type: z.string(),
  // Known fields for text parts
  text: z.string().optional(),
  // Known fields for file/image parts
  mediaType: z.string().optional(),
  data: z.union([z.string(), z.instanceof(Uint8Array)]).optional(),
  filename: z.string().optional(),
  // Known fields for tool parts
  toolCallId: z.string().optional(),
  toolName: z.string().optional(),
  state: z.string().optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  // Known fields for source parts
  url: z.string().optional(),
  title: z.string().optional(),
})
// No .passthrough() — unknown fields are stripped by default

export const messageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant"]),
  content: z.union([z.string(), z.array(messagePartSchema)]).optional(),
  parts: z.array(messagePartSchema).optional(),
})
// No .passthrough() — unknown fields are stripped by default

export const chatBodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(50),
  chatId: z.string().max(20).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  modelId: z.string().optional(),
  expertId: z.string().max(20).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  quicktaskSlug: z.string().max(100).regex(/^[a-z0-9-]+$/).optional(),
  quicktaskData: z.record(z.string().max(50), z.string().max(5000))
    .refine((obj) => Object.keys(obj).length <= 20, "Maximal 20 Felder erlaubt")
    .optional(),
})

export type MessagePart = z.infer<typeof messagePartSchema>
export type ChatMessage = z.infer<typeof messageSchema>
