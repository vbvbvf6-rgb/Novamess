import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, MapPin, Users, Clock, Star, Flame, Zap,
  Trophy, CheckCircle2, Gift, Target, Swords,
  MessageCircle, Phone, Heart, Send, Crown, ChevronRight,
  TrendingUp, Lock, Sparkles, Medal, UserPlus, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { maybeResetQuests } from "@/utils/questTracker";

/* ─── Types ─────────────────────────────────────────────────────────── */
type Tab = "quests" | "events" | "leaderboard";

interface Quest {
  id: string;
  type: "daily" | "weekly" | "special";
  icon: React.ReactNode;
  title: string;
  desc: string;
  reward: number;
  rewardIcon: string;
  progress: number;
  total: number;
  completed: boolean;
  color: string;
}

interface ApiEvent {
  id: number;
  title: string;
  description: string;
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
  createdAt?: string;
}

interface LeaderEntry {
  rank: number;
  name: string;
  avatar: string;
  score: number;
  delta: number;
  isMe?: boolean;
}

/* ─── Static leaderboard (demo) ──────────────────────────────────────── */
const LEADERBOARD: LeaderEntry[] = [
  { rank: 1, name: "Артём К.",   avatar: "🦁", score: 4820, delta: +120 },
  { rank: 2, name: "Мария С.",   avatar: "🦊", score: 4310, delta: +85  },
  { rank: 3, name: "Дмитрий В.", avatar: "🐺", score: 3975, delta: -40  },
  { rank: 4, name: "Ты",         avatar: "⭐", score: 2640, delta: +210, isMe: true },
  { rank: 5, name: "Алина П.",   avatar: "🐱", score: 2580, delta: +55  },
  { rank: 6, name: "Никита Р.",  avatar: "🦅", score: 2190, delta: -15  },
  { rank: 7, name: "Ксения М.",  avatar: "🦋", score: 1870, delta: +30  },
];

/* ─── Storage helpers ────────────────────────────────────────────────── */
function loadCompleted(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem("pulse-quests-done") || "[]")); }
  catch { return new Set(); }
}
function saveCompleted(s: Set<string>) {
  localStorage.setItem("pulse-quests-done", JSON.stringify([...s]));
}
function loadProgress(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem("pulse-quests-progress") || "{}"); }
  catch { return {}; }
}
function loadJoined(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem("pulse-events-joined") || "[]")); }
  catch { return new Set(); }
}
function saveJoined(s: Set<number>) {
  localStorage.setItem("pulse-events-joined", JSON.stringify([...s]));
}

/* ─── Event color helpers ────────────────────────────────────────────── */
const EVENT_COLORS = [
  "from-violet-500 to-indigo-600",
  "from-orange-500 to-rose-600",
  "from-sky-500 to-blue-600",
  "from-green-500 to-emerald-600",
  "from-pink-500 to-fuchsia-600",
  "from-amber-500 to-yellow-600",
];
const EVENT_EMOJIS = ["🎉", "💻", "🎙️", "🎮", "🔒", "🌟", "🚀", "🎯"];
function eventColor(id: number) { return EVENT_COLORS[id % EVENT_COLORS.length]; }
function eventEmoji(id: number) { return EVENT_EMOJIS[id % EVENT_EMOJIS.length]; }

function formatEventDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    });
  } catch { return dateStr; }
}

