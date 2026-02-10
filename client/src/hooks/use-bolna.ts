import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { CreateAgentRequest, UpdateAgentRequest, MakeCallRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// === AGENTS ===

async function getAuthHeader() {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No authentication token found");
  return { "Authorization": `Bearer ${token}` };
}

export function useAgents() {
  return useQuery({
    queryKey: [api.bolna.agents.list.path],
    queryFn: async () => {
      const headers = await getAuthHeader();
      const res = await fetch(api.bolna.agents.list.path, { headers });
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch agents");

      // Normalize agents so UI works with both local DB shape and Bolna's API shape
      const data = await res.json();
      if (!Array.isArray(data)) return [];

      return data.map((agent: any) => {
        const agent_config = agent.agent_config ?? {
          agent_name: agent.agent_name ?? (agent.agent_config && agent.agent_config.agent_name) ?? 'Unnamed Agent',
          agent_welcome_message: agent.agent_welcome_message ?? (agent.agent_config && agent.agent_config.agent_welcome_message) ?? '',
          tasks: agent.tasks ?? (agent.agent_config && agent.agent_config.tasks) ?? [],
          webhook_url: agent.webhook_url ?? (agent.agent_config && agent.agent_config.webhook_url) ?? ''
        };

        const agent_prompts = agent.agent_prompts ?? {};

        return { ...agent, agent_config, agent_prompts };
      });
    },
  });
}

export function useAgent(id: string | null) {
  return useQuery({
    queryKey: [api.bolna.agents.get.path, id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const headers = await getAuthHeader();
      const url = buildUrl(api.bolna.agents.get.path, { id });
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch agent details");
      return await res.json();
    },
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateAgentRequest) => {
      const headers = Object.assign({ "Content-Type": "application/json" }, await getAuthHeader());
      const res = await fetch(api.bolna.agents.create.path, {
        method: api.bolna.agents.create.method,
        headers,
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create agent");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bolna.agents.list.path] });
      toast({ title: "Agent Created", description: "Your new agent is ready." });
    },
    onError: (err) => {
      toast({ 
        title: "Creation Failed", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAgentRequest }) => {
      const headers = Object.assign({ "Content-Type": "application/json" }, await getAuthHeader());
      const url = buildUrl(api.bolna.agents.update.path, { id });
      const res = await fetch(url, {
        method: api.bolna.agents.update.method,
        headers,
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update agent");
      }
      return await res.json();
    },
    onSuccess: async (_, { id }) => {
      // Ensure list is refreshed
      queryClient.invalidateQueries({ queryKey: [api.bolna.agents.list.path] });

      // Fetch full agent details (some fields like calling_guardrails may only be available from the detail endpoint)
      try {
        const headers = await getAuthHeader();
        const url = buildUrl(api.bolna.agents.get.path, { id });
        const res = await fetch(url, { headers });
        if (res.ok) {
          const agent = await res.json();
          // Cache the detailed agent response so UI can read fields directly
          queryClient.setQueryData([api.bolna.agents.get.path, id], agent);
          // Also try to update the single agent in the agents list if present
          queryClient.setQueryData([api.bolna.agents.list.path], (old: any) => {
            if (!old || !Array.isArray(old)) return old;
            return old.map((a: any) => (String(a.id) === String(id) ? agent : a));
          });
        } else {
          // Fallback to invalidating the detail query
          queryClient.invalidateQueries({ queryKey: [api.bolna.agents.get.path, id] });
        }
      } catch (e) {
        queryClient.invalidateQueries({ queryKey: [api.bolna.agents.get.path, id] });
      }

      toast({ title: "Agent Updated", description: "Changes have been saved." });
    },
    onError: (err) => {
      toast({ 
        title: "Update Failed", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await getAuthHeader();
      const url = buildUrl(api.bolna.agents.delete.path, { id });
      const res = await fetch(url, {
        method: api.bolna.agents.delete.method,
        headers,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete agent");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bolna.agents.list.path] });
      toast({ title: "Agent Deleted", description: "The agent has been removed." });
    },
    onError: (err) => {
      toast({ 
        title: "Delete Failed", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  });
}

export function useAgentExecutions(agentId: string | null, params?: {
  page_number?: number;
  page_size?: number;
  status?: string;
  call_type?: string;
  provider?: string;
  answered_by_voice_mail?: boolean;
  batch_id?: string;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: [api.bolna.agents.executions.path, agentId, params],
    enabled: !!agentId,
    queryFn: async () => {
      if (!agentId) return null;
      const headers = await getAuthHeader();
      const url = buildUrl(api.bolna.agents.executions.path, { id: agentId });
      
      // Add query parameters
      const searchParams = new URLSearchParams();
      if (params?.page_number) searchParams.set('page_number', params.page_number.toString());
      if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
      if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
      if (params?.call_type && params.call_type !== 'all') searchParams.set('call_type', params.call_type);
      if (params?.provider && params.provider !== 'all') searchParams.set('provider', params.provider);
      if (params?.answered_by_voice_mail !== undefined) searchParams.set('answered_by_voice_mail', params.answered_by_voice_mail.toString());
      if (params?.batch_id) searchParams.set('batch_id', params.batch_id);
      if (params?.from) searchParams.set('from', params.from);
      if (params?.to) searchParams.set('to', params.to);
      
      const finalUrl = searchParams.toString() ? `${url}?${searchParams.toString()}` : url;
      const res = await fetch(finalUrl, { headers });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch executions");
      return await res.json();
    },
  });
}

// === CALLS ===

export function useMakeCall() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: MakeCallRequest) => {
      const headers = Object.assign({ "Content-Type": "application/json" }, await getAuthHeader());
      const res = await fetch(api.bolna.calls.make.path, {
        method: api.bolna.calls.make.method,
        headers,
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to initiate call");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Call Initiated", 
        description: `Execution ID: ${data.execution_id}` 
      });
    },
    onError: (err) => {
      toast({ 
        title: "Call Failed", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  });
}

export function useStopAgentCalls() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (agentId: string) => {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/bolna/agents/${agentId}/stop`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to stop agent calls");
      }
      return await res.json();
    },
    onSuccess: (data, agentId) => {
      queryClient.invalidateQueries({ queryKey: [api.bolna.agents.executions.path, agentId] });
      const count = data?.stopped_executions?.length || 0;
      toast({ 
        title: "Queued Calls Stopped", 
        description: `Cancelled ${count} queued call(s) for this agent` 
      });
    },
    onError: (err) => {
      toast({ 
        title: "Stop Failed", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  });
}

export function useStopCall() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (executionId: string) => {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/bolna/calls/${executionId}/stop`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to stop call");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Call Stopped", 
        description: "The queued/scheduled call has been cancelled" 
      });
    },
    onError: (err) => {
      toast({ 
        title: "Stop Failed", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  });
}

// === EXECUTIONS ===

export function useExecution(id: string | null, agentId: string | null) {
  return useQuery({
    queryKey: [api.bolna.executions.get.path, id, agentId],
    enabled: !!id && !!agentId,
    queryFn: async () => {
      if (!id || !agentId) return null;
      const headers = await getAuthHeader();
      const url = buildUrl(api.bolna.executions.get.path, { id });
      const res = await fetch(`${url}?agent_id=${agentId}`, { headers });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch execution");
      return await res.json();
    },
  });
}

export function useExecutionLogs(id: string | null) {
  return useQuery({
    queryKey: ['/api/bolna/executions', id, 'log'],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const headers = await getAuthHeader();
      const res = await fetch(`/api/bolna/executions/${id}/log`, { headers });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch execution logs");
      return await res.json();
    },
  });
}

// === BATCHES ===

export function useBatches() {
  return useQuery({
    queryKey: [api.bolna.agents.batches.path],
    queryFn: async () => {
      const headers = await getAuthHeader();
      const res = await fetch(api.bolna.agents.batches.path, { headers });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch batches");
      return await res.json();
    },
  });
}

export function useAgentBatches(agentId: string | null) {
  return useQuery({
    queryKey: [api.bolna.agents.agentBatches.path, agentId],
    enabled: !!agentId && agentId !== '',
    queryFn: async () => {
      if (!agentId || agentId === '') return [];
      const headers = await getAuthHeader();
      const url = buildUrl(api.bolna.agents.agentBatches.path, { id: agentId });
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch agent batches");
      return await res.json();
    },
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: FormData) => {
      const headers = await getAuthHeader();
      const res = await fetch(api.bolna.agents.createBatch.path, {
        method: api.bolna.agents.createBatch.method,
        headers,
        body: data,
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to create batch");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bolna.agents.agentBatches.path] });
      toast({ title: "Batch Created", description: "Your batch processing has started." });
    },
    onError: (err) => {
      toast({ 
        title: "Batch Creation Failed", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  });
}

export function useScheduleBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ batchId, scheduled_at, bypass_call_guardrails }: { batchId: string; scheduled_at: string; bypass_call_guardrails?: boolean }) => {
      const headers = Object.assign({ "Content-Type": "application/json" }, await getAuthHeader());
      const url = `/api/bolna/batches/${batchId}/schedule`;
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ scheduled_at, bypass_call_guardrails })
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to schedule batch");
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.bolna.agents.agentBatches.path] });
      toast({ title: "Batch Scheduled", description: "Batch is scheduled successfully." });
    },
    onError: (err) => {
      toast({ 
        title: "Schedule Failed", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  });
}

export function useStopBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (batchId: string) => {
      const headers = await getAuthHeader();
      const url = `/api/bolna/batches/${batchId}/stop`;
      const res = await fetch(url, {
        method: 'POST',
        headers,
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to stop batch");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bolna.agents.agentBatches.path] });
      toast({ title: "Batch Stopped", description: "Batch has been stopped successfully." });
    },
    onError: (err) => {
      toast({ 
        title: "Stop Failed", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  });
}

export function useDeleteBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (batchId: string) => {
      const headers = await getAuthHeader();
      const url = `/api/bolna/batches/${batchId}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        let errorMsg = "Failed to delete batch";
        try {
          const error = await res.json();
          errorMsg = error.message || errorMsg;
        } catch (e) {
          errorMsg = `Failed to delete batch (${res.status})`;
        }
        throw new Error(errorMsg);
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bolna.agents.agentBatches.path] });
      toast({ title: "Batch Deleted", description: "Batch has been deleted successfully." });
    },
    onError: (err: any) => {
      toast({ 
        title: "Delete Failed", 
        description: err?.message || "Failed to delete batch", 
        variant: "destructive" 
      });
    }
  });
}

// === KNOWLEDGEBASE ===

export function useKnowledgebases() {
  return useQuery({
    queryKey: [api.bolna.knowledgebase.list.path],
    queryFn: async () => {
      const headers = await getAuthHeader();
      const res = await fetch(api.bolna.knowledgebase.list.path, { headers });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch knowledgebases");
      return await res.json();
    },
  });
}

export function useModels() {
  return useQuery({
    queryKey: [api.bolna.knowledgebase.models.list.path],
    queryFn: async () => {
      const headers = await getAuthHeader();
      const res = await fetch(api.bolna.knowledgebase.models.list.path, { headers });
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch models");
      return await res.json();
    },
  });
}

export function useVoices() {
  return useQuery({
    queryKey: [api.bolna.phoneNumbers.voices.path],
    queryFn: async () => {
      const headers = await getAuthHeader();
      const res = await fetch(api.bolna.phoneNumbers.voices.path, { headers });
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch voices");
      return await res.json();
    },
  });
}

export function useCreateKnowledgebase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      // If data is a FormData instance, send it as multipart without setting Content-Type
      if (data instanceof FormData) {
        const headers = await getAuthHeader();
        const res = await fetch(api.bolna.knowledgebase.create.path, {
          method: api.bolna.knowledgebase.create.method,
          headers,
          body: data as any,
        });
        if (!res.ok) throw new Error((await res.json()).message || "Failed to create knowledgebase");
        return await res.json();
      }

      const headers = Object.assign({ "Content-Type": "application/json" }, await getAuthHeader());
      const res = await fetch(api.bolna.knowledgebase.create.path, {
        method: api.bolna.knowledgebase.create.method,
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to create knowledgebase");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bolna.knowledgebase.list.path] });
      toast({ title: "Knowledge Base Created", description: "Your document is being processed." });
    },
  });
}

export function useDeleteKnowledgebase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await getAuthHeader();
      const url = buildUrl(api.bolna.knowledgebase.delete.path, { id });
      const res = await fetch(url, {
        method: api.bolna.knowledgebase.delete.method,
        headers,
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to delete knowledgebase");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bolna.knowledgebase.list.path] });
      toast({ title: "Knowledge Base Deleted", description: "The document has been removed." });
    },
  });
}