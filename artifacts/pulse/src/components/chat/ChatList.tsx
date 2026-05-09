import React, { useState } from "react";
import { useGetChats, Chat } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Search, Pin, VolumeX, Users, Radio, Bot, HeadphonesIcon, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { StoriesBar } from "@/components/stories/StoriesBar";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalSearch } from "./GlobalSearch";

type FolderKey = "all" | "unread" | "groups" | "bots";

const FOLDERS: { key: FolderKey; label: string }[] = [
  { key: "all",    label: "Все" },
  { key: "unread", label: "Непрочитанные" },
  { key: "groups", label: "Группы" },
  { key: "bots",   label: "Боты" },
];

function VerifiedBadge() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="shrink-0 inline-block">
      <circle cx="12" cy="12" r="12" fill="#00BCD4"/>
      <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
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

  return (
    <div className="relative shrink-0">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden"
        style={{ backgroundColor: avatarColor }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : chat.type === "channel" ? (
          <Radio size={20} className="text-white" />
        ) : chat.type === "group" ? (
          <Users size={20} className="text-white" />
        ) : (chat.otherUser as any)?.isBot ? (
          <Bot size={20} className="text-white" />
        ) : (
          letter
        )}
      </div>
      {statusDotColor && (
        <span className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-card ${statusDotColor}`} />
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

export function ChatList({ onMenuClick }: { onMenuClick?: () => void }) {
  const { selectedChatId, setSelectedChatId, typingByChat } = useAppContext();
  const { t, lang } = useLanguage();
  const { data: chats, isLoading } = useGetChats();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState<FolderKey>("all");
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  const openSupportChat = async () => {
    const token = localStorage.getItem("pulse-token");
    const uid = localStorage.getItem("pulse-user-id");
    const authHeader = token ? { "Authorization": `Bearer ${token}` } : uid ? { "x-user-id": uid } : {};
    try {
      const chatRes = await fetch("/api/chats/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ userId: 1 }),
      });
      if (chatRes.ok) {
        const chat = await chatRes.json();
        setSelectedChatId(chat.id);
      }
    } catch {}
  };

  const filtered = chats?.filter((chat: Chat) => {
    if (search) {
      const name =
        chat.type === "direct"
          ? ((chat.otherUser as any)?.displayName || chat.name || "")
          : (chat.name || "");
      if (!name.toLowerCase().includes(search.toLowerCase())) return false;
    }

    if (folder === "unread") return (chat.unreadCount ?? 0) > 0;
    if (folder === "groups") return chat.type === "group" || chat.type === "channel";
    if (folder === "bots") return chat.type === "direct" && !!(chat.otherUser as any)?.isBot;
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
    <div className="w-full md:w-80 lg:w-96 flex flex-col h-full bg-card border-r border-border relative">
      <AnimatePresence>
        {showGlobalSearch && (
          <GlobalSearch onClose={() => setShowGlobalSearch(false)} />
        )}
      </AnimatePresence>
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
          >
            <Menu size={20} />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={t("chatlist.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-none focus-visible:ring-primary"
            />
          </div>
          <button
            onClick={() => setShowGlobalSearch(true)}
            title={lang === "ru" ? "Поиск по сообщениям" : "Search messages"}
            className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-secondary transition-colors shrink-0"
          >
            <Search size={18} />
          </button>
        </div>

        {/* Folder filter tabs */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-none pb-0.5">
          {FOLDERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFolder(f.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                folder === f.key
                  ? "bg-primary text-primary-foreground shadow-[0_0_8px_rgba(0,188,212,0.3)]"
                  : "bg-background text-muted-foreground hover:text-foreground hover:bg-secondary border border-border"
              }`}
            >
              {f.label}
              {f.key === "unread" && chats && chats.filter((c: Chat) => (c.unreadCount ?? 0) > 0).length > 0 && (
                <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${folder === f.key ? "bg-primary-foreground/20" : "bg-primary/20 text-primary"}`}>
                  {chats.filter((c: Chat) => (c.unreadCount ?? 0) > 0).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-border">
        <StoriesBar />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {/* Support chat shortcut */}
        {!search && folder === "all" && (
          <button
            onClick={openSupportChat}
            className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left hover:bg-secondary border-b border-border/50"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <HeadphonesIcon size={22} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <h3 className="font-semibold text-sm text-foreground">Поддержка</h3>
                <span className="text-xs text-muted-foreground shrink-0">ИИ</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">Задайте вопрос ИИ-помощнику</p>
            </div>
          </button>
        )}

        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : sorted?.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {search
              ? "Чаты не найдены"
              : folder === "unread"
              ? "Нет непрочитанных чатов"
              : folder === "groups"
              ? "Нет групп и каналов"
              : folder === "bots"
              ? "Нет ботов"
              : "Нет чатов"}
          </div>
        ) : (
          sorted?.map((chat: Chat) => {
            const isSelected = selectedChatId === chat.id;
            const lastMessage = chat.lastMessage;
            const isBot = (chat.otherUser as any)?.isBot;
            const isVerified = chat.type === "direct" && (chat.otherUser as any)?.isVerified;

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
                : `[${lastMessage.type}]`
              : "Нет сообщений";

            return (
              <button
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left hover:bg-secondary ${
                  isSelected ? "bg-secondary" : ""
                }`}
              >
                <div className="relative shrink-0">
                  <ChatAvatar chat={chat} displayName={displayName} />
                  {chat.isPinned && (
                    <div className="absolute -top-1 -right-1 bg-background rounded-full p-0.5">
                      <div className="bg-primary p-0.5 rounded-full">
                        <Pin size={10} className="text-white" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <div className="flex items-center gap-1 min-w-0">
                      <h3 className="font-semibold truncate text-sm text-foreground">{displayName}</h3>
                      {isVerified && <VerifiedBadge />}
                      {isBot && !isVerified && (
                        <span className="text-[9px] font-bold text-primary bg-primary/10 px-1 rounded shrink-0">BOT</span>
                      )}
                      {chat.type === "channel" && (
                        <Radio size={11} className="text-muted-foreground shrink-0" />
                      )}
                    </div>
                    {lastMessage && (
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {formatTime(lastMessage.createdAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center gap-2">
                    <div className={`text-xs truncate flex-1 min-w-0 ${chat.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      <AnimatePresence mode="wait" initial={false}>
                        {typingByChat[chat.id]?.length > 0 ? (
                          <motion.span
                            key="typing"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center gap-1.5 text-primary font-medium"
                          >
                            <span className="truncate">
                              {typingByChat[chat.id].length === 1
                                ? `${typingByChat[chat.id][0]} печатает`
                                : "печатают"}
                            </span>
                            <span className="flex items-center gap-0.5 shrink-0">
                              {[0, 0.15, 0.3].map((delay, i) => (
                                <span
                                  key={i}
                                  className="w-1 h-1 rounded-full bg-primary inline-block"
                                  style={{ animation: `typingBounce 1.2s ease-in-out infinite`, animationDelay: `${delay}s` }}
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
                                <span className="text-primary font-medium">
                                  {(lastMessage.sender as any)?.displayName?.split(" ")[0]}:
                                </span>{" "}
                                {lastMsgText}
                              </span>
                            ) : lastMsgText}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {chat.isMuted && <VolumeX size={12} className="text-muted-foreground" />}
                      {chat.unreadCount > 0 && (
                        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${chat.isMuted ? "bg-muted text-muted-foreground" : "bg-primary text-white"}`}>
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
  );
}
