import React from "react";
import { motion } from "framer-motion";
import { Rocket, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface ComingSoonProps {
  title?: string;
  description?: string;
}

export function ComingSoon({
  title = "Скоро",
  description = "Эта функция находится в разработке и появится в ближайшее время.",
}: ComingSoonProps) {
  const [, navigate] = useLocation();

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full p-8 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center text-center max-w-xs"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-primary/20 via-violet-500/10 to-primary/5 border border-primary/20 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(139,92,246,0.15)]"
        >
          <Rocket size={42} className="text-primary" strokeWidth={1.5} />
        </motion.div>

        <h1 className="text-2xl font-black text-foreground mb-3">{title}</h1>
        <p className="text-[15px] text-muted-foreground font-medium leading-relaxed mb-8">
          {description}
        </p>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-secondary border border-border text-foreground font-semibold text-[15px] hover:bg-secondary/80 transition-colors"
        >
          <ArrowLeft size={17} />
          Назад к чатам
        </motion.button>
      </motion.div>
    </div>
  );
}
