import React, { useState, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Calendar, ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";
import PulseLogo from "@/components/PulseLogo";

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
  const [step, setStep] = useState<Step>("register");
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
          birthDate: dobYear && dobMonth && dobDay ? `${dobYear}-${String(dobMonth).padStart(2,"0")}-${String(dobDay).padStart(2,"0")}` : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка регистрации");
        return;
      }
      if (data.token) localStorage.setItem("pulse-token", data.token);
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[10%] right-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] left-[10%] w-[40%] h-[40%] bg-orange-600/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
            className="w-24 h-24 rounded-3xl bg-card border border-border flex items-center justify-center shadow-2xl mb-6 relative"
          >
            <div className="absolute inset-0 rounded-3xl bg-primary/5 shadow-[inset_0_0_20px_rgba(255,85,0,0.1)]" />
            <PulseLogo size={48} />
          </motion.div>
          <h1 className="text-4xl font-black text-foreground tracking-tight mb-2">Pulse</h1>
          <p className="text-muted-foreground text-sm font-medium">Новый аккаунт</p>
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
                        autoFocus
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
                Вам <span className="text-foreground">{calculatedAge} {calculatedAge === 1 ? "год" : "лет"}</span>. Pulse предназначен для пользователей старше 13 лет.
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
                    id="parental-consent"
                    className="mt-1 w-5 h-5 rounded accent-primary cursor-pointer shrink-0"
                    onChange={(e) => {
                      const btn = document.getElementById("confirm-age-btn") as HTMLButtonElement;
                      if (btn) btn.disabled = !e.target.checked;
                    }}
                  />
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
                    Мой родитель или опекун знает о регистрации и дал своё согласие.
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
                  id="confirm-age-btn"
                  disabled
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
                    Я принимаю условия использования.
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
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Никнейм</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="только_латиница_и_цифры"
                    autoComplete="username"
                    autoFocus
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
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Пароль</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    autoComplete="new-password"
                    className="w-full bg-card/50 border border-border rounded-2xl px-5 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-base font-medium"
                  />
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
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}