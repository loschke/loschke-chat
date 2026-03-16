"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { PiiFinding } from "@/lib/pii/types"

interface BusinessModeStatus {
  enabled: boolean
  options: {
    redaction: boolean
    euModel: boolean
    localModel: boolean
  }
}

export type PrivacyRoute = "eu" | "local"

export type SendDecision =
  | { action: "send"; text: string; privacyRoute?: undefined }
  | { action: "send_redacted"; text: string; privacyRoute?: undefined }
  | { action: "send_eu"; text: string; privacyRoute: "eu" }
  | { action: "send_local"; text: string; privacyRoute: "local" }
  | { action: "cancel" }

interface PiiDialogState {
  open: boolean
  text: string
  findings: PiiFinding[]
}

interface FileDialogState {
  open: boolean
  files: Array<{ name: string; type: string; size: number }>
}

export function useBusinessMode() {
  const [status, setStatus] = useState<BusinessModeStatus | null>(null)
  const resolveRef = useRef<((decision: SendDecision) => void) | null>(null)

  const [piiDialog, setPiiDialog] = useState<PiiDialogState>({
    open: false,
    text: "",
    findings: [],
  })

  const [fileDialog, setFileDialog] = useState<FileDialogState>({
    open: false,
    files: [],
  })

  // Fetch status on mount
  useEffect(() => {
    fetch("/api/business-mode/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStatus(data as BusinessModeStatus)
      })
      .catch(() => {})
  }, [])

  const isEnabled = status?.enabled ?? false

  /**
   * Check text for PII before sending.
   * If PII found, opens dialog and waits for user decision.
   * If files attached, shows file consent dialog first.
   */
  const checkBeforeSend = useCallback(
    async (
      text: string,
      files?: Array<{ name: string; type: string; size: number }>
    ): Promise<SendDecision> => {
      if (!isEnabled) return { action: "send", text }

      // Step 1: File consent if files attached
      if (files && files.length > 0) {
        const fileDecision = await new Promise<SendDecision>(
          (resolve) => {
            resolveRef.current = resolve
            setFileDialog({ open: true, files })
          }
        )

        if (fileDecision.action === "cancel") {
          return { action: "cancel" }
        }

        // EU/Local route chosen in file dialog — skip PII check (GDPR-compliant model)
        if (fileDecision.action === "send_eu" || fileDecision.action === "send_local") {
          return { ...fileDecision, text }
        }
      }

      // Step 2: PII check
      if (!text.trim()) return { action: "send", text }

      try {
        const res = await fetch("/api/business-mode/pii-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        })
        if (!res.ok) return { action: "send", text } // Fail open

        const result = await res.json()
        if (!result.hasPii) return { action: "send", text }

        // PII found — show dialog
        return new Promise<SendDecision>((resolve) => {
          resolveRef.current = resolve
          setPiiDialog({
            open: true,
            text,
            findings: result.findings as PiiFinding[],
          })
        })
      } catch {
        // PII check failed — fail open, let the message through
        return { action: "send", text }
      }
    },
    [isEnabled]
  )

  /** Handle PII dialog decision */
  const handlePiiDecision = useCallback(
    async (decision: "accept" | "redact" | "eu" | "local" | "cancel") => {
      const resolve = resolveRef.current
      if (!resolve) return

      const text = piiDialog.text
      setPiiDialog((prev) => ({ ...prev, open: false }))

      // Log consent
      const consentDecision =
        decision === "accept" ? "accepted"
          : decision === "redact" ? "redacted"
            : decision === "eu" ? "rerouted_eu"
              : decision === "local" ? "rerouted_local"
                : "rejected"

      fetch("/api/business-mode/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consentType: "pii_detected",
          decision: consentDecision,
          piiFindings: piiDialog.findings,
          messagePreview: text.slice(0, 100),
        }),
      }).catch(() => {})

      if (decision === "cancel") {
        resolve({ action: "cancel" })
        return
      }

      if (decision === "redact") {
        try {
          const res = await fetch("/api/business-mode/redact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          })
          if (res.ok) {
            const data = await res.json()
            resolve({ action: "send_redacted", text: data.redactedText })
            return
          }
        } catch {
          // Redaction failed — cancel
        }
        resolve({ action: "cancel" })
        return
      }

      if (decision === "eu") {
        resolve({ action: "send_eu", text, privacyRoute: "eu" })
        return
      }

      if (decision === "local") {
        resolve({ action: "send_local", text, privacyRoute: "local" })
        return
      }

      // accept — send as-is
      resolve({ action: "send", text })
    },
    [piiDialog.text, piiDialog.findings]
  )

  /** Handle file dialog decision */
  const handleFileDecision = useCallback(
    (decision: "accept" | "reject" | "eu" | "local") => {
      const resolve = resolveRef.current
      setFileDialog((prev) => ({ ...prev, open: false }))

      // Log consent
      const consentDecision =
        decision === "accept" ? "accepted"
          : decision === "reject" ? "rejected"
            : decision === "eu" ? "rerouted_eu"
              : "rerouted_local"

      fetch("/api/business-mode/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consentType: "file_upload",
          decision: consentDecision,
          fileMetadata: fileDialog.files,
        }),
      }).catch(() => {})

      if (resolve) {
        if (decision === "reject") {
          resolve({ action: "cancel" })
        } else if (decision === "eu") {
          resolve({ action: "send_eu", text: "", privacyRoute: "eu" })
        } else if (decision === "local") {
          resolve({ action: "send_local", text: "", privacyRoute: "local" })
        } else {
          resolve({ action: "send", text: "" })
        }
      }
    },
    [fileDialog.files]
  )

  return {
    isEnabled,
    options: status?.options ?? { redaction: true, euModel: false, localModel: false },
    checkBeforeSend,
    piiDialog,
    fileDialog,
    handlePiiDecision,
    handleFileDecision,
  }
}
