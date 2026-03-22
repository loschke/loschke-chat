/**
 * Image generation wrapper around AI SDK generateImage().
 * Uses @ai-sdk/google direct provider (not gateway — generateImage is not supported via gateway).
 */

import { generateImage } from "ai"
import { google } from "@ai-sdk/google"

const IMAGE_MODEL = "gemini-2.5-flash-image"

export interface GenerateImageParams {
  /** Detailed description of the image to generate */
  prompt: string
  /** Aspect ratio for the generated image */
  aspectRatio?: "1:1" | "16:9" | "9:16" | "3:2" | "2:3"
  /** Optional style hint prepended to the prompt */
  style?: string
  /** Reference images for editing/combining (Buffer or base64 string) */
  referenceImages?: (Buffer | string)[]
}

export interface GenerateImageResult {
  base64: string
  mimeType: string
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

  const result = await generateImage({
    model: google.image(IMAGE_MODEL),
    prompt,
    aspectRatio: params.aspectRatio ?? "1:1",
  })

  const image = result.image
  if (!image) {
    throw new Error("Keine Bilddaten vom Modell erhalten")
  }

  return {
    base64: image.base64,
    mimeType: "image/png",
  }
}
