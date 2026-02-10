import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env explicitly from project root to ensure environment variables are available
config({ path: path.resolve(__dirname, '..', '.env') });
console.log('Loaded DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.slice(0, 40) + '...' : 'undefined');

import { sql } from 'drizzle-orm';
// Import db dynamically after dotenv has loaded so DATABASE_URL is available
let db: any;

async function runSafeMigration() {
  console.log('🔄 Running safe multi-tenant migration...');

  // Import db dynamically now that dotenv has loaded
  const dbModule = await import('../server/db');
  db = dbModule.db;

  try {
    // 1. Create super_admins table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "super_admins" (
        "id" serial PRIMARY KEY NOT NULL,
        "email" text NOT NULL UNIQUE,
        "name" text NOT NULL,
        "password_hash" text NOT NULL,
        "created_at" timestamp DEFAULT now()
      )
    `);

    // 2. Create tenants table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "tenants" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "slug" text NOT NULL UNIQUE,
        "bolna_sub_account_id" text NOT NULL UNIQUE,
        "plan" text NOT NULL DEFAULT 'starter',
        "status" text NOT NULL DEFAULT 'active',
        "settings" json DEFAULT '{}',
        "created_at" timestamp DEFAULT now()
      )
    `);

    // 3. Create default tenant
    await db.execute(sql`
      INSERT INTO "tenants" ("name", "slug", "bolna_sub_account_id", "plan") 
      VALUES ('Default Company', 'default', 'default-sub-account', 'pro')
      ON CONFLICT (slug) DO NOTHING
    `);

    // 4. Backup existing users
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "users_backup" AS SELECT * FROM "users"
    `);

    // 5. Add new columns to users
    await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tenant_id" integer`);
    await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text`);
    await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'agent'`);
    await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active'`);

    // 6. Update existing users
    await db.execute(sql`
      UPDATE "users" SET 
        "tenant_id" = 1,
        "role" = 'admin',
        "status" = 'active'
      WHERE "tenant_id" IS NULL
    `);

    // 7. Add foreign key constraint
    await db.execute(sql`
      ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" 
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    `).catch(() => {}); // Ignore if exists

    // 8. Fix agent columns
    await db.execute(sql`ALTER TABLE "agents" ALTER COLUMN "agent_config" TYPE json USING "agent_config"::json`);
    await db.execute(sql`ALTER TABLE "agents" ALTER COLUMN "agent_prompts" TYPE json USING "agent_prompts"::json`);

    // 9. Add tenant_id to agents and executions
    await db.execute(sql`ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "tenant_id" integer`);
    await db.execute(sql`ALTER TABLE "executions" ADD COLUMN IF NOT EXISTS "tenant_id" integer`);

    await db.execute(sql`UPDATE "agents" SET "tenant_id" = 1 WHERE "tenant_id" IS NULL`);
    await db.execute(sql`UPDATE "executions" SET "tenant_id" = 1 WHERE "tenant_id" IS NULL`);

    // 10. Add foreign keys
    await db.execute(sql`
      ALTER TABLE "agents" ADD CONSTRAINT "agents_tenant_id_fkey" 
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    `).catch(() => {});

    await db.execute(sql`
      ALTER TABLE "executions" ADD CONSTRAINT "executions_tenant_id_fkey" 
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    `).catch(() => {});

    // 11. Create phone_numbers table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "phone_numbers" (
        "id" serial PRIMARY KEY NOT NULL,
        "tenant_id" integer NOT NULL REFERENCES "tenants"("id"),
        "bolna_phone_id" text NOT NULL UNIQUE,
        "phone_number" text NOT NULL,
        "status" text NOT NULL DEFAULT 'active',
        "created_at" timestamp DEFAULT now()
      )
    `);

    // 12. Create campaigns table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "campaigns" (
        "id" serial PRIMARY KEY NOT NULL,
        "tenant_id" integer NOT NULL REFERENCES "tenants"("id"),
        "agent_id" integer NOT NULL REFERENCES "agents"("id"),
        "name" text NOT NULL,
        "status" text NOT NULL DEFAULT 'draft',
        "contacts" json NOT NULL,
        "schedule" json DEFAULT '{}',
        "created_at" timestamp DEFAULT now()
      )
    `);

    // 13. Create admin_audit_logs table (for impersonation/audit events)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
        "id" serial PRIMARY KEY NOT NULL,
        "action" text NOT NULL,
        "admin_id" integer,
        "impersonator_id" integer,
        "tenant_id" integer,
        "details" json DEFAULT '{}',
        "created_at" timestamp DEFAULT now()
      )
    `);

    // NOTE: No default super admin is created to avoid static credentials.
    // Please create a super admin securely using a script or via SQL with a bcrypt-hashed password.

    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }

  process.exit(0);
}

runSafeMigration();