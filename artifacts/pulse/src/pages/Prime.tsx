import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, Zap, Check, Star, Shield, MessageCircle, Gift, Image,
  Infinity, X, AlertTriangle, Palette, RefreshCw, TrendingUp,
  ShoppingCart, Bell, Clock, Lock, CalendarClock, RotateCcw, Flame
} from "lucide-react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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
    price: 199,
    spark: 1194,
    period: "/ месяц",
    badge: "Скидка 33%",
    best: true,
  },
  {
    id: "yearly",
    name: "Год",
    price: 149,
    spark: 1788,
    period: "/ месяц",
    badge: "Скидка 50%",
  },
];

const FEATURES = [
  {
    icon: Crown,
    text: "Значок Prime ⭐ у вашего имени в чатах и профиле",
    tag: "Визуально",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  {
    icon: TrendingUp,
    text: "2× Spark за выполнение ежедневных заданий",
    tag: "Работает",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    icon: Zap,
    text: "Ежедневный бонус 25 ⚡ вместо 10 ⚡",
    tag: "Работает",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    icon: RefreshCw,
    text: "Смена никнейма каждые 24ч (вместо 7 дней)",
    tag: "Работает",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    icon: Gift,
    text: "50 ⚡ Spark в подарок при оформлении подписки",
    tag: "Работает",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    icon: Gift,
    text: "Эксклюзивные подарки только для Prime-участников",
    tag: "Работает",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    icon: Palette,
    text: "Кастомные темы и цвета интерфейса",
    tag: "Работает",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    icon: Image,
    text: "Загрузка медиафайлов без ограничений размера",
    tag: "Визуально",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Bell,
    text: "Приоритетные уведомления и поддержка 24/7",
    tag: "Работает",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    icon: Infinity,
    text: "Хранение истории сообщений навсегда",
    tag: "Визуально",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Lock,
    text: "Расширенная приватность: скрытый онлайн-статус",
    tag: "Работает",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    icon: Clock,
    text: "Отложенная отправка сообщений по расписанию",
    tag: "Работает",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
];

function useTick(expiresAt: string) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(expiresAt).getTime() - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now())), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  const totalMs = remaining;
  const days = Math.floor(totalMs / 86400000);
  const hours = Math.floor((totalMs % 86400000) / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  return { days, hours, minutes, seconds, totalMs };
}

