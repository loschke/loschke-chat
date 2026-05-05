/**
 * Model-capability helpers used by both the Browser (chat input, model picker) and
 * the Server (build-messages, route guards). Keep this isomorphic — no Node-only deps.
 */

import { chatConfig } from "@/config/chat"
import { type ModelCapabilities, resolveCapabilities } from "@/config/models"

const IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
])

/**
 * Build the `accept` attribute for the file input based on the active model
 * and whether SafeChat is on. SafeChat strips images regardless of capability.
 */
export function getEffectiveAcceptString(
  capabilities: ModelCapabilities | null | undefined,
  businessModeActive: boolean,
): string {
  const resolved = resolveCapabilities(capabilities)
  const hideImages = businessModeActive || !resolved.vision

  const parts = chatConfig.upload.accept
    .split(",")
    .map((t) => t.trim())
    .filter((mime) => (hideImages ? !IMAGE_MIME_TYPES.has(mime) : true))

  return parts.join(",")
}

/** maxFiles is uniform today — kept as a helper to centralize future tweaks. */
export function getMaxFilesForModel(): number {
  return chatConfig.upload.maxFiles
}

export interface CapabilityBadge {
  key: "files" | "vision" | "reasoning"
  icon: "paperclip" | "image" | "brain"
  label: string
  tooltip: string
}

/**
 * Badges shown next to a model in the model picker.
 * Order: Files (Standard), Vision, Reasoning (speziell).
 *
 * Files-Badge wird auch bei pdfInput=extract gezeigt, weil das Modell
 * Dokumente funktional verarbeiten kann (Server-Extraktion). Der Tooltip
 * differenziert zwischen native und extracted, damit User den Unterschied
 * versteht.
 */
export function formatCapabilityBadges(
  capabilities: ModelCapabilities | null | undefined,
): CapabilityBadge[] {
  const resolved = resolveCapabilities(capabilities)
  const badges: CapabilityBadge[] = []

  if (resolved.pdfInput !== "none") {
    badges.push({
      key: "files",
      icon: "paperclip",
      label: "Dateien",
      tooltip: resolved.pdfInput === "native"
        ? "Akzeptiert Dokumente (PDF nativ inkl. Layout, DOCX, XLSX, TXT)"
        : "Akzeptiert Dokumente (PDF/DOCX/XLSX werden zu Text extrahiert)",
    })
  }
  if (resolved.vision) {
    badges.push({
      key: "vision",
      icon: "image",
      label: "Bilder",
      tooltip: "Modell versteht Bildanhänge",
    })
  }
  if (resolved.reasoning) {
    badges.push({
      key: "reasoning",
      icon: "brain",
      label: "Reasoning",
      tooltip: "Modell unterstützt erweitertes Nachdenken",
    })
  }
  return badges
}

/**
 * Format a context window size for compact display.
 * Examples: 1000000 → "1M", 200000 → "200K", 131072 → "128K"
 */
export function formatContextWindow(tokens: number): string {
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`
  }
  if (tokens >= 1000) {
    return `${Math.round(tokens / 1000)}K`
  }
  return String(tokens)
}

/** Tooltip text for the context-window badge. */
export function formatContextWindowTooltip(tokens: number): string {
  return `Kontextfenster: ${tokens.toLocaleString("de-DE")} Tokens`
}

/**
 * Tooltip text for the AttachButton.
 * Returns null if no special hint is needed (vision-capable model, normal mode).
 */
export function attachButtonTooltip(
  capabilities: ModelCapabilities | null | undefined,
  businessModeActive: boolean,
): string | null {
  if (businessModeActive) {
    return "Im sicheren Modus keine Bilder. Dokumente werden weiterhin akzeptiert."
  }
  const resolved = resolveCapabilities(capabilities)
  if (!resolved.vision) {
    return "Modell unterstützt keine Bilder. Dokumente werden als Text extrahiert."
  }
  return null
}

/** True if any of the given files is an image (used in BusinessModeFileDialog). */
export function containsImage(files: { type: string }[]): boolean {
  return files.some((f) => f.type.toLowerCase().startsWith("image/"))
}
