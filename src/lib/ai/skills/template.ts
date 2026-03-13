/**
 * Simple Mustache-style template renderer for skill content.
 * Supports {{variable}} and {{variable | default: "fallback"}}.
 */
export function renderTemplate(template: string, data: Record<string, string>): string {
  return template.replace(
    /\{\{\s*([a-zA-Z_]\w*)\s*(?:\|\s*default:\s*"([^"]*)")?\s*\}\}/g,
    (_match, key: string, defaultValue?: string) => {
      const value = data[key]
      if (value !== undefined && value !== "") return value
      if (defaultValue !== undefined) return defaultValue
      return ""
    }
  )
}
