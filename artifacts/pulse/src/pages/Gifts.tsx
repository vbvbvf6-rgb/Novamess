import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Diamond, Send, Star } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

interface GiftItem {
  id: number;
  name: string;
  emoji: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  price: number;
  bgFrom: string;
  bgTo: string;
  glow: string;
  description: string;
}

const GIFTS: GiftItem[] = [
  { id: 1,  name: "Розовое сердце", emoji: "💝", rarity: "common",    price: 50,   bgFrom: "#ff8fab", bgTo: "#ff4d77", glow: "rgba(255,77,119,0.3)",   description: "Символ нежности" },
  { id: 2,  name: "Мишка",          emoji: "🧸", rarity: "rare",      price: 150,  bgFrom: "#c8a97e", bgTo: "#8d6548", glow: "rgba(141,101,72,0.35)",  description: "Уютный подарок" },
  { id: 3,  name: "Подарок",        emoji: "🎁", rarity: "common",    price: 75,   bgFrom: "#6dd5ed", bgTo: "#2193b0", glow: "rgba(33,147,176,0.3)",   description: "Приятный сюрприз" },
  { id: 4,  name: "Роза",           emoji: "🌹", rarity: "rare",      price: 200,  bgFrom: "#ff6b6b", bgTo: "#c0392b", glow: "rgba(192,57,43,0.35)",   description: "Классика любви" },
  { id: 5,  name: "Торт",           emoji: "🎂", rarity: "rare",      price: 180,  bgFrom: "#f7971e", bgTo: "#ffd200", glow: "rgba(255,210,0,0.35)",   description: "Сладкое торжество" },
  { id: 6,  name: "Кольцо",         emoji: "💍", rarity: "epic",      price: 500,  bgFrom: "#c0c0c0", bgTo: "#7f7f7f", glow: "rgba(192,192,192,0.4)",  description: "Знак вечности" },
  { id: 7,  name: "Кубок",          emoji: "🏆", rarity: "epic",      price: 450,  bgFrom: "#f7971e", bgTo: "#e8a822", glow: "rgba(248,199,50,0.45)",  description: "Ты победитель" },
  { id: 8,  name: "Ракета",         emoji: "🚀", rarity: "legendary", price: 1000, bgFrom: "#4776e6", bgTo: "#8e54e9", glow: "rgba(142,84,233,0.5)",   description: "К звёздам и обратно" },
  { id: 9,  name: "Звёзды",         emoji: "💫", rarity: "rare",      price: 250,  bgFrom: "#f7971e", bgTo: "#ffd200", glow: "rgba(255,210,0,0.4)",    description: "Блеск и сияние" },
  { id: 10, name: "Бант",           emoji: "🎀", rarity: "common",    price: 100,  bgFrom: "#fc5c7d", bgTo: "#6a3093", glow: "rgba(106,48,147,0.35)",  description: "С лентой и теплом" },
];

const RARITY_LABEL: Record<string, string> = {
  common: "Обычный",
  rare: "Редкий",
  epic: "Эпический",
  legendary: "Легендарный",
};

const RARITY_COLOR: Record<string, string> = {
  common:    "text-slate-400 border-slate-400/30 bg-slate-400/10",
  rare:      "text-blue-400 border-blue-400/30 bg-blue-400/10",
  epic:      "text-purple-400 border-purple-400/30 bg-purple-400/10",
  legendary: "text-amber-400 border-amber-400/30 bg-amber-400/10",
};

