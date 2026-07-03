import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Users, Lock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetChatsQueryKey } from "@workspace/api-client-react";
import { useAppContext } from "@/contexts/AppContext";

function getToken() {
  return sessionStorage.getItem("pulse-token");
}

export default function JoinInvite() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { setSelectedChatId } = useAppContext();

  const [state, setState] = useState<"loading" | "preview" | "joining" | "success" | "error">("loading");
  const [chat, setChat] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) { setState("error"); setErrorMsg("Неверная ссылка"); return; }
    const authToken = getToken();
    fetch(`/api/invite/${token}`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setState("error"); setErrorMsg(data.error); }
        else { setChat(data); setState("preview"); }
      })
      .catch(() => { setState("error"); setErrorMsg("Не удалось загрузить информацию о чате"); });
  }, [token]);

  const handleJoin = async () => {
    setState("joining");
    const authToken = getToken();
    try {
      const res = await fetch(`/api/invite/${token}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
      });
      const data = await res.json();
      if (!res.ok) { setState("error"); setErrorMsg(data.error || "Не удалось вступить"); return; }
      setState("success");
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
      setTimeout(() => {
        if (data.chatId) setSelectedChatId(data.chatId);
        navigate("/");
      }, 1200);
    } catch { setState("error"); setErrorMsg("Ошибка сети"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
          {state === "loading" && (
            <div className="p-12 flex flex-col items-center gap-4">
              <Loader2 size={40} className="text-primary animate-spin" />
              <p className="text-muted-foreground font-medium">Загрузка...</p>
            </div>
          )}

          {state === "preview" && chat && (
            <>
              <div className="p-6 text-center border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white mx-auto mb-4 shadow-lg"
                  style={{ backgroundColor: chat.avatarColor || "#f97316" }}
                >
                  {chat.avatarUrl ? (
                    <img src={chat.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (chat.name?.[0] || "?")}
                </div>
                <h1 className="text-xl font-black text-foreground mb-1">{chat.name}</h1>
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-sm">
                  {chat.type === "channel" ? <Users size={14} /> : <Lock size={14} />}
                  <span>{chat.type === "channel" ? "Канал" : "Группа"} · {chat.memberCount ?? "?"} участников</span>
                </div>
                {chat.description && (
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{chat.description}</p>
                )}
              </div>
              <div className="p-5 space-y-3">
                <button
                  onClick={handleJoin}
                  className="w-full h-13 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-[15px] hover:bg-primary/90 transition-colors shadow-[0_4px_14px_rgba(0,0,0,0.15)]"
                >
                  Вступить в {chat.type === "channel" ? "канал" : "группу"}
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="w-full py-3 rounded-2xl border border-border text-muted-foreground font-semibold text-sm hover:bg-secondary transition-colors"
                >
                  Отмена
                </button>
              </div>
            </>
          )}

          {state === "joining" && (
            <div className="p-12 flex flex-col items-center gap-4">
              <Loader2 size={40} className="text-primary animate-spin" />
              <p className="text-muted-foreground font-medium">Вступаем...</p>
            </div>
          )}

          {state === "success" && (
            <div className="p-12 flex flex-col items-center gap-4">
              <CheckCircle size={48} className="text-green-500" />
              <p className="font-bold text-foreground text-lg">Вы вступили!</p>
              <p className="text-muted-foreground text-sm text-center">Переходим в чат...</p>
            </div>
          )}

          {state === "error" && (
            <div className="p-10 flex flex-col items-center gap-4">
              <XCircle size={48} className="text-destructive" />
              <p className="font-bold text-foreground text-lg text-center">Ссылка недействительна</p>
              <p className="text-muted-foreground text-sm text-center">{errorMsg}</p>
              <button
                onClick={() => navigate("/")}
                className="mt-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                На главную
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
