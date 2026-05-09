import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetUserById,
  useGetContacts,
  useGetChats,
  useGetSentGifts,
  useGetReceivedGifts,
  useAddContact,
  useRemoveContact,
  getGetContactsQueryKey,
  getGetChatsQueryKey,
} from "@workspace/api-client-react";
import {
  ArrowLeft,
  MessageSquare,
  Phone,
  Video,
  Gift,
  UserPlus,
  UserMinus,
  MoreVertical,
  CheckCircle2,
  Clock,
  User,
  BadgeCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/contexts/AppContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  online: { color: "bg-green-500", label: "online", icon: <CheckCircle2 size={12} className="text-green-400" /> },
  away: { color: "bg-yellow-500", label: "away", icon: <Clock size={12} className="text-yellow-400" /> },
  offline: { color: "bg-gray-500", label: "offline", icon: <User size={12} className="text-gray-400" /> },
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors rounded-xl">
      <div className="w-36 shrink-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-0.5">{label}</div>
      <div className="text-sm text-foreground break-all">{value}</div>
    </div>
  );
}

function StatCard({ value, label, icon }: { value: number | string; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-1 py-4 px-2 bg-white/5 rounded-2xl border border-white/5">
      <div className="text-primary mb-0.5">{icon}</div>
      <div className="text-2xl font-black tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold text-center">{label}</div>
    </div>
  );
}

