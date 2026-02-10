import pg from 'pg';
import "dotenv/config";

const { Pool } = pg;

async function test() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const ssl = { rejectUnauthorized: false };
  console.log('Testing Pool with ssl:', ssl);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl });

  try {
    const res = await pool.query('SELECT 1 as ok');
    console.log('Query result:', res.rows);
  } catch (err: any) {
    console.error('Error during test query:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

void test();