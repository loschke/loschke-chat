/**
 * generate_image tool — generates, edits, or combines images using Gemini.
 *
 * Content format: JSON array of ImageGalleryEntry[] stored in artifacts.content.
 * This enables iteration history (input thumbnails, generated versions, iterations).
 */

import { tool } from "ai"
import { z } from "zod"
import { nanoid } from "nanoid"
import { createArtifact, getArtifactByIdForUser, updateArtifactContent } from "@/lib/db/queries/artifacts"
import { generateImageFromPrompt } from "@/lib/ai/image-generation"
import { features } from "@/config/features"
import { parseImageGallery, getLatestImageUrl, type ImageGalleryEntry } from "@/lib/ai/image-gallery"
import { getErrorMessage } from "@/lib/errors"
import type { ToolRegistration } from "./registry"

/** Uploaded image from a chat message file part */
export interface UploadedImage {
  data: string // base64 or data URL
  mediaType: string
}

/**
 * Factory: creates a generate_image tool scoped to a chat + user.
 * uploadedImages: file parts from the current user message (for combining/editing uploaded images)
 */
export function generateImageTool(chatId: string, userId: string, uploadedImages?: UploadedImage[]) {
  return tool({
    description:
      "Generate, edit, or combine images based on text descriptions. " +
      "Use this when the user asks for image creation, illustration, visualization, infographic, or any visual content. " +
      "IMPORTANT for editing/iteration: When the user wants to modify an existing generated image, you MUST set referenceArtifactIds with the artifact ID AND targetArtifactId to append to the gallery. " +
      "The reference image will be sent to the model so it preserves the original and only changes what the user asked for. " +
      "IMPORTANT for combining uploaded images: When the user uploads images and wants to combine them, set useUploadedImages to true. " +
      "The actual uploaded image data will be passed to the model automatically — you do NOT need to describe the images, the model will see them. " +
      "Write the prompt in English for best results. Be specific about what to do with the images.",
    inputSchema: z.object({
      prompt: z.string().min(3).max(2000).describe(
        "Detailed description of the image to generate or edit. For editing: describe ONLY the changes, not the whole image. For combining: describe how to compose the images together. Write in English."
      ),
      title: z.string().max(200).describe("Short title for the generated image"),
      aspectRatio: z.enum(["1:1", "16:9", "9:16", "3:2", "2:3", "4:3", "3:4", "4:5", "21:9"]).optional().describe(
        "Aspect ratio. 1:1 square, 16:9 landscape, 9:16 portrait/story, 3:2 photo, 2:3 poster, 4:3 classic, 3:4 portrait, 4:5 instagram, 21:9 cinematic"
      ),
      style: z.string().max(200).optional().describe(
        "Style hint, e.g. 'photorealistic', 'watercolor illustration', 'flat vector graphic', 'oil painting', 'minimalist line art'"
      ),
      referenceArtifactIds: z.array(z.string()).max(4).optional().describe(
        "IDs of existing image artifacts to use as reference. ALWAYS set this when editing or iterating on a previously generated image. The actual image data will be loaded and sent to the model."
      ),
      targetArtifactId: z.string().optional().describe(
        "ID of an existing image artifact to iterate on. Sets this to append the new version to that artifact's gallery. ALWAYS set this together with referenceArtifactIds when iterating."
      ),
      useUploadedImages: z.boolean().optional().describe(
        "Set to true to include the user's uploaded images from the current message as input for combining or editing. The model will receive the actual image data."
      ),
      referenceImageUrl: z.string().url().optional().describe(
        "URL of a reference image from the Design Library for image-to-image generation. Use when the user wants to edit or create variations of a library image."
      ),
    }),
    execute: async ({ prompt, title, aspectRatio, style, referenceArtifactIds, targetArtifactId, useUploadedImages: shouldUseUploads, referenceImageUrl }) => {
      // 1. Collect reference images from all sources
      const referenceImages: Buffer[] = []
      const inputEntries: ImageGalleryEntry[] = []

      // 1a. Load from existing artifacts (for iteration/editing) — parallel fetch
      if (referenceArtifactIds && referenceArtifactIds.length > 0) {
        const artifacts = await Promise.all(referenceArtifactIds.map((id) => getArtifactByIdForUser(id)))
        const imageUrls = artifacts
          .filter((a): a is NonNullable<typeof a> => a !== null)
          .map((a) => getLatestImageUrl(a.content))
          .filter((url): url is string => url !== null)
        const buffers = await Promise.all(imageUrls.map((url) => urlToBuffer(url)))

        for (let i = 0; i < imageUrls.length; i++) {
          const buf = buffers[i]
          if (buf) {
            referenceImages.push(buf)
            inputEntries.push({ url: imageUrls[i], role: "input", timestamp: new Date().toISOString() })
          }
        }
      }

      // 1b. Load uploaded images from the current message (for combining)
      if (shouldUseUploads && uploadedImages && uploadedImages.length > 0) {
        for (const img of uploadedImages) {
          const buffer = uploadedImageToBuffer(img)
          if (buffer) {
            referenceImages.push(buffer)
            // Create a small data URL for the gallery thumbnail
            const thumbnailUrl = img.data.startsWith("data:")
              ? img.data
              : `data:${img.mediaType};base64,${img.data}`
            inputEntries.push({
              url: thumbnailUrl,
              role: "input",
              timestamp: new Date().toISOString(),
            })
          }
        }
      }

      // 1c. Load reference image from URL (Design Library image-to-image)
      if (referenceImageUrl) {
        const buffer = await urlToBuffer(referenceImageUrl)
        if (buffer) {
          referenceImages.push(buffer)
          inputEntries.push({
            url: referenceImageUrl,
            role: "input",
            timestamp: new Date().toISOString(),
          })
        }
      }

      // 1d. Auto-load previous image for iteration even if referenceArtifactIds was forgotten
      if (targetArtifactId && referenceImages.length === 0) {
        const existing = await getArtifactByIdForUser(targetArtifactId)
        if (existing && existing.type === "image") {
          const imageUrl = getLatestImageUrl(existing.content)
          if (imageUrl) {
            const buffer = await urlToBuffer(imageUrl)
            if (buffer) {
              referenceImages.push(buffer)
            }
          }
        }
      }

      // 2. Generate image (model resolved from DB registry)
      const result = await generateImageFromPrompt({
        prompt,
        aspectRatio,
        style,
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
      })
      const resolvedModelId = result.modelId

      // 3. Upload to R2 or create data URL
      let imageUrl: string
      let r2Url: string | undefined

      if (features.storage.enabled) {
        try {
          const { uploadBuffer } = await import("@/lib/storage")
          const buffer = Buffer.from(result.base64, "base64")
          const ext = result.mimeType === "image/jpeg" ? "jpg" : "png"
          const storageKey = `generated-images/${chatId}/${nanoid()}.${ext}`
          r2Url = await uploadBuffer(buffer, result.mimeType, `${title}.${ext}`, storageKey)
          imageUrl = r2Url
        } catch (err) {
          console.warn("[generate_image] R2 upload failed, using data URL:", getErrorMessage(err))
          imageUrl = `data:${result.mimeType};base64,${result.base64}`
        }
      } else {
        imageUrl = `data:${result.mimeType};base64,${result.base64}`
      }

      // 4. Build gallery entry
      const newEntry: ImageGalleryEntry = {
        url: imageUrl,
        role: targetArtifactId ? "iteration" : "generated",
        prompt,
        timestamp: new Date().toISOString(),
      }

      // 5. Persist: append to existing artifact or create new
      let artifactId: string
      let version = 1

      if (targetArtifactId) {
        // Iteration: append to existing gallery
        const existing = await getArtifactByIdForUser(targetArtifactId)
        if (existing && existing.type === "image") {
          const gallery = parseImageGallery(existing.content)
          gallery.push(newEntry)
          const updated = await updateArtifactContent(
            targetArtifactId,
            userId,
            JSON.stringify(gallery),
            existing.version
          )
          artifactId = targetArtifactId
          version = updated?.version ?? existing.version + 1
        } else {
          // Fallback: create new if target not found
          const gallery = [...inputEntries, newEntry]
          const artifact = await createArtifact({
            chatId,
            type: "image",
            title,
            content: JSON.stringify(gallery),
            fileUrl: r2Url,
          })
          artifactId = artifact.id
        }
      } else {
        // New artifact
        const gallery = [...inputEntries, newEntry]
        const artifact = await createArtifact({
          chatId,
          type: "image",
          title,
          content: JSON.stringify(gallery),
          fileUrl: r2Url,
        })
        artifactId = artifact.id
      }

      // 6. Credit deduction (flat rate for image generation)
      const { deductToolCredits, calculateImageCredits } = await import("@/lib/credits")
      const creditError = await deductToolCredits(userId, calculateImageCredits(), {
        chatId, description: "Bildgenerierung", toolName: "generate_image",
      })
      if (creditError) {
        console.warn("[generate_image] Credits insufficient after generation:", creditError)
      }

      return {
        artifactId,
        title,
        type: "image" as const,
        version,
      }
    },
  })
}

