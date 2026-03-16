"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface ExpertContextValue {
  expertId: string | null
  expertName: string | null
  expertIcon: string | null
  setExpert: (id: string | null, name: string | null, icon: string | null) => void
}

const ExpertContext = createContext<ExpertContextValue>({
  expertId: null,
  expertName: null,
  expertIcon: null,
  setExpert: () => {},
})

export function ExpertProvider({ children }: { children: ReactNode }) {
  const [expertId, setExpertId] = useState<string | null>(null)
  const [expertName, setExpertName] = useState<string | null>(null)
  const [expertIcon, setExpertIcon] = useState<string | null>(null)

  const setExpert = useCallback((id: string | null, name: string | null, icon: string | null) => {
    setExpertId(id)
    setExpertName(name)
    setExpertIcon(icon)
  }, [])

  return (
    <ExpertContext.Provider value={{ expertId, expertName, expertIcon, setExpert }}>
      {children}
    </ExpertContext.Provider>
  )
}

export function useExpert() {
  return useContext(ExpertContext)
}
