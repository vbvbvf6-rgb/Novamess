import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const GTA6_EVENT_QUERY_KEY = ["gta6-event"] as const;

export function useGta6Event() {
  const queryClient = useQueryClient();
  const query = useQuery<{ enabled: boolean }>({
    queryKey: GTA6_EVENT_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/gta6-event", { cache: "no-store" });
      if (!response.ok) throw new Error("Не удалось загрузить состояние события GTA VI");
      const settings = await response.json();
      const result = { enabled: settings?.enabled === true };
      localStorage.setItem("pulse-gta6-event-enabled", String(result.enabled));
      return result;
    },
    initialData: () => ({
      enabled: localStorage.getItem("pulse-gta6-event-enabled") === "true",
    }),
    initialDataUpdatedAt: 0,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: GTA6_EVENT_QUERY_KEY });
    };
    window.addEventListener("pulse:gta6-event-updated", refresh);
    return () => window.removeEventListener("pulse:gta6-event-updated", refresh);
  }, [queryClient]);

  return query.data?.enabled ?? false;
}
