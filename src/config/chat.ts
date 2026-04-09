export const chatConfig = {
  /** Maximale Output-Tokens pro Antwort */
  maxTokens: 48000,
  /** File-Upload Konfiguration */
  upload: {
    accept:
      "image/png,image/jpeg,image/webp,image/gif,application/pdf,text/markdown,text/plain,text/html,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    maxFiles: 5,
    maxFileSize: 10 * 1024 * 1024, // 10MB pro Datei
  },
} as const
