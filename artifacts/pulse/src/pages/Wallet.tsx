import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Copy, Check, Trophy, Star, MessageSquare, Phone, Gift,
  History, Shield, ChevronRight, ArrowUpRight, ArrowDownLeft,
  AlertTriangle, CheckCircle2, TrendingUp, X, Send
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGetMe } from "@workspace/api-client-react";

const TASK_CONFIGS: Record<string, { color: string; icon: React.ReactNode }> = {
  daily_login:    { color: "from-yellow-500 to-amber-500",   icon: <Zap size={20} className="text-white" /> },
  send_message:   { color: "from-blue-500 to-cyan-500",      icon: <MessageSquare size={20} className="text-white" /> },
  make_call:      { color: "from-green-500 to-emerald-500",  icon: <Phone size={20} className="text-white" /> },
  send_gift:      { color: "from-pink-500 to-rose-500",      icon: <Gift size={20} className="text-white" /> },
  add_contact:    { color: "from-purple-500 to-violet-500",  icon: <Star size={20} className="text-white" /> },
  update_profile: { color: "from-orange-500 to-amber-500",   icon: <Trophy size={20} className="text-white" /> },
};

const TASKS = [
  { id: "daily_login",    title: "Ежедневный вход",    description: "Открой Pulse сегодня",         reward: 5  },
  { id: "send_message",   title: "Отправь сообщение",  description: "Напиши кому-нибудь",           reward: 10 },
  { id: "make_call",      title: "Позвони другу",       description: "Соверши звонок",               reward: 15 },
  { id: "send_gift",      title: "Отправь подарок",     description: "Порадуй кого-нибудь",          reward: 20 },
  { id: "add_contact",    title: "Добавь контакт",      description: "Расширь сеть",                 reward: 10 },
  { id: "update_profile", title: "Обнови профиль",      description: "Добавь биографию или статус",  reward: 15 },
];

interface TxEntry {
  id: string;
  type: "earn" | "spend" | "gift_in" | "gift_out";
  amount: number;
  label: string;
  time: Date;
}

function getUserIdHeader(): Record<string, string> {
  const token = localStorage.getItem("pulse-token");
  if (token) return { "Authorization": `Bearer ${token}` };
  const uid = localStorage.getItem("pulse-user-id");
  return uid ? { "x-user-id": uid } : {};
}

async function verifyTask(taskId: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    const headers = getUserIdHeader();
    switch (taskId) {
      case "daily_login": return { ok: true };
      case "send_message": {
        const res = await fetch("/api/stats/me", { headers });
        if (!res.ok) return { ok: false, reason: "Не удалось проверить" };
        const data = await res.json();
        return (data.messagesSent || 0) > 0
          ? { ok: true }
          : { ok: false, reason: "Сначала отправь хотя бы одно сообщение" };
      }
      case "make_call": {
        const res = await fetch("/api/stats/me", { headers });
        if (!res.ok) return { ok: false, reason: "Не удалось проверить" };
        const data = await res.json();
        return (data.callsMade || 0) > 0
          ? { ok: true }
          : { ok: false, reason: "Сначала позвони кому-нибудь" };
      }
      case "send_gift": {
        const res = await fetch("/api/gifts/sent", { headers });
        if (!res.ok) return { ok: false, reason: "Не удалось проверить" };
        const data = await res.json();
        return Array.isArray(data) && data.length > 0
          ? { ok: true }
          : { ok: false, reason: "Сначала отправь подарок кому-нибудь" };
      }
      case "add_contact": {
        const res = await fetch("/api/contacts", { headers });
        if (!res.ok) return { ok: false, reason: "Не удалось проверить" };
        const data = await res.json();
        return Array.isArray(data) && data.length > 0
          ? { ok: true }
          : { ok: false, reason: "Сначала добавь хотя бы один контакт" };
      }
      case "update_profile": {
        const res = await fetch("/api/users/me", { headers });
        if (!res.ok) return { ok: false, reason: "Не удалось проверить" };
        const data = await res.json();
        return data.bio && data.bio.trim().length > 0
          ? { ok: true }
          : { ok: false, reason: "Добавь биографию в Настройках" };
      }
      default: return { ok: true };
    }
  } catch {
    return { ok: false, reason: "Ошибка проверки" };
  }
}

