import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import "./_group.css";

export default function Current() {
  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background p-5 text-foreground">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-xl">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Текущий ободок</p>
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-[2px] rounded-[20px]"
              style={{
                background: "conic-gradient(from 0deg, #a855f7, #38bdf8, #e2e8f0, #c084fc, #06b6d4, #a855f7)",
                borderRadius: "20px",
              }}
            />
            <div className="relative z-10 flex h-14 w-14 items-center justify-center overflow-hidden rounded-[18px] bg-[#334155] text-xl font-black text-white shadow-sm">
              М
            </div>
            <div className="absolute -right-1 -top-1 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 shadow-[0_0_6px_rgba(168,85,247,0.8)]">
              <Crown size={8} className="text-white" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-bold">Марк Орлов</p>
              <span className="rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-bold text-purple-300">Prime+</span>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">Скинул фото</p>
          </div>
          <span className="ml-auto self-start text-[10px] text-muted-foreground">12:41</span>
        </div>
      </div>
    </div>
  );
}
