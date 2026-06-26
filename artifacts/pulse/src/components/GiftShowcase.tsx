import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface GiftItem {
  id: number;
  name: string;
  emoji: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  price: number;
  stars: number;
  timesGiven: number;
}

const RARITY_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  common:    { label: "Обычный",    bg: "bg-slate-500/10",  text: "text-slate-400",  border: "border-slate-500/20" },
  rare:      { label: "Редкий",     bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/20" },
  epic:      { label: "Эпический",  bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  legendary: { label: "Легендарный",bg: "bg-amber-500/10",  text: "text-amber-400",  border: "border-amber-500/20" },
};

export function GiftShowcase({ userId: _userId }: { userId: number }) {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "rare" | "epic" | "legendary">("all");

  useEffect(() => {
    const token = sessionStorage.getItem("pulse-token");
    fetch("/api/gifts", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then(data => { if (Array.isArray(data)) setGifts(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all"
    ? gifts
    : gifts.filter(g => g.rarity === filter);

  const tabs: { key: typeof filter; label: string }[] = [
    { key: "all",       label: "Все" },
    { key: "rare",      label: "Редкие" },
    { key: "epic",      label: "Эпические" },
    { key: "legendary", label: "Легендарные" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-card border border-border overflow-hidden"
    >
      <div className="px-5 pt-4 pb-3 flex items-center gap-2 border-b border-border">
        <Sparkles size={13} className="text-amber-400" />
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Витрина подарков</h3>
      </div>

      {/* Rarity filter tabs */}
      <div className="px-4 pt-3 flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              filter === tab.key
                ? "bg-primary/10 border-primary/30 text-primary"
                : "border-border text-muted-foreground hover:border-primary/20"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <span className="text-3xl">🎁</span>
          <p className="text-sm">Нет подарков этой редкости</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 p-4">
          {filtered.map((gift, i) => {
            const style = RARITY_STYLES[gift.rarity] || RARITY_STYLES.common;
            return (
              <motion.div
                key={gift.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border ${style.bg} ${style.border}`}
              >
                <span className="text-3xl">{gift.emoji}</span>
                <p className="text-[11px] font-bold text-foreground text-center leading-tight truncate w-full text-center">{gift.name}</p>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                  {style.label}
                </span>
                <p className="text-[10px] text-muted-foreground font-semibold">{gift.price} ✨</p>
                {gift.timesGiven > 0 && (
                  <p className="text-[9px] text-muted-foreground/60">{gift.timesGiven}× подарено</p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
