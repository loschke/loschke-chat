"use client"

import { useState, useEffect, useCallback } from "react"
import { Palette, Search, Loader2 } from "lucide-react"
import { FormulaCard, type Formula } from "./formula-card"
import { FormulaDetailPanel } from "./formula-detail-panel"

interface Meta {
  usageTypes: string[]
  mediumTypes: string[]
  formulaCount: number
  resultCount: number
}

export function DesignLibraryView() {
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [usageType, setUsageType] = useState("")
  const [mediumType, setMediumType] = useState("")
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null)

  // Load meta on mount
  useEffect(() => {
    fetch("/api/design-library/meta")
      .then((r) => r.json())
      .then(setMeta)
      .catch(() => {})
  }, [])

  // Load formulas
  const loadFormulas = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: "100" })
      if (search.length >= 2) params.set("q", search)
      if (usageType) params.set("usageType", usageType)
      if (mediumType) params.set("mediumType", mediumType)

      const res = await fetch(`/api/design-library/formulas?${params}`)
      const data = await res.json()
      setFormulas(data.formulas ?? [])
    } catch {
      setFormulas([])
    } finally {
      setLoading(false)
    }
  }, [search, usageType, mediumType])

  useEffect(() => {
    const timeout = setTimeout(loadFormulas, search.length >= 2 ? 300 : 0)
    return () => clearTimeout(timeout)
  }, [loadFormulas, search])

  const getFormulaName = (f: Formula): string => {
    if (typeof f.name === "string") return f.name
    return f.name?.de ?? f.name?.en ?? "Unbenannt"
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Palette className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Design Library</h1>
              <p className="text-xs text-muted-foreground">
                {meta
                  ? `${meta.formulaCount} Prompt-Formeln, ${meta.resultCount.toLocaleString("de-DE")} Beispielbilder`
                  : "Lade..."}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Formeln durchsuchen..."
              className="h-8 w-52 rounded-lg border bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <select
            value={usageType}
            onChange={(e) => setUsageType(e.target.value)}
            className="h-8 rounded-lg border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Alle Typen</option>
            {meta?.usageTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={mediumType}
            onChange={(e) => setMediumType(e.target.value)}
            className="h-8 rounded-lg border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Alle Medien</option>
            {meta?.mediumTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {(usageType || mediumType || search) && (
            <button
              type="button"
              onClick={() => { setSearch(""); setUsageType(""); setMediumType("") }}
              className="h-8 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Filter zuruecksetzen
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : formulas.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-muted-foreground">Keine Formeln gefunden</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {formulas.map((formula) => (
              <FormulaCard
                key={formula.id}
                formula={formula}
                name={getFormulaName(formula)}
                isSelected={selectedFormula?.id === formula.id}
                onClick={() => setSelectedFormula(formula)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Panel (Sheet from right) */}
      <FormulaDetailPanel
        formula={selectedFormula}
        formulaName={selectedFormula ? getFormulaName(selectedFormula) : ""}
        open={selectedFormula !== null}
        onClose={() => setSelectedFormula(null)}
      />
    </div>
  )
}
