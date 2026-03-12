"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ModelCategory } from "@/config/models"

interface ModelInfo {
  id: string
  name: string
  provider: string
  categories: ModelCategory[]
  region: "eu" | "us"
  isDefault: boolean
}

interface ModelGroup {
  category: ModelCategory
  label: string
  models: ModelInfo[]
}

interface ModelSelectorProps {
  value: string
  onChange: (modelId: string) => void
  disabled?: boolean
}

const REGION_FLAG: Record<string, string> = {
  eu: "\u{1F1EA}\u{1F1FA}",
  us: "\u{1F1FA}\u{1F1F8}",
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const [groups, setGroups] = useState<ModelGroup[]>([])
  const [models, setModels] = useState<ModelInfo[]>([])

  useEffect(() => {
    async function loadModels() {
      try {
        const res = await fetch("/api/models")
        if (res.ok) {
          const data = await res.json()
          setGroups(data.groups)
          setModels(data.models)
        }
      } catch {
        // Non-critical
      }
    }
    loadModels()
  }, [])

  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue)
    },
    [onChange]
  )

  // Deduplicate: each model appears only in its primary (first) category group
  const deduplicatedGroups = (() => {
    const seen = new Set<string>()
    return groups
      .map((group) => ({
        ...group,
        models: group.models.filter((m) => {
          if (seen.has(m.id)) return false
          seen.add(m.id)
          return true
        }),
      }))
      .filter((group) => group.models.length > 0)
  })()

  const selectedModel = models.find((m) => m.id === value)
  const displayName = selectedModel
    ? selectedModel.name
    : value.split("/").pop() ?? "Model"

  return (
    <Select value={value} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger className="h-7 w-auto gap-1.5 border-none bg-transparent px-2 text-xs font-medium shadow-none hover:bg-muted">
        <SelectValue>{displayName}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {deduplicatedGroups.map((group) => (
          <SelectGroup key={group.category}>
            <SelectLabel className="text-xs font-semibold text-muted-foreground">
              {group.label}
            </SelectLabel>
            {group.models.map((model) => (
              <SelectItem key={model.id} value={model.id} className="text-xs">
                <span className="flex items-center gap-2">
                  <span>{model.name}</span>
                  <span className="text-muted-foreground">{model.provider}</span>
                  <span>{REGION_FLAG[model.region]}</span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
