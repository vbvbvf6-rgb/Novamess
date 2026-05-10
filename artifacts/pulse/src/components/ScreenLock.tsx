import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Zap } from "lucide-react";
import { useScreenLock } from "@/hooks/useScreenLock";

interface ScreenLockProps {
  children: React.ReactNode;
}

export function ScreenLock({ children }: ScreenLockProps) {
  const { isEnabled, verifyPin, isSessionUnlocked } = useScreenLock();
  const [locked, setLocked] = useState(() => isEnabled() && !isSessionUnlocked());
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const handler = () => setLocked(true);
    window.addEventListener("pulse-lock", handler);
    return () => window.removeEventListener("pulse-lock", handler);
  }, []);

  const handleUnlock = () => {
    if (pin.length < 4) {
      setError("Введите минимум 4 цифры");
      return;
    }
    if (verifyPin(pin)) {
      sessionStorage.setItem("pulse-unlocked", "true");
      setLocked(false);
      setPin("");
      setError("");
    } else {
      setError("Неверный PIN-код");
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 600);
    }
  };

  const handleKeypad = (digit: string) => {
    if (pin.length >= 6) return;
    const next = pin + digit;
    setPin(next);
    setError("");
    if (next.length >= 4) {
      setTimeout(() => {
        if (verifyPin(next)) {
          sessionStorage.setItem("pulse-unlocked", "true");
          setLocked(false);
          setPin("");
          setError("");
        } else {
          setError("Неверный PIN-код");
          setShake(true);
          setPin("");
          setTimeout(() => setShake(false), 600);
        }
      }, 100);
    }
  };

  if (!locked) return <>{children}</>;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-6"
        style={{ background: "linear-gradient(135deg, #0a0a1a 0%, #0d1a2e 50%, #0a0a1a 100%)" }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-xs flex flex-col items-center gap-6">
          <motion.div
            animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,80,0,0.15)]">
              <Lock size={32} className="text-primary" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">Pulse заблокирован</h2>
              <p className="text-sm text-white/50 mt-0.5">Введите PIN-код для доступа</p>
            </div>
          </motion.div>

          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  i < pin.length
                    ? "bg-primary border-primary shadow-[0_0_8px_rgba(255,80,0,0.5)]"
                    : "border-white/30"
                }`}
              />
            ))}
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-destructive text-sm font-medium text-center bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2"
            >
              {error}
            </motion.p>
          )}

          <div className="grid grid-cols-3 gap-3 w-full">
            {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((d, i) => (
              <button
                key={i}
                onClick={() => {
                  if (d === "⌫") setPin(p => p.slice(0, -1));
                  else if (d) handleKeypad(d);
                }}
                disabled={!d}
                className={`h-14 rounded-2xl text-xl font-bold transition-all active:scale-95 ${
                  d === "⌫"
                    ? "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                    : d
                    ? "bg-white/8 text-white hover:bg-white/15 border border-white/10"
                    : "invisible"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-white/30">
            <Zap size={10} className="text-primary/50" />
            <span>Pulse Messenger</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ScreenLock;
