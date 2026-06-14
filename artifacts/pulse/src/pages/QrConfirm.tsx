import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { QrCode, CheckCircle2, XCircle, Loader2, ShieldCheck, User } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { useGetMe } from "@workspace/api-client-react";

export default function QrConfirm() {
  const { tokenId } = useParams<{ tokenId: string }>();
  const [, navigate] = useLocation();
  const { currentUserId } = useAppContext();
  const { data: me } = useGetMe();

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "expired">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!tokenId) return;
    fetch(`/api/auth/qr/${tokenId}`)
      .then(r => r.json())
      .then(d => {
        if (d.status === "expired") setStatus("expired");
      })
      .catch(() => {});
  }, [tokenId]);

  const handleConfirm = async () => {
    if (!tokenId) return;
    setStatus("loading");
    const token = sessionStorage.getItem("pulse-token");
    try {
      const res = await fetch(`/api/auth/qr/${tokenId}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Не удалось подтвердить");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Ошибка подключения к серверу");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full blur-[120px] opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(16 100% 50% / 0.18), transparent 70%)" }}
      />
      <div
        className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full blur-[120px] opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(30 100% 45% / 0.15), transparent 70%)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[360px] relative z-10"
      >
        <div
          className="rounded-[28px] p-8"
          style={{
            background: "hsl(var(--card) / 0.7)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid hsl(var(--border) / 0.8)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {status === "success" ? (
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto"
              >
                <CheckCircle2 size={40} className="text-green-500" />
              </motion.div>
              <h2 className="text-2xl font-black text-foreground">Готово!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Вход подтверждён. Другое устройство теперь авторизовано в вашем аккаунте.
              </p>
              <motion.button
                onClick={() => navigate("/")}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full text-primary-foreground font-black py-3.5 rounded-2xl mt-2"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(16 100% 42%) 100%)",
                  boxShadow: "0 8px 28px hsl(var(--primary) / 0.35)",
                }}
              >
                Закрыть
              </motion.button>
            </div>
          ) : status === "expired" ? (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
                <XCircle size={40} className="text-destructive" />
              </div>
              <h2 className="text-2xl font-black text-foreground">QR истёк</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Этот QR-код больше недействителен. Попросите создать новый на другом устройстве.
              </p>
              <button
                onClick={() => navigate("/")}
                className="w-full text-sm font-bold text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                На главную
              </button>
            </div>
          ) : status === "error" ? (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
                <XCircle size={40} className="text-destructive" />
              </div>
              <h2 className="text-2xl font-black text-foreground">Ошибка</h2>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <motion.button
                onClick={handleConfirm}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full text-primary-foreground font-black py-3.5 rounded-2xl"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(16 100% 42%) 100%)",
                  boxShadow: "0 8px 28px hsl(var(--primary) / 0.35)",
                }}
              >
                Попробовать снова
              </motion.button>
              <button
                onClick={() => navigate("/")}
                className="w-full text-sm font-bold text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                На главную
              </button>
            </div>
          ) : (
            <div className="text-center space-y-5">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
                className="w-20 h-20 rounded-[22px] flex items-center justify-center mx-auto"
                style={{
                  background: "linear-gradient(135deg, hsl(16 100% 50% / 0.15) 0%, hsl(16 100% 50% / 0.05) 100%)",
                  border: "1px solid hsl(16 100% 50% / 0.2)",
                  boxShadow: "0 0 40px hsl(16 100% 50% / 0.15)",
                }}
              >
                <QrCode className="text-primary w-9 h-9" />
              </motion.div>

              <div>
                <h2 className="text-2xl font-black text-foreground mb-1">Подтвердить вход</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Новое устройство запрашивает доступ к вашему аккаунту Nova.
                </p>
              </div>

              {me && (
                <div
                  className="flex items-center gap-3 rounded-2xl p-3.5 text-left"
                  style={{
                    background: "hsl(var(--secondary) / 0.5)",
                    border: "1px solid hsl(var(--border) / 0.8)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden"
                    style={{ backgroundColor: (me as any).avatarColor || "#3B82F6" }}
                  >
                    {(me as any).avatarUrl ? (
                      <img src={(me as any).avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      (me.displayName?.[0] || <User size={16} />)
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-bold text-foreground truncate">{me.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">@{me.username}</p>
                  </div>
                </div>
              )}

              <div
                className="flex items-start gap-3 rounded-2xl p-3.5 text-left"
                style={{
                  background: "hsl(var(--primary) / 0.06)",
                  border: "1px solid hsl(var(--primary) / 0.15)",
                }}
              >
                <ShieldCheck size={18} className="text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Нажмите «Разрешить», если вы сами сейчас входите через QR на другом устройстве. Иначе — <span className="font-semibold text-foreground">проигнорируйте</span>.
                </p>
              </div>

              <motion.button
                onClick={handleConfirm}
                disabled={status === "loading"}
                whileHover={{ scale: status === "loading" ? 1 : 1.01 }}
                whileTap={{ scale: status === "loading" ? 1 : 0.98 }}
                className="w-full text-primary-foreground font-black py-4 rounded-2xl transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(16 100% 42%) 100%)",
                  boxShadow: "0 8px 28px hsl(var(--primary) / 0.35)",
                }}
              >
                {status === "loading" ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Подтверждаем...
                  </>
                ) : (
                  "Разрешить вход"
                )}
              </motion.button>

              <button
                onClick={() => navigate("/")}
                className="w-full text-sm font-bold text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Отмена
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-muted-foreground/40 font-medium mt-5">
          Nova Messenger · Ваши данные надёжно защищены
        </p>
      </motion.div>
    </div>
  );
}
