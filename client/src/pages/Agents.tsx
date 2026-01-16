import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bot, Plus, Loader2, MessageSquare, Mic, Cpu, Volume2, ArrowRight, Trash2, ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAgentRequestSchema, type CreateAgentRequest } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgents, useCreateAgent, useDeleteAgent } from "@/hooks/use-bolna";
import { Link } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DEFAULT_VALUES: CreateAgentRequest = {
  agent_config: {
    agent_name: "",
    agent_welcome_message: "Hello, how can I help you today?",
    tasks: [
      {
        task_type: "conversation",
        toolchain: {
          execution: "parallel",
          pipelines: [["transcriber", "llm", "synthesizer"]],
        },
        task_config: {
          transcriber: { model: "deepgram", language: "en", sampling_rate: 16000, stream: true },
          llm: { model: "gpt-4o", max_tokens: 100, temperature: 0.7, family: "openai" },
          synthesizer: { model: "elevenlabs", voice: "rachel", sampling_rate: 16000, stream: true },
        },
      }
    ],
    webhook_url: "",
  },
  agent_prompts: {
    task_1: {
      system_prompt: "You are a helpful AI assistant. Keep your responses concise and natural.",
    }
  }
};

export default function Agents() {
  const { data: agents, isLoading } = useAgents();
  const { mutate: createAgent, isPending: isCreating } = useCreateAgent();
  const { mutate: deleteAgent } = useDeleteAgent();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<CreateAgentRequest>({
    resolver: zodResolver(createAgentRequestSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onSubmit = (data: CreateAgentRequest) => {
    createAgent(data, {
      onSuccess: () => {
        setIsOpen(false);
        form.reset();
      }
    });
  };

  return (
    <Layout>
      <PageHeader 
        title="Agents" 
        description="Manage your AI voice agents"
        action={
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-agent" className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30">
                <Plus className="w-4 h-4" /> Create Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0">
              <DialogHeader className="p-6 border-b">
                <DialogTitle>Create New Voice Agent</DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
                  <div className="flex-1 overflow-auto p-6 space-y-8">
                    {/* Visual Flow Indicator */}
                    <div className="flex items-center justify-center gap-4 py-4 bg-slate-50 rounded-lg border border-dashed">
                      <div className="flex flex-col items-center gap-1">
                        <div className="p-2 bg-white rounded-full border shadow-sm"><Mic className="w-4 h-4 text-blue-500" /></div>
                        <span className="text-[10px] font-medium uppercase text-slate-500">Transcriber</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300" />
                      <div className="flex flex-col items-center gap-1">
                        <div className="p-2 bg-white rounded-full border shadow-sm"><Cpu className="w-4 h-4 text-purple-500" /></div>
                        <span className="text-[10px] font-medium uppercase text-slate-500">LLM</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300" />
                      <div className="flex flex-col items-center gap-1">
                        <div className="p-2 bg-white rounded-full border shadow-sm"><Volume2 className="w-4 h-4 text-green-500" /></div>
                        <span className="text-[10px] font-medium uppercase text-slate-500">Synthesizer</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="agent_config.agent_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Agent Name</FormLabel>
                            <FormControl><Input data-testid="input-agent-name" placeholder="e.g. Customer Support" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="agent_config.webhook_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Webhook URL (Optional)</FormLabel>
                            <FormControl><Input data-testid="input-webhook" placeholder="https://your-api.com/webhook" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="agent_config.agent_welcome_message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Welcome Message</FormLabel>
                          <FormControl><Input data-testid="input-welcome-message" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Tabs defaultValue="llm" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="transcriber">Transcriber</TabsTrigger>
                        <TabsTrigger value="llm">LLM & Prompt</TabsTrigger>
                        <TabsTrigger value="synthesizer">Synthesizer</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="transcriber" className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="agent_config.tasks.0.task_config.transcriber.model"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Model</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="deepgram">Deepgram</SelectItem>
                                    <SelectItem value="google">Google</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="agent_config.tasks.0.task_config.transcriber.language"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Language</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="es">Spanish</SelectItem>
                                    <SelectItem value="hi">Hindi</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="llm" className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="agent_config.tasks.0.task_config.llm.model"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Model</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                                    <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="agent_config.tasks.0.task_config.llm.temperature"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Temperature ({field.value})</FormLabel>
                                <FormControl><Input type="range" min="0" max="1" step="0.1" value={field.value} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="agent_prompts.task_1.system_prompt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>System Prompt</FormLabel>
                              <FormControl><Textarea data-testid="textarea-system-prompt" className="h-32" placeholder="Define agent personality..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>

                      <TabsContent value="synthesizer" className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="agent_config.tasks.0.task_config.synthesizer.model"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Provider</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                                    <SelectItem value="playht">PlayHT</SelectItem>
                                    <SelectItem value="google">Google</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="agent_config.tasks.0.task_config.synthesizer.voice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Voice</FormLabel>
                                <Input data-testid="input-voice" {...field} />
                              </FormItem>
                            )}
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>

                  <div className="flex justify-end gap-3 p-6 border-t bg-slate-50/50">
                    <Button data-testid="button-cancel" type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button data-testid="button-submit-agent" type="submit" disabled={isCreating}>
                      {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create Agent
                    </Button>
                  </div>
                </form>
              </Form>
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
            <Card key={agent.id} className="hover:shadow-md transition-shadow group overflow-hidden border-slate-200">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={agent.status || 'Active'} />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Agent?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{agent.agent_config?.agent_name || 'this agent'}" and all associated call records. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteAgent(agent.id)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="flex justify-between items-start mb-1">
                  <CardTitle className="truncate text-lg">{agent.agent_config?.agent_name || "Unnamed Agent"}</CardTitle>
                </div>
                <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                  {agent.agent_config?.agent_welcome_message || "No description provided"}
                </CardDescription>
                
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 font-medium uppercase tracking-wider">
                  <Mic className="w-3 h-3" />
                  <span>{agent.agent_config?.tasks?.[0]?.task_config?.transcriber?.model || "Standard"}</span>
                  <ArrowRight className="w-2 h-2" />
                  <Cpu className="w-3 h-3" />
                  <span>{agent.agent_config?.tasks?.[0]?.task_config?.llm?.model || "GPT-4"}</span>
                </div>

                <div className="mt-6">
                  <Link href={`/executions?agent_id=${agent.id}`}>
                    <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                      <ExternalLink className="w-3 h-3" /> View Call History
                    </Button>
                  </Link>
                </div>
              </CardContent>
              <CardFooter className="border-t bg-slate-50/50 p-4">
                <span className="text-[10px] font-mono text-slate-400 truncate w-full">ID: {agent.id}</span>
              </CardFooter>
            </Card>
          ))}
        </motion.div>
      )}
    </Layout>
  );
}
