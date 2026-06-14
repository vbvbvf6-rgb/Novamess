import React, { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ShieldCheck, QrCode, Clock, Zap } from "lucide-react";
import PulseLogo from "@/components/PulseLogo";
import { cn } from "@/lib/utils";

interface LoginProps {
  onLogin: (userId: number) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const [step, setStep] = useState<"credentials" | "2fa" | "qr">("credentials");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaError, setTwoFaError] = useState("");

  const [qrTokenId, setQrTokenId] = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState<number>(0);
  const [qrStatus, setQrStatus] = useState<"idle" | "pending" | "confirmed" | "expired">("idle");
  const [qrTimeLeft, setQrTimeLeft] = useState<number>(300);
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearQrIntervals = () => {
    if (qrPollRef.current) { clearInterval(qrPollRef.current); qrPollRef.current = null; }
    if (qrTimerRef.current) { clearInterval(qrTimerRef.current); qrTimerRef.current = null; }
  };

  useEffect(() => {
    return () => clearQrIntervals();
  }, []);

  const startQrLogin = async () => {
    clearQrIntervals();
    setQrStatus("pending");
    setError("");
    try {
      const res = await fetch("/api/auth/qr/generate", { method: "POST" });
      const data = await res.json();
      setQrTokenId(data.tokenId);
      setQrExpiresAt(data.expiresAt);
      const timeLeft = Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000));
      setQrTimeLeft(timeLeft);

      qrTimerRef.current = setInterval(() => {
        setQrTimeLeft(prev => {
          if (prev <= 1) {
            clearQrIntervals();
            setQrStatus("expired");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      qrPollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`/api/auth/qr/${data.tokenId}`);
          const d = await r.json();
          if (d.status === "confirmed") {
            clearQrIntervals();
            setQrStatus("confirmed");
            if (d.token) sessionStorage.setItem("pulse-token", d.token);
            sessionStorage.setItem("pulse-user-id", String(d.userId));
            sessionStorage.setItem("pulse-user", JSON.stringify(d.user));
            sessionStorage.setItem("pulse-tab-owned", "1");
            onLogin(d.userId);
          } else if (d.status === "expired") {
            clearQrIntervals();
            setQrStatus("expired");
          }
        } catch {}
      }, 2000);

      setStep("qr");
    } catch {
      setQrStatus("idle");
      setError("Не удалось создать QR-код");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Заполните все поля");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().replace(/^@/, ""), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Неверный никнейм или пароль");
        return;
      }
      if (data.requiresTwoFactor) {
        setPendingToken(data.pendingToken);
        setStep("2fa");
        return;
      }
      if (data.token) sessionStorage.setItem("pulse-token", data.token);
      sessionStorage.setItem("pulse-user-id", String(data.userId));
      sessionStorage.setItem("pulse-user", JSON.stringify(data.user));
      sessionStorage.setItem("pulse-tab-owned", "1");
      onLogin(data.userId);
    } catch {
      setError("Ошибка подключения к серверу");
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFa = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = twoFaCode.replace(/\s/g, "");
    if (code.length !== 6) {
      setTwoFaError("Введите 6-значный код");
      return;
    }
    setTwoFaLoading(true);
    setTwoFaError("");
    try {
      const res = await fetch("/api/auth/2fa/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingToken, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTwoFaError(data.error || "Неверный код");
        return;
      }
      if (data.token) sessionStorage.setItem("pulse-token", data.token);
      sessionStorage.setItem("pulse-user-id", String(data.userId));
      sessionStorage.setItem("pulse-user", JSON.stringify(data.user));
      sessionStorage.setItem("pulse-tab-owned", "1");
      onLogin(data.userId);
    } catch {
      setTwoFaError("Ошибка подключения к серверу");
    } finally {
      setTwoFaLoading(false);
    }
  };

  const qrUrl = qrTokenId ? `${window.location.origin}/qr/${qrTokenId}` : "";
  const qrImageUrl = qrUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=svg&color=FF6B00&bgcolor=00000000&data=${encodeURIComponent(qrUrl)}`
    : "";

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const getStepIcon = () => {
    if (step === "2fa") return <ShieldCheck size={32} className="text-primary" />;
    if (step === "qr") return <QrCode size={32} className="text-primary" />;
    return <Zap size={32} className="text-primary" />;
  };

  const getStepTitle = () => {
    if (step === "2fa") return "Верификация";
    if (step === "qr") return "QR вход";
    return "Nova";
  };

  const getStepSubtitle = () => {
    if (step === "2fa") return "Введите код из приложения";
    if (step === "qr") return "Отсканируйте с другого устройства";
    return "С возвращением";
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background relative overflow-hidden p-4 sm:p-8 login-landscape">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-5%] w-[55%] h-[55%] bg-primary/15 rounded-full blur-[140px] opacity-70 animate-[pulseGlow_7s_ease-in-out_infinite_alternate]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[65%] h-[65%] bg-violet-500/8 rounded-full blur-[120px] opacity-60 animate-[pulseGlow_9s_ease-in-out_infinite_alternate-reverse]" />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-amber-500/6 rounded-full blur-[80px] opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/30" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
            className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary via-orange-500 to-amber-500 flex items-center justify-center shadow-2xl shadow-primary/40 mb-6 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-white/10 pointer-events-none" />
            <PulseLogo size={48} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-foreground mb-2">
              {getStepTitle()}
            </h1>
            <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
              {getStepSubtitle()}
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-card/90 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
        >
          <AnimatePresence mode="wait">
            {step === "credentials" && (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                      Имя или никнейм
                    </label>
                    <div className={cn(
                      "relative flex items-center bg-background/50 border rounded-2xl transition-all duration-300",
                      focusedInput === "username" ? "border-primary ring-4 ring-primary/10 bg-background" : "border-border hover:border-border/80"
                    )}>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="@никнейм"
                        autoComplete="username"
                        autoFocus={typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches}
                        onFocus={() => setFocusedInput("username")}
                        onBlur={() => setFocusedInput(null)}
                        className="w-full bg-transparent border-none outline-none px-4 py-3.5 text-[15px] font-medium text-foreground placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Пароль
                      </label>
                      <Link href="/forgot-password" className="text-[12px] font-bold text-primary hover:text-primary/80 transition-colors">
                        Забыли?
                      </Link>
                    </div>
                    <div className={cn(
                      "relative flex items-center bg-background/50 border rounded-2xl transition-all duration-300",
                      focusedInput === "password" ? "border-primary ring-4 ring-primary/10 bg-background" : "border-border hover:border-border/80"
                    )}>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        onFocus={() => setFocusedInput("password")}
                        onBlur={() => setFocusedInput(null)}
                        className="w-full bg-transparent border-none outline-none pl-4 pr-12 py-3.5 text-[15px] font-medium text-foreground placeholder:text-muted-foreground/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                        animate={{ opacity: 1, height: "auto", scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                        className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-3 text-sm font-semibold text-center"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={!loading ? { scale: 1.02 } : {}}
                    whileTap={!loading ? { scale: 0.98 } : {}}
                    className={cn(
                      "w-full py-4 rounded-2xl font-bold text-[15px] shadow-lg transition-all relative overflow-hidden mt-2",
                      loading 
                        ? "bg-muted text-muted-foreground cursor-not-allowed shadow-none" 
                        : "bg-primary text-primary-foreground shadow-primary/25 hover:shadow-primary/40 hover:shadow-xl"
                    )}
                  >
                    {!loading && <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />}
                    <span className="relative z-10">{loading ? "Входим..." : "Войти"}</span>
                  </motion.button>
                </form>

                <div className="mt-6 pt-6 border-t border-border/50 space-y-3">
                  <motion.button
                    type="button"
                    onClick={startQrLogin}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full py-3.5 rounded-2xl bg-secondary/50 hover:bg-secondary text-foreground font-semibold text-[14px] flex items-center justify-center gap-2.5 transition-colors border border-border/50"
                  >
                    <QrCode size={18} className="text-primary" />
                    Войти по QR-коду
                  </motion.button>
                  <Link
                    href="/register"
                    className="w-full py-3.5 rounded-2xl bg-primary/5 hover:bg-primary/10 text-primary font-bold text-[14px] flex items-center justify-center gap-2 transition-colors border border-primary/25 hover:border-primary/40"
                  >
                    Зарегистрироваться
                  </Link>
                </div>
              </motion.div>
            )}

            {step === "2fa" && (
              <motion.div
                key="2fa"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <form onSubmit={handleTwoFa} className="flex flex-col gap-6">
                  <div className={cn(
                    "relative flex items-center bg-background/50 border rounded-2xl transition-all duration-300",
                    focusedInput === "2fa" ? "border-primary ring-4 ring-primary/10 bg-background" : "border-border"
                  )}>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      value={twoFaCode}
                      onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      autoFocus={typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches}
                      onFocus={() => setFocusedInput("2fa")}
                      onBlur={() => setFocusedInput(null)}
                      className="w-full bg-transparent border-none outline-none py-6 text-4xl font-mono tracking-[0.5em] font-black text-center text-foreground placeholder:text-muted-foreground/30"
                    />
                  </div>

                  <AnimatePresence>
                    {twoFaError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-3 text-sm font-semibold text-center"
                      >
                        {twoFaError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex flex-col gap-3">
                    <motion.button
                      type="submit"
                      disabled={twoFaLoading || twoFaCode.length !== 6}
                      whileHover={twoFaCode.length === 6 ? { scale: 1.02 } : {}}
                      whileTap={twoFaCode.length === 6 ? { scale: 0.98 } : {}}
                      className={cn(
                        "w-full py-4 rounded-2xl font-bold text-[15px] shadow-lg transition-all relative overflow-hidden",
                        twoFaLoading || twoFaCode.length !== 6
                          ? "bg-muted text-muted-foreground cursor-not-allowed shadow-none" 
                          : "bg-primary text-primary-foreground shadow-primary/25"
                      )}
                    >
                      {twoFaLoading ? "Проверка..." : "Подтвердить"}
                    </motion.button>

                    <button
                      type="button"
                      onClick={() => { setStep("credentials"); setTwoFaCode(""); setTwoFaError(""); }}
                      className="py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Вернуться назад
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {step === "qr" && (
              <motion.div
                key="qr"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
              >
                {qrStatus === "expired" ? (
                  <div className="text-center py-6 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                      <Clock size={28} className="text-destructive" />
                    </div>
                    <p className="text-[15px] text-muted-foreground font-medium">QR-код истёк</p>
                    <motion.button
                      onClick={startQrLogin}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-6 py-3 rounded-xl bg-primary/10 text-primary font-bold hover:bg-primary/15 transition-colors border border-primary/20"
                    >
                      Обновить QR-код
                    </motion.button>
                  </div>
                ) : qrStatus === "confirmed" ? (
                  <div className="text-center py-6 flex flex-col items-center gap-4">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center"
                    >
                      <ShieldCheck size={32} className="text-green-500" />
                    </motion.div>
                    <p className="text-[15px] font-bold text-foreground">Успешный вход!</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center w-full">
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-black/5 mb-6 relative group">
                      <div className="absolute inset-0 bg-primary/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      {qrImageUrl ? (
                        <img src={qrImageUrl} alt="QR Code" className="w-[200px] h-[200px]" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-[200px] h-[200px] bg-secondary/50 rounded-2xl animate-pulse" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full mb-8 border border-border/50">
                      <Clock size={14} className="text-primary" />
                      <span className="text-sm font-bold font-mono text-foreground">{formatTime(qrTimeLeft)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep("credentials")}
                      className="w-full py-3.5 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-[14px] transition-colors border border-border"
                    >
                      Войти по паролю
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}
