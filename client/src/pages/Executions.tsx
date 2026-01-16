import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useExecution, useAgents, useAgentExecutions } from "@/hooks/use-bolna";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Clock, DollarSign, MessageSquare, History, PhoneIncoming, PhoneOutgoing, ExternalLink, Download, RefreshCw, StopCircle, Filter, Plus, BarChart3, X, FileText } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Executions() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1]);
  const agentIdParam = searchParams.get('agent_id');

  const [searchId, setSearchId] = useState("");
  const [queryId, setQueryId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agentIdParam || "");
  
  const { data: agents } = useAgents();
  const { data: execution, isLoading: isExecutionLoading } = useExecution(queryId);
  const { data: agentExecutions, isLoading: isListLoading } = useAgentExecutions(selectedAgentId || null);

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
            <h1 className="text-2xl font-bold tracking-tight">Agent conversations</h1>
            <p className="text-sm text-muted-foreground">Displays all historical conversations with agents</p>
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
              <SelectValue placeholder="All Agents" />
            </SelectTrigger>
            <SelectContent>
              {agents?.map((agent: any) => (
                <SelectItem key={agent.id} value={agent.id}>{agent.agent_config?.agent_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select defaultValue="all-batches">
            <SelectTrigger className="w-[180px] h-10 bg-white"><SelectValue placeholder="Choose batch" /></SelectTrigger>
            <SelectContent><SelectItem value="all-batches">All Batches</SelectItem></SelectContent>
          </Select>
          <div className="h-10 px-3 flex items-center bg-white border rounded-md text-sm text-muted-foreground">
            Jan 09, 2026 - Jan 16, 2026
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2"><RefreshCw className="w-4 h-4" /> Refresh</Button>
            <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"><StopCircle className="w-4 h-4" /> Stop queued calls</Button>
            <Button variant="outline" size="sm" className="gap-2"><Download className="w-4 h-4" /> Download records</Button>
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
                <Select defaultValue="none"><SelectTrigger className="w-32 h-9 bg-white"><SelectValue placeholder="Group by" /></SelectTrigger></Select>
                <Select defaultValue="all"><SelectTrigger className="w-32 h-9 bg-white"><SelectValue placeholder="Status" /></SelectTrigger></Select>
                <Select defaultValue="all"><SelectTrigger className="w-32 h-9 bg-white"><SelectValue placeholder="Call type" /></SelectTrigger></Select>
                <Select defaultValue="all"><SelectTrigger className="w-32 h-9 bg-white"><SelectValue placeholder="Provider" /></SelectTrigger></Select>
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

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b bg-slate-50/30">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by Execution id" 
                className="pl-9 h-9 bg-white border-slate-200"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setQueryId(searchId)}
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Execution ID</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">User Number</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Conversation type</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center">Duration (s)</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Hangup by</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Batch</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Timestamp</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Cost</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center">Status</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Conversation data</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center">Trace data</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center">Raw data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3].map(i => (
                    <TableRow key={i}><TableCell colSpan={12} className="h-16 animate-pulse bg-slate-50/50" /></TableRow>
                  ))
                ) : agentExecutions?.data?.length > 0 ? (
                  agentExecutions.data.map((exec: any) => (
                    <TableRow key={exec.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-mono text-[11px] text-slate-600">
                        <div className="flex items-center gap-2">
                          {exec.id.slice(0, 8)}...
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400" onClick={() => navigator.clipboard.writeText(exec.id)}>
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
                      <TableCell>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-8 gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-none shadow-none text-[11px] font-bold px-3"
                          onClick={() => setQueryId(exec.id)}
                        >
                          Recordings <ExternalLink className="w-3 h-3" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-center"><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><ExternalLink className="w-4 h-4" /></Button></TableCell>
                      <TableCell className="text-center"><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><FileText className="w-4 h-4" /></Button></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={12} className="h-32 text-center text-slate-400 text-sm italic">No records found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="p-4 border-t bg-slate-50/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-slate-500">Rows per page</span>
              <Select defaultValue="20"><SelectTrigger className="w-16 h-8 bg-white text-[12px]"><SelectValue /></SelectTrigger></Select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[12px] text-slate-500">Page 1 of 1</span>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8 text-slate-400" disabled><span>«</span></Button>
                <Button variant="outline" size="icon" className="h-8 w-8 text-slate-400" disabled><span>‹</span></Button>
                <Button variant="outline" size="icon" className="h-8 w-8 text-slate-400" disabled><span>›</span></Button>
                <Button variant="outline" size="icon" className="h-8 w-8 text-slate-400" disabled><span>»</span></Button>
              </div>
            </div>
          </div>
        </div>

        {/* Detail View Modal-like Overlay */}
        {execution && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setQueryId(null)}>
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b flex items-center justify-between bg-white sticky top-0">
                <div>
                  <h2 className="text-xl font-bold">Execution Detail</h2>
                  <p className="text-sm font-mono text-slate-400">ID: {execution.id}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setQueryId(null)}><X className="w-5 h-5" /></Button>
              </div>
              <div className="flex-1 overflow-auto p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="border-slate-100"><CardContent className="pt-6"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Status</p><StatusBadge status={execution.status} /></CardContent></Card>
                  <Card className="border-slate-100"><CardContent className="pt-6"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Duration</p><p className="text-2xl font-bold">{execution.conversation_time || 0}s</p></CardContent></Card>
                  <Card className="border-slate-100"><CardContent className="pt-6"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Cost</p><p className="text-2xl font-bold">${((execution.total_cost || 0)/100).toFixed(4)}</p></CardContent></Card>
                </div>
                <Card className="border-slate-100">
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4 text-blue-500" /> Transcript</CardTitle></CardHeader>
                  <CardContent><div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-[14px] leading-relaxed font-sans max-h-[300px] overflow-auto">{execution.transcript || "No transcript available."}</div></CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
