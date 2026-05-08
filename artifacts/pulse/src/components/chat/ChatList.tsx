import React, { useState } from "react";
import { useGetChats, Chat } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Search, Pin, VolumeX, Users, Radio, Bot, HeadphonesIcon, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/contexts/AppContext";
import { StoriesBar } from "@/components/stories/StoriesBar";
import { useToast } from "@/hooks/use-toast";

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

  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0"
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
  const { selectedChatId, setSelectedChatId } = useAppContext();
  const { data: chats, isLoading } = useGetChats();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const openSupportChat = async () => {
    const uid = localStorage.getItem("pulse-user-id");
    if (!uid) return;
    try {
      const aiRes = await fetch("/api/users/search?q=deepseek_ai", { headers: { "x-user-id": uid } });
      const botUsers = aiRes.ok ? await aiRes.json() : [];
      if (!botUsers.length) { toast({ variant: "destructive", title: "Бот недоступен" }); return; }
      const bot = botUsers[0];
      const chatRes = await fetch("/api/chats/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": uid },
        body: JSON.stringify({ userId: bot.id }),
      });
      if (chatRes.ok) {
        const chat = await chatRes.json();
        setSelectedChatId(chat.id);
      }
    } catch {}
  };

  const filtered = chats?.filter((chat: Chat) => {
    if (!search) return true;
    const name =
      chat.type === "direct"
        ? ((chat.otherUser as any)?.displayName || chat.name || "")
        : (chat.name || "");
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const sorted = filtered?.slice().sort((a: Chat, b: Chat) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const aTime = a.lastMessage?.createdAt || (a as any).createdAt || "";
    const bTime = b.lastMessage?.createdAt || (b as any).createdAt || "";
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return (
    <div className="w-full md:w-80 lg:w-96 flex flex-col h-full bg-card border-r border-border">
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
              placeholder="Поиск чатов..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-none focus-visible:ring-primary"
            />
          </div>
        </div>
      </div>

      <div className="border-b border-border">
        <StoriesBar />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {/* Support chat shortcut */}
        {!search && (
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
            {search ? "Чаты не найдены" : "Нет чатов"}
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
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
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
                    <p className={`text-xs truncate ${chat.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {chat.type !== "direct" && lastMessage?.sender ? (
                        <span>
                          <span className="text-primary font-medium">
                            {(lastMessage.sender as any)?.displayName?.split(" ")[0]}:
                          </span>{" "}
                          {lastMsgText}
                        </span>
                      ) : lastMsgText}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      {chat.isMuted && <VolumeX size={12} className="text-muted-foreground" />}
                      {chat.unreadCount > 0 && (
                        <div className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
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
