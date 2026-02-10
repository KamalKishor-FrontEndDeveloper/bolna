import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";

export default function AdminUsers() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const { toast } = useToast();
  const { token } = useAuth();

  useEffect(() => {
    // fetch tenant list for super-admins
    const fetchTenants = async () => {
      try {
        const res = await fetch('/api/super-admin/tenants', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setTenants(data);
          if (data.length) setTenantId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch tenants', err);
      }
    };
    if (token) fetchTenants();
  }, [token]);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return toast({ title: "Not authenticated", description: "Sign in as super-admin to create users", variant: "destructive" });
    if (!tenantId) return toast({ title: "Missing tenant", description: "Select a tenant for the user", variant: "destructive" });
    if (!password.trim()) return toast({ title: "Missing password", description: "Provide a password for the user", variant: "destructive" });

    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, email, password, tenant_id: tenantId })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to create user' }));
        throw new Error(err.message || 'Failed to create user');
      }

      const user = await res.json();
      toast({ title: 'User Created', description: `User ${user.email || email} created.` });
    } catch (err: any) {
      toast({ title: 'Creation Failed', description: err.message, variant: 'destructive' });
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Admin - Create User</h1>
        <form onSubmit={createUser} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" />
          </div>
          <div>
            <Label>Tenant</Label>
            <select value={tenantId ?? ''} onChange={(e) => setTenantId(Number(e.target.value))} className="w-full border rounded p-2">
              <option value="">Select tenant</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit">Create User</Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
