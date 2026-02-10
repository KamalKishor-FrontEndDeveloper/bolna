import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema";

async function listUsers() {
  const rows = await db.select().from(users);
  console.log(rows);
  process.exit(0);
}

listUsers();
