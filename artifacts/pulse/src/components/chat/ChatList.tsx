import React, { useState, useRef, useCallback } from "react";
import { useGetChats, Chat } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Search, Pin, VolumeX, Users, Radio, Bot, HeadphonesIcon, Bug,
  SquarePen, X, ChevronRight, Check, CheckCheck, Clock, ArrowLeft, Crown, Bookmark } from "lucide-react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { StoriesBar } from "@/components/stories/StoriesBar";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalSearch } from "./GlobalSearch";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type FolderKey = "all" | "unread" | "groups";

const FOLDERS: { key: FolderKey; label: string }[] = [
  { key: "all",    label: "Все" },
  { key: "unread", label: "Новые" },
  { key: "groups", label: "Группы" },
];

function VerifiedBadge() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 inline-block">
      <circle cx="12" cy="12" r="12" fill="currentColor" className="text-primary"/>
      <path d="M7 12l3.5 3.5L17 8" stroke="currentColor" className="text-primary-foreground" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PrimeBadge() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 inline-block">
      <circle cx="12" cy="12" r="12" fill="#f97316"/>
      <path d="M5 15l3-5 4 3 4-3 3 5H5z" fill="white"/>
      <path d="M12 7l1.2 2.5L16 9.8l-1.9 1.9.5 2.8L12 13.2l-2.6 1.3.5-2.8L8 9.8l2.8-.3L12 7z" fill="white"/>
    </svg>
  );
}

function PrimePlusBadge() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 inline-block">
      <defs>
        <linearGradient id="ppgrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7"/>
          <stop offset="50%" stopColor="#d946ef"/>
          <stop offset="100%" stopColor="#06b6d4"/>
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill="url(#ppgrad)"/>
      <text x="12" y="16" fontSize="12" textAnchor="middle" fill="white" fontFamily="system-ui" fontWeight="bold">💎</text>
    </svg>
  );
}

function AdminBadge() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 inline-block">
      <circle cx="12" cy="12" r="12" fill="#6366f1"/>
      <path d="M12 5.5l4 2v5c0 2.5-1.8 4.7-4 5.3-2.2-.6-4-2.8-4-5.3v-5l4-2z" fill="white"/>
    </svg>
  );
}

function ChatAvatar({ chat, displayName }: { chat: Chat; displayName: string }) {
  const avatarColor =
    chat.type === "direct"
      ? ((chat.otherUser as any)?.avatarColor || chat.avatarColor || "#333")
      : (chat.avatarColor || "#3B82F6");

  const avatarUrl =
    chat.type === "direct"
      ? (chat.otherUser as any)?.avatarUrl
      : (chat as any).avatarUrl;

  const letter = displayName[0]?.toUpperCase() || "?";
  const status = chat.type === "direct" ? (chat.otherUser as any)?.status : null;
  const statusDotColor =
    status === "online" ? "bg-green-500" :
    status === "away" ? "bg-yellow-500" : null;

  const hasPrime = chat.type === "direct" && (chat.otherUser as any)?.hasPrime;
  const isPlus   = chat.type === "direct" && (chat.otherUser as any)?.primeTier === "prime_plus";

  return (
    <div className="relative shrink-0">
      {hasPrime && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: isPlus ? 3 : 4, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-[2px] rounded-[20px]"
          style={{
            background: isPlus
              ? "conic-gradient(from 0deg, #a855f7, #38bdf8, #e2e8f0, #c084fc, #06b6d4, #a855f7)"
              : "conic-gradient(from 0deg, #eab308, #f59e0b, #d97706, #eab308)",
            borderRadius: "20px",
          }}
        />
      )}
      <div
        className="w-14 h-14 rounded-[18px] flex items-center justify-center text-white font-black text-xl overflow-hidden shadow-sm relative z-10"
        style={{ backgroundColor: avatarColor }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : chat.type === "channel" ? (
          <Radio size={24} className="text-white opacity-80" />
        ) : chat.type === "group" ? (
          <Users size={24} className="text-white opacity-80" />
        ) : (chat.otherUser as any)?.isBot ? (
          <Bot size={24} className="text-white opacity-80" />
        ) : (
          letter
        )}
      </div>
      {statusDotColor && (
        <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-card ${statusDotColor} z-20`} />
      )}
      {hasPrime && (
        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center z-20 ${
          isPlus
            ? "bg-gradient-to-br from-purple-500 to-cyan-400 shadow-[0_0_6px_rgba(168,85,247,0.8)]"
            : "bg-gradient-to-br from-yellow-400 to-amber-500 shadow-[0_0_6px_rgba(250,204,21,0.8)]"
        }`}>
          <Crown size={8} className="text-white" />
        </div>
      )}
    </div>
  );
}

