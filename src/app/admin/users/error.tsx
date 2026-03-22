"use client"

export default function Error({ error }: { error: Error }) {
  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
      <h2 className="font-semibold text-destructive">Fehler beim Laden der Benutzer</h2>
      <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
    </div>
  )
}
