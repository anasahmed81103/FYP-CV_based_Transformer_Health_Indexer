ALTER TABLE "users" ADD COLUMN "is_email_verified" text DEFAULT 'false' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_token_expiry" timestamp;