import { config } from 'dotenv';
config();

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@bolna-saas.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'password';
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const ssl = process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: true }
      : { rejectUnauthorized: false };

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl });
  const db = drizzle(pool);

  try {
    const hashed = await bcrypt.hash(password, 10);

    await db.execute(sql`
      INSERT INTO "super_admins" ("email", "name", "password_hash") 
      VALUES (${email}, ${name}, ${hashed})
      ON CONFLICT (email) DO UPDATE SET 
        password_hash = ${hashed}, 
        name = ${name}
    `);

    console.log(`✅ Super admin created/updated: ${email}`);
  } catch (err: any) {
    console.error('Failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
