import { useState } from "react";
import { Crown, Gift, X, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { getGetChatsQueryKey, getGetMeQueryKey, getGetUserByIdQueryKey, useGetMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const PLANS = {
  prime: [
    { id: "monthly", label: "1 месяц", months: 1, price: 499 },
    { id: "halfyear", label: "6 месяцев", months: 6, price: 1974 },
    { id: "yearly", label: "12 месяцев", months: 12, price: 2988 },
  ],
  prime_plus: [
    { id: "monthly", label: "1 месяц", months: 1, price: 899 },
    { id: "halfyear", label: "6 месяцев", months: 6, price: 3594 },
    { id: "yearly", label: "12 месяцев", months: 12, price: 5388 },
  ],
};

type Tier = keyof typeof PLANS;

export function PrimeGiftDialog({
  recipientId,
  recipientName,
  onClose,
}: {
  recipientId: number;
  recipientName: string;
  onClose: () => void;
}) {
  const { data: me } = useGetMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tier, setTier] = useState<Tier>("prime");
  const [planId, setPlanId] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const plans = PLANS[tier];
  const selectedPlan = plans.find(plan => plan.id === planId) ?? plans[0];

  const sendGift = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("pulse-token");
      const response = await fetch("/api/prime/gift", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ planId, recipientId, tier }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось подарить подписку");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetUserByIdQueryKey(recipientId) }),
        queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() }),
      ]);
      toast({
        title: `Подписка ${tier === "prime_plus" ? "Prime+" : "Prime"} отправлена`,
        description: `${recipientName} получит ${selectedPlan.label.toLowerCase()} подписки.`,
      });
      onClose();
    } catch (error) {
      toast({
        title: "Не удалось подарить подписку",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      data-testid="dialog-gift-prime"
    >
      <motion.div
        className="w-full max-w-md overflow-hidden rounded-[28px] border border-border bg-card shadow-2xl"
        initial={{ y: 24, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 24, scale: 0.97 }}
      >
        <div className="relative overflow-hidden border-b border-border px-5 pb-4 pt-5">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-transparent to-purple-500/10" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-400">
              <Gift size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-black">Подарить Prime</h2>
              <p className="truncate text-xs text-muted-foreground">Для {recipientName}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Закрыть">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary/60 p-1">
            {(["prime", "prime_plus"] as Tier[]).map(value => (
              <button
                key={value}
                type="button"
                onClick={() => { setTier(value); setPlanId("monthly"); }}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
                  tier === value
                    ? value === "prime_plus" ? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow" : "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`button-select-gift-${value}`}
              >
                <Crown size={15} /> {value === "prime_plus" ? "Prime+" : "Prime"}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Срок подписки</p>
            {plans.map(plan => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setPlanId(plan.id)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                  planId === plan.id ? "border-primary/50 bg-primary/10" : "border-border bg-background hover:bg-secondary"
                }`}
                data-testid={`button-gift-plan-${tier}-${plan.id}`}
              >
                <span className="text-sm font-bold">{plan.label}</span>
                <span className="flex items-center gap-1 text-sm font-black text-primary"><Zap size={14} /> {plan.price} ✦</span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3 text-xs">
            <span className="text-muted-foreground">Ваш баланс</span>
            <span className="font-black">{Number((me as any)?.balance ?? 0).toLocaleString("ru-RU")} ✦</span>
          </div>
          <button
            type="button"
            onClick={() => void sendGift()}
            disabled={loading || Number((me as any)?.balance ?? 0) < selectedPlan.price}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 py-3.5 text-sm font-black text-white shadow-lg shadow-amber-500/15 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
            data-testid="button-send-prime-gift"
          >
            {loading ? "Отправляем…" : `Подарить за ${selectedPlan.price} ✦`}
          </button>
          {Number((me as any)?.balance ?? 0) < selectedPlan.price && (
            <p className="-mt-3 text-center text-xs text-destructive">Недостаточно Nova ✦ для выбранного тарифа</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