function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    }
    if (diffDays === 1) return "вчера";
    if (diffDays < 7) {
      return date.toLocaleDateString("ru-RU", { weekday: "short" });
    }
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

type CreateStep = "choose" | "details" | "members";

interface UserResult {
  id: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
  avatarColor?: string;
}

function SavedMessagesEntry({ onOpen }: { onOpen: (id: number) => void }) {
  const [loading, setLoading] = React.useState(false);
  const [lastMsg, setLastMsg] = React.useState<string | null>(null);

  const open = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const token = sessionStorage.getItem("pulse-token");
      const res = await fetch("/api/chats/saved", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) {
        const chat = await res.json();
        if (chat?.lastMessage?.text) setLastMsg(chat.lastMessage.text);
        onOpen(chat.id);
      }
    } catch {}
    setLoading(false);
  };

  return (
    <button
      onClick={open}
      disabled={loading}
      className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl transition-all text-left hover:bg-secondary border border-transparent hover:border-border/50"
    >
      <div className="w-12 h-12 rounded-[16px] bg-amber-500/15 flex items-center justify-center shrink-0 border border-amber-500/30">
        <Bookmark size={22} className="text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <h3 className="font-bold text-[15px] text-foreground">Избранное</h3>
        </div>
        <p className="text-[13px] text-muted-foreground truncate font-medium">
          {lastMsg || "Сохранённые сообщения"}
        </p>
      </div>
    </button>
  );
}

