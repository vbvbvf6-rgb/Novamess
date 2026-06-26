import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Sparkles, BadgeCheck } from "lucide-react";

interface LeaderboardEntry {
  userId: number;
  username: string;
  displayName: string;
  avatarColor: string;
  avatarUrl?: string;
  hasPrime: boolean;
  primeTier?: string;
  isVerified: boolean;
  giftCount: number;
  totalStars: number;
  totalValue: number;
}

const MEDAL = ["🥇", "🥈", "🥉"];
const RARITY_COLORS = ["text-yellow-400", "text-slate-400", "text-amber-600"];

export function GiftLeaderboard({ userId: _userId }: { userId: number }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("pulse-token");
    fetch("/api/gifts/leaderboard?limit=10", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then(data => {
        if (Array.isArray(data)) setEntries(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-3xl bg-card border border-border overflow-hidden"
    >
      <div className="px-5 pt-4 pb-3 flex items-center gap-2 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
          <Trophy size={14} className="text-amber-400" />
        </div>
        <span className="text-sm font-black text-foreground">Рейтинг подарков</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 px-4 text-muted-foreground">
          <span className="text-3xl">🏆</span>
          <p className="text-sm font-semibold text-foreground/70">Пока нет данных</p>
          <p className="text-xs text-center opacity-60">Отправьте первый подарок, чтобы попасть в рейтинг</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {entries.map((entry, idx) => (
            <div key={entry.userId} className={`flex items-center gap-3 px-4 py-3 ${idx === 0 ? "bg-amber-500/5" : ""}`}>
              <span className="text-lg w-6 text-center shrink-0">
                {idx < 3 ? MEDAL[idx] : <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>}
              </span>
              <div
                className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-sm overflow-hidden relative"
                style={{ backgroundColor: entry.avatarColor || "#6366f1" }}
              >
                <span className="absolute inset-0 flex items-center justify-center">{entry.displayName?.[0]?.toUpperCase() || "?"}</span>
                {entry.avatarUrl && <img src={entry.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold truncate">{entry.displayName || entry.username}</span>
                  {entry.isVerified && <BadgeCheck size={12} className="text-primary shrink-0" />}
                  {entry.hasPrime && entry.primeTier === "prime_plus"
                    ? <Sparkles size={11} className="text-purple-400 shrink-0" />
                    : entry.hasPrime
                    ? <Crown size={11} className="text-yellow-400 shrink-0" />
                    : null}
                </div>
                <p className="text-[11px] text-muted-foreground">@{entry.username}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-black ${idx < 3 ? RARITY_COLORS[idx] : "text-foreground"}`}>
                  {entry.totalValue.toLocaleString()} 💎
                </p>
                <p className="text-[10px] text-muted-foreground">{entry.giftCount} подарков</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
