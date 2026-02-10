
import pg from "pg";
import "dotenv/config";

const { Client } = pg;

async function createDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL must be set");
  }

  // Connect to the default 'postgres' database to create the new database
  const mainDbUrl = connectionString.replace(/\/bolna_wrapper$/, "/postgres");
  const client = new Client({ connectionString: mainDbUrl });

  try {
    await client.connect();
    
    const dbName = "bolna_wrapper";
    
    // Check if database exists
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (res.rowCount === 0) {
      console.log(`Creating database ${dbName}...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database ${dbName} created successfully.`);
    } else {
      console.log(`Database ${dbName} already exists.`);
    }
  } catch (err) {
    console.error("Error creating database:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDatabase();