export function ChatList() {
  const { selectedChatId, setSelectedChatId, typingByChat, currentUserId } = useAppContext();
  const { t, lang } = useLanguage();
  const [, navigate] = useLocation();
  const { data: chats, isLoading } = useGetChats();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState<FolderKey>("all");
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  // Create group/channel modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState<CreateStep>("choose");
  const [createType, setCreateType] = useState<"group" | "channel">("group");
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<UserResult[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<UserResult[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const memberSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function getAuthHeaders(): Record<string, string> {
    const token = sessionStorage.getItem("pulse-token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
  }

  const openCreate = () => {
    setCreateStep("choose");
    setCreateName("");
    setCreateDesc("");
    setMemberSearch("");
    setMemberResults([]);
    setSelectedMembers([]);
    setShowCreate(true);
  };

  const searchMembers = useCallback(async (q: string) => {
    if (!q.trim()) { setMemberResults([]); return; }
    setMemberLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}&limit=20`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const uid = Number(sessionStorage.getItem("pulse-user-id") || "0");
        setMemberResults((data.users || data || []).filter((u: UserResult) => u.id !== uid));
      }
    } catch {}
    setMemberLoading(false);
  }, []);

  const onMemberSearchChange = (val: string) => {
    setMemberSearch(val);
    if (memberSearchTimer.current) clearTimeout(memberSearchTimer.current);
    memberSearchTimer.current = setTimeout(() => searchMembers(val), 300);
  };

  const toggleMember = (user: UserResult) => {
    setSelectedMembers(prev =>
      prev.some(m => m.id === user.id)
        ? prev.filter(m => m.id !== user.id)
        : [...prev, user]
    );
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          type: createType,
          name: createName.trim(),
          description: createDesc.trim() || undefined,
          memberIds: selectedMembers.map(m => m.id),
        }),
      });
      if (res.ok) {
        const chat = await res.json();
        await queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
        setSelectedChatId(chat.id);
        setShowCreate(false);
        toast({
          title: `${createType === "group" ? "Группа" : "Канал"} создан${createType === "channel" ? "" : "а"}`,
          description: createName.trim(),
        });
      } else {
        const d = await res.json();
        toast({ title: "Ошибка", description: d.error || "Не удалось создать", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка сети", variant: "destructive" });
    }
    setCreating(false);
  };

  const filtered = chats?.filter((chat: Chat) => {
    if (search) {
      const name =
        chat.type === "direct"
          ? ((chat.otherUser as any)?.displayName || chat.name || "")
          : (chat.name || "");
      if (!name.toLowerCase().includes(search.toLowerCase())) return false;
    }

    if ((chat as any).type === "saved") return false;
    if (folder === "unread") return (chat.unreadCount ?? 0) > 0;
    if (folder === "groups") return chat.type === "group" || chat.type === "channel";
    return true;
  });

  const sorted = filtered?.slice().sort((a: Chat, b: Chat) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const aTime = a.lastMessage?.createdAt || (a as any).createdAt || "";
    const bTime = b.lastMessage?.createdAt || (b as any).createdAt || "";
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return (
    <div className="w-full md:w-[380px] lg:w-[420px] flex flex-col h-[100dvh] bg-background border-r border-border shrink-0 z-20">
      <AnimatePresence>
        {showGlobalSearch && (
          <GlobalSearch onClose={() => setShowGlobalSearch(false)} />
        )}
      </AnimatePresence>
      <div className="px-4 pb-3" style={{ paddingTop: "max(16px, env(safe-area-inset-top, 16px))" }}>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder={t("chatlist.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 pr-4 h-12 bg-secondary/50 border-transparent hover:border-border focus-visible:bg-card focus-visible:ring-1 focus-visible:ring-primary rounded-2xl transition-all text-[15px] font-medium placeholder:text-muted-foreground/70"
            />
          </div>
          <button
            onClick={openCreate}
            className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all shadow-[0_4px_14px_rgba(139,92,246,0.3)] shrink-0"
          >
            <SquarePen size={20} />
          </button>
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-none pb-1">
          {FOLDERS.map(f => {
            const isActive = folder === f.key;
            const count = f.key === "unread" && chats ? chats.filter((c: Chat) => (c.unreadCount ?? 0) > 0).length : 0;
            return (
              <button
                key={f.key}
                onClick={() => setFolder(f.key)}
                className={cn(
                  "shrink-0 px-4 py-2 rounded-[14px] text-sm font-bold transition-all whitespace-nowrap border flex items-center gap-2",
                  isActive
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
                )}
              >
                {f.label}
                {count > 0 && (
                  <span className={cn(
                    "text-[10px] font-black px-1.5 py-0.5 rounded-md leading-none",
                    isActive ? "bg-background text-foreground" : "bg-primary text-white"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-2">
        <StoriesBar />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none mt-2 px-2 pb-24 md:pb-4">
        {!search && folder === "all" && (
          <div className="space-y-1 mb-2">
            <SavedMessagesEntry onOpen={(id) => setSelectedChatId(id)} />
            <button
              onClick={() => navigate("/support")}
              className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl transition-all text-left hover:bg-secondary border border-transparent hover:border-border/50"
            >
              <div className="w-12 h-12 rounded-[16px] bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                <HeadphonesIcon size={22} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className="font-bold text-[15px] text-foreground">Поддержка</h3>
                  <span className="text-[11px] font-bold text-primary/70 uppercase tracking-wider bg-primary/10 px-1.5 py-0.5 rounded shrink-0">24/7</span>
                </div>
                <p className="text-[13px] text-muted-foreground truncate font-medium">Связаться с командой</p>
              </div>
            </button>
            <button
              onClick={() => navigate("/support?tab=bugs")}
              className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl transition-all text-left hover:bg-secondary border border-transparent hover:border-border/50"
            >
              <div className="w-12 h-12 rounded-[16px] bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
                <Bug size={22} className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className="font-bold text-[15px] text-foreground">Сообщить об ошибке</h3>
                  <span className="text-[11px] font-bold text-red-500/70 uppercase tracking-wider bg-red-500/10 px-1.5 py-0.5 rounded shrink-0">БАГ</span>
                </div>
                <p className="text-[13px] text-muted-foreground truncate font-medium">Нашли баг? Расскажите нам</p>
              </div>
            </button>
          </div>
        )}

        <div className="space-y-1">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-3 py-3">
                <Skeleton className="w-14 h-14 rounded-[18px]" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))
          ) : sorted?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-[15px] font-medium mt-10">
              {search
                ? "Чаты не найдены"
                : folder === "unread"
                ? "Нет новых сообщений"
                : folder === "groups"
                ? "Нет групп и каналов"
                : "Нет чатов"}
            </div>
          ) : (
            sorted?.map((chat: Chat) => {
              const isSelected = selectedChatId === chat.id;
              const lastMessage = chat.lastMessage;
              const isBot = (chat.otherUser as any)?.isBot;
              const isVerified = chat.type === "direct" && (chat.otherUser as any)?.isVerified;
              const hasPrime = chat.type === "direct" && (chat.otherUser as any)?.hasPrime;
              const isPrimePlus = hasPrime && (chat.otherUser as any)?.primeTier === "prime_plus";
              const isAdmin = chat.type === "direct" && (chat.otherUser as any)?.isAdmin;

              const displayName =
                chat.type === "direct"
                  ? ((chat.otherUser as any)?.displayName || chat.name || "Неизвестный")
                  : (chat.name || (chat.type === "channel" ? "Канал" : "Группа"));

              const lastMsgText = lastMessage
                ? lastMessage.type === "text"
                  ? lastMessage.text || ""
                  : lastMessage.type === "image"
                  ? "📷 Фото"
                  : lastMessage.type === "gift"
                  ? "🎁 Подарок"
                  : lastMessage.type === "audio"
                  ? "🎤 Голосовое"
                  : lastMessage.type === "call"
                  ? "📞 Звонок"
                  : lastMessage.type === "sticker"
                  ? "🎨 Стикер"
                  : `[${lastMessage.type}]`
                : "Нет сообщений";

              return (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={cn(
                    "w-full flex items-center gap-4 px-3 py-3 rounded-2xl transition-all text-left group border",
                    isSelected
                      ? "bg-secondary border-border shadow-sm"
                      : "bg-transparent border-transparent hover:bg-secondary/50 hover:border-border/50"
                  )}
                >
                  <div className="relative shrink-0">
                    <ChatAvatar chat={chat} displayName={displayName} />
                    {chat.isPinned && (
                      <div className="absolute -top-1.5 -right-1.5 bg-card rounded-full p-[2px]">
                        <div className="bg-foreground p-1 rounded-full text-background">
                          <Pin size={10} fill="currentColor" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="font-bold truncate text-[15px] text-foreground">{displayName}</h3>
                        {isVerified && <VerifiedBadge />}
                        {isPrimePlus ? <PrimePlusBadge /> : hasPrime ? <PrimeBadge /> : null}
                        {isAdmin && <AdminBadge />}
                        {isBot && (
                          <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">BOT</span>
                        )}
                        {chat.type === "channel" && (
                          <Radio size={12} className="text-muted-foreground shrink-0" />
                        )}
                      </div>
                      {lastMessage && (
                        <div className="flex items-center gap-0.5 shrink-0 ml-2">
                          {lastMessage.senderId === currentUserId && (() => {
                            const age = Date.now() - new Date(lastMessage.createdAt).getTime();
                            if (age < 1500) return <Clock size={12} className="text-muted-foreground opacity-60" />;
                            if (lastMessage.isRead) return <CheckCheck size={14} strokeWidth={2.5} className="text-primary" />;
                            return <Check size={14} strokeWidth={2.5} className="text-muted-foreground opacity-70" />;
                          })()}
                          <span className={cn(
                            "text-[11px] font-bold",
                            chat.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {formatTime(lastMessage.createdAt)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center gap-3">
                      <div className={cn(
                        "text-[13px] truncate flex-1 min-w-0 font-medium",
                        chat.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
                      )}>
                        <AnimatePresence mode="wait" initial={false}>
                          {typingByChat[chat.id]?.length > 0 ? (
                            <motion.span
                              key="typing"
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.15 }}
                              className="flex items-center gap-1.5 text-primary font-bold"
                            >
                              <span className="truncate">
                                {typingByChat[chat.id].length === 1
                                  ? `${typingByChat[chat.id][0]} печатает`
                                  : "печатают"}
                              </span>
                              <span className="flex items-center gap-[3px] shrink-0">
                                {[0, 0.15, 0.3].map((delay, i) => (
                                  <span
                                    key={i}
                                    className="w-1.5 h-1.5 rounded-full bg-primary inline-block"
                                    style={{ animation: `typingBounce 1s ease-in-out infinite`, animationDelay: `${delay}s` }}
                                  />
                                ))}
                              </span>
                            </motion.span>
                          ) : (
                            <motion.span
                              key="msg"
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.15 }}
                              className="block truncate"
                            >
                              {chat.type !== "direct" && lastMessage?.sender ? (
                                <span>
                                  <span className="text-foreground font-bold">
                                    {(lastMessage.sender as any)?.displayName?.split(" ")[0]}:
                                  </span>{" "}
                                  <span className="opacity-80">{lastMsgText}</span>
                                </span>
                              ) : <span className="opacity-80">{lastMsgText}</span>}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {chat.isMuted && <VolumeX size={14} className="text-muted-foreground" />}
                        {chat.unreadCount > 0 && (
                          <div className={cn(
                            "text-[11px] font-black px-2 py-0.5 rounded-full min-w-[22px] text-center leading-none",
                            chat.isMuted ? "bg-secondary text-muted-foreground border border-border" : "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(139,92,246,0.3)]"
                          )}>
                            {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-card rounded-[32px] border border-border w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
                {createStep !== "choose" && (
                  <button onClick={() => setCreateStep(createStep === "members" ? "details" : "choose")} className="p-2 -ml-2 rounded-xl hover:bg-secondary transition-colors">
                    <ArrowLeft size={20} />
                  </button>
                )}
                <h2 className="font-black text-xl text-foreground flex-1">
                  {createStep === "choose" ? "Создать чат" : createStep === "details" ? (createType === "group" ? "Новая группа" : "Новый канал") : "Выбор участников"}
                </h2>
                <button onClick={() => setShowCreate(false)} className="p-2 -mr-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 min-h-[300px] flex flex-col">
                {createStep === "choose" && (
                  <div className="space-y-3">
                    <button
                      onClick={() => { setCreateType("group"); setCreateStep("details"); }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 hover:bg-secondary border border-border transition-all group"
                    >
                      <div className="w-14 h-14 rounded-[18px] bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Users size={28} />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-bold text-lg mb-1">Создать группу</h3>
                        <p className="text-sm text-muted-foreground font-medium">Общение для нескольких участников</p>
                      </div>
                      <ChevronRight size={20} className="text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => { setCreateType("channel"); setCreateStep("details"); }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 hover:bg-secondary border border-border transition-all group"
                    >
                      <div className="w-14 h-14 rounded-[18px] bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Radio size={28} />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-bold text-lg mb-1">Создать канал</h3>
                        <p className="text-sm text-muted-foreground font-medium">Трансляция сообщений для аудитории</p>
                      </div>
                      <ChevronRight size={20} className="text-muted-foreground" />
                    </button>
                  </div>
                )}

                {createStep === "details" && (
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Название</label>
                      <Input
                        autoFocus
                        placeholder={createType === "group" ? "Название группы" : "Название канала"}
                        value={createName}
                        onChange={e => setCreateName(e.target.value)}
                        className="bg-secondary/50 border-transparent focus-visible:bg-card h-14 rounded-xl text-base font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Описание (необязательно)</label>
                      <textarea
                        placeholder="О чем этот чат?"
                        value={createDesc}
                        onChange={e => setCreateDesc(e.target.value)}
                        className="w-full bg-secondary/50 border-transparent focus:bg-card focus:ring-1 focus:ring-primary h-24 rounded-xl px-4 py-3 text-base font-medium resize-none"
                      />
                    </div>
                    <div className="mt-auto pt-4">
                      <button
                        disabled={!createName.trim()}
                        onClick={() => setCreateStep("members")}
                        className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-black disabled:opacity-50 hover:bg-primary/90 transition-all text-base shadow-[0_4px_14px_rgba(139,92,246,0.3)] hover:-translate-y-0.5 active:translate-y-0 disabled:shadow-none disabled:-translate-y-0"
                      >
                        Далее
                      </button>
                    </div>
                  </div>
                )}

                {createStep === "members" && (
                  <div className="flex-1 flex flex-col -mx-6 -mt-6">
                    <div className="p-4 border-b border-border bg-card">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <Input
                          placeholder="Поиск пользователей..."
                          value={memberSearch}
                          onChange={e => onMemberSearchChange(e.target.value)}
                          className="pl-11 h-12 bg-secondary/50 border-transparent rounded-xl focus-visible:bg-background text-base font-medium"
                          autoFocus
                        />
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 max-h-[40vh] min-h-[200px]">
                      {memberLoading ? (
                        <div className="p-4 text-center text-muted-foreground text-sm font-medium">Поиск...</div>
                      ) : memberResults.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm font-medium">
                          {memberSearch ? "Ничего не найдено" : "Введите имя для поиска"}
                        </div>
                      ) : (
                        memberResults.map(user => {
                          const isSelected = selectedMembers.some(m => m.id === user.id);
                          return (
                            <button
                              key={user.id}
                              onClick={() => toggleMember(user)}
                              className="w-full flex items-center justify-between p-3 hover:bg-secondary rounded-xl transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden"
                                  style={{ backgroundColor: user.avatarColor || "#333" }}
                                >
                                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : user.displayName[0].toUpperCase()}
                                </div>
                                <div className="text-left">
                                  <p className="font-bold text-sm text-foreground">{user.displayName}</p>
                                  <p className="text-xs text-muted-foreground font-medium">@{user.username}</p>
                                </div>
                              </div>
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center transition-colors border",
                                isSelected ? "bg-primary border-primary text-white" : "border-border text-transparent"
                              )}>
                                <Check size={14} strokeWidth={3} />
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    <div className="p-4 border-t border-border bg-card">
                      <button
                        onClick={handleCreate}
                        disabled={creating}
                        className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-black disabled:opacity-50 hover:bg-primary/90 transition-all text-base shadow-[0_4px_14px_rgba(139,92,246,0.3)] hover:-translate-y-0.5 active:translate-y-0"
                      >
                        {creating ? "Создание..." : `Создать ${createType === "group" ? "группу" : "канал"} (${selectedMembers.length})`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}