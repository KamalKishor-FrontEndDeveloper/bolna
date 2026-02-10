import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useApiKey() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const keyName = "BOLNA_API_KEY";

  const { data: hasKey, isLoading } = useQuery({
    queryKey: [api.keys.get.path, keyName],
    queryFn: async () => {
      const headers: Record<string,string> = {};
      const res = await fetch(api.keys.get.path.replace(":key", keyName), { headers });
      if (!res.ok) {
        if (res.status === 401) return false;
        throw new Error("Failed to fetch API key status");
      }
      const data = await res.json();
      return !!data.value;
    },
  });

  const saveKey = useMutation({
    mutationFn: async (keyValue: string) => {
      const headers: Record<string,string> = { "Content-Type": "application/json" };

      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(api.keys.save.path, {
        method: api.keys.save.method,
        headers,
        body: JSON.stringify({ key: keyName, value: keyValue }),
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        const err = await res.json().catch(() => ({ message: "Failed to save API key" }));
        throw new Error(err.message || "Failed to save API key");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.keys.get.path, keyName] });
      toast({
        title: "Success",
        description: "API Key saved successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to save API Key. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    hasKey,
    isLoading,
    saveKey,
  };
}
