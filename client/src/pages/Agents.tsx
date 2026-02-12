import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useAgents, useCreateAgent, useDeleteAgent, useUpdateAgent, useModels, useKnowledgebases, useVoices, useStopAgentCalls, useAgentExecutions, useAgent } from "@/hooks/use-bolna";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bot, Plus, Loader2, Mic, Cpu, Volume2, Search, Trash2, Save, MessageSquare, Wrench, BarChart3, Phone, Settings2, ArrowRight, Upload, FileText } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAgentRequestSchema, type CreateAgentRequest } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover as UIPopover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import AddFaqBlockDialog from '@/components/AddFaqBlockDialog';
import TransferCallDialog from '@/components/TransferCallDialog';
import { Switch } from "@/components/ui/switch";
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
import MakeCallDialog from '@/components/MakeCallDialog';
import CreateAgentModal from '@/components/CreateAgentModal';
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
          llm: ({ model: "gpt-4o", max_tokens: 100, temperature: 0.7, family: "openai", base_url: "https://api.openai.com/v1", summarization_details: "", extraction_details: "" } as any),
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
  const { mutate: stopAgentCalls, isPending: isStoppingCalls } = useStopAgentCalls();
  
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [newWhitelistNumber, setNewWhitelistNumber] = useState("");
  const [whitelistError, setWhitelistError] = useState("");

  const selectedAgent = agents?.find((a: any) => String(a.id) === selectedAgentId);

  // Fetch detailed agent data from ThinkVoicewhen available (some fields like calling_guardrails are only present on the detail endpoint)
  const bolnaAgentId = selectedAgent?.bolna_agent_id || selectedAgent?.id || null;
  const { data: agentDetail, isLoading: isAgentLoading } = useAgent(bolnaAgentId);
  const selectedAgentFull = agentDetail || selectedAgent;

  const { data: executionsData } = useAgentExecutions(
    selectedAgentFull?.bolna_agent_id || selectedAgentFull?.id || null,
    { page_size: 100, status: 'queued' }
  );
  const queuedCount = executionsData?.data?.length || 0;

  const { data: modelsData, isLoading: modelsLoading } = useModels();
  const { data: kbsData, isLoading: kbLoading } = useKnowledgebases();

  const form = useForm<CreateAgentRequest>({
    resolver: zodResolver(createAgentRequestSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onSubmit",
  });

  // Watch the synthesizer provider to trigger re-renders
  const synthesizerProvider = form.watch('agent_config.tasks.0.tools_config.synthesizer.provider' as any) || 'elevenlabs';
  console.log('[AGENTS] Current synthesizerProvider:', synthesizerProvider);

  // Select first agent by default when agents load
  useEffect(() => {
    if (!isLoading && !selectedAgentId && agents && agents.length > 0) {
      setSelectedAgentId(String(agents[0].id));
    }
  }, [agents, selectedAgentId, isLoading]);

  useEffect(() => {
    if (selectedAgent) {
      // Map ThinkVoicev2 API GET response to form structure
      const task = selectedAgent.tasks?.[0];
      const toolsConfig = task?.tools_config;
      const llmAgent = toolsConfig?.llm_agent;
      const llmConfig = llmAgent?.llm_config;
      
      form.reset({
        agent_config: {
          agent_name: selectedAgent.agent_name,
          agent_welcome_message: selectedAgent.agent_welcome_message || "",
          // Prefer webhook under agent_config (returned by ThinkVoicev2), fallback to top-level if present
          webhook_url: (selectedAgent.agent_config?.webhook_url ?? selectedAgent.webhook_url) || "",
          tasks: [
            {
              task_type: task?.task_type || "conversation",
              toolchain: task?.toolchain || { execution: "parallel", pipelines: [["transcriber", "llm", "synthesizer"]] },
              task_config: {
                hangup_after_silence: task?.task_config?.hangup_after_silence,
                incremental_delay: task?.task_config?.incremental_delay,
                number_of_words_for_interruption: task?.task_config?.number_of_words_for_interruption,
                hangup_after_LLMCall: task?.task_config?.hangup_after_LLMCall,
                call_cancellation_prompt: task?.task_config?.call_cancellation_prompt,
                backchanneling: task?.task_config?.backchanneling,
                backchanneling_message_gap: task?.task_config?.backchanneling_message_gap,
                backchanneling_start_delay: task?.task_config?.backchanneling_start_delay,
                ambient_noise: task?.task_config?.ambient_noise,
                ambient_noise_track: task?.task_config?.ambient_noise_track,
                call_terminate: task?.task_config?.call_terminate,
                voicemail: task?.task_config?.voicemail,
                inbound_limit: task?.task_config?.inbound_limit,
                whitelist_phone_numbers: task?.task_config?.whitelist_phone_numbers || null,
                disallow_unknown_numbers: task?.task_config?.disallow_unknown_numbers
              } as any,
              tools_config: {
                transcriber: {
                  provider: toolsConfig?.transcriber?.provider || "deepgram",
                  model: toolsConfig?.transcriber?.model || "nova-3",
                  language: toolsConfig?.transcriber?.language || "en",
                  sampling_rate: toolsConfig?.transcriber?.sampling_rate || 16000,
                  stream: toolsConfig?.transcriber?.stream ?? true,
                  encoding: toolsConfig?.transcriber?.encoding || "linear16",
                  endpointing: toolsConfig?.transcriber?.endpointing || 250
                },
                llm: {
                  model: llmConfig?.model || "gpt-4o-mini",
                  max_tokens: llmConfig?.max_tokens || 150,
                  temperature: llmConfig?.temperature || 0.1,
                  family: llmConfig?.family || llmConfig?.provider || "openai",
                  provider: llmConfig?.provider || llmConfig?.family || "openai",
                  base_url: llmConfig?.base_url || "https://api.openai.com/v1",
                  summarization_details: llmConfig?.summarization_details || "",
                  extraction_details: llmConfig?.extraction_details || "",
                  presence_penalty: llmConfig?.presence_penalty ?? 0,
                  frequency_penalty: llmConfig?.frequency_penalty ?? 0,
                  top_p: llmConfig?.top_p ?? 0.9,
                  min_p: llmConfig?.min_p ?? 0.1,
                  top_k: llmConfig?.top_k ?? 0,
                  request_json: llmConfig?.request_json ?? false,
                  agent_flow_type: llmConfig?.agent_flow_type || "streaming",
                  reasoning_effort: llmConfig?.reasoning_effort || null,
                  stop: llmConfig?.stop || null
                },
                synthesizer: {
                  provider: toolsConfig?.synthesizer?.provider || "elevenlabs",
                  model: toolsConfig?.synthesizer?.provider_config?.model,
                  voice: toolsConfig?.synthesizer?.provider_config?.voice || toolsConfig?.synthesizer?.voice || "rachel",
                  voice_id: toolsConfig?.synthesizer?.provider_config?.voice_id || toolsConfig?.synthesizer?.voice_id,
                  provider_config: toolsConfig?.synthesizer?.provider_config || {},
                  stream: toolsConfig?.synthesizer?.stream ?? true,
                  buffer_size: toolsConfig?.synthesizer?.buffer_size || 250
                },
                input: toolsConfig?.input || { provider: "plivo", format: "wav" },
                output: toolsConfig?.output || { provider: "plivo", format: "wav" },
                api_tools: {
                  tools: toolsConfig?.api_tools?.tools || [],
                  tools_params: toolsConfig?.api_tools?.tools_params || {}
                }
              } as any
            } as any
          ]
        },
        agent_prompts: selectedAgent.agent_prompts || { task_1: { system_prompt: "" } }
      });

      // Ensure routes default exists so UI editors can read/write safely
      (form as any).setValue('agent_config.tasks.0.tools_config.llm_agent.routes', selectedAgent.tasks?.[0]?.tools_config?.llm_agent?.routes || { embedding_model: 'snowflake/snowflake-arctic-embed-m', routes: [] });
      
      // Set calling_guardrails and ingest_source_config (prefer values under agent_config)
      const agentCfg = selectedAgent.agent_config || {};
      if (agentCfg.calling_guardrails) {
        (form as any).setValue('agent_config.calling_guardrails', agentCfg.calling_guardrails);
      } else if (selectedAgent.calling_guardrails) {
        (form as any).setValue('agent_config.calling_guardrails', selectedAgent.calling_guardrails);
      }
      if (agentCfg.ingest_source_config) {
        (form as any).setValue('agent_config.ingest_source_config', agentCfg.ingest_source_config);
      } else if (selectedAgent.ingest_source_config) {
        (form as any).setValue('agent_config.ingest_source_config', selectedAgent.ingest_source_config);
      }
      
      // Set gpt_assistants
      if (selectedAgent.gpt_assistants) {
        (form as any).setValue('gpt_assistants', selectedAgent.gpt_assistants);
      }
    } else {
      form.reset(DEFAULT_VALUES);
      (form as any).setValue('agent_config.tasks.0.tools_config.llm_agent.routes', { embedding_model: 'snowflake/snowflake-arctic-embed-m', routes: [] });
      (form as any).setValue('agent_config.tasks.0.task_config.whitelist_phone_numbers', null);
    }
  }, [selectedAgentId, selectedAgent, form]);

  // If we fetch a detailed agent from the API, override form with the detailed values (detail endpoint may include fields missing in list)
  useEffect(() => {
    if (!agentDetail) return;
    const src = agentDetail as any;
    const task = src.tasks?.[0] || {};
    const toolsConfig = task?.tools_config || {};
    const llmAgent = toolsConfig?.llm_agent;
    const llmConfig = llmAgent?.llm_config;

    form.reset({
      agent_config: {
        agent_name: src.agent_config?.agent_name ?? src.agent_name ?? "Unnamed Agent",
        agent_welcome_message: src.agent_config?.agent_welcome_message ?? src.agent_welcome_message ?? "",
        webhook_url: src.agent_config?.webhook_url ?? src.webhook_url ?? "",
        calling_guardrails: src.agent_config?.calling_guardrails ?? src.calling_guardrails ?? undefined,
        ingest_source_config: src.agent_config?.ingest_source_config ?? src.ingest_source_config ?? undefined,
        tasks: [
          {
            task_type: task?.task_type || "conversation",
            toolchain: task?.toolchain || { execution: "parallel", pipelines: [["transcriber", "llm", "synthesizer"]] },
            task_config: task?.task_config || {},
            tools_config: toolsConfig || {}
          }
        ]
      },
      agent_prompts: src.agent_prompts || { task_1: { system_prompt: "" } }
    });

    (form as any).setValue('agent_config.tasks.0.tools_config.llm_agent.routes', src.tasks?.[0]?.tools_config?.llm_agent?.routes || { embedding_model: 'snowflake/snowflake-arctic-embed-m', routes: [] });

    // If detailed agent includes llm_agent.llm_config, mirror it into tools_config.llm so UI fields bind correctly
    const detailedLlmAgent = src.tasks?.[0]?.tools_config?.llm_agent;
    const detailedLlmCfg = detailedLlmAgent?.llm_config;
    if (detailedLlmCfg) {
      (form as any).setValue('agent_config.tasks.0.tools_config.llm', {
        provider: detailedLlmCfg.provider || detailedLlmCfg.family || 'openai',
        family: detailedLlmCfg.family || detailedLlmCfg.provider || undefined,
        model: detailedLlmCfg.model || undefined,
        max_tokens: detailedLlmCfg.max_tokens ?? 150,
        temperature: detailedLlmCfg.temperature ?? 0.1,
        presence_penalty: detailedLlmCfg.presence_penalty ?? 0,
        frequency_penalty: detailedLlmCfg.frequency_penalty ?? 0,
        top_p: detailedLlmCfg.top_p ?? 0.9,
        min_p: detailedLlmCfg.min_p ?? 0.1,
        top_k: detailedLlmCfg.top_k ?? 0,
        request_json: detailedLlmCfg.request_json ?? false,
        agent_flow_type: detailedLlmCfg.agent_flow_type || 'streaming',
        reasoning_effort: detailedLlmCfg.reasoning_effort || null,
        stop: detailedLlmCfg.stop || null,
        summarization_details: detailedLlmCfg.summarization_details || null,
        extraction_details: detailedLlmCfg.extraction_details || null,
        base_url: detailedLlmCfg.base_url || ''
      });
    }

    // If detailed agent includes synthesizer.provider_config voice/voice_id, mirror them into top-level synthesizer fields
    const detailedSynth = src.tasks?.[0]?.tools_config?.synthesizer;
    if (detailedSynth) {
      // Ensure provider is set on the form so dependent controls behave correctly
      if (detailedSynth.provider) {
        (form as any).setValue('agent_config.tasks.0.tools_config.synthesizer.provider', detailedSynth.provider);
      }

      const voiceId = detailedSynth.provider_config?.voice_id ?? detailedSynth.voice_id;
      if (voiceId) {
        (form as any).setValue('agent_config.tasks.0.tools_config.synthesizer.voice', voiceId);
        (form as any).setValue('agent_config.tasks.0.tools_config.synthesizer.provider_config.voice_id', voiceId);
      }
    }

    // Set gpt_assistants from detailed agent
    if (src.gpt_assistants) {
      (form as any).setValue('gpt_assistants', src.gpt_assistants);
    }

  }, [agentDetail, form]);

  // Ensure provider/model default sync when models load or selected agent changes
  useEffect(() => {
    if (!modelsLoading && modelsData) {
      const currentModel = form.getValues('agent_config.tasks.0.tools_config.llm.model' as any);
      if (currentModel) {
        const sel = (modelsData.llmModels || []).find((m: any) => m.model === currentModel);
        if (sel && sel.provider) {
          (form as any).setValue('agent_config.tasks.0.tools_config.llm.provider', sel.provider || sel.family || sel.library || '');
          if (sel.base_url) (form as any).setValue('agent_config.tasks.0.tools_config.llm.base_url', sel.base_url);
        }
      } else {
        const first = (modelsData.llmModels || [])[0];
        if (first && !(form as any).getValues('agent_config.tasks.0.tools_config.llm.provider')) {
          (form as any).setValue('agent_config.tasks.0.tools_config.llm.provider', first.provider || first.family || first.library || '');
          (form as any).setValue('agent_config.tasks.0.tools_config.llm.model', (form as any).getValues('agent_config.tasks.0.tools_config.llm.model') || first.model);
        }
      }
    }
  }, [modelsData, modelsLoading, selectedAgentId]);

  const onSubmitError = (errors: any) => {
    console.error('[AGENTS] Form validation errors:', errors);
  };

  const onSubmit = (data: CreateAgentRequest) => {
    console.log('[AGENTS] Form submitted', { selectedAgentId, data });
    
    // Get actual agent data from ThinkVoiceto preserve existing structure
    const existingAgent = selectedAgentFull?.agent_config?.tasks?.[0] || selectedAgentFull?.tasks?.[0];
    const task = data.agent_config.tasks?.[0] as any;
    const tc = (task?.task_config as any) || {};
    const toolsCfg = (task?.tools_config as any) || {};

    // Transform legacy form data to new ThinkVoiceAPI v2 structure
    const transformedData = {
      agent_config: {
        agent_name: data.agent_config.agent_name,
        agent_welcome_message: data.agent_config.agent_welcome_message,
        webhook_url: data.agent_config.webhook_url || null,
        agent_type: "other",
        calling_guardrails: (data.agent_config as any).calling_guardrails || undefined,
        ingest_source_config: (data.agent_config as any).ingest_source_config || undefined,
        tasks: [
          {
            task_type: "conversation",
            tools_config: {
              llm_agent: (() => {
                const formRoutes = (form as any).getValues('agent_config.tasks.0.tools_config.llm_agent.routes');
                const defaultObj = {
                  agent_type: "simple_llm_agent",
                  agent_flow_type: toolsCfg.llm?.agent_flow_type || "streaming",
                  llm_config: {
                    provider: toolsCfg.llm?.provider || toolsCfg.llm?.family || "openai",
                    family: toolsCfg.llm?.family || toolsCfg.llm?.provider || "openai",
                    model: toolsCfg.llm?.model || "gpt-4o-mini",
                    max_tokens: toolsCfg.llm?.max_tokens || 150,
                    temperature: toolsCfg.llm?.temperature || 0.1,
                    presence_penalty: toolsCfg.llm?.presence_penalty ?? 0,
                    frequency_penalty: toolsCfg.llm?.frequency_penalty ?? 0,
                    top_p: toolsCfg.llm?.top_p ?? 0.9,
                    min_p: toolsCfg.llm?.min_p ?? 0.1,
                    top_k: toolsCfg.llm?.top_k ?? 0,
                    request_json: toolsCfg.llm?.request_json ?? false,
                    reasoning_effort: toolsCfg.llm?.reasoning_effort || null,
                    stop: toolsCfg.llm?.stop || null,
                    summarization_details: toolsCfg.llm?.summarization_details || null,
                    extraction_details: toolsCfg.llm?.extraction_details || null,
                    base_url: toolsCfg.llm?.base_url || "https://api.openai.com/v1"
                  },
                  routes: formRoutes || { embedding_model: 'snowflake/snowflake-arctic-embed-m', routes: [] }
                } as any;

                if (existingAgent?.tools_config?.llm_agent) {
                  // merge routes from form if present
                  const merged = { ...(existingAgent.tools_config.llm_agent as any) };
                  if (formRoutes) merged.routes = formRoutes;
                  // Update llm_config from form
                  if (toolsCfg.llm) merged.llm_config = defaultObj.llm_config;
                  return merged;
                }

                return defaultObj;
              })(),
              synthesizer: (() => {
                if (toolsCfg.synthesizer) {
                  return {
                    provider: toolsCfg.synthesizer.provider || "elevenlabs",
                    provider_config: toolsCfg.synthesizer.provider_config || {},
                    stream: toolsCfg.synthesizer.stream ?? true,
                    buffer_size: toolsCfg.synthesizer.buffer_size || 250,
                    audio_format: "wav"
                  };
                }
                return existingAgent?.tools_config?.synthesizer || {
                  provider: "elevenlabs",
                  provider_config: {
                    voice: "Nila",
                    voice_id: "V9LCAAi4tTlqe9JadbCo",
                    model: "eleven_turbo_v2_5"
                  },
                  stream: true,
                  buffer_size: 250,
                  audio_format: "wav"
                };
              })(),
              transcriber: (() => {
                if (toolsCfg.transcriber) {
                  return {
                    provider: toolsCfg.transcriber.provider || "deepgram",
                    model: toolsCfg.transcriber.model || "nova-3",
                    language: toolsCfg.transcriber.language || "en",
                    stream: toolsCfg.transcriber.stream ?? true,
                    sampling_rate: toolsCfg.transcriber.sampling_rate || 16000,
                    encoding: toolsCfg.transcriber.encoding || "linear16",
                    endpointing: toolsCfg.transcriber.endpointing || 250
                  };
                }
                return existingAgent?.tools_config?.transcriber || {
                  provider: "deepgram",
                  model: "nova-3",
                  language: "en",
                  stream: true,
                  sampling_rate: 16000,
                  encoding: "linear16",
                  endpointing: 250
                };
              })(),
              input: toolsCfg.input || existingAgent?.tools_config?.input || { provider: "plivo", format: "wav" },
              output: toolsCfg.output || existingAgent?.tools_config?.output || { provider: "plivo", format: "wav" },
              api_tools: toolsCfg.api_tools || existingAgent?.tools_config?.api_tools || null
            },
            toolchain: existingAgent?.toolchain || {
              execution: "parallel",
              pipelines: [["transcriber", "llm", "synthesizer"]]
            },
            task_config: (() => {
              // merge form task_config values (tc) over existingAgent's task_config
              const base = existingAgent?.task_config || {};
              const merged = { ...base };

              // Only include top-level task_config properties, not nested transcriber/llm/synthesizer/tools_config
              merged.hangup_after_silence = tc.hangup_after_silence ?? merged.hangup_after_silence ?? 10;
              merged.incremental_delay = tc.incremental_delay ?? merged.incremental_delay ?? 400;
              merged.number_of_words_for_interruption = tc.number_of_words_for_interruption ?? merged.number_of_words_for_interruption ?? 2;
              merged.hangup_after_LLMCall = tc.hangup_after_LLMCall ?? merged.hangup_after_LLMCall ?? false;
              merged.call_cancellation_prompt = tc.call_cancellation_prompt ?? merged.call_cancellation_prompt ?? null;
              merged.backchanneling = tc.backchanneling ?? merged.backchanneling ?? false;
              merged.backchanneling_message_gap = tc.backchanneling_message_gap ?? merged.backchanneling_message_gap ?? 5;
              merged.backchanneling_start_delay = tc.backchanneling_start_delay ?? merged.backchanneling_start_delay ?? 5;
              merged.ambient_noise = tc.ambient_noise ?? merged.ambient_noise ?? false;
              merged.ambient_noise_track = tc.ambient_noise_track ?? merged.ambient_noise_track ?? "office-ambience";
              merged.call_terminate = tc.call_terminate ?? merged.call_terminate ?? 90;
              merged.voicemail = tc.voicemail ?? merged.voicemail ?? false;
              merged.inbound_limit = tc.inbound_limit ?? merged.inbound_limit ?? -1;
              merged.whitelist_phone_numbers = (tc.whitelist_phone_numbers && tc.whitelist_phone_numbers.length) ? tc.whitelist_phone_numbers : (merged.whitelist_phone_numbers || null);
              merged.disallow_unknown_numbers = tc.disallow_unknown_numbers ?? merged.disallow_unknown_numbers ?? false;

              // Remove nested config objects that should be in tools_config
              delete merged.transcriber;
              delete merged.llm;
              delete merged.synthesizer;
              delete merged.tools_config;

              return merged;
            })()
          }
        ]
      },
      agent_prompts: data.agent_prompts,
      gpt_assistants: (form as any).getValues('gpt_assistants') || undefined
    };

    console.log('[AGENTS] Transformed data', JSON.stringify(transformedData, null, 2));

    if (selectedAgentId) {
      console.log('[AGENTS] Calling updateAgent', { id: selectedAgentId });
      updateAgent({ id: selectedAgentId, data: transformedData });
    } else {
      console.log('[AGENTS] Calling createAgent');
      createAgent(transformedData, {
        onSuccess: (res: any) => {
          setSelectedAgentId(String(res.agent_id));
        }
      });
    }
  };

  const filteredAgents = agents?.filter((a: any) => 
    (a.agent_config?.agent_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex h-full min-h-0 overflow-hidden -m-6">
        {/* Sidebar: Agent List */}
        <div className="w-80 border-r bg-slate-50/50 flex flex-col">
          <div className="p-4 border-b space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-500">Your Agents</h2>
              <CreateAgentModal 
                onCreated={(id) => setSelectedAgentId(id)}
                trigger={
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <Plus className="w-4 h-4" />
                  </Button>
                }
              />
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
              <div
                key={agent.id}
                className={`w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 group ${
                  selectedAgentId === String(agent.id) 
                    ? "bg-white shadow-sm border border-slate-200 ring-1 ring-slate-200" 
                    : "hover:bg-slate-100/50"
                }`}
              >
                <button
                  onClick={() => setSelectedAgentId(String(agent.id))}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <div className={`p-2 rounded-lg ${selectedAgentId === String(agent.id) ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate text-left">{agent.agent_config?.agent_name || "Unnamed Agent"}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate text-left">{String(agent.id).slice(0, 8)}</p>
                  </div>
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Agent?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => { deleteAgent(String(agent.id)); if (selectedAgentId === String(agent.id)) setSelectedAgentId(null); }} className="bg-red-500">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content: Agent Configuration */}
        <div className="flex-1 overflow-auto bg-white flex flex-col min-h-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="h-full flex flex-col">
              <div className="p-6 border-b flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight">
                      {selectedAgentId ? (
                        isAgentLoading ? (
                          <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /> Loading...</span>
                        ) : (
                          selectedAgentFull?.agent_config?.agent_name || selectedAgentFull?.agent_name || 'Unnamed Agent'
                        )
                      ) : "Create New Agent"}
                    </h1>
                    <p className="text-sm text-slate-500">
                      {selectedAgentId ? (selectedAgentFull?.updated_at ? `Last updated ${new Date(selectedAgentFull.updated_at).toLocaleString()}` : `Last updated ${new Date().toLocaleTimeString()}`) : "Configure your voice agent behavior"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {selectedAgentId && (selectedAgent?.bolna_agent_id || selectedAgent?.id) && (
                    <>
                      <MakeCallDialog 
                        agentId={selectedAgentFull?.bolna_agent_id || selectedAgentFull?.id}
                        trigger={
                          <Button variant="outline" className="gap-2">
                            <Phone className="w-4 h-4" />
                            Make Call
                          </Button>
                        }
                      />
                      <Button 
                        variant="outline" 
                        className="gap-2"
                        onClick={() => stopAgentCalls(selectedAgentFull?.bolna_agent_id || selectedAgentFull?.id)}
                        disabled={isStoppingCalls || queuedCount === 0}
                        title={queuedCount === 0 ? "No queued calls" : `Stop ${queuedCount} queued call(s)`}
                      >
                        {isStoppingCalls ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                        Stop All Queued {queuedCount > 0 && `(${queuedCount})`}
                      </Button>
                    </>
                  )}
                  <Button 
                    type="button" 
                    onClick={() => {
                      const data = form.getValues();
                      onSubmit(data as CreateAgentRequest);
                    }}
                    className="gap-2 px-6" 
                    disabled={isCreating || isUpdating}
                  >
                    {isCreating || isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {selectedAgentId ? "Save Changes" : "Create Agent"}
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto min-h-0">
                <Tabs defaultValue="agent" className="w-full h-full flex flex-col">
                  <div className="px-6 border-b bg-slate-50/30">
                    <TabsList className="h-14 bg-transparent gap-6 overflow-x-auto no-scrollbar">
                      <TabsTrigger value="agent" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 gap-2">
                        <Bot className="w-4 h-4" /> Agent
                      </TabsTrigger>
                      <TabsTrigger value="llm" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 gap-2">
                        <Cpu className="w-4 h-4" /> LLM
                      </TabsTrigger>
                      <TabsTrigger value="audio" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 gap-2">
                        <Volume2 className="w-4 h-4" /> Audio
                      </TabsTrigger>
                      <TabsTrigger value="engine" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 gap-2">
                        <Settings2 className="w-4 h-4" /> Engine
                      </TabsTrigger>
                      <TabsTrigger value="call" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 gap-2">
                        <Phone className="w-4 h-4" /> Call
                      </TabsTrigger>
                      {/* <TabsTrigger value="tools" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 gap-2">
                        <Wrench className="w-4 h-4" /> Tools
                      </TabsTrigger> */}
                      <TabsTrigger value="inbound" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 gap-2">
                        <Phone className="w-4 h-4" /> Inbound
                      </TabsTrigger>
                      <TabsTrigger value="assistants" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 gap-2">
                        <Bot className="w-4 h-4" /> Assistants
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-auto min-h-0">
                    <TabsContent value="agent" className="flex-1 overflow-auto min-h-0 m-0 space-y-8 p-8 max-w-4xl animate-in fade-in slide-in-from-bottom-2">
                      <section className="space-y-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-blue-600" />
                          <h3 className="font-semibold text-lg">Agent Configuration</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="agent_config.agent_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Agent Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g. Customer Support Agent" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={"agent_config.agent_type" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Agent Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || 'other'}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="other">Other</SelectItem>
                                    <SelectItem value="sales">Sales</SelectItem>
                                    <SelectItem value="support">Support</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="agent_config.agent_welcome_message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Agent Welcome Message</FormLabel>
                              <FormControl>
                                <Input className="text-lg h-14 px-4 bg-slate-50/50" placeholder="e.g. Hello, this is Poonam from ThinkVoiceUniversity..." {...field} />
                              </FormControl>
                              <p className="text-xs text-slate-400">This will be the initial message from the agent. You can use variables here using {"{variable_name}"}</p>
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
                              <FormControl>
                                <Input {...field} value={field.value || ''} placeholder="https://your-webhook.com/endpoint" />
                              </FormControl>
                              <p className="text-xs text-slate-400">Receive conversation data via webhook</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </section>

                      <Separator />

                      {/* Calling Guardrails */}
                      <section className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Phone className="w-5 h-5 text-green-600" />
                          <h3 className="font-semibold text-lg">Calling Guardrails (Optional)</h3>
                        </div>
                        <p className="text-sm text-slate-500">Set time-based call restrictions in recipient's timezone</p>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={"agent_config.calling_guardrails.call_start_hour" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Call Start Hour (0-23)</FormLabel>
                                <FormControl>
                                  <Input type="number" min={0} max={23} {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g. 9" />
                                </FormControl>
                                <p className="text-xs text-slate-400">Earliest hour to make calls</p>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.calling_guardrails.call_end_hour" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Call End Hour (0-23)</FormLabel>
                                <FormControl>
                                  <Input type="number" min={0} max={23} {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g. 17" />
                                </FormControl>
                                <p className="text-xs text-slate-400">Latest hour to make calls</p>
                              </FormItem>
                            )}
                          />
                        </div>
                      </section>

                      <Separator />

                      {/* Agent Metadata (Read-only) */}
                      {selectedAgentId && selectedAgentFull && (
                        <section className="space-y-4">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-slate-600" />
                            <h3 className="font-semibold text-lg">Agent Metadata</h3>
                          </div>
                          <div className="rounded-lg border p-4 bg-slate-50">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-slate-500">Agent ID:</span>
                                <p className="font-mono text-xs mt-1">{selectedAgentFull.id}</p>
                              </div>
                              <div>
                                <span className="text-slate-500">Status:</span>
                                <p className="mt-1">{selectedAgentFull.agent_status || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-slate-500">Created:</span>
                                <p className="mt-1">{selectedAgentFull.created_at ? new Date(selectedAgentFull.created_at).toLocaleString() : 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-slate-500">Updated:</span>
                                <p className="mt-1">{selectedAgentFull.updated_at ? new Date(selectedAgentFull.updated_at).toLocaleString() : 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-slate-500">Restricted:</span>
                                <p className="mt-1">{selectedAgentFull.restricted ? 'Yes' : 'No'}</p>
                              </div>
                              {selectedAgentFull.inbound_phone_number && (
                                <div>
                                  <span className="text-slate-500">Inbound Number:</span>
                                  <p className="font-mono mt-1">{selectedAgentFull.inbound_phone_number}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </section>
                      )}

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

                    <TabsContent value="llm" className="flex-1 overflow-auto min-h-0 m-0 p-8 max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="grid grid-cols-2 gap-6">
                        {/* Provider Select */}
                        <FormField
                          control={form.control}
                          name={"agent_config.tasks.0.tools_config.llm.provider" as any}
                          render={({ field }) => {
                            const options = modelsData?.llmModels ?? [];
                            const providers = Array.from(new Set(options.map((m: any) => (m.provider || m.family || m.library || 'other')))).filter(Boolean);

                            const providerNames: Record<string, string> = {
                              openai: 'OpenAI',
                              azure: 'Azure',
                              openrouter: 'OpenRouter',
                              deepseek: 'Deepseek',
                              anthropic: 'Anthropic',
                              other: 'Other'
                            };

                            const formatProvider = (p: string) => providerNames[p] ?? (String(p).charAt(0).toUpperCase() + String(p).slice(1));

                            return (
                              <FormItem>
                                <FormLabel>Choose LLM model (Provider)</FormLabel>
                                <Select onValueChange={(val: string) => {
                                  // set provider and also default model
                                  field.onChange(val);
                                  const first = options.find((m: any) => (m.provider === val || m.family === val || m.library === val));
                                  if (first) {
                                    (form as any).setValue('agent_config.tasks.0.tools_config.llm.model', first.model);
                                    // set base_url and family when available
                                    if (first?.base_url) (form as any).setValue('agent_config.tasks.0.tools_config.llm.base_url', String(first.base_url));
                                    if (first?.family) (form as any).setValue('agent_config.tasks.0.tools_config.llm.family', String(first.family));
                                  }
                                }} value={String(field.value || '')}>
                                  <FormControl><SelectTrigger><SelectValue>{formatProvider(String(field.value || ''))}</SelectValue></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {modelsLoading ? (
                                      <div className="p-3 text-sm text-slate-500">Loading providers...</div>
                                    ) : (
                                      providers.length ? providers.map((p: any) => (
                                        <SelectItem key={p} value={p}>{formatProvider(p)}</SelectItem>
                                      )) : (
                                        <SelectItem value="openai">{formatProvider('openai')}</SelectItem>
                                      )
                                    )}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            );
                          }}
                        />

                        {/* Model Select */}
                        <FormField
                          control={form.control}
                          name={"agent_config.tasks.0.tools_config.llm.model" as any}
                          render={({ field }) => {
                            const options = modelsData?.llmModels ?? [];
                            const provider = (form as any).getValues('agent_config.tasks.0.tools_config.llm.provider');
                            const filtered = provider ? options.filter((m: any) => (m.provider === provider || m.family === provider || m.library === provider)) : options;

                            return (
                              <FormItem>
                                <FormLabel>Model</FormLabel>
                                <Select onValueChange={(val: string) => {
                                  field.onChange(val);
                                  const sel = options.find((m: any) => m.model === val);
                                  if (sel) {
                                    if (sel.base_url) (form as any).setValue('agent_config.tasks.0.tools_config.llm.base_url', sel.base_url);
                                    if (sel.family) (form as any).setValue('agent_config.tasks.0.tools_config.llm.family', sel.family);
                                    if (sel.provider) (form as any).setValue('agent_config.tasks.0.tools_config.llm.provider', sel.provider);
                                  }
                                }} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {modelsLoading ? (
                                      <div className="p-3 text-sm text-slate-500">Loading models...</div>
                                    ) : (
                                      filtered.length ? filtered.map((m: any) => (
                                        <SelectItem key={m.model} value={m.model}>{m.display_name || m.model}</SelectItem>
                                      )) : (
                                        <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo</SelectItem>
                                      )
                                    )}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            );
                          }}
                        />
                      </div>

                      {/* Model Parameters */}
                      <div className="rounded-lg border p-6 space-y-4 bg-slate-50">
                        <h4 className="font-semibold">Basic Parameters</h4>
                        <div className="grid grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.llm.max_tokens" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tokens generated on each LLM output</FormLabel>
                                <div className="flex items-center gap-4">
                                  <input type="range" min={1} max={2000} value={field.value || 100} onChange={(e) => field.onChange(Number(e.target.value))} className="flex-1" />
                                  <Input className="w-20" value={field.value || 100} onChange={(e) => field.onChange(Number(e.target.value))} />
                                </div>
                                <p className="text-xs text-slate-400 mt-2">Increasing tokens enables longer responses to be queued for speech generation but increases latency</p>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.llm.temperature" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Temperature ({field.value})</FormLabel>
                                <div className="flex items-center gap-4">
                                  <input type="range" min={0} max={1} step={0.01} value={field.value || 0.1} onChange={(e) => field.onChange(parseFloat(e.target.value))} className="flex-1" />
                                  <Input className="w-20" value={String(field.value ?? 0.1)} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                                </div>
                                <p className="text-xs text-slate-400 mt-2">Increasing temperature enables heightened creativity, but increases chance of deviation from prompt</p>
                              </FormItem>
                            )}
                          />
                        </div>

                        <h4 className="font-semibold pt-4">Advanced Parameters</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.llm.presence_penalty" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Presence Penalty</FormLabel>
                                <Input type="number" step="0.01" {...field} value={field.value ?? 0} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                                <p className="text-xs text-slate-400">Default: 0</p>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.llm.frequency_penalty" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Frequency Penalty</FormLabel>
                                <Input type="number" step="0.01" {...field} value={field.value ?? 0} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                                <p className="text-xs text-slate-400">Default: 0</p>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.llm.top_p" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Top P</FormLabel>
                                <Input type="number" step="0.01" {...field} value={field.value ?? 0.9} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                                <p className="text-xs text-slate-400">Default: 0.9</p>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.llm.min_p" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Min P</FormLabel>
                                <Input type="number" step="0.01" {...field} value={field.value ?? 0.1} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                                <p className="text-xs text-slate-400">Default: 0.1</p>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.llm.top_k" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Top K</FormLabel>
                                <Input type="number" {...field} value={field.value ?? 0} onChange={(e) => field.onChange(Number(e.target.value))} />
                                <p className="text-xs text-slate-400">Default: 0</p>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.llm.request_json" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Request JSON</FormLabel>
                                <div className="flex items-center gap-3">
                                  <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                                  <p className="text-xs text-slate-400">Default: false</p>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.llm.agent_flow_type" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Agent Flow Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || 'streaming'}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="streaming">streaming</SelectItem>
                                    <SelectItem value="batch">batch</SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-400">Default: streaming</p>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.llm.reasoning_effort" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Reasoning Effort</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="low">low</SelectItem>
                                    <SelectItem value="medium">medium</SelectItem>
                                    <SelectItem value="high">high</SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-400">Default: null</p>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.llm.stop" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Stop Sequences</FormLabel>
                                <Input {...field} value={field.value || ''} placeholder="e.g. \n, END" />
                                <p className="text-xs text-slate-400">Comma-separated stop tokens</p>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="rounded-lg border p-4 bg-white space-y-4">
                          <h4 className="font-semibold">LLM Advanced</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name={"agent_config.tasks.0.tools_config.llm.family" as any} render={({ field }) => (
                              <FormItem>
                                <FormLabel>Family</FormLabel>
                                <Input placeholder="e.g. openai" {...field} />
                              </FormItem>
                            )} />

                            <FormField control={form.control} name={"agent_config.tasks.0.tools_config.llm.base_url" as any} render={({ field }) => (
                              <FormItem>
                                <FormLabel>Base URL</FormLabel>
                                <Input placeholder="https://api.openai.com/v1" {...field} />
                                <p className="text-xs text-slate-400 mt-2">Optional: Override provider API base URL</p>
                              </FormItem>
                            )} />

                            <FormField control={form.control} name={"agent_config.tasks.0.tools_config.llm.summarization_details" as any} render={({ field }) => (
                              <FormItem>
                                <FormLabel>Summarization Details</FormLabel>
                                <Textarea placeholder="Optional summarization configuration" {...field} />
                              </FormItem>
                            )} />

                            <FormField control={form.control} name={"agent_config.tasks.0.tools_config.llm.extraction_details" as any} render={({ field }) => (
                              <FormItem>
                                <FormLabel>Extraction Details</FormLabel>
                                <Textarea placeholder="Optional extraction configuration" {...field} />
                              </FormItem>
                            )} />
                          </div>
                        </div>

                        {/* Routes (Semantic routing) */}
                        <div className="rounded-lg border p-4 bg-white space-y-4">
                          <h4 className="font-semibold">Routes (Semantic routing)</h4>

                          <FormField control={form.control} name={"agent_config.tasks.0.tools_config.llm_agent.routes.embedding_model" as any} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Embedding Model</FormLabel>
                              <Input placeholder="snowflake/snowflake-arctic-embed-m" {...field} />
                              <p className="text-xs text-slate-400 mt-2">Select embedding model for route similarity</p>
                            </FormItem>
                          )} />

                          <div className="space-y-3">
                            {/* routes list */}
                            {( (form as any).getValues('agent_config.tasks.0.tools_config.llm_agent.routes')?.routes || []).map((r: any, idx: number) => (
                              <div key={`route-${idx}`} className="p-3 border rounded">
                                <div className="flex items-center gap-2">
                                  <Input value={r.route_name || ''} placeholder="Route name" onChange={(e) => {
                                    const root = (form as any).getValues('agent_config.tasks.0.tools_config.llm_agent.routes') || { embedding_model: 'snowflake/snowflake-arctic-embed-m', routes: [] };
                                    root.routes = root.routes || [];
                                    root.routes[idx] = root.routes[idx] || { route_name: '', utterances: [], response: '', score_threshold: 0.85 };
                                    root.routes[idx].route_name = e.target.value;
                                    (form as any).setValue('agent_config.tasks.0.tools_config.llm_agent.routes', root);
                                  }} />
                                  <Button variant="ghost" size="icon" onClick={() => {
                                    const root = (form as any).getValues('agent_config.tasks.0.tools_config.llm_agent.routes') || { embedding_model: 'snowflake/snowflake-arctic-embed-m', routes: [] };
                                    root.routes = root.routes || [];
                                    root.routes.splice(idx, 1);
                                    (form as any).setValue('agent_config.tasks.0.tools_config.llm_agent.routes', root);
                                  }}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>

                                <div className="mt-2">
                                  <FormLabel>Utterances (one per line)</FormLabel>
                                  <Textarea value={(r.utterances || []).join('\n')} onChange={(e) => {
                                    const lines = e.target.value.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
                                    const root = (form as any).getValues('agent_config.tasks.0.tools_config.llm_agent.routes') || { embedding_model: 'snowflake/snowflake-arctic-embed-m', routes: [] };
                                    root.routes[idx] = root.routes[idx] || { route_name: '', utterances: [], response: '', score_threshold: 0.85 };
                                    root.routes[idx].utterances = lines;
                                    (form as any).setValue('agent_config.tasks.0.tools_config.llm_agent.routes', root);
                                  }} />
                                </div>

                                <div className="mt-2">
                                  <FormLabel>Response</FormLabel>
                                  <Textarea value={typeof r.response === 'string' ? r.response : (Array.isArray(r.response) ? (r.response[0]||'') : '')} onChange={(e) => {
                                    const root = (form as any).getValues('agent_config.tasks.0.tools_config.llm_agent.routes') || { embedding_model: 'snowflake/snowflake-arctic-embed-m', routes: [] };
                                    root.routes[idx] = root.routes[idx] || { route_name: '', utterances: [], response: '', score_threshold: 0.85 };
                                    root.routes[idx].response = e.target.value;
                                    (form as any).setValue('agent_config.tasks.0.tools_config.llm_agent.routes', root);
                                  }} />
                                </div>

                                <div className="mt-2 grid grid-cols-2 gap-4 items-center">
                                  <FormLabel className="text-xs">Score Threshold</FormLabel>
                                  <Input type="number" step="0.01" value={String(r.score_threshold ?? 0.85)} onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0.0;
                                    const root = (form as any).getValues('agent_config.tasks.0.tools_config.llm_agent.routes') || { embedding_model: 'snowflake/snowflake-arctic-embed-m', routes: [] };
                                    root.routes[idx] = root.routes[idx] || { route_name: '', utterances: [], response: '', score_threshold: 0.85 };
                                    root.routes[idx].score_threshold = val;
                                    (form as any).setValue('agent_config.tasks.0.tools_config.llm_agent.routes', root);
                                  }} />
                                </div>
                              </div>
                            ))}

                            <div>
                              <Button onClick={() => {
                                const root = (form as any).getValues('agent_config.tasks.0.tools_config.llm_agent.routes') || { embedding_model: 'snowflake/snowflake-arctic-embed-m', routes: [] };
                                root.routes = root.routes || [];
                                root.routes.push({ route_name: '', utterances: [], response: '', score_threshold: 0.85 });
                                (form as any).setValue('agent_config.tasks.0.tools_config.llm_agent.routes', root);
                              }}>+ Add route</Button>
                            </div>

                          </div>

                        </div>

                        {/* Knowledge bases multi-select */}
                        <FormField
                          control={form.control}
                          name={"agent_config.tasks.0.tools_config.llm.knowledgebase_ids" as any}
                          render={({ field }) => {
                            const kbs = kbsData || [];
const value = Array.isArray(field.value) ? field.value : [];

                            return (
                              <FormItem>
                                <FormLabel>Add knowledge base (Multi-select)</FormLabel>
                                {kbLoading ? (
                                  <div className="p-3 text-sm text-slate-500">Loading knowledge bases...</div>
                                ) : (
                                  <div className="space-y-3">
                                    <UIPopover>
                                      <PopoverTrigger asChild>
                                        <button type="button" className="w-full text-left rounded-md border px-3 py-2 flex items-center justify-between">
                                          <div className="min-w-0 truncate">
                                            {value && value.length ? (
                                              <div className="flex flex-wrap gap-2">
                                                {value.map((v: any, idx: number) => {
                                                  const found = (kbs || []).find((k: any) => k.rag_id === v);
                                                  return <span key={`${v}-${idx}`} className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-sm">{found?.knowledgebase_name || found?.file_name || v}</span>
                                                })}
                                              </div>
                                            ) : (
                                              <span className="text-slate-400">Select knowledge bases</span>
                                            )}
                                          </div>
                                          <div className="text-slate-400">▾</div>
                                        </button>
                                      </PopoverTrigger>

                                      <PopoverContent>
                                        <div className="space-y-2 max-h-48 overflow-auto">
                                          {(kbs || []).map((kb: any) => (
                                            <label key={kb.rag_id} className="flex items-center gap-2 cursor-pointer">
                                              <input type="checkbox" checked={value.includes(kb.rag_id)} onChange={(e) => {
                                                const next = new Set(value);
                                                if (e.target.checked) next.add(kb.rag_id); else next.delete(kb.rag_id);
                                                field.onChange(Array.from(next));
                                              }} className="h-4 w-4" />
                                              <div className="text-sm">{kb.knowledgebase_name || kb.file_name || kb.source_url}</div>
                                            </label>
                                          ))}
                                        </div>

                                        <div className="mt-2 pt-2 border-t">
                                          <a href="/knowledgebase" className="text-sm text-primary hover:underline">Add new knowledgebase ↗</a>
                                        </div>
                                      </PopoverContent>
                                    </UIPopover>

                                    {/* FAQs & Guardrails add area */}
                                    <div className="rounded-lg border-dashed border border-slate-200 p-6 text-center">
                                      <div className="max-w-md mx-auto">
                                        <AddFaqBlockDialog onSave={(block: any) => {
                                          const current = Array.isArray((form as any).getValues('agent_config.faq_blocks')) ? (form as any).getValues('agent_config.faq_blocks') : [];
                                          (form as any).setValue('agent_config.faq_blocks', [...current, block]);
                                        }} />
                                        <p className="text-sm text-slate-400 mt-3">You can add forced responses and guardrails for user utterances</p>
                                      </div>

                                      {/* show summary of blocks */}
                                      {Array.isArray((form as any).getValues('agent_config.faq_blocks')) && (form as any).getValues('agent_config.faq_blocks').length > 0 && (
                                        <div className="mt-4 text-left space-y-2">
                                          {((form as any).getValues('agent_config.faq_blocks') || []).map((b: any, i: number) => (
                                            <div key={i} className="p-2 border rounded bg-slate-50 text-sm">
                                              <div className="font-medium truncate">{b.name}</div>
                                              <div className="text-xs text-slate-500 truncate">{b.response}</div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                  </div>
                                )}
                              </FormItem>
                            );
                          }}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="audio" className="flex-1 overflow-auto min-h-0 m-0 p-8 max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      {/* Speech-to-Text */}
                      <div className="rounded-lg border p-6 bg-white space-y-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-slate-600" />
                          <h3 className="font-semibold">Speech-to-Text</h3>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.transcriber.provider" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Provider</FormLabel>
                                <Select onValueChange={(val: string) => {
                                  // When provider changes, set sensible defaults for related fields
                                  field.onChange(val);
                                  if (val === 'deepgram') {
                                    (form as any).setValue('agent_config.tasks.0.tools_config.transcriber.model', 'nova-3');
                                    (form as any).setValue('agent_config.tasks.0.tools_config.transcriber.language', 'en');
                                    (form as any).setValue('agent_config.tasks.0.tools_config.transcriber.endpointing', 250);
                                    (form as any).setValue('agent_config.tasks.0.tools_config.transcriber.sampling_rate', 16000);
                                  } else if (val === 'bodhi') {
                                    (form as any).setValue('agent_config.tasks.0.tools_config.transcriber.model', 'hi-general-v2-8khz');
                                    (form as any).setValue('agent_config.tasks.0.tools_config.transcriber.language', 'hi');
                                    (form as any).setValue('agent_config.tasks.0.tools_config.transcriber.endpointing', 100);
                                    (form as any).setValue('agent_config.tasks.0.tools_config.transcriber.sampling_rate', 8000);
                                  }
                                }} defaultValue={field.value || 'deepgram'}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="deepgram">Deepgram</SelectItem>
                                    <SelectItem value="bodhi">Bodhi</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.transcriber.model" as any}
                            render={({ field }) => {
                              const provider = (form as any).getValues('agent_config.tasks.0.tools_config.transcriber.provider');
                              return (
                                <FormItem>
                                  <FormLabel>Model</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || (provider === 'bodhi' ? 'hi-general-v2-8khz' : 'nova-3')}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      {provider === 'deepgram' ? (
                                        <>
                                          <SelectItem value="nova-3">nova-3</SelectItem>
                                          <SelectItem value="nova-2">nova-2</SelectItem>
                                          <SelectItem value="nova-2-meeting">nova-2-meeting</SelectItem>
                                          <SelectItem value="nova-2-phonecall">nova-2-phonecall</SelectItem>
                                          <SelectItem value="nova-2-finance">nova-2-finance</SelectItem>
                                          <SelectItem value="nova-2-conversationalai">nova-2-conversationalai</SelectItem>
                                          <SelectItem value="nova-2-medical">nova-2-medical</SelectItem>
                                          <SelectItem value="nova-2-drivethru">nova-2-drivethru</SelectItem>
                                          <SelectItem value="nova-2-automotive">nova-2-automotive</SelectItem>
                                        </>
                                      ) : (
                                        <>
                                          <SelectItem value="hi-general-v2-8khz">hi-general-v2-8khz</SelectItem>
                                          <SelectItem value="kn-general-v2-8khz">kn-general-v2-8khz</SelectItem>
                                          <SelectItem value="mr-general-v2-8khz">mr-general-v2-8khz</SelectItem>
                                          <SelectItem value="ta-general-v2-8khz">ta-general-v2-8khz</SelectItem>
                                          <SelectItem value="bn-general-v2-8khz">bn-general-v2-8khz</SelectItem>
                                        </>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              );
                            }}
                          />

                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.transcriber.language" as any}
                            render={({ field }) => {
                              const provider = (form as any).getValues('agent_config.tasks.0.tools_config.transcriber.provider');
                              return (
                                <FormItem>
                                  <FormLabel>Language</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || (provider === 'bodhi' ? 'hi' : 'en')}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      {provider === 'bodhi' ? (
                                        <>
                                          <SelectItem value="hi">hi</SelectItem>
                                          <SelectItem value="kn">kn</SelectItem>
                                          <SelectItem value="mr">mr</SelectItem>
                                          <SelectItem value="ta">ta</SelectItem>
                                          <SelectItem value="bn">bn</SelectItem>
                                        </>
                                      ) : (
                                        <>
                                          <SelectItem value="en">en</SelectItem>
                                          <SelectItem value="hi">hi</SelectItem>
                                          <SelectItem value="es">es</SelectItem>
                                          <SelectItem value="fr">fr</SelectItem>
                                        </>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              );
                            }}
                          />

                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.transcriber.sampling_rate" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sampling Rate</FormLabel>
                                <Input type="number" {...field} value={field.value ?? 16000} onChange={(e) => field.onChange(Number(e.target.value))} />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.transcriber.endpointing" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Endpointing (ms)</FormLabel>
                                <Input type="number" {...field} value={field.value ?? 250} onChange={(e) => field.onChange(Number(e.target.value))} />
                                <p className="text-xs text-slate-400 mt-1">Milliseconds of silence before considering speech ended</p>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.transcriber.encoding" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Encoding</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || 'linear16'}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="linear16">linear16</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.transcriber.task" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Task</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || 'transcribe'}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="transcribe">Transcribe</SelectItem>
                                    <SelectItem value="translate">Translate</SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-400">Transcribe or translate to English</p>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.transcriber.keywords" as any}
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel>Keywords (comma-separated)</FormLabel>
                                <Input {...field} value={field.value || ''} placeholder="e.g. Bolna, AI, assistant" />
                                <p className="text-xs text-slate-400">Custom keywords for better recognition</p>
                              </FormItem>
                            )}
                          />

                          {/* Whitelist phone numbers */}
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.whitelist_phone_numbers" as any}
                            render={({ field }) => {
                              const value = Array.isArray(field.value) ? field.value : [];

                              const addNumber = () => {
                                setWhitelistError('');
                                const num = newWhitelistNumber.trim();
                                const e164 = /^\+[1-9]\d{1,14}$/;
                                if (!e164.test(num)) {
                                  setWhitelistError('Enter valid E.164 number, e.g. +14155552671');
                                  return;
                                }
                                if (value.includes(num)) {
                                  setWhitelistError('Number already added');
                                  return;
                                }
                                (form as any).setValue('agent_config.tasks.0.task_config.whitelist_phone_numbers', [...value, num]);
                                setNewWhitelistNumber('');
                              };

                              const removeNumber = (idx: number) => {
                                const copy = [...value];
                                copy.splice(idx, 1);
                                (form as any).setValue('agent_config.tasks.0.task_config.whitelist_phone_numbers', copy.length ? copy : null);
                              };

                              return (
                                <FormItem>
                                  <FormLabel>Whitelist phone numbers</FormLabel>
                                  <div className="flex items-center gap-2">
                                    <Input placeholder="+14155552671" value={newWhitelistNumber} onChange={(e) => setNewWhitelistNumber(e.target.value)} />
                                    <Button onClick={addNumber}>Add</Button>
                                  </div>
                                  {whitelistError && <div className="text-xs text-red-500 mt-1">{whitelistError}</div>}

                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {value && value.length ? value.map((n: any, i: number) => (
                                      <div key={`${n}-${i}`} className="inline-flex items-center gap-2 px-2 py-1 rounded bg-slate-100 text-sm">
                                        <span className="font-mono">{n}</span>
                                        <button type="button" onClick={() => removeNumber(i)} className="text-red-500">✕</button>
                                      </div>
                                    )) : (
                                      <div className="text-xs text-slate-400">No whitelisted numbers</div>
                                    )}
                                  </div>
                                </FormItem>
                              );
                            }}
                          />

                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.transcriber.stream" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Stream</FormLabel>
                                <div className="flex items-center gap-3">
                                  <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                                  <p className="text-xs text-slate-400">Real-time transcription</p>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                      </div>

                      {/* Text-to-Speech */}
                      <div className="rounded-lg border p-6 bg-white space-y-4">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-5 h-5 text-slate-600" />
                          <h3 className="font-semibold">Text-to-Speech</h3>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.synthesizer.provider" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Provider</FormLabel>
                                <Select onValueChange={(val: string) => {
                                  field.onChange(val);
                                  
                                  // Clear all provider-specific fields first
                                  (form as any).setValue('agent_config.tasks.0.tools_config.synthesizer.model', undefined);
                                  (form as any).setValue('agent_config.tasks.0.tools_config.synthesizer.voice', undefined);
                                  (form as any).setValue('agent_config.tasks.0.tools_config.synthesizer.provider_config', {});
                                  
                                  // Set provider-specific defaults
                                  if (val === 'polly') {
                                    (form as any).setValue('agent_config.tasks.0.tools_config.synthesizer.provider_config', {
                                      voice: 'Matthew',
                                      engine: 'generative',
                                      language: 'en-US',
                                      sampling_rate: 8000,
                                      audio_format: 'wav'
                                    });
                                    (form as any).setValue('agent_config.tasks.0.tools_config.synthesizer.stream', true);
                                    (form as any).setValue('agent_config.tasks.0.tools_config.synthesizer.buffer_size', 250);
                                  } else if (val === 'elevenlabs') {
                                    (form as any).setValue('agent_config.tasks.0.tools_config.synthesizer.model', 'eleven_turbo_v2_5');
                                    (form as any).setValue('agent_config.tasks.0.tools_config.synthesizer.stream', true);
                                    (form as any).setValue('agent_config.tasks.0.tools_config.synthesizer.buffer_size', 250);
                                  } else if (val === 'deepgram') {
                                    (form as any).setValue('agent_config.tasks.0.tools_config.synthesizer.provider_config', {
                                      voice: 'Asteria',
                                      model: 'aura-asteria-en',
                                      sampling_rate: 24000,
                                      audio_format: 'wav'
                                    });
                                    (form as any).setValue('agent_config.tasks.0.tools_config.synthesizer.stream', true);
                                    (form as any).setValue('agent_config.tasks.0.tools_config.synthesizer.buffer_size', 250);
                                  } else if (val === 'styletts') {
                                    (form as any).setValue('agent_config.tasks.0.tools_config.synthesizer.stream', true);
                                    (form as any).setValue('agent_config.tasks.0.tools_config.synthesizer.buffer_size', 250);
                                  }
                                }} defaultValue={field.value || 'elevenlabs'}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="polly">Polly</SelectItem>
                                    <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                                    <SelectItem value="deepgram">Deepgram</SelectItem>
                                    <SelectItem value="styletts">StyleTTS</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />

                          {/* For ElevenLabs: Model selector. For Polly, model is not used here (engine lives in provider_config) */}
                          {synthesizerProvider === 'elevenlabs' && (
                            <FormField
                              control={form.control}
                              name={"agent_config.tasks.0.tools_config.synthesizer.model" as any}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Model</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value || 'eleven_turbo_v2_5'}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      <SelectItem value="eleven_turbo_v2_5">eleven_turbo_v2_5</SelectItem>
                                      <SelectItem value="eleven_flash_v2_5">eleven_flash_v2_5</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                          )}

                          {/* Voice selection: for Polly show provider_config.voice, for ElevenLabs/Deepgram/StyleTTS show voice from voices API */}
                          {synthesizerProvider === 'polly' ? (
                            <FormField
                              control={form.control}
                              name={"agent_config.tasks.0.tools_config.synthesizer.provider_config.voice" as any}
                              render={({ field }) => {
                                const { data: voices, isLoading: voicesLoading } = useVoices();
                                const voiceList = Array.isArray(voices) ? voices : (voices && (voices.voices || voices.data) ? (voices.voices || voices.data) : []);
                                const pollyVoices = voiceList.filter((v: any) => (v.provider || '').toLowerCase() === 'polly');

                                return (
                                  <FormItem>
                                    <FormLabel>Voice</FormLabel>
                                    {voicesLoading ? (
                                      <div className="p-2 text-sm text-slate-500">Loading voices...</div>
                                    ) : (
                                      <Select key="polly-voice" onValueChange={field.onChange} value={field.value || 'Matthew'}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                          <SelectItem value="Matthew">Matthew</SelectItem>
                                          {pollyVoices.map((v: any, idx: number) => (
                                            <SelectItem key={`${v.voice_id || v.id}-${idx}`} value={v.voice_id || v.id}>{v.name} ({v.provider})</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </FormItem>
                                );
                              }}
                            />
                          ) : synthesizerProvider === 'deepgram' ? (
                            <FormField
                              control={form.control}
                              name={"agent_config.tasks.0.tools_config.synthesizer.provider_config.voice" as any}
                              render={({ field }) => {
                                const { data: voices, isLoading: voicesLoading } = useVoices();
                                const voiceList = Array.isArray(voices) ? voices : (voices && (voices.voices || voices.data) ? (voices.voices || voices.data) : []);
                                const deepgramVoices = voiceList.filter((v: any) => (v.provider || '').toLowerCase() === 'deepgram');

                                return (
                                  <FormItem>
                                    <FormLabel>Voice</FormLabel>
                                    {voicesLoading ? (
                                      <div className="p-2 text-sm text-slate-500">Loading voices...</div>
                                    ) : (
                                      <Select key="deepgram-voice" onValueChange={field.onChange} value={field.value || 'Asteria'}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                          <SelectItem value="Asteria">Asteria</SelectItem>
                                          {deepgramVoices.map((v: any, idx: number) => (
                                            <SelectItem key={`${v.voice_id || v.id}-${idx}`} value={v.voice_id || v.id}>{v.name} ({v.provider})</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </FormItem>
                                );
                              }}
                            />
                          ) : (
                            <FormField
                              control={form.control}
                              name={"agent_config.tasks.0.tools_config.synthesizer.voice" as any}
                              render={({ field }) => {
                                const { data: voices, isLoading: voicesLoading } = useVoices();
                                const voiceList = Array.isArray(voices) ? voices : (voices && (voices.voices || voices.data) ? (voices.voices || voices.data) : []);
                                const currentProvider = synthesizerProvider;
                                const filteredVoices = voiceList.filter((v: any) => (v.provider || '').toLowerCase() === currentProvider.toLowerCase());

                                return (
                                  <FormItem>
                                    <FormLabel>Voice</FormLabel>
                                    {voicesLoading ? (
                                      <div className="p-2 text-sm text-slate-500">Loading voices...</div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <Select key={`${currentProvider}-voice`} onValueChange={field.onChange} value={field.value || ''}>
                                          <FormControl><SelectTrigger><SelectValue placeholder="Select voice" /></SelectTrigger></FormControl>
                                          <SelectContent>
                                            {filteredVoices.length ? filteredVoices.map((v: any, idx: number) => (
                                              <SelectItem key={`${v.voice_id || v.id}-${idx}`} value={v.voice_id || v.id}>{v.name} ({v.provider})</SelectItem>
                                            )) : (
                                              <SelectItem value="rachel">Rachel</SelectItem>
                                            )}
                                          </SelectContent>
                                        </Select>
                                        <Button variant="ghost" size="sm" asChild>
                                          <a href="/voices" target="_blank" rel="noreferrer">Add voices ↗</a>
                                        </Button>
                                      </div>
                                    )}
                                  </FormItem>
                                );
                              }}
                            />
                          )}

                          {/* ElevenLabs provider-specific controls */}
                          {synthesizerProvider === 'elevenlabs' && (
                            <>
                              <FormField
                                control={form.control}
                                name={"agent_config.tasks.0.tools_config.synthesizer.audio_format" as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Audio Format</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || 'wav'}>
                                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                      <SelectContent>
                                        <SelectItem value="wav">WAV</SelectItem>
                                        <SelectItem value="mp3">MP3</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={"agent_config.tasks.0.tools_config.synthesizer.caching" as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Voice Caching</FormLabel>
                                    <div className="flex items-center gap-3">
                                      <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                                      <p className="text-xs text-slate-400">Cache voice for faster response</p>
                                    </div>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={"agent_config.tasks.0.tools_config.synthesizer.provider_config.speed" as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Speed</FormLabel>
                                    <Input type="number" step="0.1" min="0.5" max="2" {...field} value={field.value ?? 1} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                                    <p className="text-xs text-slate-400">Default: 1.0</p>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={"agent_config.tasks.0.tools_config.synthesizer.provider_config.style" as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Style</FormLabel>
                                    <Input type="number" step="0.1" min="0" max="1" {...field} value={field.value ?? 0} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                                    <p className="text-xs text-slate-400">Default: 0</p>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={"agent_config.tasks.0.tools_config.synthesizer.provider_config.temperature" as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Voice Temperature</FormLabel>
                                    <Input type="number" step="0.1" min="0" max="1" {...field} value={field.value ?? 0.6} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                                    <p className="text-xs text-slate-400">Default: 0.6</p>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={"agent_config.tasks.0.tools_config.synthesizer.provider_config.similarity_boost" as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Similarity Boost</FormLabel>
                                    <Input type="number" step="0.01" min="0" max="1" {...field} value={field.value ?? 0.65} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                                    <p className="text-xs text-slate-400">Default: 0.65</p>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={"agent_config.tasks.0.tools_config.synthesizer.buffer_size" as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Buffer Size (ms)</FormLabel>
                                    <Input type="number" {...field} value={field.value ?? 250} onChange={(e) => field.onChange(Number(e.target.value))} />
                                    <p className="text-xs text-slate-400">Default: 250</p>
                                  </FormItem>
                                )}
                              />
                            </>
                          )}

                          {/* POLLY specific provider_config controls */}
                          {synthesizerProvider === 'polly' && (
                            <>
                              <FormField
                                control={form.control}
                                name={"agent_config.tasks.0.tools_config.synthesizer.provider_config.engine" as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Engine</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || 'generative'}>
                                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                      <SelectContent>
                                        <SelectItem value="generative">generative</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={"agent_config.tasks.0.tools_config.synthesizer.provider_config.language" as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Language</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || 'en-US'}>
                                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                      <SelectContent>
                                        <SelectItem value="en-US">en-US</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={"agent_config.tasks.0.tools_config.synthesizer.provider_config.sampling_rate" as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Sampling Rate</FormLabel>
                                    <Select onValueChange={(v: any) => field.onChange(Number(v))} defaultValue={String(field.value ?? 8000)}>
                                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                      <SelectContent>
                                        <SelectItem value="8000">8000</SelectItem>
                                        <SelectItem value="16000">16000</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={"agent_config.tasks.0.tools_config.synthesizer.provider_config.audio_format" as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Audio format</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || 'wav'}>
                                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                      <SelectContent>
                                        <SelectItem value="wav">wav</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={"agent_config.tasks.0.tools_config.synthesizer.stream" as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Stream</FormLabel>
                                    <div className="flex items-center gap-3">
                                      <input type="checkbox" checked={field.value ?? true} onChange={(e) => field.onChange(Boolean(e.target.checked))} />
                                      <p className="text-xs text-slate-400">Stream audio in real-time (default: true)</p>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            </>
                          )}

                          {/* Deepgram provider-specific controls */}
                          {synthesizerProvider === 'deepgram' && (
                            <>
                              <FormField
                                control={form.control}
                                name={"agent_config.tasks.0.tools_config.synthesizer.provider_config.model" as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Model</FormLabel>
                                    <Input placeholder="e.g. aura-asteria-en" {...field} value={field.value || ''} />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={"agent_config.tasks.0.tools_config.synthesizer.provider_config.sampling_rate" as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Sampling Rate</FormLabel>
                                    <Select onValueChange={(v: any) => field.onChange(Number(v))} defaultValue={String(field.value ?? 24000)}>
                                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                      <SelectContent>
                                        <SelectItem value="24000">24000</SelectItem>
                                        <SelectItem value="16000">16000</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={"agent_config.tasks.0.tools_config.synthesizer.provider_config.audio_format" as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Audio format</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || 'wav'}>
                                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                      <SelectContent>
                                        <SelectItem value="wav">wav</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={"agent_config.tasks.0.tools_config.synthesizer.stream" as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Stream</FormLabel>
                                    <div className="flex items-center gap-3">
                                      <input type="checkbox" checked={field.value ?? true} onChange={(e) => field.onChange(Boolean(e.target.checked))} />
                                      <p className="text-xs text-slate-400">Stream audio in real-time (default: true)</p>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="engine" className="flex-1 overflow-auto min-h-0 m-0 p-8 max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      {/* Conversation Settings */}
                      <div className="rounded-lg border p-6 bg-white space-y-4">
                        <h3 className="font-semibold">Conversation Settings</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.use_fillers" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Use Fillers</FormLabel>
                                <div className="flex items-center gap-3">
                                  <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                                  <p className="text-xs text-slate-400">Add natural filler words</p>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.dtmf_enabled" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>DTMF Enabled</FormLabel>
                                <div className="flex items-center gap-3">
                                  <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                                  <p className="text-xs text-slate-400">Detect keypad tones</p>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.optimize_latency" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Optimize Latency</FormLabel>
                                <div className="flex items-center gap-3">
                                  <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                                  <p className="text-xs text-slate-400">Reduce response time</p>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.hangup_after_silence" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Hangup After Silence (seconds)</FormLabel>
                                <Input type="number" {...field} value={field.value ?? 10} onChange={(e) => field.onChange(Number(e.target.value))} />
                                <p className="text-xs text-slate-400">Default: 10</p>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.call_terminate" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Call Terminate (seconds)</FormLabel>
                                <Input type="number" {...field} value={field.value ?? 90} onChange={(e) => field.onChange(Number(e.target.value))} />
                                <p className="text-xs text-slate-400">Default: 90</p>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.incremental_delay" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Incremental Delay (ms)</FormLabel>
                                <Input type="number" {...field} value={field.value ?? 400} onChange={(e) => field.onChange(Number(e.target.value))} />
                                <p className="text-xs text-slate-400">Default: 400</p>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.number_of_words_for_interruption" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Words for Interruption</FormLabel>
                                <Input type="number" {...field} value={field.value ?? 2} onChange={(e) => field.onChange(Number(e.target.value))} />
                                <p className="text-xs text-slate-400">Default: 2</p>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.hangup_after_LLMCall" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Hangup After LLM Call</FormLabel>
                                <div className="flex items-center gap-3">
                                  <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                                  <p className="text-xs text-slate-400">Default: false</p>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.call_cancellation_prompt" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Call Cancellation Prompt</FormLabel>
                                <Input {...field} value={field.value || ''} placeholder="Optional" />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Backchanneling */}
                      <div className="rounded-lg border p-6 bg-white space-y-4">
                        <h3 className="font-semibold">Backchanneling</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.backchanneling" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Enable Backchanneling</FormLabel>
                                <div className="flex items-center gap-3">
                                  <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                                  <p className="text-xs text-slate-400">Default: false</p>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.backchanneling_message_gap" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Message Gap (seconds)</FormLabel>
                                <Input type="number" {...field} value={field.value ?? 5} onChange={(e) => field.onChange(Number(e.target.value))} />
                                <p className="text-xs text-slate-400">Default: 5</p>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.backchanneling_start_delay" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Delay (seconds)</FormLabel>
                                <Input type="number" {...field} value={field.value ?? 5} onChange={(e) => field.onChange(Number(e.target.value))} />
                                <p className="text-xs text-slate-400">Default: 5</p>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Voicemail Detection */}
                      <div className="rounded-lg border p-6 bg-white space-y-4">
                        <h3 className="font-semibold">Voicemail Detection</h3>
                        <div className="grid grid-cols-4 gap-4">
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.voicemail_check_interval" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Check Interval (s)</FormLabel>
                                <Input type="number" {...field} value={field.value ?? 7} onChange={(e) => field.onChange(Number(e.target.value))} />
                                <p className="text-xs text-slate-400">Default: 7</p>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.voicemail_detection_time" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Detection Time (s)</FormLabel>
                                <Input type="number" step="0.1" {...field} value={field.value ?? 2.5} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                                <p className="text-xs text-slate-400">Default: 2.5</p>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.voicemail_detection_duration" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Detection Duration (s)</FormLabel>
                                <Input type="number" {...field} value={field.value ?? 30} onChange={(e) => field.onChange(Number(e.target.value))} />
                                <p className="text-xs text-slate-400">Default: 30</p>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.voicemail_min_transcript_length" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Min Transcript Length</FormLabel>
                                <Input type="number" {...field} value={field.value ?? 7} onChange={(e) => field.onChange(Number(e.target.value))} />
                                <p className="text-xs text-slate-400">Default: 7</p>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Ambient Noise */}
                      <div className="rounded-lg border p-6 bg-white space-y-4">
                        <h3 className="font-semibold">Ambient Noise</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.ambient_noise" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Enable Ambient Noise</FormLabel>
                                <div className="flex items-center gap-3">
                                  <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                                  <p className="text-xs text-slate-400">Default: false</p>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.ambient_noise_track" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ambient Noise Track</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || 'office-ambience'}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="office-ambience">Office Ambience</SelectItem>
                                    <SelectItem value="coffee-shop">Coffee Shop</SelectItem>
                                    <SelectItem value="call-center">Call Center</SelectItem>
                                    <SelectItem value="convention_hall">Convention Hall</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Advanced Settings */}
                      <div className="rounded-lg border p-6 bg-white space-y-4">
                        <h3 className="font-semibold">Advanced Settings</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.auto_reschedule" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Auto Reschedule</FormLabel>
                                <div className="flex items-center gap-3">
                                  <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                                  <p className="text-xs text-slate-400">Auto-reschedule failed calls</p>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.check_if_user_online" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Check User Online</FormLabel>
                                <div className="flex items-center gap-3">
                                  <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                                  <p className="text-xs text-slate-400">Check if user is present</p>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.trigger_user_online_message_after" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Trigger After (s)</FormLabel>
                                <Input type="number" {...field} value={field.value ?? 7} onChange={(e) => field.onChange(Number(e.target.value))} />
                                <p className="text-xs text-slate-400">Default: 7</p>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.noise_cancellation_level" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Noise Cancellation (0-100)</FormLabel>
                                <Input type="number" min={0} max={100} {...field} value={field.value ?? 75} onChange={(e) => field.onChange(Number(e.target.value))} />
                                <p className="text-xs text-slate-400">Default: 75</p>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.language_detection_turns" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Language Detection Turns</FormLabel>
                                <Input type="number" {...field} value={field.value ?? null} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)} placeholder="null" />
                                <p className="text-xs text-slate-400">Auto-detect language</p>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-3">
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.check_user_online_message" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>User Online Message (JSON)</FormLabel>
                                <Textarea 
                                  {...field} 
                                  value={typeof field.value === 'object' ? JSON.stringify(field.value, null, 2) : (field.value || '')}
                                  onChange={(e) => {
                                    try {
                                      const parsed = JSON.parse(e.target.value);
                                      field.onChange(parsed);
                                    } catch {
                                      field.onChange(e.target.value);
                                    }
                                  }}
                                  placeholder='{"en": "Hello, are you still there?", "hi": "क्या आप अभी भी लाइन पर हैं?"}'
                                  className="font-mono text-sm"
                                />
                                <p className="text-xs text-slate-400">Message to check if user is online (multi-language)</p>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="call" className="flex-1 overflow-auto min-h-0 m-0 p-8 max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      {/* Telephony Providers */}
                      <div className="rounded-lg border p-6 bg-white space-y-4">
                        <h3 className="font-semibold">Telephony Providers</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.input.provider" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Input Provider</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || 'plivo'}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="twilio">Twilio</SelectItem>
                                    <SelectItem value="plivo">Plivo</SelectItem>
                                    <SelectItem value="exotel">Exotel</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.input.format" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Input Format</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || 'wav'}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="wav">WAV</SelectItem>
                                    <SelectItem value="mp3">MP3</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.output.provider" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Output Provider</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || 'plivo'}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="twilio">Twilio</SelectItem>
                                    <SelectItem value="plivo">Plivo</SelectItem>
                                    <SelectItem value="exotel">Exotel</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.tools_config.output.format" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Output Format</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || 'wav'}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="wav">WAV</SelectItem>
                                    <SelectItem value="mp3">MP3</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="tools" className="flex-1 overflow-auto min-h-0 m-0 p-8 max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="rounded-lg border p-6 bg-white space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wrench className="w-5 h-5 text-slate-600" />
                            <h3 className="font-semibold">Function Tools for LLM Models</h3>
                          </div>

                          <div className="flex items-center gap-3 w-full">
                            <div className="flex-1">
                              <Select onValueChange={(val: string) => (form as any).setValue('ui_selected_function', val)} defaultValue={(form as any).getValues('ui_selected_function') || ''}>
                                <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select functions" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="transfer_call">Transfer Call</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button onClick={() => {
                                const sel = (form as any).getValues('ui_selected_function') || 'transfer_call';
                              }}>Add function</Button>

                              <TransferCallDialog trigger={<Button variant="outline">Add Transfer Call</Button>} onSave={(tool: any, params: any) => {
                                const tools = Array.isArray((form as any).getValues('agent_config.tasks.0.tools_config.api_tools.tools')) ? (form as any).getValues('agent_config.tasks.0.tools_config.api_tools.tools') : [];
                                if (tools.find((t: any) => t.name === tool.name)) return;
                                (form as any).setValue('agent_config.tasks.0.tools_config.api_tools.tools', [...tools, tool]);
                                const ps = (form as any).getValues('agent_config.tasks.0.tools_config.api_tools.tools_params') || {};
                                ps[tool.name] = params;
                                (form as any).setValue('agent_config.tasks.0.tools_config.api_tools.tools_params', ps);
                              }} />
                            </div>

                          </div>

                        </div>

                        {Array.isArray((form as any).getValues('agent_config.tasks.0.tools_config.api_tools.tools')) && (form as any).getValues('agent_config.tasks.0.tools_config.api_tools.tools').length > 0 ? (
                          <div className="space-y-3">
                            {((form as any).getValues('agent_config.tasks.0.tools_config.api_tools.tools') || []).map((t: any, idx: number) => (
                              <div key={`${t.name}-${idx}`} className="p-4 border rounded-lg">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="font-medium">{t.name}</div>
                                    <div className="text-sm text-slate-500">{t.description}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => {
                                      const tools = (form as any).getValues('agent_config.tasks.0.tools_config.api_tools.tools') || [];
                                      tools.splice(idx, 1);
                                      (form as any).setValue('agent_config.tasks.0.tools_config.api_tools.tools', tools);
                                      const params = (form as any).getValues('agent_config.tasks.0.tools_config.api_tools.tools_params') || {};
                                      delete params[t.name];
                                      (form as any).setValue('agent_config.tasks.0.tools_config.api_tools.tools_params', params);
                                    }}>
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-4">
                                  <div>
                                    <FormLabel>Method</FormLabel>
                                    <Select onValueChange={(v: string) => {
                                      const params = (form as any).getValues('agent_config.tasks.0.tools_config.api_tools.tools_params') || {};
                                      params[t.name] = params[t.name] || { method: 'GET', url: null, api_token: null, param: '{}' };
                                      params[t.name].method = v;
                                      (form as any).setValue('agent_config.tasks.0.tools_config.api_tools.tools_params', params);
                                    }} defaultValue={((form as any).getValues('agent_config.tasks.0.tools_config.api_tools.tools_params') || {})[t.name]?.method || 'GET'}>
                                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                      <SelectContent>
                                        <SelectItem value="GET">GET</SelectItem>
                                        <SelectItem value="POST">POST</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <FormLabel>URL</FormLabel>
                                    <Input value={((form as any).getValues('agent_config.tasks.0.tools_config.api_tools.tools_params') || {})[t.name]?.url || ''} onChange={(e) => {
                                      const params = (form as any).getValues('agent_config.tasks.0.tools_config.api_tools.tools_params') || {};
                                      params[t.name] = params[t.name] || { method: 'GET', url: null, api_token: null, param: '{}' };
                                      params[t.name].url = e.target.value || null;
                                      (form as any).setValue('agent_config.tasks.0.tools_config.api_tools.tools_params', params);
                                    }} placeholder="https://example.com/transfer" />
                                  </div>

                                  <div>
                                    <FormLabel>API Token</FormLabel>
                                    <Input value={((form as any).getValues('agent_config.tasks.0.tools_config.api_tools.tools_params') || {})[t.name]?.api_token || ''} onChange={(e) => {
                                      const params = (form as any).getValues('agent_config.tasks.0.tools_config.api_tools.tools_params') || {};
                                      params[t.name] = params[t.name] || { method: 'GET', url: null, api_token: null, param: '{}' };
                                      params[t.name].api_token = e.target.value || null;
                                      (form as any).setValue('agent_config.tasks.0.tools_config.api_tools.tools_params', params);
                                    }} placeholder="Optional" />
                                  </div>

                                  <div className="col-span-2">
                                    <FormLabel>Param (stringified JSON)</FormLabel>
                                    <Textarea value={((form as any).getValues('agent_config.tasks.0.tools_config.api_tools.tools_params') || {})[t.name]?.param || ''} onChange={(e) => {
                                      const params = (form as any).getValues('agent_config.tasks.0.tools_config.api_tools.tools_params') || {};
                                      params[t.name] = params[t.name] || { method: 'GET', url: null, api_token: null, param: '{}' };
                                      params[t.name].param = e.target.value || '';
                                      (form as any).setValue('agent_config.tasks.0.tools_config.api_tools.tools_params', params);
                                    }} placeholder='{"call_transfer_number": "+19876543210","call_sid": "%(call_sid)s"}' />
                                  </div>
                                </div>

                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-sm text-slate-500">No functions added</div>
                        )}

                      </div>
                    </TabsContent>

                    <TabsContent value="inbound" className="flex-1 overflow-auto min-h-0 m-0 p-8 max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      {/* Ingest Source Config */}
                      <div className="rounded-lg border p-6 bg-white space-y-4">
                        <h3 className="font-semibold">CRM Ingestion Source</h3>
                        <p className="text-sm text-slate-400">Configure where to source phone numbers for inbound calls</p>
                        
                        <FormField
                          control={form.control}
                          name={"agent_config.ingest_source_config.source_type" as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Source Type</FormLabel>
                              <Select onValueChange={(val: string) => {
                                field.onChange(val);
                                // Clear other fields when source type changes
                                (form as any).setValue('agent_config.ingest_source_config.source_url', undefined);
                                (form as any).setValue('agent_config.ingest_source_config.source_auth_token', undefined);
                                (form as any).setValue('agent_config.ingest_source_config.source_name', undefined);
                              }} value={field.value || ''}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select source type" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="api">API</SelectItem>
                                  <SelectItem value="csv">CSV File</SelectItem>
                                  <SelectItem value="google_sheet">Google Sheet</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        {form.watch('agent_config.ingest_source_config.source_type' as any) === 'api' && (
                          <>
                            <FormField
                              control={form.control}
                              name={"agent_config.ingest_source_config.source_url" as any}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>API URL *</FormLabel>
                                  <Input {...field} value={field.value || ''} placeholder="https://example.com/api/data" />
                                  <p className="text-xs text-slate-400">API endpoint to fetch phone numbers</p>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={"agent_config.ingest_source_config.source_auth_token" as any}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Bearer Token *</FormLabel>
                                  <Input {...field} value={field.value || ''} placeholder="abc123" type="password" />
                                  <p className="text-xs text-slate-400">Authentication token for API</p>
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        {form.watch('agent_config.ingest_source_config.source_type' as any) === 'csv' && (
                          <FormField
                            control={form.control}
                            name={"agent_config.ingest_source_config.source_name" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CSV File *</FormLabel>
                                <div className="border-2 border-dashed rounded-lg p-4 text-center bg-white">
                                  <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) field.onChange(file.name);
                                    }}
                                    className="hidden"
                                    id="csv-ingest-upload"
                                  />
                                  <label htmlFor="csv-ingest-upload" className="cursor-pointer">
                                    {field.value ? (
                                      <div className="flex items-center justify-center gap-2 text-sm">
                                        <FileText className="w-4 h-4" />
                                        <span>{field.value}</span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center gap-2">
                                        <Upload className="w-6 h-6 text-slate-400" />
                                        <p className="text-sm text-slate-500">Click to upload CSV file</p>
                                        <p className="text-xs text-slate-400">Only .csv files are supported</p>
                                      </div>
                                    )}
                                  </label>
                                </div>
                                <p className="text-xs text-slate-400">Upload CSV file with phone numbers</p>
                              </FormItem>
                            )}
                          />
                        )}

                        {form.watch('agent_config.ingest_source_config.source_type' as any) === 'google_sheet' && (
                          <>
                            <FormField
                              control={form.control}
                              name={"agent_config.ingest_source_config.source_url" as any}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Google Sheet URL *</FormLabel>
                                  <Input {...field} value={field.value || ''} placeholder="https://docs.google.com/spreadsheets/d/..." />
                                  <p className="text-xs text-slate-400">URL of the Google Sheet</p>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={"agent_config.ingest_source_config.source_name" as any}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Sheet Name *</FormLabel>
                                  <Input {...field} value={field.value || ''} placeholder="Sheet1" />
                                  <p className="text-xs text-slate-400">Name of the sheet tab</p>
                                </FormItem>
                              )}
                            />
                          </>
                        )}
                      </div>

                      {/* Inbound Settings */}
                      <div className="rounded-lg border p-6 bg-white space-y-4">
                        <h3 className="font-semibold">Inbound Settings</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.voicemail" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Voicemail Detection</FormLabel>
                                <div className="flex items-center gap-3">
                                  <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                                  <p className="text-xs text-slate-400">Auto-disconnect on voicemail</p>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.inbound_limit" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Inbound Call Limit</FormLabel>
                                <Input type="number" {...field} value={field.value ?? -1} onChange={(e) => field.onChange(Number(e.target.value))} />
                                <p className="text-xs text-slate-400">-1 = unlimited calls per number</p>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={"agent_config.tasks.0.task_config.disallow_unknown_numbers" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Block Unknown Numbers</FormLabel>
                                <div className="flex items-center gap-3">
                                  <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                                  <p className="text-xs text-slate-400">Only allow sourced numbers</p>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="assistants" className="flex-1 overflow-auto min-h-0 m-0 p-8 max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="rounded-lg border p-6 bg-white space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">OpenAI GPT Assistants</h3>
                            <p className="text-sm text-slate-400 mt-1">Configure OpenAI assistants for specialized interview flows</p>
                          </div>
                          <Button onClick={() => {
                            const current = Array.isArray((form as any).getValues('gpt_assistants')) ? (form as any).getValues('gpt_assistants') : [];
                            (form as any).setValue('gpt_assistants', [...current, { assistant_id: '', custom_questions: '' }]);
                          }}>
                            <Plus className="w-4 h-4 mr-2" /> Add Assistant
                          </Button>
                        </div>

                        <div className="space-y-4">
                          {Array.isArray((form as any).getValues('gpt_assistants')) && (form as any).getValues('gpt_assistants').length > 0 ? (
                            ((form as any).getValues('gpt_assistants') || []).map((asst: any, idx: number) => {
                              const isString = typeof asst === 'string';
                              return (
                                <div key={`asst-${idx}`} className="p-4 border rounded-lg space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 space-y-3">
                                      <div>
                                        <Label>Assistant ID *</Label>
                                        <Input 
                                          value={isString ? asst : (asst.assistant_id || '')} 
                                          onChange={(e) => {
                                            const assistants = (form as any).getValues('gpt_assistants') || [];
                                            if (isString) {
                                              assistants[idx] = e.target.value;
                                            } else {
                                              assistants[idx] = { ...assistants[idx], assistant_id: e.target.value };
                                            }
                                            (form as any).setValue('gpt_assistants', assistants);
                                          }}
                                          placeholder="asst_xxxxxxxxxxxxx"
                                          className="font-mono"
                                        />
                                        <p className="text-xs text-slate-400 mt-1">OpenAI Assistant ID from platform.openai.com</p>
                                      </div>

                                      {!isString && (
                                        <div>
                                          <Label>Custom Questions (Optional)</Label>
                                          <Textarea 
                                            value={asst.custom_questions || ''}
                                            onChange={(e) => {
                                              const assistants = (form as any).getValues('gpt_assistants') || [];
                                              assistants[idx] = { ...assistants[idx], custom_questions: e.target.value };
                                              (form as any).setValue('gpt_assistants', assistants);
                                            }}
                                            placeholder="Question 1: Can you walk me through...\nQuestion 2: What are the key differences..."
                                            className="min-h-[100px]"
                                          />
                                          <p className="text-xs text-slate-400 mt-1">Custom questions for this assistant (one per line)</p>
                                        </div>
                                      )}

                                      <div className="flex items-center gap-2">
                                        <Button 
                                          type="button"
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => {
                                            const assistants = (form as any).getValues('gpt_assistants') || [];
                                            if (isString) {
                                              assistants[idx] = { assistant_id: asst, custom_questions: '' };
                                            } else {
                                              assistants[idx] = assistants[idx].assistant_id;
                                            }
                                            (form as any).setValue('gpt_assistants', assistants);
                                          }}
                                        >
                                          {isString ? 'Add Questions' : 'Remove Questions'}
                                        </Button>
                                      </div>
                                    </div>

                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => {
                                        const assistants = (form as any).getValues('gpt_assistants') || [];
                                        assistants.splice(idx, 1);
                                        (form as any).setValue('gpt_assistants', assistants);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-8 text-center border-2 border-dashed rounded-lg">
                              <Bot className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                              <p className="text-sm text-slate-500 mb-4">No GPT Assistants configured</p>
                              <Button onClick={() => {
                                (form as any).setValue('gpt_assistants', [{ assistant_id: '', custom_questions: '' }]);
                              }}>
                                <Plus className="w-4 h-4 mr-2" /> Add Your First Assistant
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="rounded-lg bg-blue-50 p-4 mt-4">
                          <h4 className="font-medium text-blue-900 mb-2">How to use GPT Assistants</h4>
                          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                            <li>Create assistants at <a href="https://platform.openai.com/assistants" target="_blank" rel="noreferrer" className="underline">platform.openai.com/assistants</a></li>
                            <li>Copy the Assistant ID (starts with "asst_")</li>
                            <li>Add custom questions to guide the interview flow</li>
                            <li>Assistants can be simple (ID only) or detailed (with custom questions)</li>
                          </ul>
                        </div>
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