// --- Helpers ---

/** Convert an uploaded image (base64 or data URL) to a Buffer. */
function uploadedImageToBuffer(img: UploadedImage): Buffer | null {
  try {
    if (img.data.startsWith("data:")) {
      const base64 = img.data.split(",")[1]
      if (!base64) return null
      return Buffer.from(base64, "base64")
    }
    return Buffer.from(img.data, "base64")
  } catch {
    return null
  }
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

/** Convert a data URL or HTTP URL to a Buffer for use as reference image. */
async function urlToBuffer(url: string): Promise<Buffer | null> {
  try {
    if (url.startsWith("data:")) {
      const base64 = url.split(",")[1]
      if (!base64) return null
      return Buffer.from(base64, "base64")
    }
    // SSRF protection: validate URL before server-side fetch
    const { isAllowedUrl } = await import("@/lib/url-validation")
    if (!isAllowedUrl(url)) return null
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const contentLength = res.headers.get("content-length")
    if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE) return null
    const arrayBuffer = await res.arrayBuffer()
    if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) return null
    return Buffer.from(arrayBuffer)
  } catch {
    return null
  }
}

export const registration: ToolRegistration = {
  name: "generate_image",
  label: "Bild generieren",
  icon: "Image",
  category: "media",
  customRenderer: true,
  privacySensitive: true,
}
