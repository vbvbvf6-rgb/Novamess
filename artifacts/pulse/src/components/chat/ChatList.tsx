import React, { useState } from "react";
import { useGetChats, Chat } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { Search, Pin, VolumeX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/contexts/AppContext";
import { StoriesBar } from "@/components/stories/StoriesBar";

function VerifiedBadge() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="shrink-0 inline-block">
      <circle cx="12" cy="12" r="12" fill="#00BCD4"/>
      <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function ChatList() {
  const { selectedChatId, setSelectedChatId } = useAppContext();
  const { data: chats, isLoading } = useGetChats();
  const [search, setSearch] = useState("");

  const handleChatSelect = (chatId: number) => {
    setSelectedChatId(chatId);
  };

  const filtered = chats?.filter((chat: Chat) => {
    if (!search) return true;
    const name = chat.type === "direct"
      ? (chat.otherUser?.displayName || chat.name || "")
      : (chat.name || "");
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="w-full md:w-80 lg:w-96 flex flex-col h-full bg-card border-r border-border">
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="Search chats..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-none focus-visible:ring-primary"
          />
        </div>
      </div>
      
      <div className="border-b border-border">
        <StoriesBar />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
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
        ) : filtered?.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            {search ? "No chats found" : "No chats yet"}
          </div>
        ) : (
          filtered?.map((chat: Chat) => {
            const isSelected = selectedChatId === chat.id;
            const lastMessage = chat.lastMessage;
            const displayName = chat.type === "direct"
              ? (chat.otherUser?.displayName || chat.name || "Unknown")
              : (chat.name || "Group");
            const avatarColor = chat.type === "direct"
              ? (chat.otherUser?.avatarColor || chat.avatarColor || "#333")
              : (chat.avatarColor || "#333");
            const isVerified = chat.type === "direct" && (chat.otherUser as any)?.isVerified;
            
            return (
              <button
                key={chat.id}
                onClick={() => handleChatSelect(chat.id)}
                className={`w-full flex items-center gap-3 p-3 transition-colors text-left hover:bg-secondary ${
                  isSelected ? "bg-secondary" : ""
                }`}
              >
                <div className="relative shrink-0">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {chat.avatarUrl ? (
                      <img src={chat.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      displayName[0].toUpperCase()
                    )}
                  </div>
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
                      <h3 className="font-semibold truncate text-sm">{displayName}</h3>
                      {isVerified && <VerifiedBadge />}
                    </div>
                    {lastMessage && (
                      <span className="text-xs text-muted-foreground shrink-0 ml-1">
                        {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: false }).replace("about ", "")}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <p className={`text-xs truncate ${chat.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {lastMessage ? (
                        lastMessage.type === "text" ? lastMessage.text :
                        lastMessage.type === "image" ? "📷 Photo" :
                        lastMessage.type === "gift" ? "🎁 Gift" :
                        `[${lastMessage.type}]`
                      ) : "No messages"}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      {chat.isMuted && <VolumeX size={12} className="text-muted-foreground" />}
                      {chat.unreadCount > 0 && (
                        <div className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                          {chat.unreadCount}
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
