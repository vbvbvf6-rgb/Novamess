import React, { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { MessageCircle, ArrowLeft, Zap, Mail, Shield } from "lucide-react";

export default function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
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
            className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center shadow-[0_0_40px_rgba(255,80,0,0.4)] mb-4"
          >
            <MessageCircle className="text-white" size={40} />
          </motion.div>
          <h1 className="text-3xl font-black text-white">Pulse</h1>
          <p className="text-muted-foreground text-sm mt-1">Восстановление доступа</p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 shadow-2xl">
          {!submitted ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Shield size={20} className="text-orange-400" />
                </div>
                <div>
                  <h2 className="font-bold text-sm">Забыли пароль?</h2>
                  <p className="text-xs text-muted-foreground">Мы поможем восстановить доступ</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Ваш никнейм</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ваш_никнейм"
                    autoComplete="username"
                    autoFocus
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={!username.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60 shadow-[0_0_20px_rgba(255,80,0,0.3)] text-base"
                >
                  Восстановить доступ
                </motion.button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-2"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail size={32} className="text-primary" />
              </div>
              <h2 className="font-bold text-lg mb-2">Обратитесь к администратору</h2>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Для сброса пароля аккаунта{" "}
                <span className="text-foreground font-semibold">@{username}</span>{" "}
                свяжитесь с администратором Pulse. Он сможет установить новый пароль через панель управления.
              </p>
              <div className="bg-secondary rounded-2xl p-4 text-left mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Контакт поддержки</p>
                <p className="text-sm font-semibold text-foreground">@pulse_system</p>
                <p className="text-xs text-muted-foreground">Администратор Pulse</p>
              </div>
            </motion.div>
          )}

          <div className="mt-5 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={14} /> Вернуться к входу
            </Link>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Zap size={12} className="text-primary" />
          <span>Powered by Pulse</span>
        </div>
      </motion.div>
    </div>
  );
}
