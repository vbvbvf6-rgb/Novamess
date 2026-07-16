import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, RefreshCw } from "lucide-react";
import { APP_VERSION } from "@/lib/version";

const PENDING_KEY = "aura-pending-changelog";
const SEEN_KEY = "aura-changelog-seen-v";

interface UpdateEntry {
  id: number;
  version: string;
  title: string;
  body: string;
  published_at: string | null;
}

const ICONS_BY_INDEX = ["🚀", "✨", "🔒", "🔔", "📞", "⭐", "🐛", "💎", "🎉", "🔧"];

function getBullets(body: string): string[] {
  return body
    .split("\n")
    .map(l => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

export function WhatsNewModal() {
  const [open, setOpen] = useState(false);
  const [updates, setUpdates] = useState<UpdateEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const pending = localStorage.getItem(PENDING_KEY) === "true";
    const seen = localStorage.getItem(SEEN_KEY);
    if (pending || seen !== APP_VERSION) {
      // Fetch from backend first, then show
      setLoading(true);
      fetch("/api/updates")
        .then(async r => {
          if (!r.ok) throw new Error("not ok");
          const data = await r.json();
          setUpdates(Array.isArray(data) ? data : []);
          setLoading(false);
          setError(false);
          const timer = setTimeout(() => setOpen(true), 600);
          return () => clearTimeout(timer);
        })
        .catch(() => {
          setLoading(false);
          setError(true);
          // Still show modal even if fetch fails — with error state
          const timer = setTimeout(() => setOpen(true), 600);
          return () => clearTimeout(timer);
        });
    }
    return undefined;
  }, []);

  const handleClose = () => {
    localStorage.removeItem(PENDING_KEY);
    localStorage.setItem(SEEN_KEY, APP_VERSION);
    setOpen(false);
  };

  // Use latest published update's version for display, fallback to APP_VERSION
  const displayVersion = updates[0]?.version || APP_VERSION;
  const displayTitle = updates[0]?.title || "Что нового";

  // Flatten all bullets from all updates (show up to 7)
  const allBullets: string[] = [];
  for (const u of updates) {
    for (const b of getBullets(u.body)) {
      if (allBullets.length < 7) allBullets.push(b);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 28 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="fixed inset-0 z-[301] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary via-pink-400 to-amber-500" />

              <div className="px-6 pt-6 pb-6">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                      <Sparkles size={22} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-primary mb-0.5">Версия {displayVersion}</p>
                      <h2 className="text-[18px] font-black text-foreground leading-tight">{displayTitle}</h2>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="space-y-2.5 mb-5">
                  {loading ? (
                    <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                      <RefreshCw size={16} className="animate-spin" />
                      <span className="text-sm">Загружаем обновления…</span>
                    </div>
                  ) : error && allBullets.length === 0 ? (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                      <p className="text-sm text-red-400 font-medium">Не удалось загрузить обновления</p>
                      <p className="text-xs text-muted-foreground mt-1">Проверьте соединение и попробуйте позже</p>
                    </div>
                  ) : allBullets.length === 0 ? (
                    <div className="bg-muted/30 rounded-xl p-4 text-center">
                      <p className="text-sm text-muted-foreground">Информация об обновлении появится позже</p>
                    </div>
                  ) : (
                    allBullets.map((text, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i, duration: 0.3 }}
                        className="flex items-start gap-3"
                      >
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-sm">
                          {ICONS_BY_INDEX[i % ICONS_BY_INDEX.length]}
                        </div>
                        <p className="text-[13px] text-foreground/90 font-medium leading-snug">{text}</p>
                      </motion.div>
                    ))
                  )}
                </div>

                <button
                  onClick={handleClose}
                  className="w-full py-3.5 bg-primary text-primary-foreground rounded-2xl text-[15px] font-black hover:bg-primary/90 transition-all shadow-[0_4px_20px_rgba(234,88,12,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                >
                  Отлично! 🎉
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
