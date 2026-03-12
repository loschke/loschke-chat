import { z } from "zod"

import { isAllowedUrl } from "@/lib/url-validation"
import type { FormatOption } from "@/lib/web/types"

// Reusable validators
const safeUrl = z.string().refine(isAllowedUrl, "Invalid URL")
const formatOptions = z.array(z.custom<FormatOption>()).optional()

// Web search
export const webSearchSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(20).optional(),
  location: z.string().optional(),
})

// Web scrape
export const webScrapeSchema = z.object({
  url: safeUrl,
  formats: formatOptions,
  onlyMainContent: z.boolean().optional(),
  waitFor: z.number().int().min(0).max(30000).optional(),
})

// Web crawl
export const webCrawlSchema = z.object({
  url: safeUrl,
  limit: z.number().int().min(1).max(100).optional(),
  maxDepth: z.number().int().min(1).max(10).optional(),
  includePaths: z.array(z.string()).optional(),
  excludePaths: z.array(z.string()).optional(),
  scrapeOptions: z
    .object({ formats: formatOptions })
    .optional(),
})

// Batch scrape
export const webBatchScrapeSchema = z.object({
  urls: z.array(safeUrl).min(1).max(20),
  formats: formatOptions,
})

// Extract
export const webExtractSchema = z.object({
  urls: z.array(safeUrl).min(1).max(10),
  prompt: z.string().min(1).max(2000),
  schema: z.record(z.string(), z.unknown()).optional(),
})


// Helper: parse and return typed data or error Response
export function parseBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; response: Response } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const firstError = result.error.issues[0]?.message ?? "Invalid request"
    return {
      success: false,
      response: new Response(firstError, { status: 400 }),
    }
  }
  return { success: true, data: result.data }
}
