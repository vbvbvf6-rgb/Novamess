import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Message, useGetMe } from "@workspace/api-client-react";
import { format } from "date-fns";
import { useAppContext } from "@/contexts/AppContext";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMessagesQueryKey, getGetChatsQueryKey } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Check, CheckCheck, Clock, X, Info, Play, Pause, Mic, Reply, Pencil, Trash2, Copy, SmilePlus, Languages, Pin, PinOff, BarChart2, Eye, Crown, Wand2, MessageSquare } from "lucide-react";
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
            : "bg-primary text-white shadow-[0_4px_14px_rgba(234,88,12,0.35)] hover:scale-105 active:scale-95"
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
                ? "border-white/30 text-white/80 hover:border-white/60 bg-black/10"
                : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary bg-secondary/50"
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
                "text-[10px] font-black px-1.5 py-0.5 rounded-md border transition-all hover:scale-105 active:scale-95 flex items-center gap-0.5",
                transcript && showTranscript
                  ? isMine ? "border-purple-300/60 text-purple-200 bg-purple-500/20" : "border-purple-500/60 text-purple-400 bg-purple-500/10"
                  : isMine ? "border-white/20 text-white/60 hover:border-white/40 bg-black/5" : "border-muted-foreground/20 text-muted-foreground hover:border-purple-500/40 hover:text-purple-400"
              )}
            >
              {transcribing ? "..." : "АА"}
            </button>
          )}
        </div>
        {showTranscript && transcript && (
          <p className={cn("text-[12px] italic mt-1 leading-snug", isMine ? "text-white/70" : "text-muted-foreground")}>
            "{transcript}"
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
                    ? isMine ? "bg-white/10" : "bg-primary/20"
                    : isMine ? "bg-black/10" : "bg-secondary"
                )}
                style={{ width: `${pct}%`, minWidth: pct > 0 ? "8px" : "0" }}
              />
              <div className={cn(
                "relative px-3 py-2 flex items-center justify-between",
                isMine ? "bg-black/5" : "bg-secondary/50"
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

const GIFT_ORB_STYLES: Record<string, { sphere: string; glow: string; cardBg: string }> = {
  common:    { sphere: "radial-gradient(circle at 35% 28%, #a78bfa, #6d28d9 55%, #2e1065)", glow: "rgba(139,92,246,0.55)", cardBg: "linear-gradient(145deg, #3b1d8a 0%, #4c1d95 40%, #1e1b4b 100%)" },
  rare:      { sphere: "radial-gradient(circle at 35% 28%, #67e8f9, #0284c7 55%, #0c4a6e)", glow: "rgba(56,189,248,0.55)", cardBg: "linear-gradient(145deg, #164e63 0%, #0e7490 40%, #0c4a6e 100%)" },
  epic:      { sphere: "radial-gradient(circle at 35% 28%, #f0abfc, #9333ea 55%, #3b0764)", glow: "rgba(217,70,239,0.6)",  cardBg: "linear-gradient(145deg, #581c87 0%, #7e22ce 40%, #3b0764 100%)" },
  legendary: { sphere: "radial-gradient(circle at 35% 28%, #fde68a, #f59e0b 55%, #78350f)", glow: "rgba(251,191,36,0.65)", cardBg: "linear-gradient(145deg, #78350f 0%, #b45309 40%, #92400e 100%)" },
  cosmic:    { sphere: "radial-gradient(circle at 35% 28%, #fda4af, #9333ea 55%, #1e1b4b)", glow: "rgba(244,63,94,0.55)",  cardBg: "linear-gradient(145deg, #4c0519 0%, #7e22ce 50%, #1e1b4b 100%)" },
};

function GiftOrbMini({ emoji, rarity = "common", size = 90 }: { emoji: string; rarity?: string; size?: number }) {
  const s = GIFT_ORB_STYLES[rarity] || GIFT_ORB_STYLES.common;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: -size * 0.12, borderRadius: "50%", background: s.glow, filter: `blur(${size * 0.18}px)`, opacity: 0.8 }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: s.sphere, boxShadow: `inset -${size*0.07}px -${size*0.07}px ${size*0.18}px rgba(0,0,0,0.35), inset ${size*0.05}px ${size*0.05}px ${size*0.1}px rgba(255,255,255,0.18)` }}>
        <div style={{ position: "absolute", top: "11%", left: "16%", width: "32%", height: "22%", borderRadius: "50%", background: "rgba(255,255,255,0.38)", filter: "blur(3px)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.44, lineHeight: 1 }}>{emoji}</div>
      </div>
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

export function MessageBubble({ message, onReply, onEdit, ownBubbleStyle, onPin, typingOut, onTypingDone, searchHighlight, isActiveMatch, messageRef, isChannel, onComment }: MessageBubbleProps) {
  const { currentUserId } = useAppContext();
  const { data: me } = useGetMe();
  const queryClient = useQueryClient();
  const isMine = message.senderId === currentUserId;
  const viewerIsPrimePlus = !!(me as any)?.hasPrime && (me as any)?.primeTier === "prime_plus";
  const effect = (message as any).effect as string | null;
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
    const WORD_DELAY = Math.max(18, Math.min(45, 2400 / words.length));
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
    const myReactions = reactions.filter((r: any) => r.userId === currentUserId && r.emoji === emoji);
    const myCount = myReactions.length;
    try {
      if (myCount === 0) {
        await fetch(`/api/messages/${message.id}/reactions`, {
          method: "POST", headers, body: JSON.stringify({ emoji }),
        });
        import("@/utils/questTracker").then(({ trackQuestAction }) => trackQuestAction("reaction_added"));
      } else if (myCount === 1 && viewerIsPrimePlus) {
        // Prime+: add second reaction (double reaction ×2)
        await fetch(`/api/messages/${message.id}/reactions`, {
          method: "POST", headers, body: JSON.stringify({ emoji }),
        });
      } else {
        // Remove all my reactions for this emoji
        await fetch(`/api/messages/${message.id}/reactions`, {
          method: "DELETE", headers, body: JSON.stringify({ emoji }),
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

  if (message.type === "gift") {
    const giftItem = (message as any).giftData?.giftItem;
    const emoji = giftItem?.emoji || "🎁";
    const giftName = giftItem?.name || "Подарок";
    const rarity = (giftItem?.rarity as string) || "common";
    const description = giftItem?.description as string | undefined;
    const exchangeVal = giftItem?.stars || giftItem?.price || 10;
    const senderName = message.sender?.displayName ?? "Кто-то";
    const orbStyle = GIFT_ORB_STYLES[rarity] || GIFT_ORB_STYLES.common;
    const RARITY_LABEL: Record<string, string> = { common: "Обычный", rare: "Редкий", epic: "Эпический", legendary: "Легендарный", cosmic: "Космический" };
    const RARITY_BADGE: Record<string, string> = { common: "bg-slate-500 text-white", rare: "bg-blue-500 text-white", epic: "bg-purple-500 text-white", legendary: "bg-yellow-500 text-yellow-950", cosmic: "bg-rose-500 text-white" };

    // Subtle sparkle positions for card bg decoration
    const sparkles = [
      { top: "8%",  left: "10%", size: 5, op: 0.35 },
      { top: "14%", left: "82%", size: 4, op: 0.28 },
      { top: "62%", left: "88%", size: 6, op: 0.22 },
      { top: "72%", left: "6%",  size: 4, op: 0.28 },
      { top: "40%", left: "92%", size: 3, op: 0.2  },
      { top: "30%", left: "4%",  size: 3, op: 0.2  },
    ];

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 26 }}
        className="flex justify-center w-full my-4"
      >
        <div className="flex flex-col items-center gap-1.5 relative">

          {/* ── Telegram-style gift card ── */}
          <div
            onClick={() => setShowGiftInfo(true)}
            className="relative w-[220px] rounded-[28px] overflow-hidden cursor-pointer select-none"
            style={{ background: orbStyle.cardBg, boxShadow: "0 12px 40px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)" }}
          >
            {/* Decorative sparkle dots */}
            {sparkles.map((sp, i) => (
              <div key={i} style={{ position: "absolute", top: sp.top, left: sp.left, width: sp.size, height: sp.size, borderRadius: "50%", background: "white", opacity: sp.op, pointerEvents: "none" }} />
            ))}
            {/* Decorative ring */}
            <div style={{ position: "absolute", top: "-30%", right: "-25%", width: "160px", height: "160px", borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.08)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: "-15%", right: "-10%", width: "100px", height: "100px", borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.06)", pointerEvents: "none" }} />

            {/* Gift orb */}
            <div className="flex justify-center pt-8 pb-3 relative z-10">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              >
                <GiftOrbMini emoji={emoji} rarity={rarity} size={96} />
              </motion.div>
            </div>

            {/* Sender label */}
            <div className="text-center px-4 pb-3 relative z-10">
              <p className="text-white/90 text-[14px] font-semibold leading-tight">
                {isMine ? "Вы отправили подарок" : `Подарок от ${senderName}`}
              </p>
              {message.text && (
                <p className="text-white/55 text-[12px] mt-1 leading-snug italic">«{message.text}»</p>
              )}
            </div>

            {/* Action button bar */}
            <div
              className="mx-3 mb-3 relative z-10 rounded-2xl px-3 py-2.5 text-center"
              style={{ background: "rgba(255,255,255,0.16)", backdropFilter: "blur(8px)" }}
            >
              <p className="text-white text-[12.5px] font-semibold leading-snug">
                посмотреть или обменять на {exchangeVal} ⚡
              </p>
            </div>
          </div>

          <span className="text-[11px] text-muted-foreground font-medium">{formatTime(message.createdAt)}</span>

          {/* ── Detail modal ── */}
          <AnimatePresence>
            {showGiftInfo && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-md"
                onClick={() => setShowGiftInfo(false)}
              >
                <motion.div
                  initial={{ opacity: 0, y: 40, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 40, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  onClick={e => e.stopPropagation()}
                  className="relative z-10 w-full max-w-sm shadow-2xl overflow-hidden rounded-[36px]"
                >
                  {/* Modal gradient header */}
                  <div className="relative flex flex-col items-center pt-10 pb-6 px-6" style={{ background: orbStyle.cardBg }}>
                    {sparkles.slice(0, 4).map((sp, i) => (
                      <div key={i} style={{ position: "absolute", top: sp.top, left: sp.left, width: sp.size + 1, height: sp.size + 1, borderRadius: "50%", background: "white", opacity: sp.op * 0.8, pointerEvents: "none" }} />
                    ))}
                    <button
                      onClick={() => setShowGiftInfo(false)}
                      className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full"
                      style={{ background: "rgba(255,255,255,0.18)" }}
                    >
                      <X size={16} className="text-white" />
                    </button>
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <GiftOrbMini emoji={emoji} rarity={rarity} size={110} />
                    </motion.div>
                    <h3 className="text-white text-xl font-black mt-5">{giftName}</h3>
                    <span className={cn("text-xs font-black uppercase tracking-widest px-3 py-1 rounded-xl mt-2 inline-block", RARITY_BADGE[rarity] || RARITY_BADGE.common)}>
                      {RARITY_LABEL[rarity] || rarity}
                    </span>
                  </div>

                  {/* Modal body */}
                  <div className="bg-card px-6 pt-5 pb-6">
                    {description && (
                      <p className="text-[14px] text-muted-foreground text-center mb-5 leading-relaxed">{description}</p>
                    )}
                    <div className="bg-secondary rounded-[20px] p-4 space-y-3 text-[14px]">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground font-medium">Отправитель</span>
                        <span className="font-bold">{isMine ? "Вы" : senderName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground font-medium">Время</span>
                        <span className="font-bold">{formatTime(message.createdAt)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground font-medium">Стоимость обмена</span>
                        <span className="font-bold text-primary">{exchangeVal} ⚡</span>
                      </div>
                      {message.text && (
                        <div className="pt-3 mt-1 border-t border-border">
                          <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Сообщение</span>
                          <p className="font-semibold mt-1 italic text-foreground">«{message.text}»</p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setShowGiftInfo(false)}
                      className="w-full mt-4 py-3.5 rounded-2xl text-[15px] font-bold text-white transition-all active:scale-95"
                      style={{ background: orbStyle.cardBg }}
                    >
                      Закрыть
                    </button>
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
    switch (message.type as string) {
      case "poll":
        return <PollDisplay pollData={pollData} messageId={message.id} chatId={message.chatId} currentUserId={currentUserId} isMine={isMine} />;
      case "text": {
        const words = message.text?.split(" ") ?? [];
        const isAnimating = typingOut && displayedWords < words.length;
        const visibleText = typingOut && displayedWords !== Infinity
          ? words.slice(0, displayedWords).join(" ")
          : (message.text ?? "");

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
            if (seg.url) return <a key={i} href={seg.url} target="_blank" rel="noopener noreferrer" className={cn("underline underline-offset-2", isMine ? "text-white/90" : "text-primary")} onClick={e => e.stopPropagation()}>{seg.text}</a>;
            if (seg.bold && seg.italic) return <strong key={i}><em>{seg.text}</em></strong>;
            if (seg.bold)   return <strong key={i}>{seg.text}</strong>;
            if (seg.italic) return <em key={i}>{seg.text}</em>;
            if (seg.strike) return <del key={i} className="opacity-60">{seg.text}</del>;
            return <React.Fragment key={i}>{seg.text}</React.Fragment>;
          });
        }

        return (
          <div>
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
          const parsed = JSON.parse(message.text || "{}");
          albumUrls = parsed.urls || [];
          albumCaption = parsed.caption || "";
        } catch { albumUrls = [message.mediaUrl || ""]; }
        const visibleCount = Math.min(albumUrls.length, 4);
        const extra = albumUrls.length - 4;
        return (
          <div className="rounded-xl overflow-hidden -mx-1 -mt-1 mb-1">
            <div className={`grid gap-0.5 ${visibleCount === 1 ? "grid-cols-1" : visibleCount === 2 ? "grid-cols-2" : visibleCount >= 3 ? "grid-cols-2" : "grid-cols-2"}`}>
              {albumUrls.slice(0, 4).map((url, i) => (
                <div key={i} className="relative overflow-hidden" style={{ aspectRatio: visibleCount === 1 ? "4/3" : "1/1" }}>
                  <img
                    src={url}
                    alt={`photo ${i + 1}`}
                    className="w-full h-full object-cover cursor-zoom-in block"
                    style={{ maxHeight: visibleCount === 1 ? 280 : 140 }}
                    onClick={() => setLightbox({ urls: albumUrls, idx: i })}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  {i === 3 && extra > 0 && (
                    <div
                      className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-zoom-in"
                      onClick={() => setLightbox({ urls: albumUrls, idx: 3 })}
                    >
                      <span className="text-white text-2xl font-black">+{extra}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {albumCaption && <p className="text-[15px] mt-3 px-2 mb-1 font-medium">{albumCaption}</p>}
          </div>
        );
      }
      case "audio": {
        const durSec = parseInt((message.text || "voice:0").replace("voice:", "")) || 0;
        return <VoicePlayer src={message.mediaUrl || ""} durationSec={durSec} isMine={isMine} messageId={message.id} viewerIsPrimePlus={viewerIsPrimePlus} />;
      }
      case "sticker":
        return (
          <div className="-mx-3 -my-2">
            <img
              src={message.mediaUrl || ""}
              alt="стикер"
              className="w-28 h-28 object-contain block"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        );
      case "call":
        return <p className="text-[15px] font-bold italic opacity-80">📞 Звонок завершён</p>;
      default:
        return <p className="text-[15px] font-medium">[{message.type}] {message.text}</p>;
    }
  };

  return (
    <>
      <motion.div
        ref={messageRef}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex w-full group select-none relative",
          isMine ? "justify-end" : "justify-start",
          isActiveMatch && "rounded-2xl ring-2 ring-yellow-400/60 ring-offset-2 ring-offset-background"
        )}
      >
        <div className={cn(
          "flex max-w-[85%] md:max-w-[70%]",
          isMine ? "flex-row-reverse" : "flex-row",
          "items-end gap-2.5"
        )}>
          {!isMine && (
            <div
              className={cn(
                "w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[13px] font-black text-white overflow-hidden shadow-sm",
                message.type === "audio" ? "self-center" : "mb-6"
              )}
              style={{ backgroundColor: message.sender?.avatarColor || "#555" }}
            >
              {message.sender?.avatarUrl ? (
                <img src={message.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                (message.sender?.displayName || "U")[0].toUpperCase()
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
                    "px-5 py-3.5 rounded-[24px]",
                    isMine
                      ? (ownBubbleStyle ? "text-white rounded-br-sm border border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.25)]" : "bubble-mine text-primary-foreground rounded-br-sm")
                      : "bg-secondary text-foreground rounded-bl-sm border border-border shadow-[0_2px_10px_rgba(0,0,0,0.18)]"
                  )
              )}
              style={isMine && ownBubbleStyle && message.type !== "sticker" ? ownBubbleStyle : undefined}
            >
              {!isMine && message.sender && (
                <div className="flex items-center gap-1 mb-1.5">
                  <p className="text-[12px] font-black leading-none" style={{ color: message.sender.avatarColor }}>
                    {message.sender.displayName}
                  </p>
                  {(message.sender as any).hasPrime && (message.sender as any).primeTier === "prime_plus" && (
                    <span className="text-[9px] font-black px-1 py-0.5 rounded border bg-purple-500/15 text-purple-400 border-purple-500/30 leading-none">VIP+</span>
                  )}
                  {(message.sender as any).hasPrime && (message.sender as any).primeTier === "prime" && (
                    <span className="text-[9px] font-black px-1 py-0.5 rounded border bg-yellow-500/15 text-yellow-400 border-yellow-500/30 leading-none">VIP</span>
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
                        Удалено · Prime+
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
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