export default function UserProfile() {
  const params = useParams<{ userId: string }>();
  const userId = Number(params.userId);
  const [, setLocation] = useLocation();
  const { setSelectedChatId, startCall } = useAppContext();
  const queryClient = useQueryClient();
  const [isStartingChat, setIsStartingChat] = useState(false);

  const { data: user, isLoading } = useGetUserById(userId, { query: { enabled: !!userId } });
  const { data: contacts } = useGetContacts();
  const { data: chats } = useGetChats();
  const { data: sentGifts } = useGetSentGifts();
  const { data: receivedGifts } = useGetReceivedGifts();

  const addContact = useAddContact();
  const removeContact = useRemoveContact();

  const isContact = contacts?.some((c) => c.id === userId) ?? false;
  const isMe = userId === 1;

  const commonChats = chats?.filter((chat) => {
    if (chat.type === "direct") return chat.otherUser?.id === userId;
    return chat.members?.some((m: { userId: number }) => m.userId === userId);
  }) ?? [];

  const giftsToUser = sentGifts?.filter((g) => g.receiverId === userId) ?? [];
  const giftsFromUser = receivedGifts?.filter((g) => g.senderId === userId) ?? [];

  const handleAddContact = () => {
    addContact.mutate(
      { data: { userId } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetContactsQueryKey() }) }
    );
  };

  const handleRemoveContact = () => {
    removeContact.mutate(
      { contactId: userId },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetContactsQueryKey() }) }
    );
  };

  const handleMessage = async () => {
    setIsStartingChat(true);
    const uid = localStorage.getItem("pulse-user-id");
    try {
      const res = await fetch("/api/chats/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(uid ? { "x-user-id": uid } : {}) },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const chat = await res.json();
        queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
        setSelectedChatId(chat.id);
        setLocation("/");
      } else {
        setLocation("/");
      }
    } catch {
      setLocation("/");
    }
    setIsStartingChat(false);
  };

  const statusCfg = STATUS_CONFIG[user?.status || "offline"] || STATUS_CONFIG.offline;

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        <header className="h-16 border-b border-border flex items-center px-4 gap-3 bg-card/80 backdrop-blur-md shrink-0">
          <button onClick={() => window.history.back()} className="p-2 rounded-full hover:bg-secondary text-muted-foreground transition-colors">
            <ArrowLeft size={20} />
          </button>
          <Skeleton className="h-5 w-32" />
        </header>
        <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="w-28 h-28 rounded-full" />
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-48 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <User size={48} className="opacity-20" />
        <p className="font-medium">Пользователь не найден</p>
        <button onClick={() => window.history.back()} className="text-primary text-sm hover:underline">
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <header className="h-16 border-b border-border flex items-center px-4 gap-3 bg-card/80 backdrop-blur-md shrink-0 z-10">
        <button
          onClick={() => window.history.back()}
          className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-base truncate">{user.displayName}</h1>
            {(user as any).isVerified && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <circle cx="12" cy="12" r="12" fill="#00BCD4"/>
                <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{isMe ? "мой профиль" : statusCfg.label}</p>
        </div>
        {!isMe && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <MoreVertical size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isContact ? (
                <DropdownMenuItem onClick={handleRemoveContact} className="text-destructive focus:text-destructive">
                  <UserMinus size={15} className="mr-2" /> Удалить из контактов
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleAddContact}>
                  <UserPlus size={15} className="mr-2" /> Добавить в контакты
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-2xl mx-auto w-full p-4 md:p-6 space-y-4">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl overflow-hidden bg-card border border-border"
          >
            <div
              className="h-24 w-full relative"
              style={{ background: `linear-gradient(135deg, ${user.avatarColor || "#3B82F6"}66, ${user.avatarColor || "#3B82F6"}22)` }}
            >
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(circle at 20% 80%, ${user.avatarColor}88 0%, transparent 60%)` }} />
            </div>

            <div className="px-6 pb-6">
              <div className="flex items-end justify-between -mt-14 mb-4">
                <motion.div whileHover={{ scale: 1.05 }} className="relative">
                  <div
                    className="w-28 h-28 rounded-full flex items-center justify-center text-white text-4xl font-black overflow-hidden border-4 border-card shadow-xl"
                    style={{ backgroundColor: user.avatarColor || "#3B82F6" }}
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                    ) : (
                      user.displayName[0].toUpperCase()
                    )}
                  </div>
                  {!isMe && (
                    <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-[3px] border-card ${statusCfg.color}`} />
                  )}
                </motion.div>

                {!isMe && (
                  <div className="flex items-center gap-2 pb-1">
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleMessage}
                      disabled={isStartingChat}
                      className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-[0_0_15px_rgba(0,188,212,0.3)] hover:shadow-[0_0_25px_rgba(0,188,212,0.5)] transition-shadow disabled:opacity-60"
                      title="Send message"
                    >
                      <MessageSquare size={18} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => startCall(userId, null, "audio")}
                      className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
                      title="Voice call"
                    >
                      <Phone size={18} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => startCall(userId, null, "video")}
                      className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
                      title="Video call"
                    >
                      <Video size={18} />
                    </motion.button>
                    {isContact ? (
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleRemoveContact}
                        className="w-11 h-11 rounded-full bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        <UserMinus size={18} />
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAddContact}
                        disabled={addContact.isPending}
                        className="w-11 h-11 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 hover:bg-green-500/20 transition-colors"
                      >
                        <UserPlus size={18} />
                      </motion.button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-black">{user.displayName}</h2>
                  {(user as any).isVerified && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="12" fill="#00BCD4"/>
                      <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {isContact && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">Контакт</span>
                  )}
                  {isMe && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">Вы</span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm mt-0.5">@{user.username}</p>
                {user.bio && <p className="text-sm mt-3 leading-relaxed text-foreground/80">{user.bio}</p>}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-3xl bg-card border border-border overflow-hidden"
          >
            <div className="px-5 pt-4 pb-1">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Информация</h3>
            </div>
            <InfoRow label="Никнейм" value={`@${user.username}`} />
            {user.phoneNumber && <InfoRow label="Телефон" value={user.phoneNumber} />}
            {!isMe && <InfoRow label="Статус" value={statusCfg.label} />}
          </motion.div>

          {!isMe && (commonChats.length > 0 || giftsToUser.length > 0 || giftsFromUser.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-3xl bg-card border border-border p-4"
            >
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 px-1">С вами</h3>
              <div className="flex gap-3">
                {commonChats.length > 0 && <StatCard value={commonChats.length} label="Общих чатов" icon={<MessageSquare size={18} />} />}
                {giftsToUser.length > 0 && <StatCard value={giftsToUser.length} label="Подарков отдано" icon={<Gift size={18} />} />}
                {giftsFromUser.length > 0 && <StatCard value={giftsFromUser.length} label="Подарков получено" icon={<Gift size={18} />} />}
              </div>
            </motion.div>
          )}

          {!isMe && commonChats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-3xl bg-card border border-border overflow-hidden"
            >
              <div className="px-5 pt-4 pb-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  {commonChats.length} общих чата
                </h3>
              </div>
              <div className="p-3 space-y-1">
                {commonChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => { setSelectedChatId(chat.id); setLocation("/"); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ backgroundColor: chat.avatarColor || "#3B82F6" }}
                    >
                      {(chat.name || "C")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{chat.name || "Chat"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{chat.type}</p>
                    </div>
                    <MessageSquare size={15} className="text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {!isMe && (giftsToUser.length > 0 || giftsFromUser.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-3xl bg-card border border-border overflow-hidden"
            >
              <div className="px-5 pt-4 pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Обмен подарками</h3>
              </div>
              <div className="px-4 pb-4 flex flex-wrap gap-2">
                {[...giftsToUser, ...giftsFromUser].slice(0, 12).map((gift) => (
                  <motion.div
                    key={gift.id}
                    whileHover={{ scale: 1.15 }}
                    title={gift.giftItem?.name}
                    className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl cursor-default"
                  >
                    {gift.giftItem?.emoji}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
