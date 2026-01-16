import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { CreateAgentRequest, UpdateAgentRequest, MakeCallRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// === AGENTS ===

export function useAgents() {
  return useQuery({
    queryKey: [api.bolna.agents.list.path],
    queryFn: async () => {
      const res = await fetch(api.bolna.agents.list.path);
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch agents");
      return await res.json();
    },
  });
}

export function useAgent(id: string | null) {
  return useQuery({
    queryKey: [api.bolna.agents.get.path, id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.bolna.agents.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch agent details");
      return await res.json();
    },
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateAgentRequest) => {
      const res = await fetch(api.bolna.agents.create.path, {
        method: api.bolna.agents.create.method,
        headers: { "Content-Type": "application/json" },
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
      const url = buildUrl(api.bolna.agents.update.path, { id });
      const res = await fetch(url, {
        method: api.bolna.agents.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to update agent");
      return await res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [api.bolna.agents.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.bolna.agents.get.path, id] });
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
      const url = buildUrl(api.bolna.agents.delete.path, { id });
      const res = await fetch(url, {
        method: api.bolna.agents.delete.method,
      });

      if (!res.ok) throw new Error("Failed to delete agent");
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

export function useAgentExecutions(agentId: string | null) {
  return useQuery({
    queryKey: [api.bolna.agents.executions.path, agentId],
    enabled: !!agentId,
    queryFn: async () => {
      if (!agentId) return null;
      const url = buildUrl(api.bolna.agents.executions.path, { id: agentId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch executions");
      return await res.json();
    },
  });
}

// === CALLS ===

export function useMakeCall() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: MakeCallRequest) => {
      const res = await fetch(api.bolna.calls.make.path, {
        method: api.bolna.calls.make.method,
        headers: { "Content-Type": "application/json" },
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

// === EXECUTIONS ===

export function useExecution(id: string | null) {
  return useQuery({
    queryKey: [api.bolna.executions.get.path, id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.bolna.executions.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch execution");
      return await res.json();
    },
  });
}