/* ─── Component ─────────────────────────────────────────────────────── */
export default function Events() {
  const [tab, setTab] = useState<Tab>("quests");
  const [completed, setCompleted] = useState<Set<string>>(loadCompleted);
  const [progress, setProgress] = useState<Record<string, number>>(loadProgress);
  const [joined, setJoined] = useState<Set<number>>(loadJoined);
  const [sparks, setSparks] = useState<number>(() => Number(localStorage.getItem("pulse-sparks") || "0"));
  const [claimAnim, setClaimAnim] = useState<string | null>(null);
  const [questFilter, setQuestFilter] = useState<"all" | "daily" | "weekly" | "special">("all");
  const [apiEvents, setApiEvents] = useState<ApiEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  /* On mount: reset expired daily/weekly quests */
  useEffect(() => {
    maybeResetQuests();
    setCompleted(loadCompleted());
    setProgress(loadProgress());
  }, []);

  /* Listen for quest progress updates triggered by real actions */
  useEffect(() => {
    const handler = () => {
      setProgress(loadProgress());
      setCompleted(loadCompleted());
    };
    window.addEventListener("pulse:quest-progress", handler);
    return () => window.removeEventListener("pulse:quest-progress", handler);
  }, []);

  /* Fetch real platform events from API */
  useEffect(() => {
    const token = sessionStorage.getItem("pulse-token");
    if (!token) return;
    setEventsLoading(true);
    fetch("/api/platform-events", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: ApiEvent[]) => setApiEvents(Array.isArray(data) ? data : []))
      .catch(() => setApiEvents([]))
      .finally(() => setEventsLoading(false));
  }, []);

  /* Build quest list with persisted progress */
  const QUESTS: Quest[] = [
    {
      id: "q1", type: "daily",
      icon: <MessageCircle size={18} />,
      title: "Отправь 5 сообщений",
      desc: "Напиши что-нибудь в любом чате",
      reward: 50, rewardIcon: "⚡",
      progress: progress["q1"] ?? 0, total: 5,
      completed: completed.has("q1"),
      color: "from-sky-500 to-blue-600",
    },
    {
      id: "q2", type: "daily",
      icon: <Phone size={18} />,
      title: "Совершить звонок",
      desc: "Позвони любому контакту",
      reward: 75, rewardIcon: "⚡",
      progress: progress["q2"] ?? 0, total: 1,
      completed: completed.has("q2"),
      color: "from-green-500 to-emerald-600",
    },
    {
      id: "q3", type: "daily",
      icon: <Heart size={18} />,
      title: "Поставь 3 реакции",
      desc: "Отреагируй на сообщения друзей",
      reward: 40, rewardIcon: "⚡",
      progress: progress["q3"] ?? 0, total: 3,
      completed: completed.has("q3"),
      color: "from-rose-500 to-pink-600",
    },
    {
      id: "q4", type: "daily",
      icon: <Send size={18} />,
      title: "Отправить подарок",
      desc: "Порадуй кого-нибудь из контактов",
      reward: 60, rewardIcon: "⚡",
      progress: progress["q4"] ?? 0, total: 1,
      completed: completed.has("q4"),
      color: "from-amber-500 to-orange-600",
    },
    {
      id: "q5", type: "weekly",
      icon: <UserPlus size={18} />,
      title: "Добавить 3 контакта",
      desc: "Расширь свою сеть за неделю",
      reward: 200, rewardIcon: "⚡",
      progress: progress["q5"] ?? 0, total: 3,
      completed: completed.has("q5"),
      color: "from-violet-500 to-indigo-600",
    },
    {
      id: "q6", type: "weekly",
      icon: <Phone size={18} />,
      title: "5 звонков за неделю",
      desc: "Общайся голосом с разными людьми",
      reward: 300, rewardIcon: "⚡",
      progress: progress["q6"] ?? 0, total: 5,
      completed: completed.has("q6"),
      color: "from-teal-500 to-cyan-600",
    },
    {
      id: "q7", type: "weekly",
      icon: <Trophy size={18} />,
      title: "Войти 7 дней подряд",
      desc: "Не прерывай серию заходов",
      reward: 500, rewardIcon: "⚡",
      progress: progress["q7"] ?? 0, total: 7,
      completed: completed.has("q7"),
      color: "from-yellow-500 to-amber-600",
    },
    {
      id: "q8", type: "special",
      icon: <Swords size={18} />,
      title: "Принять участие в событии",
      desc: "Зарегистрируйся на любое событие",
      reward: 400, rewardIcon: "⚡",
      progress: joined.size > 0 ? 1 : 0, total: 1,
      completed: completed.has("q8") || joined.size > 0,
      color: "from-fuchsia-500 to-purple-600",
    },
    {
      id: "q9", type: "special",
      icon: <Crown size={18} />,
      title: "Топ-10 таблицы лидеров",
      desc: "Попади в десятку лучших игроков",
      reward: 1000, rewardIcon: "⚡",
      progress: progress["q9"] ?? 0, total: 1,
      completed: completed.has("q9"),
      color: "from-orange-400 to-red-600",
    },
  ];

  const visibleQuests = questFilter === "all" ? QUESTS : QUESTS.filter(q => q.type === questFilter);
  const doneCount = QUESTS.filter(q => q.completed).length;

  function claimReward(quest: Quest) {
    if (quest.completed || quest.progress < quest.total) return;
    const next = new Set(completed);
    next.add(quest.id);
    setCompleted(next);
    saveCompleted(next);
    const newSparks = sparks + quest.reward;
    setSparks(newSparks);
    localStorage.setItem("pulse-sparks", String(newSparks));
    setClaimAnim(quest.id);
    setTimeout(() => setClaimAnim(null), 1200);
  }

  function toggleJoin(id: number) {
    setJoined(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveJoined(next);
      return next;
    });
  }

  const streakDays = 3;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex-1 overflow-y-auto scrollbar-none pb-8">

        {/* ── Header ── */}
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border px-4 pt-3 pb-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
                <CalendarDays size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black text-foreground leading-tight">События</h1>
                <p className="text-xs text-muted-foreground">{doneCount}/{QUESTS.length} заданий выполнено</p>
              </div>
            </div>
            {/* Spark balance */}
            <motion.div
              key={sparks}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.35 }}
              className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full"
            >
              <Zap size={13} className="text-amber-400 fill-amber-400" />
              <span className="text-sm font-black text-amber-400">{sparks.toLocaleString()}</span>
            </motion.div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 -mx-1 px-1">
            {([
              { id: "quests",      label: "Задания",  icon: <Target size={13}/> },
              { id: "events",      label: "События",  icon: <CalendarDays size={13}/> },
              { id: "leaderboard", label: "Топ",      icon: <Trophy size={13}/> },
            ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold transition-all border-b-2",
                  tab === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4">
          <AnimatePresence mode="wait">

            {/* ══════════ QUESTS TAB ══════════ */}
            {tab === "quests" && (
              <motion.div key="quests" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">

                {/* Streak banner */}
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-orange-500/20 via-amber-500/10 to-yellow-500/5 border border-orange-500/20 p-4">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-5xl opacity-10 select-none">🔥</div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                      <Flame size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-foreground">{streakDays}-дневная серия 🔥</p>
                      <p className="text-xs text-muted-foreground">Войди завтра, чтобы не потерять серию</p>
                    </div>
                    <div className="ml-auto flex gap-1">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className={cn(
                          "w-3 h-3 rounded-full transition-all",
                          i < streakDays ? "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.6)]" : "bg-secondary"
                        )} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quest filter pills */}
                <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-0.5">
                  {([
                    { id: "all",     label: "Все" },
                    { id: "daily",   label: "Ежедневные" },
                    { id: "weekly",  label: "Еженедельные" },
                    { id: "special", label: "Особые" },
                  ] as { id: typeof questFilter; label: string }[]).map(f => (
                    <button
                      key={f.id}
                      onClick={() => setQuestFilter(f.id)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all",
                        questFilter === f.id
                          ? "bg-primary text-white shadow-[0_2px_10px_rgba(139,92,246,0.35)]"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Overall progress bar */}
                <div className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-primary" />
                      <span className="text-xs font-bold text-foreground">Общий прогресс</span>
                    </div>
                    <span className="text-xs font-black text-primary">{Math.round((doneCount / QUESTS.length) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-violet-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(doneCount / QUESTS.length) * 100}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>{doneCount} выполнено</span>
                    <span>{QUESTS.length - doneCount} осталось</span>
                  </div>
                </div>

                {/* How it works hint */}
                <div className="flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-xl px-3 py-2.5">
                  <Info size={13} className="text-primary mt-0.5 shrink-0" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Прогресс обновляется автоматически, когда ты выполняешь действия в приложении.
                    Ежедневные задания сбрасываются в полночь.
                  </p>
                </div>

                {/* Quest cards */}
                <div className="space-y-2.5">
                  {visibleQuests.map((quest, i) => {
                    const pct = Math.min((quest.progress / quest.total) * 100, 100);
                    const canClaim = quest.progress >= quest.total && !quest.completed;
                    const isClaiming = claimAnim === quest.id;

                    return (
                      <motion.div
                        key={quest.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={cn(
                          "relative rounded-2xl border overflow-hidden transition-all",
                          quest.completed
                            ? "bg-secondary/40 border-border/40 opacity-70"
                            : "bg-card border-border hover:border-border/70"
                        )}
                      >
                        {/* Type badge */}
                        <div className={cn(
                          "absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide",
                          quest.type === "daily"   ? "bg-sky-500/15 text-sky-400" :
                          quest.type === "weekly"  ? "bg-violet-500/15 text-violet-400" :
                                                     "bg-amber-500/15 text-amber-400"
                        )}>
                          {quest.type === "daily" ? "день" : quest.type === "weekly" ? "неделя" : "особое"}
                        </div>

                        <div className="p-4">
                          <div className="flex items-center gap-3">
                            {/* Icon */}
                            <div className={cn(
                              "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shrink-0 shadow-sm",
                              quest.color
                            )}>
                              {quest.completed
                                ? <CheckCircle2 size={18} />
                                : quest.icon}
                            </div>

                            <div className="flex-1 min-w-0 pr-12">
                              <p className={cn("text-sm font-bold leading-tight", quest.completed && "line-through opacity-60")}>
                                {quest.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">{quest.desc}</p>

                              {/* Progress bar */}
                              {!quest.completed && (
                                <div className="mt-2.5">
                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                                    <span>{quest.progress}/{quest.total}</span>
                                    <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                                      <Zap size={9} className="fill-amber-400" />+{quest.reward}
                                    </span>
                                  </div>
                                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                    <motion.div
                                      className={cn("h-full rounded-full bg-gradient-to-r", quest.color)}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pct}%` }}
                                      transition={{ duration: 0.5, ease: "easeOut" }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Claim button — only shown when progress is complete */}
                          {!quest.completed && canClaim && (
                            <div className="flex items-center gap-2 mt-3">
                              <motion.button
                                whileTap={{ scale: 0.92 }}
                                onClick={() => claimReward(quest)}
                                className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black shadow-[0_2px_12px_rgba(245,158,11,0.4)] hover:shadow-[0_4px_16px_rgba(245,158,11,0.5)] transition-all"
                              >
                                {isClaiming ? "✓ Получено!" : `🎁 Забрать награду ${quest.rewardIcon}${quest.reward}`}
                              </motion.button>
                            </div>
                          )}

                          {quest.completed && (
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-500 font-semibold">
                              <CheckCircle2 size={12} />
                              <span>Выполнено · +{quest.reward} ⚡ получено</span>
                            </div>
                          )}
                        </div>

                        {/* Claim animation overlay */}
                        <AnimatePresence>
                          {isClaiming && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 1.3 }}
                              className="absolute inset-0 flex items-center justify-center bg-amber-500/20 backdrop-blur-sm rounded-2xl"
                            >
                              <div className="flex flex-col items-center gap-1">
                                <motion.div
                                  initial={{ y: 0 }}
                                  animate={{ y: -12 }}
                                  transition={{ duration: 0.5 }}
                                  className="text-3xl"
                                >⚡</motion.div>
                                <span className="text-white font-black text-lg">+{quest.reward}</span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Locked future quests teaser */}
                <div className="rounded-2xl border border-dashed border-border p-4 flex items-center gap-3 opacity-50">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    <Lock size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-muted-foreground">Новые задания скоро</p>
                    <p className="text-xs text-muted-foreground">Обновление каждый понедельник</p>
                  </div>
                  <Sparkles size={14} className="ml-auto text-muted-foreground" />
                </div>
              </motion.div>
            )}

            {/* ══════════ EVENTS TAB ══════════ */}
            {tab === "events" && (
              <motion.div key="events" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">

                {eventsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-card border border-border rounded-2xl p-4 animate-pulse">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-xl bg-secondary shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-secondary rounded w-3/4" />
                            <div className="h-3 bg-secondary rounded w-1/2" />
                            <div className="h-3 bg-secondary rounded w-full" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : apiEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
                      <CalendarDays size={28} className="text-violet-400" />
                    </div>
                    <p className="text-base font-black text-foreground mb-1">Событий пока нет</p>
                    <p className="text-sm text-muted-foreground max-w-[220px] leading-relaxed">
                      Здесь появятся мероприятия, хакатоны и встречи сообщества.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Featured events (horizontal scroll if multiple) */}
                    {apiEvents.length > 1 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Flame size={13} className="text-orange-500" />
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Активные события</span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
                          {apiEvents.slice(0, 3).map(event => (
                            <motion.div
                              key={event.id}
                              whileTap={{ scale: 0.97 }}
                              className={cn("min-w-[260px] rounded-2xl bg-gradient-to-br p-4 text-white cursor-pointer shrink-0 relative overflow-hidden", eventColor(event.id))}
                            >
                              <div className="absolute top-3 right-3 text-2xl opacity-60">{eventEmoji(event.id)}</div>
                              <p className="font-black text-base leading-tight mb-2 pr-8">{event.title}</p>
                              {event.startsAt && (
                                <div className="flex items-center gap-1.5 text-xs opacity-80 mb-3">
                                  <Clock size={11} />{formatEventDate(event.startsAt)}
                                </div>
                              )}
                              <button
                                onClick={() => toggleJoin(event.id)}
                                className="mt-1 w-full py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors border border-white/20"
                              >
                                {joined.has(event.id) ? "✓ Вы участвуете" : "Участвовать"}
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* All events list */}
                    <div className="space-y-2.5">
                      {apiEvents.map((event, i) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-card border border-border rounded-2xl overflow-hidden"
                        >
                          <div className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-xl shrink-0", eventColor(event.id))}>
                                {eventEmoji(event.id)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-foreground leading-tight">{event.title}</p>
                                {event.description && (
                                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{event.description}</p>
                                )}
                              </div>
                            </div>

                            {(event.startsAt || event.endsAt) && (
                              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                                {event.startsAt && (
                                  <span className="flex items-center gap-1.5">
                                    <Clock size={12} className="text-primary/70" />
                                    Начало: {formatEventDate(event.startsAt)}
                                  </span>
                                )}
                                {event.endsAt && (
                                  <span className="flex items-center gap-1.5">
                                    <Clock size={12} className="text-rose-400/70" />
                                    Конец: {formatEventDate(event.endsAt)}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-2 mt-3">
                              <button
                                onClick={() => toggleJoin(event.id)}
                                className={cn(
                                  "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                                  joined.has(event.id)
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "bg-primary text-primary-foreground hover:opacity-90 shadow-[0_2px_10px_rgba(139,92,246,0.25)]"
                                )}
                              >
                                {joined.has(event.id) ? "✓ Участвую" : "Участвовать"}
                              </button>
                              <div className="px-3 py-2 rounded-xl border border-border text-[10px] font-bold text-amber-400 flex items-center gap-1">
                                <Zap size={10} className="fill-amber-400" />+100 ⚡
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* ══════════ LEADERBOARD TAB ══════════ */}
            {tab === "leaderboard" && (
              <motion.div key="lb" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">

                {/* Podium top-3 */}
                <div className="relative bg-gradient-to-b from-violet-500/10 to-transparent border border-violet-500/15 rounded-2xl p-4 pb-6">
                  <div className="text-center mb-4">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Таблица лидеров</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Обновляется каждые 24 ч</p>
                  </div>
                  <div className="flex items-end justify-center gap-3">
                    {/* 2nd */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="text-2xl">{LEADERBOARD[1].avatar}</div>
                      <div className="w-14 h-14 rounded-2xl bg-secondary/80 flex flex-col items-center justify-center border border-border">
                        <Medal size={16} className="text-slate-400 mb-0.5" />
                        <span className="text-[10px] font-black text-slate-400">2</span>
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground text-center leading-tight max-w-[52px] truncate">{LEADERBOARD[1].name}</p>
                      <span className="text-[10px] text-muted-foreground">{LEADERBOARD[1].score.toLocaleString()}</span>
                    </div>
                    {/* 1st */}
                    <div className="flex flex-col items-center gap-1.5 -mt-4">
                      <div className="text-3xl">{LEADERBOARD[0].avatar}</div>
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex flex-col items-center justify-center shadow-[0_4px_20px_rgba(245,158,11,0.4)]">
                        <Crown size={18} className="text-white mb-0.5" />
                        <span className="text-xs font-black text-white">1</span>
                      </div>
                      <p className="text-[10px] font-bold text-foreground text-center leading-tight max-w-[60px] truncate">{LEADERBOARD[0].name}</p>
                      <span className="text-[10px] text-amber-400 font-bold">{LEADERBOARD[0].score.toLocaleString()}</span>
                    </div>
                    {/* 3rd */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="text-2xl">{LEADERBOARD[2].avatar}</div>
                      <div className="w-14 h-14 rounded-2xl bg-secondary/80 flex flex-col items-center justify-center border border-border">
                        <Medal size={16} className="text-amber-700 mb-0.5" />
                        <span className="text-[10px] font-black text-amber-700">3</span>
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground text-center leading-tight max-w-[52px] truncate">{LEADERBOARD[2].name}</p>
                      <span className="text-[10px] text-muted-foreground">{LEADERBOARD[2].score.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Full list */}
                <div className="space-y-1.5">
                  {LEADERBOARD.map((entry, i) => (
                    <motion.div
                      key={entry.rank}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all",
                        entry.isMe
                          ? "bg-primary/8 border-primary/30 shadow-[0_0_20px_rgba(139,92,246,0.08)]"
                          : "bg-card border-border"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0",
                        entry.rank === 1 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" :
                        entry.rank === 2 ? "bg-slate-400/20 text-slate-400" :
                        entry.rank === 3 ? "bg-amber-700/20 text-amber-700" :
                        "bg-secondary text-muted-foreground"
                      )}>
                        {entry.rank}
                      </div>
                      <div className="text-xl shrink-0">{entry.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-bold truncate", entry.isMe && "text-primary")}>
                          {entry.name} {entry.isMe && <span className="text-[10px] font-normal opacity-60">(ты)</span>}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Zap size={9} className="text-amber-400 fill-amber-400" />
                          <span className="text-[11px] font-bold text-amber-400">{entry.score.toLocaleString()}</span>
                        </div>
                      </div>
                      <span className={cn(
                        "text-xs font-bold",
                        entry.delta > 0 ? "text-emerald-500" : entry.delta < 0 ? "text-red-400" : "text-muted-foreground"
                      )}>
                        {entry.delta > 0 ? `+${entry.delta}` : entry.delta === 0 ? "—" : entry.delta}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* My rank card */}
                <div className="bg-card border border-border rounded-2xl p-4">
                  <p className="text-xs text-muted-foreground mb-2 font-semibold">Твой прогресс на этой неделе</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">До 3-го места</span>
                        <span className="font-bold text-foreground">{(LEADERBOARD[2].score - 2640).toLocaleString()} ⚡</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-primary to-violet-400 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(2640 / LEADERBOARD[2].score) * 100}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      <p className="font-black text-foreground text-base">#{4}</p>
                      <p>место</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
