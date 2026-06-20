import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, Zap, Check, Star, Shield, Image,
  Infinity as InfinityIcon, X, AlertTriangle, Palette, RefreshCw, TrendingUp,
  ShoppingCart, Bell, Clock, Lock, CalendarClock, RotateCcw, Flame,
  Sparkles, Brush, Layers, ChevronDown, ChevronUp,
  Smile, Music, Globe,
  BarChart3, QrCode, Headphones, Wand2, Trash2
} from "lucide-react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// ─── Plan definitions ────────────────────────────────────────────────────────

const PRIME_PLANS = [
  { id: "monthly",  name: "Месяц",    price: 499,  spark: 499,  period: "/ месяц", badge: null,          best: false },
  { id: "halfyear", name: "6 месяцев",price: 329,  spark: 1974, period: "/ месяц", badge: "Скидка 34%",  best: true  },
  { id: "yearly",   name: "Год",       price: 249,  spark: 2988, period: "/ месяц", badge: "Скидка 50%",  best: false },
];

const PLUS_PLANS = [
  { id: "monthly",  name: "Месяц",    price: 899,  spark: 899,  period: "/ месяц", badge: null,          best: false },
  { id: "halfyear", name: "6 месяцев",price: 599,  spark: 3594, period: "/ месяц", badge: "Скидка 33%",  best: true  },
  { id: "yearly",   name: "Год",       price: 449,  spark: 5388, period: "/ месяц", badge: "Скидка 50%",  best: false },
];

// ─── Feature lists ────────────────────────────────────────────────────────────

