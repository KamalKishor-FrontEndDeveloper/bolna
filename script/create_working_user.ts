import { config } from 'dotenv';
config();

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

async function createWorkingDemoUser() {
  console.log('🔄 Creating working demo user...');

  const ssl = process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: true }
      : { rejectUnauthorized: false };

  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl,
  });
  const db = drizzle(pool);

  try {
    const hashedPassword = await bcrypt.hash('password', 10);

    // Check current schema first
    const schemaCheck = await db.execute(sql`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current users table schema:', schemaCheck.rows);

    // Try to create user with all required fields
    const result = await db.execute(sql`
      INSERT INTO "users" ("tenant_id", "name", "email", "password_hash", "role", "status") 
      VALUES (1, 'Demo User', 'demo@company.com', ${hashedPassword}, 'admin', 'active')
      RETURNING id, name, email
    `);

    console.log('✅ Demo user created:', result.rows[0]);
    console.log('📋 Login Credentials:');
    console.log('   Email: demo@company.com');
    console.log('   Password: password');

  } catch (error: any) {
    console.error('❌ Failed to create demo user:', error.message);
    
    // Try alternative approach - check if user already exists
    try {
      const existing = await db.execute(sql`
        SELECT id, name, email, role FROM "users" WHERE email = 'demo@company.com'
      `);
      
      if (existing.rows.length > 0) {
        console.log('ℹ️  Demo user already exists:', existing.rows[0]);
        console.log('📋 Use: demo@company.com / password');
      }
    } catch (e) {
      console.error('Could not check existing users');
    }
  } finally {
    await pool.end();
    process.exit(0);
  }
}

createWorkingDemoUser();