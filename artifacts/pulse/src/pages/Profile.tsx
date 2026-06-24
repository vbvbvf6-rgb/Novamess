import React, { useState } from "react";
import { useGetMyStats, useGetMe } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Phone, Users, Clock, CalendarDays, Settings, BadgeCheck, Crown, Zap, QrCode, Sparkles, Activity, TrendingUp, Star, Share2, Copy, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const TOKEN_KEY = "pulse-token";
const getToken = () => sessionStorage.getItem(TOKEN_KEY);
const apiFetch = (url: string) =>
  fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json());

function ReferralSection() {
  const { data: myCode, isLoading } = useQuery({
    queryKey: ["my-referral-code"],
    queryFn: () => apiFetch("/api/referral/my-code"),
  });

  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const referralLink = myCode?.code
    ? `${window.location.origin}/register?ref=${myCode.code}`
    : null;

  const handleCopy = () => {
    if (!myCode?.code) return;
    navigator.clipboard.writeText(myCode.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const handleShare = () => {
    if (!referralLink) return;
    if (navigator.share) {
      navigator.share({ title: "Присоединяйся к Aura!", text: `Используй мой реферальный код: ${myCode.code}`, url: referralLink }).catch(() => {});
    } else {
      navigator.clipboard.writeText(referralLink).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }).catch(() => {});
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-green-500/30 overflow-hidden"
      style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.07), rgba(6,182,212,0.04))" }}
    >
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-green-500/15">
            <Users size={18} className="text-green-500" />
          </div>
          <div>
            <h3 className="font-black text-base text-foreground">Реферальная программа</h3>
            <p className="text-xs text-muted-foreground">Приглашайте друзей в Aura</p>
          </div>
          {!isLoading && myCode?.invited > 0 && (
            <span className="ml-auto text-[11px] font-black px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
              {myCode.invited} {myCode.invited === 1 ? "друг" : myCode.invited < 5 ? "друга" : "друзей"}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
          </div>
        ) : myCode ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="flex-1 bg-background/50 border border-border rounded-2xl px-5 py-3 font-mono text-xl font-black tracking-[0.3em] text-foreground text-center cursor-pointer select-all"
                onClick={handleCopy}
              >
                {myCode.code}
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-green-500/15 border border-green-500/25 text-green-500 font-bold text-sm hover:bg-green-500/25 transition-all shrink-0"
              >
                <Copy size={15} />
                {copied ? "✓" : "Код"}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary hover:bg-primary/20 transition-all"
              >
                <ExternalLink size={13} />
                {copiedLink ? "Ссылка скопирована!" : "Поделиться ссылкой"}
              </button>
              <Link href="/leaderboard">
                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all">
                  <TrendingUp size={13} />
                  Таблица лидеров
                </button>
              </Link>
            </div>

            {myCode.invited === 0 && (
              <p className="text-[11px] text-muted-foreground/70 text-center mt-3">
                За каждого приглашённого друга вы получаете +50 монет
              </p>
            )}
          </>
        ) : null}
      </div>
    </motion.div>
  );
}

const ANIMATED_STATUSES = [
  { id: null, label: "Нет", preview: "" },
  { id: "typing", label: "Печатает...", preview: "💬" },
  { id: "fire", label: "В огне", preview: "🔥" },
  { id: "star", label: "Звезда", preview: "⭐" },
  { id: "rocket", label: "Запуск", preview: "🚀" },
  { id: "music", label: "Слушает", preview: "🎵" },
  { id: "gaming", label: "Играет", preview: "🎮" },
  { id: "coffee", label: "Пьёт кофе", preview: "☕" },
];