const PRIME_FEATURES = [
  { icon: Crown,        text: "Золотое кольцо вокруг аватара в чатах и профиле",  color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { icon: Star,         text: "Значок Prime ⭐ у вашего имени везде",              color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { icon: Palette,      text: "Эксклюзивные темы: Obsidian, Midnight, Forest",    color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { icon: TrendingUp,   text: "2× Spark за выполнение ежедневных заданий",        color: "text-green-400",  bg: "bg-green-500/10"  },
  { icon: Zap,          text: "Ежедневный бонус 25 ⚡ вместо 10 ⚡",              color: "text-green-400",  bg: "bg-green-500/10"  },
  { icon: RefreshCw,    text: "Смена никнейма каждые 24ч вместо 7 дней",          color: "text-green-400",  bg: "bg-green-500/10"  },
  { icon: Image,        text: "Загрузка медиа без ограничений размера",            color: "text-green-400",  bg: "bg-green-500/10"  },
  { icon: InfinityIcon, text: "Хранение истории сообщений навсегда",              color: "text-green-400",  bg: "bg-green-500/10"  },
  { icon: Lock,         text: "Скрытый онлайн-статус",                            color: "text-green-400",  bg: "bg-green-500/10"  },
  { icon: Clock,        text: "Отложенная отправка сообщений по расписанию",      color: "text-green-400",  bg: "bg-green-500/10"  },
  { icon: Bell,         text: "Приоритетные уведомления и поддержка 24/7",        color: "text-green-400",  bg: "bg-green-500/10"  },
  { icon: Shield,       text: "VIP-метка в группах и каналах",                   color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { icon: Zap,          text: "50 ⚡ Spark бонус при оформлении",                 color: "text-green-400",  bg: "bg-green-500/10"  },
];

const PLUS_EXCLUSIVE = [
  { icon: Sparkles,     text: "Алмазное анимированное кольцо вместо золотого",        color: "text-purple-400", bg: "bg-purple-500/10" },
  { icon: Star,         text: "Значок PRIME+ 💎 с градиентом у имени",                color: "text-purple-400", bg: "bg-purple-500/10" },
  { icon: TrendingUp,   text: "3× Spark вместо 2× за ежедневные задания",             color: "text-fuchsia-400",bg: "bg-fuchsia-500/10"},
  { icon: Zap,          text: "Ежедневный бонус 50 ⚡ вместо 25 ⚡",                  color: "text-fuchsia-400",bg: "bg-fuchsia-500/10"},
  { icon: Brush,        text: "Кастомный цвет имени: градиентный текст",              color: "text-purple-400", bg: "bg-purple-500/10" },
  { icon: Palette,      text: "Полная палитра тем + анимированный фон профиля",       color: "text-purple-400", bg: "bg-purple-500/10" },
  { icon: Layers,       text: "Эксклюзивный пак стикеров Prime+",                    color: "text-purple-400", bg: "bg-purple-500/10" },
  { icon: Shield,       text: "VIP+ метка в группах и каналах",                      color: "text-purple-400", bg: "bg-purple-500/10" },
  { icon: Zap,          text: "100 ⚡ Spark бонус при оформлении",                    color: "text-fuchsia-400",bg: "bg-fuchsia-500/10"},
  { icon: Trash2,       text: "Просмотр удалённых сообщений — 48 часов",             color: "text-violet-400", bg: "bg-violet-500/10" },
  { icon: Globe,        text: "Кастомный анимированный статус профиля",               color: "text-violet-400", bg: "bg-violet-500/10" },
  { icon: Smile,        text: "Двойные реакции: отправляй ×2 реакции на сообщение",  color: "text-fuchsia-400",bg: "bg-fuchsia-500/10"},
  { icon: Music,        text: "Кастомные звуки и рингтоны уведомлений",               color: "text-purple-400", bg: "bg-purple-500/10" },
  { icon: Wand2,        text: "Эффекты отправки: конфетти, снег, огонь в чате",       color: "text-purple-400", bg: "bg-purple-500/10" },
  { icon: QrCode,       text: "QR-код профиля с кастомным дизайном Prime+",           color: "text-violet-400", bg: "bg-violet-500/10" },
  { icon: BarChart3,    text: "Детальная статистика трат Spark и активности",          color: "text-violet-400", bg: "bg-violet-500/10" },
  { icon: Headphones,   text: "Эксклюзивный доступ к Prime+ Lounge — закрытому чату", color: "text-fuchsia-400",bg: "bg-fuchsia-500/10"},
];

// ─── Comparison table ─────────────────────────────────────────────────────────

const COMPARISON_ROWS = [
  { label: "Значок у имени",           prime: "⭐ Prime",       plus: "💎 Prime+ градиент" },
  { label: "Кольцо аватара",           prime: "Золотое",         plus: "Алмазное анимированное" },
  { label: "Ежедневный Spark бонус",   prime: "25 ⚡",           plus: "50 ⚡" },
  { label: "Множитель заданий",        prime: "2×",              plus: "3×" },
  { label: "Бонус при старте",         prime: "50 ⚡",           plus: "100 ⚡" },
  { label: "Темы оформления",          prime: "3 темы",          plus: "Все темы + анимация" },
  { label: "Цвет имени",              prime: "—",               plus: "Градиент на выбор" },
  { label: "Двойные реакции",          prime: "—",               plus: "✓" },
  { label: "Prime+ Lounge",            prime: "—",               plus: "✓ Эксклюзив" },
];

// ─── Countdown ────────────────────────────────────────────────────────────────

function useTick(expiresAt: string) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(expiresAt).getTime() - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now())), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  const days    = Math.floor(remaining / 86400000);
  const hours   = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return { days, hours, minutes, seconds, totalMs: remaining };
}

function PrimeCountdown({ expiresAt, tier, onRenew }: { expiresAt: string; tier: string; onRenew: () => void }) {
  const { days, hours, minutes, seconds, totalMs } = useTick(expiresAt);
  const expired   = totalMs <= 0;
  const isCritical = !expired && days < 1;
  const isWarning  = !expired && days < 7;
  const isPlus     = tier === "prime_plus";

  const arcColor   = expired ? "#ef4444" : isCritical ? "#ef4444" : isWarning ? "#f97316" : isPlus ? "#a855f7" : "#eab308";
  const glowColor  = expired ? "rgba(239,68,68,0.3)" : isPlus ? "rgba(168,85,247,0.2)" : "rgba(234,179,8,0.2)";
  const R = 52, C = 2 * Math.PI * R;
  const planMs  = (new Date(expiresAt).getTime() - Date.now() + totalMs);
  const progress = Math.min(1, Math.max(0, 1 - totalMs / Math.max(planMs, 1)));
  const dashOffset = C * (1 - progress);
  const expiryStr = new Date(expiresAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-3xl border p-5 overflow-hidden ${
        expired ? "bg-destructive/5 border-destructive/30"
        : isPlus ? "bg-purple-500/5 border-purple-500/30"
        : "bg-card border-border"
      }`}
      style={{ boxShadow: `0 0 40px ${glowColor}` }}
    >
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none" style={{ background: glowColor }} />
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <CalendarClock size={16} className={isPlus ? "text-purple-400" : "text-yellow-400"} />
        <span className="text-sm font-bold text-foreground">
          Ваша подписка {isPlus ? "Prime+" : "Prime"}
        </span>
        {isWarning && !expired && (
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full border bg-orange-500/20 text-orange-400 border-orange-500/30"
          >
            ⚠ Скоро истекает
          </motion.span>
        )}
        {expired && (
          <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full border bg-destructive/20 text-destructive border-destructive/30">
            Истекла
          </span>
        )}
      </div>

      <div className="flex items-center gap-5 relative z-10">
        <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
          <svg width="120" height="120" className="-rotate-90">
            <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeWidth="6" className="text-border" />
            <circle cx="60" cy="60" r={R} fill="none" stroke={arcColor} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {expired ? (
              <span className="text-destructive font-black text-sm">Истекла</span>
            ) : (
              <>
                <span className="text-3xl font-black leading-none" style={{ color: arcColor }}>{days}</span>
                <span className="text-xs text-muted-foreground font-medium">{days === 1 ? "день" : days < 5 ? "дня" : "дней"}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="grid grid-cols-3 gap-1.5">
            {[{ label: "часов", value: hours }, { label: "минут", value: minutes }, { label: "секунд", value: seconds }].map(({ label, value }) => (
              <div key={label} className={`rounded-xl p-2 text-center ${isPlus ? "bg-purple-500/10" : "bg-secondary/50"}`}>
                <div className="text-base font-black text-foreground tabular-nums">{String(value).padStart(2, "0")}</div>
                <div className="text-[10px] text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={11} />
            <span>{expired ? "Истекла" : "Истекает"} {expiryStr}</span>
          </div>
        </div>
      </div>

      {(isWarning || expired) && (
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={onRenew}
          className={`mt-4 w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
            isPlus
              ? "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]"
              : "bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.25)]"
          }`}
        >
          <Crown size={14} />
          {expired ? "Восстановить подписку" : "Продлить подписку"}
        </motion.button>
      )}
      {!isWarning && !expired && (
        <button onClick={onRenew}
          className={`mt-4 w-full py-2.5 rounded-xl border text-xs font-semibold hover:bg-secondary transition-colors flex items-center justify-center gap-1.5 relative z-10 ${
            isPlus ? "border-purple-500/30 text-purple-400" : "border-yellow-500/30 text-yellow-400"
          }`}
        >
          <RotateCcw size={12} /> Продлить заранее
        </button>
      )}
    </motion.div>
  );
}

// ─── Feature row ─────────────────────────────────────────────────────────────

function FeatureRow({ icon: Icon, text, color, bg }: { icon: React.ElementType; text: string; color: string; bg: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon size={14} className={color} />
      </div>
      <span className="text-sm text-foreground flex-1 leading-snug">{text}</span>
      <Check size={13} className="text-green-400 shrink-0" />
    </div>
  );
}

// ─── Plan picker ─────────────────────────────────────────────────────────────

function PlanPicker({ plans, selected, onSelect, accentClass }: {
  plans: typeof PRIME_PLANS;
  selected: string;
  onSelect: (id: string) => void;
  accentClass: string;
}) {
  return (
    <div className="space-y-2">
      {plans.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all ${
            selected === p.id ? `${accentClass} border-opacity-60` : "border-border bg-card/50 hover:border-border"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
              selected === p.id ? "border-current bg-current" : "border-muted-foreground"
            }`}>
              {selected === p.id && <Check size={9} className="text-background" />}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-bold text-foreground">{p.name}</span>
                {p.badge && <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">{p.badge}</span>}
                {p.best  && <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Популярный</span>}
              </div>
              <div className="text-[11px] text-muted-foreground">{p.spark} ⚡ всего</div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-base font-black text-foreground">{p.price} ⚡</div>
            <div className="text-[11px] text-muted-foreground">{p.period}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function PrimePlusPanel({ navigate, toast, queryClient }: {
  navigate: (to: string) => void;
  toast: (opts: any) => void;
  queryClient: any;
}) {
  const [loungeLoading, setLoungeLoading] = useState(false);

  const openLounge = async () => {
    setLoungeLoading(true);
    try {
      const token = sessionStorage.getItem("pulse-token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/prime/lounge", { headers });
      if (res.ok) {
        const data = await res.json();
        navigate(`/chat/${data.loungeId}`);
      } else {
        toast({ title: "Не удалось открыть лаунж", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка подключения", variant: "destructive" });
    }
    setLoungeLoading(false);
  };

  return (
    <div className="space-y-3">
      {/* Prime+ Lounge */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="relative rounded-2xl border border-purple-500/30 overflow-hidden p-4"
        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.04))" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-2xl"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.15))" }}
          >
            💎
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-foreground">Prime+ Lounge</p>
            <p className="text-xs text-muted-foreground">Закрытый чат только для Prime+ участников</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={openLounge}
            disabled={loungeLoading}
            className="px-4 py-2 rounded-xl text-sm font-black text-white transition-all shrink-0"
            style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
          >
            {loungeLoading ? "..." : "Войти"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

export default function Prime() {
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [activeTab, setActiveTab] = useState<"prime" | "prime_plus">("prime");
  const [primePlan,  setPrimePlan]  = useState("halfyear");
  const [plusPlan,   setPlusPlan]   = useState("halfyear");
  const [loading,    setLoading]    = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [pendingTier, setPendingTier] = useState<"prime" | "prime_plus">("prime");
  const [showAllPrime, setShowAllPrime] = useState(false);
  const [showAllPlus,  setShowAllPlus]  = useState(false);

  const wallet     = (me as any)?.balance ?? 0;
  const hasPrime   = (me as any)?.hasPrime ?? false;
  const primeTier  = (me as any)?.primeTier ?? null;
  const primeExpiresAt: string | null = (me as any)?.primeExpiresAt ?? null;

  const isSubscribedPrime     = hasPrime && primeTier === "prime";
  const isSubscribedPlus      = hasPrime && primeTier === "prime_plus";

  const currentPrimePlan = PRIME_PLANS.find(p => p.id === primePlan)!;
  const currentPlusPlan  = PLUS_PLANS.find(p => p.id === plusPlan)!;

  const openModal = (tier: "prime" | "prime_plus") => {
    setPendingTier(tier);
    setShowModal(true);
  };

  const selectedPlan = pendingTier === "prime_plus" ? currentPlusPlan : currentPrimePlan;
  const canAfford = wallet >= selectedPlan.spark;

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const _token = sessionStorage.getItem("pulse-token");
      const _auth: Record<string, string> = _token ? { "Authorization": `Bearer ${_token}` } : {};
      const res = await fetch("/api/prime/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", ..._auth },
        body: JSON.stringify({ planId: pendingTier === "prime_plus" ? plusPlan : primePlan, tier: pendingTier }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: "Ошибка подписки", description: data.error || "Не удалось оформить подписку" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setShowModal(false);
      toast({
        title: pendingTier === "prime_plus" ? "Nova Prime+ активирован! 💎" : "Nova Prime активирован! ⭐",
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
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border px-5 flex items-center gap-3 relative overflow-hidden" style={{ minHeight: "calc(4rem + env(safe-area-inset-top, 0px))", paddingTop: "env(safe-area-inset-top, 0px)", background: "linear-gradient(135deg, rgba(234,179,8,0.08), rgba(249,115,22,0.04))", backdropFilter: "blur(20px)" }}>
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/8 via-orange-500/4 to-transparent pointer-events-none" />
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative z-10" style={{ background: "linear-gradient(135deg, rgba(234,179,8,0.25), rgba(249,115,22,0.12))", border: "1px solid rgba(234,179,8,0.35)", boxShadow: "0 0 12px rgba(234,179,8,0.2)" }}>
          <Crown size={18} className="text-yellow-400" />
        </div>
        <div className="relative z-10">
          <h1 className="font-black text-foreground text-xl leading-none tracking-tight">Nova Prime</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Эксклюзивные возможности</p>
        </div>
      </header>

      <div className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full space-y-5">

        {/* Active subscription countdown */}
        {hasPrime && primeExpiresAt && (
          <PrimeCountdown
            expiresAt={primeExpiresAt}
            tier={primeTier ?? "prime"}
            onRenew={() => openModal(primeTier === "prime_plus" ? "prime_plus" : "prime")}
          />
        )}

        {/* Prime+ exclusive live actions */}
        {isSubscribedPlus && (
          <PrimePlusPanel navigate={navigate} toast={toast} queryClient={queryClient} />
        )}

        {/* Tab switcher */}
        <div className="flex bg-card border border-border rounded-2xl p-1 gap-1">
          <button
            onClick={() => setActiveTab("prime")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "prime"
                ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/10 text-yellow-400 border border-yellow-500/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Crown size={15} /> Prime
            {isSubscribedPrime && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
          </button>
          <button
            onClick={() => setActiveTab("prime_plus")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "prime_plus"
                ? "bg-gradient-to-r from-purple-500/20 to-fuchsia-500/10 text-purple-400 border border-purple-500/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles size={15} /> Prime+
            {isSubscribedPlus && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "prime" ? (
            <motion.div
              key="prime"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Prime hero */}
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-yellow-500/20 via-orange-500/10 to-transparent border border-yellow-500/30 p-6 text-center">
                <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
                {[...Array(8)].map((_, i) => (
                  <motion.div key={i} className="absolute rounded-full pointer-events-none"
                    style={{ width: 4 + (i % 3), height: 4 + (i % 3), left: `${10 + i * 10}%`, top: `${15 + (i * 13) % 70}%`, background: i % 2 === 0 ? "#facc15" : "#fb923c", opacity: 0.5 }}
                    animate={{ y: [0, -10, 0], opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
                  />
                ))}
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  className="relative w-18 h-18 mx-auto mb-4 w-[72px] h-[72px]"
                >
                  <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.15, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-2xl bg-yellow-400/30"
                  />
                  <div className="w-[72px] h-[72px] rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center relative z-10">
                    <Crown size={36} className="text-yellow-400" />
                  </div>
                </motion.div>
                <h2 className="text-2xl font-black text-foreground mb-1">Nova Prime</h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Золотые привилегии и эксклюзивные возможности
                </p>
                <div className="mt-3 inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-4 py-1.5">
                  <Zap size={13} className="text-yellow-400" />
                  <span className="text-xs font-semibold text-yellow-400">от 249 ⚡ / месяц</span>
                </div>
              </div>

              {/* Avatar preview */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Star size={14} className="text-yellow-400" /> Как выглядит Prime
                </h3>
                <div className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30">
                  <div className="relative shrink-0">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="absolute -inset-[3px] rounded-full"
                      style={{ background: "conic-gradient(from 0deg, #facc15, #fb923c, #f97316, #facc15)", borderRadius: "50%" }}
                    />
                    <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg z-10 border-2 border-card">A</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm font-bold">Alex</span>
                      <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-xs">⭐</motion.span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">PRIME</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Золотое кольцо + значок Prime</span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-2.5">
                <h3 className="text-sm font-bold text-foreground mb-3">Что включено</h3>
                {(showAllPrime ? PRIME_FEATURES : PRIME_FEATURES.slice(0, 6)).map((f, i) => (
                  <FeatureRow key={i} {...f} />
                ))}
                <button onClick={() => setShowAllPrime(v => !v)}
                  className="w-full flex items-center justify-center gap-1.5 pt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAllPrime ? <><ChevronUp size={13} /> Скрыть</> : <><ChevronDown size={13} /> Ещё {PRIME_FEATURES.length - 6} возможностей</>}
                </button>
              </div>

              {/* Plan picker */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Выберите план</h3>
                <PlanPicker plans={PRIME_PLANS} selected={primePlan} onSelect={setPrimePlan} accentClass="border-yellow-500/60 bg-yellow-500/10" />
              </div>

              {/* Balance */}
              <div className="flex items-center justify-between text-sm px-1">
                <span className="text-muted-foreground">Ваш баланс:</span>
                <span className={`font-bold ${wallet >= currentPrimePlan.spark ? "text-foreground" : "text-destructive"}`}>
                  {wallet} ⚡
                  {wallet < currentPrimePlan.spark && <span className="text-xs font-normal text-muted-foreground ml-1">(нужно ещё {currentPrimePlan.spark - wallet} ⚡)</span>}
                </span>
              </div>

              {/* CTA */}
              <AnimatePresence mode="wait">
                {isSubscribedPrime ? (
                  <motion.div key="active" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0">
                      <Crown size={20} className="text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">Prime активирован ⭐</p>
                      <p className="text-xs text-muted-foreground">Все привилегии уже работают</p>
                    </div>
                    <button onClick={() => openModal("prime")} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-colors">
                      Продлить
                    </button>
                  </motion.div>
                ) : isSubscribedPlus ? (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4 text-center">
                    <p className="text-sm font-bold text-purple-400">У вас уже есть Prime+ 💎</p>
                    <p className="text-xs text-muted-foreground mt-1">Prime+ включает все функции Prime</p>
                  </div>
                ) : (
                  <motion.button key="cta" onClick={() => openModal("prime")} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl text-black font-black text-base shadow-[0_0_30px_rgba(234,179,8,0.3)]"
                  >
                    Оформить Prime — {currentPrimePlan.spark} ⚡
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>

          ) : (
            <motion.div
              key="prime_plus"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Prime+ hero */}
              <div className="relative rounded-3xl overflow-hidden border border-purple-500/30 p-6 text-center"
                style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(217,70,239,0.08), transparent)" }}
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-3xl" />
                {[...Array(8)].map((_, i) => (
                  <motion.div key={i} className="absolute rounded-full pointer-events-none"
                    style={{ width: 4 + (i % 3), height: 4 + (i % 3), left: `${10 + i * 10}%`, top: `${15 + (i * 13) % 70}%`, background: i % 2 === 0 ? "#a855f7" : "#d946ef", opacity: 0.5 }}
                    animate={{ y: [0, -10, 0], opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
                  />
                ))}
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  className="relative mx-auto mb-4 w-[72px] h-[72px]"
                >
                  <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.15, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-2xl bg-purple-400/30"
                  />
                  <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center relative z-10 border border-purple-500/30"
                    style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(217,70,239,0.1))" }}
                  >
                    <Sparkles size={36} className="text-purple-400" />
                  </div>
                </motion.div>
                <h2 className="text-2xl font-black mb-1"
                  style={{ background: "linear-gradient(90deg, #a855f7, #d946ef, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                >
                  Nova Prime+
                </h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Максимум возможностей — всё от Prime плюс эксклюзив
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 border border-purple-500/30"
                  style={{ background: "rgba(168,85,247,0.1)" }}
                >
                  <Zap size={13} className="text-purple-400" />
                  <span className="text-xs font-semibold text-purple-400">от 449 ⚡ / месяц</span>
                </div>
              </div>

              {/* Prime+ avatar preview */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles size={14} className="text-purple-400" /> Как выглядит Prime+
                </h3>
                <div className="flex items-center gap-4 p-3 rounded-xl"
                  style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.08), rgba(217,70,239,0.04))" }}
                >
                  <div className="relative shrink-0">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="absolute -inset-[3px] rounded-full"
                      style={{ background: "conic-gradient(from 0deg, #a855f7, #d946ef, #7c3aed, #a855f7)", borderRadius: "50%" }}
                    />
                    <motion.div
                      animate={{ boxShadow: ["0 0 8px rgba(168,85,247,0.4)", "0 0 18px rgba(168,85,247,0.8)", "0 0 8px rgba(168,85,247,0.4)"] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="relative w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white font-black text-lg z-10 border-2 border-card"
                    >M</motion.div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm font-bold"
                        style={{ background: "linear-gradient(90deg, #a855f7, #d946ef)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                      >Maria</span>
                      <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-xs">💎</motion.span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full border border-purple-500/30"
                        style={{ background: "linear-gradient(90deg, rgba(168,85,247,0.2), rgba(217,70,239,0.2))", color: "#d8b4fe" }}
                      >PRIME+</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Алмазное кольцо + градиентное имя</span>
                  </div>
                </div>
              </div>

              {/* Includes everything from Prime */}
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Crown size={14} className="text-yellow-400" />
                  <span className="text-sm font-bold text-foreground">Всё из Prime плюс:</span>
                </div>
                <div className="space-y-2.5">
                  {(showAllPlus ? PLUS_EXCLUSIVE : PLUS_EXCLUSIVE.slice(0, 6)).map((f, i) => (
                    <FeatureRow key={i} {...f} />
                  ))}
                </div>
                <button onClick={() => setShowAllPlus(v => !v)}
                  className="w-full flex items-center justify-center gap-1.5 pt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAllPlus ? <><ChevronUp size={13} /> Скрыть</> : <><ChevronDown size={13} /> Ещё {PLUS_EXCLUSIVE.length - 6} эксклюзивных функций</>}
                </button>
              </div>

              {/* Comparison badge */}
              <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5">
                <Crown size={18} className="text-yellow-400 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Prime+</span> включает <span className="font-semibold text-foreground">все возможности Prime</span> и добавляет{" "}
                  <span className="font-semibold text-purple-400">{PLUS_EXCLUSIVE.length} эксклюзивных функций</span>
                </p>
              </div>

              {/* Comparison table */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <BarChart3 size={14} className="text-purple-400" />
                  <span className="text-sm font-bold text-foreground">Prime vs Prime+</span>
                </div>
                <div className="divide-y divide-border">
                  {COMPARISON_ROWS.map((row, i) => (
                    <div key={i} className="grid grid-cols-3 text-xs">
                      <div className="px-3 py-2.5 text-muted-foreground font-medium flex items-center">{row.label}</div>
                      <div className="px-3 py-2.5 text-center text-muted-foreground border-x border-border flex items-center justify-center">
                        {row.prime === "—" ? (
                          <span className="text-muted-foreground/40">—</span>
                        ) : (
                          <span className="text-yellow-400 font-semibold">{row.prime}</span>
                        )}
                      </div>
                      <div className="px-3 py-2.5 text-center flex items-center justify-center">
                        <span className="font-semibold" style={{ background: "linear-gradient(90deg, #a855f7, #d946ef)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                          {row.plus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 bg-secondary/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <div className="px-3 py-2">Функция</div>
                  <div className="px-3 py-2 text-center text-yellow-500 border-x border-border">Prime ⭐</div>
                  <div className="px-3 py-2 text-center text-purple-400">Prime+ 💎</div>
                </div>
              </div>

              {/* Plan picker */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Выберите план</h3>
                <PlanPicker plans={PLUS_PLANS} selected={plusPlan} onSelect={setPlusPlan} accentClass="border-purple-500/60 bg-purple-500/10" />
              </div>

              {/* Balance */}
              <div className="flex items-center justify-between text-sm px-1">
                <span className="text-muted-foreground">Ваш баланс:</span>
                <span className={`font-bold ${wallet >= currentPlusPlan.spark ? "text-foreground" : "text-destructive"}`}>
                  {wallet} ⚡
                  {wallet < currentPlusPlan.spark && <span className="text-xs font-normal text-muted-foreground ml-1">(нужно ещё {currentPlusPlan.spark - wallet} ⚡)</span>}
                </span>
              </div>

              {/* CTA */}
              <AnimatePresence mode="wait">
                {isSubscribedPlus ? (
                  <motion.div key="active" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="rounded-2xl p-4 flex items-center gap-3 border border-purple-500/30"
                    style={{ background: "rgba(168,85,247,0.1)" }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-purple-500/30"
                      style={{ background: "rgba(168,85,247,0.15)" }}
                    >
                      <Sparkles size={20} className="text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-purple-300">Prime+ активирован 💎</p>
                      <p className="text-xs text-muted-foreground">Максимум привилегий включён</p>
                    </div>
                    <button onClick={() => openModal("prime_plus")} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-purple-500/40 text-purple-400 hover:bg-purple-500/10 transition-colors">
                      Продлить
                    </button>
                  </motion.div>
                ) : (
                  <motion.button key="cta" onClick={() => openModal("prime_plus")} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="w-full py-4 rounded-2xl text-white font-black text-base"
                    style={{ background: "linear-gradient(135deg, #a855f7, #d946ef)", boxShadow: "0 0 30px rgba(168,85,247,0.35)" }}
                  >
                    Оформить Prime+ — {currentPlusPlan.spark} ⚡
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-xs text-muted-foreground text-center pb-4">
          Подписка оплачивается Spark ⚡. Отменить можно в настройках.
        </p>
      </div>

      {/* Purchase modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => !loading && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 40 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
            >
              {/* Modal header */}
              <div className={`border-b p-5 ${
                pendingTier === "prime_plus"
                  ? "border-purple-500/20"
                  : "border-yellow-500/20"
              }`}
                style={{
                  background: pendingTier === "prime_plus"
                    ? "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(217,70,239,0.08))"
                    : "linear-gradient(135deg, rgba(234,179,8,0.15), rgba(249,115,22,0.08))"
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                      pendingTier === "prime_plus" ? "border-purple-500/30 bg-purple-500/15" : "border-yellow-500/30 bg-yellow-500/15"
                    }`}>
                      {pendingTier === "prime_plus" ? <Sparkles size={24} className="text-purple-400" /> : <Crown size={24} className="text-yellow-400" />}
                    </div>
                    <div>
                      <h3 className="font-black text-base">{pendingTier === "prime_plus" ? "Nova Prime+" : "Nova Prime"}</h3>
                      <p className={`text-xs font-semibold ${pendingTier === "prime_plus" ? "text-purple-400" : "text-yellow-400"}`}>
                        {selectedPlan.name} — {selectedPlan.spark} ⚡ Spark
                      </p>
                    </div>
                  </div>
                  <button onClick={() => !loading && setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors mt-0.5">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Summary */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Тариф</span>
                    <span className="font-bold">{selectedPlan.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Стоимость</span>
                    <span className="font-bold">{selectedPlan.spark} ⚡</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Бонус Spark</span>
                    <span className="font-bold text-green-400">+{pendingTier === "prime_plus" ? 100 : 50} ⚡</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ваш баланс</span>
                    <span className={`font-bold ${canAfford ? "text-green-400" : "text-destructive"}`}>{wallet} ⚡</span>
                  </div>
                  {canAfford && (
                    <div className="flex justify-between pt-1 border-t border-border">
                      <span className="text-muted-foreground">После оплаты</span>
                      <span className="font-bold">{wallet - selectedPlan.spark + (pendingTier === "prime_plus" ? 100 : 50)} ⚡</span>
                    </div>
                  )}
                </div>

                {/* Benefits */}
                <div className={`rounded-2xl p-3.5 space-y-2 border ${
                  pendingTier === "prime_plus" ? "border-purple-500/20 bg-purple-500/5" : "border-yellow-500/20 bg-yellow-500/5"
                }`}>
                  <p className={`text-xs font-bold uppercase tracking-wider ${pendingTier === "prime_plus" ? "text-purple-400" : "text-yellow-400"}`}>
                    Вы получите сразу
                  </p>
                  {(pendingTier === "prime_plus" ? [
                    "Значок PRIME+ 💎 у вашего имени",
                    "Алмазное анимированное кольцо",
                    "3× Spark за ежедневные задания",
                    "Бонус 100 ⚡ Spark к балансу",
                    "Все функции Prime включены",
                  ] : [
                    "Значок Prime ⭐ у вашего имени",
                    "Золотое кольцо вокруг аватара",
                    "2× Spark за ежедневные задания",
                    "Бонус 50 ⚡ Spark к балансу",
                    "Смена ника каждые 24ч",
                  ]).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-foreground">
                      <Check size={12} className="text-green-400 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>

                {/* Insufficient balance */}
                {!canAfford && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-3.5 flex items-start gap-3">
                    <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-destructive">Недостаточно Spark</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Нужно ещё {selectedPlan.spark - wallet} ⚡. Пополните баланс в Кошельке.</p>
                    </div>
                  </div>
                )}

                {/* Action */}
                {canAfford ? (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleSubscribe}
                    disabled={loading}
                    className={`w-full py-3.5 rounded-2xl font-black text-base disabled:opacity-60 ${
                      pendingTier === "prime_plus"
                        ? "text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                        : "text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                    }`}
                    style={{
                      background: pendingTier === "prime_plus"
                        ? "linear-gradient(135deg, #a855f7, #d946ef)"
                        : "linear-gradient(135deg, #eab308, #f97316)"
                    }}
                  >
                    {loading ? "Оформляем..." : `Подтвердить — ${selectedPlan.spark} ⚡`}
                  </motion.button>
                ) : (
                  <button onClick={() => { setShowModal(false); navigate("/wallet"); }}
                    className="w-full py-3.5 bg-primary rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={16} /> Купить Spark в Кошельке
                  </button>
                )}

                <button onClick={() => !loading && setShowModal(false)}
                  className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Отмена
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
