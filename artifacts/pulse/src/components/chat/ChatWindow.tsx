import React, { useRef, useEffect, useState } from "react";
import { useGetChatById, useGetMessages, getGetMessagesQueryKey, useInitiateCall, useMarkChatAsRead, useUpdateChat, getGetChatsQueryKey, Message } from "@workspace/api-client-react";
import { Phone, Video, MoreVertical, ArrowLeft, Search, BellOff, Bell, Pin, PinOff, User, Trash2, X, Timer, Flame, ChevronRight } from "lucide-react";
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const isBot = chat && chat.type === "direct" && (chat.otherUser as any)?.isBot;
  const autoDeleteTimer = (chat as any)?.autoDeleteTimer as number | null | undefined;

  // SSE subscription for real-time messages and typing
  useEffect(() => {
    if (!chatId) return;
    const uid = localStorage.getItem("pulse-user-id") || "1";
    const es = new EventSource(`/api/chats/${chatId}/events?_uid=${uid}`, );
    sseRef.current = es;

    es.addEventListener("new-message", () => {
      queryClient.refetchQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
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

  const startBotTypingPoll = () => {
    lastMessageCountRef.current = messages?.length ?? 0;
    setBotTyping(true);
    let attempts = 0;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      attempts++;
      await queryClient.refetchQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
      if (attempts >= 30) {
        setBotTyping(false);
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      }
    }, 1500);
  };

  useEffect(() => {
    if (!botTyping) return;
    const current = messages?.length ?? 0;
    if (current > lastMessageCountRef.current) {
      setBotTyping(false);
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
    } catch {
      toast({ title: "Не удалось начать звонок", description: "Проверьте доступ к микрофону/камере", variant: "destructive" });
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
    return <div className="flex-1 flex flex-col items-center justify-center"><Skeleton className="w-32 h-32 rounded-full mb-4" /><Skeleton className="h-6 w-48" /></div>;
  }

  if (!chat) return <div className="flex-1 flex items-center justify-center">Chat not found</div>;

  const displayName = chat.type === "direct" ? (chat.otherUser?.displayName || chat.name || "Chat") : (chat.name || "Group");
  const avatarColor = chat.type === "direct" ? (chat.otherUser?.avatarColor || chat.avatarColor || "#333") : (chat.avatarColor || "#333");
  const isVerified = chat.type === "direct" && (chat.otherUser as any)?.isVerified;
  const autoDeleteLabel = formatAutoDeleteLabel(autoDeleteTimer);

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center px-4 justify-between bg-card z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button className="p-2 -ml-2 text-muted-foreground hover:text-foreground shrink-0" onClick={() => setSelectedChatId(null)}>
            <ArrowLeft size={20} />
          </button>

          <button
            onClick={openProfile}
            disabled={chat.type !== "direct"}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold overflow-hidden shrink-0 ${chat.type === "direct" ? "cursor-pointer hover:opacity-85 transition-opacity" : "cursor-default"}`}
            style={{ backgroundColor: avatarColor }}
          >
            {chat.avatarUrl ? (
              <img src={chat.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              displayName[0].toUpperCase()
            )}
          </button>

          <button
            onClick={openProfile}
            disabled={chat.type !== "direct"}
            className={`text-left min-w-0 ${chat.type === "direct" ? "cursor-pointer hover:opacity-80 transition-opacity" : "cursor-default"}`}
          >
            <div className="flex items-center gap-1.5">
              <h2 className="font-semibold text-sm leading-tight truncate">{displayName}</h2>
              {isVerified && (
                <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="12" fill="#00BCD4"/>
                  <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {autoDeleteTimer ? (
                <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25 shrink-0">
                  <Flame size={9} />
                  {autoDeleteLabel}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {chat.type === "direct" && chat.otherUser ? (
                <span className={chat.otherUser.status === "online" ? "text-green-500" : ""}>
                  {chat.otherUser.status === "online" ? t("chat.online") : (chat.otherUser as any).statusText || t("chat.offline")}
                </span>
              ) : `${chat.members?.length || 0} ${t("chat.members")}`}
            </p>
          </button>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground shrink-0">
          {chat.type === "direct" && !(chat.otherUser as any)?.isBot && (
            <>
              <button
                onClick={() => handleStartCall("audio")}
                disabled={initiateCall.isPending}
                className="p-2 hover:bg-secondary rounded-full transition-colors hover:text-primary"
                title="Audio call"
              >
                <Phone size={20} />
              </button>
              <button
                onClick={() => handleStartCall("video")}
                disabled={initiateCall.isPending}
                className="p-2 hover:bg-secondary rounded-full transition-colors hover:text-primary"
                title="Video call"
              >
                <Video size={20} />
              </button>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-secondary rounded-full transition-colors hover:text-primary">
                <MoreVertical size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {chat.type === "direct" && chat.otherUser?.id && (
                <DropdownMenuItem onClick={openProfile}>
                  <User size={16} className="mr-2 text-primary" />
                  {t("chat.openProfile")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => { setShowSearch(v => !v); }}>
                <Search size={16} className="mr-2 text-muted-foreground" />
                {t("chat.searchMessages")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleToggleMute}>
                {chat.isMuted ? (
                  <><Bell size={16} className="mr-2 text-green-500" />{t("chat.muteOff")}</>
                ) : (
                  <><BellOff size={16} className="mr-2 text-orange-500" />{t("chat.muteOn")}</>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleTogglePin}>
                {chat.isPinned ? (
                  <><PinOff size={16} className="mr-2 text-muted-foreground" />{t("chat.unpin")}</>
                ) : (
                  <><Pin size={16} className="mr-2 text-blue-500" />{t("chat.pin")}</>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowAutoDeleteMenu(true)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center">
                  <Flame size={16} className={`mr-2 ${autoDeleteTimer ? "text-orange-400" : "text-muted-foreground"}`} />
                  {t("chat.autoDelete")}
                </div>
                <span className="text-xs text-muted-foreground ml-2">{autoDeleteLabel}</span>
              </DropdownMenuItem>
              {(chat.type === "group" || chat.type === "channel") && (
                <DropdownMenuItem
                  className="text-orange-500 focus:text-orange-500"
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
                  <ArrowLeft size={16} className="mr-2" />
                  Покинуть чат
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 size={16} className="mr-2" />
                {t("chat.deleteChat")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Auto-delete active banner */}
      {autoDeleteTimer ? (
        <div className="flex items-center justify-between px-4 py-1.5 bg-orange-500/8 border-b border-orange-500/15 text-xs text-orange-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <Flame size={12} />
            <span>{t("autodelete.active")} <strong>{autoDeleteLabel}</strong></span>
          </div>
          <button
            onClick={() => setShowAutoDeleteMenu(true)}
            className="text-orange-400/70 hover:text-orange-400 transition-colors font-medium"
          >
            {t("common.change")}
          </button>
        </div>
      ) : null}

      {/* Search Bar */}
      {showSearch && (
        <div className="px-4 py-2 border-b border-border bg-card/60 backdrop-blur-md flex items-center gap-2 shrink-0">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t("chat.searchPlaceholder")}
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          )}
          <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin bg-gradient-to-b from-background to-card/50"
      >
        {isMessagesLoading ? (
          <div className="space-y-4">
            <Skeleton className="w-2/3 h-16 rounded-2xl rounded-tl-sm" />
            <Skeleton className="w-1/2 h-16 rounded-2xl rounded-tr-sm ml-auto" />
            <Skeleton className="w-3/4 h-24 rounded-2xl rounded-tl-sm" />
          </div>
        ) : filteredMessages?.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            {searchQuery ? t("chat.noSearchResults") : t("chat.noMessages")}
          </div>
        ) : (
          filteredMessages?.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onReply={(msg) => { setEditMessage(null); setReplyTo(msg); }}
              onEdit={(msg) => { setReplyTo(null); setEditMessage(msg); }}
            />
          ))
        )}
      </div>

      {/* Typing indicators */}
      {(botTyping || typingUsers.length > 0) && (
        <div className="px-4 pb-3 flex flex-col gap-1.5">
          {botTyping && (
            <div className="flex items-end gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden"
                style={{ backgroundColor: (chat?.otherUser as any)?.avatarColor || "#00BCD4" }}
              >
                {(chat?.otherUser as any)?.avatarUrl ? (
                  <img src={(chat?.otherUser as any).avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  (chat?.otherUser as any)?.displayName?.[0]?.toUpperCase() || "AI"
                )}
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-muted-foreground rounded-full" style={{ animation: "typingBounce 1.2s ease-in-out infinite", animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full" style={{ animation: "typingBounce 1.2s ease-in-out infinite", animationDelay: "0.2s" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full" style={{ animation: "typingBounce 1.2s ease-in-out infinite", animationDelay: "0.4s" }} />
              </div>
            </div>
          )}
          {typingUsers.map(u => (
            <div key={u.userId} className="flex items-end gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                {u.displayName[0]?.toUpperCase() || "?"}
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground mr-1.5">{u.displayName}</span>
                <span className="w-2 h-2 bg-muted-foreground rounded-full" style={{ animation: "typingBounce 1.2s ease-in-out infinite", animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full" style={{ animation: "typingBounce 1.2s ease-in-out infinite", animationDelay: "0.2s" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full" style={{ animation: "typingBounce 1.2s ease-in-out infinite", animationDelay: "0.4s" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-card border-t border-border z-10 shrink-0">
        <ChatInput
          chatId={chatId}
          onMessageSent={isBot ? startBotTypingPoll : undefined}
          replyTo={replyTo}
          editMessage={editMessage}
          onCancelReply={() => setReplyTo(null)}
          onCancelEdit={() => setEditMessage(null)}
        />
      </div>

      {/* Auto-delete picker dialog */}
      <AlertDialog open={showAutoDeleteMenu} onOpenChange={setShowAutoDeleteMenu}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Flame size={18} className="text-orange-400" />
              {t("autodelete.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("autodelete.desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-2">
            {AUTO_DELETE_OPTIONS.map(opt => {
              const isActive = opt.value === (autoDeleteTimer ?? null);
              return (
                <button
                  key={String(opt.value)}
                  onClick={() => handleSetAutoDelete(opt.value)}
                  disabled={autoDeleteLoading}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    isActive
                      ? "border-orange-400 bg-orange-500/10 text-orange-400"
                      : "border-border hover:border-primary/40 hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {opt.value ? <Flame size={15} className="text-orange-400" /> : <X size={15} className="text-muted-foreground" />}
                    {opt.label}
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                  )}
                </button>
              );
            })}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Chat Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chat.deleteChatTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("chat.deleteChatDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChat}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t("chat.deleting") : t("chat.deleteChat")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
