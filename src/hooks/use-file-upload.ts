interface PresignResponse {
  uploadUrl: string
  storageKey: string
  publicUrl: string
  contentType: string
  filename: string
}

interface UploadResult {
  url: string
  filename: string
  contentType: string
}

interface UploadProgress {
  loaded: number
  total: number
  percent: number
}

type OnProgress = (progress: UploadProgress) => void

/**
 * Upload a file directly to R2 via pre-signed URL.
 * Bypasses the Vercel 4.5MB request body limit.
 *
 * Flow: Client → /api/upload/presign → Pre-signed PUT URL → Direct upload to R2
 */
async function uploadToR2(
  file: File,
  onProgress?: OnProgress
): Promise<UploadResult> {
  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      size: file.size,
      contentType: file.type,
    }),
  })

  if (!presignRes.ok) {
    const error = await presignRes.json().catch(() => ({ error: "Presign fehlgeschlagen" }))
    throw new Error(error.error ?? `Presign fehlgeschlagen (${presignRes.status})`)
  }

  const presign: PresignResponse = await presignRes.json()

  if (onProgress) {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("PUT", presign.uploadUrl)
      xhr.setRequestHeader("Content-Type", file.type)

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percent: Math.round((e.loaded / e.total) * 100),
          })
        }
      })

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload fehlgeschlagen (${xhr.status})`))
        }
      })

      xhr.addEventListener("error", () => reject(new Error("Upload fehlgeschlagen (Netzwerkfehler)")))
      xhr.addEventListener("abort", () => reject(new Error("Upload abgebrochen")))

      xhr.send(file)
    })
  } else {
    const uploadRes = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    })

    if (!uploadRes.ok) {
      throw new Error(`Upload fehlgeschlagen (${uploadRes.status})`)
    }
  }

  return {
    url: presign.publicUrl,
    filename: presign.filename,
    contentType: presign.contentType,
  }
}

export { uploadToR2 }
export type { UploadResult, UploadProgress, OnProgress }
