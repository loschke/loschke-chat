ALTER TABLE "users" RENAME COLUMN "logto_id" TO "auth_sub";--> statement-breakpoint
ALTER TABLE "users" RENAME CONSTRAINT "users_logto_id_unique" TO "users_auth_sub_unique";