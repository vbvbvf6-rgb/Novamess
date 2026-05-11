import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Gift, Crown, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";

interface TopSender {
  senderId: number;
  username: string;
  displayName: string | null;
  avatarColor: string | null;
  hasPrime: boolean | string | number;
  primeTier: string | null;
  giftCount: number;
  totalStars: number;
  totalValue: number;
  lastGiftAt: string;
}

function isPrimeActive(sender: TopSender) {
  return sender.hasPrime === true || sender.hasPrime === "t" || sender.hasPrime === 1;
}

const MEDAL = ["🥇", "🥈", "🥉"];
const MEDAL_GLOW = [
  "shadow-[0_0_16px_rgba(250,204,21,0.5)]",
  "shadow-[0_0_12px_rgba(148,163,184,0.4)]",
  "shadow-[0_0_12px_rgba(180,83,9,0.35)]",
];
const MEDAL_BORDER = [
  "border-yellow-500/40",
  "border-slate-400/30",
  "border-amber-700/30",
];
const MEDAL_BG = [
  "bg-yellow-500/10",
  "bg-slate-400/8",
  "bg-amber-700/8",
];

function SenderAvatar({ sender, rank }: { sender: TopSender; rank: number }) {
  const hasPrime = isPrimeActive(sender);
  const isPlus = sender.primeTier === "prime_plus";
  const initial = (sender.displayName || sender.username || "?")[0].toUpperCase();
  const size = rank === 0 ? "w-14 h-14 text-xl" : rank === 1 ? "w-12 h-12 text-lg" : "w-11 h-11 text-base";

  return (
    <div className="relative shrink-0">
      {hasPrime && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: isPlus ? 3 : 4, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-[2px] rounded-full z-0"
          style={{
            background: isPlus
              ? "conic-gradient(from 0deg, #a855f7, #d946ef, #7c3aed, #a855f7)"
              : "conic-gradient(from 0deg, #facc15, #fb923c, #f97316, #facc15)",
            borderRadius: "50%",
          }}
        />
      )}
      <div
        className={`relative z-10 ${size} rounded-full flex items-center justify-center font-black text-white border-2 border-card`}
        style={{ backgroundColor: sender.avatarColor || "#6366f1" }}
      >
        {initial}
      </div>
      {rank < 3 && (
        <div className="absolute -bottom-1 -right-1 z-20 text-sm leading-none">{MEDAL[rank]}</div>
      )}
    </div>
  );
}

