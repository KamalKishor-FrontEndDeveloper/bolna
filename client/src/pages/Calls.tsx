import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useAgents, useMakeCall } from "@/hooks/use-bolna";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Calls() {
  const { data: agents } = useAgents();
  const { mutate: makeCall, isPending } = useMakeCall();
  const [formData, setFormData] = useState({
    agent_id: "",
    recipient_phone_number: "",
    from_phone_number: "",
    user_data: "{}"
  });

  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userData = JSON.parse(formData.user_data);
      makeCall({
        agent_id: formData.agent_id,
        recipient_phone_number: formData.recipient_phone_number,
        from_phone_number: formData.from_phone_number,
        user_data: userData
      }, {
        onSuccess: () => {
          toast({ title: 'Call initiated', description: 'Your call has been started successfully' });
          setFormData({ ...formData, recipient_phone_number: '', user_data: '{}' });
        },
        onError: (err: any) => {
          toast({ title: 'Call failed', description: err?.message || 'Unable to initiate call', variant: 'destructive' });
        }
      });
    } catch (err) {
      toast({ title: 'Invalid JSON', description: 'Please check your User Data format', variant: 'destructive' });
    }
  };

  return (
    <Layout>
      <PageHeader title="Phone Calls" description="Initiate outbound calls with your agents" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="rounded-lg border">
            <div className="p-6 space-y-6">
              <h2 className="text-2xl font-semibold">Make a Call</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label>Select Agent</Label>
                  <Select 
                    value={formData.agent_id} 
                    onValueChange={(val) => setFormData({...formData, agent_id: val})}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(agents) && agents.map((agent: any) => {
                        const idStr = String(agent.id || agent.bolna_agent_id || '');
                        if (!idStr) return null;
                        return (
                          <SelectItem key={idStr} value={idStr}>
                            {agent.agent_config?.agent_name || "Unnamed"} ({idStr.slice(0, 8)}...)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Recipient Phone Number</Label>
                    <Input 
                      placeholder="+1234567890" 
                      value={formData.recipient_phone_number}
                      onChange={(e) => setFormData({...formData, recipient_phone_number: e.target.value})}
                      required
                    />
                    <p className="text-xs text-slate-500">Include country code (E.164 format)</p>
                  </div>
                  <div className="space-y-2">
                    <Label>From Phone Number (Optional)</Label>
                    <Input 
                      placeholder="+19876543210" 
                      value={formData.from_phone_number}
                      onChange={(e) => setFormData({...formData, from_phone_number: e.target.value})}
                    />
                    <p className="text-xs text-slate-500">Leave empty to use default number</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>User Data (JSON)</Label>
                  <Textarea 
                    value={formData.user_data}
                    onChange={(e) => setFormData({...formData, user_data: e.target.value})}
                    className="font-mono text-sm bg-slate-50"
                    rows={4}
                  />
                  <p className="text-xs text-slate-500">
                    Context variables to pass to the agent (e.g. name, account details)
                  </p>
                </div>

                <div className="pt-2">
                  <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded" disabled={isPending}>
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Initiating...
                      </>
                    ) : (
                      <>
                        <Phone className="w-4 h-4 mr-2" /> Start Call
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>

        <div>
          <Card className="bg-blue-50 border border-blue-100 rounded-lg">
            <CardHeader>
              <div className="flex items-center gap-2 text-blue-700">
                <Info className="w-5 h-5" />
                <CardTitle className="text-base">Tips</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-blue-900/80 space-y-4">
              <p>
                Ensure your "From" number is verified in the Bolna dashboard to avoid call rejection.
              </p>
              <p>
                User Data is injected into the prompt variables. If your prompt has {"{{name}}"}, include {"{ \"name\": \"John\" }"} in the JSON.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
