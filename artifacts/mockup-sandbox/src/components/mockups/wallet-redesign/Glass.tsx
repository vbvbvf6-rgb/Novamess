import { useState } from "react";
import { Zap, MessageSquare, Phone, Gift, Star, Trophy, ArrowUpRight, ArrowDownLeft, CheckCircle2, TrendingUp, Sparkles } from "lucide-react";

const TASKS = [
  { id: "daily_login", title: "Ежедневный вход", desc: "Открой Pulse сегодня", reward: 5, emoji: "☀️", done: true },
  { id: "send_message", title: "Отправь сообщение", desc: "Напиши кому-нибудь", reward: 10, emoji: "💬", done: true },
  { id: "make_call", title: "Позвони другу", desc: "Соверши звонок", reward: 15, emoji: "📞", done: false },
  { id: "send_gift", title: "Отправь подарок", desc: "Порадуй кого-нибудь", reward: 20, emoji: "🎁", done: false },
  { id: "add_contact", title: "Добавь контакт", desc: "Расширь сеть", reward: 10, emoji: "👤", done: false },
  { id: "update_profile", title: "Обнови профиль", desc: "Добавь биографию", reward: 15, emoji: "✏️", done: false },
];

const HISTORY = [
  { type: "earn", amount: 5, label: "Ежедневный вход", time: "только что" },
  { type: "earn", amount: 10, label: "Отправил сообщение", time: "2 мин назад" },
  { type: "spend", amount: 100, label: "Подарок: Роза", time: "вчера" },
];

const doneTasks = TASKS.filter(t => t.done).length;
const totalReward = TASKS.filter(t => t.done).reduce((s, t) => s + t.reward, 0);

export function Glass() {
  const [tab, setTab] = useState<"tasks" | "history">("tasks");
  const balance = 15110;
  const pct = Math.round((doneTasks / TASKS.length) * 100);

  return (
    <div className="min-h-screen text-white p-5 max-w-sm mx-auto relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0c0c1f 0%, #10102a 40%, #0a0a1e 100%)" }}>
      {/* BG blobs */}
      <div className="absolute top-10 left-10 w-56 h-56 rounded-full opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, #8b5cf6, transparent 70%)", filter: "blur(40px)" }} />
      <div className="absolute top-32 right-0 w-48 h-48 rounded-full opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, #06b6d4, transparent 70%)", filter: "blur(40px)" }} />
      <div className="absolute bottom-20 left-1/2 w-40 h-40 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #ec4899, transparent 70%)", filter: "blur(40px)" }} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest">Мой кошелёк</p>
          <h1 className="text-lg font-bold">George Zastylov</h1>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center font-bold">G</div>
      </div>

      {/* Glass balance card */}
      <div className="relative rounded-3xl p-5 mb-5 overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)"
        }}>
        {/* Shimmer line */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }} />

        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Spark баланс</p>
            <div className="flex items-center gap-2">
              <span className="text-4xl font-black tracking-tight">{balance.toLocaleString("ru")}</span>
              <div className="w-8 h-8 rounded-xl bg-yellow-400/20 flex items-center justify-center">
                <Zap size={18} className="text-yellow-300 fill-yellow-300" />
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40 mb-1">Сегодня</p>
            <p className="text-sm font-semibold text-green-400">+{totalReward} ⚡</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/40">Ежедневный прогресс</span>
            <span className="text-white/60">{pct}%</span>
          </div>
          <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg, #8b5cf6, #06b6d4)" }} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button className="flex-1 py-2.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5 transition"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <ArrowDownLeft size={15} /> Получить
          </button>
          <button className="flex-1 py-2.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5 transition"
            style={{ background: "linear-gradient(135deg, #7c3aed, #0891b2)", boxShadow: "0 4px 15px rgba(124,58,237,0.4)" }}>
            <Sparkles size={15} /> Купить
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 rounded-2xl p-1"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {(["tasks", "history"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 text-sm font-medium rounded-xl transition-all"
            style={tab === t ? {
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "white"
            } : { color: "rgba(255,255,255,0.35)" }}>
            {t === "tasks" ? `🎯 Задания (${doneTasks}/${TASKS.length})` : "📋 История"}
          </button>
        ))}
      </div>

      {tab === "tasks" ? (
        <div className="space-y-2">
          {TASKS.map(task => (
            <div key={task.id} className="flex items-center gap-3 p-3 rounded-2xl transition-all"
              style={{
                background: task.done ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${task.done ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)"}`,
              }}>
              <span className="text-2xl">{task.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${task.done ? "text-white/50 line-through" : "text-white"}`}>{task.title}</p>
                <p className="text-xs text-white/30">{task.desc}</p>
              </div>
              {task.done ? (
                <CheckCircle2 size={18} className="text-green-400 shrink-0" />
              ) : (
                <button className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-yellow-300"
                  style={{ background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.3)" }}>
                  +{task.reward} ⚡
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {HISTORY.map((tx, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: tx.type === "earn" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" }}>
                {tx.type === "earn"
                  ? <TrendingUp size={16} className="text-green-400" />
                  : <ArrowUpRight size={16} className="text-red-400" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{tx.label}</p>
                <p className="text-xs text-white/30">{tx.time}</p>
              </div>
              <span className={`text-sm font-bold ${tx.type === "earn" ? "text-green-400" : "text-red-400"}`}>
                {tx.type === "earn" ? "+" : "-"}{tx.amount} ⚡
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
