import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure SSL handling. By default, allow self-signed certs in non-production
// but require verification in production. Override with env vars:
// DATABASE_SSL=true|false and DATABASE_SSL_REJECT_UNAUTHORIZED=true|false
const ssl = process.env.DATABASE_SSL === 'true'
  ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
  : process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false };

console.log('[DB] SSL config:', JSON.stringify(ssl));

export const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl });
export const db = drizzle(pool, { schema });
