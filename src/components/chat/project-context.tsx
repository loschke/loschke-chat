"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface ProjectContextValue {
  projectId: string | null
  projectName: string | null
  setProject: (id: string | null, name: string | null) => void
}

const ProjectContext = createContext<ProjectContextValue>({
  projectId: null,
  projectName: null,
  setProject: () => {},
})

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [projectName, setProjectName] = useState<string | null>(null)

  const setProject = useCallback((id: string | null, name: string | null) => {
    setProjectId(id)
    setProjectName(name)
  }, [])

  return (
    <ProjectContext.Provider value={{ projectId, projectName, setProject }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  return useContext(ProjectContext)
}
