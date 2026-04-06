import { createHash, timingSafeEqual } from "node:crypto"

/**
 * Compares two strings in constant time to prevent timing attacks.
 * It hashes both inputs with SHA-256 before comparing them with timingSafeEqual,
 * which handles varying string lengths safely.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest()
  const hashB = createHash("sha256").update(b).digest()
  return timingSafeEqual(hashA, hashB)
}
