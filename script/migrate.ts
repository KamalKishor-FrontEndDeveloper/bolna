import { config } from 'dotenv';
config();

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';

const { Pool } = pg;

async function runSafeMigration() {
  console.log('🔄 Running safe multi-tenant migration...');

  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });
  const db = drizzle(pool);

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
    console.log('✅ Created super_admins table');

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
    console.log('✅ Created tenants table');

    // 3. Create default tenant
    await db.execute(sql`
      INSERT INTO "tenants" ("name", "slug", "bolna_sub_account_id", "plan") 
      VALUES ('Default Company', 'default', 'default-sub-account', 'pro')
      ON CONFLICT (slug) DO NOTHING
    `);
    console.log('✅ Created default tenant');

    // 4. Add new columns to users
    await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tenant_id" integer`);
    await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text`);
    await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'agent'`);
    await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active'`);
    console.log('✅ Added columns to users table');

    // 5. Update existing users
    await db.execute(sql`
      UPDATE "users" SET 
        "tenant_id" = 1,
        "role" = 'admin',
        "status" = 'active'
      WHERE "tenant_id" IS NULL
    `);
    console.log('✅ Updated existing users');

    // 6. Fix agent columns if they exist
    try {
      await db.execute(sql`ALTER TABLE "agents" ALTER COLUMN "agent_config" TYPE json USING "agent_config"::json`);
      await db.execute(sql`ALTER TABLE "agents" ALTER COLUMN "agent_prompts" TYPE json USING "agent_prompts"::json`);
      console.log('✅ Fixed agent column types');
    } catch (e) {
      console.log('ℹ️  Agent columns already correct or table doesn\'t exist');
    }

    // 7. Add tenant_id to agents and executions if tables exist
    try {
      await db.execute(sql`ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "tenant_id" integer`);
      await db.execute(sql`UPDATE "agents" SET "tenant_id" = 1 WHERE "tenant_id" IS NULL`);
      console.log('✅ Updated agents table');
    } catch (e) {
      console.log('ℹ️  Agents table doesn\'t exist yet');
    }

    try {
      await db.execute(sql`ALTER TABLE "executions" ADD COLUMN IF NOT EXISTS "tenant_id" integer`);
      await db.execute(sql`UPDATE "executions" SET "tenant_id" = 1 WHERE "tenant_id" IS NULL`);
      console.log('✅ Updated executions table');
    } catch (e) {
      console.log('ℹ️  Executions table doesn\'t exist yet');
    }

    // 8. Create phone_numbers table
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
    console.log('✅ Created phone_numbers table');

    // 9. Create campaigns table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "campaigns" (
        "id" serial PRIMARY KEY NOT NULL,
        "tenant_id" integer NOT NULL REFERENCES "tenants"("id"),
        "agent_id" integer NOT NULL,
        "name" text NOT NULL,
        "status" text NOT NULL DEFAULT 'draft',
        "contacts" json NOT NULL,
        "schedule" json DEFAULT '{}',
        "created_at" timestamp DEFAULT now()
      )
    `);
    console.log('✅ Created campaigns table');

    // NOTE: No default super admin is created to avoid static credentials.
    // Please create a super admin securely using a script or via SQL with a bcrypt-hashed password.

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n🚀 Next steps:');
    console.log('   1. npm install jsonwebtoken bcryptjs @types/jsonwebtoken @types/bcryptjs');
    console.log('   2. npm run dev');
    console.log('   3. Create a super admin account manually in the database with a bcrypt hashed password.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runSafeMigration();