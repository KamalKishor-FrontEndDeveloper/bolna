import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateAgent, useModels, useVoices, useKnowledgebases } from "@/hooks/use-bolna";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

const quickAgentSchema = z.object({
  agent_name: z.string().min(1, "Agent name is required"),
  agent_welcome_message: z.string().optional(),
  system_prompt: z.string().min(1, "System prompt is required"),
  business_type: z.enum(["sales", "support", "other"]).default("other"),
  llm_agent_type: z.enum(["simple_llm_agent", "knowledgebase_agent"]).default("simple_llm_agent"),
  knowledgebase_ids: z.array(z.string()).optional(),
  llm_provider: z.string().default("openai"),
  llm_model: z.string().default("gpt-4o-mini"),
  voice_id: z.string().default("V9LCAAi4tTlqe9JadbCo"),
  transcriber_model: z.string().default("nova-3"),
  transcriber_language: z.string().default("en"),
});

type QuickAgentForm = z.infer<typeof quickAgentSchema>;

interface CreateAgentModalProps {
  trigger?: React.ReactNode;
  onCreated?: (agentId: string) => void;
}

export default function CreateAgentModal({ trigger, onCreated }: CreateAgentModalProps) {
  const [open, setOpen] = useState(false);
  const { mutate: createAgent, isPending } = useCreateAgent();
  const { data: modelsData } = useModels();
  const { data: voicesData } = useVoices();
  const { data: knowledgebasesData } = useKnowledgebases();
  const [selectedKbs, setSelectedKbs] = useState<string[]>([]);

  const form = useForm<QuickAgentForm>({
    resolver: zodResolver(quickAgentSchema),
    defaultValues: {
      agent_name: "New Agent",
      agent_welcome_message: "Hello, how can I help you today?",
      system_prompt: "You are a helpful AI assistant. Keep your responses concise and natural.",
      business_type: "other",
      llm_agent_type: "simple_llm_agent",
      knowledgebase_ids: [],
      llm_provider: "openai",
      llm_model: "gpt-4o-mini",
      voice_id: "V9LCAAi4tTlqe9JadbCo",
      transcriber_model: "nova-3",
      transcriber_language: "en",
    },
  });

  const selectedProvider = form.watch("llm_provider");
  const llmAgentType = form.watch("llm_agent_type");

  // Sync selectedKbs with form knowledgebase_ids
  useEffect(() => {
    const kbIds = form.watch("knowledgebase_ids") || [];
    if (JSON.stringify(kbIds) !== JSON.stringify(selectedKbs)) {
      setSelectedKbs(kbIds);
    }
  }, [form.watch("knowledgebase_ids")]);

  // Update form when selectedKbs changes
  useEffect(() => {
    form.setValue("knowledgebase_ids", selectedKbs);
  }, [selectedKbs]);

  const onSubmit = (data: QuickAgentForm) => {
    // Get selected model details for base_url and family
    const selectedModel = llmModels.find((m: any) => m.model === data.llm_model);
    const baseUrl = selectedModel?.base_url || null;
    const family = selectedModel?.family || data.llm_provider;

    // Build llm_config based on agent type
    const llmConfig: any = {
      agent_flow_type: "streaming",
      provider: data.llm_provider,
      family: family,
      model: data.llm_model,
      max_tokens: 150,
      temperature: 0.1,
      presence_penalty: 0,
      frequency_penalty: 0,
      top_p: 0.9,
      min_p: 0.1,
      top_k: 0,
      request_json: false,
      summarization_details: null,
      extraction_details: null,
      ...(baseUrl && { base_url: baseUrl })
    };

    // Add vector_store config for knowledgebase agent
    if (data.llm_agent_type === "knowledgebase_agent" && data.knowledgebase_ids && data.knowledgebase_ids.length > 0) {
      llmConfig.vector_store = {
        provider: "lancedb",
        provider_config: {
          vector_ids: data.knowledgebase_ids
        }
      };
    }

    // Transform to ThinkVoicev2 API format
    const payload = {
      agent_config: {
        agent_name: data.agent_name,
        agent_welcome_message: data.agent_welcome_message || undefined,
        webhook_url: null,
        agent_type: data.business_type,
        tasks: [
          {
            task_type: "conversation",
            tools_config: {
              llm_agent: {
                agent_type: data.llm_agent_type,
                agent_flow_type: "streaming",
                llm_config: llmConfig
              },
              synthesizer: {
                provider: "elevenlabs",
                provider_config: {
                  voice: "Nila",
                  voice_id: data.voice_id,
                  model: "eleven_turbo_v2_5"
                },
                stream: true,
                buffer_size: 250,
                audio_format: "wav"
              },
              transcriber: {
                provider: "deepgram",
                model: data.transcriber_model,
                language: data.transcriber_language,
                stream: true,
                sampling_rate: 16000,
                encoding: "linear16",
                endpointing: 250
              },
              input: {
                provider: "plivo",
                format: "wav"
              },
              output: {
                provider: "plivo",
                format: "wav"
              },
              api_tools: null
            },
            toolchain: {
              execution: "parallel",
              pipelines: [["transcriber", "llm", "synthesizer"]]
            },
            task_config: {
              hangup_after_silence: 10,
              incremental_delay: 400,
              number_of_words_for_interruption: 2,
              hangup_after_LLMCall: false,
              call_cancellation_prompt: null,
              backchanneling: false,
              backchanneling_message_gap: 5,
              backchanneling_start_delay: 5,
              ambient_noise: false,
              ambient_noise_track: "office-ambience",
              call_terminate: 90,
              voicemail: false,
              inbound_limit: -1,
              whitelist_phone_numbers: null,
              disallow_unknown_numbers: false
            }
          }
        ]
      },
      agent_prompts: {
        task_1: {
          system_prompt: data.system_prompt
        }
      }
    };

    createAgent(payload, {
      onSuccess: (res: any) => {
        setOpen(false);
        form.reset();
        setSelectedKbs([]);
        if (onCreated) {
          onCreated(String(res.agent_id || res.id));
        }
      }
    });
  };

  const llmModels = modelsData?.llmModels || [];
  const providers = [...new Set(llmModels.map((m: any) => m.provider))].filter(Boolean);
  const filteredModels = llmModels.filter((m: any) => m.provider === selectedProvider);
  const voices = Array.isArray(voicesData) ? voicesData : (voicesData?.voices || voicesData?.data || []);
  const knowledgebases = Array.isArray(knowledgebasesData) ? knowledgebasesData : (knowledgebasesData?.data || []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Create Agent</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Set up a new voice AI agent with basic configuration
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="agent_name">Agent Name</Label>
            <Input
              id="agent_name"
              {...form.register("agent_name")}
              placeholder="e.g. Customer Support Agent"
            />
            {form.formState.errors.agent_name && (
              <p className="text-sm text-red-500">{form.formState.errors.agent_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent_welcome_message">Welcome Message (Optional)</Label>
            <Input
              id="agent_welcome_message"
              {...form.register("agent_welcome_message")}
              placeholder="e.g. Hello, how can I help you today?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="system_prompt">System Prompt</Label>
            <Textarea
              id="system_prompt"
              {...form.register("system_prompt")}
              placeholder="You are a helpful AI assistant..."
              className="min-h-[120px]"
            />
            {form.formState.errors.system_prompt && (
              <p className="text-sm text-red-500">{form.formState.errors.system_prompt.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business_type">Business Type</Label>
              <Select
                value={form.watch("business_type")}
                onValueChange={(value: any) => form.setValue("business_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="llm_agent_type">LLM Agent Type</Label>
              <Select
                value={form.watch("llm_agent_type")}
                onValueChange={(value: any) => form.setValue("llm_agent_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple_llm_agent">Simple LLM</SelectItem>
                  <SelectItem value="knowledgebase_agent">Knowledgebase</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {llmAgentType === "knowledgebase_agent" && (
            <div className="space-y-2">
              <Label>Knowledge Bases</Label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {knowledgebases.length > 0 ? (
                  knowledgebases.map((kb: any) => (
                    <div key={kb.vector_id} className="flex items-center space-x-2">
                      <Checkbox
                        id={kb.vector_id}
                        checked={selectedKbs.includes(kb.vector_id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedKbs([...selectedKbs, kb.vector_id]);
                          } else {
                            setSelectedKbs(selectedKbs.filter(id => id !== kb.vector_id));
                          }
                        }}
                      />
                      <label htmlFor={kb.vector_id} className="text-sm cursor-pointer">
                        {kb.name || kb.vector_id}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No knowledge bases available</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="llm_provider">LLM Provider</Label>
              <Select
                value={form.watch("llm_provider")}
                onValueChange={(value) => {
                  form.setValue("llm_provider", value);
                  // Reset model when provider changes
                  const firstModel = llmModels.find((m: any) => m.provider === value);
                  if (firstModel) {
                    form.setValue("llm_model", firstModel.model);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providers.length > 0 ? (
                    providers.map((provider: string) => (
                      <SelectItem key={provider} value={provider}>
                        {provider}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="openai">openai</SelectItem>
                      <SelectItem value="azure">azure</SelectItem>
                      <SelectItem value="anthropic">anthropic</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="llm_model">LLM Model</Label>
              <Select
                value={form.watch("llm_model")}
                onValueChange={(value) => form.setValue("llm_model", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filteredModels.length > 0 ? (
                    filteredModels.map((model: any) => (
                      <SelectItem key={model.model} value={model.model}>
                        {model.display_name || model.model}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                      <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="voice_id">Voice</Label>
              <Select
                value={form.watch("voice_id")}
                onValueChange={(value) => form.setValue("voice_id", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {voices.length > 0 ? (
                    voices.map((voice: any) => (
                      <SelectItem key={voice.voice_id || voice.id} value={voice.voice_id || voice.id}>
                        {voice.name} ({voice.provider})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="V9LCAAi4tTlqe9JadbCo">Nila (ElevenLabs)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transcriber_model">Transcriber Model</Label>
              <Select
                value={form.watch("transcriber_model")}
                onValueChange={(value) => form.setValue("transcriber_model", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nova-3">nova-3</SelectItem>
                  <SelectItem value="nova-2">nova-2</SelectItem>
                  <SelectItem value="nova-2-phonecall">nova-2-phonecall</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transcriber_language">Language</Label>
              <Select
                value={form.watch("transcriber_language")}
                onValueChange={(value) => form.setValue("transcriber_language", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Agent
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
