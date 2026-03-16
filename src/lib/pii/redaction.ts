import type { PiiEntityType, PiiFinding } from "./types"

type RedactionStrategy = (value: string) => string

const REDACTION_STRATEGIES: Record<PiiEntityType, RedactionStrategy> = {
  email: (v) => {
    const [local, domain] = v.split("@")
    return `${local[0]}***@${domain}`
  },
  iban: (v) => {
    const clean = v.replace(/\s/g, "")
    return `${clean.slice(0, 4)} **** **** ${clean.slice(-2)}`
  },
  credit_card: (v) => {
    const digits = v.replace(/[\s-]/g, "")
    return `**** **** **** ${digits.slice(-4)}`
  },
  phone_de: (v) => {
    const digits = v.replace(/[^\d+]/g, "")
    return `${digits.slice(0, 4)} **** ${digits.slice(-2)}`
  },
  tax_id: () => "***********",
  svn: () => "** ****** * ***",
  plz_city: (v) => {
    return `${v.slice(0, 2)}*** ****`
  },
  ip_address: (v) => {
    const parts = v.split(".")
    return `${parts[0]}.${parts[1]}.*.*`
  },
  url: (v) => {
    try {
      const url = new URL(v)
      return `${url.protocol}//${url.hostname}/***`
    } catch {
      return "https://***"
    }
  },
}

/**
 * Apply redaction to text based on findings.
 * Processes findings from end to start to preserve indices.
 */
export function applyRedactions(text: string, findings: PiiFinding[]): string {
  // Sort by position descending to apply replacements from end
  const sorted = [...findings].sort((a, b) => b.start - a.start)
  let result = text

  for (const finding of sorted) {
    const strategy = REDACTION_STRATEGIES[finding.type]
    const masked = strategy(finding.value)
    result = result.slice(0, finding.start) + masked + result.slice(finding.end)
  }

  return result
}
