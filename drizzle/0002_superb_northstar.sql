CREATE TABLE "consent_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"chat_id" text,
	"consent_type" text NOT NULL,
	"decision" text NOT NULL,
	"file_metadata" jsonb,
	"pii_findings" jsonb,
	"routed_model" text,
	"message_preview" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_servers" (
	"id" text PRIMARY KEY NOT NULL,
	"server_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"url" text NOT NULL,
	"transport" text DEFAULT 'sse' NOT NULL,
	"headers" jsonb,
	"env_var" text,
	"enabled_tools" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "memory_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "consent_logs" ADD CONSTRAINT "consent_logs_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_logs_user_created_idx" ON "consent_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mcp_servers_server_id_idx" ON "mcp_servers" USING btree ("server_id");