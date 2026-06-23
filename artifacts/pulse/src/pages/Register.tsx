import React, { useState, useRef, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Calendar, ShieldAlert, ShieldCheck, AlertTriangle, Mail, KeyRound, Eye, EyeOff, Camera, Gift } from "lucide-react";
import PulseLogo from "@/components/PulseLogo";

async function compressAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("canvas not supported")); return; }
        const ratio = Math.min(img.width, img.height);
        const sx = (img.width - ratio) / 2;
        const sy = (img.height - ratio) / 2;
        ctx.drawImage(img, sx, sy, ratio, ratio, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface RegisterProps {
  onLogin: (userId: number) => void;
}

function getAgeFromDob(day: string, month: string, year: string): number | null {
  const d = parseInt(day), m = parseInt(month), y = parseInt(year);
  if (!d || !m || !y || y < 1900 || y > new Date().getFullYear()) return null;
  const dob = new Date(y, m - 1, d);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function ageToGroup(age: number): string {
  if (age < 14) return "5-13";
  if (age < 18) return "14-18";
  if (age < 30) return "18-30";
  return "30+";
}

type Step = "age-gate" | "age-blocked" | "age-warning" | "age-confirmed" | "register" | "verify-email";

export default function Register({ onLogin }: RegisterProps) {
  const [step, setStep] = useState<Step>("register");
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  const [ageGroup, setAgeGroup] = useState("");
  const [dobError, setDobError] = useState("");

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [verifyUserId, setVerifyUserId] = useState<number | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<any>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [referralCode, setReferralCode] = useState("");
  const [referralApplied, setReferralApplied] = useState(false);

  const search = useSearch();
  useEffect(() => {
    const params = new URLSearchParams(search);
    const ref = params.get("ref");
    if (ref) {
      setReferralCode(ref.toUpperCase());
      setReferralApplied(true);
    }
  }, [search]);

  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const [ageConfirmChecked, setAgeConfirmChecked] = useState(false);
  const [ageConfirmTerms, setAgeConfirmTerms] = useState(false);

  const handleDobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDobError("");
    if (!dobDay || !dobMonth || !dobYear) {
      setDobError("Введите дату рождения полностью");
      return;
    }
    const age = getAgeFromDob(dobDay, dobMonth, dobYear);
    if (age === null || age < 0 || age > 120) {
      setDobError("Введите корректную дату рождения");
      return;
    }
    setCalculatedAge(age);
    setAgeGroup(ageToGroup(age));
    setAgeConfirmChecked(false);
    setAgeConfirmTerms(false);
    if (age < 13) {
      setStep("age-blocked");
    } else if (age < 18) {
      setStep("age-warning");
    } else {
      setStep("age-confirmed");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !displayName.trim() || !password) {
      setError("Заполните все поля");
      return;
    }
    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    if (password.length < 8) {
      setError("Пароль должен быть не менее 8 символов");
      return;
    }
    if (username.length < 3) {
      setError("Никнейм должен быть не менее 3 символов");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Никнейм может содержать только буквы, цифры и _");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Неверный формат email");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          displayName: displayName.trim(),
          password,
          ageGroup,
          email: email.trim() || undefined,
          birthDate: dobYear && dobMonth && dobDay ? `${dobYear}-${String(dobMonth).padStart(2,"0")}-${String(dobDay).padStart(2,"0")}` : undefined,
          avatarUrl: avatarUrl || undefined,
          referralCode: referralCode.trim().toUpperCase() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка регистрации");
        return;
      }

      if (data.requiresEmailVerification) {
        setVerifyUserId(data.userId);
        setDevCode(data.emailVerificationCode);
        setPendingToken(data.token);
        setPendingUser(data.user);
        setStep("verify-email");
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

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) {
      setVerifyError("Введите код");
      return;
    }
    setVerifyLoading(true);
    setVerifyError("");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: verifyUserId, code: verifyCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyError(data.error || "Неверный код");
        return;
      }
      if (pendingToken) sessionStorage.setItem("pulse-token", pendingToken);
      if (verifyUserId) {
        sessionStorage.setItem("pulse-user-id", String(verifyUserId));
        sessionStorage.setItem("pulse-user", JSON.stringify({ ...pendingUser, emailVerified: true }));
        onLogin(verifyUserId);
      }
    } catch {
      setVerifyError("Ошибка подключения");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleSkipVerify = () => {
    if (pendingToken) sessionStorage.setItem("pulse-token", pendingToken);
    if (verifyUserId) {
      sessionStorage.setItem("pulse-user-id", String(verifyUserId));
      sessionStorage.setItem("pulse-user", JSON.stringify(pendingUser));
      onLogin(verifyUserId);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4 relative overflow-y-auto">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[120px] opacity-80 animate-[pulseGlow_6s_ease-in-out_infinite_alternate]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[65%] h-[65%] bg-violet-500/15 rounded-full blur-[100px] opacity-70 animate-[pulseGlow_8s_ease-in-out_infinite_alternate-reverse]" />
        <div className="absolute top-[35%] left-[55%] w-[35%] h-[35%] bg-amber-500/12 rounded-full blur-[80px] opacity-60 animate-[pulseGlow_10s_ease-in-out_infinite_alternate]" />
        <div className="absolute top-[65%] left-[5%] w-[25%] h-[25%] bg-blue-500/10 rounded-full blur-[60px] opacity-50 animate-[pulseGlow_12s_ease-in-out_infinite_alternate-reverse]" />
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary/25"
            style={{
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
              left: `${8 + (i * 8.5) % 84}%`,
              top: `${5 + (i * 9.7) % 88}%`,
              animation: `pulseGlow ${4 + (i % 5)}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.45}s`,
              opacity: 0.35 + (i % 4) * 0.15,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/20" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10 py-4"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-orange-500 to-amber-500 flex items-center justify-center shadow-2xl shadow-primary/40 mb-5 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-white/10 pointer-events-none" />
            <PulseLogo size={38} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <h1 className="text-4xl font-black tracking-tight text-foreground mb-1.5">Nova</h1>
            <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
              {step === "verify-email" ? "Подтверждение email" : "Новый аккаунт"}
            </p>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {step === "age-gate" && (
            <motion.div
              key="age-gate"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="w-full"
            >
              <form onSubmit={handleDobSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 text-center">
                    Дата рождения
                  </label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={31}
                        value={dobDay}
                        onChange={(e) => {
                          const v = e.target.value.slice(0, 2);
                          setDobDay(v);
                          if (v.length === 2) monthRef.current?.focus();
                        }}
                        placeholder="ДД"
                        className="w-full bg-card/50 border border-border rounded-2xl px-3 py-4 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-xl text-center font-black"
                        autoFocus={typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches}
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        ref={monthRef}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={12}
                        value={dobMonth}
                        onChange={(e) => {
                          const v = e.target.value.slice(0, 2);
                          setDobMonth(v);
                          if (v.length === 2) yearRef.current?.focus();
                        }}
                        placeholder="ММ"
                        className="w-full bg-card/50 border border-border rounded-2xl px-3 py-4 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-xl text-center font-black"
                      />
                    </div>
                    <div className="flex-[1.5]">
                      <input
                        ref={yearRef}
                        type="number"
                        inputMode="numeric"
                        min={1900}
                        max={new Date().getFullYear()}
                        value={dobYear}
                        onChange={(e) => setDobYear(e.target.value.slice(0, 4))}
                        placeholder="ГГГГ"
                        className="w-full bg-card/50 border border-border rounded-2xl px-3 py-4 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-xl text-center font-black"
                      />
                    </div>
                  </div>
                </div>

                {dobError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm font-semibold text-center"
                  >
                    {dobError}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={!dobDay || !dobMonth || !dobYear}
                  className="w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 hover:shadow-[0_0_30px_rgba(255,85,0,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none text-base"
                >
                  Продолжить
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Уже есть аккаунт?{" "}
                  <Link href="/login" className="text-primary hover:text-primary/80 transition-colors">
                    Войти
                  </Link>
                </p>
              </div>
            </motion.div>
          )}

          {step === "age-blocked" && (
            <motion.div
              key="age-blocked"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-destructive/30 rounded-3xl p-8 shadow-2xl text-center"
            >
              <div className="w-20 h-20 rounded-3xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-6">
                <ShieldAlert size={40} className="text-destructive" />
              </div>
              <h2 className="font-black text-2xl text-foreground mb-3">Доступ закрыт</h2>
              <p className="text-sm font-medium text-muted-foreground mb-6 leading-relaxed">
                Вам <span className="text-foreground">{calculatedAge} {calculatedAge === 1 ? "год" : "лет"}</span>. Nova предназначен для пользователей старше 13 лет.
              </p>
              <button
                onClick={() => { setDobDay(""); setDobMonth(""); setDobYear(""); setStep("age-gate"); }}
                className="w-full py-4 rounded-2xl border border-border text-sm font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              >
                Вернуться назад
              </button>
            </motion.div>
          )}

          {step === "age-warning" && (
            <motion.div
              key="age-warning"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-yellow-500/30 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle size={28} className="text-yellow-500" />
                </div>
                <div>
                  <h2 className="font-black text-lg text-foreground leading-tight mb-1">Согласие<br/>родителей</h2>
                  <p className="text-xs font-bold text-yellow-500 uppercase tracking-wider">{calculatedAge} лет</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={ageConfirmChecked}
                    onChange={(e) => setAgeConfirmChecked(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded accent-primary cursor-pointer shrink-0"
                  />
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
                    Мой родитель или опекун знает о регистрации и дал своё согласие.
                  </span>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setDobDay(""); setDobMonth(""); setDobYear(""); setAgeConfirmChecked(false); setStep("age-gate"); }}
                  className="flex-1 py-4 rounded-2xl border border-border text-sm font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                >
                  Назад
                </button>
                <button
                  disabled={!ageConfirmChecked}
                  onClick={() => setStep("register")}
                  className="flex-[2] py-4 rounded-2xl bg-yellow-500 text-yellow-950 font-black text-sm hover:bg-yellow-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(234,179,8,0.2)]"
                >
                  Продолжить
                </button>
              </div>
            </motion.div>
          )}

          {step === "age-confirmed" && (
            <motion.div
              key="age-confirmed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-green-500/30 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                  <ShieldCheck size={28} className="text-green-500" />
                </div>
                <div>
                  <h2 className="font-black text-lg text-foreground leading-tight mb-1">Возраст<br/>подтверждён</h2>
                  <p className="text-xs font-bold text-green-500 uppercase tracking-wider">{calculatedAge} лет</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={ageConfirmChecked}
                    onChange={(e) => setAgeConfirmChecked(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded accent-green-500 cursor-pointer shrink-0"
                  />
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
                    Мне больше 18 лет, и указанная дата рождения верна.
                  </span>
                </label>

                <label className="flex items-start gap-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={ageConfirmTerms}
                    onChange={(e) => setAgeConfirmTerms(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded accent-green-500 cursor-pointer shrink-0"
                  />
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
                    Я принимаю <a href="/terms" className="text-green-500 underline underline-offset-2 hover:text-green-400 transition-colors" onClick={e => e.stopPropagation()}>Пользовательское соглашение</a> и <a href="/privacy" className="text-green-500 underline underline-offset-2 hover:text-green-400 transition-colors" onClick={e => e.stopPropagation()}>Политику конфиденциальности</a> Nova.
                  </span>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setDobDay(""); setDobMonth(""); setDobYear(""); setStep("age-gate"); }}
                  className="flex-1 py-4 rounded-2xl border border-border text-sm font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                >
                  Назад
                </button>
                <button
                  disabled={!ageConfirmChecked || !ageConfirmTerms}
                  onClick={() => setStep("register")}
                  className="flex-[2] py-4 rounded-2xl bg-green-500 text-green-950 font-black text-sm hover:bg-green-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                >
                  Продолжить
                </button>
              </div>
            </motion.div>
          )}

          {step === "register" && (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="w-full"
            >
              <div className="flex flex-col items-center mb-6">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const compressed = await compressAvatar(file);
                      setAvatarUrl(compressed);
                    } catch {}
                  }}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-primary/40 hover:border-primary transition-all group"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-full h-full bg-card/60 flex flex-col items-center justify-center gap-1">
                      <Camera size={24} className="text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-[10px] font-bold text-muted-foreground group-hover:text-primary transition-colors uppercase tracking-wide">Фото</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera size={20} className="text-white" />
                  </div>
                </button>
                <p className="text-[11px] text-muted-foreground/60 mt-2">Нажмите, чтобы добавить фото</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Никнейм</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="только_латиница_и_цифры"
                    autoComplete="username"
                    autoFocus={typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches}
                    className="w-full bg-card/50 border border-border rounded-2xl px-5 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-base font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Имя</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Как вас зовут?"
                    autoComplete="name"
                    className="w-full bg-card/50 border border-border rounded-2xl px-5 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-base font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 pl-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email</label>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">необязательно</span>
                  </div>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      autoComplete="email"
                      className="w-full bg-card/50 border border-border rounded-2xl pl-11 pr-5 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-base font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 pl-1">Для восстановления доступа и безопасности</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Пароль</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Минимум 8 символов"
                      autoComplete="new-password"
                      className="w-full bg-card/50 border border-border rounded-2xl px-5 py-4 pr-14 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-base font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Пароль еще раз</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full bg-card/50 border border-border rounded-2xl px-5 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-base font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 pl-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Реферальный код</label>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-500 border border-green-500/20">необязательно</span>
                  </div>
                  <div className="relative">
                    <Gift size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none ${referralApplied ? "text-green-500" : "text-muted-foreground"}`} />
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => {
                        const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
                        setReferralCode(v);
                        setReferralApplied(false);
                      }}
                      placeholder="XXXXXXXX"
                      className={`w-full bg-card/50 border rounded-2xl pl-11 pr-5 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-all text-base font-mono font-bold tracking-widest ${
                        referralApplied
                          ? "border-green-500/50 focus:border-green-500 focus:ring-green-500 text-green-500"
                          : "border-border focus:border-primary focus:ring-primary"
                      }`}
                    />
                    {referralApplied && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded-lg">✓ Применён</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 pl-1">Введите код друга, который пригласил вас</p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm font-semibold text-center"
                  >
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 hover:shadow-[0_0_30px_rgba(255,85,0,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none text-base mt-2"
                >
                  {loading ? "Создаем..." : "Создать аккаунт"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Уже есть аккаунт?{" "}
                  <Link href="/login" className="text-primary hover:text-primary/80 transition-colors">
                    Войти
                  </Link>
                </p>
              </div>

              <p className="mt-4 text-center text-[11px] text-muted-foreground/60 leading-relaxed">
                Регистрируясь, вы принимаете{" "}
                <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors underline underline-offset-2">
                  Условия использования
                </Link>{" "}
                и{" "}
                <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors underline underline-offset-2">
                  Политику конфиденциальности
                </Link>{" "}
                Nova. Ваши данные защищены в соответствии с GDPR и ФЗ-152.
              </p>
            </motion.div>
          )}

          {step === "verify-email" && (
            <motion.div
              key="verify-email"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full"
            >
              <div className="bg-card border border-primary/20 rounded-3xl p-8 shadow-2xl">
                <div className="flex flex-col items-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    <Mail size={32} className="text-primary" />
                  </div>
                  <h2 className="font-black text-xl text-foreground text-center">Проверьте почту</h2>
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    Код отправлен на <span className="text-foreground font-bold">{email}</span>
                  </p>
                </div>

                {devCode && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3 mb-5 text-center"
                  >
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Ваш код (тестовый режим)</p>
                    <p className="text-3xl font-black text-primary tracking-[0.3em]">{devCode}</p>
                  </motion.div>
                )}

                <form onSubmit={handleVerifyEmail} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Код подтверждения</label>
                    <div className="relative">
                      <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        autoFocus={typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches}
                        className="w-full bg-card/50 border border-border rounded-2xl pl-11 pr-5 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-xl text-center font-black tracking-widest"
                      />
                    </div>
                  </div>

                  {verifyError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm font-semibold text-center"
                    >
                      {verifyError}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={verifyLoading || verifyCode.length !== 6}
                    className="w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 hover:shadow-[0_0_30px_rgba(255,85,0,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none text-base"
                  >
                    {verifyLoading ? "Проверяем..." : "Подтвердить"}
                  </button>
                </form>

                <button
                  onClick={handleSkipVerify}
                  className="w-full mt-3 py-3 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Пропустить — войти без подтверждения
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
