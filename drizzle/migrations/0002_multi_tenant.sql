-- Multi-tenant migration script
-- Run this to transform your existing single-tenant database to multi-tenant

-- 1. Create super_admins table
CREATE TABLE IF NOT EXISTS "super_admins" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- 2. Create tenants table
CREATE TABLE IF NOT EXISTS "tenants" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "bolna_sub_account_id" text NOT NULL UNIQUE,
  "plan" text NOT NULL DEFAULT 'starter',
  "status" text NOT NULL DEFAULT 'active',
  "settings" json DEFAULT '{}',
  "created_at" timestamp DEFAULT now()
);

-- 3. Create phone_numbers table
CREATE TABLE IF NOT EXISTS "phone_numbers" (
  "id" serial PRIMARY KEY NOT NULL,
  "tenant_id" integer NOT NULL REFERENCES "tenants"("id"),
  "bolna_phone_id" text NOT NULL UNIQUE,
  "phone_number" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamp DEFAULT now()
);

-- 4. Create campaigns table
CREATE TABLE IF NOT EXISTS "campaigns" (
  "id" serial PRIMARY KEY NOT NULL,
  "tenant_id" integer NOT NULL REFERENCES "tenants"("id"),
  "agent_id" integer NOT NULL,
  "name" text NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "contacts" json NOT NULL,
  "schedule" json DEFAULT '{}',
  "created_at" timestamp DEFAULT now()
);

-- 5. Backup existing users table
CREATE TABLE IF NOT EXISTS "users_backup" AS SELECT * FROM "users";

-- 6. Drop existing users table and recreate with tenant_id
DROP TABLE IF EXISTS "users" CASCADE;

CREATE TABLE "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "tenant_id" integer NOT NULL REFERENCES "tenants"("id"),
  "email" text NOT NULL,
  "name" text NOT NULL,
  "password_hash" text NOT NULL,
  "role" text NOT NULL DEFAULT 'agent',
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamp DEFAULT now()
);

-- 7. Update agents table to include tenant_id
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "tenant_id" integer REFERENCES "tenants"("id");

-- 8. Update executions table to include tenant_id
ALTER TABLE "executions" ADD COLUMN IF NOT EXISTS "tenant_id" integer REFERENCES "tenants"("id");

-- 9. Add foreign key constraint for campaigns -> agents
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id");

-- 10. NOTE: Do NOT seed a default super admin with static credentials in migrations.
-- Create super admins manually using a secure script or by inserting a bcrypt-hashed password into the database.
-- INSERT removed to avoid leaking static credentials.

-- 11. Create a default tenant for migration (optional)
-- INSERT INTO "tenants" ("name", "slug", "bolna_sub_account_id", "plan") 
-- VALUES ('Default Company', 'default', 'your-existing-bolna-sub-account-id', 'pro');

-- 12. Migrate existing data (if any)
-- You'll need to manually assign tenant_id to existing agents and executions
-- UPDATE "agents" SET "tenant_id" = 1 WHERE "tenant_id" IS NULL;
-- UPDATE "executions" SET "tenant_id" = 1 WHERE "tenant_id" IS NULL;