/**
 * Image generation wrapper around AI SDK generateImage().
 * Uses @ai-sdk/google direct provider (not gateway — generateImage is not supported via gateway).
 *
 * Model resolution: DB (category "image") → FALLBACK_IMAGE_MODEL.
 * DB stores gateway-style IDs (e.g. "google/gemini-3.1-flash-image-preview"),
 * the google/ prefix is stripped for the @ai-sdk/google provider.
 */

import { generateImage } from "ai"
import { google } from "@ai-sdk/google"
import { getImageModel } from "@/config/models"

const FALLBACK_IMAGE_MODEL = "gemini-2.5-flash-image"
const IMAGE_TIMEOUT_MS = 60_000

export interface GenerateImageParams {
  /** Detailed description of the image to generate */
  prompt: string
  /** Aspect ratio for the generated image */
  aspectRatio?: "1:1" | "16:9" | "9:16" | "3:2" | "2:3" | "4:3" | "3:4" | "4:5" | "21:9"
  /** Optional style hint prepended to the prompt */
  style?: string
  /** Reference images for editing/combining (Buffer or base64 string) */
  referenceImages?: (Buffer | string)[]
}

export interface GenerateImageResult {
  base64: string
  mimeType: string
  /** The resolved model ID (gateway format, e.g. "google/gemini-3.1-flash-image-preview") */
  modelId: string
}

/**
 * Resolve the image model ID from the model registry.
 * Strips the "google/" prefix for the @ai-sdk/google provider (same pattern as Mistral in privacy-provider.ts).
 */
async function resolveImageModelId(): Promise<{ providerModelId: string; gatewayModelId: string }> {
  const dbModel = await getImageModel()
  if (dbModel) {
    const providerModelId = dbModel.id.replace(/^google\//, "")
    return { providerModelId, gatewayModelId: dbModel.id }
  }
  return {
    providerModelId: FALLBACK_IMAGE_MODEL,
    gatewayModelId: `google/${FALLBACK_IMAGE_MODEL}`,
  }
}

/**
 * Generate or edit an image using Gemini.
 *
 * - Without referenceImages: generates a new image from text prompt
 * - With referenceImages: edits/combines existing images based on text prompt
 */
export async function generateImageFromPrompt(
  params: GenerateImageParams
): Promise<GenerateImageResult> {
  const fullPrompt = params.style
    ? `${params.style}. ${params.prompt}`
    : params.prompt

  const hasReferences = params.referenceImages && params.referenceImages.length > 0

  // Build prompt: text-only for generation, { text, images } for editing/combining
  const prompt = hasReferences
    ? {
        text: fullPrompt,
        images: params.referenceImages!.map((img) =>
          typeof img === "string" ? Buffer.from(img, "base64") : img
        ),
      }
    : fullPrompt

  const { providerModelId, gatewayModelId } = await resolveImageModelId()

  const result = await Promise.race([
    generateImage({
      model: google.image(providerModelId),
      prompt,
      aspectRatio: params.aspectRatio ?? "1:1",
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Bildgenerierung Timeout (60s)")), IMAGE_TIMEOUT_MS)
    ),
  ])

  const image = result.image
  if (!image) {
    throw new Error("Keine Bilddaten vom Modell erhalten")
  }

  return {
    base64: image.base64,
    mimeType: "image/png",
    modelId: gatewayModelId,
  }
}
