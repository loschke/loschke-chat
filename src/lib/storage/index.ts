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

function getClient(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials nicht gesetzt.")
  }

  // Use R2_S3_ENDPOINT if set (e.g. EU jurisdiction), otherwise construct from account ID
  const endpoint = process.env.R2_S3_ENDPOINT ?? `https://${accountId}.r2.cloudflarestorage.com`

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  })
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error("R2_BUCKET_NAME nicht gesetzt.")
  return bucket
}

function getPublicUrl(key: string): string {
  const domain = process.env.R2_PUBLIC_DOMAIN
  if (domain) {
    const base = domain.startsWith("http") ? domain : `https://${domain}`
    return `${base.replace(/\/+$/, "")}/${key}`
  }
  // Fallback: signed URL needed
  return ""
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
