import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useAgents, useCreateAgent, useDeleteAgent, useUpdateAgent } from "@/hooks/use-bolna";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bot, Plus, Loader2, Mic, Cpu, Volume2, Search, Trash2, Save, MessageSquare, Wrench, BarChart3, Phone, Settings2, ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAgentRequestSchema, type CreateAgentRequest } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Separator } from "@/components/ui/separator";

const DEFAULT_VALUES: CreateAgentRequest = {
  agent_config: {
    agent_name: "New Agent",
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
  const { mutate: updateAgent, isPending: isUpdating } = useUpdateAgent();
  const { mutate: deleteAgent } = useDeleteAgent();
  
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedAgent = agents?.find((a: any) => a.id === selectedAgentId);

  const form = useForm<CreateAgentRequest>({
    resolver: zodResolver(createAgentRequestSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (selectedAgent) {
      form.reset({
        agent_config: selectedAgent.agent_config,
        agent_prompts: selectedAgent.agent_prompts || { task_1: { system_prompt: "" } }
      });
    } else {
      form.reset(DEFAULT_VALUES);
    }
  }, [selectedAgentId, selectedAgent, form]);

  const onSubmit = (data: CreateAgentRequest) => {
    if (selectedAgentId) {
      updateAgent({ id: selectedAgentId, data });
    } else {
      createAgent(data, {
        onSuccess: (res: any) => {
          setSelectedAgentId(res.agent_id);
        }
      });
    }
  };

  const filteredAgents = agents?.filter((a: any) => 
    a.agent_config?.agent_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden -m-6">
        {/* Sidebar: Agent List */}
        <div className="w-80 border-r bg-slate-50/50 flex flex-col">
          <div className="p-4 border-b space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-500">Your Agents</h2>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelectedAgentId(null)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search agents..." 
                className="pl-9 h-9 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse mx-2 mt-2" />
              ))
            ) : filteredAgents?.map((agent: any) => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className={`w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 group ${
                  selectedAgentId === agent.id 
                    ? "bg-white shadow-sm border border-slate-200 ring-1 ring-slate-200" 
                    : "hover:bg-slate-100/50"
                }`}
              >
                <div className={`p-2 rounded-lg ${selectedAgentId === agent.id ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{agent.agent_config?.agent_name || "Unnamed Agent"}</p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{agent.id.slice(0, 8)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content: Agent Configuration */}
        <div className="flex-1 overflow-auto bg-white flex flex-col">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
              <div className="p-6 border-b flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight">
                      {selectedAgentId ? selectedAgent?.agent_config?.agent_name : "Create New Agent"}
                    </h1>
                    <p className="text-sm text-slate-500">
                      {selectedAgentId ? `Last updated ${new Date().toLocaleTimeString()}` : "Configure your voice agent behavior"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {selectedAgentId && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Agent?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => { deleteAgent(selectedAgentId); setSelectedAgentId(null); }} className="bg-red-500">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button type="submit" className="gap-2 px-6" disabled={isCreating || isUpdating}>
                    {isCreating || isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {selectedAgentId ? "Save Changes" : "Create Agent"}
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <Tabs defaultValue="agent" className="w-full h-full flex flex-col">
                  <div className="px-6 border-b bg-slate-50/30">
                    <TabsList className="h-14 bg-transparent gap-6">
                      <TabsTrigger value="agent" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 gap-2">
                        <Bot className="w-4 h-4" /> Agent
                      </TabsTrigger>
                      <TabsTrigger value="llm" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 gap-2">
                        <Cpu className="w-4 h-4" /> LLM
                      </TabsTrigger>
                      <TabsTrigger value="audio" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 gap-2">
                        <Volume2 className="w-4 h-4" /> Audio
                      </TabsTrigger>
                      <TabsTrigger value="tools" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 gap-2">
                        <Wrench className="w-4 h-4" /> Tools
                      </TabsTrigger>
                      <TabsTrigger value="analytics" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 gap-2">
                        <BarChart3 className="w-4 h-4" /> Analytics
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-auto">
                    <TabsContent value="agent" className="m-0 space-y-8 p-8 max-w-4xl animate-in fade-in slide-in-from-bottom-2">
                      <section className="space-y-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-blue-600" />
                          <h3 className="font-semibold text-lg">Agent Welcome Message</h3>
                        </div>
                        <FormField
                          control={form.control}
                          name="agent_config.agent_welcome_message"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input className="text-lg h-14 px-4 bg-slate-50/50" placeholder="e.g. Hello, this is Poonam from Bolna University..." {...field} />
                              </FormControl>
                              <p className="text-xs text-slate-400">This will be the initial message from the agent. You can use variables here using {"{variable_name}"}</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </section>

                      <Separator />

                      <section className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Settings2 className="w-5 h-5 text-purple-600" />
                            <h3 className="font-semibold text-lg">Agent Prompt</h3>
                          </div>
                          <Button type="button" variant="outline" size="sm" className="gap-2">
                            <Cpu className="w-3 h-3" /> AI Edit
                          </Button>
                        </div>
                        <FormField
                          control={form.control}
                          name="agent_prompts.task_1.system_prompt"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea 
                                  className="min-h-[400px] font-sans leading-relaxed p-6 bg-slate-50/50 resize-none text-base" 
                                  placeholder="# PERSONALITY
You are [Agent_name: Poonam], [Gender: Female]..." 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </section>
                    </TabsContent>

                    <TabsContent value="llm" className="m-0 p-8 max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="agent_config.tasks.0.task_config.llm.model"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Model Family</FormLabel>
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
                    </TabsContent>

                    <TabsContent value="audio" className="m-0 p-8 max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="agent_config.tasks.0.task_config.synthesizer.model"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Synthesis Provider</FormLabel>
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
                              <FormLabel>Voice Name</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="tools" className="m-0 p-8 max-w-4xl">
                      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <Wrench className="w-12 h-12 text-slate-300 mb-4" />
                        <h4 className="font-semibold text-slate-600">Tool Configuration</h4>
                        <p className="text-sm text-slate-400">Add custom functions and API integrations</p>
                        <Button variant="outline" className="mt-6 gap-2" type="button">
                          <Plus className="w-4 h-4" /> Add Tool
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="analytics" className="m-0 p-8 max-w-4xl">
                      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <BarChart3 className="w-12 h-12 text-slate-300 mb-4" />
                        <h4 className="font-semibold text-slate-600">Agent Analytics</h4>
                        <p className="text-sm text-slate-400">View performance metrics for this agent</p>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
}
