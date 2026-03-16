import type { PiiFinding, PiiEntityType } from "./types"
import taxIdValidator from "german-tax-id-validator"
import { isValidIBAN, electronicFormatIBAN } from "ibantools"

interface PatternDef {
  type: PiiEntityType
  label: string
  regex: RegExp
  validate?: (match: string) => boolean
}

/**
 * German phone numbers: +49, 0049, or leading 0 with area code
 * Matches: +49 151 12345678, +49(0)30 12345678, 030/12345678, 0151-12345678
 */
const PHONE_DE_REGEX = /(?:\+49|0049)[\s./(-]*\d[\d\s./()-]{6,14}\d|(?<!\d)0\d{1,5}[\s./-]\d[\d\s./-]{4,10}\d(?!\d)/g

/**
 * German IBAN: DE followed by 2 check digits + 18 digits (with optional spaces/separators)
 */
const IBAN_DE_REGEX = /\bDE\s?\d{2}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{2}\b/gi

/**
 * German Steuer-ID (Steueridentifikationsnummer): exactly 11 digits
 */
const TAX_ID_REGEX = /\b\d{11}\b/g

/**
 * German SVN (Sozialversicherungsnummer): 12 digits, letter, 3 digits
 * Format: XX DDMMYY L NNN (area, birthday, letter, serial)
 */
const SVN_REGEX = /\b\d{2}\s?\d{6}\s?[A-Z]\s?\d{3}\b/g

/**
 * German PLZ + City: 5-digit PLZ followed by city name
 */
const PLZ_CITY_REGEX = /\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß]{2,}(?:\s(?:am|an|bei|im|ob|in)\s[A-ZÄÖÜ][a-zäöüß]+|\s[A-ZÄÖÜ][a-zäöüß]+)?\b/g

/**
 * Credit card numbers: 13-19 digits with optional spaces/dashes
 * Matches common formats: 4111 1111 1111 1111, 4111-1111-1111-1111
 */
const CREDIT_CARD_REGEX = /\b(?:\d[\s-]?){12,18}\d\b/g

/**
 * IPv4 addresses
 */
const IPV4_REGEX = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g

/**
 * Email addresses
 */
const EMAIL_REGEX = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g

/**
 * URLs with protocol
 */
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi

/** Credit card Luhn check */
function isValidLuhn(num: string): boolean {
  const digits = num.replace(/[\s-]/g, "")
  if (digits.length < 13 || digits.length > 19) return false
  let sum = 0
  let alternate = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10)
    if (alternate) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alternate = !alternate
  }
  return sum % 10 === 0
}

const PATTERNS: PatternDef[] = [
  { type: "email", label: "E-Mail-Adresse", regex: EMAIL_REGEX },
  {
    type: "iban",
    label: "IBAN",
    regex: IBAN_DE_REGEX,
    validate: (match) => {
      const electronic = electronicFormatIBAN(match.replace(/\s/g, ""))
      return electronic !== null && isValidIBAN(electronic)
    },
  },
  {
    type: "credit_card",
    label: "Kreditkartennummer",
    regex: CREDIT_CARD_REGEX,
    validate: (match) => isValidLuhn(match),
  },
  { type: "phone_de", label: "Telefonnummer", regex: PHONE_DE_REGEX },
  {
    type: "tax_id",
    label: "Steuer-ID",
    regex: TAX_ID_REGEX,
    validate: (match) => taxIdValidator.validate(match),
  },
  { type: "svn", label: "Sozialversicherungsnummer", regex: SVN_REGEX },
  { type: "plz_city", label: "PLZ + Ort", regex: PLZ_CITY_REGEX },
  { type: "ip_address", label: "IP-Adresse", regex: IPV4_REGEX },
  { type: "url", label: "URL", regex: URL_REGEX },
]

/**
 * Run all regex patterns against text and return deduplicated, sorted findings.
 */
export function runPatterns(text: string): PiiFinding[] {
  const findings: PiiFinding[] = []

  for (const pattern of PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.regex.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = pattern.regex.exec(text)) !== null) {
      const value = match[0]
      if (pattern.validate && !pattern.validate(value)) continue

      findings.push({
        type: pattern.type,
        value,
        start: match.index,
        end: match.index + value.length,
        label: pattern.label,
      })
    }
  }

  // Sort by position, then deduplicate overlapping matches (keep longer match)
  findings.sort((a, b) => a.start - b.start || b.end - a.end)
  return deduplicateOverlapping(findings)
}

/**
 * Remove overlapping findings, keeping the longer (more specific) match.
 */
function deduplicateOverlapping(sorted: PiiFinding[]): PiiFinding[] {
  const result: PiiFinding[] = []
  let lastEnd = -1

  for (const finding of sorted) {
    if (finding.start >= lastEnd) {
      result.push(finding)
      lastEnd = finding.end
    } else if (finding.end > lastEnd) {
      // Overlapping but extends further — replace last
      result[result.length - 1] = finding
      lastEnd = finding.end
    }
    // Otherwise fully contained in previous match — skip
  }

  return result
}
