-- Drizzle Migration for Schema Change (Fixed NOT NULL error)

-- 1. Add 'suspended' to user_role ENUM (Original command)
ALTER TYPE "public"."user_role" ADD VALUE 'suspended';--> statement-breakpoint

-- 2. ADD NEW COLUMNS AS NULLABLE (Temporarily removing NOT NULL)
ALTER TABLE "users" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" text;--> statement-breakpoint

-- 3. POPULATE NEW COLUMNS FOR EXISTING USERS
-- NOTE: This assumes your old column was simply named "name".
-- It attempts to split the old 'name' into first_name (up to the first space) 
-- and last_name (everything after the first space).
UPDATE "users" 
SET 
  "first_name" = split_part("name", ' ', 1),
  "last_name" = split_part("name", ' ', 2);
--> statement-breakpoint

-- 4. MAKE NEW COLUMNS NOT NULL (Final step after data is populated)
ALTER TABLE "users" ALTER COLUMN "first_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "last_name" SET NOT NULL;--> statement-breakpoint

-- 5. DROP THE OLD COLUMN (Original command)
-- NOTE: If the old users had a single name, this completes the data migration.
ALTER TABLE "users" DROP COLUMN "name";