import React, { useState, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Eye, EyeOff, Zap, ShieldAlert, ShieldCheck, AlertTriangle, ArrowLeft, Calendar } from "lucide-react";

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

type Step = "age-gate" | "age-blocked" | "age-warning" | "age-confirmed" | "register";

export default function Register({ onLogin }: RegisterProps) {
  const [step, setStep] = useState<Step>("age-gate");
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  const [ageGroup, setAgeGroup] = useState("");
  const [dobError, setDobError] = useState("");

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

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
    if (age < 13) {
      setStep("age-blocked");
    } else if (age < 18) {
      setStep("age-warning");
    } else {
      setStep("age-confirmed");
      setTimeout(() => setStep("register"), 1400);
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
    if (password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка регистрации");
        return;
      }
      localStorage.setItem("pulse-user-id", String(data.userId));
      localStorage.setItem("pulse-user", JSON.stringify(data.user));
      onLogin(data.userId);
    } catch {
      setError("Ошибка подключения к серверу");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
            className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center shadow-[0_0_40px_rgba(0,188,212,0.5)] mb-4"
          >
            <MessageCircle className="text-white" size={40} />
          </motion.div>
          <h1 className="text-3xl font-black text-white">Pulse</h1>
          <p className="text-muted-foreground text-sm mt-1">Создайте аккаунт</p>
        </div>

        <AnimatePresence mode="wait">

          {/* STEP 1: Age gate — enter date of birth */}
          {step === "age-gate" && (
            <motion.div
              key="age-gate"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="bg-card border border-border rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar size={22} className="text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-foreground">Подтверждение возраста</h2>
                  <p className="text-xs text-muted-foreground">Введите вашу дату рождения</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Мы используем эти данные только для определения возрастной категории. Дата рождения не хранится и никому не передаётся.
              </p>

              <form onSubmit={handleDobSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Дата рождения
                  </label>
                  <div className="flex gap-2">
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
                        className="w-full bg-background border border-border rounded-xl px-3 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm text-center font-bold"
                        autoFocus
                      />
                      <p className="text-center text-[10px] text-muted-foreground mt-1">День</p>
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
                        className="w-full bg-background border border-border rounded-xl px-3 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm text-center font-bold"
                      />
                      <p className="text-center text-[10px] text-muted-foreground mt-1">Месяц</p>
                    </div>
                    <div className="flex-[1.6]">
                      <input
                        ref={yearRef}
                        type="number"
                        inputMode="numeric"
                        min={1900}
                        max={new Date().getFullYear()}
                        value={dobYear}
                        onChange={(e) => setDobYear(e.target.value.slice(0, 4))}
                        placeholder="ГГГГ"
                        className="w-full bg-background border border-border rounded-xl px-3 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm text-center font-bold"
                      />
                      <p className="text-center text-[10px] text-muted-foreground mt-1">Год</p>
                    </div>
                  </div>
                </div>

                {dobError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-2.5 text-sm font-medium"
                  >
                    {dobError}
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!dobDay || !dobMonth || !dobYear}
                  className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-[0_0_20px_rgba(0,188,212,0.3)] text-base"
                >
                  Подтвердить возраст
                </motion.button>
              </form>

              <div className="mt-5 text-center">
                <p className="text-sm text-muted-foreground">
                  Уже есть аккаунт?{" "}
                  <Link href="/login" className="text-primary font-semibold hover:underline">
                    Войти
                  </Link>
                </p>
              </div>
            </motion.div>
          )}

          {/* STEP: Blocked (under 13) */}
          {step === "age-blocked" && (
            <motion.div
              key="age-blocked"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-destructive/30 rounded-3xl p-6 shadow-2xl text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert size={36} className="text-destructive" />
              </div>
              <h2 className="font-black text-xl text-foreground mb-2">Доступ ограничен</h2>
              <p className="text-sm text-muted-foreground mb-1">
                Вам <span className="font-bold text-foreground">{calculatedAge} {calculatedAge === 1 ? "год" : "лет"}</span>.
              </p>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                Pulse предназначен для пользователей от 13 лет. Дети до 13 лет не могут создавать аккаунт без разрешения родителей.
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 mb-5 text-left">
                <p className="text-xs font-bold text-destructive uppercase tracking-wider mb-1">Что делать?</p>
                <p className="text-sm text-muted-foreground">Попросите родителя или законного опекуна создать аккаунт и контролировать использование.</p>
              </div>
              <button
                onClick={() => { setDobDay(""); setDobMonth(""); setDobYear(""); setStep("age-gate"); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                <ArrowLeft size={16} /> Ввести другую дату
              </button>
            </motion.div>
          )}

          {/* STEP: Warning (13-17) — needs parental confirmation */}
          {step === "age-warning" && (
            <motion.div
              key="age-warning"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-yellow-500/30 rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle size={26} className="text-yellow-400" />
                </div>
                <div>
                  <h2 className="font-black text-base text-foreground">Родительский контроль</h2>
                  <p className="text-xs text-yellow-400 font-semibold">Возраст: {calculatedAge} лет</p>
                </div>
              </div>

              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 mb-4 space-y-2 text-sm text-muted-foreground">
                <p className="leading-relaxed">
                  Pulse разрешён для подростков <span className="font-semibold text-foreground">от 13 лет</span>, но рекомендуется использование под наблюдением родителей.
                </p>
                <p className="leading-relaxed">
                  Регистрируясь, вы подтверждаете, что ваш родитель или опекун <span className="font-semibold text-foreground">осведомлён и согласен</span> с созданием аккаунта.
                </p>
              </div>

              <div className="space-y-2.5">
                <label className="flex items-start gap-3 cursor-pointer group" id="consent-label">
                  <input
                    type="checkbox"
                    id="parental-consent"
                    className="mt-0.5 w-5 h-5 rounded accent-primary cursor-pointer shrink-0"
                    onChange={(e) => {
                      const btn = document.getElementById("confirm-age-btn") as HTMLButtonElement;
                      if (btn) btn.disabled = !e.target.checked;
                    }}
                  />
                  <span className="text-sm text-foreground leading-snug">
                    Мой родитель / опекун знает о регистрации и дал согласие
                  </span>
                </label>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setDobDay(""); setDobMonth(""); setDobYear(""); setStep("age-gate"); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                >
                  <ArrowLeft size={15} /> Назад
                </button>
                <button
                  id="confirm-age-btn"
                  disabled
                  onClick={() => setStep("register")}
                  className="flex-1 py-3 rounded-xl bg-yellow-500 text-black font-bold text-sm hover:bg-yellow-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Подтверждаю → Далее
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP: Age confirmed (18+) — brief success flash */}
          {step === "age-confirmed" && (
            <motion.div
              key="age-confirmed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="bg-card border border-green-500/30 rounded-3xl p-8 shadow-2xl text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, delay: 0.1 }}
                className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4"
              >
                <ShieldCheck size={36} className="text-green-400" />
              </motion.div>
              <h2 className="font-black text-xl text-foreground mb-1">Возраст подтверждён</h2>
              <p className="text-sm text-muted-foreground">Вам {calculatedAge} лет — всё в порядке!</p>
            </motion.div>
          )}

          {/* STEP: Main registration form */}
          {step === "register" && (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="bg-card border border-border rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <ShieldCheck size={13} className="text-green-400" />
                </div>
                <span className="text-xs text-green-400 font-semibold">
                  Возраст подтверждён · {calculatedAge} лет ({ageGroup})
                </span>
              </div>

              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Никнейм</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="только_латиница_и_цифры"
                    autoComplete="username"
                    autoFocus
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Имя</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ваше имя"
                    autoComplete="name"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Пароль</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Минимум 6 символов"
                      autoComplete="new-password"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Подтвердите пароль</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повторите пароль"
                    autoComplete="new-password"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm font-medium"
                  >
                    {error}
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60 shadow-[0_0_20px_rgba(0,188,212,0.3)] text-base mt-1"
                >
                  {loading ? "Создаём..." : "Создать аккаунт"}
                </motion.button>
              </form>

              <div className="mt-5 text-center">
                <p className="text-sm text-muted-foreground">
                  Уже есть аккаунт?{" "}
                  <Link href="/login" className="text-primary font-semibold hover:underline">
                    Войти
                  </Link>
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Zap size={12} className="text-primary" />
          <span>Powered by Pulse</span>
        </div>
      </motion.div>
    </div>
  );
}
