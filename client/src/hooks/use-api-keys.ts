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
      // We assume the API returns 200 with { value: string } if it exists
      // Using a simple fetch here to check existence
      const res = await fetch(api.keys.get.path.replace(":key", keyName));
      if (!res.ok) return false;
      const data = await res.json();
      return !!data.value; // Return true if value exists
    },
  });

  const saveKey = useMutation({
    mutationFn: async (keyValue: string) => {
      const res = await fetch(api.keys.save.path, {
        method: api.keys.save.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyName, value: keyValue }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to save API key");
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save API Key. Please try again.",
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
