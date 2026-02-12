import { db } from './server/db';
import { superAdmins } from '@shared/schema';
import { hashPassword } from './server/auth';

async function setupMultiTenant() {
  console.log('🚀 Setting up multi-tenant ThinkVoiceSaaS...');

  try {
    // Create first super admin from env vars to avoid static credentials
    const adminEmail = process.env.SUPER_ADMIN_EMAIL;
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.log('ℹ️  SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD not set.');
      console.log('   Use the `script/create_super_admin.ts` script or set env vars to create a super admin.');
    } else {
      const hashedPassword = await hashPassword(adminPassword);

      const [admin] = await db.insert(superAdmins).values({
        email: adminEmail,
        name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
        password_hash: hashedPassword
      }).returning().catch(() => [null]); // Ignore if already exists

      if (admin) {
        console.log('✅ Super admin created:');
        console.log(`   Email: ${adminEmail}`);
        console.log('   ⚠️  CHANGE THE PASSWORD IMMEDIATELY!');
      } else {
        console.log('ℹ️  Super admin already exists');
      }
    }

    console.log('\\n📋 Next Steps:');
    console.log('1. Run database migration: npm run db:push');
    console.log('2. Install new dependencies: npm install jsonwebtoken bcryptjs @types/jsonwebtoken @types/bcryptjs');
    console.log('3. Add JWT_SECRET to your .env file');
    console.log('4. Start the server: npm run dev');
    console.log('5. Login as super admin and create your first tenant');
    console.log('\\n🎯 Multi-tenant Features:');
    console.log('- Super Admin Dashboard: /super-admin');
    console.log('- Tenant Login: /login');
    console.log('- Tenant Dashboard: /dashboard');
    console.log('- Role-based access control (admin, manager, agent)');
    console.log('- Complete tenant isolation');
    console.log('- Campaign management');
    console.log('- User management per tenant');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setupMultiTenant();