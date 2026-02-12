import type { Express, Request, Response } from "express";
import { db } from "./db";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { 
  superAdmins, tenants, users, agents, campaigns, phoneNumbers, executions, adminAuditLogs,
  loginSchema, registerTenantSchema, createUserSchema, createCampaignSchema
} from "@shared/schema";
import { 
  requireSuperAdmin, requireTenantUser, requireRole, 
  generateToken, generateShortToken, hashPassword, comparePassword, AuthRequest 
} from "./auth";
import { bolnaService } from "./lib/bolna";
import { canCreateResource, getPlanLimits, hasFeature } from "./lib/tenantLimits";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { syncAgentsWithBolna, syncExecutionsWithThinkVoice} from "./lib/syncService";

export function registerMultiTenantRoutes(app: Express) {
  console.log('🔧 [ROUTES] Registering Multi-Tenant routes...');
  
  // === SUPER ADMIN ROUTES ===
  
  // Super Admin Login
  console.log('🔧 [ROUTES] Registering', api.superAdmin.login.path);
  app.post(api.superAdmin.login.path, async (req: Request, res: Response) => {
    try {
      console.log('[SUPER ADMIN LOGIN] Request received:', { email: req.body.email });
      
      const parse = loginSchema.safeParse(req.body);
      if (!parse.success) {
        console.log('[SUPER ADMIN LOGIN] Validation failed:', parse.error.message);
        return res.status(400).json({ message: parse.error.message });
      }

      const { email, password } = parse.data;
      console.log('[SUPER ADMIN LOGIN] Looking up admin:', email);
      
      const [admin] = await db.select().from(superAdmins).where(eq(superAdmins.email, email));
      
      if (!admin) {
        console.log('[SUPER ADMIN LOGIN] Admin not found');
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      console.log('[SUPER ADMIN LOGIN] Admin found, comparing password');
      const passwordMatch = await comparePassword(password, admin.password_hash);
      console.log('[SUPER ADMIN LOGIN] Password match:', passwordMatch);
      
      if (!passwordMatch) {
        console.log('[SUPER ADMIN LOGIN] Password mismatch');
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      console.log('[SUPER ADMIN LOGIN] Success! Generating token');
      const token = generateToken({ id: admin.id, type: 'super_admin' });
      res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } });
    } catch (error: any) {
      console.error('[SUPER ADMIN LOGIN] Error:', error?.message || error);
      res.status(500).json({ message: 'Login failed due to server error' });
    }
  });

  // Get current super admin info
  app.get('/api/super-admin/me', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    res.json({ admin: { id: req.user.id, name: req.user.name, email: req.user.email } });
  });

  // List all tenants
  app.get(api.superAdmin.tenants.list.path, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    const tenantList = await db.select().from(tenants).orderBy(desc(tenants.created_at));
    res.json(tenantList);
  });

  // Create new tenant
  app.post(api.superAdmin.tenants.create.path, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    const parse = registerTenantSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ message: parse.error.message });

    const { name, slug, admin_name, admin_email, admin_password, plan } = parse.data;

    try {
      console.log('[TENANT CREATION] Starting tenant creation for:', { name, slug, admin_email, plan });
      
      // basic uniqueness checks
      const [existingTenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
      if (existingTenant) {
        console.log('[TENANT CREATION] Tenant slug already exists:', slug);
        return res.status(409).json({ message: 'Tenant slug already exists' });
      }

      const [existingUser] = await db.select().from(users).where(eq(users.email, admin_email));
      if (existingUser) {
        console.log('[TENANT CREATION] Admin email already in use:', admin_email);
        return res.status(409).json({ message: 'Admin email already in use' });
      }

      let subAccountId: string | undefined = undefined;

    if (parse.data.sub_account_id) {
      // Use provided sub-account id (manual override)
      subAccountId = String(parse.data.sub_account_id).trim();
      console.log('[TENANT CREATION] Using provided sub-account ID:', subAccountId);

      // Ensure the provided sub-account id isn't already linked to another tenant
      const [existingBySub] = await db.select().from(tenants).where(eq(tenants.bolna_sub_account_id, String(subAccountId)));
      if (existingBySub) {
        console.log('[TENANT CREATION] Provided ThinkVoicesub-account already associated with tenant:', existingBySub.id);
        return res.status(409).json({ message: 'ThinkVoicesub-account already linked to another tenant' });
      }
    } else {
      console.log('[TENANT CREATION] Creating ThinkVoicesub-account...');
      // Create ThinkVoicesub-account
      try {
        const bolnaSubAccount = await bolnaService.createSubAccount(name, admin_email);
        console.log('[TENANT CREATION] ThinkVoicesub-account response:', bolnaSubAccount);
        subAccountId = bolnaSubAccount?.sub_account_id || bolnaSubAccount?.id;
        if (!subAccountId) {
          console.log('[TENANT CREATION] Failed to get sub-account ID from ThinkVoiceresponse');
          return res.status(500).json({ message: 'Failed to create ThinkVoicesub-account' });
        }

        // Ensure the returned ThinkVoicesub-account isn't already linked to another tenant
        const [existingBySub2] = await db.select().from(tenants).where(eq(tenants.bolna_sub_account_id, String(subAccountId)));
        if (existingBySub2) {
          console.log('[TENANT CREATION] ThinkVoicesub-account already associated with tenant:', existingBySub2.id);
          return res.status(409).json({ message: 'ThinkVoicesub-account already linked to another tenant' });
        }
      } catch (err: any) {
        // If ThinkVoiceindicates sub-account creation is an enterprise-only feature, fallback to internal placeholder
        const errMsg = err?.message || '';
        console.warn('[TENANT CREATION] ThinkVoicecreateSubAccount failed:', errMsg);
        const isEnterpriseRestriction = typeof errMsg === 'string' && (errMsg.toLowerCase().includes('not available') || errMsg.toLowerCase().includes('contact support') || err.status === 403);
        if (isEnterpriseRestriction) {
          // Generate internal placeholder id and mark tenant as pending sub-account
          subAccountId = `internal-${slug}-${Date.now()}`;
          console.log('[TENANT CREATION] Fallback: generated internal sub-account id:', subAccountId);
          // Attach pending_subaccount flag via settings
          (parse.data as any)._pending_subaccount = { pending_subaccount: true, pending_reason: errMsg };
        } else {
          // Re-throw for other errors
          throw err;
        }
      }
    }

      console.log('[TENANT CREATION] Creating tenant and admin user in database...');
      // Use a transaction so tenant + admin are atomic
      const result = await db.transaction(async (tx) => {
        const settings = (parse.data as any)._pending_subaccount || {};
        const [tenant] = await tx.insert(tenants).values({
          name,
          slug,
          bolna_sub_account_id: String(subAccountId),
          plan,
          status: 'active',
          settings
        }).returning();

        const hashedPassword = await hashPassword(admin_password);
        const [adminUser] = await tx.insert(users).values({
          tenant_id: tenant.id,
          name: admin_name,
          email: admin_email,
          password_hash: hashedPassword,
          bolna_sub_account_id: String(subAccountId),
          role: 'admin',
          status: 'active'
        }).returning();

        return { tenant, adminUser };
      });

      console.log('[TENANT CREATION] Success! Created tenant:', result.tenant.id);
      const safeAdmin = { ...result.adminUser, password_hash: undefined };
      res.status(201).json({ tenant: result.tenant, admin: safeAdmin });
    } catch (error: any) {
      console.error('[TENANT CREATION] Error details:', {
        message: error.message,
        stack: error.stack,
        status: error.status,
        name: error.name
      });
      res.status(400).json({ message: `Failed to create tenant: ${error.message}` });
    }
  });

  // === SUPER ADMIN - User Management ===
  // Create a user in any tenant (super-admin only)
  app.post('/api/super-admin/users', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    const { name, email, password, role, tenant_id } = req.body;

    if (!name || !email || !password || !tenant_id) {
      return res.status(400).json({ message: 'Missing required fields: name, email, password, tenant_id' });
    }

    try {
      // basic checks
      const [existing] = await db.select().from(users).where(eq(users.email, email));
      if (existing) return res.status(409).json({ message: 'Email already in use' });

      const hashed = await hashPassword(password);
      const [newUser] = await db.insert(users).values({
        tenant_id: tenant_id,
        name,
        email,
        password_hash: hashed,
        role: role || 'agent',
        status: 'active',
        bolna_sub_account_id: ''
      }).returning();

      res.status(201).json({ ...newUser, password_hash: undefined });
    } catch (err: any) {
      console.error('[super-admin/users] error', err);
      res.status(400).json({ message: err.message });
    }
  });

  // Get tenant details with usage stats
  app.get('/api/super-admin/tenants/:id', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    const tenantId = parseInt(req.params.id);
    
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    // Get usage statistics
    const [userCount] = await db.select({ count: count() }).from(users).where(eq(users.tenant_id, tenantId));
    const [agentCount] = await db.select({ count: count() }).from(agents).where(eq(agents.tenant_id, tenantId));
    const [phoneCount] = await db.select({ count: count() }).from(phoneNumbers).where(eq(phoneNumbers.tenant_id, tenantId));
    const [campaignCount] = await db.select({ count: count() }).from(campaigns).where(eq(campaigns.tenant_id, tenantId));
    const [executionCount] = await db.select({ count: count() }).from(executions).where(eq(executions.tenant_id, tenantId));

    const planLimits = getPlanLimits(tenant.plan);

    res.json({
      tenant,
      usage: {
        users: { current: userCount.count, limit: planLimits.maxUsers },
        agents: { current: agentCount.count, limit: planLimits.maxAgents },
        phoneNumbers: { current: phoneCount.count, limit: planLimits.maxPhoneNumbers },
        campaigns: { current: campaignCount.count, limit: planLimits.maxCampaigns },
        executions: { current: executionCount.count, limit: planLimits.maxCallsPerMonth }
      },
      planLimits
    });
  });

  // Get tenant users
  app.get('/api/super-admin/tenants/:id/users', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    const tenantId = parseInt(req.params.id);
    
    const userList = await db.select().from(users)
      .where(eq(users.tenant_id, tenantId))
      .orderBy(desc(users.created_at));
    
    res.json(userList.map(u => ({ ...u, password_hash: undefined })));
  });

  // Update tenant user
  app.patch('/api/super-admin/users/:userId', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    const userId = parseInt(req.params.userId);
    const { name, email, role, status } = req.body;

    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (status) updates.status = status;

    try {
      const [updatedUser] = await db.update(users)
        .set(updates)
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) return res.status(404).json({ message: 'User not found' });

      res.json({ ...updatedUser, password_hash: undefined });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // --- Super-admin: Impersonation ---
  app.post('/api/super-admin/tenants/:id/impersonate', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

      // Find an active admin user in the tenant
      const [adminUser] = await db.select().from(users).where(and(eq(users.tenant_id, tenantId), eq(users.role, 'admin'), eq(users.status, 'active')));
      if (!adminUser) return res.status(404).json({ message: 'No active admin user for tenant' });

      // Generate short-lived impersonation token
      const token = generateShortToken({ id: adminUser.id, tenant_id: tenantId, type: 'tenant_user', impersonation: true, impersonator_id: req.user?.id }, '15m');

      // Insert audit log
      await db.insert(adminAuditLogs).values({ action: 'impersonation_start', admin_id: adminUser.id, impersonator_id: req.user?.id, tenant_id: tenantId, details: { by: req.user?.email || req.user?.id } });

      res.json({ token, user: { id: adminUser.id, name: adminUser.name, email: adminUser.email, role: adminUser.role }, tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan } });
    } catch (err: any) {
      console.error('[IMPERSONATE] error', err);
      res.status(400).json({ message: err.message });
    }
  });

  // Stop impersonation (for audit) - must be called by super-admin after restoring original session
  app.post('/api/super-admin/impersonation/stop', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { admin_id, tenant_id } = req.body;
      await db.insert(adminAuditLogs).values({ action: 'impersonation_end', admin_id: admin_id || null, impersonator_id: req.user?.id, tenant_id: tenant_id || null, details: { by: req.user?.email || req.user?.id } });
      res.json({ ok: true });
    } catch (err: any) {
      console.error('[IMPERSONATE STOP] error', err);
      res.status(400).json({ message: err.message });
    }
  });

  // Update tenant plan or status
  app.patch('/api/super-admin/tenants/:id', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    const tenantId = parseInt(req.params.id);
    const { plan, status, sub_account_id } = req.body;

    const updates: any = {};
    if (plan) updates.plan = plan;
    if (status) updates.status = status;

    try {
      if (sub_account_id) {
        // Ensure the provided sub-account id isn't already linked to another tenant
        const [existing] = await db.select().from(tenants).where(eq(tenants.bolna_sub_account_id, String(sub_account_id)));
        if (existing && existing.id !== tenantId) {
          return res.status(409).json({ message: 'ThinkVoicesub-account already linked to another tenant' });
        }

        // Remove pending flag from settings if present
        const [tenantRow] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
        if (!tenantRow) return res.status(404).json({ message: 'Tenant not found' });

        const newSettings: any = { ...(tenantRow.settings || {}) };
        delete newSettings.pending_subaccount;
        delete newSettings.pending_reason;

        updates.bolna_sub_account_id = String(sub_account_id);
        updates.settings = newSettings;
      }

      const [updatedTenant] = await db.update(tenants)
        .set(updates)
        .where(eq(tenants.id, tenantId))
        .returning();

      if (!updatedTenant) return res.status(404).json({ message: 'Tenant not found' });

      res.json({ tenant: updatedTenant });
    } catch (err: any) {
      console.error('[super-admin/tenants PATCH] error', err);
      res.status(400).json({ message: err.message });
    }
  });

  // Get tenant plan limits info
  app.get(api.tenant.limits.path, requireTenantUser, async (req: AuthRequest, res: Response) => {
    const planLimits = getPlanLimits(req.tenant.plan);
    
    try {
      // Get current usage from ThinkVoiceAPI (source of truth)
      const bolnaAgents = await bolnaService.listAgents(req.tenant.bolna_sub_account_id);
      const bolnaPhones = await bolnaService.listPhoneNumbers(req.tenant.bolna_sub_account_id);
      
      // Get local database counts for users and campaigns
      const [userCount] = await db.select({ count: count() }).from(users).where(eq(users.tenant_id, req.tenant.id));
      const [campaignCount] = await db.select({ count: count() }).from(campaigns).where(eq(campaigns.tenant_id, req.tenant.id));

      res.json({
        plan: req.tenant.plan,
        limits: planLimits,
        usage: {
          users: { current: userCount.count, limit: planLimits.maxUsers },
          agents: { current: bolnaAgents.length, limit: planLimits.maxAgents },
          phoneNumbers: { current: bolnaPhones.length, limit: planLimits.maxPhoneNumbers },
          campaigns: { current: campaignCount.count, limit: planLimits.maxCampaigns }
        }
      });
    } catch (err: any) {
      // Fallback to database counts if ThinkVoiceAPI fails
      const [userCount] = await db.select({ count: count() }).from(users).where(eq(users.tenant_id, req.tenant.id));
      const [agentCount] = await db.select({ count: count() }).from(agents).where(eq(agents.tenant_id, req.tenant.id));
      const [phoneCount] = await db.select({ count: count() }).from(phoneNumbers).where(eq(phoneNumbers.tenant_id, req.tenant.id));
      const [campaignCount] = await db.select({ count: count() }).from(campaigns).where(eq(campaigns.tenant_id, req.tenant.id));

      res.json({
        plan: req.tenant.plan,
        limits: planLimits,
        usage: {
          users: { current: userCount.count, limit: planLimits.maxUsers },
          agents: { current: agentCount.count, limit: planLimits.maxAgents },
          phoneNumbers: { current: phoneCount.count, limit: planLimits.maxPhoneNumbers },
          campaigns: { current: campaignCount.count, limit: planLimits.maxCampaigns }
        }
      });
    }
  });

  // --- API Keys (ThinkVoiceAPI KEY) ---
  // Public: check whether a key exists (returns { value: boolean })
  app.get(api.keys.get.path, async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      const value = await storage.getApiKey(key);
      // Do NOT return the actual key value to clients in the response. Return presence flag only.
      res.json({ value: !!value });
    } catch (err: any) {
      res.status(500).json({ message: 'Failed to get key status' });
    }
  });

  // Save API key (super-admin only)
  app.post(api.keys.save.path, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    const { key, value } = req.body;
    if (!key || !value) return res.status(400).json({ message: 'Missing key or value' });

    try {
      const saved = await storage.saveApiKey(key, value);
      // Log the save for auditing (minimal) and do not return the secret value back to the client
      console.log('[API KEYS] Saved key:', key, 'by', req.user?.email || req.user?.id, 'at', saved.updatedAt);
      res.json({ key: saved.key, updatedAt: saved.updatedAt });
    } catch (err: any) {
      console.error('[API KEYS] Failed to save API key', err);
      const msg = process.env.NODE_ENV === 'production' ? 'Failed to save API key' : (err?.message || String(err));
      res.status(500).json({ message: msg });
    }
  });

  // === TENANT AUTH ROUTES ===
  
  // Tenant User Login (tenant-scoped by slug)
  app.post('/api/tenants/:slug/login', async (req: Request, res: Response) => {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ message: parse.error.message });

    const slug = String(req.params.slug || '').trim();
    if (!slug) return res.status(400).json({ message: 'Missing tenant slug in path' });

    const { email, password } = parse.data;

    const [tenantRow] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    if (!tenantRow) return res.status(404).json({ message: 'Tenant not found' });

    const [userRow] = await db.select().from(users).where(and(eq(users.email, email), eq(users.tenant_id, tenantRow.id), eq(users.status, 'active')));
    if (!userRow || !(await comparePassword(password, userRow.password_hash))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (tenantRow.status !== 'active') return res.status(401).json({ message: 'Account suspended' });

    const token = generateToken({ id: userRow.id, tenant_id: tenantRow.id, type: 'tenant_user' });

    res.json({
      token,
      user: { id: userRow.id, name: userRow.name, email: userRow.email, role: userRow.role },
      tenant: { id: tenantRow.id, name: tenantRow.name, slug: tenantRow.slug, plan: tenantRow.plan }
    });
  });

  // Tenant User Login (legacy/email global lookup)
  app.post(api.auth.login.path, async (req: Request, res: Response) => {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ message: parse.error.message });

    const { email, password } = parse.data;
    
    const [result] = await db.select({
      user: users,
      tenant: tenants
    })
    .from(users)
    .innerJoin(tenants, eq(users.tenant_id, tenants.id))
    .where(and(eq(users.email, email), eq(users.status, 'active')));

    if (!result || !(await comparePassword(password, result.user.password_hash))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (result.tenant.status !== 'active') {
      return res.status(401).json({ message: 'Account suspended' });
    }

    const token = generateToken({ 
      id: result.user.id, 
      tenant_id: result.tenant.id,
      type: 'tenant_user' 
    });

    res.json({ 
      token, 
      user: { 
        id: result.user.id, 
        name: result.user.name, 
        email: result.user.email, 
        role: result.user.role 
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        plan: result.tenant.plan
      }
    });
  });

  // Get current user info with wallet and concurrency data
  app.get('/api/auth/me', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const safeUser = { ...req.user, password_hash: undefined };
      
      // Fetch wallet, concurrency, and pricing info from ThinkVoiceAPI
      const client = await bolnaService['initClient']();
      const headers = { "X-Sub-Account-Id": req.tenant.bolna_sub_account_id };
      
      try {
        const meRes = await client.get('/user/me', { headers });
        const bolnaData = meRes.data || {};
        
        res.json({ 
          user: safeUser, 
          tenant: req.tenant,
          wallet: bolnaData.wallet || 0,
          concurrency: bolnaData.concurrency || { max: 0, current: 0 },
          pricing: bolnaData.pricing || null,
          credit_limit: bolnaData.credit_limit || null,
          bypass_compliance: bolnaData.bypass_compliance || false,
          tier_plan: bolnaData.tier_plan || null
        });
      } catch (err) {
        // If /user/me endpoint fails, return without ThinkVoicedata
        res.json({ user: safeUser, tenant: req.tenant });
      }
    } catch (err: any) {
      res.status(500).json({ message: err?.message || 'Failed to fetch user info' });
    }
  });

  // Sync local database with ThinkVoiceAPI (removes orphaned records)
  app.post('/api/tenant/sync', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const result = await syncAgentsWithBolna(req.tenant.id, req.tenant.bolna_sub_account_id);
      res.json({ message: 'Sync completed', ...result });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || 'Sync failed' });
    }
  });

  // Sync executions from ThinkVoiceAPI to local database
  app.post('/api/tenant/sync-executions', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const result = await syncExecutionsWithBolna(req.tenant.id, req.tenant.bolna_sub_account_id);
      res.json({ message: 'Executions synced successfully', ...result });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || 'Sync failed' });
    }
  });

  // Stop a specific call by execution_id
  app.post('/api/bolna/call/:executionId/stop', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const executionId = req.params.executionId;
      if (!executionId) return res.status(400).json({ message: 'Missing execution ID' });
      
      const result = await bolnaService.stopCall(req.tenant.bolna_sub_account_id, executionId);
      res.json(result);
    } catch (err: any) {
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  // Stop a specific call by execution_id (plural alias)
  app.post('/api/bolna/calls/:executionId/stop', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const executionId = req.params.executionId;
      if (!executionId) return res.status(400).json({ message: 'Missing execution ID' });
      
      const result = await bolnaService.stopCall(req.tenant.bolna_sub_account_id, executionId);
      res.json(result);
    } catch (err: any) {
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  // Stop queued calls for an agent (proxy to Bolna)
  app.post('/api/bolna/agents/:id/stop', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const agentId = String(req.params.id);
      const subAccountId = req.tenant?.bolna_sub_account_id || undefined;
      await bolnaService.stopAgent(agentId, subAccountId);
      res.json({ ok: true });
    } catch (err: any) {
      console.error('[ThinkVoiceSTOP AGENT]', err);
      res.status(err?.status || 400).json({ message: err?.message || 'Failed to stop queued calls' });
    }
  });

  // Export all executions for an agent as CSV
  app.get('/api/bolna/agents/:id/export', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const agentId = String(req.params.id);
      const subAccountId = req.tenant?.bolna_sub_account_id || undefined;
      const params: any = {};
      if (req.query.from) params.from = String(req.query.from);
      if (req.query.to) params.to = String(req.query.to);
      params.page_size = 100;
      params.page_number = 1;

      let allData: any[] = [];
      while (true) {
        const page = await bolnaService.fetchExecutions(agentId, subAccountId, params);
        if (!page || !page.data) break;
        allData = allData.concat(page.data);
        if (!page.has_more) break;
        params.page_number = (params.page_number || 1) + 1;
      }

      const headers = ['execution_id','to_number','from_number','provider','direction','duration','status','total_cost','created_at'];
      const rows = allData.map((e: any) => [
        e.id,
        e.telephony_data?.to_number || '',
        e.telephony_data?.from_number || '',
        e.telephony_data?.provider || '',
        e.telephony_data?.direction || '',
        e.conversation_time || '',
        e.status || '',
        e.total_cost ?? '',
        e.created_at || ''
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.map((v:any) => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="agent-${agentId}-executions.csv"`);
      res.send(csv);
    } catch (err: any) {
      console.error('[ThinkVoiceEXPORT AGENT]', err);
      res.status(err?.status || 400).json({ message: err?.message || 'Failed to export executions' });
    }
  });

  // === TENANT MANAGEMENT ROUTES ===
  
  // List tenant users (admin/manager only)
  app.get(api.tenant.users.list.path, requireTenantUser, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
    const userList = await db.select().from(users)
      .where(eq(users.tenant_id, req.tenant.id))
      .orderBy(desc(users.created_at));
    
    res.json(userList.map(u => ({ ...u, password_hash: undefined })));
  });

  // Create new user in tenant (admin only)
  app.post(api.tenant.users.create.path, requireTenantUser, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
    const parse = createUserSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ message: parse.error.message });

    const { name, email, password, role } = parse.data;

    try {
      // Check plan limits
      const [userCount] = await db.select({ count: count() }).from(users).where(eq(users.tenant_id, req.tenant.id));
      const limitCheck = canCreateResource(userCount.count, req.tenant.plan, 'maxUsers');
      
      if (!limitCheck.allowed) {
        return res.status(403).json({ 
          message: limitCheck.message,
          currentCount: userCount.count,
          limit: limitCheck.limit,
          plan: req.tenant.plan
        });
      }

      const hashedPassword = await hashPassword(password);
      const [newUser] = await db.insert(users).values({
        tenant_id: req.tenant.id,
        name,
        email,
        password_hash: hashedPassword,
        role,
        status: 'active',
        bolna_sub_account_id: ''
      }).returning();

      res.status(201).json({ ...newUser, password_hash: undefined });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // === CAMPAIGN MANAGEMENT ===
  
  // List campaigns
  app.get(api.tenant.campaigns.list.path, requireTenantUser, async (req: AuthRequest, res: Response) => {
    const campaignList = await db.select({
      campaign: campaigns,
      agent: agents
    })
    .from(campaigns)
    .innerJoin(agents, eq(campaigns.agent_id, agents.id))
    .where(eq(campaigns.tenant_id, req.tenant.id))
    .orderBy(desc(campaigns.created_at));

    res.json(campaignList);
  });

  // Create campaign
  app.post(api.tenant.campaigns.create.path, requireTenantUser, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
    const parse = createCampaignSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ message: parse.error.message });

    const { name, agent_id, contacts, schedule } = parse.data;

    // Verify agent belongs to tenant
    const [agent] = await db.select().from(agents)
      .where(and(eq(agents.id, agent_id), eq(agents.tenant_id, req.tenant.id)));
    
    if (!agent) return res.status(404).json({ message: 'Agent not found' });

    // Enforce campaign plan limits
    const [campaignCount] = await db.select({ count: count() }).from(campaigns).where(eq(campaigns.tenant_id, req.tenant.id));
    const campaignLimit = canCreateResource(campaignCount.count, req.tenant.plan, 'maxCampaigns');
    if (!campaignLimit.allowed) {
      return res.status(403).json({ message: campaignLimit.message, currentCount: campaignCount.count, limit: campaignLimit.limit });
    }

    try {
      const [campaign] = await db.insert(campaigns).values({
        tenant_id: req.tenant.id,
        agent_id,
        name,
        contacts: JSON.stringify(contacts),
        schedule: JSON.stringify(schedule || {}),
        status: 'draft'
      }).returning();

      res.status(201).json(campaign);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // === PHONE NUMBERS ===

  // === ThinkVoiceAGENT ROUTES ===
  // List agents (fetch from Bolna's /v2/agent/all) - tenant scoped
  app.get(api.bolna.agents.list.path, requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const agentsList = await bolnaService.listAgents(req.tenant.bolna_sub_account_id);
      res.json(agentsList || []);
    } catch (err: any) {
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  // Create agent
  app.post(api.bolna.agents.create.path, requireTenantUser, requireRole(['admin','manager']), async (req: AuthRequest, res: Response) => {
    try {
      const { agent_config, agent_prompts } = req.body;
      if (!agent_config || !agent_prompts) return res.status(400).json({ message: 'Missing agent_config or agent_prompts' });

      // Enforce same plan limits as tenant agent creation
      const [agentCount] = await db.select({ count: count() }).from(agents).where(eq(agents.tenant_id, req.tenant.id));
      const limitCheck = canCreateResource(agentCount.count, req.tenant.plan, 'maxAgents');
      if (!limitCheck.allowed) return res.status(403).json({ message: limitCheck.message, currentCount: agentCount.count, limit: limitCheck.limit });

      const payload = { agent_config, agent_prompts };
      const bolnaRes = await bolnaService.createAgent(req.tenant.bolna_sub_account_id, payload);
      const bolnaAgentId = bolnaRes?.agent_id || bolnaRes?.id;
      if (!bolnaAgentId) return res.status(500).json({ message: 'Failed to create agent in Bolna' });

      const [newAgent] = await db.insert(agents).values({
        tenant_id: req.tenant.id,
        user_id: req.user.id,
        bolna_agent_id: String(bolnaAgentId),
        agent_name: agent_config.agent_name,
        status: 'created',
        agent_config: JSON.stringify(agent_config),
        agent_prompts: JSON.stringify(agent_prompts),
      }).returning();

      res.status(201).json(newAgent);
    } catch (err: any) {
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  // Get agent details (fetch full agent object from Bolna)
  app.get(api.bolna.agents.get.path, requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const agentId = req.params.id;
      if (!agentId) return res.status(400).json({ message: 'Missing agent ID' });
      const agent = await bolnaService.getAgent(req.tenant.bolna_sub_account_id, agentId);
      res.json(agent);
    } catch (err: any) {
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  // Update agent
  app.put(api.bolna.agents.update.path, requireTenantUser, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
    try {
      const agentId = req.params.id;
      const { agent_config, agent_prompts } = req.body;
      if (!agent_config || !agent_prompts) return res.status(400).json({ message: 'Missing agent_config or agent_prompts' });

      const payload = { agent_config, agent_prompts };
      const result = await bolnaService.updateAgent(req.tenant.bolna_sub_account_id, agentId, payload);
      res.json(result);
    } catch (err: any) {
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  // Make a call via ThinkVoice(tenant-scoped)
  app.post(api.bolna.calls.make.path, requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const payload = req.body;
      if (!payload.agent_id || !payload.recipient_phone_number) {
        return res.status(400).json({ message: 'Missing agent_id or recipient_phone_number' });
      }
      const result = await bolnaService.makeCall(req.tenant.bolna_sub_account_id, payload);
      res.json(result);
    } catch (err: any) {
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  // Get agent executions from ThinkVoiceAPI
  app.get(api.bolna.agents.executions.path, requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const agentId = req.params.id;
      if (!agentId) return res.status(400).json({ message: 'Missing agent ID' });
      
      // Filter out undefined values and pass only defined parameters
      const queryParams: any = {};
      if (req.query.page_number) queryParams.page_number = parseInt(req.query.page_number as string);
      if (req.query.page_size) queryParams.page_size = parseInt(req.query.page_size as string);
      if (req.query.status && req.query.status !== 'all') queryParams.status = req.query.status as string;
      if (req.query.call_type && req.query.call_type !== 'all') queryParams.call_type = req.query.call_type as string;
      if (req.query.provider && req.query.provider !== 'all') queryParams.provider = req.query.provider as string;
      if (req.query.answered_by_voice_mail === 'true') queryParams.answered_by_voice_mail = true;
      if (req.query.answered_by_voice_mail === 'false') queryParams.answered_by_voice_mail = false;
      if (req.query.batch_id && req.query.batch_id !== 'all') queryParams.batch_id = req.query.batch_id as string;
      if (req.query.from) queryParams.from = req.query.from as string;
      if (req.query.to) queryParams.to = req.query.to as string;
      
      const executions = await bolnaService.fetchExecutions(agentId, req.tenant.bolna_sub_account_id, queryParams);
      res.json(executions || { data: [] });
    } catch (err: any) {
      console.error('[ROUTES] GET agent executions error', err?.message || err);
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  // Get batch executions from ThinkVoiceAPI
  app.get('/api/bolna/batches/:id/executions', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const batchId = req.params.id;
      if (!batchId) return res.status(400).json({ message: 'Missing batch ID' });
      
      const executions = await bolnaService.fetchBatchExecutions(batchId, req.tenant.bolna_sub_account_id);
      res.json(executions || []);
    } catch (err: any) {
      console.error('[ROUTES] GET batch executions error', err?.message || err);
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  // Get all batches for a specific agent
  app.get('/api/bolna/agents/:id/batches', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const agentId = req.params.id;
      if (!agentId) return res.status(400).json({ message: 'Missing agent ID' });
      
      const batches = await bolnaService.listAgentBatches(agentId, req.tenant.bolna_sub_account_id);
      res.json(batches || []);
    } catch (err: any) {
      console.error('[ROUTES] GET agent batches error', err?.message || err);
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  // Create batch for agent
  (async () => {
    try {
      const multerModule = (await import('multer')) as any;
      const mm = multerModule.default || multerModule;
      const upload = mm({ storage: mm.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

      app.post(api.bolna.agents.createBatch.path, requireTenantUser, upload.single('file'), async (req: AuthRequest, res: Response) => {
        try {
          const { agent_id, from_phone_number, retry_config, webhook_url } = req.body;
          if (!agent_id) return res.status(400).json({ message: 'Missing agent_id' });
          if (!(req as any).file) return res.status(400).json({ message: 'Missing CSV file' });
          
          const f = (req as any).file;
          const payload: any = {
            agent_id,
            file: { buffer: f.buffer, filename: f.originalname }
          };
          if (from_phone_number) payload.from_phone_number = from_phone_number;
          if (retry_config) payload.retry_config = retry_config;
          if (webhook_url) payload.webhook_url = webhook_url;
          
          const result = await bolnaService.createBatch(req.tenant.bolna_sub_account_id, payload);
          res.json(result);
        } catch (err: any) {
          console.error('[ROUTES] POST create batch error', err?.message || err);
          res.status(err?.status || 400).json({ message: err?.message || String(err) });
        }
      });
    } catch (e) {
      console.warn('[ROUTES] multer not installed — batch creation will not work');
    }
  })();

  // Schedule an existing batch
  app.post('/api/bolna/batches/:id/schedule', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const batchId = req.params.id;
      let { scheduled_at, bypass_call_guardrails } = req.body as { scheduled_at?: string; bypass_call_guardrails?: boolean };
      if (!batchId) return res.status(400).json({ message: 'Missing batch id' });
      if (!scheduled_at) return res.status(400).json({ message: 'Missing scheduled_at' });

      // Normalize ISO: replace trailing Z with +00:00 and strip milliseconds if present
      if (typeof scheduled_at === 'string') {
        if (/Z$/.test(scheduled_at)) {
          scheduled_at = scheduled_at.replace(/\.\d{3}Z$/, '+00:00');
        } else {
          // strip fractional seconds like .123 only if present before timezone or EOL
          scheduled_at = scheduled_at.replace(/\.(\d+)(?=(?:[+-]\d{2}:\d{2}|$))/, '');
        }
      }

      const result = await bolnaService.scheduleBatch(req.tenant.bolna_sub_account_id, batchId, { scheduled_at, bypass_call_guardrails });
      res.json(result || { message: 'scheduled' });
    } catch (err: any) {
      console.error('[ROUTES] POST schedule batch error', err?.message || err);
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  // Stop a batch
  app.post('/api/bolna/batches/:id/stop', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const batchId = req.params.id;
      if (!batchId) return res.status(400).json({ message: 'Missing batch id' });

      const result = await bolnaService.stopBatch(req.tenant.bolna_sub_account_id, batchId);
      res.json(result || { message: 'stopped' });
    } catch (err: any) {
      console.error('[ROUTES] POST stop batch error', err?.message || err);
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  // Download batch file
  app.get('/api/bolna/batches/:id/download', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const batchId = req.params.id;
      if (!batchId) return res.status(400).json({ message: 'Missing batch id' });

      const result = await bolnaService.downloadBatch(req.tenant.bolna_sub_account_id, batchId);
      
      if (result && result.buffer) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="batch-${batchId}.csv"`);
        res.send(result.buffer);
      } else {
        res.status(404).json({ message: 'Batch file not available' });
      }
    } catch (err: any) {
      console.error('[ROUTES] GET download batch error', err?.message || err);
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  // Delete a batch
  app.delete('/api/bolna/batches/:id', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const batchId = req.params.id;
      if (!batchId) return res.status(400).json({ message: 'Missing batch id' });

      const result = await bolnaService.deleteBatch(req.tenant.bolna_sub_account_id, batchId);
      res.json(result || { message: 'deleted' });
    } catch (err: any) {
      console.error('[ROUTES] DELETE batch error', err?.message || err);
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  // Get execution logs from ThinkVoiceAPI
  app.get('/api/bolna/executions/:id/log', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const executionId = req.params.id;
      if (!executionId) return res.status(400).json({ message: 'Missing execution ID' });
      
      const logs = await bolnaService.getExecutionLogs(executionId, req.tenant.bolna_sub_account_id);
      res.json(logs || { data: [] });
    } catch (err: any) {
      console.error('[ROUTES] GET execution logs error', err?.message || err);
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  // Get single execution from ThinkVoiceAPI
  app.get(api.bolna.executions.get.path, requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const executionId = req.params.id;
      const agentId = req.query.agent_id as string;
      
      if (!executionId) return res.status(400).json({ message: 'Missing execution ID' });
      if (!agentId) return res.status(400).json({ message: 'Missing agent_id query parameter' });
      
      const execution = await bolnaService.getExecution(agentId, executionId, req.tenant.bolna_sub_account_id);
      if (!execution) return res.status(404).json({ message: 'Execution not found' });
      
      res.json(execution);
    } catch (err: any) {
      console.error('[ROUTES] GET execution error', err?.message || err);
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  // List all executions from ThinkVoiceAPI - NOT SUPPORTED by ThinkVoiceAPI
  // ThinkVoiceonly supports /v2/agent/{agent_id}/executions, not a global executions endpoint
  app.get(api.bolna.executions.list.path, requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      // Since ThinkVoicedoesn't support listing all executions, we return empty data
      // Users must select a specific agent to see executions
      res.json({ data: [], message: 'Please select a specific agent to view executions' });
    } catch (err: any) {
      console.error('[ROUTES] GET all executions error', err?.message || err);
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  // Expose model list and voices from Bolna
  app.get(api.bolna.knowledgebase.models.list.path, requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const models = await bolnaService.getModels(req.tenant.bolna_sub_account_id);
      res.json(models || {});
    } catch (err: any) {
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  app.get('/api/user/model/all', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const models = await bolnaService.getModels(req.tenant.bolna_sub_account_id);
      res.json(models || {});
    } catch (err: any) {
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  app.get('/api/bolna/voices', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const voices = await bolnaService.getVoices(req.tenant.bolna_sub_account_id);
      res.json(voices || []);
    } catch (err: any) {
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  app.post('/api/bolna/models/custom', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const { custom_model_name, custom_model_url } = req.body;
      if (!custom_model_name || !custom_model_url) {
        return res.status(400).json({ message: 'Missing required fields: custom_model_name and custom_model_url' });
      }
      console.log('[ROUTES] Adding custom model:', { custom_model_name, custom_model_url });
      const result = await bolnaService.addCustomModel(req.tenant.bolna_sub_account_id, { custom_model_name, custom_model_url });
      console.log('[ROUTES] Custom model added:', result);
      res.json(result);
    } catch (err: any) {
      console.error('[ROUTES] Add custom model error:', err?.message || err);
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  app.post('/api/bolna/inbound/setup', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const { agent_id, phone_number_id, ivr_config } = req.body;
      if (!agent_id || !phone_number_id) {
        return res.status(400).json({ message: 'Missing required fields: agent_id and phone_number_id' });
      }
      const result = await bolnaService.setupInboundAgent(req.tenant.bolna_sub_account_id, { agent_id, phone_number_id, ivr_config });
      res.json(result);
    } catch (err: any) {
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  app.post('/api/bolna/inbound/unlink', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const { phone_number_id } = req.body;
      if (!phone_number_id) {
        return res.status(400).json({ message: 'Missing required field: phone_number_id' });
      }
      const result = await bolnaService.unlinkInboundAgent(req.tenant.bolna_sub_account_id, { phone_number_id });
      res.json(result);
    } catch (err: any) {
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  app.get('/me/voices', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const voices = await bolnaService.getVoices(req.tenant.bolna_sub_account_id);
      res.json(voices || []);
    } catch (err: any) {
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  app.get(api.bolna.phoneNumbers.list.path, requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const phoneNumbers = await bolnaService.listPhoneNumbers(req.tenant.bolna_sub_account_id);
      res.json(phoneNumbers || []);
    } catch (err: any) {
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  app.post('/api/bolna/phone-numbers/buy', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const { country, phone_number } = req.body;
      if (!country || !phone_number) {
        return res.status(400).json({ message: 'Missing required fields: country and phone_number' });
      }
      const result = await bolnaService.buyPhoneNumber(req.tenant.bolna_sub_account_id, { country, phone_number });
      res.json(result);
    } catch (err: any) {
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  app.get('/api/bolna/phone-numbers/search', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const country = req.query.country as string;
      const pattern = req.query.pattern as string | undefined;
      if (!country) {
        return res.status(400).json({ message: 'Missing required parameter: country' });
      }
      const results = await bolnaService.searchPhoneNumbers(req.tenant.bolna_sub_account_id, { country, pattern });
      res.json(results || []);
    } catch (err: any) {
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  app.get(api.bolna.phoneNumbers.voices.path, requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const voices = await bolnaService.getVoices(req.tenant.bolna_sub_account_id);
      res.json(voices || []);
    } catch (err: any) {
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  app.get('/knowledgebase/all', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const kbs = await bolnaService.getKnowledgebases(req.tenant.bolna_sub_account_id);
      res.json(kbs || []);
    } catch (err: any) {
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  app.get('/api/knowledgebase/all', requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const kbs = await bolnaService.getKnowledgebases(req.tenant.bolna_sub_account_id);
      res.json(kbs || []);
    } catch (err: any) {
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  // Backwards-compatible alias expected by frontend: GET /api/bolna/knowledgebase
  app.get(api.bolna.knowledgebase.list.path, requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const kbs = await bolnaService.getKnowledgebases(req.tenant.bolna_sub_account_id);
      res.json(kbs || []);
    } catch (err: any) {
      console.error('[ROUTES] GET', api.bolna.knowledgebase.list.path, 'error', err?.message || err);
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });

  // Proxy create (url/file) to ThinkVoice- uses multer if installed as before
  (async () => {
    try {
      // @ts-ignore: optional dependency
      const multerModule = (await import('multer')) as any;
      const mm = multerModule.default || multerModule;
      const upload = mm({ storage: mm.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

      app.post(api.bolna.knowledgebase.create.path, requireTenantUser, upload.single('file'), async (req: AuthRequest, res: Response) => {
        try {
          console.log('[ROUTES] Knowledge base creation request:', { hasFile: !!(req as any).file, hasUrl: !!req.body?.url, body: req.body });
          
          const rawUrl = req.body && req.body.url ? String(req.body.url).trim() : '';
          if (rawUrl.length > 0) {
            const payload = {
              url: rawUrl,
              knowledgebase_name: req.body.knowledgebase_name,
              chunk_size: req.body.chunk_size,
              similarity_top_k: req.body.similarity_top_k,
              overlapping: req.body.overlapping
            };
            console.log('[ROUTES] Creating KB with URL payload:', payload);
            const created = await bolnaService.createKnowledgebase(req.tenant.bolna_sub_account_id, payload as any);
            console.log('[ROUTES] KB created successfully:', created);
            res.json(created);
            return;
          }

          if ((req as any).file) {
            const f = (req as any).file;
            const payload = { 
              file: { buffer: f.buffer, filename: f.originalname },
              knowledgebase_name: req.body.knowledgebase_name
            };
            console.log('[ROUTES] Creating KB with file:', f.originalname, 'name:', req.body.knowledgebase_name);
            const created = await bolnaService.createKnowledgebase(req.tenant.bolna_sub_account_id, payload);
            console.log('[ROUTES] KB created successfully:', created);
            res.json(created);
            return;
          }

          console.log('[ROUTES] No file or URL provided');
          res.status(400).json({ message: "Must provide either 'file' or 'url' parameter" });
        } catch (err: any) {
          console.error('[ROUTES]', api.bolna.knowledgebase.create.path, 'error', err?.message || err, err?.stack);
          res.status(err?.status || 400).json({ message: err?.message || String(err) });
        }
      });

    console.log('[ROUTES] multer loaded — /api/bolna/knowledgebase supports file uploads');
    } catch (e) {
      console.warn('[ROUTES] multer not installed — /api/bolna/knowledgebase will accept only JSON url payloads');

      app.post(api.bolna.knowledgebase.create.path, requireTenantUser, async (req: AuthRequest, res: Response) => {
        try {
          console.log('[ROUTES] Knowledge base creation request (no multer):', { hasUrl: !!req.body?.url, body: req.body });
          
          if (req.body && req.body.url) {
            const payload = {
              url: req.body.url,
              knowledgebase_name: req.body.knowledgebase_name,
              chunk_size: req.body.chunk_size,
              similarity_top_k: req.body.similarity_top_k,
              overlapping: req.body.overlapping
            };
            console.log('[ROUTES] Creating KB with URL payload:', payload);
            const created = await bolnaService.createKnowledgebase(req.tenant.bolna_sub_account_id, payload as any);
            console.log('[ROUTES] KB created successfully:', created);
            res.json(created);
            return;
          }

          console.log('[ROUTES] No URL provided');
          res.status(400).json({ message: "Must provide either 'file' or 'url' parameter" });
        } catch (err: any) {
          console.error('[ROUTES]', api.bolna.knowledgebase.create.path, 'error', err?.message || err, err?.stack);
          res.status(err?.status || 400).json({ message: err?.message || String(err) });
        }
      });
    }
  })();

  // Delete knowledgebase
  app.delete(api.bolna.knowledgebase.delete.path, requireTenantUser, async (req: AuthRequest, res: Response) => {
    try {
      const ragId = req.params.id;
      if (!ragId) return res.status(400).json({ message: 'Missing knowledgebase ID' });
      
      const result = await bolnaService.deleteKnowledgebase(req.tenant.bolna_sub_account_id, ragId);
      res.json(result || { message: 'Knowledgebase deleted successfully' });
    } catch (err: any) {
      console.error('[ROUTES] DELETE', api.bolna.knowledgebase.delete.path, 'error', err?.message || err);
      res.status(err?.status || 400).json({ message: err?.message || String(err) });
    }
  });
  
  // List tenant phone numbers
  app.get('/api/tenant/phone-numbers', requireTenantUser, async (req: AuthRequest, res: Response) => {
    const phoneList = await db.select().from(phoneNumbers)
      .where(eq(phoneNumbers.tenant_id, req.tenant.id));
    res.json(phoneList);
  });

  // Create phone number (admin/manager only)
  app.post('/api/tenant/phone-numbers', requireTenantUser, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
    try {
      const { bolna_phone_id, phone_number } = req.body;
      if (!phone_number) return res.status(400).json({ message: 'Missing phone_number' });

      // Enforce phone number limits
      const [phoneCount] = await db.select({ count: count() }).from(phoneNumbers).where(eq(phoneNumbers.tenant_id, req.tenant.id));
      const limitCheck = canCreateResource(phoneCount.count, req.tenant.plan, 'maxPhoneNumbers');
      if (!limitCheck.allowed) {
        return res.status(403).json({ message: limitCheck.message, currentCount: phoneCount.count, limit: limitCheck.limit });
      }

      // In real implementation we would call bolnaService to buy/provision the number
      const [newPhone] = await db.insert(phoneNumbers).values({
        tenant_id: req.tenant.id,
        bolna_phone_id: bolna_phone_id || null,
        phone_number,
        status: 'active'
      }).returning();

      res.status(201).json(newPhone);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // === EXECUTIONS/CALL LOGS ===
  
  // List tenant executions
  app.get('/api/tenant/executions', requireTenantUser, async (req: AuthRequest, res: Response) => {
    const executionList = await db.select({
      execution: executions,
      agent: agents
    })
    .from(executions)
    .innerJoin(agents, eq(executions.agent_id, agents.id))
    .where(eq(executions.tenant_id, req.tenant.id))
    .orderBy(desc(executions.created_at));

    res.json(executionList);
  });
}
