"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Info } from "lucide-react"

type DataFlowTarget = "local" | "eu" | "us"

interface FeatureInfo {
  name: string
  description: string
  enabled: boolean
  dataFlow: {
    target: DataFlowTarget
    label: string
  }
  envHint: string
}

interface FeaturesOverviewProps {
  features: FeatureInfo[]
  routingMode: string
}

const targetConfig: Record<DataFlowTarget, { label: string; className: string }> = {
  local: {
    label: "Lokal",
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  eu: {
    label: "EU",
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  us: {
    label: "US/Extern",
    className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  },
}

function DataFlowBadge({ target, label }: { target: DataFlowTarget; label: string }) {
  const config = targetConfig[target]
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export function FeaturesOverview({ features, routingMode }: FeaturesOverviewProps) {
  const enabledCount = features.filter((f) => f.enabled).length
  const localCount = features.filter((f) => f.enabled && f.dataFlow.target === "local").length
  const euCount = features.filter((f) => f.enabled && f.dataFlow.target === "eu").length
  const usCount = features.filter((f) => f.enabled && f.dataFlow.target === "us").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Features & Datenfluss</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Uebersicht aktiver Features und wohin Daten gesendet werden
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Aktiv" value={enabledCount} total={features.length} />
        <SummaryCard label="Lokal" value={localCount} color="emerald" />
        <SummaryCard label="EU" value={euCount} color="amber" />
        <SummaryCard label="US/Extern" value={usCount} color="red" />
      </div>

      {/* Routing Mode */}
      <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
        <Info className="size-4 text-muted-foreground shrink-0" />
        <span>
          LLM Routing: <code className="font-mono font-semibold">{routingMode}</code>
          {routingMode === "gateway" && " — Requests laufen ueber Vercel AI Gateway"}
          {routingMode === "direct" && " — Requests gehen direkt an Provider-SDKs (EU/Local)"}
          {routingMode === "litellm" && " — Requests laufen ueber self-hosted LiteLLM Proxy"}
        </span>
      </div>

      {/* Feature List */}
      <div className="rounded-md border">
        <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-x-4 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
          <span>Feature</span>
          <span>Status</span>
          <span>Datenfluss</span>
          <span className="hidden sm:block">ENV</span>
        </div>
        {features.map((feature) => (
          <div
            key={feature.name}
            className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-x-4 border-b px-4 py-3 last:border-b-0"
          >
            <div>
              <p className="text-sm font-medium">{feature.name}</p>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
            <div>
              {feature.enabled ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <XCircle className="size-4 text-muted-foreground/40" />
              )}
            </div>
            <div>
              {feature.enabled ? (
                <DataFlowBadge target={feature.dataFlow.target} label={feature.dataFlow.label} />
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
            <div className="hidden sm:block">
              <code className="text-[10px] text-muted-foreground">{feature.envHint}</code>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-emerald-500" />
          Lokal — Daten bleiben im eigenen Netzwerk
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-amber-500" />
          EU — Daten in EU-Region verarbeitet
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-red-500" />
          US/Extern — Daten verlassen EU (bewusst zugeschaltet)
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total?: number
  color?: "emerald" | "amber" | "red"
}) {
  const colorClass = color === "emerald"
    ? "text-emerald-600 dark:text-emerald-400"
    : color === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : color === "red"
        ? "text-red-600 dark:text-red-400"
        : ""

  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${colorClass}`}>
        {value}
        {total !== undefined && <span className="text-sm font-normal text-muted-foreground">/{total}</span>}
      </p>
    </div>
  )
}
