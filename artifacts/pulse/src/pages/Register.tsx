import React, { useState, useRef, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Camera, Gift, KeyRound, HelpCircle } from "lucide-react";
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

const SECURITY_QUESTIONS = [
  "Кличка вашего первого питомца",
  "Город, в котором вы родились",
  "Любимая книга в детстве",
  "Имя вашего лучшего друга в школе",
  "Название первой школы",
  "Любимый персонаж из мультфильма",
  "Марка первого автомобиля",
  "Девичья фамилия вашей матери",
];

interface RegisterProps {
  onLogin: (userId: number) => void;
}

export default function Register({ onLogin }: RegisterProps) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [useCustomQuestion, setUseCustomQuestion] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    const finalQuestion = useCustomQuestion ? customQuestion.trim() : securityQuestion;
    if (!finalQuestion) {
      setError("Выберите или введите контрольный вопрос");
      return;
    }
    if (!securityAnswer.trim()) {
      setError("Введите ответ на контрольный вопрос");
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
          avatarUrl: avatarUrl || undefined,
          referralCode: referralCode.trim().toUpperCase() || undefined,
          securityQuestion: finalQuestion,
          securityAnswer: securityAnswer.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка регистрации");
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

  return (
    <div className="h-[100dvh] bg-background flex flex-col items-center p-4 pt-8 pb-8 relative overflow-y-auto">
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
        className="w-full max-w-sm relative z-10 py-4 w-full"
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
            <h1 className="text-4xl font-black tracking-tight text-foreground mb-1.5">Aura</h1>
            <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
              Новый аккаунт
            </p>
          </motion.div>
        </div>

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
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Пароль ещё раз</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full bg-card/50 border border-border rounded-2xl px-5 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-base font-medium"
              />
            </div>

            {/* ── Security question for password recovery ── */}
            <div className="bg-secondary/30 border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-0.5">
                <HelpCircle size={15} className="text-primary shrink-0" />
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Контрольный вопрос</label>
              </div>
              <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                Используется для восстановления пароля без email или телефона. Запомните ответ.
              </p>

              <div className="space-y-2">
                {!useCustomQuestion ? (
                  <select
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                    className="w-full bg-card/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary transition-all"
                  >
                    {SECURITY_QUESTIONS.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="Введите свой вопрос..."
                    className="w-full bg-card/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
                  />
                )}
                <button
                  type="button"
                  onClick={() => { setUseCustomQuestion(v => !v); setCustomQuestion(""); }}
                  className="text-[11px] text-primary/70 hover:text-primary transition-colors"
                >
                  {useCustomQuestion ? "← Выбрать из списка" : "Свой вопрос →"}
                </button>
              </div>

              <div className="relative">
                <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Ответ на вопрос..."
                  className="w-full bg-card/50 border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
                />
              </div>
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

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm font-semibold text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 hover:shadow-[0_0_30px_rgba(255,85,0,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none text-base mt-2"
            >
              {loading ? "Создаём..." : "Создать аккаунт"}
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
        </motion.div>
      </motion.div>
    </div>
  );
}
