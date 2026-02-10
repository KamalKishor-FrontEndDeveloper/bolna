import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useAgents, useAgentBatches, useScheduleBatch, useStopBatch, useDeleteBatch } from "@/hooks/use-bolna";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Clock, DollarSign, MessageSquare, History, PhoneIncoming, PhoneOutgoing, ExternalLink, Download, RefreshCw, StopCircle, Filter, Plus, BarChart3, X, FileText, Layers, Play, Pause, Trash2, Info, Copy } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { CreateBatchDialog } from "@/components/CreateBatchDialog";

export default function Batches() {
  const [, setLocation] = useLocation();
  const [searchId, setSearchId] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
  const { data: agents } = useAgents();
  const { data: batches, isLoading, refetch } = useAgentBatches(selectedAgentId || null);
  const { toast } = useToast();
  const { mutate: scheduleBatch } = useScheduleBatch();
  const { mutate: stopBatch } = useStopBatch();
  const { mutate: deleteBatch } = useDeleteBatch();



  const formatWithOffset = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    const tzMin = -d.getTimezoneOffset();
    const sign = tzMin >= 0 ? '+' : '-';
    const abs = Math.abs(tzMin);
    const hh = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');
    const offset = `${sign}${hh}:${mm}`;
    return `${format(d, 'dd MMM yy, HH:mm')} (${offset})`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: 'Batch ID copied to clipboard' });
    } catch (e) {
      toast({ title: 'Copy failed', description: 'Unable to copy' , variant: 'destructive'});
    }
  };

  const statusDotClass = (status: string) => {
    const s = String(status || '').toLowerCase();
    if (["completed","success","active","created"].includes(s)) return 'bg-green-500';
    if (["stopped","cancelled","failed","error"].includes(s)) return 'bg-red-500';
    if (["processed","queued","pending","in-progress","partial completed"].includes(s)) return 'bg-amber-500';
    return 'bg-slate-300';
  };

  const formatExecutionStatus = (s: any) => {
    if (!s) return <span className="text-slate-400">-</span>;
    if (typeof s === 'string') return <div className="text-sm text-slate-700">{s}</div>;

    const entries = Object.entries(s as Record<string, number>);
    if (!entries.length) return <span className="text-slate-400">-</span>;

    return (
      <div className="flex flex-wrap gap-2">
        {entries.map(([k, v]) => (
          <span key={k} className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-xs text-slate-700" title={`${k}: ${v}`}>
            <span className="font-medium mr-1">{String(k).replace(/-/g, ' ')}</span>
            <span className="text-xs text-slate-500">{v}</span>
          </span>
        ))}
      </div>
    );
  };

  const handleRunNow = (batchId: string, status: string) => {
    const statusLower = String(status || '').toLowerCase();
    if (statusLower === 'completed') {
      return toast({ title: 'Cannot run', description: 'This batch is already completed', variant: 'destructive' });
    }
    const formatIsoForBolna = (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, '+00:00');
    scheduleBatch({ batchId, scheduled_at: formatIsoForBolna(new Date()), bypass_call_guardrails: false }, {
      onSuccess: () => {
        toast({ title: 'Batch scheduled', description: 'Batch will start immediately' });
        refetch();
      },
      onError: (err: any) => toast({ title: 'Failed', description: err?.message || 'Unable to run batch', variant: 'destructive' })
    });
  };

  const handleStop = (batchId: string, status: string) => {
    const statusLower = String(status || '').toLowerCase();
    if (['completed', 'stopped', 'cancelled', 'failed'].includes(statusLower)) {
      return toast({ title: 'Cannot stop', description: 'This batch is already completed or stopped', variant: 'destructive' });
    }
    stopBatch(batchId, {
      onSuccess: () => {
        toast({ title: 'Batch stopped', description: 'Batch has been stopped successfully' });
        refetch();
      },
      onError: (err: any) => toast({ title: 'Error', description: err?.message || 'Failed to stop batch', variant: 'destructive' })
    });
  };

  const handleDownload = async (batchId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/bolna/batches/${batchId}/download`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Not available');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `batch-${batchId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast({ title: 'Downloaded', description: 'Batch file downloaded' });
    } catch (err: any) {
      toast({ title: 'Download failed', description: err?.message || 'File not available', variant: 'destructive' });
    }
  };

  const handleDelete = (batchId: string) => {
    setBatchToDelete(batchId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!batchToDelete) return;
    deleteBatch(batchToDelete, {
      onSuccess: () => {
        refetch();
        setDeleteDialogOpen(false);
        setBatchToDelete(null);
      }
    });
  };

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agent Batches</h1>
            <p className="text-sm text-muted-foreground">Manage and monitor your outbound call batches</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Available balance: <span className="text-foreground">$4.86</span></span>
            <Button variant="outline" size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add more funds</Button>
            <Button variant="outline" size="sm" className="gap-2 text-slate-500">Help</Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="w-[240px] h-10 bg-white">
              <SelectValue placeholder="Select Agent" />
            </SelectTrigger>
            <SelectContent>
              {agents?.map((agent: any) => (
                <SelectItem key={agent.id} value={String(agent.id)}>{agent.agent_config?.agent_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4" /> Create New Batch
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()} disabled={!selectedAgentId}>
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-3 border-b flex items-center justify-between">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by Batch ID" 
                className="pl-9 h-9 bg-white"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
              />
            </div>
            {batches && batches.length > 0 && (
              <span className="text-sm text-slate-500">{batches.length} batch{batches.length !== 1 ? 'es' : ''}</span>
            )}
          </div>
          
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : !selectedAgentId ? (
              <div className="p-12 text-center text-slate-400 text-sm">Please select an agent to view batches</div>
            ) : batches && batches.length > 0 ? (
              <div className="border-t">
                {/* Mobile-friendly stacked header */}
                <div className="md:hidden px-4 py-3 text-xs text-slate-500 border-b">Batches</div>

                <div className="overflow-x-auto">
                  <Table className="min-w-[1600px]">
                    <TableHeader className="sticky top-0 bg-white z-10 border-b">
                      <TableRow>
                        <TableHead className="text-xs uppercase text-slate-500 w-[180px]">Batch ID</TableHead>
                        <TableHead className="text-xs uppercase text-slate-500 w-[280px]">File name</TableHead>
                        <TableHead className="text-xs uppercase text-slate-500 w-[160px]">Uploaded contacts <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="ml-2 text-slate-400"><Info className="w-3 h-3" /></button>
                          </TooltipTrigger>
                          <TooltipContent>Shown as <strong># valid / # total</strong></TooltipContent>
                        </Tooltip></TableHead>
                        <TableHead className="text-xs uppercase text-slate-500 w-[200px]">Execution Status</TableHead>
                        <TableHead className="text-xs uppercase text-slate-500 w-[140px]">Batch Status</TableHead>
                        <TableHead className="text-xs uppercase text-slate-500 w-[140px]">Workflow</TableHead>
                        <TableHead className="text-xs uppercase text-slate-500 w-[200px]">Created At</TableHead>
                        <TableHead className="text-xs uppercase text-slate-500 text-center w-[80px]">Run Now</TableHead>
                        <TableHead className="text-xs uppercase text-slate-500 text-center w-[80px]">Stop</TableHead>
                        <TableHead className="text-xs uppercase text-slate-500 text-center w-[80px]">Download</TableHead>
                        <TableHead className="text-xs uppercase text-slate-500 text-center w-[80px]">Delete</TableHead>
                        <TableHead className="text-xs uppercase text-slate-500 text-center w-[80px]">Call Log</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {batches.map((batch: any) => (
                        <TableRow key={batch.batch_id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span>{batch.batch_id?.slice(0, 8)}...</span>
                              <button onClick={() => copyToClipboard(batch.batch_id)} className="text-slate-400 hover:text-slate-600"><Copy className="w-4 h-4" /></button>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <div className="text-sm font-medium text-slate-700">{batch.file_name || 'contact_numbers.csv'}</div>
                            </div>
                          </TableCell>

                          <TableCell className="text-sm text-slate-700 whitespace-nowrap">{`${batch.valid_contacts || 0} valid / ${batch.total_contacts || 0} total`}</TableCell>

                          <TableCell>{formatExecutionStatus(batch.execution_status)}</TableCell>

                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`inline-block w-2 h-2 rounded-full ${statusDotClass(batch.status)}`} />
                              <div className="text-sm text-slate-700">{batch.status ? (batch.status.charAt(0).toUpperCase() + batch.status.slice(1)) : '-'}</div>
                            </div>
                          </TableCell>

                          <TableCell className="text-sm text-slate-700">{batch.selected_workflow || '-'}</TableCell>

                          <TableCell className="text-sm text-slate-600 whitespace-nowrap">{formatWithOffset(batch.created_at)}</TableCell>

                          <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Run Now" 
                              onClick={() => handleRunNow(batch.batch_id, batch.status)} 
                              className="text-slate-400 hover:text-slate-600"
                              disabled={String(batch.status || '').toLowerCase() === 'completed'}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Stop" 
                              onClick={() => handleStop(batch.batch_id, batch.status)} 
                              className="text-slate-400 hover:text-slate-600"
                              disabled={['completed', 'stopped', 'cancelled', 'failed'].includes(String(batch.status || '').toLowerCase())}
                            >
                              <Pause className="w-4 h-4" />
                            </Button>
                          </TableCell>
                          <TableCell className="text-center"><Button variant="ghost" size="icon" title="Download" onClick={() => handleDownload(batch.batch_id)} className="text-slate-400 hover:text-slate-600"><Download className="w-4 h-4 rotate-180" /></Button></TableCell>
                          <TableCell className="text-center"><Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(batch.batch_id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button></TableCell>
                          <TableCell className="text-center"><Button variant="ghost" size="icon" title="Call Log" className="text-slate-400 hover:text-slate-600" onClick={() => setLocation(`/agent-executions/${selectedAgentId}/${batch.batch_id}`)}><ExternalLink className="w-4 h-4" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-sm">No batches found for this agent</div>
            )}
          </div>
        </div>

        <CreateBatchDialog 
          open={showCreateDialog} 
          onOpenChange={setShowCreateDialog}
          agents={agents || []}
          selectedAgentId={selectedAgentId}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Batch</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this batch? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setBatchToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
