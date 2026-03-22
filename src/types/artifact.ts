/** Content types the Artifact panel can render */
export type ArtifactContentType = "markdown" | "html" | "code" | "quiz" | "review" | "image"

/** Registered output format in the format registry */
export interface OutputFormat {
  id: string
  label: string
  description: string
  contentType: ArtifactContentType
  /** lucide-react icon name */
  icon: string
  fileExtension: string
  /** Anthropic Custom Skill ID for Code Execution (null = no skill needed) */
  skillId: string | null
  /** Max output tokens when this format is active */
  maxTokens?: number
}