export default function Wallet() {
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const [balance, setBalance] = useState(0);
  const [walletAddress, setWalletAddress] = useState("");
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [earningTask, setEarningTask] = useState<string | null>(null);
  const [taskErrors, setTaskErrors] = useState<Record<string, string>>({});
  const [txHistory, setTxHistory] = useState<TxEntry[]>([]);
  const [tab, setTab] = useState<"tasks" | "history">("tasks");
  const [addressCopied, setAddressCopied] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [bonusLoading, setBonusLoading] = useState(false);
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendAddress, setSendAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [isSending, setIsSending] = useState(false);

  const uid = Number(localStorage.getItem("pulse-user-id") || "0");
  const isAdmin = (me as any)?.isAdmin === true;

  const tasksKey = `pulse-completed-tasks-${uid}`;
  const txKey = `pulse-tx-history-${uid}`;
  const loginKey = `pulse-last-login-${uid}`;
  const bonusKey = `pulse-bonus-claimed-${uid}`;

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet", { headers: getUserIdHeader() });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setWalletAddress(data.address);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchWallet();
    const stored = localStorage.getItem(tasksKey);
    if (stored) setCompletedTasks(JSON.parse(stored));
    const storedTx = localStorage.getItem(txKey);
    if (storedTx) {
      try { setTxHistory(JSON.parse(storedTx).map((tx: any) => ({ ...tx, time: new Date(tx.time) }))); } catch {}
    }
    const lastLogin = localStorage.getItem(loginKey);
    const today = new Date().toDateString();
    if (lastLogin !== today) {
      localStorage.setItem(loginKey, today);
      const tasks: string[] = stored ? JSON.parse(stored) : [];
      if (!tasks.includes("daily_login")) earnTask("daily_login", 5, tasks);
    }
    const lastBonus = localStorage.getItem(bonusKey);
    if (lastBonus === today) setBonusClaimed(true);
  }, []);

  const earnTask = async (taskId: string, reward: number, currentCompleted?: string[]) => {
    const completed = currentCompleted ?? completedTasks;
    if (completed.includes(taskId)) return;
    setEarningTask(taskId);
    setTaskErrors(prev => ({ ...prev, [taskId]: "" }));
    try {
      const res = await fetch("/api/wallet/earn", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getUserIdHeader() },
        body: JSON.stringify({ amount: reward }),
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        const newCompleted = [...completed, taskId];
        setCompletedTasks(newCompleted);
        localStorage.setItem(tasksKey, JSON.stringify(newCompleted));
        const task = TASKS.find(t => t.id === taskId);
        const newTx: TxEntry = { id: `${taskId}-${Date.now()}`, type: "earn", amount: reward, label: task?.title || taskId, time: new Date() };
        const updated = [newTx, ...txHistory].slice(0, 50);
        setTxHistory(updated);
        localStorage.setItem(txKey, JSON.stringify(updated));
      }
    } catch {}
    setEarningTask(null);
  };

  const handleClickTask = async (task: typeof TASKS[number]) => {
    if (completedTasks.includes(task.id)) return;
    setEarningTask(task.id);
    setTaskErrors(prev => ({ ...prev, [task.id]: "" }));
    const result = await verifyTask(task.id);
    if (!result.ok) {
      setTaskErrors(prev => ({ ...prev, [task.id]: result.reason || "Условие не выполнено" }));
      setEarningTask(null);
      return;
    }
    await earnTask(task.id, task.reward);
  };

  const handleDailyBonus = async () => {
    setBonusLoading(true);
    try {
      const res = await fetch("/api/wallet/daily-bonus", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getUserIdHeader() },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBalance(data.balance);
        const today = new Date().toDateString();
        localStorage.setItem(bonusKey, today);
        setBonusClaimed(true);
        const newTx: TxEntry = { id: `bonus-${Date.now()}`, type: "earn", amount: data.bonus, label: "Ежедневный бонус", time: new Date() };
        const updated = [newTx, ...txHistory].slice(0, 50);
        setTxHistory(updated);
        localStorage.setItem(txKey, JSON.stringify(updated));
        toast({ title: `+${data.bonus} ⚡ Spark!`, description: "Ежедневный бонус зачислен. Возвращайся завтра!" });
        setShowBonusModal(false);
      } else {
        toast({ title: "Бонус недоступен", description: data.error || "Попробуйте позже", variant: "destructive" });
        if (res.status === 409) {
          const today = new Date().toDateString();
          localStorage.setItem(bonusKey, today);
          setBonusClaimed(true);
          setShowBonusModal(false);
        }
      }
    } catch {
      toast({ title: "Ошибка сети", variant: "destructive" });
    }
    setBonusLoading(false);
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress).catch(() => {});
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 2000);
  };

  const handleSend = async () => {
    const amount = Number(sendAmount);
    if (!sendAddress.trim() || isNaN(amount) || amount <= 0) {
      toast({ title: "Укажите адрес и сумму", variant: "destructive" });
      return;
    }
    if (amount > balance) {
      toast({ title: "Недостаточно Spark", description: `Ваш баланс: ${balance} ⚡`, variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch("/api/wallet/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getUserIdHeader() },
        body: JSON.stringify({ address: sendAddress.trim(), amount }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBalance(data.balance);
        const newTx: TxEntry = { id: `send-${Date.now()}`, type: "spend", amount, label: `Перевод → ${data.recipient}`, time: new Date() };
        const updated = [newTx, ...txHistory].slice(0, 50);
        setTxHistory(updated);
        localStorage.setItem(txKey, JSON.stringify(updated));
        toast({ title: "Перевод выполнен!", description: `${amount} ⚡ отправлено ${data.recipient}` });
        setShowSendModal(false);
        setSendAddress("");
        setSendAmount("");
      } else {
        toast({ title: "Ошибка перевода", description: data.error || "Попробуйте снова", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка сети", variant: "destructive" });
    }
    setIsSending(false);
  };

  const timeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "только что";
    if (mins < 60) return `${mins} мин. назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч. назад`;
    return `${Math.floor(hours / 24)} д. назад`;
  };

  const doneCount = completedTasks.filter(id => TASKS.some(t => t.id === id)).length;
  const progress = TASKS.length > 0 ? (doneCount / TASKS.length) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center px-6 justify-between bg-card/80 backdrop-blur-md shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Zap className="text-primary" size={20} /> Кошелёк
        </h1>
        <div className="flex items-center gap-1.5 text-sm font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
          <Zap size={14} fill="currentColor" /> {Number(balance).toLocaleString()} SPARK
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
        <div className="max-w-xl mx-auto space-y-4">

          {/* ── Balance Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl p-5 text-white"
            style={{ background: "linear-gradient(135deg, #1a1a3e 0%, #0d2545 50%, #1a1a3e 100%)" }}
          >
            {/* Decorative orbs */}
            <div className="absolute top-0 right-0 w-36 h-36 rounded-full opacity-20 pointer-events-none"
              style={{ background: "radial-gradient(circle, #7c3aed, transparent)", transform: "translate(35%, -35%)" }} />
            <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full opacity-20 pointer-events-none"
              style={{ background: "radial-gradient(circle, #0891b2, transparent)", transform: "translate(-35%, 35%)" }} />

            <p className="text-xs text-white/50 uppercase tracking-widest mb-1 relative z-10">Баланс Spark</p>
            <div className="flex items-end gap-2 mb-4 relative z-10">
              <span className="text-5xl font-black tracking-tight">{Number(balance).toLocaleString("ru")}</span>
              <Zap size={32} className="text-yellow-400 mb-1 fill-yellow-400" />
            </div>

            {/* Daily progress */}
            <div className="mb-4 relative z-10">
              <div className="flex justify-between text-xs text-white/50 mb-1.5">
                <span>Прогресс дня</span>
                <span>{doneCount}/{TASKS.length} задач</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #22d3ee, #a78bfa)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Wallet address */}
            <div className="bg-white/8 rounded-xl px-3 py-2 flex items-center justify-between mb-4 relative z-10 border border-white/10">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">Адрес кошелька</p>
                <p className="font-mono text-sm font-bold text-white/90">{walletAddress || "PULSE-000001"}</p>
              </div>
              <button onClick={handleCopyAddress} className="p-1.5 rounded-lg hover:bg-white/10 transition text-white/60 hover:text-white">
                {addressCopied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 relative z-10">
              <button
                onClick={() => setShowReceiveModal(true)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                <ArrowDownLeft size={15} /> Получить
              </button>
              <button
                onClick={() => setShowSendModal(true)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                <Send size={15} /> Отправить
              </button>
              <button
                onClick={() => setShowBonusModal(true)}
                className={`flex-1 py-2.5 rounded-xl hover:opacity-90 transition text-sm font-semibold flex items-center justify-center gap-1.5 ${bonusClaimed ? "opacity-50 cursor-not-allowed" : ""}`}
                style={{ background: "linear-gradient(135deg, #22d3ee, #7c3aed)" }}
              >
                <Zap size={15} fill="white" /> {bonusClaimed ? "Завтра" : "Бонус"}
              </button>
            </div>
          </motion.div>

          {/* ── Admin link ── */}
          {isAdmin && (
            <motion.a
              href="/admin"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl hover:from-purple-500/20 hover:to-pink-500/20 transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                <Shield size={20} className="text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">Панель администратора</p>
                <p className="text-xs text-muted-foreground">Управление балансами пользователей</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </motion.a>
          )}

          {/* ── Tabs ── */}
          <div className="flex bg-muted/50 rounded-xl p-1 border border-border">
            {(["tasks", "history"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === t ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                }`}>
                {t === "tasks" ? <><TrendingUp size={14} /> Задания</> : <><History size={14} /> История</>}
              </button>
            ))}
          </div>

          {/* ── Content ── */}
          <AnimatePresence mode="wait">
            {tab === "tasks" && (
              <motion.div key="tasks" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-2">
                {TASKS.map((task, i) => {
                  const done = completedTasks.includes(task.id);
                  const earning = earningTask === task.id;
                  const errMsg = taskErrors[task.id];
                  const cfg = TASK_CONFIGS[task.id];
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <div
                        onClick={() => !done && !earning && handleClickTask(task)}
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                          done
                            ? "border-green-500/25 bg-green-500/5 opacity-70"
                            : errMsg
                            ? "border-red-500/30 bg-card cursor-pointer hover:bg-red-500/5"
                            : "border-border bg-card hover:border-primary/30 hover:bg-secondary/50 cursor-pointer"
                        }`}
                      >
                        {/* Gradient icon */}
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center shrink-0 shadow-sm`}>
                          {done ? <CheckCircle2 size={20} className="text-white" /> : cfg.icon}
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold leading-tight ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                        </div>

                        {/* Right side */}
                        {done ? (
                          <div className="shrink-0 text-xs text-green-500 font-bold flex items-center gap-1">
                            <Check size={14} /> Готово
                          </div>
                        ) : earning ? (
                          <div className="shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                              <Zap size={14} className="text-primary" />
                            </motion.div>
                          </div>
                        ) : (
                          <div className="shrink-0 flex items-center gap-1 text-sm font-bold text-yellow-500">
                            +{task.reward} <Zap size={13} fill="currentColor" />
                          </div>
                        )}
                      </div>

                      {/* Error message */}
                      {errMsg && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2 mt-1 border border-red-500/20"
                        >
                          <AlertTriangle size={12} className="shrink-0" /> {errMsg}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {tab === "history" && (
              <motion.div key="history" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-2">
                {txHistory.length === 0 ? (
                  <div className="text-center text-muted-foreground py-16">
                    <History size={44} className="mx-auto mb-3 opacity-20" />
                    <p className="font-semibold">Нет транзакций</p>
                    <p className="text-sm opacity-60 mt-1">Выполни задания чтобы заработать ⚡ Spark</p>
                  </div>
                ) : (
                  txHistory.map((tx, i) => {
                    const isPositive = tx.type === "earn" || tx.type === "gift_in";
                    return (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-3 p-3.5 bg-card border border-border rounded-2xl"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPositive ? "bg-green-500/15" : "bg-red-500/15"}`}>
                          {isPositive
                            ? <ArrowDownLeft size={17} className="text-green-400" />
                            : <ArrowUpRight size={17} className="text-red-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{tx.label}</p>
                          <p className="text-xs text-muted-foreground">{timeAgo(tx.time)}</p>
                        </div>
                        <span className={`text-sm font-bold shrink-0 ${isPositive ? "text-green-400" : "text-red-400"}`}>
                          {isPositive ? "+" : "-"}{Math.abs(tx.amount)} ⚡
                        </span>
                      </motion.div>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Receive Modal */}
      <AnimatePresence>
        {showReceiveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowReceiveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">Получить Spark</h3>
                <button onClick={() => setShowReceiveModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <span className="text-4xl">⚡</span>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Ваш адрес кошелька</p>
                  <div className="bg-background border border-border rounded-xl px-4 py-3 font-mono text-sm text-foreground select-all break-all text-center">
                    {walletAddress || `PULSE-${uid ? uid.toString().padStart(6, "0") : "000000"}`}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">Передайте этот адрес отправителю для получения Spark</p>
                <button
                  onClick={() => {
                    const addr = walletAddress || `PULSE-${uid ? uid.toString().padStart(6, "0") : "000000"}`;
                    navigator.clipboard?.writeText(addr);
                    setAddressCopied(true);
                    setTimeout(() => setAddressCopied(false), 2000);
                    setShowReceiveModal(false);
                  }}
                  className="w-full py-3 bg-primary rounded-xl text-sm font-semibold text-white"
                >
                  Скопировать адрес
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send Modal */}
      <AnimatePresence>
        {showSendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowSendModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground">Отправить Spark</h3>
                <button onClick={() => setShowSendModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Адрес получателя</label>
                  <input
                    type="text"
                    value={sendAddress}
                    onChange={e => setSendAddress(e.target.value)}
                    placeholder="PULSE-000001"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                    autoCapitalize="characters"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Сумма ⚡</label>
                  <input
                    type="number"
                    value={sendAmount}
                    onChange={e => setSendAmount(e.target.value)}
                    placeholder="100"
                    min={1}
                    max={balance}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Доступно: {balance.toLocaleString()} ⚡</p>
                </div>
                <button
                  disabled={isSending || !sendAddress.trim() || !sendAmount}
                  onClick={handleSend}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #22d3ee)" }}
                >
                  {isSending ? "Отправка..." : "Подтвердить перевод"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Bonus Modal */}
      <AnimatePresence>
        {showBonusModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowBonusModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">Ежедневный бонус</h3>
                <button onClick={() => setShowBonusModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex flex-col items-center gap-4 py-2">
                <motion.div
                  animate={bonusClaimed ? {} : { scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-24 h-24 rounded-3xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #22d3ee22, #7c3aed22)", border: "2px solid #7c3aed44" }}
                >
                  <span className="text-5xl">⚡</span>
                </motion.div>
                <div className="text-center">
                  <p className="text-3xl font-black text-foreground">+1 000 Spark</p>
                  <p className="text-sm text-muted-foreground mt-1">Бесплатно каждый день, без покупок</p>
                </div>
                {bonusClaimed ? (
                  <div className="w-full py-3 rounded-xl bg-green-500/15 border border-green-500/30 text-center text-sm font-semibold text-green-400">
                    Уже получен сегодня — возвращайся завтра!
                  </div>
                ) : (
                  <button
                    disabled={bonusLoading}
                    onClick={handleDailyBonus}
                    className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #22d3ee, #7c3aed)" }}
                  >
                    {bonusLoading ? "Получение..." : "Забрать бонус"}
                  </button>
                )}
                <p className="text-xs text-muted-foreground text-center">Новый бонус доступен каждый день в 00:00</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
