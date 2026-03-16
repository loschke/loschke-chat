import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core"
import { chats } from "./chats"

export const consentLogs = pgTable("consent_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  chatId: text("chat_id").references(() => chats.id, { onDelete: "set null" }),

  /** Type of consent event */
  consentType: text("consent_type").notNull(), // "pii_detected" | "file_upload" | "privacy_route"

  /** User decision */
  decision: text("decision").notNull(), // "accepted" | "rejected" | "redacted" | "rerouted_eu" | "rerouted_local"

  /** File metadata for file-upload consents */
  fileMetadata: jsonb("file_metadata"), // { name, type, size }[]

  /** PII findings for pii_detected consents */
  piiFindings: jsonb("pii_findings"), // PiiFinding[]

  /** Model used after rerouting */
  routedModel: text("routed_model"),

  /** First 100 chars of the message for audit context */
  messagePreview: text("message_preview"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("consent_logs_user_created_idx").on(t.userId, t.createdAt),
])
