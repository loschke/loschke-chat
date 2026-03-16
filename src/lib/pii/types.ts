export interface PiiFinding {
  /** PII entity type */
  type: PiiEntityType
  /** The matched text */
  value: string
  /** Start index in original text */
  start: number
  /** End index in original text */
  end: number
  /** Human-readable label for UI */
  label: string
}

export type PiiEntityType =
  | "email"
  | "iban"
  | "credit_card"
  | "phone_de"
  | "tax_id"
  | "svn"
  | "plz_city"
  | "ip_address"
  | "url"

export interface PiiDetectionResult {
  hasPii: boolean
  findings: PiiFinding[]
}

export interface PiiRedactionResult {
  redactedText: string
  findings: PiiFinding[]
}

export const PII_LABELS: Record<PiiEntityType, string> = {
  email: "E-Mail-Adresse",
  iban: "IBAN",
  credit_card: "Kreditkartennummer",
  phone_de: "Telefonnummer",
  tax_id: "Steuer-ID",
  svn: "Sozialversicherungsnummer",
  plz_city: "PLZ + Ort",
  ip_address: "IP-Adresse",
  url: "URL",
}
