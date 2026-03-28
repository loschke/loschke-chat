"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  CheckCircleIcon,
  ChevronDownIcon,
  LoaderIcon,
  XCircleIcon,
  SearchIcon,
  GlobeIcon,
  BookOpenIcon,
  BookmarkIcon,
  BrainIcon,
  WrenchIcon,
  PlugIcon,
  ImageIcon,
  YoutubeIcon,
  VideoIcon,
  Volume2Icon,
  TerminalIcon,
  FlaskConicalIcon,
  MessageCircleIcon,
  LayersIcon,
  FileTextIcon,
  HelpCircleIcon,
  ClipboardCheckIcon,
  PaletteIcon,
  PaintbrushIcon,
  PenToolIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getToolLabel, getToolIcon } from "@/lib/ai/tools/registry"

/** Map icon name strings (from registry) to Lucide components */
const ICON_MAP: Record<string, typeof WrenchIcon> = {
  Search: SearchIcon,
  Globe: GlobeIcon,
  BookOpen: BookOpenIcon,
  Bookmark: BookmarkIcon,
  Brain: BrainIcon,
  Image: ImageIcon,
  Youtube: YoutubeIcon,
  Video: VideoIcon,
  Volume2: Volume2Icon,
  Terminal: TerminalIcon,
  FlaskConical: FlaskConicalIcon,
  MessageCircle: MessageCircleIcon,
  Layers: LayersIcon,
  FileText: FileTextIcon,
  HelpCircle: HelpCircleIcon,
  ClipboardCheck: ClipboardCheckIcon,
  Palette: PaletteIcon,
  Paintbrush: PaintbrushIcon,
  PenTool: PenToolIcon,
  Wrench: WrenchIcon,
}

/** Format tool input for display */
function formatInput(input: Record<string, unknown> | undefined): string | null {
  if (!input || Object.keys(input).length === 0) return null
  // Filter out very long values (e.g. full page content)
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" && value.length > 500) {
      cleaned[key] = value.slice(0, 200) + "…"
    } else {
      cleaned[key] = value
    }
  }
  return JSON.stringify(cleaned, null, 2)
}

/** Format tool output for display */
function formatOutput(output: unknown): string | null {
  if (output === undefined || output === null) return null
  if (typeof output === "string") {
    return output.length > 2000 ? output.slice(0, 2000) + "…" : output
  }
  const json = JSON.stringify(output, null, 2)
  return json.length > 2000 ? json.slice(0, 2000) + "…" : json
}

interface ToolStatusProps {
  toolName: string
  state: string
  /** Raw tool input object */
  input?: Record<string, unknown>
  /** Raw tool output */
  output?: unknown
  /** Error text if tool failed */
  errorText?: string
  /** Short detail for the header (e.g. search query) */
  inputDetail?: string
}

/** Check if a tool is an MCP tool (prefixed with serverId__) */
function parseMcpToolName(toolName: string): { serverPrefix: string; localName: string } | null {
  const idx = toolName.indexOf("__")
  if (idx === -1) return null
  return { serverPrefix: toolName.slice(0, idx), localName: toolName.slice(idx + 2) }
}

export function ToolStatus({ toolName, state, input, output, errorText, inputDetail }: ToolStatusProps) {
  const mcpTool = parseMcpToolName(toolName)
  const label = mcpTool ? mcpTool.localName.replace(/_/g, " ") : getToolLabel(toolName)
  const Icon = mcpTool ? PlugIcon : (ICON_MAP[getToolIcon(toolName)] ?? WrenchIcon)

  const isRunning = state === "input-streaming" || state === "input-available"
  const isDone = state === "output-available" || state === "result"
  const isError = state === "output-error"

  const hasDetails = !!(input || output || errorText)
  const formattedInput = formatInput(input)
  const formattedOutput = formatOutput(output)

  return (
    <Collapsible className="group/tool rounded-xl border bg-muted/30 card-elevated" defaultOpen={isError}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <Icon className="size-4 shrink-0" />
        <span className="font-medium">{label}</span>
        {mcpTool && (
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
            {mcpTool.serverPrefix}
          </Badge>
        )}
        {inputDetail && (
          <span className="truncate text-xs opacity-70">
            — {inputDetail}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          {isRunning && (
            <>
              <LoaderIcon className="size-3.5 animate-spin" />
              <span className="text-xs">Läuft…</span>
            </>
          )}
          {isDone && (
            <>
              <CheckCircleIcon className="size-3.5 text-green-600" />
              <span className="text-xs">Fertig</span>
            </>
          )}
          {isError && (
            <>
              <XCircleIcon className="size-3.5 text-red-600" />
              <span className="text-xs">Fehler</span>
            </>
          )}
        </span>
        {hasDetails && (
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/tool:rotate-180" />
        )}
      </CollapsibleTrigger>
      {hasDetails && (
        <CollapsibleContent className="border-t px-3 py-2 text-xs">
          <div className="space-y-2 overflow-hidden">
            {formattedInput && (
              <div>
                <p className="mb-1 font-medium uppercase tracking-wide text-muted-foreground/70">Parameter</p>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-background/50 p-2 text-muted-foreground">{formattedInput}</pre>
              </div>
            )}
            {isError && errorText && (
              <div>
                <p className="mb-1 font-medium uppercase tracking-wide text-red-500/80">Fehler</p>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-red-500/10 p-2 text-red-600">{errorText}</pre>
              </div>
            )}
            {formattedOutput && !isError && (
              <div>
                <p className="mb-1 font-medium uppercase tracking-wide text-muted-foreground/70">Ergebnis</p>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-background/50 p-2 text-muted-foreground max-h-60 overflow-y-auto">{formattedOutput}</pre>
              </div>
            )}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}
