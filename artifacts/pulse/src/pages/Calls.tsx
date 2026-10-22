import React, { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useGetCallHistory, getGetCallHistoryQueryKey } from "@workspace/api-client-react";
import type { Call } from "@workspace/api-client-react";
import { Phone, Video, PhoneMissed, PhoneForwarded, PhoneIncoming, PhoneCall, Search, X, Trash2, Headphones } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { useAppConfirm } from "@/contexts/AppConfirmContext";
import { motion, AnimatePresence } from "framer-motion";
import { useGetContacts } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type Filter = "all" | "missed" | "incoming" | "outgoing";

export default function Calls() {
  const { data: calls, isLoading } = useGetCallHistory();
  const { data: contacts } = useGetContacts();
  const searchString = useSearch();
  const [, navigate] = useLocation();
  const { currentUserId, startCall } = useAppContext();
  const { toast } = useToast();
  const requestConfirm = useAppConfirm();
  const queryClient = useQueryClient();
  const requestedFilter = new URLSearchParams(searchString).get("filter");
  const initialFilter: Filter = ["missed", "incoming", "outgoing"].includes(requestedFilter || "")
    ? requestedFilter as Filter
    : "all";
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [showNewCall, setShowNewCall] = useState(false);
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [roomName, setRoomName] = useState("Открытая аудиокомната");
  const [search, setSearch] = useState("");
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    setFilter(initialFilter);
  }, [searchString]);

  const selectFilter = (next: Filter) => {
    setFilter(next);
    navigate(next === "all" ? "/calls" : `/calls?filter=${next}`);
  };

  const handleClearHistory = async () => {
    if (!(await requestConfirm({
      title: "Очистить историю звонков?",
      description: "История будет очищена только в вашем аккаунте.",
      confirmLabel: "Очистить",
      destructive: true,
    }))) return;
    setClearing(true);
    try {
      const token = sessionStorage.getItem("pulse-token");
      const res = await fetch("/api/calls", {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: getGetCallHistoryQueryKey() });
        toast({ title: "История звонков очищена" });
      } else {
        toast({ title: "Ошибка", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка соединения", variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  const filtered = calls?.filter((call: Call) => {
    const isOutgoing = call.callerId === currentUserId;
    const isMissedForMe = call.status === "missed" && call.calleeId === currentUserId;
    if (filter === "missed") return isMissedForMe;
    if (filter === "incoming") return call.calleeId === currentUserId && !isMissedForMe;
    if (filter === "outgoing") return isOutgoing;
    return true;
  });

  const missedCount = calls?.filter((call: Call) => call.status === "missed" && call.calleeId === currentUserId).length ?? 0;
  const incomingCount = calls?.filter((call: Call) => call.calleeId === currentUserId && call.status !== "missed").length ?? 0;
  const outgoingCount = calls?.filter((call: Call) => call.callerId === currentUserId).length ?? 0;
  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "Все", count: calls?.length ?? 0 },
    { id: "missed", label: "Пропущенные", count: missedCount },
    { id: "incoming", label: "Входящие", count: incomingCount },
    { id: "outgoing", label: "Исходящие", count: outgoingCount },
  ];

  const filteredContacts = contacts?.filter((c: { displayName?: string; username?: string }) =>
    c.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    c.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-border flex items-center px-5 justify-between bg-card/90 backdrop-blur-xl z-10 shrink-0 relative overflow-hidden" style={{ minHeight: "calc(4rem + env(safe-area-inset-top, 0px))", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/6 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))", border: "1px solid rgba(59,130,246,0.2)" }}>
            <PhoneCall size={17} className="text-primary" />
          </div>
          <h1 className="text-xl font-black text-foreground tracking-tight">Звонки</h1>
        </div>
        <div className="flex items-center gap-2 relative z-10">
          {calls && calls.length > 0 && (
            <button
              onClick={handleClearHistory}
              disabled={clearing}
              title="Очистить историю"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all active:scale-95"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            onClick={() => setShowNewCall(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #3b82f6, #60a5fa)", boxShadow: "0 0 16px rgba(59,130,246,0.35)", color: "white" }}
          >
            <PhoneCall size={14} />
            Новый звонок
          </button>
          <button
            onClick={() => {
              setRoomName("Открытая аудиокомната");
              setShowRoomDialog(true);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-bold border border-primary/30 text-primary hover:bg-primary/10 transition-all active:scale-95"
            title="Создать аудиокомнату"
          >
            <Headphones size={15} />
            <span className="hidden sm:inline">Аудиокомната</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-6 py-3 shrink-0 border-b border-border bg-card/30 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => selectFilter(tab.id)}
            className={`relative px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === tab.id
                ? "bg-primary text-white shadow-[0_0_12px_rgba(59,130,246,0.26)]"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                "ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                tab.id === "missed" ? "bg-destructive/15 text-destructive" : filter === tab.id ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"
              )}>
                {tab.count > 99 ? "99+" : tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-none pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card/40">
                <Skeleton className="w-14 h-14 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="w-10 h-10 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 py-20">
            <div className="w-24 h-24 rounded-full bg-secondary/60 flex items-center justify-center mb-5 shadow-inner">
              {filter === "missed" ? (
                <PhoneMissed size={36} className="text-destructive/60" />
              ) : (
                <Phone size={36} className="text-muted-foreground/40" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {filter === "missed" ? "Нет пропущенных" : filter === "incoming" ? "Нет входящих" : filter === "outgoing" ? "Нет исходящих" : "Нет звонков"}
            </h2>
            <p className="text-sm text-muted-foreground">История звонков появится здесь</p>
          </div>
        ) : (
          <div className="p-4 space-y-2 max-w-2xl mx-auto w-full">
            <AnimatePresence initial={false}>
              {filtered?.map((call: Call, i: number) => {
                const isOutgoing = call.callerId === currentUserId;
                const otherUser = isOutgoing ? call.callee : call.caller;
                const isMissed = call.status === "missed" && call.calleeId === currentUserId;
                const isVideo = call.type === "video";
                const dur = call.durationSeconds
                  ? `${Math.floor(call.durationSeconds / 60)}:${String(call.durationSeconds % 60).padStart(2, "0")}`
                  : null;

                return (
                  <motion.div
                    key={call.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-4 p-3.5 rounded-2xl border border-border/50 bg-card/50 hover:bg-card/80 hover:border-border transition-all group"
                  >
                    {/* Avatar */}
                    <div
                      className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0 shadow-md relative"
                      style={{ backgroundColor: otherUser?.avatarColor || "#444" }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center">{(otherUser?.displayName || "?")[0].toUpperCase()}</span>
                      {otherUser?.avatarUrl && <img src={otherUser.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate text-[15px] ${isMissed ? "text-destructive" : "text-foreground"}`}>
                        {otherUser?.displayName || "Неизвестно"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isMissed ? (
                          <PhoneMissed size={13} className="text-destructive shrink-0" />
                        ) : isOutgoing ? (
                          <PhoneForwarded size={13} className="text-muted-foreground shrink-0" />
                        ) : (
                          <PhoneIncoming size={13} className="text-green-500 shrink-0" />
                        )}
                        {isVideo && <Video size={12} className="text-muted-foreground shrink-0" />}
                        <span className={cn("text-xs font-semibold", isMissed ? "text-destructive" : "text-muted-foreground")}>
                          {isMissed ? "Пропущен" : isOutgoing && call.status === "missed" ? "Нет ответа" : isOutgoing ? "Исходящий" : "Входящий"}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {call.startedAt
                            ? formatDistanceToNow(new Date(call.startedAt), { addSuffix: true, locale: ru })
                            : "—"}
                        </span>
                        {dur && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                            <span className="text-xs text-muted-foreground font-mono">{dur}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Recall */}
                    <button
                      onClick={async () => {
                        const calleeId = isOutgoing ? call.calleeId : call.callerId;
                        if (!calleeId) return;
                        try {
                          await startCall(calleeId, call.chatId ?? null, isVideo ? "video" : "audio");
                        } catch {
                          toast({ title: "Не удалось начать звонок", variant: "destructive" });
                        }
                      }}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-primary hover:bg-primary/15 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0"
                      title="Перезвонить"
                    >
                      {isVideo ? <Video size={18} /> : <Phone size={18} />}
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* New Call Modal */}
      <AnimatePresence>
        {showNewCall && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setShowNewCall(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 bottom-0 sm:top-1/2 sm:bottom-auto -translate-x-1/2 sm:-translate-y-1/2 w-full sm:w-[90%] max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-lg">Новый звонок</h3>
                <button onClick={() => setShowNewCall(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-secondary border border-border">
                  <Search size={16} className="text-muted-foreground shrink-0" />
                  <input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Поиск контактов..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="overflow-y-auto max-h-72 px-4 pb-4 space-y-1">
                {filteredContacts?.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">Контакты не найдены</p>
                ) : filteredContacts?.map((c: { id: number; displayName?: string | null; username?: string | null; avatarColor?: string | null; avatarUrl?: string | null }) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 overflow-hidden relative"
                      style={{ backgroundColor: (c as any).avatarColor || "#444" }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center">{(c.displayName || "?")[0].toUpperCase()}</span>
                      {(c as any).avatarUrl && <img src={(c as any).avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
                    </div>
                    <span className="flex-1 text-sm font-medium truncate">{c.displayName}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          if (!c.id) return;
                          setShowNewCall(false);
                          try { await startCall(c.id, null, "audio"); }
                          catch { toast({ title: "Не удалось начать звонок", variant: "destructive" }); }
                        }}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-primary hover:bg-primary/15 transition-colors"
                        title="Аудио звонок"
                      >
                        <Phone size={17} />
                      </button>
                      <button
                        onClick={async () => {
                          if (!c.id) return;
                          setShowNewCall(false);
                          try { await startCall(c.id, null, "video"); }
                          catch { toast({ title: "Не удалось начать звонок", variant: "destructive" }); }
                        }}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-blue-400 hover:bg-blue-500/15 transition-colors"
                        title="Видео звонок"
                      >
                        <Video size={17} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRoomDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-sm"
              onClick={() => setShowRoomDialog(false)}
            />
            <motion.form
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  await startCall(null, null, "group", roomName);
                  toast({ title: `${roomName.trim() || "Аудиокомната"} создана`, description: "Пригласите участников в окне звонка." });
                  setShowRoomDialog(false);
                } catch {
                  toast({ title: "Не удалось создать аудиокомнату", variant: "destructive" });
                }
              }}
              className="fixed z-[61] left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-card p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">Новая аудиокомната</h2>
                <button type="button" onClick={() => setShowRoomDialog(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary">
                  <X size={18} />
                </button>
              </div>
              <label className="block text-sm font-medium text-muted-foreground mb-2" htmlFor="audio-room-name">Название</label>
              <input
                id="audio-room-name"
                autoFocus={typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches}
                maxLength={80}
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setShowRoomDialog(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary">Отмена</button>
                <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Создать</button>
              </div>
            </motion.form>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
