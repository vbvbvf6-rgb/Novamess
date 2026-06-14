import React, { useRef, useEffect, useState, useMemo } from "react";
import { useGetChatById, useGetMessages, getGetMessagesQueryKey, useMarkChatAsRead, useUpdateChat, getGetChatsQueryKey, getGetChatByIdQueryKey, Message } from "@workspace/api-client-react";
import { useP2PChannel } from "@/hooks/useP2PChannel";
import { useNotifications } from "@/hooks/useNotifications";
import { useLastSeen } from "@/hooks/useLastSeen";
import { Phone, Video, MoreVertical, ArrowLeft, Menu, Search, BellOff, Bell, Pin, PinOff, User, Trash2, X, Timer, Flame, ChevronRight, ChevronDown, ChevronUp, Settings, Crown, Palette, Check, Sparkles, Lock, MessageSquare, Users, Megaphone } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatInfoPanel } from "./ChatInfoPanel";
import { useAppContext } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ChannelThread } from "./ChannelThread";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

// ─── Chat themes ─────────────────────────────────────────────────────────────

interface ChatTheme {
  id: string;
  name: string;
  emoji: string;
  tier: "prime" | "prime_plus";
  bg: React.CSSProperties;
  bubble: React.CSSProperties;
  preview: string;
}

