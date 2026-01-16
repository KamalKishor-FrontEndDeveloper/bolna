import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useExecution, useAgents, useAgentExecutions } from "@/hooks/use-bolna";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Clock, DollarSign, MessageSquare, History, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";

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
      setSelectedAgentId(""); // Clear list view when searching specific ID
    }
  };

  const isLoading = isExecutionLoading || isListLoading;

  return (
    <Layout>
      <PageHeader title="Execution History" description="Look up call logs and execution details" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar / Filter */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Search by ID</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input 
                  placeholder="Execution UUID..." 
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="flex-1 h-9"
                />
                <Button type="submit" size="sm" disabled={isLoading}>
                  <Search className="w-4 h-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Filter by Agent</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedAgentId} onValueChange={(val) => {
                setSelectedAgentId(val);
                setQueryId(null);
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents?.map((agent: any) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.agent_config?.agent_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-8">
          {isLoading && (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {!isLoading && !queryId && !agentExecutions?.data && (
            <EmptyState 
              icon={History}
              title="No Executions Found"
              description="Search for a specific execution ID or select an agent to view history."
            />
          )}

          {/* List View */}
          {!isLoading && !queryId && agentExecutions?.data && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-1">Recent Calls</h3>
              {agentExecutions.data.map((exec: any) => (
                <Card 
                  key={exec.id} 
                  className="hover:shadow-md cursor-pointer border-slate-200 transition-all hover:border-primary/20"
                  onClick={() => {
                    setQueryId(exec.id);
                    setSearchId(exec.id);
                  }}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${exec.telephony_data?.direction === 'inbound' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                        {exec.telephony_data?.direction === 'inbound' ? <PhoneIncoming className="w-4 h-4" /> : <PhoneOutgoing className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-mono text-sm font-medium">{exec.telephony_data?.to_number || exec.telephony_data?.from_number}</p>
                        <p className="text-xs text-slate-400">{format(new Date(exec.created_at), "PP p")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-bold">${((exec.total_cost || 0)/100).toFixed(4)}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{exec.conversation_time || 0}s</p>
                      </div>
                      <StatusBadge status={exec.status} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Detail View */}
          {!isLoading && execution && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setQueryId(null)} className="text-slate-500">
                  ← Back to List
                </Button>
                <span className="text-xs font-mono text-slate-400">ID: {execution.id}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Status</p>
                    <div className="mt-2"><StatusBadge status={execution.status} /></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Duration</p>
                    </div>
                    <p className="text-2xl font-bold">{execution.conversation_time || 0}s</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Cost</p>
                    </div>
                    <p className="text-2xl font-bold">${((execution.total_cost || 0)/100).toFixed(4)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="w-4 h-4 text-primary" /> Transcript
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm whitespace-pre-wrap font-sans leading-relaxed max-h-[400px] overflow-auto">
                    {execution.transcript || "No transcript available."}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Telephony</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Recipient</span>
                      <span className="font-mono">{execution.telephony_data?.to_number}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">From</span>
                      <span className="font-mono">{execution.telephony_data?.from_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recording</span>
                      {execution.telephony_data?.recording_url ? (
                        <a href={execution.telephony_data.recording_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Listen</a>
                      ) : <span>N/A</span>}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Cost Breakdown</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {execution.cost_breakdown ? Object.entries(execution.cost_breakdown).map(([key, val]) => (
                       <div key={key} className="flex justify-between">
                         <span className="capitalize text-muted-foreground">{key}</span>
                         <span className="font-mono">${((val as number)/100).toFixed(4)}</span>
                       </div>
                    )) : <p className="text-muted-foreground text-xs italic">N/A</p>}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
