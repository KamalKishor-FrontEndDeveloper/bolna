import { config } from 'dotenv';
config();

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

async function createCompleteUser() {
  console.log('🔄 Creating complete demo user...');

  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });
  const db = drizzle(pool);

  try {
    const hashedPassword = await bcrypt.hash('password', 10);

    // Create user with all required fields
    const result = await db.execute(sql`
      INSERT INTO "users" (
        "tenant_id", 
        "name", 
        "email", 
        "password_hash", 
        "role", 
        "status",
        "bolna_sub_account_id"
      ) 
      VALUES (
        1, 
        'Demo User', 
        'demo@company.com', 
        ${hashedPassword}, 
        'admin', 
        'active',
        'demo-sub-account-123'
      )
      RETURNING id, name, email
    `);

    console.log('✅ Demo user created:', result.rows[0]);
    console.log('📋 Login Credentials:');
    console.log('   Email: demo@company.com');
    console.log('   Password: password');

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    
    // Check if user exists
    try {
      const existing = await db.execute(sql`
        SELECT id, name, email FROM "users" WHERE email = 'demo@company.com'
      `);
      
      if (existing.rows.length > 0) {
        console.log('ℹ️  User exists:', existing.rows[0]);
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

createCompleteUser();