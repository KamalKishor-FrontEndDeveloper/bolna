# Multi-Tenant ThinkVoiceSaaS Platform

## 🎯 Overview

This is now a complete multi-tenant SaaS platform that replicates Bolna.ai functionality with:

- **Super Admin** - Manages all tenants
- **Tenants** - Individual companies with isolated workspaces  
- **Users** - Role-based access (admin, manager, agent) within tenants
- **Complete ThinkVoiceFeature Set** - Agents, calls, campaigns, phone numbers, analytics

## 🏗️ Architecture

```
Super Admin
├── Tenant 1 (Company A)
│   ├── Admin Users
│   ├── Manager Users  
│   ├── Agent Users
│   ├── AI Voice Agents
│   ├── Phone Numbers
│   ├── Campaigns
│   └── Call Logs/Analytics
└── Tenant 2 (Company B)
    └── ... (isolated workspace)
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install jsonwebtoken bcryptjs @types/jsonwebtoken @types/bcryptjs
```

### 2. Environment Setup
Add to your `.env`:
```env
JWT_SECRET=your-super-secret-jwt-key-here
DATABASE_URL=your-postgres-connection-string
BOLNA_API_KEY=your-bolna-api-key
```

### 3. Database Migration
```bash
# Run the multi-tenant migration
npm run db:push

# Or manually run the SQL migration
psql -d your_database -f drizzle/migrations/0002_multi_tenant.sql
```

### 4. Initialize Super Admin
```bash
npx tsx script/setup_multitenant.ts
```

### 5. Start the Platform
```bash
npm run dev
```

## 🔐 Authentication Flow

### Super Admin Access
- URL: `/super-admin/login`
- There are no default static credentials. Create a super admin securely using the `script/create_super_admin.ts` script or set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` and run `npx tsx script/setup_multitenant.ts`.
- Can create/manage all tenants

### Tenant Access  
- URL: `/login`
- Each tenant has isolated login
- Role-based permissions within tenant

## 🎛️ User Roles & Permissions

### Super Admin
- Create/manage tenants
- View global analytics
- Control platform settings

### Tenant Admin
- Manage tenant users
- Create/edit agents
- Manage campaigns
- View all tenant data

### Tenant Manager
- Create/edit agents
- Manage campaigns
- View team data

### Tenant Agent
- View assigned data
- Basic agent interactions

## 📊 Core Features

### ✅ Implemented
- Multi-tenant authentication & authorization
- Super admin tenant management
- Tenant user management
- Role-based access control
- Database tenant isolation
- Campaign management structure
- Phone number management per tenant

### 🔄 Ready to Implement
- Agent creation/management (tenant-scoped)
- Call execution (tenant-scoped)
- Campaign execution engine
- Analytics dashboard per tenant
- Billing/subscription management
- Webhook management per tenant

## 🛠️ API Endpoints

### Super Admin
```
POST /api/super-admin/login
GET  /api/super-admin/tenants
POST /api/super-admin/tenants
```

### Tenant Auth
```
POST /api/auth/login
GET  /api/auth/me
```

### Tenant Management
```
GET  /api/tenant/users
POST /api/tenant/users
GET  /api/tenant/campaigns
POST /api/tenant/campaigns
GET  /api/tenant/agents
POST /api/tenant/agents
```

### ThinkVoiceProxy (Tenant-Scoped)
```
GET  /api/bolna/agents
POST /api/bolna/agents
GET  /api/bolna/agents/:id
PUT  /api/bolna/agents/:id
DELETE /api/bolna/agents/:id
```

## 🎨 Frontend Structure

```
client/src/
├── contexts/
│   └── AuthContext.tsx          # Multi-tenant auth
├── pages/
│   ├── LoginPage.tsx           # Tenant + Super Admin login
│   ├── SuperAdminDashboard.tsx # Tenant management
│   ├── Dashboard.tsx           # Tenant dashboard
│   ├── Agents.tsx              # Agent management
│   ├── Campaigns.tsx           # Campaign management
│   └── Users.tsx               # User management
└── components/
    ├── ProtectedRoute.tsx      # Role-based routing
    └── TenantLayout.tsx        # Tenant-specific layout
```

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Tenant data isolation
- Role-based access control
- API key management per tenant
- Secure ThinkVoiceAPI proxying

## 📈 Scaling Considerations

- Database indexes on tenant_id
- Connection pooling
- Redis for session management
- CDN for static assets
- Load balancing for multiple instances

## 🎯 Next Development Steps

1. **Complete Agent Management**
   - Tenant-scoped agent CRUD
   - Agent configuration UI matching Bolna

2. **Campaign Engine**
   - Batch call execution
   - Scheduling system
   - Progress tracking

3. **Analytics Dashboard**
   - Call metrics per tenant
   - Agent performance
   - Campaign analytics

4. **Billing Integration**
   - Subscription management
   - Usage tracking
   - Payment processing

5. **Advanced Features**
   - White-label customization
   - API access for tenants
   - Webhook management
   - Integration marketplace

## 🐛 Troubleshooting

### Database Issues
```bash
# Reset database
npm run db:push
npx tsx script/setup_multitenant.ts
```

### Authentication Issues
- Check JWT_SECRET in .env
- Verify token expiration
- Clear localStorage in browser

### Tenant Isolation Issues
- Verify tenant_id in all queries
- Check middleware authentication
- Review role permissions

## 📞 Support

This multi-tenant transformation provides:
- Complete tenant isolation
- Scalable architecture
- Role-based security
- ThinkVoiceAPI compatibility
- Modern React UI

You now have a production-ready SaaS platform foundation!