function QRCodeSection({ user }: { user: any }) {
  const [copied, setCopied] = useState(false);
  const profileUrl = `${window.location.origin}/user/${user?.username || user?.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(profileUrl)}&color=7c3aed&bgcolor=ffffff`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: `Aura — ${user?.displayName}`, url: profileUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(profileUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-purple-500/30 overflow-hidden"
      style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.05))" }}
    >
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(6,182,212,0.2))" }}
          >
            <QrCode size={18} className="text-purple-400" />
          </div>
          <div>
            <h3 className="font-black text-base text-foreground">QR-код профиля</h3>
            <p className="text-xs text-muted-foreground">Поделитесь своим профилем</p>
          </div>
          <span className="ml-auto text-[10px] font-black px-2 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25">Prime+</span>
        </div>

        <div className="flex gap-4 items-center">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl blur-lg"
              style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.4), rgba(6,182,212,0.4))" }}
            />
            <div className="relative bg-white rounded-2xl p-3 shadow-xl border-4 border-purple-500/30">
              <img
                src={qrUrl}
                alt="QR код профиля"
                className="w-[100px] h-[100px] block"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-sm"
              style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <span className="text-white font-black text-xs">{(user?.displayName || "U")[0]}</span>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-0.5">Ваш профиль</p>
              <p className="text-sm font-bold text-foreground truncate">@{user?.username}</p>
              <p className="text-[11px] text-muted-foreground truncate">{profileUrl}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[13px] text-white"
              style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
            >
              <Share2 size={14} />
              {copied ? "Скопировано!" : "Поделиться"}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AnimatedStatusPicker({ user }: { user: any }) {
  const [selected, setSelected] = useState<string | null>((user as any)?.statusAnimation || null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (statusId: string | null) => {
    setSelected(statusId);
    setSaving(true);
    try {
      const token = sessionStorage.getItem("pulse-token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      await fetch("/api/users/me", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ statusAnimation: statusId }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-3xl overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <Sparkles size={18} className="text-purple-400" />
          </div>
          <div>
            <h3 className="font-black text-base text-foreground">Анимированный статус</h3>
            <p className="text-xs text-muted-foreground">Выберите анимацию для вашего профиля</p>
          </div>
          {saved && <span className="ml-auto text-xs font-bold text-green-400">Сохранено ✓</span>}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {ANIMATED_STATUSES.map(s => (
            <motion.button
              key={String(s.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSave(s.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${
                selected === s.id
                  ? "border-purple-500/60 bg-purple-500/15"
                  : "border-border bg-secondary/30 hover:border-purple-500/30"
              }`}
            >
              {s.id ? (
                <motion.span
                  className="text-2xl"
                  animate={s.id === "fire" ? { scale: [1, 1.2, 1] } :
                    s.id === "star" ? { rotate: [0, 360] } :
                    s.id === "rocket" ? { y: [0, -4, 0] } :
                    s.id === "typing" ? { opacity: [1, 0.5, 1] } :
                    {}}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  {s.preview}
                </motion.span>
              ) : (
                <span className="text-2xl opacity-40">—</span>
              )}
              <span className="text-[10px] font-bold text-muted-foreground leading-none text-center">{s.label}</span>
              {selected === s.id && (
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function IncomingBegRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fulfillAmounts, setFulfillAmounts] = useState<Record<number, string>>({});
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});

  const getToken = () => sessionStorage.getItem("pulse-token");

  const load = async () => {
    try {
      const res = await fetch("/api/wallet/beg/incoming", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setRequests(await res.json());
    } catch {}
    setLoading(false);
  };

  React.useEffect(() => { load(); }, []);

  const handleFulfill = async (id: number) => {
    const amt = parseInt(fulfillAmounts[id] || "0");
    if (!amt || amt <= 0) return;
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/wallet/beg/${id}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ amount: amt }),
      });
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== id));
      }
    } catch {}
    setActionLoading(prev => ({ ...prev, [id]: false }));
  };

  const handleDecline = async (id: number) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/wallet/beg/${id}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setRequests(prev => prev.filter(r => r.id !== id));
    } catch {}
    setActionLoading(prev => ({ ...prev, [id]: false }));
  };

  if (loading) return <div className="text-xs text-muted-foreground py-2">Загрузка…</div>;
  if (!requests.length) return (
    <div className="text-sm text-muted-foreground text-center py-4">Входящих запросов нет</div>
  );

  return (
    <div className="space-y-3">
      {requests.map(req => (
        <motion.div
          key={req.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="rounded-2xl bg-yellow-500/5 border border-yellow-500/20 p-4 space-y-3"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ backgroundColor: req.avatar_color || "#3B82F6" }}
            >
              {req.avatar_url
                ? <img src={req.avatar_url} alt="" className="w-full h-full object-cover rounded-full" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                : (req.display_name?.[0] || "?").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{req.display_name}</p>
              <p className="text-xs text-yellow-400">просит {req.amount > 0 ? `${req.amount} ⚡` : "Spark ⚡"}</p>
            </div>
            <span className="text-2xl">🙏</span>
          </div>
          {req.message && (
            <p className="text-sm text-muted-foreground italic bg-black/20 rounded-xl px-3 py-2">"{req.message}"</p>
          )}
          <div className="flex gap-2 items-center">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={fulfillAmounts[req.id] ?? (req.amount > 0 ? String(req.amount) : "")}
              onChange={e => setFulfillAmounts(prev => ({ ...prev, [req.id]: e.target.value }))}
              placeholder="Сумма ⚡"
              className="w-28 rounded-xl bg-secondary border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
            />
            <button
              onClick={() => handleFulfill(req.id)}
              disabled={actionLoading[req.id]}
              className="flex-1 py-1.5 rounded-xl text-sm font-bold bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 transition-colors border border-yellow-500/30 disabled:opacity-50"
            >
              {actionLoading[req.id] ? "…" : "Отправить ⚡"}
            </button>
            <button
              onClick={() => handleDecline(req.id)}
              disabled={actionLoading[req.id]}
              className="py-1.5 px-3 rounded-xl text-sm font-bold bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              Нет
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function SparkActivityLog() {
  const [activities, setActivities] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const load = async () => {
      try {
        const token = sessionStorage.getItem("pulse-token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch("/api/wallet/activity?limit=20", { headers });
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities || []);
          setSummary(data.summary || null);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const typeLabel = (type: string) => {
    const map: Record<string, string> = {
      earned: "Заработано",
      sent: "Отправлено",
      received: "Получено",
      daily_bonus: "Ежедневный бонус",
      monthly_gift: "Ежемесячный подарок",
      subscription: "Подписка",
      subscription_bonus: "Бонус подписки",
      purchase: "Пополнение",
      message_sent: "Сообщение",
    };
    return map[type] || type;
  };

  if (loading) return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
    </div>
  );

  if (!activities.length) return (
    <p className="text-sm text-muted-foreground text-center py-4">Нет данных активности</p>
  );

  return (
    <div className="space-y-2">
      {summary && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-green-400">+{Number(summary.total_earned).toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">Получено ⚡</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-red-400">-{Number(summary.total_spent).toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">Потрачено ⚡</p>
          </div>
        </div>
      )}
      {activities.slice(0, 15).map((act: any) => (
        <div key={act.id} className="flex items-center gap-3 px-3 py-2.5 bg-secondary/30 rounded-xl border border-border">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm ${
            Number(act.amount) > 0 ? "bg-green-500/15" : Number(act.amount) < 0 ? "bg-red-500/15" : "bg-secondary"
          }`}>
            {act.type === "daily_bonus" ? "🎁" :
             act.type === "monthly_gift" ? "💎" :
             act.type === "subscription" ? "👑" :
             act.type === "sent" ? "📤" :
             act.type === "received" ? "📥" :
             act.type === "message_sent" ? "💬" : "⚡"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-foreground truncate">{typeLabel(act.type)}</p>
            {act.description && <p className="text-[11px] text-muted-foreground truncate">{act.description}</p>}
          </div>
          {act.amount !== 0 && (
            <span className={`text-sm font-black shrink-0 ${Number(act.amount) > 0 ? "text-green-400" : "text-red-400"}`}>
              {Number(act.amount) > 0 ? "+" : ""}{act.amount} ⚡
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Profile() {
  const { data: user, isLoading: userLoading } = useGetMe();
  const { data: stats, isLoading: statsLoading } = useGetMyStats();
  const isPrimePlus = (user as any)?.hasPrime && (user as any)?.primeTier === "prime_plus";
  const hasPrime = (user as any)?.hasPrime;
  const [showSparkLog, setShowSparkLog] = useState(false);
  const [showBegRequests, setShowBegRequests] = useState(false);

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <header className="border-b border-border flex items-center px-5 justify-between bg-card/90 backdrop-blur-xl z-10 shrink-0 relative overflow-hidden" style={{ minHeight: "calc(4rem + env(safe-area-inset-top, 0px))", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/6 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, rgba(234,88,12,0.15), rgba(234,88,12,0.05))", border: "1px solid rgba(234,88,12,0.2)" }}>
            <Activity size={17} className="text-primary" />
          </div>
          <h1 className="text-xl font-black text-foreground">Мой профиль</h1>
        </div>
        <Link href="/settings">
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all relative z-10 hover:bg-primary/10 text-primary border border-primary/20 hover:border-primary/40">
            <Settings size={15} />
            Настройки
          </button>
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 max-w-3xl w-full mx-auto scrollbar-thin">
        {userLoading ? (
          <div className="space-y-8">
            <div className="flex flex-col items-center">
              <Skeleton className="w-32 h-32 rounded-full mb-4" />
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Header Section */}
            <div
              className="flex flex-col items-center text-center p-6 rounded-3xl border border-border bg-card/30 relative overflow-hidden"
              style={(user as any)?.hasPrime ? { borderColor: (user as any)?.primeTier === "prime_plus" ? "rgba(168,85,247,0.3)" : "rgba(250,204,21,0.3)" } : undefined}
            >
              {(user as any)?.hasPrime ? (
                <div className={`absolute inset-0 bg-gradient-to-b ${(user as any)?.primeTier === "prime_plus" ? "from-purple-500/15 via-cyan-500/5" : "from-yellow-500/15 via-orange-500/5"} to-transparent`} />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-50" />
              )}

              {(user as any)?.hasPrime && (
                <div className="absolute inset-0 overflow-hidden rounded-3xl">
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute rounded-full"
                      style={{
                        width: i % 2 === 0 ? 5 : 3,
                        height: i % 2 === 0 ? 5 : 3,
                        left: `${8 + i * 11}%`,
                        top: `${15 + (i % 4) * 18}%`,
                        background: (user as any)?.primeTier === "prime_plus"
                          ? (i % 2 === 0 ? "#a855f7" : "#38bdf8")
                          : (i % 2 === 0 ? "#facc15" : "#fb923c"),
                      }}
                      animate={{ y: [0, -12, 0], opacity: [0.3, 0.8, 0.3] }}
                      transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: i * 0.35 }}
                    />
                  ))}
                </div>
              )}

              <div className="relative mb-4 z-10">
                {(user as any)?.hasPrime && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: (user as any)?.primeTier === "prime_plus" ? 3 : 4, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-[3px] rounded-full"
                    style={{
                      background: (user as any)?.primeTier === "prime_plus"
                        ? "conic-gradient(from 0deg, #a855f7, #38bdf8, #e2e8f0, #c084fc, #06b6d4, #a855f7)"
                        : "conic-gradient(from 0deg, #facc15, #fb923c, #f97316, #facc15)",
                      borderRadius: "50%",
                    }}
                  />
                )}
                <div
                  className="w-32 h-32 rounded-full flex items-center justify-center text-white font-bold text-5xl relative shadow-2xl border-4 border-background"
                  style={{ backgroundColor: user?.avatarColor || "#333" }}
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full rounded-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    (user?.displayName || "U")[0].toUpperCase()
                  )}
                  <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-background ${
                    user?.status === "online" ? "bg-green-500" :
                    user?.status === "away" ? "bg-yellow-500" : "bg-gray-500"
                  }`} />
                </div>
              </div>

              <div className="flex items-center gap-2 mb-1 relative z-10 flex-wrap justify-center">
                <h2
                  className="text-3xl font-bold text-foreground"
                  style={(user as any)?.hasPrime ? {
                    background: (user as any)?.primeTier === "prime_plus"
                      ? "linear-gradient(90deg, #a855f7, #38bdf8)"
                      : "linear-gradient(90deg, #facc15, #fb923c)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  } : undefined}
                >
                  {user?.displayName}
                </h2>
                {(user as any)?.hasPrime && (
                  <motion.div
                    animate={{ rotate: [0, -8, 8, -8, 0], scale: [1, 1.15, 1] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      (user as any)?.primeTier === "prime_plus"
                        ? "bg-gradient-to-br from-purple-500 to-cyan-400 shadow-[0_0_12px_rgba(168,85,247,0.6)]"
                        : "bg-gradient-to-br from-yellow-400 to-orange-500 shadow-[0_0_12px_rgba(250,204,21,0.6)]"
                    }`}
                  >
                    <Crown size={14} className="text-white" />
                  </motion.div>
                )}
                {(user as any)?.isVerified && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="12" fill="hsl(16 100% 50%)"/>
                    <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {(user as any)?.hasPrime && (
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    (user as any)?.primeTier === "prime_plus"
                      ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                      : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                  }`}>
                    {(user as any)?.primeTier === "prime_plus" ? "Prime+" : "Prime"}
                  </span>
                )}
              </div>
              <p className="text-primary font-medium mb-1 relative z-10">@{user?.username}</p>

              {(user as any)?.statusText && (
                <p className="text-sm text-muted-foreground mb-2 relative z-10">{(user as any).statusText}</p>
              )}

              {user?.bio && (
                <p className="text-muted-foreground max-w-md relative z-10 text-sm italic">"{user.bio}"</p>
              )}

              <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground uppercase tracking-wider font-semibold relative z-10 bg-black/20 px-4 py-2 rounded-full backdrop-blur-md">
                <CalendarDays size={14} /> Joined {user?.createdAt ? format(new Date(user.createdAt), "MMMM yyyy") : "Unknown"}
              </div>
            </div>

            {/* Referral Section — available to all */}
            <ReferralSection />

            {/* Prime+ Exclusive: QR Code */}
            {isPrimePlus && user && <QRCodeSection user={user} />}

            {/* Prime+: Animated Status */}
            {isPrimePlus && user && <AnimatedStatusPicker user={user} />}

            {/* Stats Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 px-2">Активность</h3>
              {statsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatCard
                    icon={<MessageSquare className="text-blue-500" />}
                    label="Сообщений"
                    value={stats?.messagesSent?.toLocaleString() || "0"}
                    color="bg-blue-500/10 border-blue-500/20"
                  />
                  <StatCard
                    icon={<Phone className="text-green-500" />}
                    label="Звонков"
                    value={stats?.callsMade?.toLocaleString() || "0"}
                    color="bg-green-500/10 border-green-500/20"
                  />
                  <StatCard
                    icon={<Users className="text-primary" />}
                    label="Контактов"
                    value={stats?.contactsCount?.toLocaleString() || "0"}
                    color="bg-primary/10 border-primary/20"
                  />
                  <StatCard
                    icon={<Zap className="text-yellow-400" />}
                    label="Spark"
                    value={(user as any)?.balance ? `${Number((user as any).balance).toLocaleString()} ⚡` : "0 ⚡"}
                    color="bg-yellow-500/10 border-yellow-500/20"
                  />
                </div>
              )}
            </div>

            {/* Incoming Spark Beg Requests */}
            <div>
              <button
                onClick={() => setShowBegRequests(v => !v)}
                className="flex items-center gap-2 text-sm font-bold text-foreground mb-3 hover:text-primary transition-colors w-full"
              >
                <span className="text-lg leading-none">🙏</span>
                Запросы Spark
                <span className="ml-auto text-xs text-muted-foreground">{showBegRequests ? "Скрыть" : "Показать"}</span>
              </button>
              <AnimatePresence>
                {showBegRequests && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <IncomingBegRequests />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Detailed Spark Activity Log (Prime+) */}
            {hasPrime && (
              <div>
                <button
                  onClick={() => setShowSparkLog(v => !v)}
                  className="flex items-center gap-2 text-sm font-bold text-foreground mb-3 hover:text-primary transition-colors"
                >
                  <Activity size={16} className="text-primary" />
                  {isPrimePlus ? "Подробный журнал Spark" : "Журнал Spark"}
                  <span className="ml-auto text-xs text-muted-foreground">{showSparkLog ? "Скрыть" : "Показать"}</span>
                </button>
                <AnimatePresence>
                  {showSparkLog && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <SparkActivityLog />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
  return (
    <div className={`p-5 rounded-2xl border flex flex-col items-center text-center ${color} transition-transform hover:-translate-y-1`}>
      <div className="mb-3 p-3 bg-background/50 rounded-xl shadow-sm backdrop-blur-sm">
        {icon}
      </div>
      <span className="text-2xl font-bold text-foreground mb-1">{value}</span>
      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{label}</span>
    </div>
  );
}
