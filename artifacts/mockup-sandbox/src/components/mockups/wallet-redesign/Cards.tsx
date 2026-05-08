import { useState } from "react";
import { Zap, MessageSquare, Phone, Gift, Star, Trophy, ArrowUpRight, ArrowDownLeft, CheckCircle2, Copy, Check, ChevronRight } from "lucide-react";

const TASKS = [
  { id: "daily_login", title: "Ежедневный вход", desc: "Открой Pulse сегодня", reward: 5, color: "from-yellow-500 to-amber-500", icon: <Zap size={20} />, done: true },
  { id: "send_message", title: "Отправь сообщение", desc: "Напиши кому-нибудь", reward: 10, color: "from-blue-500 to-cyan-500", icon: <MessageSquare size={20} />, done: false },
  { id: "make_call", title: "Позвони другу", desc: "Соверши звонок", reward: 15, color: "from-green-500 to-emerald-500", icon: <Phone size={20} />, done: false },
  { id: "send_gift", title: "Отправь подарок", desc: "Порадуй кого-нибудь", reward: 20, color: "from-pink-500 to-rose-500", icon: <Gift size={20} />, done: false },
  { id: "add_contact", title: "Добавь контакт", desc: "Расширь сеть", reward: 10, color: "from-purple-500 to-violet-500", icon: <Star size={20} />, done: false },
  { id: "update_profile", title: "Обнови профиль", desc: "Добавь биографию", reward: 15, color: "from-orange-500 to-amber-500", icon: <Trophy size={20} />, done: false },
];

const HISTORY = [
  { type: "earn", amount: 5, label: "Ежедневный вход", time: "сегодня" },
  { type: "spend", amount: 100, label: "Подарок: Роза", time: "вчера" },
  { type: "earn", amount: 20, label: "Отправил подарок", time: "2 дня назад" },
];

export function Cards() {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"tasks" | "history">("tasks");
  const balance = 15110;
  const progress = (TASKS.filter(t => t.done).length / TASKS.length) * 100;

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white p-4 max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <h1 className="text-xl font-bold">Кошелёк</h1>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-xs font-bold">G</div>
      </div>

      {/* Balance Card */}
      <div className="relative rounded-2xl overflow-hidden mb-4 p-5"
        style={{ background: "linear-gradient(135deg, #1a1a3e 0%, #0d2545 50%, #1a1a3e 100%)" }}>
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #7c3aed, transparent)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #0891b2, transparent)", transform: "translate(-30%, 30%)" }} />

        <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Баланс Spark</p>
        <div className="flex items-end gap-2 mb-4">
          <span className="text-4xl font-black">{balance.toLocaleString("ru")}</span>
          <Zap size={28} className="text-yellow-400 mb-1 fill-yellow-400" />
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>Прогресс дня</span>
            <span>{TASKS.filter(t => t.done).length}/{TASKS.length} задач</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full transition-all"
              style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-sm font-medium flex items-center justify-center gap-1.5">
            <ArrowDownLeft size={15} /> Получить
          </button>
          <button className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 transition text-sm font-semibold flex items-center justify-center gap-1.5">
            <Zap size={15} /> Купить Spark
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/5 rounded-xl p-1 mb-4">
        {(["tasks", "history"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition ${tab === t ? "bg-white/10 text-white" : "text-white/40"}`}>
            {t === "tasks" ? "Задания" : "История"}
          </button>
        ))}
      </div>

      {tab === "tasks" ? (
        <div className="space-y-2">
          {TASKS.map(task => (
            <div key={task.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition ${task.done ? "border-green-500/30 bg-green-500/5" : "border-white/8 bg-white/4 hover:bg-white/8"}`}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${task.color} flex items-center justify-center shrink-0`}>
                {task.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">{task.title}</p>
                <p className="text-xs text-white/40 mt-0.5">{task.desc}</p>
              </div>
              {task.done ? (
                <CheckCircle2 size={20} className="text-green-400 shrink-0" />
              ) : (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-sm font-bold text-yellow-400">+{task.reward}</span>
                  <Zap size={13} className="text-yellow-400 fill-yellow-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {HISTORY.map((tx, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/8">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tx.type === "earn" ? "bg-green-500/20" : "bg-red-500/20"}`}>
                {tx.type === "earn" ? <ArrowDownLeft size={16} className="text-green-400" /> : <ArrowUpRight size={16} className="text-red-400" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{tx.label}</p>
                <p className="text-xs text-white/40">{tx.time}</p>
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
