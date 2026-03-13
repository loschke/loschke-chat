/** Expert entity as stored in the database */
export interface Expert {
  id: string
  userId: string | null
  name: string
  slug: string
  description: string
  icon: string | null
  systemPrompt: string
  skillSlugs: string[]
  modelPreference: string | null
  temperature: number | null
  allowedTools: string[]
  mcpServerIds: string[]
  isPublic: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

/** Input for creating a new expert */
export interface CreateExpertInput {
  name: string
  slug: string
  description: string
  icon?: string | null
  systemPrompt: string
  skillSlugs?: string[]
  modelPreference?: string | null
  temperature?: number | null
  allowedTools?: string[]
  mcpServerIds?: string[]
  isPublic?: boolean
  sortOrder?: number
}

/** Input for updating an expert */
export interface UpdateExpertInput {
  name?: string
  slug?: string
  description?: string
  icon?: string | null
  systemPrompt?: string
  skillSlugs?: string[]
  modelPreference?: string | null
  temperature?: number | null
  allowedTools?: string[]
  mcpServerIds?: string[]
  isPublic?: boolean
  sortOrder?: number
}

/** Public-facing expert data (for API responses) */
export interface ExpertPublic {
  id: string
  name: string
  slug: string
  description: string
  icon: string | null
  skillSlugs: string[]
  modelPreference: string | null
  temperature: number | null
  isPublic: boolean
  sortOrder: number
  isGlobal: boolean
}
