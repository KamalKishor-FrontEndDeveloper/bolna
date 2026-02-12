import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Building2, Users, Activity, Save, BarChart3, Edit, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function ManageTenant() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { token } = useAuth();
  const { toast } = useToast();
  const [tenant, setTenant] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [attachSubValue, setAttachSubValue] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    fetchTenantData();
  }, [id]);

  const fetchTenantData = async () => {
    try {
      const [tenantRes, usersRes] = await Promise.all([
        fetch(`/api/super-admin/tenants/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/super-admin/tenants/${id}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (tenantRes.ok) {
        const data = await tenantRes.json();
        setTenant(data);
        setAttachSubValue(data.tenant.bolna_sub_account_id || '');
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Failed to fetch tenant data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTenantPlan = async (plan: string) => {
    try {
      const response = await fetch(`/api/super-admin/tenants/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan })
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Plan updated successfully' });
        fetchTenantData();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update plan', variant: 'destructive' });
    }
  };

  const updateTenantStatus = async (status: string) => {
    try {
      const response = await fetch(`/api/super-admin/tenants/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Status updated successfully' });
        fetchTenantData();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const attachSubAccount = async () => {
    try {
      const response = await fetch(`/api/super-admin/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sub_account_id: attachSubValue })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        toast({ title: 'Success', description: 'Sub-account attached successfully' });
        fetchTenantData();
      } else {
        toast({ title: 'Error', description: data?.message || 'Failed to attach sub-account', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to attach sub-account', variant: 'destructive' });
    }
  };

  const impersonate = async () => {
    try {
      const res = await fetch(`/api/super-admin/tenants/${id}/impersonate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Error', description: data?.message || 'Failed to impersonate', variant: 'destructive' });
        return;
      }

      const current = localStorage.getItem('token');
      if (current) localStorage.setItem('prev_token', current);
      localStorage.setItem('token', data.token);
      toast({ title: 'Impersonating', description: `You are now impersonating ${data.user.name}` });
      
      if (data?.tenant?.slug) {
        window.location.href = `/t/${data.tenant.slug}`;
      } else {
        window.location.href = '/';
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to impersonate', variant: 'destructive' });
    }
  };

  const openEditDialog = (user: any) => {
    setEditingUser({ ...user });
    setShowEditDialog(true);
  };

  const updateUser = async () => {
    try {
      const response = await fetch(`/api/super-admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editingUser.name,
          email: editingUser.email,
          role: editingUser.role,
          status: editingUser.status
        })
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'User updated successfully' });
        setShowEditDialog(false);
        fetchTenantData();
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data?.message || 'Failed to update user', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update user', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading tenant details..." subtitle="Please wait while we fetch the information" />;
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Tenant not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4 space-x-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation('/super-admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Building2 className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Manage Tenant: {tenant.tenant.name}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">
              <Building2 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="usage">
              <BarChart3 className="h-4 w-4 mr-2" />
              Usage & Limits
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tenant Information</CardTitle>
                <CardDescription>Basic tenant details and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Company Name</label>
                    <p className="text-lg font-semibold">{tenant.tenant.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Slug</label>
                    <p className="text-lg font-semibold">{tenant.tenant.slug}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={impersonate}>Impersonate Tenant</Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Plan</label>
                    <Select value={tenant.tenant.plan} onValueChange={updateTenantPlan}>
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

                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={tenant.tenant.status} onValueChange={updateTenantStatus}>
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
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">ThinkVoiceSub-Account ID</label>
                  <div className="flex gap-3">
                    <Input value={attachSubValue} onChange={(e) => setAttachSubValue(e.target.value)} placeholder="Sub-Account ID" />
                    <Button onClick={attachSubAccount}>
                      <Save className="h-4 w-4 mr-2" />
                      Attach
                    </Button>
                  </div>
                  {tenant.tenant.settings?.pending_subaccount && (
                    <p className="mt-2 text-sm text-yellow-700">This tenant has a pending sub-account. Attach a real sub-account ID when available.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
                <CardDescription>Current usage vs plan limits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(tenant.usage).map(([key, value]: [string, any]) => {
                    const percentage = value.limit === -1 ? 0 : (value.current / value.limit) * 100;
                    const isNearLimit = percentage > 80 && value.limit !== -1;
                    const isAtLimit = value.current >= value.limit && value.limit !== -1;
                    
                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
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

                {Object.entries(tenant.usage).some(([_, v]: [string, any]) => v.current >= v.limit && v.limit !== -1) && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>
                      This tenant has reached one or more plan limits. Consider upgrading their plan.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Company Users</CardTitle>
                    <CardDescription>All users in this tenant organization</CardDescription>
                  </div>
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {users.length} Users
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">No users found</TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit User Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information</DialogDescription>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Name</label>
                  <Input
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <Input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Role</label>
                  <Select value={editingUser.role} onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={editingUser.status} onValueChange={(value) => setEditingUser({ ...editingUser, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={updateUser} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
