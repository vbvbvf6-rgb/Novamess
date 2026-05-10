import React, { useRef, useEffect, useState } from "react";
import { useGetChatById, useGetMessages, getGetMessagesQueryKey, useInitiateCall, useMarkChatAsRead, useUpdateChat, getGetChatsQueryKey, Message } from "@workspace/api-client-react";
import { useNotifications } from "@/hooks/useNotifications";
import { Phone, Video, MoreVertical, ArrowLeft, Search, BellOff, Bell, Pin, PinOff, User, Trash2, X, Timer, Flame, ChevronRight, Settings } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatInfoPanel } from "./ChatInfoPanel";
import { useAppContext } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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
  const { setSelectedChatId, setActiveCall, setTypingForChat, startCall } = useAppContext();
  const { permission, requestPermission, notify } = useNotifications();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: chat, isLoading: isChatLoading } = useGetChatById(chatId, { query: { enabled: !!chatId } });
  const { data: messages, isLoading: isMessagesLoading } = useGetMessages({ chatId }, { query: { enabled: !!chatId } });
  const initiateCall = useInitiateCall();
  const markAsRead = useMarkChatAsRead();
  const updateChat = useUpdateChat();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ userId: number; displayName: string }[]>([]);
  const [showAutoDeleteMenu, setShowAutoDeleteMenu] = useState(false);
  const [autoDeleteLoading, setAutoDeleteLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editMessage, setEditMessage] = useState<Message | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  const sseRef = useRef<EventSource | null>(null);

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
    const uid = localStorage.getItem("pulse-user-id") || "1";
    const es = new EventSource(`/api/chats/${chatId}/events?_uid=${uid}`);
    sseRef.current = es;

    es.addEventListener("new-message", (e: MessageEvent) => {
      queryClient.refetchQueries({ queryKey: getGetMessagesQueryKey({ chatId }) }).then(() => {
        const msgs = queryClient.getQueryData<Message[]>(getGetMessagesQueryKey({ chatId }));
        const last = msgs?.[msgs.length - 1];
        if (last && last.senderId !== Number(localStorage.getItem("pulse-user-id") || "1")) {
          const chatData = queryClient.getQueryData<any>(["getGetChatById", chatId]) ?? null;
          const chatName = chatData?.otherUser?.displayName ?? chatData?.name ?? "Pulse";
          const senderName = last.sender?.displayName || chatName;
          const body = last.type === "image" ? "📷 Фото" : last.type === "audio" ? "🎤 Голосовое" : last.text || "";
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

    es.addEventListener("typing", (e: MessageEvent) => {
      try {
        const currentUid = Number(localStorage.getItem("pulse-user-id") || "1");
        const data = JSON.parse(e.data) as { userId: number; displayName: string; typing: boolean };
        if (data.userId === currentUid) return;
        setTypingUsers(prev => {
          let next: { userId: number; displayName: string }[];
          if (data.typing) {
            if (prev.some(u => u.userId === data.userId)) next = prev;
            else next = [...prev, { userId: data.userId, displayName: data.displayName }];
          } else {
            next = prev.filter(u => u.userId !== data.userId);
          }
          setTypingForChat(chatId, next.map(u => u.displayName));
          return next;
        });
      } catch {}
    });

    return () => {
      es.close();
      sseRef.current = null;
    };
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
    setTypingForChat(chatId, []);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, [chatId]);

  const botDisplayName = (chat?.otherUser as any)?.displayName || "Bot";

  const startBotTypingPoll = () => {
    lastMessageCountRef.current = messages?.length ?? 0;
    setBotTyping(true);
    setTypingForChat(chatId, [botDisplayName]);
    let attempts = 0;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      attempts++;
      await queryClient.refetchQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
      if (attempts >= 30) {
        setBotTyping(false);
        setTypingForChat(chatId, []);
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      }
    }, 1500);
  };

  useEffect(() => {
    if (!botTyping) return;
    const current = messages?.length ?? 0;
    if (current > lastMessageCountRef.current) {
      setBotTyping(false);
      setTypingForChat(chatId, []);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
  }, [messages, botTyping]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleStartCall = async (type: "audio" | "video") => {
    if (!chat?.otherUser?.id) return;
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
        toast({ title: "Не удалось начать звонок", description: "Проверьте доступ к микрофону/камере", variant: "destructive" });
      }
    }
  };

  const handleToggleMute = () => {
    if (!chat) return;
    updateChat.mutate({ chatId, data: { isMuted: !chat.isMuted } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() })
    });
  };

  const getCWAuthHeaders = (json?: boolean): Record<string, string> => {
    const token = localStorage.getItem("pulse-token");
    const base = token
      ? { "Authorization": `Bearer ${token}` }
      : (() => { const uid = localStorage.getItem("pulse-user-id"); return uid ? { "x-user-id": uid } : {}; })();
    return json ? { "Content-Type": "application/json", ...base } : base;
  };

  const handleTogglePin = () => {
    if (!chat) return;
    fetch(`/api/chats/${chatId}/pin`, {
      method: "PUT",
      headers: getCWAuthHeaders(),
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
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

  const filteredMessages = messages?.slice().filter(msg => {
    if (!searchQuery.trim()) return true;
    return (msg as any).text?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (isChatLoading) {
    return <div className="flex-1 flex flex-col items-center justify-center bg-card"><Skeleton className="w-24 h-24 rounded-full mb-6" /><Skeleton className="h-8 w-48 rounded-xl" /></div>;
  }

  if (!chat) return <div className="flex-1 flex items-center justify-center bg-card">Чат не найден</div>;

  const displayName = chat.type === "direct" ? (chat.otherUser?.displayName || chat.name || "Chat") : (chat.name || "Group");
  const avatarColor = chat.type === "direct" ? (chat.otherUser?.avatarColor || chat.avatarColor || "#333") : (chat.avatarColor || "#333");
  const isVerified = chat.type === "direct" && (chat.otherUser as any)?.isVerified;
  const autoDeleteLabel = formatAutoDeleteLabel(autoDeleteTimer);

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden z-30">
      {/* Header */}
      <header className="h-[72px] border-b border-border flex items-center px-4 justify-between bg-card z-20 shrink-0 shadow-[0_4px_24px_rgba(0,0,0,0.04)] relative">
        <div className="flex items-center gap-3 min-w-0">
          <button
            className="flex items-center justify-center w-11 h-11 -ml-2 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground transition-colors shrink-0 md:hidden"
            onClick={() => setSelectedChatId(null)}
            aria-label="Назад к чатам"
          >
            <ArrowLeft size={22} />
          </button>

          <button
            onClick={chat.type === "direct" ? openProfile : () => setShowInfoPanel(v => !v)}
            className={`w-12 h-12 rounded-[16px] flex items-center justify-center text-white font-black text-xl overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity shadow-sm`}
            style={{ backgroundColor: avatarColor }}
          >
            {(chat.type === "direct" ? (chat.otherUser as any)?.avatarUrl : chat.avatarUrl) ? (
              <img src={(chat.type === "direct" ? (chat.otherUser as any)?.avatarUrl : chat.avatarUrl)} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              displayName[0].toUpperCase()
            )}
          </button>

          <button
            onClick={chat.type === "direct" ? openProfile : () => setShowInfoPanel(v => !v)}
            className={`text-left min-w-0 cursor-pointer group`}
          >
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-base leading-tight truncate group-hover:text-primary transition-colors">{displayName}</h2>
              {isVerified && (
                <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="12" fill="currentColor" className="text-primary"/>
                  <path d="M7 12l3.5 3.5L17 8" stroke="currentColor" className="text-primary-foreground" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {autoDeleteTimer ? (
                <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-500 text-white shrink-0 shadow-[0_2px_8px_rgba(249,115,22,0.3)]">
                  <Flame size={12} fill="currentColor" />
                  {autoDeleteLabel}
                </span>
              ) : null}
            </div>
            <p className="text-[13px] text-muted-foreground truncate font-medium mt-0.5">
              {chat.type === "direct" && chat.otherUser ? (
                <span className={chat.otherUser.status === "online" ? "text-primary" : ""}>
                  {chat.otherUser.status === "online" ? t("chat.online") : (chat.otherUser as any).statusText || t("chat.offline")}
                </span>
              ) : `${chat.members?.length || 0} ${t("chat.members")}`}
            </p>
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
          {chat.type === "direct" && !(chat.otherUser as any)?.isBot && (
            <>
              <button
                onClick={() => handleStartCall("audio")}
                disabled={initiateCall.isPending}
                className="w-10 h-10 flex items-center justify-center hover:bg-secondary rounded-xl transition-all hover:text-foreground"
                title="Audio call"
              >
                <Phone size={20} />
              </button>
              <button
                onClick={() => handleStartCall("video")}
                disabled={initiateCall.isPending}
                className="w-10 h-10 flex items-center justify-center hover:bg-secondary rounded-xl transition-all hover:text-foreground"
                title="Video call"
              >
                <Video size={22} />
              </button>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 flex items-center justify-center hover:bg-secondary rounded-xl transition-all hover:text-foreground">
                <MoreVertical size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-2xl p-2 border-border shadow-2xl">
              {chat.type === "direct" && chat.otherUser?.id && (
                <DropdownMenuItem onClick={openProfile} className="rounded-xl cursor-pointer py-2.5">
                  <User size={18} className="mr-3 text-primary" />
                  <span className="font-semibold">{t("chat.openProfile")}</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => { setShowSearch(v => !v); }} className="rounded-xl cursor-pointer py-2.5">
                <Search size={18} className="mr-3 text-muted-foreground" />
                <span className="font-semibold">{t("chat.searchMessages")}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleToggleMute} className="rounded-xl cursor-pointer py-2.5">
                {chat.isMuted ? (
                  <><Bell size={18} className="mr-3 text-green-500" /><span className="font-semibold">{t("chat.muteOff")}</span></>
                ) : (
                  <><BellOff size={18} className="mr-3 text-orange-500" /><span className="font-semibold">{t("chat.muteOn")}</span></>
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
                  <Flame size={18} className={`mr-3 ${autoDeleteTimer ? "text-orange-500 fill-orange-500/20" : "text-muted-foreground"}`} />
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
                    className="text-orange-500 focus:text-orange-500 rounded-xl cursor-pointer py-2.5"
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
      </header>

      {/* Auto-delete active banner */}
      {autoDeleteTimer ? (
        <div className="flex items-center justify-between px-5 py-2.5 bg-orange-500 text-white shrink-0 shadow-sm relative z-10">
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
      {showSearch && (
        <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-3 shrink-0 shadow-sm relative z-10">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Search size={18} className="text-foreground" />
          </div>
          <input
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t("chat.searchPlaceholder")}
            className="flex-1 bg-transparent border-none outline-none text-[15px] font-medium placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <X size={18} />
            </button>
          )}
          <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="font-bold text-sm text-primary hover:text-primary/80 transition-colors ml-1">
            Отмена
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-none"
      >
        {isMessagesLoading ? (
          <div className="space-y-6 max-w-2xl mx-auto w-full">
            <Skeleton className="w-[60%] h-24 rounded-2xl rounded-tl-md" />
            <Skeleton className="w-[50%] h-16 rounded-2xl rounded-tr-md ml-auto" />
            <Skeleton className="w-[70%] h-32 rounded-2xl rounded-tl-md" />
          </div>
        ) : filteredMessages?.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-[15px] font-medium">
            {searchQuery ? t("chat.noSearchResults") : t("chat.noMessages")}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full space-y-6 flex flex-col justify-end min-h-full">
            {filteredMessages?.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onReply={(msg) => { setEditMessage(null); setReplyTo(msg); }}
                onEdit={(msg) => { setReplyTo(null); setEditMessage(msg); }}
              />
            ))}
          </div>
        )}

        {(botTyping || typingUsers.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 text-muted-foreground max-w-3xl mx-auto w-full px-2"
          >
            <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-secondary/80 border border-border shadow-sm">
              <span className="text-[13px] font-bold">
                {botTyping ? botDisplayName : typingUsers[0].displayName} печатает
              </span>
              <span className="flex items-center gap-[3px] ml-1">
                {[0, 0.15, 0.3].map((delay, i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-foreground opacity-50 inline-block"
                    style={{ animation: `typingBounce 1.2s ease-in-out infinite`, animationDelay: `${delay}s` }}
                  />
                ))}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      <ChatInput
        chatId={chatId}
        replyTo={replyTo}
        editMessage={editMessage}
        onCancelReply={() => setReplyTo(null)}
        onCancelEdit={() => setEditMessage(null)}
        onMessageSent={() => {
          if (isBot) startBotTypingPoll();
          setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }, 100);
        }}
      />

      <AnimatePresence>
        {showInfoPanel && (
          <ChatInfoPanel
            chatId={chatId}
            onClose={() => setShowInfoPanel(false)}
            onDeleteChat={() => setShowDeleteDialog(true)}
            onSetAutoDelete={() => setShowAutoDeleteMenu(true)}
            autoDeleteTimer={autoDeleteTimer}
            onTogglePin={handleTogglePin}
            isPinned={chat.isPinned}
            onToggleMute={handleToggleMute}
            isMuted={chat.isMuted}
          />
        )}
      </AnimatePresence>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
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
              onClick={handleDeleteConfirm}
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
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
              <Flame size={28} className="text-orange-500" />
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
    </div>
  );
}