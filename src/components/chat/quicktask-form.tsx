"use client"

import { useCallback, useState } from "react"
import { ArrowLeft, SendHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { QuicktaskPublic } from "./quicktask-selector"

interface QuicktaskFormProps {
  quicktask: QuicktaskPublic
  onSubmit: (data: Record<string, string>) => void
  onBack: () => void
  isSubmitting: boolean
}

export function QuicktaskForm({ quicktask, onSubmit, onBack, isSubmitting }: QuicktaskFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({})

  const updateField = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }, [])

  const allRequiredFilled = quicktask.fields.every((field) => {
    if (!field.required) return true
    return !!formData[field.key]?.trim()
  })

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!allRequiredFilled) return
      onSubmit(formData)
    },
    [allRequiredFilled, formData, onSubmit]
  )

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-lg flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h3 className="font-semibold">{quicktask.name}</h3>
          <p className="text-sm text-muted-foreground">{quicktask.description}</p>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
        {quicktask.fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <p className="text-sm font-medium">
              {field.label}
              {field.required && <span className="ml-0.5 text-destructive">*</span>}
            </p>

            {field.type === "text" && (
              <input
                value={formData[field.key] ?? ""}
                onChange={(e) => updateField(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            )}

            {field.type === "textarea" && (
              <textarea
                value={formData[field.key] ?? ""}
                onChange={(e) => updateField(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                rows={2}
              />
            )}

            {field.type === "select" && field.options && (
              <div className="flex flex-wrap gap-2">
                {field.options.map((option) => {
                  const isSelected = formData[field.key] === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateField(field.key, isSelected ? "" : option)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}

        <Button
          type="submit"
          disabled={!allRequiredFilled || isSubmitting}
          size="sm"
          className="gap-2"
        >
          <SendHorizontal className="size-3.5" />
          {isSubmitting ? "Wird ausgeführt..." : "Ausführen"}
        </Button>
      </div>
    </form>
  )
}
