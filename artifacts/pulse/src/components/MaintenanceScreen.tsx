import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wrench, CheckCircle2 } from "lucide-react";

export interface MaintenanceData {
  active: boolean;
  message?: string;
  fixes?: string[];
  endsAt?: string | null;
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function MaintenanceScreen({ data, onExpired }: { data: MaintenanceData; onExpired: () => void }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!data.endsAt) { setRemaining(null); return; }
    const update = () => {
      const diff = Math.floor((new Date(data.endsAt!).getTime() - Date.now()) / 1000);
      if (diff <= 0) { onExpired(); return; }
      setRemaining(diff);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [data.endsAt, onExpired]);

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
      <div className="w-full max-w-sm mx-auto py-8">
        {/* Animated icon */}
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/10"
        >
          <Wrench size={40} className="text-primary" />
        </motion.div>

        {/* Pulsing dots */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay }}
              className="w-2 h-2 rounded-full bg-primary"
            />
          ))}
        </div>

        <h1 className="text-2xl font-black text-foreground mb-3">Технический перерыв</h1>

        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto mb-6">
          {data.message?.trim() || "Мы уже работаем над улучшениями. Совсем скоро вернёмся!"}
        </p>

        {/* Countdown */}
        {remaining !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-primary/5 border border-primary/20 rounded-2xl px-8 py-5 mb-6 inline-block"
          >
            <p className="text-[11px] text-muted-foreground mb-1.5 font-semibold uppercase tracking-widest">
              Возвращаемся через
            </p>
            <p className="text-5xl font-black text-primary tabular-nums tracking-tight">
              {formatTime(remaining)}
            </p>
          </motion.div>
        )}

        {/* Fix list */}
        {data.fixes && data.fixes.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 text-left space-y-2.5 mb-6">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
              Что будет исправлено
            </p>
            {data.fixes.map((fix, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-foreground leading-snug">{fix}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground opacity-40">Nova · Техническое обслуживание</p>
      </div>
    </div>
  );
}
