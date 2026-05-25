import React, { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ShieldCheck, QrCode, RefreshCw, CheckCircle2, Clock, Zap, Shield } from "lucide-react";

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
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=svg&color=FF7820&bgcolor=00000000&data=${encodeURIComponent(qrUrl)}`
    : "";

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const inputStyle = (name: string) => ({
    width: "100%",
    background: focusedInput === name ? "rgba(255,120,30,0.06)" : "rgba(255,255,255,0.04)",
    border: `1px solid ${focusedInput === name ? "rgba(255,120,30,0.45)" : "rgba(255,255,255,0.08)"}`,
    borderRadius: "14px",
    transition: "all 0.2s",
    boxShadow: focusedInput === name ? "0 0 0 3px rgba(255,120,30,0.12)" : "none",
  } as React.CSSProperties);

  const getStepIcon = () => {
    if (step === "2fa") return <ShieldCheck size={38} style={{ color: "#ff7820", filter: "drop-shadow(0 0 14px rgba(255,120,30,0.6))" }} />;
    if (step === "qr") return <QrCode size={38} style={{ color: "#ff7820", filter: "drop-shadow(0 0 14px rgba(255,120,30,0.6))" }} />;
    return <Zap size={40} style={{ color: "#ff7820", filter: "drop-shadow(0 0 18px rgba(255,120,30,0.75))" }} />;
  };

  const getStepTitle = () => {
    if (step === "2fa") return "Верификация";
    if (step === "qr") return "QR вход";
    return "Aether";
  };

  const getStepSubtitle = () => {
    if (step === "2fa") return "Введите код из приложения";
    if (step === "qr") return "Отсканируйте с другого устройства";
    return "С возвращением";
  };

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#080808",
      fontFamily: "'Inter', system-ui, sans-serif",
      position: "relative",
      overflow: "hidden",
      padding: "16px",
    }}>
      {/* Top radial glow */}
      <div style={{
        position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)",
        width: "80%", height: "70%", borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(255,120,30,0.07) 0%, transparent 65%)",
        filter: "blur(60px)", pointerEvents: "none",
      }} />
      {/* Bottom radial glow */}
      <div style={{
        position: "absolute", bottom: "-25%", left: "50%", transform: "translateX(-50%)",
        width: "70%", height: "60%", borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(255,80,20,0.05) 0%, transparent 65%)",
        filter: "blur(60px)", pointerEvents: "none",
      }} />
      {/* Subtle grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.025,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: "100%", maxWidth: "390px", position: "relative", zIndex: 10 }}
      >
        {/* Logo + title */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "36px" }}>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 160, damping: 18, delay: 0.1 }}
            style={{
              width: "88px", height: "88px", borderRadius: "26px",
              background: "linear-gradient(145deg, #1d1d1d 0%, #141414 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: "22px",
              boxShadow: "0 0 0 1px rgba(255,120,30,0.14), 0 8px 40px rgba(0,0,0,0.85), 0 0 60px rgba(255,100,20,0.09), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {getStepIcon()}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ textAlign: "center" }}
          >
            <h1 style={{
              fontSize: "42px", fontWeight: 900, letterSpacing: "-2px",
              color: "#ffffff", marginBottom: "6px", lineHeight: 1,
            }}>
              {getStepTitle()}
            </h1>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <div style={{ height: "1px", width: "24px", background: "rgba(255,255,255,0.12)" }} />
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em" }}>
                {getStepSubtitle().toUpperCase()}
              </p>
              <div style={{ height: "1px", width: "24px", background: "rgba(255,255,255,0.12)" }} />
            </div>
          </motion.div>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          style={{
            background: "linear-gradient(160deg, rgba(24,24,24,0.98) 0%, rgba(16,16,16,0.98) 100%)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "28px",
            padding: "28px 24px",
            boxShadow: "0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.06)",
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
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  {/* Username */}
                  <div>
                    <label style={{
                      display: "block", fontSize: "10px", fontWeight: 800,
                      letterSpacing: "0.14em", textTransform: "uppercase",
                      color: "rgba(255,255,255,0.3)", marginBottom: "9px", paddingLeft: "2px",
                    }}>
                      Имя или никнейм
                    </label>
                    <div style={inputStyle("username")}>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="@никнейм или имя"
                        autoComplete="username"
                        autoFocus
                        onFocus={() => setFocusedInput("username")}
                        onBlur={() => setFocusedInput(null)}
                        style={{
                          width: "100%", background: "transparent", border: "none", outline: "none",
                          padding: "14px 16px", color: "rgba(255,255,255,0.92)", fontSize: "15px",
                          fontWeight: 500, boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "9px", padding: "0 2px" }}>
                      <label style={{
                        fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em",
                        textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
                      }}>Пароль</label>
                      <Link href="/forgot-password">
                        <button type="button" style={{
                          fontSize: "12px", color: "rgba(255,120,40,0.9)", fontWeight: 700,
                          background: "none", border: "none", cursor: "pointer",
                        }}>Забыли?</button>
                      </Link>
                    </div>
                    <div style={{ position: "relative", ...inputStyle("password") }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        onFocus={() => setFocusedInput("password")}
                        onBlur={() => setFocusedInput(null)}
                        style={{
                          width: "100%", background: "transparent", border: "none", outline: "none",
                          padding: "14px 48px 14px 16px", color: "rgba(255,255,255,0.92)",
                          fontSize: "15px", fontWeight: 500, boxSizing: "border-box",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
                          background: "none", border: "none", cursor: "pointer",
                          color: "rgba(255,255,255,0.28)", display: "flex", alignItems: "center",
                        }}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                          color: "#f87171", borderRadius: "12px", padding: "10px 14px",
                          fontSize: "13px", fontWeight: 600,
                        }}
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={!loading ? { scale: 1.015, boxShadow: "0 14px 44px rgba(255,100,20,0.48)" } : {}}
                    whileTap={!loading ? { scale: 0.975 } : {}}
                    style={{
                      width: "100%", padding: "15px", borderRadius: "14px", border: "none", cursor: loading ? "not-allowed" : "pointer",
                      background: loading ? "rgba(255,120,30,0.5)" : "linear-gradient(135deg, #ff7820 0%, #ff4d10 100%)",
                      color: "white", fontSize: "15px", fontWeight: 800,
                      boxShadow: loading ? "none" : "0 8px 30px rgba(255,100,20,0.42), inset 0 1px 0 rgba(255,255,255,0.2)",
                      marginTop: "2px", opacity: loading ? 0.7 : 1, transition: "opacity 0.2s",
                    }}
                  >
                    {loading ? "Входим..." : "Войти"}
                  </motion.button>
                </form>

                <div style={{ marginTop: "18px", paddingTop: "18px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <motion.button
                    type="button"
                    onClick={startQrLogin}
                    whileHover={{ background: "rgba(255,255,255,0.06)" }}
                    style={{
                      width: "100%", padding: "13px", borderRadius: "14px",
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: "13px", fontWeight: 600,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                      transition: "background 0.15s",
                    }}
                  >
                    <QrCode size={15} style={{ color: "rgba(255,120,40,0.8)" }} />
                    Войти по QR-коду
                  </motion.button>
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
                <div style={{ textAlign: "center", marginBottom: "22px" }}>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                    Откройте приложение аутентификации и введите 6-значный код.
                  </p>
                </div>
                <form onSubmit={handleTwoFa} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={inputStyle("2fa")}>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      value={twoFaCode}
                      onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      autoFocus
                      onFocus={() => setFocusedInput("2fa")}
                      onBlur={() => setFocusedInput(null)}
                      style={{
                        width: "100%", background: "transparent", border: "none", outline: "none",
                        padding: "20px 16px", color: "rgba(255,255,255,0.92)",
                        fontSize: "36px", fontFamily: "monospace", letterSpacing: "0.5em",
                        fontWeight: 900, textAlign: "center", boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <AnimatePresence>
                    {twoFaError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                          color: "#f87171", borderRadius: "12px", padding: "10px 14px",
                          fontSize: "13px", fontWeight: 600, textAlign: "center",
                        }}
                      >
                        {twoFaError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    disabled={twoFaLoading || twoFaCode.length !== 6}
                    whileHover={twoFaCode.length === 6 ? { scale: 1.015, boxShadow: "0 14px 44px rgba(255,100,20,0.48)" } : {}}
                    whileTap={twoFaCode.length === 6 ? { scale: 0.975 } : {}}
                    style={{
                      width: "100%", padding: "15px", borderRadius: "14px", border: "none",
                      cursor: twoFaLoading || twoFaCode.length !== 6 ? "not-allowed" : "pointer",
                      background: "linear-gradient(135deg, #ff7820 0%, #ff4d10 100%)",
                      color: "white", fontSize: "15px", fontWeight: 800,
                      boxShadow: "0 8px 30px rgba(255,100,20,0.42), inset 0 1px 0 rgba(255,255,255,0.2)",
                      opacity: twoFaLoading || twoFaCode.length !== 6 ? 0.5 : 1, transition: "opacity 0.2s",
                    }}
                  >
                    {twoFaLoading ? "Проверяем..." : "Подтвердить"}
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => { setStep("credentials"); setTwoFaCode(""); setTwoFaError(""); }}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "rgba(255,255,255,0.35)", fontSize: "13px", fontWeight: 700,
                      padding: "8px", textAlign: "center", transition: "color 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
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
                style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
              >
                {qrStatus === "expired" ? (
                  <div style={{ textAlign: "center", padding: "16px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                    <div style={{
                      width: "60px", height: "60px", borderRadius: "50%",
                      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Clock size={26} style={{ color: "#f87171" }} />
                    </div>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>QR-код истёк</p>
                    <motion.button
                      onClick={startQrLogin}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "10px 20px", borderRadius: "14px",
                        background: "rgba(255,120,30,0.1)", border: "1px solid rgba(255,120,30,0.3)",
                        color: "#ff7820", fontSize: "13px", fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      <RefreshCw size={14} /> Обновить QR
                    </motion.button>
                  </div>
                ) : qrStatus === "confirmed" ? (
                  <div style={{ textAlign: "center", padding: "16px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      style={{
                        width: "60px", height: "60px", borderRadius: "50%",
                        background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.22)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <CheckCircle2 size={28} style={{ color: "#22c55e" }} />
                    </motion.div>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>Вход подтверждён!</p>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>Выполняем вход...</p>
                  </div>
                ) : (
                  <>
                    <p style={{
                      fontSize: "13px", color: "rgba(255,255,255,0.4)", fontWeight: 500,
                      textAlign: "center", marginBottom: "18px", lineHeight: 1.6,
                    }}>
                      Откройте Aether на другом устройстве и отсканируйте код
                    </p>

                    <div style={{
                      padding: "12px", borderRadius: "20px", marginBottom: "12px", position: "relative",
                      background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                      {qrImageUrl ? (
                        <img
                          src={qrImageUrl}
                          alt="QR Code"
                          width={168}
                          height={168}
                          style={{ borderRadius: "12px", imageRendering: "pixelated", display: "block" }}
                        />
                      ) : (
                        <div style={{ width: "168px", height: "168px", borderRadius: "12px", background: "rgba(255,255,255,0.04)" }} />
                      )}
                      <motion.div
                        style={{
                          position: "absolute", inset: "12px", borderRadius: "12px",
                          border: "2px solid rgba(255,120,30,0.35)", pointerEvents: "none",
                        }}
                        animate={{ opacity: [0.3, 0.8, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "rgba(255,255,255,0.3)", fontWeight: 500, marginBottom: "18px" }}>
                      <Clock size={11} style={{ color: "rgba(255,120,30,0.7)" }} />
                      <span>Код действителен {formatTime(qrTimeLeft)}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
                      <motion.div
                        style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }}
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
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "rgba(255,255,255,0.3)", fontSize: "13px", fontWeight: 700,
                    padding: "12px", marginTop: "10px", textAlign: "center", transition: "color 0.15s",
                    width: "100%",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                >
                  ← Назад
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {step === "credentials" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            style={{ marginTop: "12px" }}
          >
            <Link href="/register">
              <motion.button
                whileHover={{ background: "rgba(255,255,255,0.05)" }}
                style={{
                  width: "100%", padding: "15px", borderRadius: "20px",
                  background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer", color: "rgba(255,255,255,0.55)", fontSize: "15px", fontWeight: 700,
                  transition: "background 0.15s",
                }}
              >
                Зарегистрироваться
              </motion.button>
            </Link>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
            marginTop: "22px", paddingBottom: "8px",
          }}
        >
          <Shield size={10} style={{ color: "rgba(255,255,255,0.18)" }} />
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.18)", fontWeight: 500 }}>
            Aether Messenger · Ваши данные надёжно защищены
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
