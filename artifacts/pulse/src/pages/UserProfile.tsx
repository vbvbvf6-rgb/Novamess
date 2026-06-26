import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useLocation } from "wouter";
import {
  useGetUserById,
  useGetContacts,
  useGetChats,
  useAddContact,
  useRemoveContact,
  getGetContactsQueryKey,
  getGetChatsQueryKey,
} from "@workspace/api-client-react";
import {
  ArrowLeft,
  MessageSquare,
  Phone,
  Video,
  UserPlus,
  UserMinus,
  MoreVertical,
  CheckCircle2,
  Clock,
  User,
  BadgeCheck,
  Crown,
  Zap,
  X,
  HandCoins,
  Flag,
  AlertTriangle,
  ShieldBan,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/contexts/AppContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const getToken = () => sessionStorage.getItem("pulse-token");

const REPORT_REASONS = [
  "Спам",
  "Оскорбления и ненависть",
  "Мошенничество",
  "Нежелательный контент",
  "Выдаёт себя за другого",
  "Другое",
];

function ReportUserDialog({ userId, displayName }: { userId: number; displayName: string }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const { toast } = useToast();

  async function submit() {
    if (!reason) return;
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/users/${userId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason, details }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        toast({ title: "Ошибка", description: "Не удалось отправить жалобу", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка", description: "Нет соединения", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setTimeout(() => { setSent(false); setReason(""); setDetails(""); }, 300);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-red-400 transition-colors"
        title="Пожаловаться"
      >
        <Flag size={18} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) close(); }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative bg-card border border-border rounded-3xl p-6 w-full max-w-sm shadow-2xl z-10"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-full bg-red-500/15 text-red-500"><AlertTriangle size={18} /></div>
                <div>
                  <p className="font-bold text-sm">Пожаловаться</p>
                  <p className="text-xs text-muted-foreground">на {displayName}</p>
                </div>
                <button onClick={close} className="ml-auto p-1.5 rounded-full hover:bg-secondary text-muted-foreground transition-colors"><X size={16} /></button>
              </div>

              {sent ? (
                <div className="text-center py-6">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="font-bold mb-1">Жалоба отправлена</p>
                  <p className="text-xs text-muted-foreground">Мы рассмотрим её в ближайшее время</p>
                  <button onClick={close} className="mt-4 w-full py-2 rounded-2xl bg-primary text-primary-foreground text-sm font-bold">Закрыть</button>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {REPORT_REASONS.map(r => (
                      <button
                        key={r}
                        onClick={() => setReason(r)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all border ${reason === r ? "bg-primary/15 border-primary/40 text-primary font-medium" : "border-border hover:bg-secondary text-foreground"}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  {reason && (
                    <textarea
                      value={details}
                      onChange={e => setDetails(e.target.value)}
                      placeholder="Подробности (необязательно)"
                      rows={3}
                      className="w-full rounded-xl px-3 py-2 text-sm bg-secondary border border-border resize-none outline-none focus:border-primary/50 mb-3"
                    />
                  )}
                  <button
                    onClick={submit}
                    disabled={!reason || loading}
                    className="w-full py-2.5 rounded-2xl bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white text-sm font-bold transition-colors"
                  >
                    {loading ? "Отправка..." : "Отправить жалобу"}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const BEG_PRESETS = [10, 25, 50, 100, 250];

function BegModal({
  user,
  onClose,
}: {
  user: { id: number; displayName: string; avatarColor?: string | null; avatarUrl?: string | null };
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const finalAmount = useCustom ? (parseInt(customAmount) || 0) : amount;

  const handleSubmit = async () => {
    if (finalAmount <= 0) {
      toast({ title: "Укажи сумму", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/beg", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ toUserId: user.id, amount: finalAmount, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "Ошибка", variant: "destructive" });
      } else {
        toast({ title: `Запрос отправлен ${user.displayName}!`, description: `Ты попросил ${finalAmount} ⚡ Spark` });
        onClose();
      }
    } catch {
      toast({ title: "Ошибка сети", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="bg-card rounded-[32px] border border-border w-full max-w-sm overflow-hidden shadow-2xl"
        >
          <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
            <div className="flex-1">
              <h2 className="font-black text-lg">Попросить Искра ✨</h2>
              <p className="text-xs text-muted-foreground">у {user.displayName}</p>
            </div>
            <button onClick={onClose} className="p-2 -mr-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Animated begging emoji */}
            <div className="flex flex-col items-center gap-2">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0], y: [0, -4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                className="text-5xl select-none"
              >
                🙏
              </motion.div>
              <p className="text-sm text-muted-foreground text-center">Укажи сколько Spark хочешь попросить</p>
            </div>

            {/* Preset amounts */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Сумма</p>
              <div className="flex flex-wrap gap-2">
                {BEG_PRESETS.map(p => (
                  <button
                    key={p}
                    onClick={() => { setAmount(p); setUseCustom(false); }}
                    className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-all ${
                      !useCustom && amount === p
                        ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
                        : "bg-secondary border-border text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {p} ⚡
                  </button>
                ))}
                <button
                  onClick={() => setUseCustom(true)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-all ${
                    useCustom
                      ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
                      : "bg-secondary border-border text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  Своя
                </button>
              </div>
              {useCustom && (
                <motion.input
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)}
                  placeholder="Сумма ✨"
                  className="mt-2 w-full rounded-xl bg-secondary border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                />
              )}
            </div>

            {/* Message */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Сообщение (необязательно)</p>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Объясни зачем тебе Spark… 😅"
                maxLength={200}
                rows={2}
                className="w-full rounded-xl bg-secondary border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/40 resize-none"
              />
              <p className="text-right text-[10px] text-muted-foreground mt-1">{message.length}/200</p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={loading || finalAmount <= 0}
              className="w-full py-3.5 rounded-2xl font-black text-sm bg-gradient-to-r from-yellow-500 to-orange-500 text-black disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)]"
            >
              {loading ? "Отправка…" : `Попросить ${finalAmount > 0 ? finalAmount + " ⚡" : "Spark"}`}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  online: { color: "bg-green-500", label: "online", icon: <CheckCircle2 size={12} className="text-green-400" /> },
  away: { color: "bg-yellow-500", label: "away", icon: <Clock size={12} className="text-yellow-400" /> },
  offline: { color: "bg-gray-500", label: "offline", icon: <User size={12} className="text-gray-400" /> },
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors rounded-xl">
      <div className="w-36 shrink-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-0.5">{label}</div>
      <div className="text-sm text-foreground break-all">{value}</div>
    </div>
  );
}

function StatCard({ value, label, icon }: { value: number | string; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-1 py-4 px-2 bg-white/5 rounded-2xl border border-white/5">
      <div className="text-primary mb-0.5">{icon}</div>
      <div className="text-2xl font-black tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold text-center">{label}</div>
    </div>
  );
}

export default function UserProfile() {
  const params = useParams<{ userId: string }>();
  const userId = Number(params.userId);
  const [, setLocation] = useLocation();
  const { setSelectedChatId, startCall } = useAppContext();
  const queryClient = useQueryClient();
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [showBeg, setShowBeg] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const token = sessionStorage.getItem("pulse-token");
    fetch(`/api/users/${userId}/block`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setIsBlocked(d.blocked); })
      .catch(() => {});
  }, [userId]);

  const handleBlock = async () => {
    setBlockLoading(true);
    const token = sessionStorage.getItem("pulse-token");
    try {
      const method = isBlocked ? "DELETE" : "POST";
      const res = await fetch(`/api/users/${userId}/block`, {
        method,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setIsBlocked(!isBlocked);
    } catch {}
    setBlockLoading(false);
  };

  const { data: user, isLoading } = useGetUserById(userId, { query: { enabled: !!userId } as any });
  const { data: contacts } = useGetContacts();
  const { data: chats } = useGetChats();
  const addContact = useAddContact();
  const removeContact = useRemoveContact();

  const isContact = contacts?.some((c: { id: number }) => c.id === userId) ?? false;
  const isMe = userId === 1;

  const commonChats = chats?.filter((chat: { type: string; otherUser?: { id: number } | null; members?: { userId: number }[] }) => {
    if (chat.type === "direct") return chat.otherUser?.id === userId;
    return chat.members?.some((m: { userId: number }) => m.userId === userId);
  }) ?? [];

  const handleAddContact = () => {
    addContact.mutate(
      { data: { userId } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetContactsQueryKey() }) }
    );
  };

  const handleRemoveContact = () => {
    removeContact.mutate(
      { contactId: userId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetContactsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
        }
      }
    );
  };

  const handleMessage = async () => {
    setIsStartingChat(true);
    const uid = sessionStorage.getItem("pulse-user-id");
    const token = sessionStorage.getItem("pulse-token");
    try {
      const res = await fetch("/api/chats/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const chat = await res.json();
        queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
        setSelectedChatId(chat.id);
        setLocation("/");
      } else {
        setLocation("/");
      }
    } catch {
      setLocation("/");
    }
    setIsStartingChat(false);
  };

  const statusCfg = STATUS_CONFIG[user?.status || "offline"] || STATUS_CONFIG.offline;

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        <header className="h-16 border-b border-border flex items-center px-6 gap-3 bg-card/80 backdrop-blur-md shrink-0">
          <button onClick={() => window.history.back()} className="p-2 rounded-full hover:bg-secondary text-muted-foreground transition-colors">
            <ArrowLeft size={20} />
          </button>
          <Skeleton className="h-5 w-32" />
        </header>
        <div className="flex-1 overflow-y-auto p-6 pb-24 md:pb-6 max-w-2xl mx-auto w-full space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="w-28 h-28 rounded-full" />
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-48 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <User size={48} className="opacity-20" />
        <p className="font-medium">Пользователь не найден</p>
        <button onClick={() => window.history.back()} className="text-primary text-sm hover:underline">
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <header className="h-16 border-b border-border flex items-center px-6 gap-3 bg-card/80 backdrop-blur-md shrink-0 z-10">
        <button
          onClick={() => window.history.back()}
          className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-base truncate">{user.displayName}</h1>
            {(user as any).isVerified && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <circle cx="12" cy="12" r="12" fill="hsl(16 100% 50%)"/>
                <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{isMe ? "мой профиль" : statusCfg.label}</p>
        </div>
        {!isMe && (
          <>
            <ReportUserDialog userId={Number(userId)} displayName={user.displayName} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <MoreVertical size={20} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {isContact ? (
                  <DropdownMenuItem onClick={handleRemoveContact} className="text-destructive focus:text-destructive">
                    <UserMinus size={15} className="mr-2" /> Удалить из контактов
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleAddContact}>
                    <UserPlus size={15} className="mr-2" /> Добавить в контакты
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={handleBlock}
                  disabled={blockLoading}
                  className={isBlocked ? "text-green-500 focus:text-green-500" : "text-destructive focus:text-destructive"}
                >
                  {isBlocked
                    ? <><ShieldCheck size={15} className="mr-2" /> Разблокировать</>
                    : <><ShieldBan size={15} className="mr-2" /> Заблокировать</>
                  }
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-2xl mx-auto w-full p-4 md:p-6 pb-24 md:pb-6 space-y-4">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl overflow-hidden bg-card border border-border"
          >
            <div
              className="h-24 w-full relative"
              style={{
                background: (user as any).hasPrime
                  ? (user as any).primeTier === "prime_plus"
                    ? "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(56,189,248,0.15), rgba(168,85,247,0.08))"
                    : "linear-gradient(135deg, rgba(250,204,21,0.25), rgba(251,146,60,0.15), rgba(249,115,22,0.1))"
                  : `linear-gradient(135deg, ${user.avatarColor || "#3B82F6"}66, ${user.avatarColor || "#3B82F6"}22)`,
              }}
            >
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(circle at 20% 80%, ${user.avatarColor}88 0%, transparent 60%)` }} />
              {(user as any).hasPrime && (
                <div className="absolute inset-0 overflow-hidden">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute rounded-full"
                      style={{
                        width: i % 2 === 0 ? 5 : 3,
                        height: i % 2 === 0 ? 5 : 3,
                        left: `${12 + i * 14}%`,
                        top: `${20 + (i % 3) * 20}%`,
                        background: (user as any).primeTier === "prime_plus"
                          ? (i % 2 === 0 ? "#a855f7" : "#38bdf8")
                          : (i % 2 === 0 ? "#facc15" : "#fb923c"),
                      }}
                      animate={{ y: [0, -10, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 pb-6">
              <div className="flex items-end justify-between -mt-14 mb-4">
                <motion.div whileHover={{ scale: 1.05 }} className="relative">
                  {(user as any).hasPrime && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: (user as any).primeTier === "prime_plus" ? 3 : 4, repeat: Infinity, ease: "linear" }}
                      className="absolute -inset-[3px] rounded-full z-0"
                      style={{
                        background: (user as any).primeTier === "prime_plus"
                          ? "conic-gradient(from 0deg, #a855f7, #38bdf8, #e2e8f0, #c084fc, #06b6d4, #a855f7)"
                          : "conic-gradient(from 0deg, #facc15, #fb923c, #f97316, #facc15)",
                        borderRadius: "50%",
                      }}
                    />
                  )}
                  <div
                    className="w-28 h-28 rounded-full flex items-center justify-center text-white text-4xl font-black overflow-hidden border-4 border-card shadow-xl relative z-10"
                    style={{ backgroundColor: user.avatarColor || "#3B82F6" }}
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      user.displayName[0].toUpperCase()
                    )}
                  </div>
                  {!isMe && (
                    <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-[3px] border-card ${statusCfg.color} z-20`} />
                  )}
                </motion.div>

                {!isMe && (
                  <div className="flex items-center gap-2 pb-1">
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleMessage}
                      disabled={isStartingChat}
                      className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-[0_0_15px_rgba(255,80,0,0.3)] hover:shadow-[0_0_25px_rgba(255,80,0,0.5)] transition-shadow disabled:opacity-60"
                      title="Send message"
                    >
                      <MessageSquare size={18} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => startCall(userId, null, "audio")}
                      className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
                      title="Voice call"
                    >
                      <Phone size={18} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => startCall(userId, null, "video")}
                      className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
                      title="Video call"
                    >
                      <Video size={18} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowBeg(true)}
                      className="w-11 h-11 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-400 hover:bg-yellow-500/20 transition-colors border border-yellow-500/20"
                      title="Попросить Spark"
                    >
                      <HandCoins size={18} />
                    </motion.button>
                    {isContact ? (
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleRemoveContact}
                        className="w-11 h-11 rounded-full bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        <UserMinus size={18} />
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAddContact}
                        disabled={addContact.isPending}
                        className="w-11 h-11 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 hover:bg-green-500/20 transition-colors"
                      >
                        <UserPlus size={18} />
                      </motion.button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2
                    className="text-2xl font-black"
                    style={(user as any).hasPrime ? {
                      background: (user as any).primeTier === "prime_plus"
                        ? "linear-gradient(90deg, #a855f7, #38bdf8)"
                        : "linear-gradient(90deg, #facc15, #fb923c)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    } : undefined}
                  >
                    {user.displayName}
                  </h2>
                  {(user as any).hasPrime && (
                    <motion.div
                      animate={{ rotate: [0, -8, 8, -8, 0], scale: [1, 1.15, 1] }}
                      transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        (user as any).primeTier === "prime_plus"
                          ? "bg-gradient-to-br from-purple-500 to-cyan-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                          : "bg-gradient-to-br from-yellow-400 to-orange-500 shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                      }`}
                    >
                      <Crown size={13} className="text-white" />
                    </motion.div>
                  )}
                  {(user as any).isVerified && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="12" fill="hsl(16 100% 50%)"/>
                      <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {!(user as any).hasPrime && isContact && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">Контакт</span>
                  )}
                  {!(user as any).hasPrime && isMe && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">Вы</span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm mt-0.5">@{user.username}</p>
                {user.bio && <p className="text-sm mt-3 leading-relaxed text-foreground/80">{user.bio}</p>}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-3xl bg-card border border-border overflow-hidden"
          >
            <div className="px-5 pt-4 pb-1">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Информация</h3>
            </div>
            <InfoRow label="Никнейм" value={`@${user.username}`} />
            {user.phoneNumber && <InfoRow label="Телефон" value={user.phoneNumber} />}
            {!isMe && <InfoRow label="Статус" value={statusCfg.label} />}
            {((user as any).popularity ?? 0) > 0 && (
              <InfoRow label="✨ Популярность" value={`${(user as any).popularity.toLocaleString()} Spark`} />
            )}
          </motion.div>

          {!isMe && commonChats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-3xl bg-card border border-border p-4"
            >
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 px-1">С вами</h3>
              <div className="flex gap-3">
                <StatCard value={commonChats.length} label="Общих чатов" icon={<MessageSquare size={18} />} />
              </div>
            </motion.div>
          )}

          {!isMe && commonChats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-3xl bg-card border border-border overflow-hidden"
            >
              <div className="px-5 pt-4 pb-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  {commonChats.length} общих чата
                </h3>
              </div>
              <div className="p-3 space-y-1">
                {commonChats.map((chat: { id: number; name?: string | null; avatarColor?: string | null; type: string }) => (
                  <button
                    key={chat.id}
                    onClick={() => { setSelectedChatId(chat.id); setLocation("/"); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ backgroundColor: chat.avatarColor || "#3B82F6" }}
                    >
                      {(chat.name || "C")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{chat.name || "Chat"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{chat.type}</p>
                    </div>
                    <MessageSquare size={15} className="text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}


        </div>
      </div>

      {showBeg && user && (
        <BegModal
          user={{ id: user.id, displayName: user.displayName, avatarColor: user.avatarColor, avatarUrl: (user as any).avatarUrl }}
          onClose={() => setShowBeg(false)}
        />
      )}
    </div>
  );
}
