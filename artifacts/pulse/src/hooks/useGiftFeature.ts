import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const GIFT_FEATURE_QUERY_KEY = ["gift-feature"] as const;

export function useGiftFeature() {
  const queryClient = useQueryClient();
  const query = useQuery<{ enabled: boolean }>({
    queryKey: GIFT_FEATURE_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/gift-feature", { cache: "no-store" });
      if (!response.ok) throw new Error("Не удалось загрузить состояние подарков");
      const settings = await response.json();
      const result = { enabled: settings?.enabled !== false };
      localStorage.setItem("pulse-gifts-enabled", String(result.enabled));
      return result;
    },
    initialData: () => ({
      enabled: localStorage.getItem("pulse-gifts-enabled") !== "false",
    }),
    initialDataUpdatedAt: 0,
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: GIFT_FEATURE_QUERY_KEY });
    };
    window.addEventListener("pulse:gift-feature-updated", refresh);
    return () => window.removeEventListener("pulse:gift-feature-updated", refresh);
  }, [queryClient]);

  return query.data?.enabled ?? true;
}
