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
    background: focusedInput === name ? "rgba(249,115,22,0.04)" : "#f8fafc",
    border: `1px solid ${focusedInput === name ? "rgba(249,115,22,0.5)" : "rgba(0,0,0,0.08)"}`,
    borderRadius: "14px",
    transition: "all 0.2s",
    boxShadow: focusedInput === name ? "0 0 0 3px rgba(249,115,22,0.1)" : "none",
  } as React.CSSProperties);

  const getStepIcon = () => {
    if (step === "2fa") return <ShieldCheck size={34} style={{ color: "#f97316" }} />;
    if (step === "qr") return <QrCode size={34} style={{ color: "#f97316" }} />;
    return <Zap size={36} style={{ color: "#f97316" }} />;
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

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f5f7fa",
      fontFamily: "'Inter', system-ui, sans-serif",
      position: "relative",
      overflow: "hidden",
      padding: "16px",
    }}>
      {/* Subtle background pattern */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle at 20% 20%, rgba(249,115,22,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(249,115,22,0.03) 0%, transparent 50%)",
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
              width: "72px", height: "72px", borderRadius: "20px",
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: "20px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02)",
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
              fontSize: "36px", fontWeight: 900, letterSpacing: "-1.5px",
              color: "#111827", marginBottom: "4px", lineHeight: 1,
            }}>
              {getStepTitle()}
            </h1>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <div style={{ height: "1px", width: "24px", background: "rgba(0,0,0,0.1)" }} />
              <p style={{ color: "rgba(0,0,0,0.4)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em" }}>
                {getStepSubtitle().toUpperCase()}
              </p>
              <div style={{ height: "1px", width: "24px", background: "rgba(0,0,0,0.1)" }} />
            </div>
          </motion.div>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          style={{
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.06)",
            borderRadius: "24px",
            padding: "28px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)",
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
                      color: "rgba(0,0,0,0.4)", marginBottom: "9px", paddingLeft: "2px",
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
                          padding: "14px 16px", color: "rgba(0,0,0,0.85)", fontSize: "15px",
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
                        textTransform: "uppercase", color: "rgba(0,0,0,0.4)",
                      }}>Пароль</label>
                      <Link href="/forgot-password">
                        <button type="button" style={{
                          fontSize: "12px", color: "#ea580c", fontWeight: 700,
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
                          padding: "14px 48px 14px 16px", color: "rgba(0,0,0,0.85)",
                          fontSize: "15px", fontWeight: 500, boxSizing: "border-box",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
                          background: "none", border: "none", cursor: "pointer",
                          color: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center",
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
                      background: loading ? "rgba(234,88,12,0.5)" : "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
                      color: "white", fontSize: "15px", fontWeight: 800,
                      boxShadow: loading ? "none" : "0 4px 16px rgba(234,88,12,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                      marginTop: "2px", opacity: loading ? 0.7 : 1, transition: "opacity 0.2s",
                    }}
                  >
                    {loading ? "Входим..." : "Войти"}
                  </motion.button>
                </form>

                <div style={{ marginTop: "18px", paddingTop: "18px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <motion.button
                    type="button"
                    onClick={startQrLogin}
                    whileHover={{ background: "rgba(0,0,0,0.04)" }}
                    style={{
                      width: "100%", padding: "13px", borderRadius: "14px",
                      background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.06)",
                      cursor: "pointer", color: "rgba(0,0,0,0.5)", fontSize: "13px", fontWeight: 600,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                      transition: "background 0.15s",
                    }}
                  >
                    <QrCode size={15} style={{ color: "rgba(234,88,12,0.8)" }} />
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
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "rgba(0,0,0,0.45)", lineHeight: 1.6 }}>
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
                        padding: "20px 16px", color: "rgba(0,0,0,0.85)",
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
                      background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
                      color: "white", fontSize: "15px", fontWeight: 800,
                      boxShadow: "0 4px 16px rgba(234,88,12,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
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
                      color: "rgba(0,0,0,0.35)", fontSize: "13px", fontWeight: 700,
                      padding: "8px", textAlign: "center", transition: "color 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = "rgba(0,0,0,0.7)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(0,0,0,0.35)")}
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
                    <p style={{ fontSize: "13px", color: "rgba(0,0,0,0.4)", fontWeight: 500 }}>QR-код истёк</p>
                    <motion.button
                      onClick={startQrLogin}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "10px 20px", borderRadius: "14px",
                        background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.3)",
                        color: "#ea580c", fontSize: "13px", fontWeight: 700, cursor: "pointer",
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
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "rgba(0,0,0,0.85)" }}>Вход подтверждён!</p>
                    <p style={{ fontSize: "12px", color: "rgba(0,0,0,0.35)" }}>Выполняем вход...</p>
                  </div>
                ) : (
                  <>
                    <p style={{
                      fontSize: "13px", color: "rgba(0,0,0,0.4)", fontWeight: 500,
                      textAlign: "center", marginBottom: "18px", lineHeight: 1.6,
                    }}>
                      Откройте Pulse на другом устройстве и отсканируйте код
                    </p>

                    <div style={{
                      padding: "12px", borderRadius: "20px", marginBottom: "12px", position: "relative",
                      background: "#f8fafc", border: "1px solid rgba(0,0,0,0.08)",
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
                        <div style={{ width: "168px", height: "168px", borderRadius: "12px", background: "rgba(0,0,0,0.04)" }} />
                      )}
                      <motion.div
                        style={{
                          position: "absolute", inset: "12px", borderRadius: "12px",
                          border: "2px solid rgba(249,115,22,0.35)", pointerEvents: "none",
                        }}
                        animate={{ opacity: [0.3, 0.8, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "rgba(0,0,0,0.35)", fontWeight: 500, marginBottom: "18px" }}>
                      <Clock size={11} style={{ color: "rgba(249,115,22,0.7)" }} />
                      <span>Код действителен {formatTime(qrTimeLeft)}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "12px", color: "rgba(0,0,0,0.3)" }}>
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
                whileHover={{ background: "rgba(0,0,0,0.04)" }}
                style={{
                  width: "100%", padding: "15px", borderRadius: "20px",
                  background: "transparent", border: "1px solid rgba(0,0,0,0.12)",
                  cursor: "pointer", color: "rgba(0,0,0,0.65)", fontSize: "15px", fontWeight: 700,
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
          <Shield size={10} style={{ color: "rgba(0,0,0,0.2)" }} />
          <p style={{ fontSize: "11px", color: "rgba(0,0,0,0.2)", fontWeight: 500 }}>
            Pulse Messenger · Ваши данные надёжно защищены
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
