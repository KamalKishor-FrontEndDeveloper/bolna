import "dotenv/config";
import { db } from "../server/db";
import { superAdmins } from "@shared/schema";

async function checkSuperAdmin() {
  const admins = await db.select().from(superAdmins);
  console.log('Super Admins in database:', JSON.stringify(admins, null, 2));
  process.exit(0);
}

checkSuperAdmin();
