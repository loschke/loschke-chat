export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === "string") return err
  return String(err)
}

export function fireAndForget(label: string, fn: () => Promise<unknown>): void {
  fn().catch(err => console.warn(`[${label}]`, getErrorMessage(err)))
}
