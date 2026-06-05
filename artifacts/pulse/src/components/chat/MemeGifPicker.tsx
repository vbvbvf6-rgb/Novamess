import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Meme {
  postLink: string;
  subreddit: string;
  title: string;
  url: string;
  author: string;
  ups: number;
  preview: string[];
}

const CATEGORIES: { label: string; emoji: string; sub: string }[] = [
  { label: "Мемы",    emoji: "🔥", sub: "memes" },
  { label: "Жёстко",  emoji: "💀", sub: "dankmemes" },
  { label: "Смешное", emoji: "😂", sub: "funny" },
  { label: "Кринж",   emoji: "💅", sub: "facepalm" },
  { label: "Работа",  emoji: "💼", sub: "ProgrammerHumor" },
  { label: "Животные",emoji: "🐾", sub: "AnimalsBeingDerps" },
];

const CACHE = new Map<string, Meme[]>();

async function fetchMemes(subreddit: string, count = 12): Promise<Meme[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://meme-api.com/gimme/${subreddit}/${count}`, { signal: controller.signal });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    const memes: Meme[] = (data.memes || []);
    return memes.filter(m =>
      m.url &&
      !m.url.endsWith(".gif") &&
      /\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(m.url)
    );
  } finally {
    clearTimeout(timer);
  }
}

interface MemeGifPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export function MemeGifPicker({ onSelect, onClose }: MemeGifPickerProps) {
  const [categoryIdx, setCategoryIdx] = useState(0);
  const [memes, setMemes] = useState<Meme[]>(() => CACHE.get(CATEGORIES[0].sub) ?? []);
  const [loading, setLoading] = useState(() => !CACHE.has(CATEGORIES[0].sub));
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const cat = CATEGORIES[categoryIdx];

  const load = useCallback(async (sub: string, force = false) => {
    if (!force && CACHE.has(sub)) {
      setMemes(CACHE.get(sub)!);
      setLoading(false);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    setMemes([]);
    try {
      const results = await fetchMemes(sub);
      CACHE.set(sub, results);
      setMemes(results);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(cat.sub, refreshKey > 0);
  }, [categoryIdx, refreshKey]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.97 }}
      transition={{ type: "spring", damping: 26, stiffness: 320 }}
      className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-[22px] shadow-2xl overflow-hidden z-50"
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-secondary/40">
        <span className="text-base shrink-0">😂</span>
        <span className="text-[13px] font-black text-foreground flex-1">Мемы</span>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={loading}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          title="Обновить"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-none px-3 py-2 bg-secondary/20 border-b border-border/50">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.sub}
            onClick={() => setCategoryIdx(i)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 transition-all",
              i === categoryIdx
                ? "bg-primary text-white shadow-[0_2px_8px_rgba(139,92,246,0.3)]"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            <span>{c.emoji}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      <div className="overflow-y-auto scrollbar-none" style={{ maxHeight: "280px" }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Loader2 size={22} className="animate-spin text-primary" />
            <span className="text-[12px] text-muted-foreground font-medium">Загружаем мемы...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2.5">
            <AlertCircle size={24} className="text-rose-400" />
            <p className="text-[12px] text-muted-foreground font-medium">Не удалось загрузить</p>
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="text-[11px] font-black text-primary hover:text-primary/80 transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        ) : memes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <span className="text-2xl">🤷</span>
            <p className="text-[12px] text-muted-foreground font-medium">Мемов не нашлось</p>
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="text-[11px] font-black text-primary"
            >
              Обновить
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${categoryIdx}-${refreshKey}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-2 gap-1.5 p-2.5"
            >
              {memes.map((meme, i) => (
                <motion.button
                  key={meme.postLink + i}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.025, duration: 0.15 }}
                  onClick={() => { onSelect(meme.url); onClose(); }}
                  className="relative rounded-xl overflow-hidden bg-secondary border border-border/50 hover:border-primary/40 hover:scale-[1.03] active:scale-[0.97] transition-all group"
                  style={{ aspectRatio: "4/3" }}
                  title={meme.title}
                >
                  <img
                    src={meme.preview?.[meme.preview.length - 1] || meme.url}
                    alt={meme.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={e => {
                      (e.currentTarget as HTMLImageElement).src = meme.url;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                    <p className="text-white text-[9px] font-bold leading-tight line-clamp-2">
                      {meme.title}
                    </p>
                  </div>
                  {meme.ups > 0 && (
                    <div className="absolute top-1 right-1 bg-black/50 text-white text-[8px] font-black px-1 py-0.5 rounded-md leading-none">
                      ▲{meme.ups >= 1000 ? `${(meme.ups / 1000).toFixed(1)}k` : meme.ups}
                    </div>
                  )}
                </motion.button>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-border/50 bg-secondary/20">
        <p className="text-[9px] text-muted-foreground/40 text-center font-medium tracking-wide">
          Reddit · r/{cat.sub}
        </p>
      </div>
    </motion.div>
  );
}
