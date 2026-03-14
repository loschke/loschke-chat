export const chatConfig = {
  /** Maximale Output-Tokens pro Antwort */
  maxTokens: 16384,
  /** File-Upload Konfiguration */
  upload: {
    accept:
      "image/png,image/jpeg,image/webp,image/gif,application/pdf,text/markdown,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    maxFiles: 5,
    maxFileSize: 4 * 1024 * 1024, // 4MB pro Datei
  },
} as const
