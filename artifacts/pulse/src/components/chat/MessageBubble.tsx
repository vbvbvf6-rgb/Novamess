import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { Message, useGetMe, useGetChats } from "@workspace/api-client-react";
import { format } from "date-fns";
import { useAppContext } from "@/contexts/AppContext";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { getGetMessagesQueryKey, getGetChatsQueryKey } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Check, CheckCheck, Clock, X, Info, Play, Pause, Mic, Reply, Pencil, Trash2, Copy, SmilePlus, Languages, Pin, PinOff, BarChart2, Eye, Crown, Wand2, MessageSquare, Shield, Sparkles, Forward, Search } from "lucide-react";
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

function EffectOverlay({ effect, onDone }: { effect: string; onDone: () => void }) {
  const particles = useMemo(() => {
    const count = effect === "confetti" ? 40 : effect === "snow" ? 30 : 25;
    const colors = effect === "confetti"
      ? ["#f43f5e", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#06b6d4", "#fb923c", "#34d399"]
      : effect === "snow" ? ["#dbeafe", "#e0f2fe", "#ffffff", "#bfdbfe"]
      : ["#f97316", "#ef4444", "#fbbf24", "#fb923c", "#dc2626"];
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: (i / count) * 120 - 10,
      velX: (((i * 7 + 3) % 21) - 10) * 3,
      velY: effect === "fire" ? -(50 + (i * 13 % 100)) : (80 + (i * 17 % 120)),
      delay: (i * 0.05) % 1.0,
      duration: 1.5 + (i * 11 % 10) / 10,
      rotation: (i * 137) % 720,
      color: colors[i % colors.length],
      size: effect === "snow" ? 4 + (i % 5) : effect === "confetti" ? 6 + (i % 8) : 3 + (i % 6),
      isRound: effect === "snow" || (effect === "confetti" && i % 3 === 0),
    }));
  }, [effect]);

  useEffect(() => {
    const timer = setTimeout(onDone, 3200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 50 }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          className={p.isRound ? "absolute rounded-full" : "absolute rounded-sm"}
          style={{ left: `${p.x}%`, top: "50%", width: p.size, height: p.isRound ? p.size : p.size * 1.6, backgroundColor: p.color }}
          initial={{ opacity: 1, y: 0, x: 0, rotate: 0, scale: 1 }}
          animate={{ opacity: 0, y: p.velY, x: p.velX, rotate: p.rotation, scale: 0.3 }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function VoicePlayer({ src, durationSec, isMine, messageId, viewerIsPrimePlus }: { src: string; durationSec: number; isMine: boolean; messageId?: number; viewerIsPrimePlus?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSec, setCurrentSec] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const SPEEDS = [0.5, 1, 1.5, 2];

  const handleTranscribe = async () => {
    if (transcript) { setShowTranscript(v => !v); return; }
    if (!messageId || transcribing) return;
    setTranscribing(true);
    try {
      const token = sessionStorage.getItem("pulse-token");
      const res = await fetch("/api/messages/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
        body: JSON.stringify({ messageId }),
      });
      if (res.ok) {
        const data = await res.json();
        setTranscript(data.transcript);
        setShowTranscript(true);
      }
    } catch {} finally {
      setTranscribing(false);
    }
  };

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

  // 40 bars with organic height variation seeded by position
  const BARS = 40;
  const bars = Array.from({ length: BARS }, (_, i) => {
    const t = i / BARS;
    const h = 6
      + Math.abs(Math.sin(i * 0.97 + 0.5)) * 18
      + Math.abs(Math.cos(i * 1.73 + 1.2)) * 10
      + Math.abs(Math.sin(i * 3.1 + 2.5)) * 6;
    const filled = t * 100 < progress;
    return { h: Math.max(4, Math.min(34, h)), filled };
  });

  return (
    <div className="flex items-center gap-2 md:gap-3 min-w-[170px] md:min-w-[220px]">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play / Pause button */}
      <div className="relative shrink-0">
        {playing && (
          <motion.div
            className={cn(
              "absolute inset-0 rounded-full",
              isMine ? "bg-white/30" : "bg-primary/20"
            )}
            animate={{ scale: [1, 1.55, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <button
          onClick={toggle}
          className={cn(
            "relative w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all active:scale-90",
            isMine
              ? "bg-white/95 text-primary shadow-sm hover:bg-white"
              : "bg-primary text-white shadow-[0_4px_16px_rgba(234,88,12,0.40)] hover:brightness-110"
          )}
        >
          {playing
            ? <Pause size={14} fill="currentColor" className="md:w-4 md:h-4" />
            : <Play size={14} fill="currentColor" className="ml-0.5 md:w-4 md:h-4" />}
        </button>
      </div>

      {/* Waveform + controls */}
      <div className="flex-1 flex flex-col gap-1.5 md:gap-2 min-w-0">
        {/* Waveform bars */}
        <div className="flex items-center gap-[2px] md:gap-[2.5px] h-7 md:h-9 overflow-hidden">
          {bars.map((bar, i) => (
            <motion.div
              key={i}
              style={{ height: Math.min(bar.h, 26) }}
              animate={playing && !bar.filled
                ? { scaleY: [1, 1.6, 0.7, 1.3, 1] }
                : { scaleY: 1 }}
              transition={playing && !bar.filled
                ? { duration: 0.55, repeat: Infinity, delay: i * 0.018, ease: "easeInOut" }
                : { duration: 0.15 }}
              className={cn(
                "w-[2px] md:w-[2.5px] rounded-full origin-center transition-colors shrink-0",
                bar.filled
                  ? isMine ? "bg-white" : "bg-primary"
                  : isMine ? "bg-white/35" : "bg-foreground/20"
              )}
            />
          ))}
        </div>

        {/* Time + speed + transcript */}
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-[11px] font-bold font-mono tabular-nums leading-none",
            isMine ? "text-white/75" : "text-muted-foreground"
          )}>
            {fmt(displayDur)}
          </span>

          <button
            onClick={cycleSpeed}
            className={cn(
              "text-[9px] font-black px-1.5 py-0.5 rounded-full border leading-none transition-all hover:scale-105 active:scale-95",
              isMine
                ? "border-white/25 text-white/70 bg-black/10 hover:border-white/50"
                : "border-border text-muted-foreground bg-secondary/50 hover:text-primary hover:border-primary/40"
            )}
          >
            {speed}×
          </button>

          {viewerIsPrimePlus && messageId && (
            <button
              onClick={handleTranscribe}
              disabled={transcribing}
              title="AI транскрипция (Prime+)"
              className={cn(
                "text-[9px] font-black px-1.5 py-0.5 rounded-full border leading-none transition-all hover:scale-105 active:scale-95",
                transcript && showTranscript
                  ? isMine
                    ? "border-purple-300/50 text-purple-100 bg-purple-500/25"
                    : "border-purple-500/50 text-purple-400 bg-purple-500/10"
                  : isMine
                    ? "border-white/20 text-white/55 bg-black/5 hover:border-white/40"
                    : "border-border text-muted-foreground bg-secondary/50 hover:text-purple-400 hover:border-purple-500/40"
              )}
            >
              {transcribing ? "…" : "АА"}
            </button>
          )}

          {/* Mic icon to indicate voice */}
          <Mic size={11} className={cn("ml-auto shrink-0", isMine ? "text-white/40" : "text-muted-foreground/40")} />
        </div>

        {showTranscript && transcript && (
          <p className={cn(
            "text-[11px] italic leading-snug border-l-2 pl-2 mt-0.5",
            isMine
              ? "text-white/70 border-white/25"
              : "text-muted-foreground border-primary/30"
          )}>
            {transcript}
          </p>
        )}
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
                "w-full text-left rounded-xl overflow-hidden transition-all relative border",
                isMyVote
                  ? isMine
                    ? "ring-2 ring-white/50 border-white/30"
                    : "ring-2 ring-primary border-primary/40"
                  : isMine
                    ? "border-white/15 hover:scale-[1.01] active:scale-[0.99]"
                    : "border-border/60 hover:scale-[1.01] active:scale-[0.99]"
              )}
            >
              <div
                className={cn(
                  "absolute inset-0 transition-all duration-500",
                  isMyVote
                    ? isMine ? "bg-white/10" : "bg-primary/20"
                    : isMine ? "bg-black/10" : "bg-secondary"
                )}
                style={{ width: `${pct}%`, minWidth: pct > 0 ? "8px" : "0" }}
              />
              <div className={cn(
                "relative px-3 py-2.5 flex items-center justify-between gap-2",
                isMine ? "bg-black/8" : "bg-secondary/40"
              )}>
                <span className={cn("text-[13px] font-semibold truncate", isMine ? "text-white" : "text-foreground")}>
                  {option}
                </span>
                <span className={cn("text-[12px] font-black shrink-0 tabular-nums", isMine ? "text-white/70" : "text-primary/80")}>
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
  typingOut?: boolean;
  onTypingDone?: () => void;
  searchHighlight?: string;
  isActiveMatch?: boolean;
  messageRef?: React.RefCallback<HTMLDivElement>;
  isChannel?: boolean;
  onComment?: (msg: Message) => void;
  isSenderAdmin?: boolean;
}

function HighlightText({ text, query, isMine }: { text: string; query: string; isMine: boolean }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className={cn(
              "rounded px-[1px] font-black",
              isMine ? "bg-white/30 text-white" : "bg-yellow-400/40 text-foreground"
            )}
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

export function MessageBubble({ message, onReply, onEdit, ownBubbleStyle, onPin, typingOut, onTypingDone, searchHighlight, isActiveMatch, messageRef, isChannel, onComment, isSenderAdmin }: MessageBubbleProps) {
  const { currentUserId } = useAppContext();
  const { data: me } = useGetMe();
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const isMine = message.senderId === currentUserId;
  const viewerIsPrimePlus = !!(me as any)?.hasPrime && (me as any)?.primeTier === "prime_plus";
  const effect = (message as any).effect as string | null;
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  const swipeAxis = useRef<"h" | "v" | null>(null);
  const [swipeDx, setSwipeDx] = useState(0);
  const lastTapRef = useRef<number>(0);
  const [heartFlash, setHeartFlash] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardSearch, setForwardSearch] = useState("");
  const [forwarding, setForwarding] = useState(false);
  const { data: allChats } = useGetChats();

  // Pending state — show clock for ~1.5s after a new outgoing message appears
  const [isPending, setIsPending] = useState<boolean>(() => {
    if (!isMine) return false;
    const age = Date.now() - new Date(message.createdAt).getTime();
    return age < 1500;
  });

  useEffect(() => {
    if (!isMine) return undefined;
    const age = Date.now() - new Date(message.createdAt).getTime();
    const remaining = 1500 - age;
    if (remaining > 0) {
      const t = setTimeout(() => setIsPending(false), remaining);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [message.createdAt, isMine]);

  // Play effect if message is recent (within 20s) and effect hasn't played yet this session
  const [effectPlaying, setEffectPlaying] = useState<boolean>(() => {
    if (!effect) return false;
    const key = `effect-played-${message.id}`;
    if (sessionStorage.getItem(key)) return false;
    const age = Date.now() - new Date(message.createdAt).getTime();
    if (age > 20000) return false;
    sessionStorage.setItem(key, "1");
    return true;
  });

  const [showChannelReactionPicker, setShowChannelReactionPicker] = useState(false);
  const [showEmojiGrid, setShowEmojiGrid] = useState(false);
  const channelReactionPickerRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<{ urls: string[]; idx: number } | null>(null);
  const [displayedWords, setDisplayedWords] = useState<number>(typingOut ? 0 : Infinity);
  const typingDoneRef = useRef(false);

  useEffect(() => {
    if (!typingOut || message.type !== "text" || !message.text) return;
    const words = message.text.split(" ");
    setDisplayedWords(0);
    typingDoneRef.current = false;
    let idx = 0;
    const WORD_DELAY = Math.max(8, Math.min(14, 800 / words.length));
    const timer = setInterval(() => {
      idx++;
      setDisplayedWords(idx);
      if (idx >= words.length) {
        clearInterval(timer);
        typingDoneRef.current = true;
        onTypingDone?.();
      }
    }, WORD_DELAY);
    return () => clearInterval(timer);
  }, [typingOut, message.id]);

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
    setShowEmojiGrid(false);
  };

  const isDeleted = !!(message as any).isDeleted;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDeleted) return;
    openMenu(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleted) return;
    const touch = e.touches[0];
    longPressRef.current = setTimeout(() => {
      navigator.vibrate?.(12);
      openMenu(touch.clientX, touch.clientY);
    }, 500);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    if (isDeleted) return;
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      lastTapRef.current = 0;
      navigator.vibrate?.(8);
      setHeartFlash(true);
      setTimeout(() => setHeartFlash(false), 600);
      handleReact("❤️");
    } else {
      lastTapRef.current = now;
    }
  };

  const handleTouchMove = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    lastTapRef.current = 0;
  };

  useEffect(() => {
    if (!showMenu) return;
    const close = () => closeMenu();
    const onKeydown = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKeydown);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKeydown);
    };
  }, [showMenu]);

  useEffect(() => {
    if (!showChannelReactionPicker) return;
    const close = (e: MouseEvent) => {
      if (channelReactionPickerRef.current && !channelReactionPickerRef.current.contains(e.target as Node)) {
        setShowChannelReactionPicker(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showChannelReactionPicker]);

  const handleReact = async (emoji: string) => {
    closeMenu();
    const reactions = (message as any).reactions || [];
    const allMyReactions = reactions.filter((r: any) => r.userId === currentUserId);
    const myReactionsForThis = allMyReactions.filter((r: any) => r.emoji === emoji);
    const maxReactions = viewerIsPrimePlus ? 2 : 1;
    try {
      if (myReactionsForThis.length > 0) {
        // Toggle off: remove this emoji reaction
        await fetch(`/api/messages/${message.id}/reactions`, {
          method: "DELETE", headers, body: JSON.stringify({ emoji }),
        });
      } else {
        // Need to add this emoji — remove oldest if at limit
        if (allMyReactions.length >= maxReactions) {
          const oldestEmoji = allMyReactions[0].emoji;
          await fetch(`/api/messages/${message.id}/reactions`, {
            method: "DELETE", headers, body: JSON.stringify({ emoji: oldestEmoji }),
          });
        }
        await fetch(`/api/messages/${message.id}/reactions`, {
          method: "POST", headers, body: JSON.stringify({ emoji }),
        });
        import("@/utils/questTracker").then(({ trackQuestAction }) => trackQuestAction("reaction_added"));
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
    // Delay so the touch event that closed the menu doesn't immediately
    // trigger Radix UI's "pointer down outside" handler and close the dialog.
    setTimeout(() => setConfirmDelete(true), 80);
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
        body: JSON.stringify({ text: message.text, targetLang: lang }),
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

  const handleForwardTo = async (targetChatId: number) => {
    setForwarding(true);
    try {
      const token = sessionStorage.getItem("pulse-token");
      const authHeaders = { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) };
      // Build payload: for media messages include type + mediaUrl so the forwarded
      // message actually shows the photo/audio instead of just a text description.
      const isMedia = message.type === "image" || message.type === "audio" || message.type === "sticker";
      const payload: Record<string, unknown> = { chatId: targetChatId };
      if (isMedia && message.mediaUrl) {
        payload.type = message.type;
        payload.mediaUrl = message.mediaUrl;
        payload.text = message.text || undefined;
      } else {
        const forwardText = message.type === "text"
          ? message.text || ""
          : message.type === "image" ? "📷 Фото" : message.type === "audio" ? "🎤 Голосовое" : "Сообщение";
        payload.text = `⤵️ ${forwardText}`;
      }
      await fetch(`/api/messages`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
    } catch {} finally {
      setForwarding(false);
      setShowForwardModal(false);
      setForwardSearch("");
    }
  };

  const formatTime = (dateStr: string) => format(new Date(dateStr), "HH:mm");

  const reactions = ((message as any).reactions || []) as { emoji: string; userId: number; user?: any }[];
  const groupedReactions = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, users: [], mine: false, myCount: 0 };
    acc[r.emoji].count++;
    acc[r.emoji].users.push(r.user?.displayName || "?");
    if (r.userId === currentUserId) {
      acc[r.emoji].mine = true;
      acc[r.emoji].myCount++;
    }
    return acc;
  }, {} as Record<string, { count: number; users: string[]; mine: boolean; myCount: number }>);

  const replyTo = (message as any).replyTo as (Message & { sender?: any }) | null;
  const pollData = (message as any).pollData;


  const renderContent = () => {
    switch (message.type as string) {
      case "poll":
        return <PollDisplay pollData={pollData} messageId={message.id} chatId={message.chatId} currentUserId={currentUserId} isMine={isMine} />;
      case "text": {
        const FORWARD_PREFIX = "⤵️ ";
        const isForwardedMsg = (message.text ?? "").startsWith(FORWARD_PREFIX);
        const rawText = isForwardedMsg ? (message.text ?? "").slice(FORWARD_PREFIX.length) : (message.text ?? "");
        const words = rawText.split(" ");
        const isAnimating = typingOut && displayedWords < words.length;
        const visibleText = typingOut && displayedWords !== Infinity
          ? words.slice(0, displayedWords).join(" ")
          : rawText;

        function renderMarkdown(text: string): React.ReactNode[] {
          const segments: { text: string; bold?: boolean; italic?: boolean; code?: boolean; strike?: boolean; url?: string }[] = [];
          const combined = /(\*\*[^*]+\*\*|(?<!\*)\*(?!\*)[^*]+(?<!\*)\*(?!\*)|`[^`]+`|~~[^~]+~~|https?:\/\/[^\s<>"']+)/g;
          let last = 0;
          let m: RegExpExecArray | null;
          combined.lastIndex = 0;
          while ((m = combined.exec(text)) !== null) {
            if (m.index > last) segments.push({ text: text.slice(last, m.index) });
            const chunk = m[0];
            if (chunk.startsWith("**"))       segments.push({ text: chunk.slice(2, -2), bold: true });
            else if (chunk.startsWith("~~"))  segments.push({ text: chunk.slice(2, -2), strike: true });
            else if (chunk.startsWith("`"))   segments.push({ text: chunk.slice(1, -1), code: true });
            else if (chunk.startsWith("*"))   segments.push({ text: chunk.slice(1, -1), italic: true });
            else                              segments.push({ text: chunk, url: chunk });
            last = m.index + chunk.length;
          }
          if (last < text.length) segments.push({ text: text.slice(last) });

          return segments.map((seg, i) => {
            if (seg.code) return <code key={i} className={cn("px-1 py-0.5 rounded text-[13px] font-mono", isMine ? "bg-white/10 text-white" : "bg-secondary text-foreground")}>{seg.text}</code>;
            if (seg.url) {
              // Detect invite links from the same origin and navigate internally
              try {
                const parsed = new URL(seg.url, window.location.origin);
                const pathMatch = parsed.pathname.match(/^\/join\/([^/?#]+)$/);
                if (pathMatch && parsed.origin === window.location.origin) {
                  return (
                    <button
                      key={i}
                      className={cn("underline underline-offset-2 cursor-pointer", isMine ? "text-white/90" : "text-primary")}
                      onClick={e => { e.stopPropagation(); navigate(`/invite/${pathMatch[1]}`); }}
                    >
                      {seg.text}
                    </button>
                  );
                }
              } catch {
                // invalid URL — fall through to normal anchor
              }
              return <a key={i} href={seg.url} target="_blank" rel="noopener noreferrer" className={cn("underline underline-offset-2", isMine ? "text-white/90" : "text-primary")} onClick={e => e.stopPropagation()}>{seg.text}</a>;
            }
            if (seg.bold && seg.italic) return <strong key={i}><em>{seg.text}</em></strong>;
            if (seg.bold)   return <strong key={i}>{seg.text}</strong>;
            if (seg.italic) return <em key={i}>{seg.text}</em>;
            if (seg.strike) return <del key={i} className="opacity-60">{seg.text}</del>;
            return <React.Fragment key={i}>{seg.text}</React.Fragment>;
          });
        }

        return (
          <div>
            {isForwardedMsg && (
              <p className={cn("text-[11px] italic font-medium mb-1 opacity-70", isMine ? "text-white/80" : "text-muted-foreground")}>
                Переслано
              </p>
            )}
            <p className="text-[15px] whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-snug font-medium">
              {searchHighlight
                ? <HighlightText text={visibleText} query={searchHighlight} isMine={isMine} />
                : renderMarkdown(visibleText)}
              {isAnimating && (
                <span className="inline-block w-[2px] h-[14px] ml-[2px] mb-[-2px] align-middle rounded-sm animate-pulse" style={{ background: isMine ? "rgba(255,255,255,0.7)" : "currentColor", opacity: 0.7 }} />
              )}
            </p>
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
      }
      case "image":
        return (
          <div className="rounded-xl overflow-hidden -mx-1 -mt-1 mb-1">
            <img
              src={message.mediaUrl || ""}
              alt="photo"
              className="max-w-[280px] max-h-[320px] object-cover block w-full cursor-zoom-in"
              onClick={() => setLightbox({ urls: [message.mediaUrl || ""], idx: 0 })}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            {message.text && <p className="text-[15px] mt-3 px-2 mb-1 font-medium">{message.text}</p>}
          </div>
        );
      case "album": {
        let albumUrls: string[] = [];
        let albumCaption = "";
        try {
          // New format: urls JSON in mediaUrl, caption in text
          const parsedMedia = JSON.parse(message.mediaUrl || "{}");
          if (Array.isArray(parsedMedia.urls)) {
            albumUrls = parsedMedia.urls;
            albumCaption = message.text || "";
          } else {
            // Legacy format: both in text field
            const parsedText = JSON.parse(message.text || "{}");
            albumUrls = parsedText.urls || [];
            albumCaption = parsedText.caption || "";
          }
        } catch { albumUrls = [message.mediaUrl || ""]; }
        const visibleCount = Math.min(albumUrls.length, 4);
        const extra = albumUrls.length - 4;
        const isThree = visibleCount === 3;
        return (
          <div className="rounded-xl overflow-hidden -mx-1 -mt-1 mb-1">
            {isThree ? (
              <div className="flex flex-col gap-[1px]">
                <div className="relative overflow-hidden bg-secondary" style={{ aspectRatio: "16/9" }}>
                  <img
                    src={albumUrls[0]}
                    alt="photo 1"
                    className="w-full h-full object-cover cursor-zoom-in block"
                    onClick={() => setLightbox({ urls: albumUrls, idx: 0 })}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
                <div className="flex gap-[1px]">
                  {[1, 2].map((i) => (
                    <div key={i} className="relative flex-1 overflow-hidden bg-secondary" style={{ aspectRatio: "3/2" }}>
                      <img
                        src={albumUrls[i]}
                        alt={`photo ${i + 1}`}
                        className="w-full h-full object-cover cursor-zoom-in block"
                        onClick={() => setLightbox({ urls: albumUrls, idx: i })}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`grid gap-[1px] ${visibleCount === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {albumUrls.slice(0, 4).map((url, i) => (
                  <div
                    key={i}
                    className="relative overflow-hidden bg-secondary"
                    style={{ aspectRatio: visibleCount === 1 ? "4/3" : "4/3" }}
                  >
                    <img
                      src={url}
                      alt={`photo ${i + 1}`}
                      className="w-full h-full object-cover cursor-zoom-in block"
                      onClick={() => setLightbox({ urls: albumUrls, idx: i })}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    {i === 3 && extra > 0 && (
                      <div
                        className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-zoom-in"
                        onClick={() => setLightbox({ urls: albumUrls, idx: 3 })}
                      >
                        <span className="text-white text-2xl font-black">+{extra}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {albumCaption && <p className="text-[15px] mt-2 px-2 mb-1 font-medium">{albumCaption}</p>}
          </div>
        );
      }
      case "audio": {
        const durSec = parseInt((message.text || "voice:0").replace("voice:", "")) || 0;
        return <VoicePlayer src={message.mediaUrl || ""} durationSec={durSec} isMine={isMine} messageId={message.id} viewerIsPrimePlus={viewerIsPrimePlus} />;
      }
      case "sticker": {
        const rawUrl = message.mediaUrl || "";
        const svgUrl = rawUrl.replace(/\.png(\?.*)?$/, ".svg");
        return (
          <div className="-mx-3 -my-2">
            <img
              src={svgUrl || rawUrl}
              alt="стикер"
              className="w-32 h-32 object-contain block"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.src !== rawUrl && rawUrl) { img.src = rawUrl; return; }
                img.style.display = "none";
              }}
            />
          </div>
        );
      }
      case "video": {
        let videoName = "Видео";
        try { const p = JSON.parse(message.text || "{}"); videoName = p.name || "Видео"; } catch {}
        return (
          <div className="rounded-xl overflow-hidden -mx-1 -mt-1 mb-1">
            <video
              src={message.mediaUrl || ""}
              controls
              playsInline
              className="max-w-[280px] max-h-[320px] w-full block rounded-xl"
              preload="metadata"
            />
            <p className="text-[11px] text-muted-foreground px-2 pb-1 pt-1 truncate">{videoName}</p>
          </div>
        );
      }
      case "document": {
        let docMeta = { name: "Файл", size: 0, mime: "application/octet-stream" };
        try { docMeta = { ...docMeta, ...JSON.parse(message.text || "{}") }; } catch {}
        const ext = docMeta.name.split(".").pop()?.toLowerCase() ?? "";
        const isAudioFile = docMeta.mime.startsWith("audio/") || ["mp3","ogg","wav","flac","aac","m4a","opus","wma"].includes(ext);
        const isVideoFile = docMeta.mime.startsWith("video/") || ["mp4","webm","mkv","avi","mov","m4v"].includes(ext);
        const iconColor =
          docMeta.mime === "application/pdf" ? "text-red-400 bg-red-500/10" :
          ["zip","rar","7z","tar","gz"].includes(ext) ? "text-yellow-400 bg-yellow-500/10" :
          ["js","ts","html","css","py","json","xml","php"].includes(ext) ? "text-green-400 bg-green-500/10" :
          ["doc","docx","xls","xlsx","ppt","pptx"].includes(ext) ? "text-blue-400 bg-blue-500/10" :
          isAudioFile ? "text-purple-400 bg-purple-500/10" :
          isVideoFile ? "text-blue-400 bg-blue-500/10" :
          "text-muted-foreground bg-secondary";
        const formatBytes = (b: number) => b < 1024 ? `${b} Б` : b < 1048576 ? `${(b/1024).toFixed(1)} КБ` : `${(b/1048576).toFixed(1)} МБ`;
        if (isAudioFile && message.mediaUrl) {
          return (
            <div className="py-1 min-w-[220px]">
              <audio
                src={message.mediaUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full max-w-[280px] rounded-xl"
                style={{ height: 36 }}
                onClick={e => e.stopPropagation()}
              />
              <a
                href={message.mediaUrl}
                download={docMeta.name}
                className={`block mt-1 text-[11px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"} truncate hover:underline`}
                onClick={e => e.stopPropagation()}
              >
                {docMeta.name} {docMeta.size > 0 ? `· ${formatBytes(docMeta.size)}` : ""}
              </a>
            </div>
          );
        }
        if (isVideoFile && message.mediaUrl) {
          return (
            <div className="rounded-xl overflow-hidden -mx-1 -mt-1 mb-1">
              <video
                src={message.mediaUrl}
                controls
                playsInline
                preload="metadata"
                className="max-w-[280px] max-h-[320px] w-full block rounded-xl"
                onClick={e => e.stopPropagation()}
              />
              <a
                href={message.mediaUrl}
                download={docMeta.name}
                className={`block px-2 pb-1 pt-1 text-[11px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"} truncate hover:underline`}
                onClick={e => e.stopPropagation()}
              >
                {docMeta.name} {docMeta.size > 0 ? `· ${formatBytes(docMeta.size)}` : ""}
              </a>
            </div>
          );
        }
        return (
          <a
            href={message.mediaUrl || ""}
            download={docMeta.name}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 py-1 hover:opacity-80 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
              {["zip","rar","7z","tar","gz"].includes(ext) ? <span className="text-lg">📦</span> :
               ["js","ts","html","css","py","json","xml","php"].includes(ext) ? <span className="text-lg">💻</span> :
               docMeta.mime === "application/pdf" ? <span className="text-lg">📄</span> :
               ["doc","docx"].includes(ext) ? <span className="text-lg">📝</span> :
               ["xls","xlsx"].includes(ext) ? <span className="text-lg">📊</span> :
               isAudioFile ? <span className="text-lg">🎵</span> :
               isVideoFile ? <span className="text-lg">🎬</span> :
               <span className="text-lg">📎</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold truncate max-w-[180px]">{docMeta.name}</p>
              <p className={`text-[11px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {docMeta.size > 0 ? formatBytes(docMeta.size) : ext.toUpperCase() || "Файл"} · скачать
              </p>
            </div>
          </a>
        );
      }
      case "call":
        return <p className="text-[15px] font-bold italic opacity-80">📞 Звонок завершён</p>;
      default:
        return <p className="text-[15px] font-medium">[{message.type}] {message.text}</p>;
    }
  };

  const handleSwipeStart = (e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
    swipeAxis.current = null;
  };

  const handleSwipeMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - swipeStartX.current;
    const dy = e.touches[0].clientY - swipeStartY.current;
    if (!swipeAxis.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      swipeAxis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (swipeAxis.current === "v") return;
    const clamped = Math.max(0, Math.min(dx, 80));
    setSwipeDx(clamped);
  };

  const handleSwipeEnd = () => {
    if (swipeDx >= 48 && onReply) onReply(message);
    setSwipeDx(0);
    swipeAxis.current = null;
  };

  return (
    <div
      className="relative"
      onTouchStart={handleSwipeStart}
      onTouchMove={handleSwipeMove}
      onTouchEnd={handleSwipeEnd}
    >
      {swipeDx > 12 && (
        <div
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center pointer-events-none z-10"
          style={{ opacity: Math.min(swipeDx / 60, 1) }}
        >
          <Reply size={15} className="text-primary" />
        </div>
      )}
      <>
        <motion.div
          ref={messageRef}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0, x: swipeDx }}
          transition={{
            opacity: { duration: 0.2 },
            y: { duration: 0.2 },
            x: swipeDx === 0 ? { type: "spring", stiffness: 400, damping: 30 } : { duration: 0 },
          }}
          className={cn(
            "flex w-full group select-none relative",
            isMine ? "justify-end" : "justify-start",
            isActiveMatch && "rounded-2xl ring-2 ring-yellow-400/60 ring-offset-2 ring-offset-background"
          )}
        >
        <div className={cn(
          "flex",
          message.type === "audio" ? "max-w-[75%] md:max-w-[65%]" : (message.type === "album" ? "max-w-[72%] md:max-w-[60%]" : "max-w-[85%] md:max-w-[70%]"),
          isMine ? "flex-row-reverse" : "flex-row",
          "items-end gap-2.5"
        )}>
          {!isMine && (
            <div
              className={cn(
                "w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[13px] font-black text-white overflow-hidden shadow-sm relative",
                message.type === "audio" ? "self-center" : "mb-6"
              )}
              style={{ backgroundColor: message.sender?.avatarColor || "#555" }}
            >
              <span className="absolute inset-0 flex items-center justify-center">{(message.sender?.displayName || "U")[0].toUpperCase()}</span>
              {message.sender?.avatarUrl && (
                <img src={message.sender.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5 relative min-w-0">
            <div
              ref={bubbleRef}
              onContextMenu={handleContextMenu}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchMove}
              className={cn(
                "relative cursor-pointer transition-transform active:scale-[0.98] max-w-full overflow-hidden",
                message.type === "sticker"
                  ? "px-1 py-1 bg-transparent border-none shadow-none"
                  : cn(
                    message.type === "audio" ? "px-3 py-2.5 md:px-5 md:py-3.5 rounded-[20px] md:rounded-[24px]" : "px-3.5 py-2.5 sm:px-5 sm:py-3.5 rounded-[20px] sm:rounded-[24px]",
                    isDeleted
                      ? "bg-secondary/50 text-muted-foreground rounded-bl-sm border border-border"
                      : isMine
                        ? (ownBubbleStyle ? "text-white rounded-br-sm border border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.25)]" : "bubble-mine text-primary-foreground rounded-br-sm")
                        : "bg-secondary text-foreground rounded-bl-sm border border-border shadow-[0_2px_10px_rgba(0,0,0,0.18)]"
                  )
              )}
              style={isMine && ownBubbleStyle && message.type !== "sticker" ? ownBubbleStyle : undefined}
            >
              {/* Double-tap ❤️ flash */}
              {heartFlash && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: 1, scale: 1.4 }}
                  exit={{ opacity: 0, scale: 1.8 }}
                  transition={{ duration: 0.28, ease: "backOut" }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 text-3xl select-none"
                >
                  ❤️
                </motion.span>
              )}
              {!isMine && message.sender && (
                <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                  {/* Sender name: gradient for Prime+ */}
                  {(message.sender as any).hasPrime && (message.sender as any).primeTier === "prime_plus" ? (
                    <p
                      className="text-[12px] font-black leading-none"
                      style={{
                        background: "linear-gradient(90deg, #a855f7, #ec4899, #f97316)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      {message.sender.displayName}
                    </p>
                  ) : (
                    <p className="text-[12px] font-black leading-none" style={{ color: message.sender.avatarColor }}>
                      {message.sender.displayName}
                    </p>
                  )}
                  {/* Prime+ diamond badge */}
                  {(message.sender as any).hasPrime && (message.sender as any).primeTier === "prime_plus" && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none border"
                      style={{
                        background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.15))",
                        borderColor: "rgba(168,85,247,0.4)",
                        color: "#c084fc",
                      }}
                    >
                      <Sparkles size={8} className="shrink-0" />
                      PRIME+
                    </span>
                  )}
                  {/* Prime crown badge */}
                  {(message.sender as any).hasPrime && (message.sender as any).primeTier === "prime" && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none border bg-yellow-500/15 text-yellow-400 border-yellow-500/30">
                      <Crown size={8} className="shrink-0" />
                      PRIME
                    </span>
                  )}
                  {/* Admin badge for global admins or channel/group admins */}
                  {(isSenderAdmin || (message.sender as any).isAdmin) && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none border"
                      style={{
                        background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.2))",
                        borderColor: "rgba(99,102,241,0.45)",
                        color: "#818cf8",
                      }}
                    >
                      <Shield size={8} className="shrink-0" />
                      ADMIN
                    </span>
                  )}
                </div>
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
                    {(replyTo as any).isDeleted ? "🗑 Сообщение удалено" : replyTo.type === "image" ? "📷 Фото" : replyTo.type === "audio" ? "🎤 Голосовое" : replyTo.text || "Сообщение"}
                  </p>
                </div>
              )}

              {(message as any).isDeleted ? (
                (message as any).deletedContentVisible ? (
                  <div className="relative">
                    <div className="opacity-40 pointer-events-none select-none">
                      {renderContent()}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={cn(
                        "flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg backdrop-blur-sm",
                        isMine ? "bg-black/40 text-white" : "bg-secondary/90 text-foreground"
                      )}>
                        <Eye size={11} />
                        Удалено
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className={cn("text-[14px] font-medium italic opacity-60 select-none", isMine ? "text-white" : "text-foreground")}>
                    🗑 Сообщение удалено
                  </p>
                )
              ) : renderContent()}

              <div className={cn(
                "flex items-center justify-end gap-1.5 mt-2.5 text-[11px] font-bold",
                isMine ? "text-primary-foreground/70" : "text-muted-foreground/70"
              )}>
                {!(message as any).isDeleted && (message as any).isEdited && (
                  <span className="uppercase tracking-wider">ред.</span>
                )}
                <span>{formatTime(message.createdAt)}</span>
                {isMine && (() => {
                  const isDelivered = (message as any).isDelivered;
                  const label = isPending
                    ? "Отправляется…"
                    : message.isRead
                      ? "Прочитано"
                      : isDelivered
                        ? "Доставлено"
                        : "Отправлено";
                  return (
                    <div className="relative group/receipt cursor-default">
                      {isPending
                        ? <Clock size={13} className="opacity-55" />
                        : message.isRead
                          ? <CheckCheck size={15} strokeWidth={2.5} className="text-blue-200/90" />
                          : isDelivered
                            ? <CheckCheck size={15} strokeWidth={2.5} className="opacity-50" />
                            : <Check size={15} strokeWidth={2.5} className="opacity-70" />
                      }
                      <div className="pointer-events-none absolute bottom-full right-0 mb-1.5 hidden group-hover/receipt:block z-50">
                        <div className="bg-popover text-popover-foreground border border-border text-[10px] font-semibold px-2 py-1 rounded-lg shadow-lg whitespace-nowrap">
                          {label}
                        </div>
                      </div>
                    </div>
                  );
                })()}
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
                      "flex items-center gap-1 px-2.5 py-1 rounded-[12px] text-[13px] font-black border transition-all hover:scale-105 active:scale-95 shadow-sm",
                      data.mine
                        ? "bg-primary border-transparent text-white"
                        : "bg-card border-border text-foreground hover:border-primary/50"
                    )}
                  >
                    <span>{emoji}</span>
                    <span>{data.count}</span>
                    {data.myCount >= 2 && (
                      <span className="text-[9px] font-black px-1 py-0.5 rounded bg-white/25 leading-none">×2</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Channel reactions + comments row */}
            {isChannel && !(message as any).replyToId && (
              <div className={cn("mt-1.5 relative", isMine ? "flex justify-end" : "flex justify-start")}>
                <div className="flex items-center gap-1.5">
                  {/* React button */}
                  <div className="relative" ref={channelReactionPickerRef}>
                    <button
                      onClick={() => setShowChannelReactionPicker(v => !v)}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1.5 rounded-full border transition-all text-[12px] font-bold group",
                        showChannelReactionPicker
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "bg-secondary/60 border-border hover:border-primary/30 hover:bg-primary/10 text-muted-foreground hover:text-primary"
                      )}
                    >
                      <SmilePlus size={12} className="group-hover:scale-110 transition-transform" />
                    </button>
                    {/* Inline reaction picker */}
                    {showChannelReactionPicker && (
                      <div
                        className="absolute bottom-full mb-2 left-0 z-50 flex items-center gap-0.5 bg-card border border-border rounded-2xl shadow-xl px-1.5 py-1"
                        onMouseDown={e => e.stopPropagation()}
                      >
                        {QUICK_REACTIONS.map(emoji => {
                          const reacted = groupedReactions[emoji]?.mine;
                          return (
                            <button
                              key={emoji}
                              onClick={() => { handleReact(emoji); setShowChannelReactionPicker(false); }}
                              className={cn(
                                "w-9 h-9 flex items-center justify-center rounded-xl text-xl transition-all hover:scale-110 active:scale-95",
                                reacted ? "bg-primary/20" : "hover:bg-secondary"
                              )}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* Comments button */}
                  {onComment && (
                    <button
                      onClick={() => onComment(message)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 border border-border hover:border-primary/30 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all text-[12px] font-bold group"
                    >
                      <MessageSquare size={12} className="group-hover:scale-110 transition-transform" />
                      Комментарии
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Send effect overlay — plays once after sending */}
            <AnimatePresence>
              {effectPlaying && effect && (
                <EffectOverlay effect={effect} onDone={() => setEffectPlaying(false)} />
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showMenu && menuPos && (
          <>
            <motion.div
              key="menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[998] bg-black/40"
              onMouseDown={closeMenu}
              onTouchStart={closeMenu}
            />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed z-[999] select-none"
            style={{
              left: Math.max(8, Math.min(menuPos.x, window.innerWidth - 256)),
              top: Math.max(8, Math.min(menuPos.y, window.innerHeight - 400)),
            }}
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
          >
            <div className="bg-card border border-border rounded-[24px] shadow-2xl overflow-hidden min-w-[220px]">
              <div className="flex items-center justify-between p-2.5 border-b border-border bg-secondary/30">
                {QUICK_REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className={cn(
                      "text-xl w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-card hover:scale-110 hover:shadow-sm",
                      (groupedReactions[emoji]?.mine) && "bg-primary/20 text-primary"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onTouchStart={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setShowEmojiGrid(v => !v); }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-card hover:text-foreground transition-all"
                >
                  <SmilePlus size={20} />
                </button>
              </div>
              {showEmojiGrid && (
                <div
                  className="px-2 pb-2 grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto"
                  onMouseDown={e => e.stopPropagation()}
                  onTouchStart={e => e.stopPropagation()}
                >
                  {["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","☺️","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","❤️‍🔥","💔","💕","💞","💓","💗","💖","💘","💝","👍","👎","👏","🙌","👐","🤲","🤝","🙏","✌️","🤞","🤟","🤘","🤙","💪","🦾","🖖","✋","🤚","👋","🤏","🖐","👌","🤌","🤏","✊","👊","🤛","🤜","🌟","⭐","🔥","✨","💫","🎉","🎊","🎁","🎈","🎀","🏆","🥇","🎯","💯","🚀","💥","⚡","💎","🍀","🌸","🌺","🌹","🌻","🌷","🍕","🍔","🍟","🌮","🍣","🍜","🍦","🍰","🎂","🍫","🍬","🍭","🥂","🍾","☕","🧋","🎵","🎶","🎸","🎹","🎤","🎬","📸","🎮","⚽","🏀","🎾","🏈","⚾","🥊","🎳","🏂","🏄","🧘","🚴","🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🦋","🌞","🌝","🌛","🌚","🌕","🌙","⭐","🌟","💫","✨"].map(e => (
                    <button
                      key={e}
                      onClick={() => { handleReact(e); setShowEmojiGrid(false); }}
                      onMouseDown={ev => ev.stopPropagation()}
                      onTouchStart={ev => ev.stopPropagation()}
                      className="text-lg w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
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
                <button
                  onClick={() => { closeMenu(); setShowForwardModal(true); }}
                  className="w-full flex items-center gap-3 px-3 py-3 text-[15px] font-bold text-foreground hover:bg-secondary rounded-xl transition-colors text-left"
                >
                  <Forward size={18} className="text-green-500" />
                  Переслать
                </button>
                {isMine && onEdit && message.type === "text" && (
                  <button
                    onClick={() => { closeMenu(); onEdit(message); }}
                    className="w-full flex items-center gap-3 px-3 py-3 text-[15px] font-bold text-foreground hover:bg-secondary rounded-xl transition-colors text-left"
                  >
                    <Pencil size={18} className="text-violet-400" />
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
          </>
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

      {/* Forward Modal */}
      <AnimatePresence>
        {showForwardModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowForwardModal(false); setForwardSearch(""); } }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", damping: 26, stiffness: 360 }}
              className="bg-card border border-border rounded-[24px] w-full max-w-sm shadow-2xl overflow-hidden max-h-[70dvh] flex flex-col"
            >
              <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0">
                <h3 className="font-black text-lg">Переслать</h3>
                <button onClick={() => { setShowForwardModal(false); setForwardSearch(""); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground">
                  <X size={16} />
                </button>
              </div>
              <div className="px-4 pb-3 shrink-0">
                <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2.5">
                  <Search size={15} className="text-muted-foreground shrink-0" />
                  <input
                    value={forwardSearch}
                    onChange={e => setForwardSearch(e.target.value)}
                    placeholder="Поиск чатов..."
                    className="flex-1 bg-transparent border-none outline-none text-[14px] font-medium placeholder:text-muted-foreground"
                    autoFocus={typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
                {(allChats || [])
                  .filter((c: any) => {
                    const name = c.type === "direct" ? (c.otherUser?.displayName || "") : (c.name || "");
                    return name.toLowerCase().includes(forwardSearch.toLowerCase());
                  })
                  .slice(0, 30)
                  .map((c: any) => {
                    const name = c.type === "direct" ? (c.otherUser?.displayName || "Чат") : (c.name || "Чат");
                    const initials = name[0]?.toUpperCase() || "?";
                    const color = c.type === "direct" ? (c.otherUser?.avatarColor || "#666") : (c.avatarColor || "#666");
                    return (
                      <button
                        key={c.id}
                        disabled={forwarding}
                        onClick={() => handleForwardTo(c.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors text-left disabled:opacity-60"
                      >
                        <div className="w-10 h-10 rounded-[12px] flex items-center justify-center text-white font-black text-base shrink-0 overflow-hidden relative" style={{ backgroundColor: color }}>
                          <span className="absolute inset-0 flex items-center justify-center">{initials}</span>
                          {(c.type === "direct" ? c.otherUser?.avatarUrl : c.avatarUrl) && <img src={c.type === "direct" ? c.otherUser?.avatarUrl : c.avatarUrl} alt={name} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[14px] truncate">{name}</p>
                          <p className="text-[12px] text-muted-foreground">{c.type === "direct" ? "Личные сообщения" : c.type === "group" ? "Группа" : "Канал"}</p>
                        </div>
                        {forwarding && <div className="ml-auto shrink-0 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                      </button>
                    );
                  })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
            onClick={() => setLightbox(null)}
          >
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/10 hover:bg-white/10 flex items-center justify-center text-white transition-colors z-10"
              onClick={() => setLightbox(null)}
            >
              <X size={20} />
            </button>

            {lightbox.urls.length > 1 && (
              <>
                <button
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/10 hover:bg-white/10 flex items-center justify-center text-white transition-colors z-10"
                  onClick={(e) => { e.stopPropagation(); setLightbox(l => l ? { ...l, idx: Math.max(0, l.idx - 1) } : null); }}
                  disabled={lightbox.idx === 0}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/10 hover:bg-white/10 flex items-center justify-center text-white transition-colors z-10"
                  onClick={(e) => { e.stopPropagation(); setLightbox(l => l ? { ...l, idx: Math.min(l.urls.length - 1, l.idx + 1) } : null); }}
                  disabled={lightbox.idx === lightbox.urls.length - 1}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {lightbox.urls.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === lightbox.idx ? "bg-white" : "bg-white/30"}`} />
                  ))}
                </div>
              </>
            )}

            <motion.img
              key={lightbox.idx}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.18 }}
              src={lightbox.urls[lightbox.idx]}
              alt="photo"
              className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      </>
    </div>
  );
}
