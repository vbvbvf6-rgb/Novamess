import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, CheckCircle2, Mail, KeyRound, HelpCircle, ShieldCheck } from "lucide-react";
import PulseLogo from "@/components/PulseLogo";

type Step = "username" | "choose" | "email-code" | "question" | "new-password" | "success";
type Method = "email" | "question";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(2, local.length - 2))}@${domain}`;
}

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("username");
  const [method, setMethod] = useState<Method>("email");

  // username step
  const [username, setUsername] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  // user info from lookup
  const [userId, setUserId] = useState<number | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [hasEmail, setHasEmail] = useState(false);
  const [hasQuestion, setHasQuestion] = useState(false);
  const [question, setQuestion] = useState("");

  // email code step
  const [code, setCode] = useState("");
  const [codeError, setCcodeError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMsg, setResendMsg] = useState("");

  // question step
  const [answer, setAnswer] = useState("");
  const [questionError, setQuestionError] = useState("");
  const [questionLoading, setQuestionLoading] = useState(false);

  // new-password step (shared)
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Step 1 — look up user and send email code if they have one
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = username.trim().replace(/^@/, "");
    if (!raw) { setUsernameError("Введите никнейм"); return; }
    setUsernameLoading(true);
    setUsernameError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: raw }),
      });
      const data = await res.json();
      if (!res.ok) { setUsernameError(data.error || "Пользователь не найден"); return; }

      setUserId(data.userId);
      setHasEmail(data.hasEmail);
      setMaskedEmail(data.maskedEmail ?? null);
      setHasQuestion(data.hasSecurityQuestion);
      setQuestion(data.securityQuestion ?? "");

      if (data.hasEmail && data.hasSecurityQuestion) {
        setStep("choose");
      } else if (data.hasEmail) {
        setMethod("email");
        setResendCooldown(60);
        setStep("email-code");
      } else if (data.hasSecurityQuestion) {
        setMethod("question");
        setStep("question");
      } else {
        setUsernameError("У этого аккаунта не указан email и не задан контрольный вопрос. Восстановление невозможно.");
      }
    } catch {
      setUsernameError("Ошибка подключения к серверу");
    } finally {
      setUsernameLoading(false);
    }
  };

  const chooseEmail = async () => {
    setMethod("email");
    setResendCooldown(60);
    setStep("email-code");
  };

  const chooseQuestion = () => {
    setMethod("question");
    setStep("question");
  };

  // Resend email code
  const handleResend = async () => {
    if (resendCooldown > 0 || !userId) return;
    setResendMsg("");
    setCcodeError("");
    try {
      const res = await fetch("/api/auth/forgot-password/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) { setCcodeError(data.error || "Не удалось отправить"); return; }
      setResendMsg("Код отправлен повторно");
      setResendCooldown(60);
    } catch {
      setCcodeError("Ошибка подключения");
    }
  };

  // Step 3a — verify email code
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) { setCcodeError("Введите 6-значный код"); return; }
    setCodeLoading(true);
    setCcodeError("");
    try {
      const res = await fetch("/api/auth/reset-password-via-email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setCcodeError(data.error || "Неверный код"); return; }
      setResetToken(data.resetToken);
      setStep("new-password");
    } catch {
      setCcodeError("Ошибка подключения");
    } finally {
      setCodeLoading(false);
    }
  };

  // Step 3b — verify security question answer
  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) { setQuestionError("Введите ответ"); return; }
    setQuestionLoading(true);
    setQuestionError("");
    try {
      const res = await fetch("/api/auth/reset-password/verify-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, answer: answer.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setQuestionError(data.error || "Неверный ответ"); return; }
      setResetToken(data.resetToken);
      setStep("new-password");
    } catch {
      setQuestionError("Ошибка подключения");
    } finally {
      setQuestionLoading(false);
    }
  };

  // Step 4 — set new password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { setPasswordError("Пароль должен быть не менее 8 символов"); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Пароли не совпадают"); return; }
    setPasswordLoading(true);
    setPasswordError("");
    try {
      const res = await fetch("/api/auth/reset-password-final", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setPasswordError(data.error || "Ошибка сброса пароля"); return; }
      if (data.token) {
        sessionStorage.setItem("pulse-token", data.token);
        if (data.userId) sessionStorage.setItem("pulse-user-id", String(data.userId));
        if (data.user) sessionStorage.setItem("pulse-user", JSON.stringify(data.user));
        sessionStorage.setItem("pulse-tab-owned", "1");
      }
      setStep("success");
    } catch {
      setPasswordError("Ошибка подключения");
    } finally {
      setPasswordLoading(false);
    }
  };

  const bg = (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-75 animate-[pulseGlow_7s_ease-in-out_infinite_alternate]"
        style={{ background: "radial-gradient(circle, hsl(16 100% 50% / 0.22), transparent 70%)" }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[100px] opacity-65 animate-[pulseGlow_9s_ease-in-out_infinite_alternate-reverse]"
        style={{ background: "radial-gradient(circle, hsl(262 80% 55% / 0.18), transparent 70%)" }} />
    </div>
  );

  const cardClass = "w-full max-w-sm relative z-10";
  const inputClass = "w-full bg-card/50 border border-border rounded-2xl px-5 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-[15px] font-medium";
  const btnClass = "w-full text-primary-foreground font-black py-4 rounded-2xl transition-all text-[15px] disabled:opacity-50";

  const ErrorBox = ({ msg }: { msg: string }) => msg ? (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
      className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm font-semibold text-center">
      {msg}
    </motion.div>
  ) : null;

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4 relative overflow-y-auto">
      {bg}

      <motion.div className={cardClass} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-blue-500 to-blue-400 flex items-center justify-center shadow-xl shadow-primary/30 mb-4">
            <PulseLogo size={30} />
          </div>
          <h1 className="text-2xl font-black text-foreground">Восстановление пароля</h1>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Step 1: username ── */}
          {step === "username" && (
            <motion.div key="username" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <form onSubmit={handleUsernameSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Никнейм</label>
                  <input
                    type="text" value={username}
                    onChange={e => setUsername(e.target.value.replace(/^@/, ""))}
                    placeholder="@nickname" autoFocus
                    className={inputClass}
                  />
                </div>
                <AnimatePresence><ErrorBox msg={usernameError} /></AnimatePresence>
                <button type="submit" disabled={usernameLoading || !username.trim()} className={btnClass}
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(16 100% 42%) 100%)", boxShadow: "0 8px 28px hsl(var(--primary) / 0.35)" }}>
                  {usernameLoading ? "Проверяем..." : "Продолжить →"}
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Step 2: choose method ── */}
          {step === "choose" && (
            <motion.div key="choose" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <p className="text-sm text-muted-foreground text-center mb-2">Как хотите восстановить доступ?</p>

              <button onClick={chooseEmail}
                className="w-full bg-primary/10 border border-primary/30 hover:bg-primary/20 rounded-2xl p-4 text-left transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <Mail size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">Код на почту</p>
                    <p className="text-xs text-muted-foreground">{maskedEmail}</p>
                  </div>
                </div>
              </button>

              <button onClick={chooseQuestion}
                className="w-full bg-card/50 border border-border hover:bg-card/80 rounded-2xl p-4 text-left transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                    <HelpCircle size={18} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">Контрольный вопрос</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{question}</p>
                  </div>
                </div>
              </button>
            </motion.div>
          )}

          {/* ── Step 3a: email code ── */}
          {step === "email-code" && (
            <motion.div key="email-code" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex flex-col items-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-3">
                  <Mail size={24} className="text-primary" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Код отправлен на <span className="font-semibold text-foreground">{maskedEmail}</span>
                </p>
              </div>
              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <input
                  type="text" inputMode="numeric" maxLength={6}
                  value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000" autoFocus
                  className="w-full bg-card/50 border border-border rounded-2xl px-5 py-4 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-center text-2xl font-black tracking-[0.5em]"
                />
                <AnimatePresence><ErrorBox msg={codeError} /></AnimatePresence>
                {resendMsg && !codeError && <p className="text-sm text-green-500 text-center font-semibold">{resendMsg}</p>}
                <button type="submit" disabled={codeLoading || code.length !== 6} className={btnClass}
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(16 100% 42%) 100%)", boxShadow: "0 8px 28px hsl(var(--primary) / 0.35)" }}>
                  <span className="flex items-center justify-center gap-2">
                    <ShieldCheck size={18} />
                    {codeLoading ? "Проверяем..." : "Подтвердить"}
                  </span>
                </button>
              </form>
              <div className="mt-4 flex flex-col items-center gap-2">
                <button onClick={handleResend} disabled={resendCooldown > 0}
                  className="text-sm text-primary hover:text-primary/80 transition-colors disabled:text-muted-foreground disabled:cursor-not-allowed">
                  {resendCooldown > 0 ? `Отправить ещё раз (${resendCooldown}с)` : "Отправить код ещё раз"}
                </button>
                {hasQuestion && (
                  <button onClick={chooseQuestion} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Использовать контрольный вопрос →
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Step 3b: security question ── */}
          {step === "question" && (
            <motion.div key="question" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex flex-col items-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <HelpCircle size={24} className="text-muted-foreground" />
                </div>
              </div>
              <form onSubmit={handleQuestionSubmit} className="space-y-4">
                <div className="bg-muted/30 rounded-2xl p-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Контрольный вопрос</p>
                  <p className="text-sm font-semibold text-foreground">{question}</p>
                </div>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" value={answer} onChange={e => setAnswer(e.target.value)}
                    placeholder="Ваш ответ..." autoFocus
                    className="w-full bg-card/50 border border-border rounded-2xl pl-11 pr-5 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-[15px] font-medium" />
                </div>
                <AnimatePresence><ErrorBox msg={questionError} /></AnimatePresence>
                <button type="submit" disabled={questionLoading || !answer.trim()} className={btnClass}
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(16 100% 42%) 100%)", boxShadow: "0 8px 28px hsl(var(--primary) / 0.35)" }}>
                  {questionLoading ? "Проверяем..." : "Продолжить →"}
                </button>
              </form>
              {hasEmail && (
                <div className="mt-4 text-center">
                  <button onClick={chooseEmail} className="text-xs text-primary hover:text-primary/80 transition-colors">
                    ← Получить код на {maskedEmail}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Step 4: new password ── */}
          {step === "new-password" && (
            <motion.div key="new-password" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex flex-col items-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-3">
                  <ShieldCheck size={24} className="text-primary" />
                </div>
                <p className="text-sm text-muted-foreground text-center">Придумайте новый пароль</p>
              </div>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="relative">
                  <input type={showNew ? "text" : "password"} value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Новый пароль (мин. 8 символов)" autoFocus
                    className={inputClass + " pr-14"} />
                  <button type="button" onClick={() => setShowNew(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="relative">
                  <input type={showConfirm ? "text" : "password"} value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Повторите пароль"
                    className={inputClass + " pr-14"} />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <AnimatePresence><ErrorBox msg={passwordError} /></AnimatePresence>
                <button type="submit" disabled={passwordLoading || !newPassword || !confirmPassword} className={btnClass}
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(16 100% 42%) 100%)", boxShadow: "0 8px 28px hsl(var(--primary) / 0.35)" }}>
                  {passwordLoading ? "Сохраняем..." : "Сохранить новый пароль"}
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Step 5: success ── */}
          {step === "success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-2">
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-green-400" />
              </div>
              <h2 className="font-bold text-lg mb-2">Пароль изменён!</h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Пароль для <span className="text-foreground font-semibold">@{username.trim().replace(/^@/, "")}</span> успешно сброшен.
              </p>
              <button onClick={() => navigate("/")} className={btnClass}
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(16 100% 42%) 100%)", boxShadow: "0 8px 28px hsl(var(--primary) / 0.35)" }}>
                Войти в аккаунт
              </button>
            </motion.div>
          )}

        </AnimatePresence>

        {step !== "success" && (
          <div className="mt-6 pt-5 border-t border-border text-center">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
              <ArrowLeft size={14} /> Вернуться к входу
            </Link>
          </div>
        )}

        <p className="text-center text-[11px] text-muted-foreground/40 font-medium mt-6">
          Nova Messenger · Ваши данные надёжно защищены
        </p>
      </motion.div>
    </div>
  );
}
