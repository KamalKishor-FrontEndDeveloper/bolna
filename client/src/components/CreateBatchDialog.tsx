import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, FileText } from "lucide-react";
import { useCreateBatch, useScheduleBatch } from "@/hooks/use-bolna";

interface CreateBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: any[];
  selectedAgentId?: string;
}

export function CreateBatchDialog({ open, onOpenChange, agents, selectedAgentId }: CreateBatchDialogProps) {
  const [agentId, setAgentId] = useState(selectedAgentId || "");
  const [fromPhone, setFromPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [runMode, setRunMode] = useState<'now'|'schedule'>('now');
  const [scheduledAt, setScheduledAt] = useState("");
  const [bypassGuardrails, setBypassGuardrails] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  const { mutate: createBatch, isPending } = useCreateBatch();
  const { mutate: scheduleBatch } = useScheduleBatch();

  const setPreset = (minutes: number) => {
    const dt = new Date(Date.now() + minutes * 60 * 1000);
    const isoLocal = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0,16);
    setScheduledAt(isoLocal);
  };

  const downloadSampleCsv = () => {
    const csvContent = "contact_number\n+1234567890\n+9876543210";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "sample_batch_contacts.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId || !file) return;

    const formData = new FormData();
    formData.append("agent_id", agentId);
    formData.append("file", file);
    if (fromPhone) formData.append("from_phone_number", fromPhone);
    if (webhookUrl) formData.append("webhook_url", webhookUrl);

    createBatch(formData, {
      onSuccess: (data: any) => {
        const batchId = data?.id || data?.batch_id || data?.batch?.id || data?._id;
        if (runMode === 'schedule') {
          if (!scheduledAt) {
            alert('Please select a scheduled date and time');
            return;
          }
          if (!batchId) {
            alert('Unable to schedule: missing batch id from server response');
            return;
          }
          // Convert local datetime-local value to an ISO format ThinkVoiceaccepts (strip milliseconds, use +00:00)
          const formatIsoForThinkVoice= (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, '+00:00');
          const scheduledISO = formatIsoForThinkVoice(new Date(scheduledAt));
          scheduleBatch({ batchId, scheduled_at: scheduledISO, bypass_call_guardrails: bypassGuardrails }, {
            onSuccess: () => {
              onOpenChange(false);
              setAgentId(selectedAgentId || "");
              setFromPhone("");
              setFile(null);
              setRunMode('now');
              setScheduledAt("");
              setBypassGuardrails(false);
              setWebhookUrl("");
            }
          });
        } else {
          onOpenChange(false);
          setAgentId(selectedAgentId || "");
          setFromPhone("");
          setFile(null);
          setRunMode('now');
          setScheduledAt("");
          setBypassGuardrails(false);
          setWebhookUrl("");
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[80vh] overflow-y-auto text-sm">
        <DialogHeader >
          <DialogTitle>Create New Batch</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-3 px-4 py-4 text-sm">
          <div className="space-y-1">
            <Label>Select Agent</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an agent" />
              </SelectTrigger>
              <SelectContent>
                {agents?.map((agent: any) => (
                  <SelectItem key={agent.id} value={String(agent.id)}>
                    {agent.agent_config?.agent_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>CSV File</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center bg-white ${file ? 'border-slate-300' : 'border-slate-200'}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer?.files?.[0];
                if (f && f.name.endsWith('.csv')) setFile(f);
              }}
            >
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="csv-upload"
              />

              <label htmlFor="csv-upload" className="cursor-pointer">
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <FileText className="w-4 h-4" />
                    <span>{file.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6 text-slate-400" />
                    <p className="text-sm text-slate-500">Drag and drop your CSV here, or <span className="underline">click to browse</span></p>
                    <p className="text-xs text-slate-400">Required column: <span className="font-mono font-medium">contact_number</span></p>
                  </div>
                )}
              </label>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">Upload a CSV file with contact numbers and variables</p>
              <button type="button" onClick={downloadSampleCsv} className="text-xs text-blue-600 hover:underline font-medium">
                Download sample CSV
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <Label>From Phone Number (Optional)</Label>
            <Input
              placeholder="+19876543210"
              value={fromPhone}
              onChange={(e) => setFromPhone(e.target.value)}
            />
            <p className="text-xs text-slate-500">Leave empty to use default number</p>
          </div>

          <div className="space-y-2">
            <Label>Calls will be made via Plivo using:</Label>
            <Input value="ThinkVoicemanaged phone numbers" disabled />
            <p className="text-xs text-slate-400">You can <a className="underline" href="/phone-numbers">purchase phone numbers</a> to start making calls from your own custom numbers.</p>
          </div>

          <div className="space-y-2">
            <Label>When do you want to run this batch?</Label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setRunMode('now')} className={`px-3 py-1 rounded-md text-sm ${runMode === 'now' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200'}`}>Run Now</button>
              <button type="button" onClick={() => setRunMode('schedule')} className={`px-3 py-1 rounded-md text-sm ${runMode === 'schedule' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200'}`}>Schedule</button>
            </div>

            {runMode === 'now' && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                <p className="text-xs text-green-800">✅ <span className="font-medium">Batch will start immediately after creation</span></p>
              </div>
            )}

            {runMode === 'schedule' && (
              <div className="mt-2 space-y-2">
                <Label className="text-sm">Select date and time</Label>
                <div className="flex gap-2 items-center">
                  <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPreset(10)} className="px-2 py-0.5 text-xs border rounded-sm">10 mins</button>
                  <button type="button" onClick={() => setPreset(30)} className="px-2 py-0.5 text-xs border rounded-sm flex items-center gap-2">30 mins <span className="text-[9px] bg-green-100 text-green-700 rounded-full px-1">Most Used</span></button>
                  <button type="button" onClick={() => setPreset(60)} className="px-2 py-0.5 text-xs border rounded-sm">1 hour</button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label>Webhook URL (Optional)</Label>
            <Input placeholder="https://example.com/webhook" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
            <p className="text-xs text-slate-500">Webhook to receive batch events</p>
          </div>

          {runMode === 'schedule' && (
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={bypassGuardrails} onChange={(e) => setBypassGuardrails(e.target.checked)} id="bypass" />
              <div>
                <Label htmlFor="bypass">Bypass Call Guardrails</Label>
                <p className="text-xs text-slate-400">Skip time validation for all calls in this batch</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="px-3 py-1 text-sm">
              Cancel
            </Button>
            <Button type="submit" className="px-3 py-1 text-sm" disabled={!agentId || !file || (runMode === 'schedule' && !scheduledAt) || isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
