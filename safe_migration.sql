-- Safe multi-tenant migration with data preservation
-- Run this manually in your PostgreSQL database

BEGIN;

-- 1. Create new tables first
CREATE TABLE IF NOT EXISTS "super_admins" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

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

-- 2. Create a default tenant for existing data
INSERT INTO "tenants" ("name", "slug", "bolna_sub_account_id", "plan") 
VALUES ('Default Company', 'default', 'default-sub-account', 'pro')
ON CONFLICT (slug) DO NOTHING;

-- 3. Backup existing users
CREATE TABLE IF NOT EXISTS "users_backup" AS SELECT * FROM "users";

-- 4. Add new columns to users table safely
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tenant_id" integer;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'agent';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active';

-- 5. Update existing users with default values (manual review recommended)
UPDATE "users" SET 
  "tenant_id" = 1,
  "role" = 'admin',
  "status" = 'active'
WHERE "tenant_id" IS NULL;

-- 6. Add foreign key constraint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");

-- 7. Fix agent_config column type
ALTER TABLE "agents" ALTER COLUMN "agent_config" TYPE json USING "agent_config"::json;
ALTER TABLE "agents" ALTER COLUMN "agent_prompts" TYPE json USING "agent_prompts"::json;

-- 8. Add tenant_id to agents and executions
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "tenant_id" integer;
ALTER TABLE "executions" ADD COLUMN IF NOT EXISTS "tenant_id" integer;

-- Update with default tenant
UPDATE "agents" SET "tenant_id" = 1 WHERE "tenant_id" IS NULL;
UPDATE "executions" SET "tenant_id" = 1 WHERE "tenant_id" IS NULL;

-- Add foreign keys
ALTER TABLE "agents" ADD CONSTRAINT "agents_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");
ALTER TABLE "executions" ADD CONSTRAINT "executions_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");

-- 9. Create additional tables
CREATE TABLE IF NOT EXISTS "phone_numbers" (
  "id" serial PRIMARY KEY NOT NULL,
  "tenant_id" integer NOT NULL REFERENCES "tenants"("id"),
  "bolna_phone_id" text NOT NULL UNIQUE,
  "phone_number" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "campaigns" (
  "id" serial PRIMARY KEY NOT NULL,
  "tenant_id" integer NOT NULL REFERENCES "tenants"("id"),
  "agent_id" integer NOT NULL REFERENCES "agents"("id"),
  "name" text NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "contacts" json NOT NULL,
  "schedule" json DEFAULT '{}',
  "created_at" timestamp DEFAULT now()
);

-- 10. NOTE: Do NOT seed a default super admin with static credentials in migrations.
-- Create super admins manually using a secure script or by inserting a bcrypt-hashed password into the database.
-- INSERT removed to avoid leaking static credentials.

COMMIT;