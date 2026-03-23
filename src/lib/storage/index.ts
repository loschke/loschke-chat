import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { nanoid } from "nanoid"

import type { UploadOptions, UploadResult, StorageFile } from "./types"
import { validateFile, validateMagicBytes, sanitizeFilename, FileValidationError } from "./validation"

let _client: S3Client | null = null

function getClient(): S3Client {
  if (_client) return _client

  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials nicht gesetzt.")
  }

  const endpoint = process.env.R2_S3_ENDPOINT ?? `https://${accountId}.r2.cloudflarestorage.com`

  _client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  })
  return _client
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error("R2_BUCKET_NAME nicht gesetzt.")
  return bucket
}

function getR2BaseUrl(): string | null {
  const domain = process.env.R2_PUBLIC_DOMAIN
  if (!domain) return null
  const base = domain.startsWith("http") ? domain : `https://${domain}`
  return base.replace(/\/+$/, "")
}

function getPublicUrl(key: string): string {
  const base = getR2BaseUrl()
  return base ? `${base}/${key}` : ""
}

/**
 * Upload a file to R2.
 * Validates file type, size, and filename before uploading.
 */
export async function uploadFile(
  file: File,
  userId: string,
  options?: UploadOptions
): Promise<UploadResult> {
  const validation = validateFile(file, options)
  if (!validation.valid) {
    throw new FileValidationError(validation.code!, validation.error!)
  }

  const arrayBuffer = await file.arrayBuffer()

  // Magic byte validation: verify file content matches declared MIME type
  if (!validateMagicBytes(arrayBuffer, file.type)) {
    throw new FileValidationError("INVALID_MAGIC_BYTES", "Dateityp nicht erlaubt.")
  }

  const client = getClient()
  const bucket = getBucket()
  const prefix = options?.prefix ?? `uploads/${userId}/`
  const safeName = sanitizeFilename(file.name)
  const key = `${prefix}${nanoid()}-${safeName}`

  const buffer = Buffer.from(arrayBuffer)

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ContentLength: file.size,
    })
  )

  const publicUrl = getPublicUrl(key)

  return {
    key,
    url: publicUrl || (await getSignedDownloadUrl(key)),
    size: file.size,
    contentType: file.type,
    filename: safeName,
  }
}

/**
 * Upload a buffer to R2 (for server-side uploads, e.g. chat attachments).
 * Returns the public URL or a signed URL.
 */
export async function uploadBuffer(
  buffer: Buffer,
  contentType: string,
  filename: string,
  storageKey: string
): Promise<string> {
  const client = getClient()
  const bucket = getBucket()

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      Body: buffer,
      ContentType: contentType,
      ContentLength: buffer.length,
    })
  )

  const publicUrl = getPublicUrl(storageKey)
  return publicUrl || (await getSignedDownloadUrl(storageKey))
}

/**
 * Delete a file from R2.
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getClient()
  const bucket = getBucket()

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  )
}

/**
 * Generate a signed download URL for private files.
 * Valid for 1 hour by default.
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const client = getClient()
  const bucket = getBucket()

  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn }
  )
}

/**
 * Generate a pre-signed PUT URL for direct client-to-R2 uploads.
 * Bypasses the Vercel 4.5MB request body limit.
 */
export async function getSignedUploadUrl(
  storageKey: string,
  contentType: string,
  contentLength: number,
  expiresIn = 300
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const client = getClient()
  const bucket = getBucket()

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      ContentType: contentType,
      ContentLength: contentLength,
    }),
    { expiresIn }
  )

  const publicUrl = getPublicUrl(storageKey)

  return {
    uploadUrl,
    publicUrl: publicUrl || storageKey, // Fallback to key if no public domain
  }
}

/**
 * Check if a URL points to our R2 storage.
 */
export function isR2Url(url: string): boolean {
  const base = getR2BaseUrl()
  if (!base) return false
  try {
    const parsed = new URL(url)
    const baseParsed = new URL(base)
    return parsed.hostname === baseParsed.hostname
  } catch {
    return false
  }
}

/**
 * Fetch a file from R2 by its public URL or storage key.
 * Used for server-side document extraction before sending to LLMs.
 */
export async function fetchFromR2(url: string): Promise<Buffer> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`R2 fetch failed: ${response.status} ${response.statusText}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * List files in R2 with an optional prefix filter.
 */
export async function listFiles(prefix?: string): Promise<StorageFile[]> {
  const client = getClient()
  const bucket = getBucket()

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 100,
    })
  )

  return (response.Contents ?? []).map((obj) => ({
    key: obj.Key ?? "",
    size: obj.Size ?? 0,
    lastModified: obj.LastModified ?? new Date(),
  }))
}
