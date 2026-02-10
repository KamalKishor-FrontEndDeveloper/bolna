import { config } from 'dotenv';
config();

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

async function createDemoUser() {
  console.log('🔄 Creating demo user for MVP...');

  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });
  const db = drizzle(pool);

  try {
    const hashedPassword = await bcrypt.hash('password', 10);

    // Create demo user
    await db.execute(sql`
      INSERT INTO "users" ("tenant_id", "name", "email", "password_hash", "role", "status") 
      VALUES (1, 'Demo User', 'admin@company.com', ${hashedPassword}, 'admin', 'active')
    `);

    console.log('✅ Demo user created!');
    console.log('📋 Login Credentials:');
    console.log('   Email: admin@company.com');
    console.log('   Password: password');
    console.log('🚀 Start the server and login to test the MVP!');

  } catch (error) {
    console.error('❌ Failed to create demo user:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

createDemoUser();