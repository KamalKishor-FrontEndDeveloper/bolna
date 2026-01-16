import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useApiKey } from "@/hooks/use-api-keys";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Save, Loader2, CheckCircle2 } from "lucide-react";

export default function Settings() {
  const { hasKey, saveKey, isLoading } = useApiKey();
  const [key, setKey] = useState("");

  const handleSave = () => {
    if (!key.trim()) return;
    saveKey.mutate(key, {
      onSuccess: () => setKey("") 
    });
  };

  return (
    <Layout>
      <PageHeader title="Settings" description="Configure your Bolna API integration" />

      <div className="max-w-2xl">
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
            <div className="space-y-2">
              <Label>Bolna API Key</Label>
              <div className="flex gap-4">
                <Input 
                  type="password" 
                  placeholder="sk-..." 
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
                  {hasKey ? "Your API key is configured and valid." : "Please enter a valid API key above."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