export default function Gifts() {
  const { currentUserId } = useAppContext();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "common" | "rare" | "epic" | "legendary">("all");
  const [selected, setSelected] = useState<GiftItem | null>(null);
  const [sending, setSending] = useState(false);

  const filtered = filter === "all" ? GIFTS : GIFTS.filter(g => g.rarity === filter);

  const handleSend = async (gift: GiftItem) => {
    setSending(true);
    // Simulate send
    await new Promise(r => setTimeout(r, 800));
    setSending(false);
    setSelected(null);
    toast({
      title: `${gift.emoji} Подарок отправлен!`,
      description: `«${gift.name}» успешно подарен`,
    });
  };

  const tabs: { key: typeof filter; label: string }[] = [
    { key: "all",       label: "Все" },
    { key: "common",    label: "Обычные" },
    { key: "rare",      label: "Редкие" },
    { key: "epic",      label: "Эпические" },
    { key: "legendary", label: "Легенд." },
  ];

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <span className="text-xl">🎁</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Подарки</h1>
            <p className="text-xs text-muted-foreground font-medium">Порадуй друга особенным подарком</p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              filter === t.key
                ? "bg-primary text-primary-foreground border-primary shadow-[0_2px_12px_rgba(234,88,12,0.3)]"
                : "border-border text-muted-foreground hover:border-primary/30 bg-card"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Gift grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((gift, i) => (
            <motion.button
              key={gift.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 28 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelected(gift)}
              className="relative flex flex-col items-center rounded-3xl overflow-hidden border border-border/40 text-left transition-all hover:border-border active:scale-95"
              style={{ background: "var(--card)" }}
            >
              {/* Emoji with gradient bg */}
              <div
                className="w-full flex items-center justify-center py-6 relative overflow-hidden"
                style={{
                  background: `linear-gradient(145deg, ${gift.bgFrom}22, ${gift.bgTo}44)`,
                }}
              >
                {/* Glow blob */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 60%, ${gift.glow}, transparent 70%)`,
                  }}
                />
                <motion.span
                  className="text-6xl relative z-10 select-none"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                  style={{ filter: `drop-shadow(0 4px 16px ${gift.glow})` }}
                >
                  {gift.emoji}
                </motion.span>

                {/* Legendary sparkle effect */}
                {gift.rarity === "legendary" && (
                  <>
                    {[...Array(5)].map((_, si) => (
                      <motion.div
                        key={si}
                        className="absolute w-1 h-1 rounded-full bg-amber-300"
                        style={{ top: `${20 + si * 12}%`, left: `${15 + si * 15}%` }}
                        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: si * 0.3 }}
                      />
                    ))}
                  </>
                )}
              </div>

              {/* Info */}
              <div className="w-full px-3 py-2.5 bg-card">
                <p className="font-bold text-[13px] text-foreground text-center truncate">{gift.name}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full border ${RARITY_COLOR[gift.rarity]}`}>
                    {RARITY_LABEL[gift.rarity]}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Diamond size={10} className="text-cyan-400" />
                    <span className="text-[11px] font-black text-foreground">{gift.price}</span>
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Gift detail modal */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 80, scale: 0.93 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="fixed inset-x-4 bottom-8 z-[201] rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: "var(--card)" }}
            >
              {/* Top gradient */}
              <div
                className="w-full flex flex-col items-center py-10 relative overflow-hidden"
                style={{ background: `linear-gradient(160deg, ${selected.bgFrom}33, ${selected.bgTo}66)` }}
              >
                <div
                  className="absolute inset-0"
                  style={{ background: `radial-gradient(circle at 50% 70%, ${selected.glow}, transparent 60%)` }}
                />
                <motion.span
                  className="text-8xl relative z-10"
                  animate={{ y: [0, -6, 0], rotate: [-2, 2, -2] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  style={{ filter: `drop-shadow(0 8px 24px ${selected.glow})` }}
                >
                  {selected.emoji}
                </motion.span>
                <div className="mt-3 flex items-center gap-2 z-10">
                  {[...Array(3)].map((_, si) => (
                    <Star key={si} size={12} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
              </div>

              <div className="p-5">
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-black text-foreground">{selected.name}</h2>
                  <p className="text-muted-foreground text-sm mt-0.5">{selected.description}</p>
                  <div className="flex items-center justify-center gap-3 mt-3">
                    <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-full border ${RARITY_COLOR[selected.rarity]}`}>
                      {RARITY_LABEL[selected.rarity]}
                    </span>
                    <div className="flex items-center gap-1">
                      <Diamond size={14} className="text-cyan-400" />
                      <span className="text-lg font-black text-foreground">{selected.price}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelected(null)}
                    className="flex-1 py-3.5 rounded-2xl bg-secondary text-foreground font-bold text-sm hover:bg-secondary/80 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => handleSend(selected)}
                    disabled={sending}
                    className="flex-[2] py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70"
                    style={{ background: `linear-gradient(135deg, ${selected.bgFrom}, ${selected.bgTo})`, boxShadow: `0 4px 20px ${selected.glow}` }}
                  >
                    {sending ? (
                      <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={16} />
                        Подарить за {selected.price} 💎
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
