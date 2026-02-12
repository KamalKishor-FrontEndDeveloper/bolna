import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, Users, Activity, Save, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { useApiKey } from '@/hooks/use-api-keys';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface Tenant {
  id: number;
  name: string;
  slug: string;
  plan: string;
  status: string;
  created_at: string;
  settings?: any;
}

interface TenantUsage {
  tenant: Tenant;
  usage: {
    users: { current: number; limit: number };
    agents: { current: number; limit: number };
    phoneNumbers: { current: number; limit: number };
    campaigns: { current: number; limit: number };
    executions: { current: number; limit: number };
  };
  planLimits: any;
}

export default function SuperAdminDashboard() {
  const { token, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: '',
    slug: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    plan: 'starter',
    sub_account_id: ''
  });

  // ThinkVoiceAPI Key management (super-admin)
  const { hasKey, saveKey, isLoading: isKeyLoading } = useApiKey();
  const [key, setKey] = useState('');
  const handleKeySave = () => {
    if (!key.trim()) return;
    saveKey.mutate(key, { onSuccess: () => setKey('') });
  }; 

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/super-admin/tenants', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const { toast } = useToast();

  const createTenant = async () => {
    try {
      const response = await fetch('/api/super-admin/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newTenant)
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setShowCreateDialog(false);
        setNewTenant({
          name: '',
          slug: '',
          admin_name: '',
          admin_email: '',
          admin_password: '',
          plan: 'starter',
          sub_account_id: ''
        });
        fetchTenants();

        if (data?.tenant?.settings?.pending_subaccount) {
          toast({
            title: 'Tenant created (sub-account pending)',
            description: 'ThinkVoicesub-account creation is restricted on your ThinkVoiceaccount. You provided a placeholder or one was generated. Attach a real sub-account ID later via Manage → Attach Sub-Account.'
          });
        } else {
          toast({ title: 'Tenant created', description: 'Tenant successfully created.' });
        }
      } else {
        toast({ title: 'Failed', description: data?.message || 'Failed to create tenant', variant: 'destructive' });
      }
    } catch (error: any) {
      console.error('Failed to create tenant:', error);
      toast({ title: 'Failed', description: error?.message || 'Failed to create tenant', variant: 'destructive' });
    }
  };

  const [attachSubValue, setAttachSubValue] = useState('');

  const impersonate = async (tenantId: number) => {
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenantId}/impersonate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Failed', description: data?.message || 'Failed to impersonate', variant: 'destructive' });
        return;
      }

      // Save current token, swap to impersonation token and reload
      const current = localStorage.getItem('token');
      if (current) localStorage.setItem('prev_token', current);
      localStorage.setItem('token', data.token);
      toast({ title: 'Impersonating', description: `You are now impersonating ${data.user.name}` });
      // Redirect to tenant-prefixed dashboard for clarity
      if (data?.tenant?.slug) {
        window.location.href = `/t/${data.tenant.slug}`;
      } else {
        window.location.href = '/';
      }
    } catch (err: any) {
      toast({ title: 'Failed', description: err?.message || 'Failed to impersonate', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Building2 className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
            </div>
            <Button onClick={logout} variant="outline">Logout</Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tenants.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tenants.filter(t => t.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enterprise Plans</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tenants.filter(t => t.plan === 'enterprise').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* API Key management (super-admin) */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-slate-100 rounded-lg"><Lock className="w-5 h-5 text-slate-700" /></div>
              <CardTitle>ThinkVoiceAPI Key</CardTitle>
            </div>
            <CardDescription>Manage the global ThinkVoiceAPI Key used to proxy ThinkVoicerequests for tenants.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="md:col-span-2">
                <Input
                  type="password"
                  placeholder="bn-..."
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="flex items-center gap-4">
                <Button onClick={handleKeySave} disabled={saveKey.isPending || !key.trim()}>
                  {saveKey.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Save</>
                  )}
                </Button>

                <div className={`p-1 rounded-full ${isKeyLoading ? 'bg-yellow-100 text-yellow-600' : hasKey ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {isKeyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-500">{isKeyLoading ? "Checking connection..." : hasKey ? "Connected to Bolna" : "Not Connected"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Tenants</CardTitle>
                <CardDescription>Manage all tenant accounts</CardDescription>
              </div>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Tenant
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Tenant</DialogTitle>
                    <DialogDescription>
                      Create a new tenant account with admin user
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        placeholder="Company Name"
                        value={newTenant.name}
                        onChange={(e) => setNewTenant({...newTenant, name: e.target.value})}
                      />
                      <Input
                        placeholder="Slug (e.g., company-name)"
                        value={newTenant.slug}
                        onChange={(e) => setNewTenant({...newTenant, slug: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        placeholder="Admin Name"
                        value={newTenant.admin_name}
                        onChange={(e) => setNewTenant({...newTenant, admin_name: e.target.value})}
                      />
                      <Input
                        type="email"
                        placeholder="Admin Email"
                        value={newTenant.admin_email}
                        onChange={(e) => setNewTenant({...newTenant, admin_email: e.target.value})}
                      />
                    </div>
                    <Input
                      type="password"
                      placeholder="Admin Password"
                      value={newTenant.admin_password}
                      onChange={(e) => setNewTenant({...newTenant, admin_password: e.target.value})}
                    />

                    <Input
                      placeholder="ThinkVoiceSub-Account ID (optional)"
                      value={(newTenant as any).sub_account_id || ''}
                      onChange={(e) => setNewTenant({...newTenant, sub_account_id: e.target.value})}
                    />
                    <p className="text-xs text-slate-500">If your ThinkVoiceaccount cannot create sub-accounts programmatically, paste an existing sub-account ID here.</p>

                    <Select value={newTenant.plan} onValueChange={(value) => setNewTenant({...newTenant, plan: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={createTenant} className="w-full">
                      Create Tenant
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>{tenant.slug}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{tenant.plan}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(tenant.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setLocation(`/super-admin/tenants/${tenant.id}`)}
                      >
                        Manage
                      </Button>
                      <Button className="ml-2" size="sm" onClick={() => {
                        const ok = window.confirm(`Impersonate tenant ${tenant.name}? You will act as a tenant admin until you stop impersonation.`);
                        if (!ok) return;
                        impersonate(tenant.id);
                      }}>
                        Impersonate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}