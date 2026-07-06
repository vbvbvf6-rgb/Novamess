import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, MessageSquare, Phone, Gift, Star, Shield, Zap, BookOpen, Users, Radio } from "lucide-react";

const ONBOARDING_KEY = "aura-onboarding-done-v1";

interface Step {
  icon: React.ReactNode;
  color: string;
  gradient: string;
  title: string;
  description: string;
  tip: string;
}

const STEPS: Step[] = [
  {
    icon: <MessageSquare size={32} />,
    color: "text-blue-400",
    gradient: "from-blue-500/20 to-blue-600/5",
    title: "Чаты",
    description: "Создавай личные переписки, групповые чаты и каналы. Отправляй сообщения, фото, стикеры и реагируй эмодзи.",
    tip: "💡 Нажми + в правом верхнем углу чтобы начать новый чат",
  },
  {
    icon: <Users size={32} />,
    color: "text-green-400",
    gradient: "from-green-500/20 to-green-600/5",
    title: "Контакты и Поиск",
    description: "Найди друзей по @никнейму через поиск. Подпишись на публичные каналы и группы прямо из глобального поиска.",
    tip: "💡 Нажми на иконку поиска вверху списка чатов",
  },
  {
    icon: <Phone size={32} />,
    color: "text-emerald-400",
    gradient: "from-emerald-500/20 to-emerald-600/5",
    title: "Звонки",
    description: "Совершай аудио и видеозвонки прямо в чате. История звонков доступна в разделе «Звонки» в меню.",
    tip: "💡 Нажми на иконку телефона/камеры в чате для звонка",
  },
  {
    icon: <Radio size={32} />,
    color: "text-orange-400",
    gradient: "from-orange-500/20 to-orange-600/5",
    title: "Истории",
    description: "Делись моментами через 24-часовые истории. Истории контактов видны в баре вверху чатов.",
    tip: "💡 Раздел «Истории» в меню — для твоих собственных историй",
  },
  {
    icon: <Zap size={32} />,
    color: "text-yellow-400",
    gradient: "from-yellow-500/20 to-yellow-600/5",
    title: "Gem 💎 и Кошелёк",
    description: "Gem — внутренняя валюта Nova. Получай ежедневный бонус 💎, выполняй задания в разделе «События».",
    tip: "💡 Заходи ежедневно чтобы не потерять стрик!",
  },
  {
    icon: <Shield size={32} />,
    color: "text-purple-400",
    gradient: "from-purple-500/20 to-purple-600/5",
    title: "Безопасность",
    description: "Настрой двухфакторную аутентификацию, PIN-блокировку экрана и исчезающие сообщения в Настройках.",
    tip: "💡 Настройки → Конфиденциальность и безопасность",
  },
  {
    icon: <Star size={32} />,
    color: "text-amber-400",
    gradient: "from-amber-500/20 to-amber-600/5",
    title: "Nova Prime",
    description: "Подпишись на Prime чтобы получить золотое кольцо, эксклюзивные темы оформления и множитель Gem × 2 💎.",
    tip: "💡 Раздел «Nova Prime» в левом меню",
  },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      const timer = setTimeout(() => setOpen(true), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const close = () => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setOpen(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else close();
  };

  const prev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const current = STEPS[step];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.93, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 30 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="fixed inset-0 z-[401] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
              {/* Progress bar */}
              <div className="h-1 bg-secondary">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Header */}
              <div className={`px-6 pt-7 pb-6 bg-gradient-to-br ${current.gradient} relative`}>
                <button
                  onClick={close}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={16} />
                </button>
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen size={12} className="text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Обучение {step + 1} / {STEPS.length}
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={`w-16 h-16 rounded-2xl bg-card/50 border border-border/50 flex items-center justify-center mb-4 ${current.color}`}>
                      {current.icon}
                    </div>
                    <h2 className="text-[22px] font-black text-foreground leading-tight mb-2">
                      {current.title}
                    </h2>
                    <p className="text-[14px] text-muted-foreground leading-relaxed">
                      {current.description}
                    </p>
                    <div className="mt-4 px-3 py-2.5 bg-card/60 border border-border/60 rounded-xl">
                      <p className="text-[12px] text-foreground/80 leading-relaxed">
                        {current.tip}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Dots */}
              <div className="px-6 py-4 flex items-center gap-2 justify-center border-t border-border">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`transition-all rounded-full ${i === step ? "w-6 h-2 bg-primary" : "w-2 h-2 bg-border hover:bg-muted-foreground"}`}
                  />
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 pt-0 flex gap-2">
                {step > 0 ? (
                  <button
                    onClick={prev}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-[16px] border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                ) : (
                  <button
                    onClick={close}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-[16px] border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary transition-all"
                  >
                    Пропустить
                  </button>
                )}
                <button
                  onClick={next}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-[16px] text-[15px] font-black hover:bg-primary/90 transition-all shadow-[0_4px_14px_rgba(234,88,12,0.3)] hover:-translate-y-0.5 active:translate-y-0"
                >
                  {step < STEPS.length - 1 ? (
                    <>Далее <ChevronRight size={16} /></>
                  ) : (
                    "Начать!"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
