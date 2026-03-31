"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { PiiFinding } from "@/lib/pii/types"

interface BusinessModeStatus {
  enabled: boolean
  options: {
    redaction: boolean
    euModel: boolean
    deModel: boolean
    localModel: boolean
  }
  safeChat?: {
    route: PrivacyRoute
    label: string
    hasLocalModel: boolean
  }
}

export type PrivacyRoute = "eu" | "de" | "local"

const ROUTE_TO_ACTION = {
  eu: "send_eu",
  de: "send_de",
  local: "send_local",
} as const satisfies Record<PrivacyRoute, string>

export type SendDecision =
  | { action: "send"; text: string; privacyRoute?: undefined }
  | { action: "send_redacted"; text: string; privacyRoute?: undefined }
  | { action: "send_eu"; text: string; privacyRoute: "eu" }
  | { action: "send_de"; text: string; privacyRoute: "de" }
  | { action: "send_local"; text: string; privacyRoute: "local" }
  | { action: "cancel" }

export function isPrivacyRouteAction(action: string): action is "send_eu" | "send_de" | "send_local" {
  return action === "send_eu" || action === "send_de" || action === "send_local"
}

function makeRoutedDecision(route: PrivacyRoute, text: string): SendDecision {
  const action = ROUTE_TO_ACTION[route]
  return { action, text, privacyRoute: route } as SendDecision
}

interface PiiDialogState {
  open: boolean
  text: string
  findings: PiiFinding[]
}

interface FileDialogState {
  open: boolean
  files: Array<{ name: string; type: string; size: number }>
}

export type SafeChatMode = "safe" | "local"

export interface SafeChatState {
  available: boolean
  isActive: boolean
  /** Locked after first message — cannot toggle mid-chat */
  locked: boolean
  route: PrivacyRoute
  mode: SafeChatMode
  label: string
  hasLocalModel: boolean
  preferenceEnabled: boolean
  toggleSession: () => void
  setMode: (mode: SafeChatMode) => void
  lock: () => void
  updatePreference: (enabled: boolean) => Promise<void>
}

/** Resolve the "safe" route from server status (eu or de, depending on config) */
function resolveSafeRoute(status: BusinessModeStatus | null): PrivacyRoute {
  return status?.safeChat?.route ?? (status?.options?.euModel ? "eu" : "de")
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

  // SafeChat state
  const [safeChatPreference, setSafeChatPreference] = useState(false)
  const [safeChatSessionOverride, setSafeChatSessionOverride] = useState<boolean | null>(null)
  const [safeChatMode, setSafeChatMode] = useState<SafeChatMode>("safe")
  const [safeChatLocked, setSafeChatLocked] = useState(false)

  // Fetch business mode status on mount; SafeChat preference loaded via initSafeChatPreference
  useEffect(() => {
    fetch("/api/business-mode/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStatus(data as BusinessModeStatus)
      })
      .catch(() => {})
  }, [])

  /** Called by ChatView after it fetches /api/user/instructions (avoids duplicate fetch) */
  const initSafeChatPreference = useCallback((enabled: boolean) => {
    setSafeChatPreference(enabled)
  }, [])

  const isEnabled = status?.enabled ?? false

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

        if (isPrivacyRouteAction(fileDecision.action)) {
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
        if (!res.ok) {
          console.warn("[business-mode] PII-check returned non-OK status, sending without check")
          return { action: "send", text }
        }

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
      } catch (err) {
        console.warn("[business-mode] PII-check failed, sending without check:", err)
        return { action: "send", text }
      }
    },
    [isEnabled]
  )

  /** Handle PII dialog decision */
  const handlePiiDecision = useCallback(
    async (decision: "accept" | "redact" | "safe" | "local" | "cancel") => {
      const resolve = resolveRef.current
      if (!resolve) return

      const text = piiDialog.text
      setPiiDialog((prev) => ({ ...prev, open: false }))

      const resolvedRoute: PrivacyRoute | undefined =
        decision === "safe" ? resolveSafeRoute(status)
        : decision === "local" ? "local"
        : undefined

      // Log consent (fire-and-forget)
      const consentDecision =
        decision === "accept" ? "accepted"
          : decision === "redact" ? "redacted"
            : resolvedRoute ? `rerouted_${resolvedRoute}`
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

      if (resolvedRoute) {
        resolve(makeRoutedDecision(resolvedRoute, text))
        return
      }

      resolve({ action: "send", text })
    },
    [piiDialog.text, piiDialog.findings, status]
  )

  /** Handle file dialog decision */
  const handleFileDecision = useCallback(
    (decision: "accept" | "reject" | "safe" | "local") => {
      const resolve = resolveRef.current
      setFileDialog((prev) => ({ ...prev, open: false }))

      const resolvedRoute: PrivacyRoute | undefined =
        decision === "safe" ? resolveSafeRoute(status)
        : decision === "local" ? "local"
        : undefined

      // Log consent (fire-and-forget)
      const consentDecision =
        decision === "accept" ? "accepted"
          : decision === "reject" ? "rejected"
            : resolvedRoute ? `rerouted_${resolvedRoute}`
              : "rejected"

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
        } else if (resolvedRoute) {
          resolve(makeRoutedDecision(resolvedRoute, ""))
        } else {
          resolve({ action: "send", text: "" })
        }
      }
    },
    [fileDialog.files, status]
  )

  // SafeChat computed state
  const safeChatActive = !!(status?.safeChat) && (safeChatSessionOverride ?? safeChatPreference)
  const safeRoute = resolveSafeRoute(status)
  const effectiveRoute: PrivacyRoute = safeChatMode === "local" ? "local" : safeRoute

  const safeChat: SafeChatState = {
    available: !!(status?.safeChat),
    isActive: safeChatActive,
    locked: safeChatLocked,
    route: effectiveRoute,
    mode: safeChatMode,
    label: status?.safeChat?.label ?? "SafeChat",
    hasLocalModel: status?.safeChat?.hasLocalModel ?? false,
    preferenceEnabled: safeChatPreference,
    setMode: (mode: SafeChatMode) => { if (!safeChatLocked) setSafeChatMode(mode) },
    lock: () => setSafeChatLocked(true),
    toggleSession: () => {
      if (safeChatLocked) return
      setSafeChatSessionOverride((prev) => prev === null ? !safeChatPreference : !prev)
    },
    updatePreference: async (enabled: boolean) => {
      setSafeChatPreference(enabled)
      await fetch("/api/user/instructions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ safeChatEnabled: enabled }),
      })
    },
  }

  const hasSafeModel = !!(status?.options?.euModel || status?.options?.deModel)

  return {
    isEnabled,
    options: {
      redaction: true,
      safeModel: hasSafeModel,
      safeRoute,
      localModel: status?.options?.localModel ?? false,
    },
    checkBeforeSend,
    piiDialog,
    fileDialog,
    handlePiiDecision,
    handleFileDecision,
    safeChat,
    initSafeChatPreference,
  }
}
