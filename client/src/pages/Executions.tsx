import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useExecution } from "@/hooks/use-bolna";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Clock, DollarSign, MessageSquare } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";

export default function Executions() {
  const [searchId, setSearchId] = useState("");
  const [queryId, setQueryId] = useState<string | null>(null);
  
  const { data: execution, isLoading, error } = useExecution(queryId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      setQueryId(searchId.trim());
    }
  };

  return (
    <Layout>
      <PageHeader title="Execution History" description="Look up call logs and execution details" />

      <div className="max-w-2xl mx-auto mb-10">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <Input 
                placeholder="Enter Execution UUID..." 
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="text-center p-8 bg-red-50 rounded-xl text-red-600 border border-red-100">
          <p className="font-medium">Execution Not Found</p>
          <p className="text-sm opacity-80 mt-1">Check the ID and try again.</p>
        </div>
      )}

      {execution && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Status</p>
                <div className="mt-2">
                  <StatusBadge status={execution.status} />
                </div>
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
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Cost</p>
                </div>
                <p className="text-2xl font-bold">${((execution.total_cost || 0)/100).toFixed(4)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Date</p>
                </div>
                <p className="text-sm font-medium">
                  {execution.created_at ? format(new Date(execution.created_at), "PP p") : "N/A"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Transcript
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm whitespace-pre-wrap font-mono max-h-[500px] overflow-auto">
                  {execution.transcript || "No transcript available."}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Telephony Data</CardTitle></CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">To</span>
                    <span className="font-mono">{execution.telephony_data?.to_number}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">From</span>
                    <span className="font-mono">{execution.telephony_data?.from_number}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Provider</span>
                    <span className="capitalize">{execution.telephony_data?.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recording</span>
                    {execution.telephony_data?.recording_url ? (
                      <a 
                        href={execution.telephony_data.recording_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Listen
                      </a>
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Cost Breakdown</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {execution.cost_breakdown ? Object.entries(execution.cost_breakdown).map(([key, val]) => (
                     <div key={key} className="flex justify-between">
                       <span className="capitalize text-muted-foreground">{key}</span>
                       <span className="font-mono">${((val as number)/100).toFixed(4)}</span>
                     </div>
                  )) : <p className="text-muted-foreground">No breakdown available</p>}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
