import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useLocation } from 'wouter';

export default function LoginPage() {
  const { login, loginSuperAdmin } = useAuth();
  const [location, setLocation] = useLocation();
  const [tenantSlug, setTenantSlug] = useState('');

  // Prefill tenant slug when visiting /t/:slug paths
  useEffect(() => {
    const match = location.match(/^\/t\/([^\/]+)/);
    if (match) setTenantSlug(match[1]);
  }, [location]);
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPassword, setTenantPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTenantLogin = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      if (tenantSlug && tenantSlug.trim().length > 0) {
        console.log('[FRONTEND] Tenant-scoped login using slug:', tenantSlug);
        const res = await fetch(`/api/tenants/${encodeURIComponent(tenantSlug.trim())}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: tenantEmail, password: tenantPassword })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: 'Login failed' }));
          throw new Error(err.message || 'Login failed');
        }

        const data = await res.json();
        localStorage.setItem('token', data.token);
      } else {
        console.log('[FRONTEND] Calling tenant login (global) with:', tenantEmail);
        await login(tenantEmail, tenantPassword);
      }

      setLocation('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('[FRONTEND] Calling super admin login with:', adminEmail);
      await loginSuperAdmin(adminEmail, adminPassword);
      setLocation('/super-admin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Bolna SaaS</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tenant" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tenant">Tenant Login</TabsTrigger>
              <TabsTrigger value="admin">Super Admin</TabsTrigger>
            </TabsList>
            
            <TabsContent value="tenant" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Input
                    placeholder="Tenant Slug (optional)"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={tenantEmail}
                    onChange={(e) => setTenantEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={tenantPassword}
                    onChange={(e) => setTenantPassword(e.target.value)}
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button 
                  className="w-full" 
                  onClick={handleTenantLogin}
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="admin" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Super Admin Email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button 
                  className="w-full" 
                  onClick={handleAdminLogin}
                  disabled={isLoading}
                  variant="secondary"
                >
                  {isLoading ? 'Signing in...' : 'Super Admin Login'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}