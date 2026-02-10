import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, DollarSign, Phone, User, Calendar } from "lucide-react";
import { useExecution } from "@/hooks/use-bolna";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface TraceDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  executionId: string | null;
  agentId?: string;
}

export function TraceDataDialog({ open, onOpenChange, executionId, agentId }: TraceDataDialogProps) {
  const { data: execution, isLoading } = useExecution(executionId, agentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            <div>
              <span>Execution Trace Data</span>
              <p className="text-sm font-normal text-muted-foreground mt-1">
                Detailed execution information including costs, telephony data, and metadata
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : execution ? (
            <>
              {/* Basic Info */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Basic Information</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500">Execution ID:</span> <span className="font-mono text-xs">{execution.id}</span></div>
                  <div><span className="text-slate-500">Agent ID:</span> <span className="font-mono text-xs">{execution.agent_id}</span></div>
                  <div><span className="text-slate-500">Status:</span> <Badge variant="secondary" className="ml-2">{execution.status}</Badge></div>
                  <div><span className="text-slate-500">Voicemail:</span> {execution.answered_by_voice_mail ? 'Yes' : 'No'}</div>
                  <div><span className="text-slate-500">Created:</span> {format(new Date(execution.created_at), 'MMM dd, yyyy HH:mm:ss')}</div>
                  <div><span className="text-slate-500">Updated:</span> {format(new Date(execution.updated_at), 'MMM dd, yyyy HH:mm:ss')}</div>
                </CardContent>
              </Card>

              {/* Cost Breakdown */}
              {execution.cost_breakdown && (
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4" /> Cost Breakdown</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-3 gap-4 text-sm">
                    <div><span className="text-slate-500">LLM:</span> <span className="font-semibold">${(execution.cost_breakdown.llm / 100).toFixed(4)}</span></div>
                    <div><span className="text-slate-500">Synthesizer:</span> <span className="font-semibold">${(execution.cost_breakdown.synthesizer / 100).toFixed(4)}</span></div>
                    <div><span className="text-slate-500">Transcriber:</span> <span className="font-semibold">${(execution.cost_breakdown.transcriber / 100).toFixed(4)}</span></div>
                    <div><span className="text-slate-500">Network:</span> <span className="font-semibold">${(execution.cost_breakdown.network / 100).toFixed(4)}</span></div>
                    <div><span className="text-slate-500">Platform:</span> <span className="font-semibold">${(execution.cost_breakdown.platform / 100).toFixed(4)}</span></div>
                    <div><span className="text-slate-500 font-bold">Total:</span> <span className="font-bold">${(execution.total_cost / 100).toFixed(4)}</span></div>
                  </CardContent>
                </Card>
              )}

              {/* Telephony Data */}
              {execution.telephony_data && (
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Phone className="w-4 h-4" /> Telephony Data</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-slate-500">To Number:</span> <span className="font-mono">{execution.telephony_data.to_number}</span></div>
                    <div><span className="text-slate-500">From Number:</span> <span className="font-mono">{execution.telephony_data.from_number}</span></div>
                    <div><span className="text-slate-500">Duration:</span> {execution.telephony_data.duration}s</div>
                    <div><span className="text-slate-500">Provider:</span> {execution.telephony_data.provider}</div>
                    <div><span className="text-slate-500">Call Type:</span> <Badge variant="outline">{execution.telephony_data.call_type}</Badge></div>
                    <div><span className="text-slate-500">Hosted:</span> {execution.telephony_data.hosted_telephony ? 'Yes' : 'No'}</div>
                    {execution.telephony_data.hangup_by && <div><span className="text-slate-500">Hangup By:</span> {execution.telephony_data.hangup_by}</div>}
                    {execution.telephony_data.hangup_reason && <div><span className="text-slate-500">Hangup Reason:</span> {execution.telephony_data.hangup_reason}</div>}
                    {execution.telephony_data.provider_call_id && (
                      <div className="col-span-2"><span className="text-slate-500">Provider Call ID:</span> <span className="font-mono text-xs">{execution.telephony_data.provider_call_id}</span></div>
                    )}
                    {execution.telephony_data.recording_url && (
                      <div className="col-span-2">
                        <span className="text-slate-500">Recording:</span> 
                        <a href={execution.telephony_data.recording_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-2 text-xs">Listen</a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Transfer Call Data */}
              {execution.transfer_call_data && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Transfer Call Data</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-slate-500">Status:</span> <Badge variant="secondary">{execution.transfer_call_data.status}</Badge></div>
                    <div><span className="text-slate-500">Duration:</span> {execution.transfer_call_data.duration}s</div>
                    <div><span className="text-slate-500">Cost:</span> ${(execution.transfer_call_data.cost / 100).toFixed(4)}</div>
                    <div><span className="text-slate-500">To Number:</span> <span className="font-mono">{execution.transfer_call_data.to_number}</span></div>
                    {execution.transfer_call_data.recording_url && (
                      <div className="col-span-2">
                        <span className="text-slate-500">Recording:</span> 
                        <a href={execution.transfer_call_data.recording_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-2 text-xs">Listen</a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Batch Run Data */}
              {execution.batch_run_details && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Batch Information</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-slate-500">Status:</span> <Badge variant="secondary">{execution.batch_run_details.status}</Badge></div>
                    <div><span className="text-slate-500">Retries:</span> {execution.batch_run_details.retried}</div>
                    <div><span className="text-slate-500">Created:</span> {format(new Date(execution.batch_run_details.created_at), 'MMM dd, yyyy HH:mm:ss')}</div>
                    <div><span className="text-slate-500">Updated:</span> {format(new Date(execution.batch_run_details.updated_at), 'MMM dd, yyyy HH:mm:ss')}</div>
                  </CardContent>
                </Card>
              )}

              {/* Extracted Data */}
              {execution.extracted_data && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Extracted Data</CardTitle></CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-slate-50 p-3 rounded overflow-auto max-h-40">{JSON.stringify(execution.extracted_data, null, 2)}</pre>
                  </CardContent>
                </Card>
              )}

              {/* Context Details */}
              {execution.context_details && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Context Details</CardTitle></CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-slate-50 p-3 rounded overflow-auto max-h-40">{JSON.stringify(execution.context_details, null, 2)}</pre>
                  </CardContent>
                </Card>
              )}

              {/* Error Message */}
              {execution.error_message && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader><CardTitle className="text-sm text-red-700">Error Message</CardTitle></CardHeader>
                  <CardContent className="text-sm text-red-600">{execution.error_message}</CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-slate-400">
              No execution data available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}