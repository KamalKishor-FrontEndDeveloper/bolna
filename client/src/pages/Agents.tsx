import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useAgents, useCreateAgent } from "@/hooks/use-bolna";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bot, Plus, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { motion } from "framer-motion";

const DEFAULT_AGENT_CONFIG = {
  agent_config: {
    agent_name: "New Agent",
    agent_welcome_message: "Hello, how can I help you today?",
    tasks: [],
    webhook_url: ""
  }
};

export default function Agents() {
  const { data: agents, isLoading } = useAgents();
  const { mutate: createAgent, isPending: isCreating } = useCreateAgent();
  const [isOpen, setIsOpen] = useState(false);
  
  // Form State
  const [configJson, setConfigJson] = useState(JSON.stringify(DEFAULT_AGENT_CONFIG, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleCreate = () => {
    try {
      const parsed = JSON.parse(configJson);
      setJsonError(null);
      createAgent(parsed, {
        onSuccess: () => setIsOpen(false)
      });
    } catch (e) {
      setJsonError("Invalid JSON format");
    }
  };

  return (
    <Layout>
      <PageHeader 
        title="Agents" 
        description="Manage your AI voice agents"
        action={
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30">
                <Plus className="w-4 h-4" /> Create Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Create New Agent</DialogTitle>
              </DialogHeader>
              
              <div className="flex-1 overflow-auto py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Agent Configuration (JSON)</Label>
                  <p className="text-xs text-slate-500">
                    Define agent behavior, tasks, and prompts. Refer to Bolna docs for structure.
                  </p>
                  <Textarea 
                    value={configJson}
                    onChange={(e) => setConfigJson(e.target.value)}
                    className="font-mono text-sm h-[400px] bg-slate-50"
                  />
                  {jsonError && <p className="text-sm text-red-500">{jsonError}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Agent
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : !agents || agents.length === 0 ? (
        <EmptyState 
          icon={Bot} 
          title="No Agents Found" 
          description="You haven't created any voice agents yet. Get started by creating one."
          actionLabel="Create Agent"
          onAction={() => setIsOpen(true)}
        />
      ) : (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {agents.map((agent: any) => (
            <Card key={agent.id} className="hover:shadow-md transition-shadow group">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                    <Bot className="w-5 h-5" />
                  </div>
                  <StatusBadge status={agent.status || 'Active'} />
                </div>
                <CardTitle className="truncate">{agent.agent_config?.agent_name || "Unnamed Agent"}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {agent.agent_config?.agent_welcome_message || "No description provided"}
                </CardDescription>
              </CardHeader>
              <CardFooter className="border-t bg-slate-50/50 p-4">
                <span className="text-xs font-mono text-slate-400 truncate w-full">ID: {agent.id}</span>
              </CardFooter>
            </Card>
          ))}
        </motion.div>
      )}
    </Layout>
  );
}
