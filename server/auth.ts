import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { eq, and } from 'drizzle-orm';
import { users, tenants, superAdmins } from '@shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthRequest extends Request {
  user?: any;
  tenant?: any;
  isSuperAdmin?: boolean;
}

export function generateToken(payload: any): string {
  return jwt.sign(payload, JWT_SECRET as any, { expiresIn: '7d' });
}

// Use for short-lived tokens such as impersonation (e.g., 15 minutes)
export function generateShortToken(payload: any, expiresIn = '15m'): string {
  return jwt.sign(payload, JWT_SECRET as any, ({ expiresIn } as any));
} 

export function verifyToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Super Admin Auth Middleware
export async function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = verifyToken(token);
    if (decoded.type !== 'super_admin') return res.status(401).json({ message: 'Super admin access required' });

    const [admin] = await db.select().from(superAdmins).where(eq(superAdmins.id, decoded.id));
    if (!admin) return res.status(401).json({ message: 'Super admin not found' });

    req.user = admin;
    req.isSuperAdmin = true;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}

// Tenant User Auth Middleware
export async function requireTenantUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('[AUTH] Token received:', token ? 'YES' : 'NO');
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = verifyToken(token);
    console.log('[AUTH] Decoded token:', decoded);
    if (decoded.type !== 'tenant_user' && !decoded.tenant_id) {
      console.log('[AUTH] Wrong token type:', decoded.type);
      return res.status(401).json({ message: 'Tenant access required' });
    }

    const [user] = await db.select({
      user: users,
      tenant: tenants
    })
    .from(users)
    .innerJoin(tenants, eq(users.tenant_id, tenants.id))
    .where(and(eq(users.id, decoded.id), eq(users.status, 'active')));

    console.log('[AUTH] User found:', user ? 'YES' : 'NO');
    if (!user) return res.status(401).json({ message: 'User not found or inactive' });
    if (user.tenant.status !== 'active') return res.status(401).json({ message: 'Tenant suspended' });

    req.user = user.user;
    req.tenant = user.tenant;
    console.log('[AUTH] Success for user:', user.user.email);
    next();
  } catch (error) {
    console.log('[AUTH] Error:', String((error as any)?.message || error));
    res.status(401).json({ message: 'Invalid token' });
  }
}

// Role-based access control
export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Insufficient permissions' });
    next();
  };
}