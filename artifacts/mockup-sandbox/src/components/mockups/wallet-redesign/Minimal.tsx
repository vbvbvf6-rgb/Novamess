import { useState } from "react";
import { Zap, MessageSquare, Phone, Gift, Star, Trophy, ArrowUpRight, ArrowDownLeft, CheckCircle2, Circle } from "lucide-react";

const TASKS = [
  { id: "daily_login", title: "Ежедневный вход", desc: "Открой Pulse сегодня", reward: 5, icon: "☀️", done: true },
  { id: "send_message", title: "Отправь сообщение", desc: "Напиши кому-нибудь", reward: 10, icon: "💬", done: false },
  { id: "make_call", title: "Позвони другу", desc: "Соверши звонок", reward: 15, icon: "📞", done: false },
  { id: "send_gift", title: "Отправь подарок", desc: "Порадуй кого-нибудь", reward: 20, icon: "🎁", done: false },
  { id: "add_contact", title: "Добавь контакт", desc: "Расширь сеть", reward: 10, icon: "👤", done: false },
  { id: "update_profile", title: "Обнови профиль", desc: "Добавь биографию", reward: 15, icon: "✏️", done: false },
];

const HISTORY = [
  { type: "earn", amount: 5, label: "Ежедневный вход", time: "сегодня" },
  { type: "spend", amount: 100, label: "Подарок: Роза", time: "вчера" },
  { type: "earn", amount: 20, label: "Отправил подарок", time: "2 дня назад" },
];

export function Minimal() {
  const [tab, setTab] = useState<"tasks" | "history">("tasks");
  const balance = 15110;
  const done = TASKS.filter(t => t.done).length;
  const total = TASKS.length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="min-h-screen bg-[#111118] text-white max-w-sm mx-auto">
      {/* Big balance section */}
      <div className="px-5 pt-8 pb-6 border-b border-white/6">
        <p className="text-xs text-white/30 uppercase tracking-[0.2em] mb-3">Spark кошелёк</p>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-6xl font-black tabular-nums leading-none"
            style={{ background: "linear-gradient(135deg, #e2e8f0, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {balance.toLocaleString("ru")}
          </span>
          <span className="text-2xl">⚡</span>
        </div>
        <p className="text-xs text-white/25 mb-5">≈ 151,10 ₽</p>

        {/* Ring progress */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 -rotate-90">
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
              <circle cx="24" cy="24" r="20" fill="none"
                stroke="url(#grad)" strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - pct / 100)}`} />
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/70">{pct}%</span>
          </div>
          <div>
            <p className="text-sm font-semibold">{done} из {total} задач</p>
            <p className="text-xs text-white/30">выполнено сегодня</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 h-10 rounded-xl border border-white/10 text-sm font-medium text-white/60 hover:text-white hover:border-white/20 transition flex items-center justify-center gap-1.5">
            <ArrowDownLeft size={14} /> Получить
          </button>
          <button className="flex-1 h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
            style={{ background: "linear-gradient(135deg, #6366f1, #0ea5e9)" }}>
            <Zap size={14} fill="white" /> Купить Spark
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/6">
        {(["tasks", "history"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3.5 text-sm font-medium transition border-b-2 -mb-px ${tab === t ? "border-indigo-400 text-white" : "border-transparent text-white/30"}`}>
            {t === "tasks" ? "Задания" : "История"}
          </button>
        ))}
      </div>

      {tab === "tasks" ? (
        <div className="divide-y divide-white/5">
          {TASKS.map(task => (
            <div key={task.id} className="flex items-center gap-3 px-5 py-4">
              <span className="text-xl w-8 text-center">{task.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.done ? "text-white/30 line-through" : ""}`}>{task.title}</p>
                <p className="text-xs text-white/25 mt-0.5">{task.desc}</p>
              </div>
              {task.done ? (
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 size={14} className="text-green-400" />
                </div>
              ) : (
                <div className="flex items-center gap-0.5 text-sm font-bold text-amber-400">
                  +{task.reward}<span className="text-base">⚡</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {HISTORY.map((tx, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === "earn" ? "bg-green-500/15" : "bg-red-500/15"}`}>
                {tx.type === "earn"
                  ? <ArrowDownLeft size={14} className="text-green-400" />
                  : <ArrowUpRight size={14} className="text-red-400" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{tx.label}</p>
                <p className="text-xs text-white/25">{tx.time}</p>
              </div>
              <span className={`text-sm font-bold ${tx.type === "earn" ? "text-green-400" : "text-red-400"}`}>
                {tx.type === "earn" ? "+" : "-"}{tx.amount}⚡
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