const CHAT_THEMES: ChatTheme[] = [
  {
    id: "sunset", name: "Закат", emoji: "🌅", tier: "prime",
    bg: { background: "linear-gradient(160deg, #fff5f0 0%, #fff0e6 40%, #fef3c7 100%)" },
    bubble: { background: "linear-gradient(135deg, #ea580c, #f97316)", boxShadow: "0 2px 12px rgba(234,88,12,0.2)" },
    preview: "linear-gradient(135deg, #ea580c, #f97316)",
  },
  {
    id: "ocean", name: "Океан", emoji: "🌊", tier: "prime",
    bg: { background: "linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 50%, #f0f9ff 100%)" },
    bubble: { background: "linear-gradient(135deg, #0ea5e9, #3b82f6)", boxShadow: "0 2px 12px rgba(14,165,233,0.2)" },
    preview: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
  },
  {
    id: "forest", name: "Лес", emoji: "🌿", tier: "prime",
    bg: { background: "linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)" },
    bubble: { background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 2px 12px rgba(34,197,94,0.2)" },
    preview: "linear-gradient(135deg, #22c55e, #16a34a)",
  },
  {
    id: "sakura", name: "Сакура", emoji: "🌸", tier: "prime",
    bg: { background: "linear-gradient(160deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)" },
    bubble: { background: "linear-gradient(135deg, #f43f5e, #ec4899)", boxShadow: "0 2px 12px rgba(244,63,94,0.2)" },
    preview: "linear-gradient(135deg, #f43f5e, #ec4899)",
  },
  {
    id: "dusk", name: "Сумерки", emoji: "🔮", tier: "prime",
    bg: { background: "linear-gradient(160deg, #faf5ff 0%, #f3e8ff 50%, #faf5ff 100%)" },
    bubble: { background: "linear-gradient(135deg, #8b5cf6, #6366f1)", boxShadow: "0 2px 12px rgba(139,92,246,0.2)" },
    preview: "linear-gradient(135deg, #8b5cf6, #6366f1)",
  },
  {
    id: "ember", name: "Огонь", emoji: "🔥", tier: "prime",
    bg: { background: "linear-gradient(160deg, #fef2f2 0%, #fee2e2 50%, #fef2f2 100%)" },
    bubble: { background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 2px 12px rgba(239,68,68,0.2)" },
    preview: "linear-gradient(135deg, #ef4444, #dc2626)",
  },
  {
    id: "arctic", name: "Арктика", emoji: "❄️", tier: "prime",
    bg: { background: "linear-gradient(160deg, #ecfeff 0%, #cffafe 50%, #ecfeff 100%)" },
    bubble: { background: "linear-gradient(135deg, #06b6d4, #3b82f6)", boxShadow: "0 2px 12px rgba(6,182,212,0.2)" },
    preview: "linear-gradient(135deg, #06b6d4, #3b82f6)",
  },
  {
    id: "gold", name: "Золото", emoji: "✨", tier: "prime",
    bg: { background: "linear-gradient(160deg, #fefce8 0%, #fef9c3 50%, #fefce8 100%)" },
    bubble: { background: "linear-gradient(135deg, #eab308, #d97706)", boxShadow: "0 2px 12px rgba(234,179,8,0.2)" },
    preview: "linear-gradient(135deg, #eab308, #d97706)",
  },
  {
    id: "galaxy", name: "Галактика", emoji: "🌌", tier: "prime_plus",
    bg: {
      background: "linear-gradient(160deg, #faf5ff 0%, #f3e8ff 35%, #f0f9ff 70%, #fdf2f8 100%)",
      backgroundImage: "radial-gradient(ellipse at 20% 40%, rgba(139,92,246,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 60%, rgba(6,182,212,0.04) 0%, transparent 50%)",
    },
    bubble: { background: "linear-gradient(135deg, #8b5cf6, #06b6d4)", boxShadow: "0 2px 12px rgba(139,92,246,0.2)" },
    preview: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
  },
  {
    id: "neon", name: "Неон", emoji: "💚", tier: "prime_plus",
    bg: { background: "linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)" },
    bubble: { background: "linear-gradient(135deg, #10b981, #84cc16)", boxShadow: "0 2px 12px rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.2)" },
    preview: "linear-gradient(135deg, #10b981, #84cc16)",
  },
  {
    id: "rosegold", name: "Розовое золото", emoji: "💎", tier: "prime_plus",
    bg: { background: "linear-gradient(160deg, #fdf2f8 0%, #fce7f3 35%, #fffbeb 70%, #fdf2f8 100%)" },
    bubble: { background: "linear-gradient(135deg, #f43f5e, #eab308)", boxShadow: "0 2px 12px rgba(244,63,94,0.2)" },
    preview: "linear-gradient(135deg, #f43f5e, #eab308)",
  },
  {
    id: "aurora", name: "Аврора", emoji: "🌈", tier: "prime_plus",
    bg: {
      background: "linear-gradient(160deg, #f0f9ff 0%, #f0fdf4 100%)",
      backgroundImage: "radial-gradient(ellipse at 15% 50%, rgba(16,185,129,0.06) 0%, transparent 45%), radial-gradient(ellipse at 85% 30%, rgba(139,92,246,0.06) 0%, transparent 45%), radial-gradient(ellipse at 50% 80%, rgba(14,165,233,0.04) 0%, transparent 40%)",
    },
    bubble: { background: "linear-gradient(135deg, #10b981, #8b5cf6, #0ea5e9)", boxShadow: "0 2px 12px rgba(139,92,246,0.2)" },
    preview: "linear-gradient(135deg, #10b981, #8b5cf6, #0ea5e9)",
  },
];

function ChatThemePicker({
  chatId, currentThemeId, hasPrime, isPrimePlus,
  onSelect, onClose,
}: {
  chatId: number; currentThemeId: string | null; hasPrime: boolean; isPrimePlus: boolean;
  onSelect: (id: string | null) => void; onClose: () => void;
}) {
  const primeThemes = CHAT_THEMES.filter(t => t.tier === "prime");
  const plusThemes  = CHAT_THEMES.filter(t => t.tier === "prime_plus");

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="bg-card border border-border rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <Palette size={18} className="text-purple-400" />
            </div>
            <div>
              <h3 className="font-black text-base">Тема чата</h3>
              <p className="text-xs text-muted-foreground">Только для вас</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-none">
          {/* Default */}
          <button
            onClick={() => onSelect(null)}
            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all ${
              !currentThemeId ? "border-primary bg-primary/10" : "border-border hover:border-border/80 bg-secondary/30"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
              <span className="text-lg">🎨</span>
            </div>
            <span className="font-bold text-sm flex-1 text-left">Стандартная</span>
            {!currentThemeId && <Check size={16} className="text-primary" />}
          </button>

          {/* Prime themes */}
          <div>
            <div className="flex items-center gap-2 mb-2.5 px-1">
              <Crown size={13} className="text-yellow-400" />
              <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Prime</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {primeThemes.map(theme => {
                const isActive = currentThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => onSelect(theme.id)}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                      isActive ? "border-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.3)]" : "border-border hover:border-yellow-400/50"
                    }`}
                  >
                    <div className="h-16 w-full" style={theme.bg}>
                      <div className="absolute bottom-2 right-2 w-8 h-5 rounded-lg" style={{ ...theme.bubble }} />
                      <div className="absolute bottom-2 left-2 w-10 h-5 rounded-lg bg-white/10" />
                    </div>
                    <div className="px-2.5 py-2 flex items-center justify-between bg-card/80">
                      <span className="text-xs font-bold truncate">{theme.emoji} {theme.name}</span>
                      {isActive && <Check size={12} className="text-yellow-400 shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prime+ themes */}
          <div>
            <div className="flex items-center gap-2 mb-2.5 px-1">
              <Sparkles size={13} className="text-purple-400" />
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Prime+</span>
              {!isPrimePlus && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25 ml-auto">Эксклюзив</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {plusThemes.map(theme => {
                const isActive = currentThemeId === theme.id;
                const locked = !isPrimePlus;
                return (
                  <button
                    key={theme.id}
                    onClick={() => !locked && onSelect(theme.id)}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                      locked ? "opacity-60 cursor-not-allowed border-border" :
                      isActive ? "border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.3)]" : "border-border hover:border-purple-400/50"
                    }`}
                  >
                    <div className="h-16 w-full" style={theme.bg}>
                      <div className="absolute bottom-2 right-2 w-8 h-5 rounded-lg" style={theme.bubble} />
                      <div className="absolute bottom-2 left-2 w-10 h-5 rounded-lg bg-white/10" />
                      {locked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Lock size={16} className="text-white/80" />
                        </div>
                      )}
                    </div>
                    <div className="px-2.5 py-2 flex items-center justify-between bg-card/80">
                      <span className="text-xs font-bold truncate">{theme.emoji} {theme.name}</span>
                      {isActive && !locked && <Check size={12} className="text-purple-400 shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <button onClick={onClose} className="w-full py-3 rounded-2xl bg-secondary hover:bg-secondary/80 font-bold text-sm transition-colors">
            Готово
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface ChatWindowProps {
  chatId: number;
}

const AUTO_DELETE_OPTIONS: { value: number | null; label: string }[] = [
  { value: null,    label: "Выкл." },
  { value: 5,       label: "5 секунд" },
  { value: 30,      label: "30 секунд" },
  { value: 60,      label: "1 минута" },
  { value: 300,     label: "5 минут" },
  { value: 3600,    label: "1 час" },
  { value: 86400,   label: "1 день" },
  { value: 604800,  label: "1 неделя" },
  { value: 2592000, label: "1 месяц" },
];

function formatAutoDeleteLabel(seconds: number | null | undefined): string {
  if (!seconds) return "Выкл.";
  if (seconds < 60) return `${seconds} сек.`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин.`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ч.`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} д.`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} нед.`;
  return `${Math.floor(seconds / 2592000)} мес.`;
}

export function ChatWindow({ chatId }: ChatWindowProps) {
  const { setSelectedChatId, setActiveCall, setTypingForChat, startCall, currentUserId } = useAppContext();
  const { permission, requestPermission, notify } = useNotifications();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: chat, isLoading: isChatLoading } = useGetChatById(chatId, { query: { enabled: !!chatId } as any });
  const { data: messages, isLoading: isMessagesLoading } = useGetMessages({ chatId }, { query: { enabled: !!chatId } as any });
  const [calling, setCalling] = useState(false);
  const markAsRead = useMarkChatAsRead();
  const updateChat = useUpdateChat();

  // P2P WebRTC data channel — direct chats only, not bots
  const p2pEnabled = chat?.type === "direct" && !(chat?.otherUser as any)?.isBot;
  const p2pOtherUserId = p2pEnabled ? (chat?.otherUser?.id ?? null) : null;
  const p2p = useP2PChannel(
    p2pEnabled ? chatId : null,
    p2pOtherUserId,
    currentUserId,
    p2pEnabled,
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const messageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ userId: number; displayName: string; typingType: string }[]>([]);
  const [showAutoDeleteMenu, setShowAutoDeleteMenu] = useState(false);
  const [autoDeleteLoading, setAutoDeleteLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editMessage, setEditMessage] = useState<Message | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [smartRepliesFor, setSmartRepliesFor] = useState<number | null>(null);
  const [smartReplyPending, setSmartReplyPending] = useState(false);
  const [pinnedMsgDismissed, setPinnedMsgDismissed] = useState<number | null>(null);
  const [pinnedMsgIndex, setPinnedMsgIndex] = useState<number>(0);
  const [announcementDismissed, setAnnouncementDismissed] = useState<boolean>(() => {
    if (!chatId) return false;
    return sessionStorage.getItem(`ann-dismissed-${chatId}`) === "1";
  });
  const [replyChipText, setReplyChipText] = useState<string | null>(null);
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);
  const [typingOutMsgId, setTypingOutMsgId] = useState<number | null>(null);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [createGroupName, setCreateGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  const sseRef = useRef<EventSource | null>(null);
  const prevBotTypingRef = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, botTyping, typingUsers.length]);

  const isBot = chat && chat.type === "direct" && (chat.otherUser as any)?.isBot;
  const autoDeleteTimer = (chat as any)?.autoDeleteTimer as number | null | undefined;

  useEffect(() => {
    if (permission === "default") {
      requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!chatId) return;
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let dead = false;
    let retryCount = 0;
    const getBackoffMs = () => Math.min(1000 * Math.pow(2, retryCount), 30_000);

    const connect = () => {
      if (dead) return;
      const uid = sessionStorage.getItem("pulse-user-id") || "1";
      const token = sessionStorage.getItem("pulse-token");
      const sseUrl = token
        ? `/api/chats/${chatId}/events?_token=${encodeURIComponent(token)}`
        : `/api/chats/${chatId}/events?_uid=${uid}`;
      es = new EventSource(sseUrl);
      sseRef.current = es;

      es.addEventListener("open", () => { retryCount = 0; });

      es.addEventListener("new-message", (e: MessageEvent) => {
      queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId }) }).then(() => {
        const msgs = queryClient.getQueryData<Message[]>(getGetMessagesQueryKey({ chatId }));
        const last = msgs?.[msgs.length - 1];
        if (last && last.senderId !== Number(sessionStorage.getItem("pulse-user-id") || "1")) {
          const chatData = queryClient.getQueryData<any>([`/api/chats/${chatId}`]) ?? null;
          const chatName = (chatData as any)?.otherUser?.displayName ?? (chatData as any)?.name ?? "Nova";
          const senderName = last.sender?.displayName || chatName;
          const body = last.type === "image" ? "📷 Фото" : last.type === "audio" ? "🎤 Голосовое" : last.type === "sticker" ? "🎨 Стикер" : last.text || "";
          notify(`${senderName}`, { body, url: `/`, tag: `chat-${chatId}` });
        }
      });
      markAsRead.mutate({ chatId }, {
        onSuccess: () => {
          queryClient.setQueriesData({ queryKey: getGetChatsQueryKey() }, (old: any) => {
            if (!Array.isArray(old)) return old;
            return old.map((c: any) => c.id === chatId ? { ...c, unreadCount: 0 } : c);
          });
          queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
        }
      });
    });

    es.addEventListener("message-deleted", () => {
      queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
    });

    es.addEventListener("messages-read", () => {
      // Someone read messages in this chat — re-fetch so sender's ✓ → ✓✓
      queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
    });

    es.addEventListener("messages-delivered", () => {
      // Recipient device received messages — update ✓ → ✓✓ (gray)
      queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
    });

    es.addEventListener("typing", (e: MessageEvent) => {
      try {
        const currentUid = Number(sessionStorage.getItem("pulse-user-id") || "1");
        const data = JSON.parse(e.data) as { userId: number; displayName: string; typing: boolean; typingType?: string };
        if (data.userId === currentUid) return;
        setTypingUsers(prev => {
          let next: { userId: number; displayName: string; typingType: string }[];
          if (data.typing) {
            const tt = data.typingType || "text";
            const existing = prev.find(u => u.userId === data.userId);
            if (existing) {
              next = prev.map(u => u.userId === data.userId ? { ...u, typingType: tt } : u);
            } else {
              next = [...prev, { userId: data.userId, displayName: data.displayName, typingType: tt }];
            }
          } else {
            next = prev.filter(u => u.userId !== data.userId);
          }
          const firstType = next[0]?.typingType || "text";
          setTypingForChat(chatId, next.map(u => u.displayName), firstType);
          return next;
        });
      } catch {}
    });

      es.onerror = () => {
        es?.close();
        es = null;
        sseRef.current = null;
        if (!dead) {
          const delay = getBackoffMs();
          retryCount++;
          retryTimeout = setTimeout(connect, delay);
        }
      };
    };

    connect();
    return () => {
      dead = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      es?.close();
      sseRef.current = null;
    };
  }, [chatId]);

  // Listen for AI moderation removals and notify the sender
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      if (detail.chatId && detail.chatId !== chatId) return;
      toast({
        title: "Сообщение удалено модерацией",
        description: detail.reason || "Ваше сообщение нарушает правила платформы.",
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
    };
    window.addEventListener("pulse:moderation-removed", handler);
    return () => window.removeEventListener("pulse:moderation-removed", handler);
  }, [chatId]);

  useEffect(() => {
    if (chatId) {
      queryClient.setQueriesData({ queryKey: getGetChatsQueryKey() }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((c: any) => c.id === chatId ? { ...c, unreadCount: 0 } : c);
      });
      markAsRead.mutate({ chatId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
        }
      });
    }
    setSearchQuery("");
    setShowSearch(false);
    setShowAutoDeleteMenu(false);
    setBotTyping(false);
    setTypingUsers([]);
    setAnnouncementDismissed(sessionStorage.getItem(`ann-dismissed-${chatId}`) === "1");
    setTypingForChat(chatId, []);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, [chatId]);

  const botDisplayName = (chat?.otherUser as any)?.displayName || "Bot";

  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (!last || last.senderId === currentUserId) {
      setSmartReplies([]);
      setSmartRepliesFor(null);
      return;
    }
    if (last.id === smartRepliesFor) return;
    if (last.type !== "text" || !last.text) {
      setSmartReplies([]);
      setSmartRepliesFor(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSmartReplyPending(true);
      try {
        const token = sessionStorage.getItem("pulse-token");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch("/api/ai/smart-replies", {
          method: "POST",
          headers,
          body: JSON.stringify({ lastMessage: last.text, chatContext: last.text }),
        });
        if (res.ok) {
          const data = await res.json();
          setSmartReplies(data.suggestions || []);
          setSmartRepliesFor(last.id);
        }
      } catch {}
      setSmartReplyPending(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [messages?.length, currentUserId]);

  const handlePinMessage = async (msg: Message) => {
    try {
      const token = sessionStorage.getItem("pulse-token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const pinnedMsg = (chat as any)?.pinnedMessage;
      const isAlreadyPinned = pinnedMsg?.id === msg.id;
      await fetch(`/api/chats/${chatId}/pin-message`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ messageId: isAlreadyPinned ? null : msg.id }),
      });
      setPinnedMsgDismissed(null);
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}`] });
    } catch {}
  };

  const startBotTypingPoll = () => {
    lastMessageCountRef.current = messages?.length ?? 0;
    setBotTyping(true);
    setTypingForChat(chatId, [botDisplayName]);
    let attempts = 0;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      attempts++;
      await queryClient.refetchQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
      if (attempts >= 20) {
        setBotTyping(false);
        setTypingForChat(chatId, []);
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      }
    }, 600);
  };

  useEffect(() => {
    if (!botTyping) return;
    const current = messages?.length ?? 0;
    if (current > lastMessageCountRef.current) {
      setBotTyping(false);
      setTypingForChat(chatId, []);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      const lastMsg = messages?.[messages.length - 1];
      if (lastMsg && lastMsg.senderId !== currentUserId && lastMsg.type === "text") {
        setTypingOutMsgId(lastMsg.id);
      }
    }
  }, [messages, botTyping]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleSummarize = async () => {
    if (!messages || messages.length === 0) return;
    setSummaryOpen(true);
    setSummaryText("");
    setSummaryLoading(true);
    try {
      const token = sessionStorage.getItem("pulse-token");
      const payload = messages.slice(-50).map((m: any) => ({
        senderName: m.senderName || m.sender?.displayName || "Пользователь",
        text: m.text || "",
      }));
      const resp = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: payload }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Ошибка");
      setSummaryText(data.summary);
    } catch (err: any) {
      setSummaryText("Не удалось получить резюме. Попробуйте позже.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleStartCall = async (type: "audio" | "video") => {
    if (!chat?.otherUser?.id || calling) return;
    setCalling(true);
    try {
      await startCall(chat.otherUser.id, chatId, type);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg === "MEDIA_PERMISSION_DENIED") {
        toast({ title: "Доступ запрещён", description: "Разрешите доступ к микрофону/камере в настройках браузера", variant: "destructive" });
      } else if (msg === "MEDIA_NOT_FOUND") {
        toast({ title: "Устройство не найдено", description: "Микрофон или камера не подключены", variant: "destructive" });
      } else if (msg === "MEDIA_NOT_SUPPORTED") {
        toast({ title: "Не поддерживается", description: "Ваш браузер не поддерживает звонки. Попробуйте Chrome или Firefox.", variant: "destructive" });
      } else {
        toast({ title: "Не удалось начать звонок", description: "Проверьте соединение с сервером", variant: "destructive" });
      }
    } finally {
      setCalling(false);
    }
  };

  const handleToggleMute = () => {
    if (!chat) return;
    const newMuted = !chat.isMuted;
    const chatKey = getGetChatByIdQueryKey(chatId);
    const chatsKey = getGetChatsQueryKey();
    const prevChat = queryClient.getQueryData(chatKey);
    const prevChats = queryClient.getQueryData(chatsKey);
    queryClient.setQueryData(chatKey, (old: any) => old ? { ...old, isMuted: newMuted } : old);
    queryClient.setQueryData(chatsKey, (old: any) =>
      Array.isArray(old) ? old.map((c: any) => c.id === chatId ? { ...c, isMuted: newMuted } : c) : old
    );
    updateChat.mutate({ chatId, data: { isMuted: newMuted } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: chatsKey });
        queryClient.invalidateQueries({ queryKey: chatKey });
      },
      onError: () => {
        queryClient.setQueryData(chatKey, prevChat);
        queryClient.setQueryData(chatsKey, prevChats);
      },
    });
  };

  const getCWAuthHeaders = (json?: boolean): Record<string, string> => {
    const token = sessionStorage.getItem("pulse-token");
    const base: Record<string, string> = token ? { "Authorization": `Bearer ${token}` } : {};
    return json ? { "Content-Type": "application/json", ...base } : base;
  };

  const handleTogglePin = () => {
    if (!chat) return;
    const newPinned = !chat.isPinned;
    const chatKey = getGetChatByIdQueryKey(chatId);
    const chatsKey = getGetChatsQueryKey();
    const prevChat = queryClient.getQueryData(chatKey);
    const prevChats = queryClient.getQueryData(chatsKey);
    queryClient.setQueryData(chatKey, (old: any) => old ? { ...old, isPinned: newPinned } : old);
    queryClient.setQueryData(chatsKey, (old: any) =>
      Array.isArray(old) ? old.map((c: any) => c.id === chatId ? { ...c, isPinned: newPinned } : c) : old
    );
    fetch(`/api/chats/${chatId}/pin`, {
      method: "PUT",
      headers: getCWAuthHeaders(),
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: chatsKey });
      queryClient.invalidateQueries({ queryKey: chatKey });
    }).catch(() => {
      queryClient.setQueryData(chatKey, prevChat);
      queryClient.setQueryData(chatsKey, prevChats);
    });
  };

  const handleDeleteChat = async () => {
    setIsDeleting(true);
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: "DELETE",
        headers: getCWAuthHeaders(),
      });
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
      setSelectedChatId(null);
    } catch {}
    setIsDeleting(false);
    setShowDeleteDialog(false);
  };

  const handleSetAutoDelete = async (seconds: number | null) => {
    setAutoDeleteLoading(true);
    try {
      await fetch(`/api/chats/${chatId}/auto-delete`, {
        method: "PATCH",
        headers: getCWAuthHeaders(true),
        body: JSON.stringify({ timer: seconds }),
      });
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}`] });
      setShowAutoDeleteMenu(false);
      if (seconds) {
        toast({ title: t("autodelete.set"), description: `${formatAutoDeleteLabel(seconds)}` });
      } else {
        toast({ title: t("autodelete.cleared") });
      }
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
    setAutoDeleteLoading(false);
  };

  const openProfile = () => {
    if (chat?.type === "direct" && chat.otherUser?.id) {
      setLocation(`/user/${chat.otherUser.id}`);
    }
  };

  // Compute IDs of messages matching the search query (in display order)
  const matchingMessageIds = useMemo(() => {
    if (!searchQuery.trim() || !messages) return [];
    const q = searchQuery.toLowerCase();
    return (messages as Message[])
      .filter((m: Message) => (m as any).text?.toLowerCase().includes(q))
      .map((m: Message) => m.id);
  }, [messages, searchQuery]);

  // Reset cursor when query changes
  useEffect(() => {
    setSearchMatchIndex(0);
  }, [searchQuery]);

  // Scroll active match into view
  useEffect(() => {
    if (!matchingMessageIds.length) return;
    const activeId = matchingMessageIds[searchMatchIndex];
    const el = messageRefs.current[activeId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [searchMatchIndex, matchingMessageIds]);

  // These hooks MUST be called before any early returns to obey React's Rules of Hooks.
  const _otherUserLastSeen = (chat?.otherUser as any)?.lastSeen ?? null;
  const _otherUserStatus = chat?.otherUser?.status ?? "offline";
  const lastSeenLabel = useLastSeen(_otherUserLastSeen, _otherUserStatus);

  const _isChannel = chat?.type === "channel";
  const adminUserIds = useMemo(() => {
    if (!_isChannel || !chat) return new Set<number>();
    return new Set<number>(
      ((chat.members as any[]) || [])
        .filter((m: any) => m.role === "owner" || m.role === "admin")
        .map((m: any) => m.userId)
    );
  }, [_isChannel, chat]);

  const lastAdminMessage = useMemo(() => {
    if (!_isChannel || !messages || adminUserIds.size === 0) return null;
    const msgs = messages as Message[];
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i] as any;
      if (adminUserIds.has(m.senderId) && m.type === "text" && m.text) return m;
    }
    return null;
  }, [_isChannel, messages, adminUserIds]);

  // In channels: only top-level posts (no replyToId = not a comment) from admins/owners.
  // Comments live in ChannelThread, not the main feed.
  const filteredMessages = useMemo(() => {
    if (!_isChannel) return messages;
    const msgs = (messages as any[]) || [];
    const topLevel = msgs.filter((m: any) => !m.replyToId);
    if (adminUserIds.size > 0) {
      return topLevel.filter((m: any) => adminUserIds.has(m.senderId));
    }
    return topLevel;
  }, [messages, _isChannel, adminUserIds]);

  if (isChatLoading) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-background gap-4">
        <Skeleton className="w-16 h-16 rounded-2xl" />
        <Skeleton className="h-5 w-40 rounded-xl" />
        <Skeleton className="h-3 w-24 rounded-lg" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-background gap-4 p-8">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div className="text-center">
          <p className="font-bold text-foreground">Чат не найден</p>
          <p className="text-sm text-muted-foreground mt-1">Не удалось загрузить чат</p>
        </div>
        <button
          onClick={() => setSelectedChatId(null)}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
        >
          Назад
        </button>
      </div>
    );
  }

  const displayName = chat.type === "direct" ? (chat.otherUser?.displayName || chat.name || "Chat") : (chat.name || "Group");
  const avatarColor = chat.type === "direct" ? (chat.otherUser?.avatarColor || chat.avatarColor || "#333") : (chat.avatarColor || "#333");
  const otherUserLastSeen = _otherUserLastSeen;
  const otherUserStatus = _otherUserStatus;
  const isVerified = chat.type === "direct" && (chat.otherUser as any)?.isVerified;
  const isChannel = _isChannel;
  const myMemberRole = (chat.members as any[])?.find((m: any) => m.userId === currentUserId)?.role;
  const isChannelAdmin = isChannel && (myMemberRole === "owner" || myMemberRole === "admin");
  const otherUserHasPrime = chat.type === "direct" && (chat.otherUser as any)?.hasPrime;
  const otherUserIsPlus   = chat.type === "direct" && (chat.otherUser as any)?.primeTier === "prime_plus";
  const autoDeleteLabel = formatAutoDeleteLabel(autoDeleteTimer);

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden z-30">
      {/* Header */}
      <header className="border-b border-border flex items-center px-3 md:px-6 justify-between bg-card/95 backdrop-blur-md z-20 shrink-0 relative" style={{ minHeight: "calc(4rem + env(safe-area-inset-top, 0px))", paddingTop: "env(safe-area-inset-top, 0px)", boxShadow: "0 1px 0 0 hsl(var(--border)), 0 4px 20px -4px rgba(0,0,0,0.12)" }}>
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            className="flex items-center justify-center w-11 h-11 -ml-2 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground transition-colors shrink-0 md:hidden"
            onClick={() => setSelectedChatId(null)}
            aria-label="Назад к чатам"
          >
            <ArrowLeft size={22} />
          </button>

          <div className="relative shrink-0">
            {otherUserHasPrime && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: otherUserIsPlus ? 3 : 4, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-[2px] rounded-[18px]"
                style={{
                  background: otherUserIsPlus
                    ? "conic-gradient(from 0deg, #a855f7, #38bdf8, #e2e8f0, #c084fc, #06b6d4, #a855f7)"
                    : "conic-gradient(from 0deg, #eab308, #f59e0b, #d97706, #eab308)",
                  borderRadius: "18px",
                }}
              />
            )}
            <button
              onClick={chat.type === "direct" ? openProfile : () => setShowInfoPanel(v => !v)}
              className={`w-12 h-12 rounded-[16px] flex items-center justify-center text-white font-black text-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity shadow-sm relative z-10`}
              style={{ backgroundColor: avatarColor }}
            >
              {(chat.type === "direct" ? (chat.otherUser as any)?.avatarUrl : chat.avatarUrl) ? (
                <img src={(chat.type === "direct" ? (chat.otherUser as any)?.avatarUrl : chat.avatarUrl)} alt={displayName} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              ) : (
                (displayName[0] || "?").toUpperCase()
              )}
            </button>
            {otherUserHasPrime && (
              <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center z-20 ${
                otherUserIsPlus
                  ? "bg-gradient-to-br from-purple-500 to-cyan-400 shadow-[0_0_6px_rgba(168,85,247,0.8)]"
                  : "bg-gradient-to-br from-yellow-400 to-amber-500 shadow-[0_0_6px_rgba(250,204,21,0.8)]"
              }`}>
                <Crown size={8} className="text-white" />
              </div>
            )}
          </div>

          <button
            onClick={chat.type === "direct" ? openProfile : () => setShowInfoPanel(v => !v)}
            className={`text-left min-w-0 cursor-pointer group`}
          >
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              <h2 className="font-bold text-base leading-tight truncate group-hover:text-primary transition-colors min-w-0">{displayName}</h2>
              {otherUserHasPrime && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${
                  otherUserIsPlus
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                }`}>
                  {otherUserIsPlus ? "Prime+" : "Prime"}
                </span>
              )}
              {isVerified && (
                <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="12" fill="currentColor" className="text-primary"/>
                  <path d="M7 12l3.5 3.5L17 8" stroke="currentColor" className="text-primary-foreground" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {isChannel && (
                <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="12" fill="currentColor" className="text-primary"/>
                  <path d="M7 12l3.5 3.5L17 8" stroke="currentColor" className="text-primary-foreground" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {autoDeleteTimer ? (
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-violet-500 text-white shrink-0 shadow-[0_2px_8px_rgba(139,92,246,0.3)]">
                  <Flame size={12} fill="currentColor" />
                  {autoDeleteLabel}
                </span>
              ) : null}
            </div>
            <p className="text-[13px] text-muted-foreground font-medium mt-0.5 truncate min-w-0 overflow-hidden whitespace-nowrap">
              {(botTyping || typingUsers.length > 0) ? (
                <span className="text-primary font-semibold">
                  {(() => {
                    const tt = typingUsers[0]?.typingType || "text";
                    if (botTyping) return "печатает…";
                    if (tt === "audio") return "записывает аудио 🎤";
                    if (tt === "photo") return "отправляет фото 📷";
                    if (tt === "video") return "отправляет видео 🎬";
                    return "печатает…";
                  })()}
                </span>
              ) : chat.type === "direct" && chat.otherUser ? (
                <span className={otherUserStatus === "online" ? "text-primary" : ""}>
                  {lastSeenLabel}
                </span>
              ) : isChannel ? (
                <><span className="text-primary font-semibold">Верифицированный канал</span>{" · "}{chat.members?.length || 0} подписчиков</>
              ) : `${chat.members?.length || 0} ${t("chat.members")}`}
            </p>
          </button>
        </div>

        <div className="flex items-center gap-0.5 md:gap-1.5 text-muted-foreground shrink-0">
          {chat.type === "direct" && !(chat.otherUser as any)?.isBot && (
            <>
              {p2p.isConnected && (
                <div
                  title="P2P connected — messages are delivered instantly"
                  className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-bold select-none"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
                  P2P
                </div>
              )}
              <button
                onClick={() => handleStartCall("audio")}
                disabled={calling}
                className="hidden md:flex w-10 h-10 items-center justify-center hover:bg-secondary rounded-xl transition-all hover:text-foreground disabled:opacity-50"
                title="Audio call"
              >
                <Phone size={20} />
              </button>
              <button
                onClick={() => handleStartCall("video")}
                disabled={calling}
                className="hidden md:flex w-10 h-10 items-center justify-center hover:bg-secondary rounded-xl transition-all hover:text-foreground disabled:opacity-50"
                title="Video call"
              >
                <Video size={22} />
              </button>
            </>
          )}

          <button
            className="w-10 h-10 flex items-center justify-center hover:bg-secondary rounded-xl transition-all hover:text-foreground md:hidden"
            onClick={() => window.dispatchEvent(new Event("pulse:open-sidebar"))}
            aria-label="Открыть меню"
            title="Открыть меню"
          >
            <Menu size={20} />
          </button>

          {/* Mobile: plain button — no Radix, bypasses iOS touch issues */}
          <button
            className="md:hidden w-10 h-10 flex items-center justify-center hover:bg-secondary rounded-xl transition-all hover:text-foreground"
            onClick={() => setShowMobileMenu(true)}
            aria-label="Меню"
          >
            <MoreVertical size={20} />
          </button>

          {/* Desktop: Radix DropdownMenu */}
          <div className="hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-10 h-10 flex items-center justify-center hover:bg-secondary rounded-xl transition-all hover:text-foreground">
                  <MoreVertical size={20} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 rounded-2xl p-2 border-border shadow-2xl">
                {chat.type === "direct" && chat.otherUser?.id && (
                  <>
                    <DropdownMenuItem onClick={openProfile} className="rounded-xl cursor-pointer py-2.5">
                      <User size={18} className="mr-3 text-primary" />
                      <span className="font-semibold">{t("chat.openProfile")}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { setCreateGroupName(""); setShowCreateGroupDialog(true); }}
                      className="rounded-xl cursor-pointer py-2.5"
                    >
                      <Users size={18} className="mr-3 text-orange-500" />
                      <span className="font-semibold">Создать группу</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => { setShowSearch(v => !v); }} className="rounded-xl cursor-pointer py-2.5">
                  <Search size={18} className="mr-3 text-muted-foreground" />
                  <span className="font-semibold">{t("chat.searchMessages")}</span>
                </DropdownMenuItem>
                {chat.type === "direct" && messages && messages.length > 3 && (
                  <DropdownMenuItem onClick={handleSummarize} className="rounded-xl cursor-pointer py-2.5">
                    <Sparkles size={18} className="mr-3 text-amber-400" />
                    <span className="font-semibold">Резюме чата</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleToggleMute} className="rounded-xl cursor-pointer py-2.5">
                  {chat.isMuted ? (
                    <><Bell size={18} className="mr-3 text-orange-500" /><span className="font-semibold">{t("chat.muteOff")}</span></>
                  ) : (
                    <><BellOff size={18} className="mr-3 text-violet-400" /><span className="font-semibold">{t("chat.muteOn")}</span></>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleTogglePin} className="rounded-xl cursor-pointer py-2.5">
                  {chat.isPinned ? (
                    <><PinOff size={18} className="mr-3 text-muted-foreground" /><span className="font-semibold">{t("chat.unpin")}</span></>
                  ) : (
                    <><Pin size={18} className="mr-3 text-indigo-500" /><span className="font-semibold">{t("chat.pin")}</span></>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowAutoDeleteMenu(true)}
                  className="flex items-center justify-between rounded-xl cursor-pointer py-2.5"
                >
                  <div className="flex items-center font-semibold">
                    <Flame size={18} className={`mr-3 ${autoDeleteTimer ? "text-violet-400 fill-violet-500/20" : "text-muted-foreground"}`} />
                    {t("chat.autoDelete")}
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-secondary px-2 py-0.5 rounded-md">{autoDeleteLabel}</span>
                </DropdownMenuItem>
                {(chat.type === "group" || chat.type === "channel") && (
                  <>
                    <DropdownMenuItem onClick={() => setShowInfoPanel(v => !v)} className="rounded-xl cursor-pointer py-2.5">
                      <Settings size={18} className="mr-3 text-primary" />
                      <span className="font-semibold">{chat.type === "channel" ? "Настройки канала" : "Настройки группы"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive rounded-xl cursor-pointer py-2.5"
                      onClick={async () => {
                        try {
                          await fetch(`/api/chats/${chatId}/leave`, { method: "POST", headers: getCWAuthHeaders() });
                          queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
                          setSelectedChatId(null);
                        } catch {
                          toast({ title: "Ошибка", description: "Не удалось покинуть чат", variant: "destructive" });
                        }
                      }}
                    >
                      <ArrowLeft size={18} className="mr-3" />
                      <span className="font-semibold">Покинуть чат</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive rounded-xl cursor-pointer py-2.5"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 size={18} className="mr-3" />
                  <span className="font-semibold">{t("chat.deleteChat")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Channel Announcement Banner — last admin/owner message */}
      <AnimatePresence>
        {isChannel && lastAdminMessage && !announcementDismissed && (
          <motion.div
            key="announcement-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="shrink-0 overflow-hidden z-10"
          >
            <div
              className="relative px-4 py-3.5 border-b border-border overflow-hidden cursor-pointer"
              style={{
                background: "linear-gradient(135deg, rgba(255,80,0,0.12) 0%, rgba(255,140,0,0.08) 50%, rgba(255,80,0,0.05) 100%)",
              }}
              onClick={() => {
                const el = messageRefs.current[lastAdminMessage.id];
                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            >
              {/* Subtle glow line at top */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 mt-0.5">
                  <Megaphone size={15} className="text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Label row */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-primary">
                      Объявление
                    </span>
                    {/* Admin avatar + name */}
                    <div className="flex items-center gap-1 ml-auto">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0"
                        style={{ backgroundColor: lastAdminMessage.sender?.avatarColor || "#555" }}
                      >
                        {lastAdminMessage.sender?.avatarUrl ? (
                          <img src={lastAdminMessage.sender.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          (lastAdminMessage.sender?.displayName || "A")[0].toUpperCase()
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-semibold truncate max-w-[80px]">
                        {lastAdminMessage.sender?.displayName || "Администратор"}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">
                        · {format(new Date(lastAdminMessage.createdAt), "d MMM, HH:mm")}
                      </span>
                    </div>
                  </div>

                  {/* Message text — up to 2 lines */}
                  <p className="text-[13px] font-medium text-foreground leading-snug line-clamp-2">
                    {lastAdminMessage.text}
                  </p>
                </div>

                {/* Dismiss */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    sessionStorage.setItem(`ann-dismissed-${chatId}`, "1");
                    setAnnouncementDismissed(true);
                  }}
                  className="w-6 h-6 rounded-lg hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned messages banner — supports up to 10 (Prime+) */}
      {(() => {
        const pinnedMessages: any[] = (chat as any)?.pinnedMessages || [];
        const legacyPin = (chat as any)?.pinnedMessage;
        const allPinned = pinnedMessages.length > 0 ? pinnedMessages : (legacyPin ? [legacyPin] : []);
        const visiblePinned = allPinned.filter((p: any) => p.id !== pinnedMsgDismissed);
        if (visiblePinned.length === 0) return null;
        const currentIdx = Math.min(pinnedMsgIndex, visiblePinned.length - 1);
        const pinnedMsg = visiblePinned[currentIdx];
        const txt = pinnedMsg.type === "image" ? "📷 Фото" :
                    pinnedMsg.type === "audio" ? "🎤 Голосовое" :
                    pinnedMsg.type === "poll" ? "📊 Опрос" :
                    pinnedMsg.text || "Сообщение";
        return (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative flex items-center gap-2 px-3 py-2.5 bg-card border-b border-primary/20 shrink-0 shadow-sm z-10"
          >
            {visiblePinned.length > 1 && (
              <div className="absolute top-0 left-0 right-0 h-[3px] flex gap-px px-2 overflow-hidden rounded-t">
                {visiblePinned.map((_: any, i: number) => (
                  <div key={i} className={`flex-1 h-full transition-all duration-300 ${i === currentIdx ? "bg-primary" : "bg-primary/20"}`} />
                ))}
              </div>
            )}
            <div className="w-1 h-8 rounded-full bg-primary shrink-0" />
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => visiblePinned.length > 1 && setPinnedMsgIndex(i => (i + 1) % visiblePinned.length)}
            >
              <p className="text-[11px] font-black uppercase tracking-wider text-primary mb-0.5 flex items-center gap-1.5">
                Закреплено
                {visiblePinned.length > 1 && (
                  <span className="text-[10px] bg-primary/15 px-1.5 py-0.5 rounded-full leading-none">
                    {currentIdx + 1}/{visiblePinned.length}
                  </span>
                )}
              </p>
              <p className="text-[13px] font-medium text-foreground truncate">{txt}</p>
            </div>
            {visiblePinned.length > 1 && (
              <button
                onClick={() => setPinnedMsgIndex(i => (i + 1) % visiblePinned.length)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors shrink-0"
              >
                <ChevronDown size={14} />
              </button>
            )}
            <button
              onClick={() => handlePinMessage(pinnedMsg)}
              title="Открепить"
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              <PinOff size={15} />
            </button>
            <button
              onClick={() => setPinnedMsgDismissed(pinnedMsg.id)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </motion.div>
        );
      })()}

      {/* Auto-delete active banner */}
      {autoDeleteTimer ? (
        <div className="flex items-center justify-between px-5 py-2.5 bg-violet-600 text-white shrink-0 shadow-sm relative z-10">
          <div className="flex items-center gap-2">
            <Flame size={16} fill="white" />
            <span className="text-sm font-semibold">{t("autodelete.active")} <strong>{autoDeleteLabel}</strong></span>
          </div>
          <button
            onClick={() => setShowAutoDeleteMenu(true)}
            className="text-white/80 hover:text-white transition-colors font-bold text-[13px] uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded-md hover:bg-white/20"
          >
            {t("common.change")}
          </button>
        </div>
      ) : null}

      {/* Search Bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="border-b border-border bg-card shrink-0 shadow-sm relative z-10 overflow-hidden"
          >
            <div className="px-4 py-3 flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <Search size={16} className="text-muted-foreground" />
              </div>
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск в переписке…"
                className="flex-1 bg-transparent border-none outline-none text-[15px] font-medium placeholder:text-muted-foreground"
              />

              {/* Match counter */}
              {searchQuery.trim() && (
                <span className="text-xs font-bold text-muted-foreground shrink-0 tabular-nums min-w-[40px] text-right">
                  {matchingMessageIds.length === 0
                    ? "0 / 0"
                    : `${searchMatchIndex + 1} / ${matchingMessageIds.length}`}
                </span>
              )}

              {/* Navigation */}
              {matchingMessageIds.length > 0 && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => setSearchMatchIndex(i => (i - 1 + matchingMessageIds.length) % matchingMessageIds.length)}
                    className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    title="Предыдущий"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => setSearchMatchIndex(i => (i + 1) % matchingMessageIds.length)}
                    className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    title="Следующий"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              )}

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <X size={15} />
                </button>
              )}
              <button
                onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                className="font-bold text-sm text-primary hover:text-primary/80 transition-colors ml-1 shrink-0"
              >
                Отмена
              </button>
            </div>

            {/* No results notice */}
            {searchQuery.trim() && matchingMessageIds.length === 0 && (
              <div className="px-5 pb-3 text-xs text-muted-foreground">Ничего не найдено</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-none chat-bg"
        style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {isMessagesLoading ? (
          <div className="space-y-6 max-w-2xl mx-auto w-full">
            <Skeleton className="w-[60%] h-24 rounded-2xl rounded-tl-md" />
            <Skeleton className="w-[50%] h-16 rounded-2xl rounded-tr-md ml-auto" />
            <Skeleton className="w-[70%] h-32 rounded-2xl rounded-tl-md" />
          </div>
        ) : isBot && !searchQuery && (!messages || messages.length === 0) ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex flex-col items-center justify-center gap-5 text-center px-8 max-w-sm mx-auto"
          >
            <div
              className="w-24 h-24 rounded-[28px] flex items-center justify-center text-white font-black text-4xl shadow-2xl overflow-hidden"
              style={{ backgroundColor: avatarColor }}
            >
              {(chat.otherUser as any)?.avatarUrl ? (
                <img src={(chat.otherUser as any).avatarUrl} alt={displayName} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              ) : (displayName[0] || "?").toUpperCase()}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-xl font-black text-foreground">{displayName}</h2>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="12" fill="currentColor" className="text-primary"/>
                  <path d="M7 12l3.5 3.5L17 8" stroke="currentColor" className="text-primary-foreground" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm text-muted-foreground font-medium">@{(chat.otherUser as any)?.username}</p>
              {(chat.otherUser as any)?.bio && (
                <p className="text-sm text-muted-foreground/80 mt-2 leading-relaxed">{(chat.otherUser as any).bio}</p>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed bg-secondary/60 rounded-2xl px-5 py-3.5">
              Это бот — автоматическая программа в Nova.<br />Нажми кнопку ниже, чтобы начать.
            </p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={async () => {
                const token = sessionStorage.getItem("pulse-token");
                const headers: Record<string, string> = { "Content-Type": "application/json" };
                if (token) headers["Authorization"] = `Bearer ${token}`;
                await fetch("/api/messages", {
                  method: "POST",
                  headers,
                  body: JSON.stringify({ chatId, text: "/start", type: "text" }),
                });
                queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
                queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
                startBotTypingPoll();
              }}
              className="w-full max-w-[220px] py-4 bg-primary text-primary-foreground rounded-2xl text-[15px] font-black shadow-[0_4px_20px_rgba(139,92,246,0.35)] hover:bg-primary/90 transition-all"
            >
              СТАРТ
            </motion.button>
          </motion.div>
        ) : filteredMessages?.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-[15px] font-medium">
            {searchQuery ? t("chat.noSearchResults") : t("chat.noMessages")}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full space-y-6 flex flex-col justify-end min-h-full">
            {(filteredMessages as Message[])?.map((message: Message) => {
              const isMatch = searchQuery.trim() ? matchingMessageIds.includes(message.id) : false;
              const isActive = isMatch && matchingMessageIds[searchMatchIndex] === message.id;
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onReply={(msg) => { setEditMessage(null); setReplyTo(msg); }}
                  onEdit={(msg) => { setReplyTo(null); setEditMessage(msg); }}
                  onPin={handlePinMessage}
                  typingOut={message.id === typingOutMsgId}
                  onTypingDone={() => setTypingOutMsgId(null)}
                  searchHighlight={isMatch ? searchQuery : undefined}
                  isActiveMatch={isActive}
                  messageRef={(el) => { messageRefs.current[message.id] = el; }}
                  isChannel={isChannel}
                  onComment={(msg) => setThreadMessage(msg)}
                  isSenderAdmin={adminUserIds.has(message.senderId)}
                />
              );
            })}
          </div>
        )}

        <AnimatePresence>
          {(botTyping || typingUsers.length > 0) && (
            <motion.div
              key="typing-indicator"
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="flex items-end gap-2 max-w-3xl mx-auto w-full px-2"
            >
              <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 mb-0.5 overflow-hidden">
                <span className="text-[11px] font-black text-muted-foreground">
                  {(botTyping ? botDisplayName : typingUsers[0].displayName).charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-bold text-muted-foreground px-1">
                  {botTyping ? botDisplayName : typingUsers[0].displayName}
                </span>
                {(() => {
                  const tt = botTyping ? "text" : (typingUsers[0]?.typingType || "text");
                  if (tt === "audio") {
                    return (
                      <div className="flex items-center gap-[3px] px-4 py-3 rounded-[18px] rounded-bl-[4px] bg-secondary border border-border shadow-sm">
                        <span className="text-[15px]">🎤</span>
                        <span className="text-[12px] font-semibold text-muted-foreground ml-1">записывает аудио</span>
                        {[0,0.1,0.2,0.3,0.4].map((d,i) => (
                          <span key={i} className="w-[3px] rounded-full bg-primary inline-block mx-[1px]"
                            style={{ height: `${8 + (i % 3) * 4}px`, animation: `typingBounce 0.8s ease-in-out infinite`, animationDelay: `${d}s` }} />
                        ))}
                      </div>
                    );
                  }
                  if (tt === "photo") {
                    return (
                      <div className="flex items-center gap-2 px-4 py-3 rounded-[18px] rounded-bl-[4px] bg-secondary border border-border shadow-sm">
                        <span className="text-[15px]">📷</span>
                        <span className="text-[12px] font-semibold text-muted-foreground">отправляет фото</span>
                        {[0,0.18,0.36].map((delay, i) => (
                          <span key={i} className="w-2 h-2 rounded-full bg-muted-foreground inline-block"
                            style={{ animation: `typingBounce 1.2s ease-in-out infinite`, animationDelay: `${delay}s` }} />
                        ))}
                      </div>
                    );
                  }
                  if (tt === "video") {
                    return (
                      <div className="flex items-center gap-2 px-4 py-3 rounded-[18px] rounded-bl-[4px] bg-secondary border border-border shadow-sm">
                        <span className="text-[15px]">🎬</span>
                        <span className="text-[12px] font-semibold text-muted-foreground">отправляет видео</span>
                        {[0,0.18,0.36].map((delay, i) => (
                          <span key={i} className="w-2 h-2 rounded-full bg-muted-foreground inline-block"
                            style={{ animation: `typingBounce 1.2s ease-in-out infinite`, animationDelay: `${delay}s` }} />
                        ))}
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center gap-[5px] px-4 py-3 rounded-[18px] rounded-bl-[4px] bg-secondary border border-border shadow-sm">
                      {[0, 0.18, 0.36].map((delay, i) => (
                        <span key={i} className="w-2 h-2 rounded-full bg-muted-foreground inline-block"
                          style={{ animation: `typingBounce 1.2s ease-in-out infinite`, animationDelay: `${delay}s` }} />
                      ))}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Smart reply chips */}
      <AnimatePresence>
        {smartReplies.length > 0 && !replyTo && !editMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-none shrink-0"
          >
            <MessageSquare size={14} className="text-primary shrink-0" />
            {smartReplyPending ? (
              <div className="flex gap-1.5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-8 w-20 rounded-full bg-secondary animate-pulse" />
                ))}
              </div>
            ) : (
              smartReplies.map((reply, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={async () => {
                    setSmartReplies([]);
                    const token = sessionStorage.getItem("pulse-token");
                    const headers: Record<string, string> = { "Content-Type": "application/json" };
                    if (token) headers["Authorization"] = `Bearer ${token}`;
                    await fetch(`/api/messages`, {
                      method: "POST",
                      headers,
                      body: JSON.stringify({ chatId, text: reply, type: "text" }),
                    });
                    queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
                    queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
                    setTimeout(() => {
                      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                    }, 100);
                  }}
                  className="px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-[13px] font-bold whitespace-nowrap hover:bg-primary/15 hover:border-primary/60 transition-all hover:scale-105 active:scale-95 shrink-0"
                >
                  {reply}
                </motion.button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ChatInput
        chatId={chatId}
        replyTo={replyTo}
        editMessage={editMessage}
        onCancelReply={() => setReplyTo(null)}
        onCancelEdit={() => setEditMessage(null)}
        isBot={!!isBot}
        p2p={p2p}
        isChannel={isChannel}
        isChannelAdmin={isChannelAdmin}
        onMessageSent={() => {
          setSmartReplies([]);
          if (isBot) startBotTypingPoll();
          setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }, 100);
        }}
      />

      <AnimatePresence>
        {threadMessage && (
          <ChannelThread
            messageId={threadMessage.id}
            chatId={chatId}
            parentText={(threadMessage as any).text}
            parentSender={(threadMessage as any).sender?.displayName}
            currentUserId={currentUserId ?? 0}
            onClose={() => setThreadMessage(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInfoPanel && (
          <ChatInfoPanel
            chatId={chatId}
            chatType={chat.type as "group" | "channel"}
            displayName={chat.name || ""}
            avatarUrl={chat.avatarUrl}
            avatarColor={chat.avatarColor || "#333"}
            description={(chat as any).description}
            slowMode={(chat as any).slowMode}
            whoCanSend={(chat as any).whoCanSend}
            isPublic={(chat as any).isPublic}
            onClose={() => setShowInfoPanel(false)}
            onDeleteChat={() => { setSelectedChatId(null); setShowInfoPanel(false); }}
            onToggleMute={handleToggleMute}
            isMuted={chat.isMuted}
          />
        )}
      </AnimatePresence>

      {/* Create Group Dialog */}
      <AnimatePresence>
        {showCreateGroupDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowCreateGroupDialog(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: "spring", damping: 22, stiffness: 320 }}
              className="w-full max-w-sm bg-card border border-border rounded-[24px] shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
                  <Users size={28} className="text-orange-500" />
                </div>
                <h2 className="text-center font-black text-xl mb-1">Создать группу</h2>
                <p className="text-center text-sm text-muted-foreground mb-5">
                  <span className="font-semibold text-foreground">{(chat as any).otherUser?.displayName}</span> будет добавлен автоматически
                </p>
                <input
                  autoFocus
                  type="text"
                  value={createGroupName}
                  onChange={(e) => setCreateGroupName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (createGroupName.trim() && !creatingGroup) { /* submit */ (async () => { setCreatingGroup(true); try { const res = await fetch("/api/chats", { method: "POST", headers: { "Content-Type": "application/json", ...getCWAuthHeaders() }, body: JSON.stringify({ type: "group", name: createGroupName.trim(), memberIds: [(chat as any).otherUser?.id] }) }); if (res.ok) { const newChat = await res.json(); queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() }); setSelectedChatId(newChat.id); setShowCreateGroupDialog(false); toast({ title: "Группа создана", description: createGroupName.trim() }); } else { const d = await res.json(); toast({ title: "Ошибка", description: d.error || "Не удалось создать группу", variant: "destructive" }); } } catch { toast({ title: "Ошибка сети", variant: "destructive" }); } setCreatingGroup(false); })(); } } }}
                  placeholder="Название группы..."
                  className="w-full bg-secondary border border-border rounded-[16px] px-4 py-3.5 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-background transition-all mb-4 placeholder:text-muted-foreground/60"
                  maxLength={64}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreateGroupDialog(false)}
                    className="flex-1 py-3.5 rounded-[16px] bg-secondary text-foreground font-semibold text-[15px] hover:bg-secondary/80 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    disabled={!createGroupName.trim() || creatingGroup}
                    onClick={async () => {
                      if (!createGroupName.trim() || creatingGroup) return;
                      setCreatingGroup(true);
                      try {
                        const res = await fetch("/api/chats", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", ...getCWAuthHeaders() },
                          body: JSON.stringify({
                            type: "group",
                            name: createGroupName.trim(),
                            memberIds: [(chat as any).otherUser?.id],
                          }),
                        });
                        if (res.ok) {
                          const newChat = await res.json();
                          queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
                          setSelectedChatId(newChat.id);
                          setShowCreateGroupDialog(false);
                          toast({ title: "Группа создана", description: createGroupName.trim() });
                        } else {
                          const d = await res.json();
                          toast({ title: "Ошибка", description: d.error || "Не удалось создать группу", variant: "destructive" });
                        }
                      } catch {
                        toast({ title: "Ошибка сети", variant: "destructive" });
                      }
                      setCreatingGroup(false);
                    }}
                    className="flex-1 py-3.5 rounded-[16px] bg-green-500 text-white font-bold text-[15px] hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_4px_14px_rgba(34,197,94,0.3)]"
                  >
                    {creatingGroup ? "Создаём..." : "Создать"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {summaryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSummaryOpen(false)}>
          <div className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Sparkles size={20} className="text-amber-400" />
              </div>
              <div>
                <p className="font-bold text-base">Резюме чата</p>
                <p className="text-xs text-muted-foreground">На основе последних сообщений</p>
              </div>
              <button onClick={() => setSummaryOpen(false)} className="ml-auto w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors">
                <X size={16} />
              </button>
            </div>
            {summaryLoading ? (
              <div className="flex items-center gap-3 py-4">
                <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                <span className="text-sm text-muted-foreground">AI анализирует переписку…</span>
              </div>
            ) : (
              <p className="text-sm text-foreground/90 leading-relaxed">{summaryText}</p>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-sm rounded-[24px]">
          <AlertDialogHeader>
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} className="text-destructive" />
            </div>
            <AlertDialogTitle className="text-center font-black text-xl">
              Удалить чат?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center font-medium text-[15px]">
              Вы уверены? История сообщений будет удалена безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2 mt-6">
            <AlertDialogAction
              onClick={handleDeleteChat}
              className="w-full h-14 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-[15px] shadow-[0_4px_14px_rgba(220,38,38,0.3)]"
            >
              Удалить навсегда
            </AlertDialogAction>
            <AlertDialogCancel className="w-full h-14 rounded-xl border-border hover:bg-secondary font-bold text-[15px] sm:mt-0">
              Отмена
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showAutoDeleteMenu} onOpenChange={setShowAutoDeleteMenu}>
        <AlertDialogContent className="max-w-sm rounded-[24px] p-0 overflow-hidden">
          <div className="px-6 pt-6 pb-4 bg-card border-b border-border text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
              <Flame size={28} className="text-violet-400" />
            </div>
            <h2 className="font-black text-xl mb-1">Автоудаление</h2>
            <p className="text-sm font-medium text-muted-foreground">
              Новые сообщения в этом чате будут исчезать через выбранное время после прочтения.
            </p>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-none">
            {AUTO_DELETE_OPTIONS.map(opt => (
              <button
                key={opt.value === null ? "null" : opt.value}
                onClick={() => handleSetAutoDelete(opt.value)}
                disabled={autoDeleteLoading}
                className={`w-full flex items-center justify-between p-4 rounded-xl transition-all font-bold ${
                  autoDeleteTimer === opt.value
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "hover:bg-secondary text-foreground"
                }`}
              >
                <span>{opt.label}</span>
                {autoDeleteTimer === opt.value && <Pin size={18} />}
              </button>
            ))}
          </div>
          <div className="p-4 bg-secondary/50 border-t border-border">
            <button
              onClick={() => setShowAutoDeleteMenu(false)}
              className="w-full h-12 rounded-xl bg-card border border-border hover:bg-secondary font-bold text-[15px] transition-colors"
            >
              Закрыть
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Mobile chat menu bottom sheet ───────────────────────────────── */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            <motion.div
              key="mobile-menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[9990] bg-black/50 md:hidden"
              onClick={() => setShowMobileMenu(false)}
            />
            <motion.div
              key="mobile-menu-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-[9991] bg-card rounded-t-[28px] pb-[env(safe-area-inset-bottom,16px)] md:hidden overflow-hidden"
              style={{ maxHeight: "85dvh" }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
              </div>

              <div className="overflow-y-auto px-3 pb-4" style={{ maxHeight: "calc(85dvh - 32px)" }}>
                {/* Calls — direct non-bot only */}
                {chat.type === "direct" && !(chat.otherUser as any)?.isBot && (
                  <>
                    <button
                      onClick={() => { setShowMobileMenu(false); handleStartCall("audio"); }}
                      disabled={calling}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-secondary transition-colors font-semibold disabled:opacity-50"
                    >
                      <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                        <Phone size={18} className="text-green-500" />
                      </div>
                      Аудиозвонок
                    </button>
                    <button
                      onClick={() => { setShowMobileMenu(false); handleStartCall("video"); }}
                      disabled={calling}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-secondary transition-colors font-semibold disabled:opacity-50"
                    >
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Video size={18} className="text-blue-500" />
                      </div>
                      Видеозвонок
                    </button>
                    <div className="h-px bg-border my-1 mx-2" />
                  </>
                )}

                {/* Profile & group */}
                {chat.type === "direct" && chat.otherUser?.id && (
                  <>
                    <button
                      onClick={() => { setShowMobileMenu(false); openProfile(); }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-secondary transition-colors font-semibold"
                    >
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <User size={18} className="text-primary" />
                      </div>
                      {t("chat.openProfile")}
                    </button>
                    <button
                      onClick={() => { setShowMobileMenu(false); setCreateGroupName(""); setShowCreateGroupDialog(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-secondary transition-colors font-semibold"
                    >
                      <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                        <Users size={18} className="text-orange-500" />
                      </div>
                      Создать группу
                    </button>
                  </>
                )}

                {/* Search */}
                <button
                  onClick={() => { setShowMobileMenu(false); setShowSearch(v => !v); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-secondary transition-colors font-semibold"
                >
                  <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    <Search size={18} className="text-muted-foreground" />
                  </div>
                  {t("chat.searchMessages")}
                </button>

                {/* Summary */}
                {chat.type === "direct" && messages && messages.length > 3 && (
                  <button
                    onClick={() => { setShowMobileMenu(false); handleSummarize(); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-secondary transition-colors font-semibold"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Sparkles size={18} className="text-amber-400" />
                    </div>
                    Резюме чата
                  </button>
                )}

                <div className="h-px bg-border my-1 mx-2" />

                {/* Mute */}
                <button
                  onClick={() => { setShowMobileMenu(false); handleToggleMute(); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-secondary transition-colors font-semibold"
                >
                  <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    {chat.isMuted
                      ? <Bell size={18} className="text-orange-500" />
                      : <BellOff size={18} className="text-violet-400" />}
                  </div>
                  {chat.isMuted ? t("chat.muteOff") : t("chat.muteOn")}
                </button>

                {/* Pin */}
                <button
                  onClick={() => { setShowMobileMenu(false); handleTogglePin(); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-secondary transition-colors font-semibold"
                >
                  <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    {chat.isPinned
                      ? <PinOff size={18} className="text-muted-foreground" />
                      : <Pin size={18} className="text-indigo-500" />}
                  </div>
                  {chat.isPinned ? t("chat.unpin") : t("chat.pin")}
                </button>

                {/* Auto-delete */}
                <button
                  onClick={() => { setShowMobileMenu(false); setShowAutoDeleteMenu(true); }}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3 font-semibold">
                    <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <Flame size={18} className={autoDeleteTimer ? "text-violet-400" : "text-muted-foreground"} />
                    </div>
                    {t("chat.autoDelete")}
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-secondary px-2 py-0.5 rounded-md">{autoDeleteLabel}</span>
                </button>

                {/* Group/Channel settings + leave */}
                {(chat.type === "group" || chat.type === "channel") && (
                  <>
                    <button
                      onClick={() => { setShowMobileMenu(false); setShowInfoPanel(v => !v); }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-secondary transition-colors font-semibold"
                    >
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Settings size={18} className="text-primary" />
                      </div>
                      {chat.type === "channel" ? "Настройки канала" : "Настройки группы"}
                    </button>
                    <button
                      onClick={async () => {
                        setShowMobileMenu(false);
                        try {
                          await fetch(`/api/chats/${chatId}/leave`, { method: "POST", headers: getCWAuthHeaders() });
                          queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
                          setSelectedChatId(null);
                        } catch {
                          toast({ title: "Ошибка", description: "Не удалось покинуть чат", variant: "destructive" });
                        }
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-secondary transition-colors font-semibold text-destructive"
                    >
                      <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                        <ArrowLeft size={18} className="text-destructive" />
                      </div>
                      Покинуть чат
                    </button>
                  </>
                )}

                <div className="h-px bg-border my-1 mx-2" />

                {/* Delete */}
                <button
                  onClick={() => { setShowMobileMenu(false); setShowDeleteDialog(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-destructive/10 transition-colors font-semibold text-destructive"
                >
                  <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                    <Trash2 size={18} className="text-destructive" />
                  </div>
                  {t("chat.deleteChat")}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}