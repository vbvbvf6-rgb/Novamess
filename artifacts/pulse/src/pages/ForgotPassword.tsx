import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Zap, Shield, HelpCircle, Eye, EyeOff, CheckCircle2, AlertTriangle } from "lucide-react";
import PulseLogo from "@/components/PulseLogo";

type Step = "username" | "question" | "success" | "no-question";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("username");

  const [username, setUsername] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = username.trim().replace(/^@/, "");
    if (!raw) { setUsernameError("Введите никнейм"); return; }
    setUsernameLoading(true);
    setUsernameError("");
    try {
      const res = await fetch(`/api/auth/security-question?username=${encodeURIComponent(raw)}`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          setStep("no-question");
        } else {
          setUsernameError(data.error || "Пользователь не найден");
        }
        return;
      }
      setQuestion(data.question);
      setStep("question");
    } catch {
      setUsernameError("Ошибка подключения к серверу");
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) { setResetError("Введите ответ на контрольный вопрос"); return; }
    if (newPassword.length < 6) { setResetError("Пароль должен быть не менее 6 символов"); return; }
    if (newPassword !== confirmPassword) { setResetError("Пароли не совпадают"); return; }
    setResetLoading(true);
    setResetError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim().replace(/^@/, ""),
          answer: answer.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setResetError(data.error || "Ошибка сброса пароля"); return; }
      if (data.token) {
        sessionStorage.setItem("pulse-token", data.token);
        if (data.userId) {
          sessionStorage.setItem("pulse-user-id", String(data.userId));
          if (data.user) sessionStorage.setItem("pulse-user", JSON.stringify(data.user));
          sessionStorage.setItem("pulse-tab-owned", "1");
        }
      }
      setStep("success");
    } catch {
      setResetError("Ошибка подключения к серверу");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4 relative overflow-y-auto">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-75 animate-[pulseGlow_7s_ease-in-out_infinite_alternate]"
          style={{ background: "radial-gradient(circle, hsl(16 100% 50% / 0.22), transparent 70%)" }}
        />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[100px] opacity-65 animate-[pulseGlow_9s_ease-in-out_infinite_alternate-reverse]"
          style={{ background: "radial-gradient(circle, hsl(280 80% 60% / 0.16), transparent 70%)" }}
        />
        <div className="absolute top-[40%] left-[60%] w-[35%] h-[35%] rounded-full blur-[80px] opacity-50 animate-[pulseGlow_11s_ease-in-out_infinite_alternate]"
          style={{ background: "radial-gradient(circle, hsl(45 100% 55% / 0.12), transparent 70%)" }}
        />
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary/30"
            style={{
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
              left: `${10 + (i * 10.5) % 80}%`,
              top: `${8 + (i * 11.3) % 82}%`,
              animation: `pulseGlow ${4 + (i % 4)}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.55}s`,
              opacity: 0.3 + (i % 3) * 0.15,
            }}
          />
        ))}
      </div>

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
            className="w-16 h-16 sm:w-24 sm:h-24 rounded-[20px] sm:rounded-[28px] flex items-center justify-center mb-4 sm:mb-6 relative"
            style={{
              background: "linear-gradient(135deg, hsl(16 100% 50% / 0.15) 0%, hsl(16 100% 50% / 0.05) 100%)",
              border: "1px solid hsl(16 100% 50% / 0.2)",
              boxShadow: "0 0 40px hsl(16 100% 50% / 0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {step === "success" ? (
              <CheckCircle2 className="text-green-400 w-10 h-10" />
            ) : step === "question" ? (
              <HelpCircle className="text-primary w-10 h-10" />
            ) : (
              <PulseLogo size={48} />
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl font-black text-foreground tracking-tight leading-none mb-2">
              {step === "success" ? "Готово!" : step === "question" ? "Проверка" : "Aura"}
            </h1>
            <p className="text-muted-foreground text-[15px] font-medium">
              {step === "success"
                ? "Пароль успешно изменён"
                : step === "question"
                ? "Ответьте на контрольный вопрос"
                : "Восстановление доступа"}
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

            {/* ── STEP 1: enter username ── */}
            {step === "username" && (
              <motion.div
                key="username"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex items-center gap-3 mb-5 p-3 bg-secondary/50 rounded-2xl">
                  <div className="p-2 bg-orange-500/10 rounded-xl shrink-0">
                    <Shield size={18} className="text-orange-400" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-snug">
                    Введите никнейм — мы найдём ваш контрольный вопрос для сброса пароля.
                  </p>
                </div>

                <form onSubmit={handleUsernameSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                      Никнейм
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="@ваш_никнейм"
                      autoComplete="username"
                      autoFocus={typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches}
                      className="w-full bg-secondary/60 border border-border rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-[15px] font-medium"
                    />
                  </div>

                  <AnimatePresence>
                    {usernameError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2"
                      >
                        <AlertTriangle size={14} className="shrink-0" /> {usernameError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    disabled={usernameLoading || !username.trim()}
                    whileHover={{ scale: usernameLoading ? 1 : 1.01 }}
                    whileTap={{ scale: usernameLoading ? 1 : 0.98 }}
                    className="w-full text-primary-foreground font-black py-4 rounded-2xl transition-all disabled:opacity-50 text-[15px] mt-2"
                    style={{
                      background: usernameLoading
                        ? "hsl(var(--primary) / 0.7)"
                        : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(16 100% 42%) 100%)",
                      boxShadow: usernameLoading ? "none" : "0 8px 28px hsl(var(--primary) / 0.35)",
                    }}
                  >
                    {usernameLoading ? "Ищем аккаунт..." : "Продолжить"}
                  </motion.button>
                </form>
              </motion.div>
            )}

            {/* ── STEP 2: security question ── */}
            {step === "question" && (
              <motion.div
                key="question"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-5 p-3 bg-secondary/50 rounded-2xl">
                  <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                    Контрольный вопрос для @{username.trim().replace(/^@/, "")}
                  </p>
                  <p className="text-sm font-semibold text-foreground leading-snug">{question}</p>
                </div>

                <form onSubmit={handleReset} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                      Ваш ответ
                    </label>
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Введите ответ"
                      autoFocus={typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches}
                      className="w-full bg-secondary/60 border border-border rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-[15px] font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                      Новый пароль
                    </label>
                    <div className="relative">
                      <input
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Минимум 6 символов"
                        autoComplete="new-password"
                        className="w-full bg-secondary/60 border border-border rounded-2xl px-4 py-3.5 pr-12 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-[15px] font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                      Повторите пароль
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Повторите пароль"
                        autoComplete="new-password"
                        className="w-full bg-secondary/60 border border-border rounded-2xl px-4 py-3.5 pr-12 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-[15px] font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-destructive flex items-center gap-1 pl-1">
                        <AlertTriangle size={11} /> Пароли не совпадают
                      </p>
                    )}
                  </div>

                  <AnimatePresence>
                    {resetError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2"
                      >
                        <AlertTriangle size={14} className="shrink-0" /> {resetError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    disabled={resetLoading}
                    whileHover={{ scale: resetLoading ? 1 : 1.01 }}
                    whileTap={{ scale: resetLoading ? 1 : 0.98 }}
                    className="w-full text-primary-foreground font-black py-4 rounded-2xl transition-all disabled:opacity-50 text-[15px]"
                    style={{
                      background: resetLoading
                        ? "hsl(var(--primary) / 0.7)"
                        : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(16 100% 42%) 100%)",
                      boxShadow: resetLoading ? "none" : "0 8px 28px hsl(var(--primary) / 0.35)",
                    }}
                  >
                    {resetLoading ? "Сбрасываем..." : "Сбросить пароль"}
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => { setStep("username"); setAnswer(""); setNewPassword(""); setConfirmPassword(""); setResetError(""); }}
                    className="w-full text-sm font-bold text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    ← Назад
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── STEP: no security question set ── */}
            {step === "no-question" && (
              <motion.div
                key="no-question"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="text-center py-2"
              >
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                  <Shield size={30} className="text-orange-400" />
                </div>
                <h2 className="font-bold text-base mb-2">Нужна помощь с доступом?</h2>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  Для аккаунта <span className="text-foreground font-semibold">@{username.trim().replace(/^@/, "")}</span> не установлен контрольный вопрос. Обратитесь к администратору — он сбросит пароль вручную.
                </p>
                <div className="bg-secondary/50 rounded-2xl p-4 text-left mb-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-base">1</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-snug pt-1">
                      Напишите администратору свой никнейм и попросите сбросить пароль.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-base">2</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-snug pt-1">
                      После сброса войдите с новым паролем и установите контрольный вопрос в{" "}
                      <span className="text-foreground font-semibold">Настройки → Безопасность</span>.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setStep("username"); setUsernameError(""); }}
                  className="w-full text-sm font-bold text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  ← Попробовать другой никнейм
                </button>
              </motion.div>
            )}

            {/* ── STEP: success ── */}
            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="text-center py-2"
              >
                <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} className="text-green-400" />
                </div>
                <h2 className="font-bold text-base mb-2">Пароль изменён</h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Пароль для аккаунта <span className="text-foreground font-semibold">@{username.trim().replace(/^@/, "")}</span> успешно сброшен. Теперь вы можете войти с новым паролем.
                </p>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/")}
                  className="w-full text-primary-foreground font-black py-4 rounded-2xl transition-all text-[15px]"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(16 100% 42%) 100%)",
                    boxShadow: "0 8px 28px hsl(var(--primary) / 0.35)",
                  }}
                >
                  Войти в аккаунт
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>

          {step !== "success" && (
            <div className="mt-5 pt-5 border-t border-border text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                <ArrowLeft size={14} /> Вернуться к входу
              </Link>
            </div>
          )}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-[11px] text-muted-foreground/40 font-medium mt-6"
        >
          Aura Messenger · Ваши данные надёжно защищены
        </motion.p>
      </motion.div>
    </div>
  );
}
