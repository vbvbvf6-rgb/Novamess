import React, { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ShieldCheck, QrCode, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import PulseLogo from "@/components/PulseLogo";

interface LoginProps {
  onLogin: (userId: number) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const getStepIcon = () => {
    if (step === "2fa") return <ShieldCheck className="text-primary w-10 h-10" />;
    if (step === "qr") return <QrCode className="text-primary w-10 h-10" />;
    return <PulseLogo size={48} />;
  };

  const getStepTitle = () => {
    if (step === "2fa") return "Верификация";
    if (step === "qr") return "QR вход";
    return "Pulse";
  };

  const getStepSubtitle = () => {
    if (step === "2fa") return "Введите код из приложения";
    if (step === "qr") return "Отсканируйте с другого устройства";
    return "С возвращением";
  };

  const qrUrl = qrTokenId ? `${window.location.origin}/qr/${qrTokenId}` : "";
  const qrImageUrl = qrUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=svg&color=FF6600&bgcolor=00000000&data=${encodeURIComponent(qrUrl)}`
    : "";

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full blur-[120px] opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(16 100% 50% / 0.18), transparent 70%)" }}
      />
      <div
        className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full blur-[120px] opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(30 100% 45% / 0.15), transparent 70%)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[380px] relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <motion.div
            initial={{ scale: 0.7, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.15 }}
            className="w-24 h-24 rounded-[28px] flex items-center justify-center mb-6 relative"
            style={{
              background: "linear-gradient(135deg, hsl(16 100% 50% / 0.15) 0%, hsl(16 100% 50% / 0.05) 100%)",
              border: "1px solid hsl(16 100% 50% / 0.2)",
              boxShadow: "0 0 40px hsl(16 100% 50% / 0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {getStepIcon()}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl font-black text-foreground tracking-tight leading-none mb-2">
              {getStepTitle()}
            </h1>
            <p className="text-muted-foreground text-[15px] font-medium">
              {getStepSubtitle()}
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="rounded-[28px] p-6"
          style={{
            background: "hsl(var(--card) / 0.7)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid hsl(var(--border) / 0.8)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <AnimatePresence mode="wait">
            {step === "credentials" && (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25 }}
              >
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                      Имя или никнейм
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="@никнейм или имя"
                      autoComplete="username"
                      autoFocus
                      className="w-full bg-secondary/60 border border-border rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-[15px] font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between pl-1 pr-1">
                      <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Пароль</label>
                      <Link href="/forgot-password" className="text-xs text-primary hover:text-primary/80 transition-colors font-bold">
                        Забыли?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="w-full bg-secondary/60 border border-border rounded-2xl px-4 py-3.5 pr-12 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-[15px] font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm font-semibold"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.01 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    className="w-full text-primary-foreground font-black py-4 rounded-2xl transition-all disabled:opacity-50 text-[15px] mt-2"
                    style={{
                      background: loading
                        ? "hsl(var(--primary) / 0.7)"
                        : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(16 100% 42%) 100%)",
                      boxShadow: loading ? "none" : "0 8px 28px hsl(var(--primary) / 0.35)",
                    }}
                  >
                    {loading ? "Входим..." : "Войти"}
                  </motion.button>
                </form>

                <div className="hidden md:block mt-4 pt-4 border-t border-border">
                  <motion.button
                    type="button"
                    onClick={startQrLogin}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2 bg-secondary/60 hover:bg-secondary border border-border rounded-2xl px-4 py-3 text-foreground font-bold text-sm transition-all"
                  >
                    <QrCode size={17} className="text-primary" />
                    Войти по QR-коду
                  </motion.button>
                </div>

                <div className="mt-4 pt-4 border-t border-border text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    Нет аккаунта?{" "}
                    <Link href="/register" className="text-primary hover:text-primary/80 transition-colors font-bold">
                      Создать
                    </Link>
                  </p>
                </div>
              </motion.div>
            )}

            {step === "2fa" && (
              <motion.div
                key="2fa"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
              >
                <div className="text-center mb-6">
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                    Откройте приложение аутентификации и введите 6-значный код.
                  </p>
                </div>
                <form onSubmit={handleTwoFa} className="space-y-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    autoFocus
                    className="w-full bg-secondary/60 border border-border rounded-2xl px-5 py-6 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-center text-4xl font-mono tracking-[0.5em] font-black shadow-inner"
                  />

                  <AnimatePresence>
                    {twoFaError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm font-semibold text-center"
                      >
                        {twoFaError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    disabled={twoFaLoading || twoFaCode.length !== 6}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full text-primary-foreground font-black py-4 rounded-2xl transition-all disabled:opacity-50 text-[15px]"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(16 100% 42%) 100%)",
                      boxShadow: "0 8px 28px hsl(var(--primary) / 0.35)",
                    }}
                  >
                    {twoFaLoading ? "Проверяем..." : "Подтвердить"}
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => { setStep("credentials"); setTwoFaCode(""); setTwoFaError(""); }}
                    className="w-full text-sm font-bold text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    ← Назад
                  </button>
                </form>
              </motion.div>
            )}

            {step === "qr" && (
              <motion.div
                key="qr"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center"
              >
                {qrStatus === "expired" ? (
                  <div className="text-center py-4 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
                      <Clock size={28} className="text-destructive" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">QR-код истёк</p>
                    <motion.button
                      onClick={startQrLogin}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-2xl text-primary font-bold text-sm transition-all"
                    >
                      <RefreshCw size={15} />
                      Обновить QR
                    </motion.button>
                  </div>
                ) : qrStatus === "confirmed" ? (
                  <div className="text-center py-4 space-y-3">
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto"
                    >
                      <CheckCircle2 size={30} className="text-green-500" />
                    </motion.div>
                    <p className="text-sm font-bold text-foreground">Вход подтверждён!</p>
                    <p className="text-xs text-muted-foreground">Выполняем вход...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground font-medium text-center mb-4 leading-relaxed">
                      Откройте Pulse на другом устройстве и отсканируйте код
                    </p>

                    <div
                      className="p-3 rounded-2xl mb-3 relative"
                      style={{
                        background: "hsl(var(--background) / 0.8)",
                        border: "1px solid hsl(var(--border) / 0.6)",
                      }}
                    >
                      {qrImageUrl ? (
                        <img
                          src={qrImageUrl}
                          alt="QR Code"
                          width={160}
                          height={160}
                          className="rounded-xl"
                          style={{ imageRendering: "pixelated" }}
                        />
                      ) : (
                        <div className="w-40 h-40 rounded-xl bg-secondary/40 animate-pulse" />
                      )}

                      <motion.div
                        className="absolute inset-3 rounded-xl pointer-events-none"
                        style={{ border: "2px solid hsl(var(--primary) / 0.3)" }}
                        animate={{ opacity: [0.3, 0.8, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-5">
                      <Clock size={12} className="text-primary/70" />
                      <span>Код действителен {formatTime(qrTimeLeft)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-green-500"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <span>Ожидаем сканирование...</span>
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => { clearQrIntervals(); setStep("credentials"); setQrStatus("idle"); }}
                  className="w-full text-sm font-bold text-muted-foreground hover:text-foreground transition-colors py-3 mt-4"
                >
                  ← Назад
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-[11px] text-muted-foreground/40 font-medium mt-6"
        >
          Pulse Messenger · Ваши данные надёжно защищены
        </motion.p>
      </motion.div>
    </div>
  );
}
