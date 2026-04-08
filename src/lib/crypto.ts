import { timingSafeEqual, createHash } from "node:crypto";

/**
 * Compares two strings in constant time to prevent timing attacks.
 * It hashes the strings first so that they have the same length before comparison,
 * bypassing `timingSafeEqual`'s requirement that inputs must be of the same length.
 *
 * @param a First string to compare
 * @param b Second string to compare
 * @returns boolean true if strings are strictly equal
 */
export function timingSafeCompare(a: string, b: string): boolean {
  try {
    const hashA = createHash("sha256").update(a).digest();
    const hashB = createHash("sha256").update(b).digest();
    return timingSafeEqual(hashA, hashB);
  } catch (error) {
    return false;
  }
}
