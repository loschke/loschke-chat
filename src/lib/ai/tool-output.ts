/**
 * Unwrap tool output that may be wrapped in a JSON envelope.
 * Some AI SDK versions wrap tool execute results as { type: "json", value: {...} }.
 */
export function unwrapToolOutput<T = Record<string, unknown>>(output: unknown): T | undefined {
  if (!output || typeof output !== "object") return output as T | undefined
  const raw = output as Record<string, unknown>
  if (raw.type === "json" && raw.value) {
    return raw.value as T
  }
  return output as T
}
