import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, Users, Activity, Save, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { useApiKey } from '@/hooks/use-api-keys';

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
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantUsage | null>(null);
  const [managementLoading, setManagementLoading] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: '',
    slug: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    plan: 'starter',
    sub_account_id: ''
  });

  // Bolna API Key management (super-admin)
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
            description: 'Bolna sub-account creation is restricted on your Bolna account. You provided a placeholder or one was generated. Attach a real sub-account ID later via Manage → Attach Sub-Account.'
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

  const manageTenant = async (tenantId: number) => {
    setManagementLoading(true);
    try {
      const response = await fetch(`/api/super-admin/tenants/${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedTenant(data);
        setAttachSubValue(data.tenant.bolna_sub_account_id || '');
        setShowManageDialog(true);
      }
    } catch (error) {
      console.error('Failed to fetch tenant details:', error);
    } finally {
      setManagementLoading(false);
    }
  };

  const attachSubAccount = async (tenantId: number, subAccountId: string) => {
    try {
      const response = await fetch(`/api/super-admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sub_account_id: subAccountId })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        toast({ title: 'Sub-account attached', description: 'Sub-account attached to tenant.' });
        fetchTenants();
        manageTenant(tenantId);
      } else {
        toast({ title: 'Failed', description: data?.message || 'Failed to attach sub-account', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Failed', description: err?.message || 'Failed to attach sub-account', variant: 'destructive' });
    }
  };

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

  const updateTenantPlan = async (tenantId: number, plan: string) => {
    try {
      const response = await fetch(`/api/super-admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan })
      });

      if (response.ok) {
        fetchTenants();
        manageTenant(tenantId); // Refresh tenant details
      }
    } catch (error) {
      console.error('Failed to update tenant:', error);
    }
  };

  const updateTenantStatus = async (tenantId: number, status: string) => {
    try {
      const response = await fetch(`/api/super-admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchTenants();
        manageTenant(tenantId); // Refresh tenant details
      }
    } catch (error) {
      console.error('Failed to update tenant:', error);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
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
              <CardTitle>Bolna API Key</CardTitle>
            </div>
            <CardDescription>Manage the global Bolna API Key used to proxy Bolna requests for tenants.</CardDescription>
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
                      placeholder="Bolna Sub-Account ID (optional)"
                      value={(newTenant as any).sub_account_id || ''}
                      onChange={(e) => setNewTenant({...newTenant, sub_account_id: e.target.value})}
                    />
                    <p className="text-xs text-slate-500">If your Bolna account cannot create sub-accounts programmatically, paste an existing sub-account ID here.</p>

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
                        onClick={() => manageTenant(tenant.id)}
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
                      {/* Open Dashboard now performs impersonation; removed to avoid duplication. */}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Tenant Management Dialog */}
        <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Tenant: {selectedTenant?.tenant.name}</DialogTitle>
              <DialogDescription>
                View usage statistics and manage tenant settings
              </DialogDescription>
            </DialogHeader>
            
            {selectedTenant && (
              <div className="space-y-6">
                {/* Tenant Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Company</label>
                    <p className="text-lg">{selectedTenant.tenant.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Slug</label>
                    <p className="text-lg">{selectedTenant.tenant.slug}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={() => {
                    const ok = window.confirm(`Impersonate tenant ${selectedTenant.tenant.name}? You will act as a tenant admin until you stop impersonation.`);
                    if (!ok) return;
                    impersonate(selectedTenant.tenant.id);
                  }}>
                    Impersonate
                  </Button>
                </div>

                {/* Plan Management */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Plan</label>
                  <Select 
                    value={selectedTenant.tenant.plan} 
                    onValueChange={(value) => updateTenantPlan(selectedTenant.tenant.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Management */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select 
                    value={selectedTenant.tenant.status} 
                    onValueChange={(value) => updateTenantStatus(selectedTenant.tenant.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Attach / Manage Bolna Sub-Account */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Bolna Sub-Account</label>
                  <div className="flex gap-3">
                    <Input value={attachSubValue} onChange={(e) => setAttachSubValue(e.target.value)} placeholder="Sub-Account ID" />
                    <Button onClick={() => attachSubAccount(selectedTenant.tenant.id, attachSubValue)}>Attach</Button>
                  </div>

                  {selectedTenant.tenant.settings?.pending_subaccount && (
                    <div className="mt-2 text-sm text-yellow-700">This tenant has a pending sub-account. Attach a real sub-account ID when available.</div>
                  )}
                </div>

                {/* Usage Statistics */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Usage Statistics</h3>
                  <div className="space-y-3">
                    {Object.entries(selectedTenant.usage).map(([key, value]) => {
                      const percentage = value.limit === -1 ? 0 : (value.current / value.limit) * 100;
                      const isNearLimit = percentage > 80 && value.limit !== -1;
                      const isAtLimit = value.current >= value.limit && value.limit !== -1;
                      
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span className={isAtLimit ? 'text-red-600 font-semibold' : isNearLimit ? 'text-yellow-600' : ''}>
                              {value.current} / {value.limit === -1 ? '∞' : value.limit}
                            </span>
                          </div>
                          {value.limit !== -1 && (
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${isAtLimit ? 'bg-red-600' : isNearLimit ? 'bg-yellow-500' : 'bg-blue-600'}`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Alerts */}
                {Object.entries(selectedTenant.usage).some(([_, v]) => v.current >= v.limit && v.limit !== -1) && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      This tenant has reached one or more plan limits. Consider upgrading their plan.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}