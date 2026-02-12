import "dotenv/config";
import { db } from "../server/db";
import { tenants, users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function showTenantUsers() {
  console.log('\n=== TENANTS & USERS ===\n');
  
  const allTenants = await db.select().from(tenants);
  
  for (const tenant of allTenants) {
    console.log(`📁 Tenant: ${tenant.name} (slug: ${tenant.slug})`);
    console.log(`   ID: ${tenant.id}`);
    console.log(`   Plan: ${tenant.plan}`);
    console.log(`   Status: ${tenant.status}`);
    console.log(`   ThinkVoiceSub-Account: ${tenant.bolna_sub_account_id}`);
    console.log(`   Created: ${tenant.created_at}`);
    
    const tenantUsers = await db.select().from(users).where(eq(users.tenant_id, tenant.id));
    
    console.log(`\n   👥 Users (${tenantUsers.length}):`);
    tenantUsers.forEach(user => {
      console.log(`      - ${user.name} (${user.email})`);
      console.log(`        Role: ${user.role} | Status: ${user.status}`);
    });
    console.log('\n' + '='.repeat(60) + '\n');
  }
  
  process.exit(0);
}

showTenantUsers();
