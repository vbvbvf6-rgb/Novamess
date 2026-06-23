import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Zap, Shield, MessageSquare, Users, Bell, RefreshCw } from "lucide-react";

const APP_VERSION = "2.4.0";
const PENDING_KEY = "aura-pending-changelog";
const SEEN_KEY = "aura-changelog-seen-v";

const CHANGELOG = [
  { icon: RefreshCw,    color: "text-blue-400",   bg: "bg-blue-500/10",   text: "Медленный режим теперь реально работает в каналах" },
  { icon: MessageSquare,color: "text-orange-400",  bg: "bg-orange-500/10", text: "Пересланные сообщения — метка «Переслано» вместо стикера ⤵️" },
  { icon: Shield,       color: "text-red-400",     bg: "bg-red-500/10",    text: "Удалённые сообщения больше не выглядят как оранжевый пузырь" },
  { icon: Users,        color: "text-green-400",   bg: "bg-green-500/10",  text: "Поиск контактов — работает с первой буквы" },
  { icon: Zap,          color: "text-yellow-400",  bg: "bg-yellow-500/10", text: "Истории переименованы в «Статус» (как в WhatsApp)" },
  { icon: Bell,         color: "text-purple-400",  bg: "bg-purple-500/10", text: "Исправлена прокрутка на странице входа и регистрации" },
  { icon: Shield,       color: "text-primary",     bg: "bg-primary/10",    text: "Нельзя написать администратору напрямую" },
];

export function WhatsNewModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Show if: update just happened (pending flag) OR version hasn't been seen yet
    const pending = localStorage.getItem(PENDING_KEY) === "true";
    const seen = localStorage.getItem(SEEN_KEY);
    if (pending || seen !== APP_VERSION) {
      const timer = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const handleClose = () => {
    localStorage.removeItem(PENDING_KEY);
    localStorage.setItem(SEEN_KEY, APP_VERSION);
    setOpen(false);
  };

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
              {/* Top gradient stripe */}
              <div className="h-1 bg-gradient-to-r from-primary via-orange-400 to-amber-500" />

              <div className="px-6 pt-6 pb-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                      <Sparkles size={22} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-primary mb-0.5">Версия {APP_VERSION}</p>
                      <h2 className="text-[18px] font-black text-foreground leading-tight">Что нового</h2>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Changelog list */}
                <div className="space-y-2.5 mb-5">
                  {CHANGELOG.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i, duration: 0.3 }}
                      className="flex items-start gap-3"
                    >
                      <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <item.icon size={13} className={item.color} />
                      </div>
                      <p className="text-[13px] text-foreground/90 font-medium leading-snug">{item.text}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Close button */}
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
