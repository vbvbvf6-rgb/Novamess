import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Zap, Check, Star, Shield, MessageCircle, Gift, Image, Infinity } from "lucide-react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const PLANS = [
  {
    id: "monthly",
    name: "Месяц",
    price: 299,
    spark: 299,
    period: "/ месяц",
    badge: null,
  },
  {
    id: "halfyear",
    name: "6 месяцев",
    price: 249,
    spark: 1494,
    period: "/ месяц",
    badge: "Скидка 17%",
    best: true,
  },
  {
    id: "yearly",
    name: "Год",
    price: 199,
    spark: 2388,
    period: "/ месяц",
    badge: "Скидка 33%",
  },
];

const FEATURES = [
  { icon: Crown, text: "Значок Pulse Prime у имени" },
  { icon: MessageCircle, text: "Неограниченные сообщения без задержек" },
  { icon: Image, text: "Загрузка медиафайлов без ограничений" },
  { icon: Gift, text: "Эксклюзивные подарки только для Prime" },
  { icon: Zap, text: "50 Spark ⚡ каждый месяц в подарок" },
  { icon: Star, text: "Приоритетная поддержка 24/7" },
  { icon: Shield, text: "Расширенная приватность и защита" },
  { icon: Infinity, text: "Хранение истории сообщений навсегда" },
];

export default function Prime() {
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState("halfyear");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState((me as any)?.hasPrime ?? false);

  const plan = PLANS.find(p => p.id === selected)!;
  const wallet = (me as any)?.balance ?? 0;
  const hasPrime = (me as any)?.hasPrime ?? false;

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const uid = localStorage.getItem("pulse-user-id");
      const res = await fetch("/api/prime/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": uid ?? "" },
        body: JSON.stringify({ planId: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Ошибка подписки",
          description: data.error || "Не удалось оформить подписку",
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setSuccess(true);
      toast({
        title: "Pulse Prime активирован! ⭐",
        description: `Остаток: ${data.balance} ⚡ Spark`,
      });
    } catch {
      toast({ variant: "destructive", title: "Ошибка соединения" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border px-4 md:px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-yellow-500/20 flex items-center justify-center">
          <Crown size={18} className="text-yellow-400" />
        </div>
        <div>
          <h1 className="font-bold text-foreground text-lg leading-none">Pulse Prime</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Подписка с привилегиями</p>
        </div>
      </header>

      <div className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-yellow-500/20 via-orange-500/10 to-transparent border border-yellow-500/30 p-6 text-center"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl" />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center"
          >
            <Crown size={40} className="text-yellow-400" />
          </motion.div>
          <h2 className="text-2xl font-black text-foreground mb-2">Pulse Prime</h2>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Раскройте весь потенциал мессенджера с эксклюзивными привилегиями
          </p>
          <div className="mt-3 inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-4 py-1.5">
            <Zap size={14} className="text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-400">Оплата Spark</span>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-4 space-y-2.5"
        >
          <h3 className="text-sm font-bold text-foreground mb-3">Что включено</h3>
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                <f.icon size={14} className="text-yellow-400" />
              </div>
              <span className="text-sm text-foreground">{f.text}</span>
              <Check size={14} className="text-green-400 ml-auto shrink-0" />
            </div>
          ))}
        </motion.div>

        {/* Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-bold text-foreground">Выберите план</h3>
          {PLANS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                selected === p.id
                  ? "border-yellow-500/60 bg-yellow-500/10"
                  : "border-border bg-card hover:border-yellow-500/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selected === p.id ? "border-yellow-400 bg-yellow-400" : "border-border"
                }`}>
                  {selected === p.id && <Check size={10} className="text-black" />}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{p.name}</span>
                    {p.badge && (
                      <span className="text-[10px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                        {p.badge}
                      </span>
                    )}
                    {p.best && (
                      <span className="text-[10px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        Популярный
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{p.spark} ⚡ Spark всего</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-foreground">{p.price} ⚡</span>
                <div className="text-xs text-muted-foreground">{p.period}</div>
              </div>
            </button>
          ))}
        </motion.div>

        {/* Balance */}
        <div className="flex items-center justify-between text-sm px-1">
          <span className="text-muted-foreground">Ваш баланс:</span>
          <span className="font-bold text-foreground">{wallet} ⚡ Spark</span>
        </div>

        {/* Subscribe button */}
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center"
            >
              <Check size={40} className="mx-auto mb-3 text-green-400" />
              <h3 className="text-lg font-bold text-foreground mb-1">Добро пожаловать в Prime!</h3>
              <p className="text-sm text-muted-foreground">Все привилегии активированы</p>
            </motion.div>
          ) : (
            <motion.button
              key="button"
              onClick={handleSubscribe}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl text-black font-black text-base shadow-[0_0_30px_rgba(234,179,8,0.3)] disabled:opacity-60"
            >
              {loading ? "Обработка..." : `Подписаться — ${plan.spark} ⚡ Spark`}
            </motion.button>
          )}
        </AnimatePresence>

        <p className="text-xs text-muted-foreground text-center">
          Подписка продлевается автоматически каждый период. Отменить можно в настройках.
        </p>
      </div>
    </div>
  );
}
