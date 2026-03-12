"use client"

import { useCallback, useEffect, useState } from "react"
import { SlidersHorizontalIcon, CheckIcon } from "lucide-react"
import {
  ModelSelector as ModelSelectorRoot,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorItem,
  ModelSelectorGroup,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorEmpty,
} from "@/components/ai-elements/model-selector"
import { PromptInputButton } from "@/components/ai-elements/prompt-input"
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

/** Map display provider name to models.dev logo slug */
function providerSlug(provider: string): string {
  const map: Record<string, string> = {
    anthropic: "anthropic",
    openai: "openai",
    google: "google",
    mistral: "mistral",
    meta: "llama",
    deepseek: "deepseek",
    groq: "groq",
    perplexity: "perplexity",
    xai: "xai",
  }
  return map[provider.toLowerCase()] ?? provider.toLowerCase()
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
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

  const handleSelect = useCallback(
    (modelId: string) => {
      onChange(modelId)
      setOpen(false)
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
    <ModelSelectorRoot open={open} onOpenChange={setOpen}>
      <ModelSelectorTrigger asChild>

        <PromptInputButton
          disabled={disabled}
          variant="ghost"
          tooltip="Modell wechseln"
        >
          <SlidersHorizontalIcon className="size-4" />
        </PromptInputButton>
      </ModelSelectorTrigger>
      <ModelSelectorContent title="Modell auswählen">
        <ModelSelectorInput placeholder="Modell suchen..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>Kein Modell gefunden.</ModelSelectorEmpty>
          {deduplicatedGroups.map((group) => (
            <ModelSelectorGroup key={group.category} heading={group.label}>
              {group.models.map((model) => (
                <ModelSelectorItem
                  key={model.id}
                  value={model.id}
                  onSelect={() => handleSelect(model.id)}
                  className="flex items-center gap-2"
                >
                  <ModelSelectorLogo provider={providerSlug(model.provider)} />
                  <ModelSelectorName>{model.name}</ModelSelectorName>
                  <span className="text-xs text-muted-foreground">
                    {REGION_FLAG[model.region]}
                  </span>
                  {model.id === value && (
                    <CheckIcon className="ml-auto size-3.5 text-primary" />
                  )}
                </ModelSelectorItem>
              ))}
            </ModelSelectorGroup>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelectorRoot>
  )
}
