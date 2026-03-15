/** Project entity as stored in the database */
export interface Project {
  id: string
  userId: string
  name: string
  description: string | null
  instructions: string | null
  defaultExpertId: string | null
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

/** Input for creating a new project */
export interface CreateProjectInput {
  name: string
  description?: string | null
  instructions?: string | null
  defaultExpertId?: string | null
}

/** Input for updating a project */
export interface UpdateProjectInput {
  name?: string
  description?: string | null
  instructions?: string | null
  defaultExpertId?: string | null
  isArchived?: boolean
}

/** Public-facing project data (for API responses) */
export interface ProjectPublic {
  id: string
  name: string
  description: string | null
  defaultExpertId: string | null
  isArchived: boolean
  chatCount: number
  updatedAt: string
}
