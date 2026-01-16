import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useExecution, useAgents, useAgentExecutions, useBatches } from "@/hooks/use-bolna";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Clock, DollarSign, MessageSquare, History, PhoneIncoming, PhoneOutgoing, ExternalLink, Download, RefreshCw, StopCircle, Filter, Plus, BarChart3, X, FileText, Layers } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Batches() {
  const [searchId, setSearchId] = useState("");
  const { data: batches, isLoading } = useBatches();
  const { data: agents } = useAgents();

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
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Create New Batch
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2"><RefreshCw className="w-4 h-4" /> Refresh</Button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b bg-slate-50/30">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by Batch ID" 
                className="pl-9 h-9 bg-white border-slate-200"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Batch ID</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Agent</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center">Total Records</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center">Completed</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Created At</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3].map(i => (
                    <TableRow key={i}><TableCell colSpan={7} className="h-16 animate-pulse bg-slate-50/50" /></TableRow>
                  ))
                ) : batches && batches.length > 0 ? (
                  batches.map((batch: any) => (
                    <TableRow key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-mono text-[11px] text-slate-600">
                        {batch.id}
                      </TableCell>
                      <TableCell className="text-[13px] font-medium">
                        {agents?.find((a: any) => a.id === batch.agent_id)?.agent_config?.agent_name || batch.agent_id}
                      </TableCell>
                      <TableCell className="text-[13px] text-center">{batch.total_records || 0}</TableCell>
                      <TableCell className="text-[13px] text-center">{batch.completed_count || 0}</TableCell>
                      <TableCell><StatusBadge status={batch.status} /></TableCell>
                      <TableCell className="text-[12px]">
                        {batch.created_at ? format(new Date(batch.created_at), "dd MMM yy, HH:mm") : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={7} className="h-32 text-center text-slate-400 text-sm italic">No batches found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
