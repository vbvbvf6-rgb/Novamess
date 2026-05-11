import React, { useState, useRef, useEffect, useCallback } from "react";
import { Message } from "@workspace/api-client-react";
import { format } from "date-fns";
import { useAppContext } from "@/contexts/AppContext";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMessagesQueryKey, getGetChatsQueryKey } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Check, CheckCheck, X, Info, Play, Pause, Mic, Reply, Pencil, Trash2, Copy, SmilePlus, Languages, Pin, PinOff, BarChart2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const QUICK_REACTIONS = ["❤️", "👍", "🔥", "😂", "😮", "😢"];

function VoicePlayer({ src, durationSec, isMine }: { src: string; durationSec: number; isMine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSec, setCurrentSec] = useState(0);
  const [speed, setSpeed] = useState(1);
  const SPEEDS = [0.5, 1, 1.5, 2];

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); } else { a.play(); }
    setPlaying(!playing);
  };

  const cycleSpeed = () => {
    const a = audioRef.current;
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (a) a.playbackRate = next;
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      setCurrentSec(Math.floor(a.currentTime));
      setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
    };
    const onEnd = () => { setPlaying(false); setProgress(0); setCurrentSec(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => { a.removeEventListener("timeupdate", onTime); a.removeEventListener("ended", onEnd); };
  }, []);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const displayDur = playing ? currentSec : durationSec;

  const bars = Array.from({ length: 32 }, (_, i) => {
    const h = 18 + Math.sin(i * 1.5 + 1) * 14 + Math.cos(i * 0.8) * 10;
    const filled = (i / 32) * 100 < progress;
    return { h: Math.max(4, h), filled };
  });

  return (
    <div className="flex items-center gap-3.5 min-w-[220px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all",
          isMine
            ? "bg-white text-primary shadow-sm hover:scale-105 active:scale-95"
            : "bg-primary text-white shadow-[0_4px_14px_rgba(255,85,0,0.3)] hover:scale-105 active:scale-95"
        )}
      >
        {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
      </button>

      <div className="flex-1 flex flex-col gap-1.5 justify-center">
        <div className="flex items-end gap-[2px] h-8">
          {bars.map((bar, i) => (
            <motion.div
              key={i}
              animate={playing ? { scaleY: [1, 1.5, 0.8, 1.3, 1] } : { scaleY: 1 }}
              transition={playing ? { duration: 0.5, repeat: Infinity, delay: i * 0.02, ease: "easeInOut" } : {}}
              style={{ height: bar.h }}
              className={cn(
                "w-[3px] rounded-[1px] transition-colors origin-bottom",
                bar.filled
                  ? isMine ? "bg-white" : "bg-primary"
                  : isMine ? "bg-white/30" : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-[11px] font-black font-mono tracking-wider", isMine ? "text-white/80" : "text-muted-foreground")}>
            {fmt(displayDur)}
          </span>
          <button
            onClick={cycleSpeed}
            className={cn(
              "text-[10px] font-black px-1.5 py-0.5 rounded-md border transition-all hover:scale-105 active:scale-95",
              isMine
                ? "border-white/30 text-white/80 hover:border-white/60 bg-white/10"
                : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary bg-secondary/50"
            )}
          >
            {speed}×
          </button>
        </div>
      </div>
    </div>
  );
}

function PollDisplay({ pollData, messageId, chatId, currentUserId, isMine }: {
  pollData: any;
  messageId: number;
  chatId: number;
  currentUserId: number;
  isMine: boolean;
}) {
  const queryClient = useQueryClient();
  const [localData, setLocalData] = useState(pollData);
  const [voting, setVoting] = useState(false);

  useEffect(() => { setLocalData(pollData); }, [pollData]);

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem("pulse-token");
    return { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) };
  };

  const handleVote = async (optionIndex: number) => {
    if (voting) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/polls/${localData.id}/vote`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ optionIndex }),
      });
      if (res.ok) {
        const updated = await res.json();
        const opts: string[] = typeof updated.options === "string" ? JSON.parse(updated.options) : (updated.options || []);
        setLocalData({ ...updated, options: opts });
        queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
      }
    } catch {} finally {
      setVoting(false);
    }
  };

  const options: string[] = localData?.options || [];
  const votes: any[] = localData?.votes || [];
  const totalVotes = votes.length;
  const myVotes: number[] = (votes.filter((v: any) => v.user_id === currentUserId)).map((v: any) => v.option_index);

  const votesPerOption = options.map((_: string, i: number) => votes.filter((v: any) => v.option_index === i).length);
  const maxVotes = Math.max(...votesPerOption, 1);

  return (
    <div className="min-w-[220px] max-w-[280px]">
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 size={16} className={isMine ? "text-white/70" : "text-primary"} />
        <span className={cn("text-[11px] font-black uppercase tracking-wider", isMine ? "text-white/70" : "text-primary")}>Опрос</span>
      </div>
      <p className={cn("text-[15px] font-bold mb-3 leading-snug", isMine ? "text-white" : "text-foreground")}>
        {localData?.question}
      </p>
      <div className="space-y-2">
        {options.map((option: string, i: number) => {
          const voteCount = votesPerOption[i];
          const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isMyVote = myVotes.includes(i);
          return (
            <button
              key={i}
              onClick={() => handleVote(i)}
              disabled={voting}
              className={cn(
                "w-full text-left rounded-xl overflow-hidden transition-all relative",
                isMyVote
                  ? isMine ? "ring-2 ring-white/50" : "ring-2 ring-primary"
                  : "hover:scale-[1.01] active:scale-[0.99]"
              )}
            >
              <div
                className={cn(
                  "absolute inset-0 transition-all duration-500",
                  isMyVote
                    ? isMine ? "bg-white/20" : "bg-primary/20"
                    : isMine ? "bg-white/10" : "bg-secondary"
                )}
                style={{ width: `${pct}%`, minWidth: pct > 0 ? "8px" : "0" }}
              />
              <div className={cn(
                "relative px-3 py-2 flex items-center justify-between",
                isMine ? "bg-white/5" : "bg-secondary/50"
              )}>
                <span className={cn("text-[13px] font-semibold truncate pr-2", isMine ? "text-white" : "text-foreground")}>
                  {option}
                </span>
                <span className={cn("text-[12px] font-black shrink-0", isMine ? "text-white/70" : "text-muted-foreground")}>
                  {pct}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <p className={cn("text-[11px] mt-2.5", isMine ? "text-white/50" : "text-muted-foreground/60")}>
        {totalVotes} {totalVotes === 1 ? "голос" : totalVotes >= 2 && totalVotes <= 4 ? "голоса" : "голосов"}
      </p>
    </div>
  );
}

export interface MessageBubbleProps {
  message: Message;
  onReply?: (msg: Message) => void;
  onEdit?: (msg: Message) => void;
  ownBubbleStyle?: React.CSSProperties;
  onPin?: (msg: Message) => void;
}

export function MessageBubble({ message, onReply, onEdit, ownBubbleStyle, onPin }: MessageBubbleProps) {
  const { currentUserId } = useAppContext();
  const queryClient = useQueryClient();
  const isMine = message.senderId === currentUserId;
  const [showGiftInfo, setShowGiftInfo] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const token = sessionStorage.getItem("pulse-token");
    return { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) };
  };
  const headers = getAuthHeaders();

  const openMenu = useCallback((x: number, y: number) => {
    setMenuPos({ x, y });
    setShowMenu(true);
  }, []);

  const closeMenu = () => {
    setShowMenu(false);
    setMenuPos(null);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openMenu(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    longPressRef.current = setTimeout(() => {
      openMenu(touch.clientX, touch.clientY);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  };

  const handleTouchMove = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  };

  useEffect(() => {
    if (!showMenu) return;
    const close = () => closeMenu();
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    return () => { document.removeEventListener("mousedown", close); };
  }, [showMenu]);

  const handleReact = async (emoji: string) => {
    closeMenu();
    const reactions = (message as any).reactions || [];
    const alreadyReacted = reactions.some((r: any) => r.userId === currentUserId && r.emoji === emoji);
    try {
      if (alreadyReacted) {
        await fetch(`/api/messages/${message.id}/reactions`, {
          method: "DELETE",
          headers,
          body: JSON.stringify({ emoji }),
        });
      } else {
        await fetch(`/api/messages/${message.id}/reactions`, {
          method: "POST",
          headers,
          body: JSON.stringify({ emoji }),
        });
      }
      queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId: message.chatId }) });
    } catch {}
  };

  const handleCopy = () => {
    closeMenu();
    if (message.text) navigator.clipboard.writeText(message.text).catch(() => {});
  };

  const handleDeleteRequest = () => {
    closeMenu();
    setConfirmDelete(true);
  };

  const handleDeleteConfirm = async () => {
    setConfirmDelete(false);
    setActionLoading("delete");
    try {
      await fetch(`/api/messages/${message.id}`, { method: "DELETE", headers: getAuthHeaders() });
      queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId: message.chatId }) });
    } catch {}
    setActionLoading(null);
  };

  const handleTranslate = async () => {
    closeMenu();
    if (!message.text) return;
    if (translation) {
      setShowTranslation(v => !v);
      return;
    }
    setTranslating(true);
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers,
        body: JSON.stringify({ text: message.text, targetLang: "ru" }),
      });
      if (res.ok) {
        const data = await res.json();
        setTranslation(data.translated);
        setShowTranslation(true);
      }
    } catch {} finally {
      setTranslating(false);
    }
  };

  const handlePin = () => {
    closeMenu();
    onPin?.(message);
  };

  const formatTime = (dateStr: string) => format(new Date(dateStr), "HH:mm");

  const reactions = ((message as any).reactions || []) as { emoji: string; userId: number; user?: any }[];
  const groupedReactions = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, users: [], mine: false };
    acc[r.emoji].count++;
    acc[r.emoji].users.push(r.user?.displayName || "?");
    if (r.userId === currentUserId) acc[r.emoji].mine = true;
    return acc;
  }, {} as Record<string, { count: number; users: string[]; mine: boolean }>);

  const replyTo = (message as any).replyTo as (Message & { sender?: any }) | null;
  const pollData = (message as any).pollData;

  if (message.type === "gift") {
    const emoji = (message as any).giftData?.giftItem?.emoji || "🎁";
    const giftName = (message as any).giftData?.giftItem?.name || "Подарок";
    const rarity = (message as any).giftData?.giftItem?.rarity;
    const description = (message as any).giftData?.giftItem?.description;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="flex justify-center w-full my-6"
      >
        <div className="flex flex-col items-center gap-3 relative">
          <div
            onClick={() => setShowGiftInfo(true)}
            className="bg-card border border-border/80 rounded-[32px] px-8 py-6 flex flex-col items-center gap-3 shadow-xl cursor-pointer hover:border-primary/50 hover:shadow-primary/10 transition-all hover:-translate-y-1"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="text-[64px] leading-none drop-shadow-2xl"
            >
              {emoji}
            </motion.div>
            <div className="text-center mt-2">
              <p className="text-[15px] font-black text-foreground">
                {isMine ? "Вы отправили" : `${message.sender?.displayName ?? "Кто-то"} отправил(а)`}
              </p>
              <p className="text-sm font-bold text-primary">{giftName}</p>
            </div>
            {message.text && (
              <p className="text-[13px] font-medium text-muted-foreground italic text-center max-w-[200px] bg-secondary/50 px-3 py-2 rounded-xl mt-1">«{message.text}»</p>
            )}
          </div>
          <span className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">{formatTime(message.createdAt)}</span>

          <AnimatePresence>
            {showGiftInfo && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                onClick={() => setShowGiftInfo(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  onClick={e => e.stopPropagation()}
                  className="relative z-10 bg-card border border-border rounded-[40px] p-8 w-full max-w-sm shadow-2xl text-center"
                >
                  <button onClick={() => setShowGiftInfo(false)} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors">
                    <X size={18} />
                  </button>
                  <div className="text-[100px] mb-6 drop-shadow-2xl leading-none">{emoji}</div>
                  <h3 className="text-2xl font-black mb-2">{giftName}</h3>
                  {rarity && (
                    <span className={cn(
                      "text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg mb-4 inline-block shadow-sm",
                      rarity === "legendary" ? "bg-yellow-500 text-yellow-950" :
                      rarity === "epic" ? "bg-purple-500 text-white" :
                      rarity === "rare" ? "bg-blue-500 text-white" :
                      "bg-secondary text-foreground"
                    )}>
                      {rarity === "legendary" ? "Легендарный" : rarity === "epic" ? "Эпический" : rarity === "rare" ? "Редкий" : "Обычный"}
                    </span>
                  )}
                  {description && <p className="text-[15px] font-medium text-muted-foreground mt-2 mb-6">{description}</p>}
                  <div className="space-y-2 text-[15px] mt-4 bg-secondary rounded-[24px] p-5 text-left">
                    <div className="flex justify-between items-center"><span className="text-muted-foreground font-medium">Отправитель:</span><span className="font-bold">{message.sender?.displayName ?? "Неизвестно"}</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground font-medium">Время:</span><span className="font-bold">{formatTime(message.createdAt)}</span></div>
                    {message.text && (
                      <div className="pt-3 mt-3 border-t border-border">
                        <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Прикрепленное сообщение:</span>
                        <p className="font-bold mt-1 text-[15px]">«{message.text}»</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  const renderContent = () => {
    switch (message.type) {
      case "poll":
        return <PollDisplay pollData={pollData} messageId={message.id} chatId={message.chatId} currentUserId={currentUserId} isMine={isMine} />;
      case "text":
        return (
          <div>
            <p className="text-[15px] whitespace-pre-wrap break-words leading-snug font-medium">{message.text}</p>
            <AnimatePresence>
              {showTranslation && translation && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -5 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -5 }}
                  className={cn(
                    "mt-2 pt-2 border-t text-[14px] font-medium leading-snug italic",
                    isMine ? "border-white/20 text-white/80" : "border-border text-muted-foreground"
                  )}
                >
                  <span className={cn("text-[10px] font-black uppercase tracking-wider not-italic block mb-1", isMine ? "text-white/50" : "text-primary/60")}>
                    Перевод (RU)
                  </span>
                  {translation}
                </motion.div>
              )}
            </AnimatePresence>
            {translating && (
              <p className={cn("text-[12px] mt-1 animate-pulse", isMine ? "text-white/60" : "text-muted-foreground")}>Переводим...</p>
            )}
          </div>
        );
      case "image":
        return (
          <div className="rounded-xl overflow-hidden -mx-1 -mt-1 mb-1">
            <img
              src={message.mediaUrl || ""}
              alt="photo"
              className="max-w-[280px] max-h-[320px] object-cover block w-full"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            {message.text && <p className="text-[15px] mt-3 px-2 mb-1 font-medium">{message.text}</p>}
          </div>
        );
      case "audio": {
        const durSec = parseInt((message.text || "voice:0").replace("voice:", "")) || 0;
        return <VoicePlayer src={message.mediaUrl || ""} durationSec={durSec} isMine={isMine} />;
      }
      case "call":
        return <p className="text-[15px] font-bold italic opacity-80">📞 Звонок завершён</p>;
      default:
        return <p className="text-[15px] font-medium">[{message.type}] {message.text}</p>;
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("flex w-full group select-none relative", isMine ? "justify-end" : "justify-start")}
      >
        <div className={cn(
          "flex max-w-[85%] md:max-w-[70%]",
          isMine ? "flex-row-reverse" : "flex-row",
          "items-end gap-2.5"
        )}>
          {!isMine && (
            <div
              className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[13px] font-black text-white mb-6 overflow-hidden shadow-sm"
              style={{ backgroundColor: message.sender?.avatarColor || "#555" }}
            >
              {message.sender?.avatarUrl ? (
                <img src={message.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                (message.sender?.displayName || "U")[0].toUpperCase()
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5 relative">
            <div
              ref={bubbleRef}
              onContextMenu={handleContextMenu}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchMove}
              className={cn(
                "relative px-5 py-3.5 rounded-[24px] cursor-pointer transition-transform active:scale-[0.98]",
                isMine
                  ? (ownBubbleStyle ? "text-white rounded-br-sm" : "bubble-mine text-primary-foreground rounded-br-sm")
                  : "bg-card text-foreground rounded-bl-sm border border-border shadow-sm"
              )}
              style={isMine && ownBubbleStyle ? ownBubbleStyle : undefined}
            >
              {!isMine && message.sender && (
                <p className="text-[12px] font-black mb-1.5 leading-none" style={{ color: message.sender.avatarColor }}>
                  {message.sender.displayName}
                </p>
              )}

              {replyTo && (
                <div className={cn(
                  "mb-3 px-3 py-2 rounded-xl border-l-4 text-[13px] leading-tight",
                  isMine
                    ? "bg-black/10 border-white"
                    : "bg-secondary/50 border-primary"
                )}>
                  <p className={cn("font-black text-[11px] uppercase tracking-wider mb-1", isMine ? "text-white" : "text-primary")}>
                    {replyTo.sender?.displayName || "Пользователь"}
                  </p>
                  <p className={cn("truncate font-medium opacity-80", isMine ? "text-white" : "text-foreground")}>
                    {replyTo.type === "image" ? "📷 Фото" : replyTo.type === "audio" ? "🎤 Голосовое" : replyTo.text || "Сообщение"}
                  </p>
                </div>
              )}

              {renderContent()}

              <div className={cn(
                "flex items-center justify-end gap-1.5 mt-2.5 text-[11px] font-bold",
                isMine ? "text-primary-foreground/70" : "text-muted-foreground/70"
              )}>
                {(message as any).isEdited && (
                  <span className="uppercase tracking-wider">ред.</span>
                )}
                <span>{formatTime(message.createdAt)}</span>
                {isMine && (
                  message.isRead ? <CheckCheck size={16} strokeWidth={3} /> : <Check size={16} strokeWidth={3} />
                )}
              </div>
            </div>

            {Object.keys(groupedReactions).length > 0 && (
              <div className={cn("flex flex-wrap gap-1.5 mt-1", isMine ? "justify-end" : "justify-start")}>
                {Object.entries(groupedReactions).map(([emoji, data]) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    title={data.users.join(", ")}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-[12px] text-[13px] font-black border transition-all hover:scale-105 active:scale-95 shadow-sm",
                      data.mine
                        ? "bg-primary border-transparent text-white"
                        : "bg-card border-border text-foreground hover:border-primary/50"
                    )}
                  >
                    <span>{emoji}</span>
                    <span>{data.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showMenu && menuPos && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed z-[999] select-none"
            style={{
              left: Math.min(menuPos.x, window.innerWidth - 240),
              top: Math.min(menuPos.y, window.innerHeight - 360),
            }}
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="bg-card border border-border rounded-[24px] shadow-2xl overflow-hidden min-w-[220px]">
              <div className="flex items-center justify-between p-2.5 border-b border-border bg-secondary/30">
                {QUICK_REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className={cn(
                      "text-xl w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-card hover:scale-110 hover:shadow-sm",
                      (groupedReactions[emoji]?.mine) && "bg-primary/20 text-white"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
                <button className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-card hover:text-foreground transition-all">
                  <SmilePlus size={20} />
                </button>
              </div>
              <div className="p-1.5 space-y-0.5">
                {onReply && (
                  <button
                    onClick={() => { closeMenu(); onReply(message); }}
                    className="w-full flex items-center gap-3 px-3 py-3 text-[15px] font-bold text-foreground hover:bg-secondary rounded-xl transition-colors text-left"
                  >
                    <Reply size={18} className="text-primary" />
                    Ответить
                  </button>
                )}
                {message.text && message.type === "text" && (
                  <button
                    onClick={handleTranslate}
                    disabled={translating}
                    className="w-full flex items-center gap-3 px-3 py-3 text-[15px] font-bold text-foreground hover:bg-secondary rounded-xl transition-colors text-left"
                  >
                    <Languages size={18} className="text-blue-400" />
                    {translating ? "Переводим..." : translation ? (showTranslation ? "Скрыть перевод" : "Показать перевод") : "Перевести"}
                  </button>
                )}
                {onPin && (
                  <button
                    onClick={handlePin}
                    className="w-full flex items-center gap-3 px-3 py-3 text-[15px] font-bold text-foreground hover:bg-secondary rounded-xl transition-colors text-left"
                  >
                    <Pin size={18} className="text-yellow-500" />
                    Закрепить
                  </button>
                )}
                {message.text && (
                  <button
                    onClick={handleCopy}
                    className="w-full flex items-center gap-3 px-3 py-3 text-[15px] font-bold text-foreground hover:bg-secondary rounded-xl transition-colors text-left"
                  >
                    <Copy size={18} className="text-muted-foreground" />
                    Копировать
                  </button>
                )}
                {isMine && onEdit && message.type === "text" && (
                  <button
                    onClick={() => { closeMenu(); onEdit(message); }}
                    className="w-full flex items-center gap-3 px-3 py-3 text-[15px] font-bold text-foreground hover:bg-secondary rounded-xl transition-colors text-left"
                  >
                    <Pencil size={18} className="text-orange-500" />
                    Изменить
                  </button>
                )}
                {isMine && (
                  <button
                    onClick={handleDeleteRequest}
                    disabled={actionLoading === "delete"}
                    className="w-full flex items-center gap-3 px-3 py-3 text-[15px] font-bold text-destructive hover:bg-destructive/10 rounded-xl transition-colors text-left"
                  >
                    <Trash2 size={18} />
                    {actionLoading === "delete" ? "Удаляем..." : "Удалить"}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="max-w-sm rounded-[24px]">
          <AlertDialogHeader>
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} className="text-destructive" />
            </div>
            <AlertDialogTitle className="text-center font-black text-xl">
              Удалить сообщение?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center font-medium text-[15px]">
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2 mt-6">
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-black rounded-2xl py-3"
            >
              Удалить
            </AlertDialogAction>
            <AlertDialogCancel className="font-bold rounded-2xl py-3 border-border">
              Отмена
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
