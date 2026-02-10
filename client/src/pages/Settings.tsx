import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useApiKey } from "@/hooks/use-api-keys";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Save, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { hasKey, saveKey, isLoading } = useApiKey();
  const [key, setKey] = useState("");
  const { token, tenant, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  const [billing, setBilling] = useState<any>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleSave = () => {
    if (!key.trim()) return;
    saveKey.mutate(key, {
      onSuccess: () => setKey("") 
    });
  };

  const handleSync = async () => {
    if (!token) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/tenant/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast({ title: "Sync completed", description: "Database synced with Bolna API" });
        fetchBilling(); // Refresh billing data
      } else {
        const err = await res.json();
        toast({ title: "Sync failed", description: err.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  // Fetch tenant billing/limits
  const fetchBilling = async () => {
    // Guard: only run when we have a valid token and a tenant context
    if (!token || !tenant) return;
    if (billingLoading) return; // avoid duplicate concurrent calls

    setBillingLoading(true);
    setBillingError(null);

    try {
      const res = await fetch('/api/tenant/limits', { headers: { Authorization: `Bearer ${token}` } });

      if (res.status === 401) {
        // Clear billing and surface a helpful message so user can re-authenticate
        setBilling(null);
        setBillingError('Unauthorized. Please sign out and sign in again.');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setBilling(data);
        setBillingError(null);
      } else {
        const err = await res.json().catch(() => ({ message: 'Failed to load billing' }));
        setBillingError(err.message || 'Failed to load billing info');
        setBilling(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch billing info', err);
      setBillingError(err.message || 'Network error while fetching billing info');
      setBilling(null);
    } finally {
      setBillingLoading(false);
    }
  };

  // Show tenant plan immediately if available, then fetch usage when both token and tenant exist
  useEffect(() => {
    if (!token || !tenant) return;

    // show the tenant's plan immediately while we fetch usage
    if (!billing || billing.plan !== tenant.plan) {
      setBilling({ plan: tenant.plan, usage: null });
    }

    fetchBilling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tenant]);

  return (
    <Layout>
      <PageHeader title="Settings" description="Configure your Bolna API integration" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Lock className="w-5 h-5 text-slate-700" />
              </div>
              <CardTitle>API Configuration</CardTitle>
            </div>
            <CardDescription>
              Enter your Bolna API Key to enable dashboard features. 
              The key is stored securely in your database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isSuperAdmin ? (
              <>
                <div className="space-y-2">
                  <Label>Bolna API Key</Label>
                  <div className="flex gap-4">
                    <Input 
                      type="password" 
                      placeholder="bn-..." 
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      className="font-mono"
                    />
                    <Button onClick={handleSave} disabled={saveKey.isPending || !key.trim()}>
                      {saveKey.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" /> Save
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border flex items-center gap-3">
                  <div className={`p-1 rounded-full ${hasKey ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {isLoading ? "Checking connection..." : hasKey ? "Connected to Bolna" : "Not Connected"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {hasKey ? "Your API key is configured and valid." : "Enter and save a valid API key to enable features."}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-slate-50 p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-full ${hasKey ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{isLoading ? "Checking connection..." : hasKey ? "Connected to Bolna" : "Not Connected"}</p>
                    <p className="text-xs text-slate-500">This setting is managed by your super-admin. Contact them to change the API key.</p>
                  </div>
                </div>
              </div>
            )}




          </CardContent>
        </Card>

       <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <Save className="w-5 h-5 text-slate-700" />
                    </div>
                    <CardTitle>Billing & Plan</CardTitle>
                  </div>
                  <CardDescription>
                    View your current subscription plan and usage. Upgrade if you need more capacity.
                  </CardDescription>
                </div>
                <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {billingLoading ? (
                <div className="text-sm text-slate-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking plan...
                </div>
              ) : billing ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Plan</p>
                      <p className="text-lg font-semibold">{billing.plan || 'N/A'}</p>
                    </div>
                    <div>
                      <Button onClick={() => window.alert('Upgrade flow not implemented')}>Upgrade</Button>
                    </div>
                  </div>

                  {billing.usage ? (
                    Object.entries(billing.usage).map(([k, v]: any) => (
                      <div key={k} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{k}</span>
                          <span className="text-sm font-semibold">{v.current} / {v.limit === -1 ? '∞' : v.limit}</span>
                        </div>
                        {v.limit !== -1 && (
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min((v.current / v.limit) * 100, 100)}%` }} />
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500">Usage data is not available right now. <Button variant="ghost" onClick={fetchBilling}>Retry</Button></div>
                  )}

                  <div className="text-xs text-slate-500 mt-2">Billing details and payment methods are not implemented in this demo.</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-slate-500">Plan: <span className="font-semibold">{tenant?.plan || 'N/A'}</span></div>
                  <div className="text-sm text-slate-500">Usage data is not available. <Button variant="ghost" onClick={fetchBilling}>Retry</Button></div>
                  {billingError && <div className="text-sm text-red-600">{billingError}</div>}
                </div>
              )}
            </CardContent>
        </Card>

       
      </div>
    </Layout>
  );
}
