import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

async function getAuthHeader() {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No authentication token found");
  return { "Authorization": `Bearer ${token}` };
}

export function useTenantLimits() {
  return useQuery({
    queryKey: [api.tenant.limits.path],
    queryFn: async () => {
      const headers = await getAuthHeader();
      const res = await fetch(api.tenant.limits.path, { headers });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch tenant limits");
      return await res.json();
    },
  });
}