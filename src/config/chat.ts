import { aiDefaults } from "./ai"

export const chatConfig = {
  ...aiDefaults,
  /** Maximale Output-Tokens pro Antwort */
  maxTokens: 4096,
  /** File-Upload Konfiguration */
  upload: {
    accept:
      "image/png,image/jpeg,image/webp,image/gif,application/pdf,text/markdown,text/plain",
    maxFiles: 5,
    maxFileSize: 4 * 1024 * 1024, // 4MB pro Datei
  },
} as const