export function GiftLeaderboard({ userId }: { userId: number }) {
  const [senders, setSenders] = useState<TopSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const token = sessionStorage.getItem("pulse-token");
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`/api/gifts/top-senders/${userId}`, { headers })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSenders(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="rounded-3xl bg-card border border-border p-4 space-y-3">
        <div className="h-4 w-36 bg-secondary rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-secondary animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-28 bg-secondary rounded animate-pulse" />
              <div className="h-2.5 w-16 bg-secondary rounded animate-pulse" />
            </div>
            <div className="h-3 w-12 bg-secondary rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (senders.length === 0) return null;

  const visible = expanded ? senders : senders.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-3xl bg-card border border-border overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-2 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
          <Trophy size={14} className="text-amber-400" />
        </div>
        <span className="text-sm font-black text-foreground">Рейтинг подарков</span>
        <span className="ml-auto text-[11px] font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
          {senders.length} отправителей
        </span>
      </div>

      {/* Top-3 podium */}
      {senders.length >= 2 && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-end justify-center gap-2">
            {/* Silver – rank 2 */}
            {senders[1] && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex-1 flex flex-col items-center gap-1.5"
              >
                <SenderAvatar sender={senders[1]} rank={1} />
                <div className="text-center">
                  <Link href={`/user/${senders[1].senderId}`}>
                    <p className="text-xs font-bold text-foreground hover:underline truncate max-w-[72px]">
                      {senders[1].displayName || senders[1].username}
                    </p>
                  </Link>
                  <p className="text-[10px] text-muted-foreground">{senders[1].giftCount} подарков</p>
                </div>
                <div className="w-full h-12 rounded-t-xl bg-slate-400/10 border border-slate-400/20 flex items-center justify-center">
                  <span className="text-xs font-black text-slate-400">2</span>
                </div>
              </motion.div>
            )}
            {/* Gold – rank 1 */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex-1 flex flex-col items-center gap-1.5"
            >
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <SenderAvatar sender={senders[0]} rank={0} />
              </motion.div>
              <div className="text-center">
                <Link href={`/user/${senders[0].senderId}`}>
                  <p className="text-xs font-bold text-foreground hover:underline truncate max-w-[80px]">
                    {senders[0].displayName || senders[0].username}
                  </p>
                </Link>
                <p className="text-[10px] text-yellow-400 font-semibold">{senders[0].giftCount} подарков</p>
              </div>
              <div className="w-full h-16 rounded-t-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                <span className="text-sm font-black text-yellow-400">1</span>
              </div>
            </motion.div>
            {/* Bronze – rank 3 */}
            {senders[2] && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex-1 flex flex-col items-center gap-1.5"
              >
                <SenderAvatar sender={senders[2]} rank={2} />
                <div className="text-center">
                  <Link href={`/user/${senders[2].senderId}`}>
                    <p className="text-xs font-bold text-foreground hover:underline truncate max-w-[72px]">
                      {senders[2].displayName || senders[2].username}
                    </p>
                  </Link>
                  <p className="text-[10px] text-muted-foreground">{senders[2].giftCount} подарков</p>
                </div>
                <div className="w-full h-8 rounded-t-xl bg-amber-700/10 border border-amber-700/20 flex items-center justify-center">
                  <span className="text-xs font-black text-amber-600">3</span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Full list (rank 4+, or all if only 1 sender) */}
      <div className="px-4 pb-2 space-y-1 mt-1">
        <AnimatePresence initial={false}>
          {visible.slice(senders.length >= 2 ? 3 : 0).map((sender, idx) => {
            const rank = (senders.length >= 2 ? 3 : 0) + idx;
            const hasPrime = isPrimeActive(sender);
            const isPlus = sender.primeTier === "prime_plus";
            return (
              <motion.div
                key={sender.senderId}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Link href={`/user/${sender.senderId}`}>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-secondary/50 transition-colors cursor-pointer">
                    <span className="text-sm font-black text-muted-foreground w-5 text-center shrink-0">
                      {rank + 1}
                    </span>
                    <div className="relative shrink-0">
                      {hasPrime && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: isPlus ? 3 : 4, repeat: Infinity, ease: "linear" }}
                          className="absolute -inset-[2px] rounded-full"
                          style={{
                            background: isPlus
                              ? "conic-gradient(from 0deg, #a855f7, #d946ef, #7c3aed, #a855f7)"
                              : "conic-gradient(from 0deg, #facc15, #fb923c, #f97316, #facc15)",
                            borderRadius: "50%",
                          }}
                        />
                      )}
                      <div
                        className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm border-2 border-card"
                        style={{ backgroundColor: sender.avatarColor || "#6366f1" }}
                      >
                        {(sender.displayName || sender.username || "?")[0].toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {sender.displayName || sender.username}
                        </span>
                        {hasPrime && (
                          isPlus
                            ? <Sparkles size={11} className="text-purple-400 shrink-0" />
                            : <Crown size={11} className="text-yellow-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">@{sender.username}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        <Gift size={11} className="text-pink-400" />
                        <span className="text-sm font-black text-foreground">{sender.giftCount}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{sender.totalValue} ⚡</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Expand toggle */}
      {senders.length > 5 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-center gap-1.5 py-3 border-t border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded
            ? <><ChevronUp size={13} /> Скрыть</>
            : <><ChevronDown size={13} /> Ещё {senders.length - 5} отправителей</>
          }
        </button>
      )}

      {/* Footer note */}
      <div className="px-5 py-2.5 border-t border-border bg-secondary/20 flex items-center gap-1.5">
        <Gift size={11} className="text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">
          Анонимные подарки не учитываются в рейтинге
        </span>
      </div>
    </motion.div>
  );
}
