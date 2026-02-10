import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useMakeCall, useStopCall } from "@/hooks/use-bolna";
import { Phone, Loader2, XCircle } from "lucide-react";

interface MakeCallDialogProps {
  agentId: string;
  trigger?: React.ReactNode;
}

export default function MakeCallDialog({ agentId, trigger }: MakeCallDialogProps) {
  const [open, setOpen] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState("");
  const [fromPhone, setFromPhone] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [userData, setUserData] = useState("");
  const [bypassGuardrails, setBypassGuardrails] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);

  const { mutate: makeCall, isPending } = useMakeCall();
  const { mutate: stopCall, isPending: isStopping } = useStopCall();

  const handleSubmit = () => {
    const payload: any = {
      agent_id: agentId,
      recipient_phone_number: recipientPhone,
    };

    if (fromPhone) payload.from_phone_number = fromPhone;
    if (scheduledAt) {
      // Convert local datetime-local to server-friendly ISO (no milliseconds Z)
      const formatIsoForBolna = (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, '+00:00');
      payload.scheduled_at = formatIsoForBolna(new Date(scheduledAt));
    }
    if (bypassGuardrails) payload.bypass_call_guardrails = true;
    
    if (userData) {
      try {
        payload.user_data = JSON.parse(userData);
      } catch (e) {
        alert("Invalid JSON in User Data field");
        return;
      }
    }

    makeCall(payload, {
      onSuccess: (data) => {
        setExecutionId(data.execution_id);
        setRecipientPhone("");
        setFromPhone("");
        setScheduledAt("");
        setUserData("");
        setBypassGuardrails(false);
      }
    });
  };

  const handleStop = () => {
    if (executionId) {
      stopCall(executionId, {
        onSuccess: () => {
          setExecutionId(null);
          setOpen(false);
        }
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
    setExecutionId(null);
    setRecipientPhone("");
    setFromPhone("");
    setScheduledAt("");
    setUserData("");
    setBypassGuardrails(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Phone className="w-4 h-4" />
            Make Call
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Make Voice Call</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {executionId ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-900">Call Initiated Successfully!</p>
                <p className="text-xs text-green-700 mt-1 font-mono">{executionId}</p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleStop}
                  disabled={isStopping}
                  variant="destructive"
                  className="flex-1"
                >
                  {isStopping ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Stopping...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Stop Call
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <>
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Phone Number *</Label>
            <Input
              id="recipient"
              placeholder="+14155552671"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
            />
            <p className="text-xs text-slate-400">E.164 format (e.g., +14155552671)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="from">From Phone Number (Optional)</Label>
            <Input
              id="from"
              placeholder="+19876543210"
              value={fromPhone}
              onChange={(e) => setFromPhone(e.target.value)}
            />
            <p className="text-xs text-slate-400">Your caller ID number</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduled">Schedule Call (Optional)</Label>
            <Input
              id="scheduled"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <p className="text-xs text-slate-400">Leave empty for immediate call</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="userData">User Data (Optional JSON)</Label>
            <Textarea
              id="userData"
              placeholder='{"customer_name": "John", "order_id": "12345"}'
              value={userData}
              onChange={(e) => setUserData(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-slate-400">Variables to use in agent prompt</p>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={bypassGuardrails}
              onCheckedChange={setBypassGuardrails}
            />
            <div>
              <Label>Bypass Call Guardrails</Label>
              <p className="text-xs text-slate-400">Skip time validation checks</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!recipientPhone || isPending}
              className="flex-1"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Initiating...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 mr-2" />
                  Make Call
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
          </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
