import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useExecution, useAgents, useAgentExecutions } from "@/hooks/use-bolna";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Clock, DollarSign, MessageSquare, History, PhoneIncoming, PhoneOutgoing, ExternalLink, Download, RefreshCw, StopCircle, Filter, Plus, BarChart3, X, FileText, Calendar } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ConversationDialog } from "@/components/ConversationDialog";
import { TraceDataDialog } from "@/components/TraceDataDialog";
import { RawDataDialog } from "@/components/RawDataDialog";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";

export default function Executions() {
  const [location] = useLocation();
  
  // Support both URL formats:
  // 1. /agent-executions/{agentId}/{batchId}
  // 2. /executions?agent_id={agentId}&batch_id={batchId}
  const pathMatch = location.match(/^\/agent-executions\/([^\/]+)\/([^\/]+)/);
  const searchParams = new URLSearchParams(location.split('?')[1]);
  
  const agentIdParam = pathMatch ? pathMatch[1] : searchParams.get('agent_id');
  const batchIdParam = pathMatch ? pathMatch[2] : searchParams.get('batch_id');

  const [searchId, setSearchId] = useState("");
  const [queryId, setQueryId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agentIdParam || "");
  const [selectedBatchId, setSelectedBatchId] = useState<string>(batchIdParam || "all-batches");
  const [showConversationDialog, setShowConversationDialog] = useState(false);
  const [showTraceDialog, setShowTraceDialog] = useState(false);
  const [showRawDialog, setShowRawDialog] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date()
  });
  const [filters, setFilters] = useState({
    page_number: 1,
    page_size: 20,
    status: 'all',
    call_type: 'all',
    provider: 'all'
  });
  
  const { data: agents } = useAgents();

  useEffect(() => {
    if (agents && agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(String(agents[0].id));
    }
  }, [agents, selectedAgentId]);

  const { data: execution, isLoading: isExecutionLoading } = useExecution(queryId, selectedAgentId);
  const { data: agentExecutions, isLoading: isListLoading, refetch: refetchAgentExecutions } = useAgentExecutions(
    selectedAgentId || null,
    selectedAgentId ? {
      ...filters,
      batch_id: selectedBatchId !== 'all-batches' ? selectedBatchId : undefined,
      from: dateRange?.from?.toISOString(),
      to: dateRange?.to?.toISOString()
    } : undefined
  );

  // Ensure agent ID from URL is properly set when agents load
  useEffect(() => {
    if (agentIdParam && agents && agents.length > 0) {
      const agentExists = agents.some((agent: any) => String(agent.id) === agentIdParam);
      if (agentExists && selectedAgentId !== agentIdParam) {
        setSelectedAgentId(agentIdParam);
      }
    }
  }, [agentIdParam, agents]);

  const { toast } = useToast();
  const [isStopping, setIsStopping] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [stoppingCallId, setStoppingCallId] = useState<string | null>(null);

  const handleStopCall = async (executionId: string, status: string) => {
    const statusLower = String(status || '').toLowerCase();
    if (!['queued', 'scheduled'].includes(statusLower)) {
      return toast({ title: 'Cannot stop', description: 'Only queued or scheduled calls can be stopped', variant: 'destructive' });
    }
    setStoppingCallId(executionId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/bolna/call/${executionId}/stop`, { 
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to stop call');
      toast({ title: 'Call stopped', description: 'Call has been stopped successfully' });
      await refetchAgentExecutions();
    } catch (err: any) {
      toast({ title: 'Stop failed', description: err?.message || 'Unable to stop call', variant: 'destructive' });
    } finally {
      setStoppingCallId(null);
    }
  };

  const handleRefresh = async () => {
    if (!selectedAgentId) return;
    try {
      await refetchAgentExecutions();
      toast({ title: 'Refreshed', description: 'Execution list refreshed.' });
    } catch (err: any) {
      toast({ title: 'Refresh failed', description: err?.message || String(err), variant: 'destructive' });
    }
  };

  const handleStopQueued = async () => {
    if (!selectedAgentId) return;
    if (!window.confirm('Stop all queued calls for this agent?')) return;
    setIsStopping(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/bolna/agents/${selectedAgentId}/stop`, { 
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to stop queued calls');
      }
      toast({ title: 'Stopped', description: 'Queued calls stopped.' });
      await refetchAgentExecutions();
    } catch (err: any) {
      toast({ title: 'Stop failed', description: err?.message || String(err), variant: 'destructive' });
    } finally {
      setIsStopping(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedAgentId) return;
    setIsExporting(true);
    try {
      const query = new URLSearchParams();
      if (dateRange?.from) query.set('from', dateRange.from.toISOString());
      if (dateRange?.to) query.set('to', dateRange.to.toISOString());
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/bolna/agents/${selectedAgentId}/export?${query.toString()}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to export executions');
      }
      const csv = await res.text();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agent-${selectedAgentId}-executions.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'Downloaded', description: 'CSV downloaded.' });
    } catch (err: any) {
      toast({ title: 'Download failed', description: err?.message || String(err), variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      setQueryId(searchId.trim());
      setSelectedAgentId("");
    }
  };

  const isLoading = isExecutionLoading || isListLoading;

  // Calculate metrics from agentExecutions
  const metrics = agentExecutions?.data?.reduce((acc: any, curr: any) => {
    acc.totalExecutions++;
    acc.totalCost += (curr.total_cost || 0);
    acc.totalDuration += (curr.conversation_time || 0);
    acc.statusCounts[curr.status] = (acc.statusCounts[curr.status] || 0) + 1;
    return acc;
  }, { totalExecutions: 0, totalCost: 0, totalDuration: 0, statusCounts: {} }) || { totalExecutions: 0, totalCost: 0, totalDuration: 0, statusCounts: {} };

  const avgCost = metrics.totalExecutions > 0 ? metrics.totalCost / metrics.totalExecutions : 0;
  const avgDuration = metrics.totalExecutions > 0 ? metrics.totalDuration / metrics.totalExecutions : 0;

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agent Conversations</h1>
            <p className="text-sm" style={{ 
              background: 'linear-gradient(113deg, #2335c9 0%, #ef415f 50%, #ff9921 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>View and manage all historical conversations with agents</p>
          </div>
          {/* <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Available balance: <span className="text-foreground">$4.86</span></span>
            <Button variant="outline" size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add more funds</Button>
            <Button variant="outline" size="sm" className="gap-2 text-slate-500">Help</Button>
          </div> */}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedAgentId || ""} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="w-[240px] h-10 bg-white">
              <SelectValue placeholder="Select Agent" />
            </SelectTrigger>
            <SelectContent>
              {agents?.map((agent: any) => (
                <SelectItem key={agent.id} value={String(agent.id)}>{agent.agent_config?.agent_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
            <SelectTrigger className="w-[180px] h-10 bg-white"><SelectValue placeholder="Choose batch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all-batches">All Batches</SelectItem>
              {batchIdParam && <SelectItem value={batchIdParam}>Batch {batchIdParam.slice(0, 8)}...</SelectItem>}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 bg-white">
                <Calendar className="w-4 h-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`
                  ) : (
                    format(dateRange.from, "MMM dd, yyyy")
                  )
                ) : (
                  "Pick a date range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh} disabled={!selectedAgentId || isLoading}>
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleStopQueued} disabled={!selectedAgentId || isStopping}>
              {isStopping ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />} Stop queued
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload} disabled={!selectedAgentId || isExporting}>
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download
            </Button>
          </div>
        </div>

        {selectedAgentId && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-slate-400" />
                <h2 className="text-lg font-semibold">Performance Metrics</h2>
              </div>
              <div className="flex items-center gap-2">
                <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value, page_number: 1})}>
                  <SelectTrigger className="w-32 h-9 bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="no-answer">No Answer</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.call_type} onValueChange={(value) => setFilters({...filters, call_type: value, page_number: 1})}>
                  <SelectTrigger className="w-32 h-9 bg-white"><SelectValue placeholder="Call type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="outbound">Outbound</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.provider} onValueChange={(value) => setFilters({...filters, provider: value, page_number: 1})}>
                  <SelectTrigger className="w-32 h-9 bg-white"><SelectValue placeholder="Provider" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Providers</SelectItem>
                    <SelectItem value="plivo">Plivo</SelectItem>
                    <SelectItem value="twilio">Twilio</SelectItem>
                    <SelectItem value="websocket">WebSocket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-none border-slate-200">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Executions</p>
                    <PhoneOutgoing className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-2xl font-bold">{metrics.totalExecutions}</p>
                  <p className="text-[10px] text-slate-400 mt-1">All call attempts</p>
                </CardContent>
              </Card>
              <Card className="shadow-none border-slate-200">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Cost</p>
                    <DollarSign className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-2xl font-bold">${(metrics.totalCost / 100).toFixed(2)}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Total campaign spend</p>
                </CardContent>
              </Card>
              <Card className="shadow-none border-slate-200">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Duration</p>
                    <Clock className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-2xl font-bold">{metrics.totalDuration.toFixed(1)}s</p>
                  <p className="text-[10px] text-slate-400 mt-1">Total call time</p>
                </CardContent>
              </Card>
              <Card className="shadow-none border-slate-200 row-span-2">
                <CardHeader className="pb-2 pt-6"><CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Status Counts</CardTitle></CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {Object.entries(metrics.statusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between p-2 bg-slate-50 rounded-md border border-slate-100">
                      <span className="text-xs font-medium capitalize">{status}</span>
                      <span className="text-xs font-bold">{count as number}</span>
                    </div>
                  ))}
                  {Object.keys(metrics.statusCounts).length === 0 && <p className="text-[10px] text-slate-400 italic">No data</p>}
                </CardContent>
              </Card>
              <Card className="shadow-none border-slate-200">
                <CardContent className="pt-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Avg Cost</p>
                  <p className="text-2xl font-bold">${(avgCost / 100).toFixed(2)}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Average cost per call</p>
                </CardContent>
              </Card>
              <Card className="shadow-none border-slate-200">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Duration</p>
                    <Clock className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-2xl font-bold">{avgDuration.toFixed(1)}s</p>
                  <p className="text-[10px] text-slate-400 mt-1">Average call length</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-3 border-b flex items-center justify-between">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by Execution ID" 
                className="pl-9 h-9 bg-white"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setQueryId(searchId)}
              />
            </div>
            {agentExecutions?.data && agentExecutions.data.length > 0 && (
              <span className="text-sm text-slate-500">{agentExecutions.total || agentExecutions.data.length} execution{(agentExecutions.total || agentExecutions.data.length) !== 1 ? 's' : ''}</span>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <Table className="min-w-[1800px]">
              <TableHeader className="sticky top-0 bg-white z-10 border-b">
                <TableRow>
                  <TableHead className="text-xs uppercase text-slate-500 w-[180px]">Execution ID</TableHead>
                  <TableHead className="text-xs uppercase text-slate-500 w-[150px]">User Number</TableHead>
                  <TableHead className="text-xs uppercase text-slate-500 w-[180px]">Conversation type</TableHead>
                  <TableHead className="text-xs uppercase text-slate-500 text-center w-[120px]">Duration (s)</TableHead>
                  <TableHead className="text-xs uppercase text-slate-500 w-[120px]">Hangup by</TableHead>
                  <TableHead className="text-xs uppercase text-slate-500 w-[120px]">Batch</TableHead>
                  <TableHead className="text-xs uppercase text-slate-500 w-[180px]">Timestamp</TableHead>
                  <TableHead className="text-xs uppercase text-slate-500 text-right w-[100px]">Cost</TableHead>
                  <TableHead className="text-xs uppercase text-slate-500 text-center w-[120px]">Status</TableHead>
                  <TableHead className="text-xs uppercase text-slate-500 text-center w-[80px]">Action</TableHead>
                  <TableHead className="text-xs uppercase text-slate-500 w-[150px]">Conversation data</TableHead>
                  <TableHead className="text-xs uppercase text-slate-500 text-center w-[100px]">Trace data</TableHead>
                  <TableHead className="text-xs uppercase text-slate-500 text-center w-[100px]">Raw data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={13} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" /></TableCell></TableRow>
                ) : !selectedAgentId ? (
                  <TableRow><TableCell colSpan={13} className="h-32 text-center text-slate-400 text-sm">Please select an agent to view conversation history</TableCell></TableRow>
                ) : agentExecutions?.data?.length > 0 ? (
                  agentExecutions.data.map((exec: any) => (
                    <TableRow key={exec.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-mono text-[11px] text-slate-600">
                        <div className="flex items-center gap-2">
                          {String(exec.id).slice(0, 8)}...
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400" onClick={() => navigator.clipboard.writeText(String(exec.id))}>
                            <Download className="w-3 h-3 rotate-180" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-[13px] font-medium">{exec.telephony_data?.to_number || exec.telephony_data?.from_number}</TableCell>
                      <TableCell className="text-[12px] text-slate-500 capitalize">{exec.telephony_data?.provider || "plivo"} {exec.telephony_data?.direction || "outbound"}</TableCell>
                      <TableCell className="text-[13px] text-center">{exec.conversation_time || 0}</TableCell>
                      <TableCell className="text-[12px] text-slate-500">Callee</TableCell>
                      <TableCell className="text-[12px] text-slate-400">-</TableCell>
                      <TableCell className="text-[12px]">
                        <div className="flex flex-col">
                          <span>{format(new Date(exec.created_at), "dd MMM yy, HH:mm")}</span>
                          <span className="text-[10px] text-slate-400">(+05:30)</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[13px] font-bold text-right">${((exec.total_cost || 0)/100).toFixed(3)}</TableCell>
                      <TableCell className="text-center"><StatusBadge status={exec.status} /></TableCell>
                      <TableCell className="text-center">
                        {['queued', 'scheduled'].includes(String(exec.status || '').toLowerCase()) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleStopCall(String(exec.id), exec.status)}
                            disabled={stoppingCallId === String(exec.id)}
                            title="Stop call"
                          >
                            {stoppingCallId === String(exec.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-8 gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-none shadow-none text-[11px] font-bold px-3"
                          onClick={() => {
                            setQueryId(String(exec.id));
                            setShowConversationDialog(true);
                          }}
                        >
                          View Details <ExternalLink className="w-3 h-3" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400"
                          onClick={() => {
                            setQueryId(String(exec.id));
                            setShowTraceDialog(true);
                          }}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400"
                          onClick={() => {
                            setQueryId(String(exec.id));
                            setShowRawDialog(true);
                          }}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={13} className="h-32 text-center text-slate-400 text-sm">No records found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="p-3 border-t flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-slate-500">Rows per page</span>
              <Select value={filters.page_size.toString()} onValueChange={(value) => setFilters({...filters, page_size: parseInt(value), page_number: 1})}>
                <SelectTrigger className="w-16 h-8 bg-white text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[12px] text-slate-500">
                Page {filters.page_number} of {Math.ceil((agentExecutions?.total || 0) / filters.page_size) || 1}
              </span>
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8" 
                  disabled={filters.page_number <= 1}
                  onClick={() => setFilters({...filters, page_number: 1})}
                >
                  <span>«</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8" 
                  disabled={filters.page_number <= 1}
                  onClick={() => setFilters({...filters, page_number: filters.page_number - 1})}
                >
                  <span>‹</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8" 
                  disabled={!agentExecutions?.has_more}
                  onClick={() => setFilters({...filters, page_number: filters.page_number + 1})}
                >
                  <span>›</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8" 
                  disabled={!agentExecutions?.has_more}
                  onClick={() => setFilters({...filters, page_number: Math.ceil((agentExecutions?.total || 0) / filters.page_size) || 1})}
                >
                  <span>»</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Conversation Dialog */}
        <ConversationDialog 
          open={showConversationDialog} 
          onOpenChange={setShowConversationDialog}
          execution={execution}
        />
        
        {/* Trace Data Dialog */}
        <TraceDataDialog 
          open={showTraceDialog} 
          onOpenChange={setShowTraceDialog}
          executionId={queryId}
          agentId={selectedAgentId}
        />
        
        {/* Raw Data Dialog */}
        <RawDataDialog 
          open={showRawDialog} 
          onOpenChange={setShowRawDialog}
          executionId={queryId}
          agentId={selectedAgentId}
        />
      </div>
    </Layout>
  );
}
