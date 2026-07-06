import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Zap, Eye, EyeOff, KeyRound, ArrowLeft } from "lucide-react";
import { useScreenLock } from "@/hooks/useScreenLock";

interface ScreenLockProps {
  children: React.ReactNode;
}

export function ScreenLock({ children }: ScreenLockProps) {
  const { isEnabled, verifyPin, isSessionUnlocked, getPinLength } = useScreenLock();
  const [locked, setLocked] = useState(() => isEnabled() && !isSessionUnlocked());
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const pinLength = getPinLength();
  const pinLengthKnown = !!localStorage.getItem("pulse-screen-lock-pin-length");

  const [resetMode, setResetMode] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const handler = () => setLocked(true);
    window.addEventListener("pulse-lock", handler);
    return () => window.removeEventListener("pulse-lock", handler);
  }, []);

  const doUnlock = (candidate: string) => {
    if (verifyPin(candidate)) {
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

  const handleUnlock = () => {
    if (pin.length < pinLength) {
      setError(`Введите ${pinLength} цифр`);
      return;
    }
    doUnlock(pin);
  };

  const handleKeypad = (digit: string) => {
    if (pin.length >= 8) return;
    if (pinLengthKnown && pin.length >= pinLength) return;
    const next = pin + digit;
    setPin(next);
    setError("");
    if (pinLengthKnown && next.length === pinLength) {
      setTimeout(() => doUnlock(next), 100);
    }
  };

  const handleResetByPassword = async () => {
    if (!password.trim()) {
      setResetError("Введите пароль от аккаунта");
      return;
    }
    setResetLoading(true);
    setResetError("");
    try {
      const token = sessionStorage.getItem("pulse-token");
      const r = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ password }),
      });
      if (r.ok) {
        localStorage.removeItem("pulse-screen-lock-pin");
        localStorage.removeItem("pulse-screen-lock-pin-length");
        localStorage.setItem("pulse-screen-lock-enabled", "false");
        sessionStorage.setItem("pulse-unlocked", "true");
        setResetSuccess(true);
        setTimeout(() => {
          setLocked(false);
          setResetMode(false);
          setPassword("");
          setResetSuccess(false);
        }, 1200);
      } else {
        const data = await r.json().catch(() => ({}));
        setResetError(data.error || "Неверный пароль");
      }
    } catch {
      setResetError("Ошибка соединения. Попробуйте снова.");
    } finally {
      setResetLoading(false);
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
          <AnimatePresence mode="wait">
            {resetMode ? (
              <motion.div
                key="reset"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                className="w-full flex flex-col items-center gap-5"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                    <KeyRound size={32} className="text-blue-400" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-foreground">Сброс PIN-кода</h2>
                    <p className="text-sm text-muted-foreground/60 mt-0.5">Введите пароль от вашего аккаунта</p>
                  </div>
                </div>

                {resetSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full py-4 rounded-2xl bg-green-500/20 border border-green-500/30 text-green-400 font-bold text-center text-sm"
                  >
                    ✓ PIN сброшен — открываем приложение
                  </motion.div>
                ) : (
                  <div className="w-full flex flex-col gap-3">
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => { setPassword(e.target.value); setResetError(""); }}
                        onKeyDown={e => e.key === "Enter" && handleResetByPassword()}
                        placeholder="Пароль от аккаунта"
                        autoFocus
                        className="w-full bg-black/8 border border-black/20 rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground/50 text-base font-medium focus:outline-none focus:border-blue-500/50 focus:bg-black/12 transition-all pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {resetError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-sm font-medium text-center bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2"
                      >
                        {resetError}
                      </motion.p>
                    )}

                    <button
                      onClick={handleResetByPassword}
                      disabled={resetLoading}
                      className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-foreground font-bold text-base active:scale-95 transition-all disabled:opacity-60"
                    >
                      {resetLoading ? "Проверяем..." : "Сбросить PIN и войти"}
                    </button>
                  </div>
                )}

                <button
                  onClick={() => { setResetMode(false); setPassword(""); setResetError(""); }}
                  className="flex items-center gap-1.5 text-foreground/40 hover:text-foreground/70 text-sm font-medium transition-colors"
                >
                  <ArrowLeft size={14} /> Назад к PIN
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="pin"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                className="w-full flex flex-col items-center gap-6"
              >
                <motion.div
                  animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,80,0,0.15)]">
                    <Lock size={32} className="text-primary" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-foreground">Nova заблокирован</h2>
                    <p className="text-sm text-muted-foreground/60 mt-0.5">Введите PIN-код для доступа</p>
                  </div>
                </motion.div>

                <div className="flex gap-2">
                  {Array.from({ length: pinLengthKnown ? pinLength : 8 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                        i < pin.length
                          ? "bg-primary border-primary shadow-[0_0_8px_rgba(255,80,0,0.5)]"
                          : "border-black/30"
                      }`}
                    />
                  ))}
                </div>

                {!pinLengthKnown && pin.length >= 4 && (
                  <button
                    onClick={handleUnlock}
                    className="w-full py-3 rounded-2xl bg-primary text-foreground font-bold text-base hover:bg-primary/90 active:scale-95 transition-all"
                  >
                    Войти
                  </button>
                )}

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
                          ? "bg-black/5 text-muted-foreground/60 hover:bg-black/10 hover:text-foreground"
                          : d
                          ? "bg-black/8 text-foreground hover:bg-black/15 border border-black/10"
                          : "invisible"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => { setResetMode(true); setPin(""); setError(""); }}
                  className="text-muted-foreground/40 hover:text-muted-foreground text-sm font-medium transition-colors"
                >
                  Забыли PIN-код?
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
            <Zap size={10} className="text-primary/50" />
            <span>Nova Messenger</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ScreenLock;
