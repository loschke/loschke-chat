import { z } from "zod"

export const messagePartSchema = z.object({
  type: z.string().max(100),
  // Known fields for text parts
  text: z.string().optional(),
  // Known fields for file/image parts
  mediaType: z.string().max(200).optional(),
  data: z.union([
    z.string().max(6_000_000), // ~4.5MB base64 (4MB binary ≈ 5.3MB base64)
    z.instanceof(Uint8Array),
  ]).optional(),
  filename: z.string().max(255).optional(),
  // Marker: file content was already extracted (skip re-fetch on follow-up)
  extracted: z.boolean().optional(),
  // Pre-extracted text content from documents (PDF, DOCX, XLSX, HTML)
  extractedText: z.string().max(200_000).optional(),
  // Known fields for tool parts
  toolCallId: z.string().max(200).optional(),
  toolName: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  args: z.unknown().optional(),
  result: z.unknown().optional(),
  // Known fields for source parts
  url: z.string().max(6_000_000).optional(), // data-URLs can be large
  title: z.string().max(500).optional(),
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
  modelId: z.string().min(1).max(200).optional(),
  expertId: z.string().max(20).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  quicktaskSlug: z.string().max(100).regex(/^[a-z0-9-]+$/).optional(),
  quicktaskData: z.record(z.string().max(50), z.string().max(5000))
    .refine((obj) => Object.keys(obj).length <= 20, "Maximal 20 Felder erlaubt")
    .optional(),
  projectId: z.string().max(20).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  privacyRoute: z.enum(["eu", "local"]).optional(),
  wrapupType: z.enum(["handoff", "summary", "prd", "action-items", "briefing"]).optional(),
  wrapupContext: z.string().max(1000).optional(),
  wrapupFormat: z.enum(["text", "audio"]).optional(),
})

export type MessagePart = z.infer<typeof messagePartSchema>
export type ChatMessage = z.infer<typeof messageSchema>
