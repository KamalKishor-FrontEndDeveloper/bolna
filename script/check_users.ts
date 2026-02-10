import { config } from 'dotenv';
config();

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

async function checkAndFixUsers() {
  const ssl = process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: true }
      : { rejectUnauthorized: false };

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl });
  const db = drizzle(pool);

  try {
    // Check existing users
    const users = await db.execute(sql`
      SELECT id, name, email, password_hash, bolna_sub_account_id, tenant_id 
      FROM "users" 
      LIMIT 10
    `);
    
    console.log('Existing users:', users.rows);

    // Check if we have a working user
    const workingUser = users.rows.find((u: any) => u.email && u.password_hash);
    
    if (workingUser) {
      console.log('✅ Found working user:', workingUser.email);
      console.log('📋 Try logging in with this email and check if password works');
    } else {
      console.log('❌ No working users found');
      
      // Create a simple working user
      const hashedPassword = await bcrypt.hash('password', 10);
      
      const newUser = await db.execute(sql`
        INSERT INTO "users" (
          "name", 
          "email", 
          "password_hash", 
          "bolna_sub_account_id",
          "tenant_id"
        ) 
        VALUES (
          'Test User', 
          'test@example.com', 
          ${hashedPassword}, 
          'test-sub-account',
          1
        )
        RETURNING id, name, email
      `);
      
      console.log('✅ Created working user:', newUser.rows[0]);
      console.log('📋 Login: test@example.com / password');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkAndFixUsers();