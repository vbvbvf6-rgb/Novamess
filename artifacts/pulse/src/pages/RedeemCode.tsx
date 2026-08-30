import { useState } from "react";
import { Gift, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function RedeemCode() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ amount: number; prizeType?: string; primeMonths?: number; nicknameStyle?: string; description?: string | null } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const redeem = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    setLoading(true);
    setSuccess(null);
    try {
      const token = sessionStorage.getItem("pulse-token");
      const response = await fetch("/api/users/me/prize-codes/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ code: normalized }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast({ title: data.error || "Код не активирован", variant: "destructive" });
        return;
      }
      setSuccess({ amount: data.amount, description: data.description });
      setCode("");
      await queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({ title: "Приз активирован", description: data.prizeType === "prime" ? `Prime на ${data.primeMonths} мес.` : data.prizeType === "nickname" ? "Цветной ник активирован" : `+${data.amount} искр` });
    } catch {
      toast({ title: "Нет соединения с сервером", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-4 md:p-8">
      <div className="max-w-xl mx-auto pt-8 md:pt-16">
        <div className="rounded-[28px] border border-amber-500/20 bg-gradient-to-br from-amber-500/15 via-card to-violet-500/10 p-6 md:p-8 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mb-5">
            <Gift size={27} className="text-amber-400" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400 mb-2">Nova rewards</p>
          <h1 className="text-3xl font-black tracking-tight">Активировать призовой код</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">Введите код от администратора, чтобы получить искры, Prime или цветной ник.</p>
          <form onSubmit={redeem} className="mt-7 space-y-3">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ваш код</label>
            <input
              value={code}
              onChange={event => setCode(event.target.value.toUpperCase())}
              placeholder="NOVA-XXXXXXXXXX"
              autoCapitalize="characters"
              autoComplete="off"
              className="w-full h-14 rounded-2xl border border-border bg-background/80 px-4 font-mono text-lg tracking-widest outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            />
            <button disabled={loading || !code.trim()} className="w-full h-12 rounded-2xl bg-amber-500 text-white font-black hover:bg-amber-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {loading ? "Проверяем…" : "Получить приз"}
            </button>
          </form>
          {success && (
            <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 flex items-start gap-3">
              <CheckCircle2 className="text-emerald-400 shrink-0" size={21} />
              <div>
                <p className="font-bold text-emerald-300">Приз успешно зачислен</p>
                <p className="text-sm text-emerald-200/80 mt-0.5">
                  {success.prizeType === "prime" ? `Prime на ${success.primeMonths} мес.` : success.prizeType === "nickname" ? "Цветной ник активирован" : `+${success.amount} искр`}
                  {success.description ? ` · ${success.description}` : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}