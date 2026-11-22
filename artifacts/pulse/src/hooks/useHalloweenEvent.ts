import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const HALLOWEEN_EVENT_QUERY_KEY = ["halloween-event"] as const;

export function useHalloweenEvent() {
  const queryClient = useQueryClient();
  const query = useQuery<{ enabled: boolean }>({
    queryKey: HALLOWEEN_EVENT_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/halloween-event", { cache: "no-store" });
      if (!response.ok) throw new Error("Не удалось загрузить состояние события");
      const settings = await response.json();
      const result = { enabled: settings?.enabled !== false };
      localStorage.setItem("pulse-halloween-event-enabled", String(result.enabled));
      return result;
    },
    initialData: () => ({
      enabled: localStorage.getItem("pulse-halloween-event-enabled") !== "false",
    }),
    initialDataUpdatedAt: 0,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: HALLOWEEN_EVENT_QUERY_KEY });
    };
    window.addEventListener("pulse:halloween-event-updated", refresh);
    return () => window.removeEventListener("pulse:halloween-event-updated", refresh);
  }, [queryClient]);

  return query.data?.enabled ?? true;
}
