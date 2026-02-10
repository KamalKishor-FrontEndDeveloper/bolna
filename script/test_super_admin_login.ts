import "dotenv/config";
import { db } from "../server/db";
import { superAdmins } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function testLogin() {
  const email = 'admin@bolna-saas.com';
  const password = 'password';
  
  console.log('Testing login for:', email);
  console.log('Password:', password);
  
  const [admin] = await db.select().from(superAdmins).where(eq(superAdmins.email, email));
  
  if (!admin) {
    console.log('❌ Admin not found!');
    process.exit(1);
  }
  
  console.log('\n✅ Admin found:', {
    id: admin.id,
    email: admin.email,
    name: admin.name
  });
  
  console.log('\nPassword hash:', admin.password_hash);
  
  const isMatch = await bcrypt.compare(password, admin.password_hash);
  console.log('\nPassword comparison result:', isMatch);
  
  if (isMatch) {
    console.log('✅ Password matches!');
  } else {
    console.log('❌ Password does NOT match!');
  }
  
  process.exit(0);
}

testLogin();
