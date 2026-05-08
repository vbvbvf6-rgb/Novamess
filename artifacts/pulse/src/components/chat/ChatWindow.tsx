import React, { useRef, useEffect, useState } from "react";
import { useGetChatById, useGetMessages, getGetMessagesQueryKey, useInitiateCall, useMarkChatAsRead, useUpdateChat, getGetChatsQueryKey } from "@workspace/api-client-react";
import { Phone, Video, MoreVertical, ArrowLeft, Search, BellOff, Bell, Pin, PinOff, User, Trash2 } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatWindowProps {
  chatId: number;
}

export function ChatWindow({ chatId }: ChatWindowProps) {
  const { setSelectedChatId, setActiveCall } = useAppContext();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: chat, isLoading: isChatLoading } = useGetChatById(chatId, { query: { enabled: !!chatId } });
  const { data: messages, isLoading: isMessagesLoading } = useGetMessages({ chatId }, { query: { enabled: !!chatId } });
  const initiateCall = useInitiateCall();
  const markAsRead = useMarkChatAsRead();
  const updateChat = useUpdateChat();
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (chatId) {
      markAsRead.mutate({ chatId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
        }
      });
    }
  }, [chatId]);

  const handleStartCall = (type: "audio" | "video") => {
    if (!chat?.otherUser?.id) return;
    initiateCall.mutate(
      { data: { calleeId: chat.otherUser.id, chatId, type } },
      {
        onSuccess: (call) => {
          setActiveCall(call);
        }
      }
    );
  };

  const handleToggleMute = () => {
    if (!chat) return;
    updateChat.mutate({ chatId, data: { isMuted: !chat.isMuted } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() })
    });
  };

  const handleTogglePin = () => {
    if (!chat) return;
    fetch(`/api/chats/${chatId}/pin`, { method: "PUT" }).then(() => {
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
    });
  };

  const openProfile = () => {
    if (chat?.type === "direct" && chat.otherUser?.id) {
      setLocation(`/user/${chat.otherUser.id}`);
    }
  };

  if (isChatLoading) {
    return <div className="flex-1 flex flex-col items-center justify-center"><Skeleton className="w-32 h-32 rounded-full mb-4" /><Skeleton className="h-6 w-48" /></div>;
  }

  if (!chat) return <div className="flex-1 flex items-center justify-center">Chat not found</div>;

  const displayName = chat.type === "direct" ? (chat.otherUser?.displayName || chat.name || "Chat") : (chat.name || "Group");
  const avatarColor = chat.type === "direct" ? (chat.otherUser?.avatarColor || chat.avatarColor || "#333") : (chat.avatarColor || "#333");
  const isVerified = chat.type === "direct" && (chat.otherUser as any)?.isVerified;

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center px-4 justify-between bg-card/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground shrink-0" onClick={() => setSelectedChatId(null)}>
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
            <div className="flex items-center gap-1">
              <h2 className="font-semibold text-sm leading-tight truncate">{displayName}</h2>
              {isVerified && (
                <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="12" fill="#00BCD4"/>
                  <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {chat.type === "direct" && chat.otherUser ? (
                <span className={chat.otherUser.status === "online" ? "text-green-500" : ""}>
                  {chat.otherUser.status === "online" ? "online" : chat.otherUser.statusText || chat.otherUser.status}
                </span>
              ) : `${chat.members?.length || 0} members`}
            </p>
          </button>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground shrink-0">
          {chat.type === "direct" && (
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
            <DropdownMenuContent align="end" className="w-52">
              {chat.type === "direct" && chat.otherUser?.id && (
                <DropdownMenuItem onClick={openProfile}>
                  <User size={16} className="mr-2 text-primary" />
                  View Profile
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Search size={16} className="mr-2 text-muted-foreground" />
                Search Messages
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleToggleMute}>
                {chat.isMuted ? (
                  <><Bell size={16} className="mr-2 text-green-500" />Unmute</>
                ) : (
                  <><BellOff size={16} className="mr-2 text-orange-500" />Mute</>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleTogglePin}>
                {chat.isPinned ? (
                  <><PinOff size={16} className="mr-2 text-muted-foreground" />Unpin</>
                ) : (
                  <><Pin size={16} className="mr-2 text-blue-500" />Pin Chat</>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <Trash2 size={16} className="mr-2" />
                Clear Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

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
        ) : messages?.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No messages yet. Send a message to start the conversation!
          </div>
        ) : (
          messages?.slice().reverse().map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-card/80 backdrop-blur-md border-t border-border z-10 shrink-0">
        <ChatInput chatId={chatId} />
      </div>
    </div>
  );
}