function PrimeCountdown({ expiresAt, onRenew, planMonths }: { expiresAt: string; onRenew: () => void; planMonths?: number }) {
  const { days, hours, minutes, seconds, totalMs } = useTick(expiresAt);
  const expired = totalMs <= 0;
  const isCritical = !expired && days < 1;
  const isWarning = !expired && days < 7;

  const totalDuration = (planMonths ?? 1) * 30 * 86400000;
  const elapsed = totalDuration - totalMs;
  const progress = Math.min(1, Math.max(0, elapsed / totalDuration));

  const R = 52;
  const C = 2 * Math.PI * R;
  const dashOffset = C * (1 - progress);

  const arcColor = expired ? "#ef4444" : isCritical ? "#ef4444" : isWarning ? "#f97316" : "#eab308";
  const glowColor = expired ? "rgba(239,68,68,0.3)" : isCritical ? "rgba(239,68,68,0.25)" : isWarning ? "rgba(249,115,22,0.25)" : "rgba(234,179,8,0.2)";

  const expiryDate = new Date(expiresAt);
  const expiryStr = expiryDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  const expiryTime = expiryDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-3xl border p-5 overflow-hidden ${
        expired
          ? "bg-destructive/5 border-destructive/30"
          : isCritical
          ? "bg-red-500/5 border-red-500/30"
          : isWarning
          ? "bg-orange-500/5 border-orange-500/30"
          : "bg-card border-border"
      }`}
      style={{ boxShadow: `0 0 40px ${glowColor}` }}
    >
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none" style={{ background: glowColor }} />

      <div className="flex items-center gap-2 mb-4 relative z-10">
        <CalendarClock size={16} className={expired ? "text-destructive" : isWarning ? "text-orange-400" : "text-yellow-400"} />
        <span className="text-sm font-bold text-foreground">Ваша подписка Prime</span>
        {isWarning && !expired && (
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full border ${
              isCritical
                ? "bg-red-500/20 text-red-400 border-red-500/30"
                : "bg-orange-500/20 text-orange-400 border-orange-500/30"
            }`}
          >
            {isCritical ? "⚠ Истекает сегодня!" : "⚠ Скоро истекает"}
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
            <circle
              cx="60" cy="60" r={R}
              fill="none"
              stroke={arcColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {expired ? (
              <span className="text-destructive font-black text-sm">Истекла</span>
            ) : isCritical ? (
              <>
                <span className="text-xl font-black leading-none" style={{ color: arcColor }}>{hours}ч</span>
                <span className="text-xs font-bold" style={{ color: arcColor }}>{minutes}м {seconds}с</span>
              </>
            ) : (
              <>
                <span className="text-3xl font-black leading-none" style={{ color: arcColor }}>{days}</span>
                <span className="text-xs text-muted-foreground font-medium">{days === 1 ? "день" : days < 5 ? "дня" : "дней"}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          {!expired && !isCritical && (
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: "часов", value: hours },
                { label: "минут", value: minutes },
                { label: "секунд", value: seconds },
              ].map(({ label, value }) => (
                <div key={label} className="bg-secondary/50 rounded-xl p-2 text-center">
                  <div className="text-base font-black text-foreground tabular-nums">{String(value).padStart(2, "0")}</div>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          )}
          {!expired && isCritical && (
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: "минут", value: minutes },
                { label: "секунд", value: seconds },
              ].map(({ label, value }) => (
                <div key={label} className="bg-red-500/10 rounded-xl p-2 text-center border border-red-500/20">
                  <div className="text-lg font-black text-red-400 tabular-nums">{String(value).padStart(2, "0")}</div>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock size={11} />
              <span>
                {expired ? "Истекла" : "Истекает"} {expiryStr} в {expiryTime}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RotateCcw size={11} />
              <span>Автопродление через Монета ⚡</span>
            </div>
          </div>
        </div>
      </div>

      {(isWarning || expired) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 rounded-2xl p-3.5 border text-sm relative z-10 ${
            expired
              ? "bg-destructive/10 border-destructive/20"
              : isCritical
              ? "bg-red-500/10 border-red-500/20"
              : "bg-orange-500/10 border-orange-500/20"
          }`}
        >
          <div className="flex items-start gap-2 mb-3">
            <Flame size={14} className={expired || isCritical ? "text-red-400 shrink-0 mt-0.5" : "text-orange-400 shrink-0 mt-0.5"} />
            <p className={`text-xs leading-relaxed ${expired || isCritical ? "text-red-300" : "text-orange-300"}`}>
              {expired
                ? "Ваша подписка Prime истекла. Продлите её, чтобы восстановить все привилегии."
                : isCritical
                ? `Осталось менее суток! Продлите сейчас, чтобы не потерять привилегии.`
                : `Осталось ${days} ${days < 5 ? "дня" : "дней"}. Продлите заранее — продление добавится к текущему сроку.`}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRenew}
            className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
              expired || isCritical
                ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                : "bg-gradient-to-r from-orange-500 to-yellow-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.25)]"
            }`}
          >
            <Crown size={14} />
            {expired ? "Восстановить Prime" : "Продлить подписку"}
          </motion.button>
        </motion.div>
      )}

      {!isWarning && !expired && (
        <button
          onClick={onRenew}
          className="mt-4 w-full py-2.5 rounded-xl border border-yellow-500/30 text-yellow-400 text-xs font-semibold hover:bg-yellow-500/10 transition-colors flex items-center justify-center gap-1.5 relative z-10"
        >
          <RotateCcw size={12} /> Продлить заранее
        </button>
      )}
    </motion.div>
  );
}

const TAG_COLORS: Record<string, string> = {
  "Работает": "bg-green-500/20 text-green-400 border-green-500/30",
  "Визуально": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Скоро": "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

function getPlanMonths(expiresAt: string): number {
  const msLeft = new Date(expiresAt).getTime() - Date.now();
  if (msLeft > 300 * 86400000) return 12;
  if (msLeft > 150 * 86400000) return 6;
  return 1;
}

export default function Prime() {
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState("halfyear");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState((me as any)?.hasPrime ?? false);
  const [showModal, setShowModal] = useState(false);

  const plan = PLANS.find(p => p.id === selected)!;
  const wallet = (me as any)?.balance ?? 0;
  const hasPrime = (me as any)?.hasPrime ?? false;
  const primeExpiresAt: string | null = (me as any)?.primeExpiresAt ?? null;
  const canAfford = wallet >= plan.spark;

  const openRenewModal = () => setShowModal(true);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const _token = localStorage.getItem("pulse-token");
      const _uid = localStorage.getItem("pulse-user-id");
      const _auth = _token ? { "Authorization": `Bearer ${_token}` } : _uid ? { "x-user-id": _uid } : {};
      const res = await fetch("/api/prime/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", ..._auth },
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
      setShowModal(false);
      toast({
        title: "Pulse Prime активирован! ⭐",
        description: `Остаток: ${data.balance} ⚡ Монета`,
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
            <span className="text-xs font-semibold text-yellow-400">Оплата Монета ⚡</span>
          </div>
        </motion.div>

        {/* Prime Countdown — shown only when subscribed */}
        {(hasPrime || success) && primeExpiresAt && (
          <PrimeCountdown
            expiresAt={primeExpiresAt}
            onRenew={openRenewModal}
            planMonths={getPlanMonths(primeExpiresAt)}
          />
        )}

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-4 space-y-2"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground">Что включено</h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Работает сейчас
            </div>
          </div>
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.03 }}
              className="flex items-center gap-3"
            >
              <div className={`w-7 h-7 rounded-lg ${f.bg} flex items-center justify-center shrink-0`}>
                <f.icon size={14} className={f.color} />
              </div>
              <span className="text-sm text-foreground flex-1">{f.text}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${TAG_COLORS[f.tag]}`}>
                {f.tag}
              </span>
            </motion.div>
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
                  <div className="text-xs text-muted-foreground">{p.spark} ⚡ Монета всего</div>
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
          <span className={`font-bold ${canAfford ? "text-foreground" : "text-destructive"}`}>
            {wallet} ⚡ Монета
            {!canAfford && <span className="text-xs font-normal text-muted-foreground ml-1">(нужно {plan.spark - wallet} ⚡ больше)</span>}
          </span>
        </div>

        {/* Subscribe / renew button */}
        <AnimatePresence mode="wait">
          {success || hasPrime ? (
            <motion.div
              key="success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0">
                <Crown size={20} className="text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">Prime активирован ⭐</p>
                <p className="text-xs text-muted-foreground">Все привилегии уже работают</p>
              </div>
              <button
                onClick={openRenewModal}
                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-colors shrink-0"
              >
                Продлить
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="button"
              onClick={() => setShowModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl text-black font-black text-base shadow-[0_0_30px_rgba(234,179,8,0.3)]"
            >
              Оформить Prime — {plan.spark} ⚡ Монета
            </motion.button>
          )}
        </AnimatePresence>

        <p className="text-xs text-muted-foreground text-center">
          Подписка продлевается автоматически каждый период. Отменить можно в настройках.
        </p>
      </div>

      {/* Purchase Confirmation Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
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
              {/* Modal header gradient */}
              <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border-b border-yellow-500/20 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                      <Crown size={24} className="text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="font-black text-base text-foreground">Pulse Prime</h3>
                      <p className="text-xs text-yellow-400 font-semibold">{plan.name} — {plan.spark} ⚡ Spark</p>
                    </div>
                  </div>
                  <button
                    onClick={() => !loading && setShowModal(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Plan summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Выбранный план</span>
                    <span className="font-bold text-foreground">{plan.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Стоимость</span>
                    <span className="font-bold text-foreground">{plan.spark} ⚡ Spark</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Ваш баланс</span>
                    <span className={`font-bold ${canAfford ? "text-green-400" : "text-destructive"}`}>
                      {wallet} ⚡ Spark
                    </span>
                  </div>
                  {canAfford && (
                    <div className="flex items-center justify-between text-sm pt-1 border-t border-border">
                      <span className="text-muted-foreground">Остаток после</span>
                      <span className="font-bold text-foreground">{wallet - plan.spark} ⚡ Spark</span>
                    </div>
                  )}
                </div>

                {/* What you get */}
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-3.5 space-y-2">
                  <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Вы получите сразу</p>
                  {[
                    "Значок Prime ⭐ у вашего имени",
                    "2× Spark за ежедневные задания",
                    "Ежедневный бонус 25 ⚡ (вместо 10 ⚡)",
                    "Смена ника каждые 24ч",
                    "+50 ⚡ Spark бонус к балансу",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-foreground">
                      <Check size={12} className="text-green-400 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>

                {/* Insufficient balance warning */}
                {!canAfford && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-destructive/10 border border-destructive/20 rounded-2xl p-3.5 flex items-start gap-3"
                  >
                    <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-destructive">Недостаточно Spark</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Нужно ещё {plan.spark - wallet} ⚡. Пополните баланс в Кошельке.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Action buttons */}
                {canAfford ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubscribe}
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl text-black font-black text-base shadow-[0_0_20px_rgba(234,179,8,0.3)] disabled:opacity-60"
                  >
                    {loading ? "Оформляем..." : `Подтвердить — ${plan.spark} ⚡`}
                  </motion.button>
                ) : (
                  <button
                    onClick={() => { setShowModal(false); navigate("/wallet"); }}
                    className="w-full py-3.5 bg-primary rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={16} /> Купить Spark в Кошельке
                  </button>
                )}

                <button
                  onClick={() => !loading && setShowModal(false)}
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
