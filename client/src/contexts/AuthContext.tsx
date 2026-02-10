import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  role?: 'admin' | 'manager' | 'agent'; // Optional for super admin
}

interface Tenant {
  id: number;
  name: string;
  slug: string;
  plan: 'starter' | 'pro' | 'enterprise';
}

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  isSuperAdmin: boolean;
  isImpersonating: boolean;
  impersonatorId: number | null;
  login: (email: string, password: string) => Promise<void>;
  loginSuperAdmin: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: string[]) => boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatorId, setImpersonatorId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Safely access localStorage after component mounts
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchUserInfo();
    }
  }, [token]);

  function decodeTokenType(tkn: string | null): string | null {
    if (!tkn) return null;
    try {
      const parts = tkn.split('.');
      if (parts.length < 2) return null;
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(payload));
      return decoded.type || null;
    } catch (e) {
      return null;
    }
  }

  const fetchUserInfo = async () => {
    try {
      console.log('Fetching user info with token:', token?.substring(0, 20) + '...');
      const tokenType = decodeTokenType(token);
      console.log('Decoded token type:', tokenType);

      // Detect impersonation claim
      if (!token) {
        setIsImpersonating(false);
        setImpersonatorId(null);
      } else {
        try {
          const parts = token.split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (payload?.impersonation) {
              setIsImpersonating(true);
              setImpersonatorId(payload?.impersonator_id || null);
            } else {
              setIsImpersonating(false);
              setImpersonatorId(null);
            }
          }
        } catch (e) {
          setIsImpersonating(false);
          setImpersonatorId(null);
        }
      }

      // If token explicitly indicates super admin or tenant_user, call the specific endpoint
      if (tokenType === 'super_admin') {
        const res = await fetch('/api/super-admin/me', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setUser(data.admin);
          setTenant(null);
          setIsSuperAdmin(true);
          return;
        } else {
          console.warn('Super admin token rejected, logging out');
          logout();
          return;
        }
      }

      if (tokenType === 'tenant_user') {
        const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setTenant(data.tenant);
          setIsSuperAdmin(false);
          return;
        } else {
          console.warn('Tenant token rejected, logging out');
          logout();
          return;
        }
      }

      // Fallback: try tenant first, then super-admin
      const tenantRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      if (tenantRes.ok) {
        const data = await tenantRes.json();
        setUser(data.user);
        setTenant(data.tenant);
        setIsSuperAdmin(false);
        return;
      }

      const superRes = await fetch('/api/super-admin/me', { headers: { Authorization: `Bearer ${token}` } });
      if (superRes.ok) {
        const data = await superRes.json();
        setUser(data.admin);
        setTenant(null);
        setIsSuperAdmin(true);
        return;
      }

      console.log('No valid session found, logging out');
      logout();
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      let errorMessage = 'Login failed';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        // Ignore JSON parsing errors, use default message
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    setToken(data.token); // This will trigger fetchUserInfo via useEffect
  };

  const loginSuperAdmin = async (email: string, password: string) => {
    const response = await fetch('/api/super-admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      let errorMessage = 'Login failed';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        // Ignore JSON parsing errors, use default message
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    setToken(data.token); // This will trigger fetchUserInfo via useEffect
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setTenant(null);
    setIsSuperAdmin(false);
    localStorage.removeItem('token');
  };

  const hasRole = (roles: string[]) => {
    return user && user.role ? roles.includes(user.role) : false;
  };

  return (
    <AuthContext.Provider value={{
      user,
      tenant,
      token,
      isSuperAdmin,
      isImpersonating,
      impersonatorId,
      login,
      loginSuperAdmin,
      logout,
      hasRole,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}