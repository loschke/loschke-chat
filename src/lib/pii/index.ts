import { runPatterns } from "./patterns"
import { applyRedactions } from "./redaction"
import type { PiiDetectionResult, PiiRedactionResult } from "./types"

export type { PiiFinding, PiiEntityType, PiiDetectionResult, PiiRedactionResult } from "./types"
export { PII_LABELS } from "./types"

/**
 * Detect PII entities in text using regex patterns.
 * Runs entirely server-side, no external API calls.
 */
export function detectPii(text: string): PiiDetectionResult {
  const findings = runPatterns(text)
  return {
    hasPii: findings.length > 0,
    findings,
  }
}

/**
 * Detect and redact PII entities in text.
 * Returns both the redacted text and the findings for audit logging.
 */
export function redactPii(text: string): PiiRedactionResult {
  const findings = runPatterns(text)
  const redactedText = findings.length > 0
    ? applyRedactions(text, findings)
    : text

  return {
    redactedText,
    findings,
  }
}
