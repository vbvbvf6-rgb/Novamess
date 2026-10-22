import { Crown } from "lucide-react";
import "./_group.css";

export default function Refined() {
  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background p-5 text-foreground">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-xl">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Prime+ · статичный градиент</p>
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div
              aria-hidden="true"
              className="absolute -inset-[3px] rounded-[21px]"
              style={{
                background: "linear-gradient(135deg, #c4b5fd 0%, #a78bfa 32%, #67e8f9 68%, #c4b5fd 100%)",
                boxShadow: "0 0 12px rgba(139, 92, 246, 0.22)",
              }}
            />
            <div className="relative z-10 flex h-14 w-14 items-center justify-center overflow-hidden rounded-[18px] bg-[#334155] text-xl font-black text-white shadow-sm">
              М
            </div>
            <div className="absolute -right-1 -top-1 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 shadow-[0_0_5px_rgba(168,85,247,0.35)]">
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
