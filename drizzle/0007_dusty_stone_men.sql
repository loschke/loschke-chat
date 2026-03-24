CREATE TABLE "shared_chats" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shared_chats_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "shared_chats" ADD CONSTRAINT "shared_chats_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shared_chats_token_idx" ON "shared_chats" USING btree ("token");--> statement-breakpoint
CREATE INDEX "shared_chats_chat_id_idx" ON "shared_chats" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "shared_chats_user_id_idx" ON "shared_chats" USING btree ("user_id");