import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, MessageSquare, ChevronRight, Hash, Users, Radio,
  UserPlus, Check, Loader2, User, ArrowLeft, Lock
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppContext } from "@/contexts/AppContext";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { getGetChatsQueryKey, useGetChats, Chat } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface MessageResult {
  id: number;
  chat_id: number;
  sender_id: number;
  text: string;
  created_at: string;
  display_name: string;
  avatar_color: string;
  avatar_url?: string;
  chat_name?: string;
  chat_type: string;
  other_user_name?: string;
}

interface PublicChat {
  id: number;
  name: string;
  type: "group" | "channel";
  avatar_url?: string;
  avatar_color?: string;
  description?: string;
  member_count: number;
  is_member: boolean;
}

interface UserResult {
  id: number;
  username: string;
  displayName: string;
  display_name?: string;
  avatarUrl?: string;
  avatar_url?: string;
  avatarColor?: string;
  avatar_color?: string;
}

interface GlobalSearchProps {
  onClose: () => void;
  initialQuery?: string;
}

function getAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("pulse-token");
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

function highlight(text: string, q: string) {
  if (!q.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/25 text-primary rounded px-0.5 not-italic">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function MemberCount({ count }: { count: number }) {
  if (count >= 1_000_000) return <>{(count / 1_000_000).toFixed(1)}M подписчиков</>;
  if (count >= 1000) return <>{(count / 1000).toFixed(1)}K подписчиков</>;
  return <>{count} подписчиков</>;
}

function Avatar({
  name, color, url, size = 12, radius = "rounded-[16px]", icon
}: {
  name: string; color?: string; url?: string; size?: number; radius?: string; icon?: React.ReactNode
}) {
  return (
    <div
      className={`w-${size} h-${size} ${radius} flex items-center justify-center text-white font-bold overflow-hidden shrink-0 relative`}
      style={{ backgroundColor: color || "#3B82F6", width: size * 4, height: size * 4 }}
    >
      <span className="absolute inset-0 flex items-center justify-center">
        {icon ? icon : <span className="text-base font-black">{name?.[0]?.toUpperCase() || "?"}</span>}
      </span>
      {url && (
        <img src={url} alt={name} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
      )}
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-4 pt-4 pb-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
      {label}
    </div>
  );
}

export function GlobalSearch({ onClose, initialQuery = "" }: GlobalSearchProps) {
  const { lang } = useLanguage();
  const { setSelectedChatId, currentUserId } = useAppContext();
  const queryClient = useQueryClient();
  const { data: myChats } = useGetChats();

  const [query, setQuery] = useState(initialQuery);
  const [globalChats, setGlobalChats] = useState<PublicChat[]>([]);
  const [msgResults, setMsgResults] = useState<MessageResult[]>([]);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [openingDmId, setOpeningDmId] = useState<number | null>(null);
  const [previewChat, setPreviewChat] = useState<PublicChat | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const trimmed = q.trim();

      const discoverUrl = trimmed.length >= 2
        ? `/api/chats/discover?q=${encodeURIComponent(trimmed)}`
        : `/api/chats/discover`;
      const discoverRes = await fetch(discoverUrl, { headers: getAuthHeaders() });
      if (discoverRes.ok) setGlobalChats(await discoverRes.json());
      else setGlobalChats([]);

      if (trimmed.length >= 2) {
        const [msgRes, userRes] = await Promise.all([
          fetch(`/api/messages/search?q=${encodeURIComponent(trimmed)}&limit=20`, { headers: getAuthHeaders() }),
          fetch(`/api/users/search?q=${encodeURIComponent(trimmed)}&limit=20`, { headers: getAuthHeaders() }),
        ]);
        if (msgRes.ok) setMsgResults(await msgRes.json());
        else setMsgResults([]);
        if (userRes.ok) {
          const data = await userRes.json();
          const list: UserResult[] = data.users || data || [];
          setUserResults(list.filter(u => u.id !== currentUserId));
        } else {
          setUserResults([]);
        }
      } else {
        setMsgResults([]);
        setUserResults([]);
      }
    } catch {}
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runSearch]);

  const doJoin = async (chat: PublicChat) => {
    const isMember = chat.is_member === true || (chat.is_member as any) === "true" || (chat.is_member as any) === 1;
    if (isMember) {
      setSelectedChatId(chat.id);
      setPreviewChat(null);
      onClose();
      return;
    }
    setJoiningId(chat.id);
    try {
      const token = sessionStorage.getItem("pulse-token");
      const res = await fetch(`/api/chats/${chat.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        setGlobalChats(prev => prev.map(c =>
          c.id === chat.id ? { ...c, is_member: true, member_count: c.member_count + 1 } : c
        ));
        queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
        setPreviewChat(null);
        setTimeout(() => { setSelectedChatId(chat.id); onClose(); }, 400);
      }
    } catch {}
    setJoiningId(null);
  };

  const handleJoin = (chat: PublicChat) => {
    const isMember = chat.is_member === true || (chat.is_member as any) === "true" || (chat.is_member as any) === 1;
    if (isMember) {
      setSelectedChatId(chat.id);
      onClose();
      return;
    }
    // Show preview modal centered in viewport
    setPreviewChat(chat);
  };

  const handleOpenDm = async (user: UserResult) => {
    setOpeningDmId(user.id);
    try {
      const token = sessionStorage.getItem("pulse-token");
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ type: "direct", participantIds: [user.id] }),
      });
      if (res.ok) {
        const chat = await res.json();
        queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
        setSelectedChatId(chat.id);
        onClose();
      }
    } catch {}
    setOpeningDmId(null);
  };

  const filteredMyChats = (myChats || []).filter((chat: Chat) => {
    if (!query.trim()) return false;
    const name = chat.type === "direct"
      ? ((chat.otherUser as any)?.displayName || chat.name || "")
      : (chat.name || "");
    return name.toLowerCase().includes(query.toLowerCase());
  }).slice(0, 5);

  const globalNotInMy = globalChats.filter(gc => {
    const alreadyIn = (myChats || []).some((mc: Chat) => mc.id === gc.id);
    if (alreadyIn) return false;
    const isMember = gc.is_member === true || (gc.is_member as any) === "true" || (gc.is_member as any) === 1;
    if (isMember) return true;
    return gc.type === "channel";
  });

  const hasAnyResults =
    filteredMyChats.length > 0 ||
    globalChats.length > 0 ||
    userResults.length > 0 ||
    msgResults.length > 0;

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="absolute inset-0 z-50 bg-background flex flex-col"
    >
      {/* Search bar */}
      <div
        className="px-3 py-3 border-b border-border shrink-0 flex items-center gap-2"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top, 12px))" }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск"
            className="w-full pl-9 pr-9 py-2.5 bg-secondary rounded-xl border-0 focus:outline-none focus:ring-1 focus:ring-primary text-sm transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground w-5 h-5 flex items-center justify-center rounded-full hover:bg-border transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {loading && (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground text-sm">
            <Loader2 size={16} className="animate-spin" />
            Поиск...
          </div>
        )}

        {!loading && !query.trim() && (
          <>
            {globalChats.length > 0 && (
              <>
                <SectionHeader label="Популярные каналы" />
                {globalChats.slice(0, 8).map(chat => (
                  <GlobalChatRow key={chat.id} chat={chat} query="" joiningId={joiningId} onJoin={handleJoin} />
                ))}
              </>
            )}
            {globalChats.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                <Search size={44} className="opacity-10" />
                <p className="text-sm font-medium">Найди людей, каналы и группы</p>
                <p className="text-xs opacity-60">Начни вводить название или @username</p>
              </div>
            )}
          </>
        )}

        {!loading && query.trim() && !hasAnyResults && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Search size={44} className="opacity-10" />
            <p className="text-sm font-medium">Ничего не найдено</p>
            <p className="text-xs opacity-60">По запросу «{query}»</p>
          </div>
        )}

        {!loading && query.trim() && (
          <>
            {/* My chats section */}
            {filteredMyChats.length > 0 && (
              <>
                <SectionHeader label="Ваши чаты" />
                {filteredMyChats.map((chat: Chat) => {
                  const name = chat.type === "direct"
                    ? ((chat.otherUser as any)?.displayName || chat.name || "")
                    : (chat.name || "");
                  const color = chat.type === "direct"
                    ? ((chat.otherUser as any)?.avatarColor || chat.avatarColor || "#555")
                    : (chat.avatarColor || "#3B82F6");
                  const url = chat.type === "direct"
                    ? (chat.otherUser as any)?.avatarUrl
                    : (chat as any).avatarUrl;
                  return (
                    <button
                      key={chat.id}
                      onClick={() => { setSelectedChatId(chat.id); onClose(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors text-left"
                    >
                      <Avatar
                        name={name}
                        color={color}
                        url={url}
                        size={12}
                        radius="rounded-[16px]"
                        icon={
                          chat.type === "channel" ? <Radio size={20} className="text-white opacity-80" /> :
                          chat.type === "group" ? <Users size={20} className="text-white opacity-80" /> : undefined
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {highlight(name, query)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {chat.type === "channel" ? "Канал" : chat.type === "group" ? "Группа" : "Личное сообщение"}
                        </p>
                      </div>
                      <ChevronRight size={15} className="text-muted-foreground/40 shrink-0" />
                    </button>
                  );
                })}
              </>
            )}

            {/* People / Users */}
            {userResults.length > 0 && (
              <>
                <SectionHeader label="Люди" />
                {userResults.slice(0, 5).map(user => {
                  const name = user.displayName || user.display_name || user.username;
                  const color = user.avatarColor || user.avatar_color;
                  const url = user.avatarUrl || user.avatar_url;
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleOpenDm(user)}
                      disabled={openingDmId === user.id}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors text-left"
                    >
                      <Avatar name={name} color={color} url={url} size={12} radius="rounded-full" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {highlight(name, query)}
                        </p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                      {openingDmId === user.id ? (
                        <Loader2 size={15} className="animate-spin text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight size={15} className="text-muted-foreground/40 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </>
            )}

            {/* Global channels/groups */}
            {globalChats.length > 0 && (
              <>
                <SectionHeader label="Глобальный поиск" />
                {globalChats.map(chat => (
                  <GlobalChatRow key={chat.id} chat={chat} query={query} joiningId={joiningId} onJoin={handleJoin} />
                ))}
              </>
            )}

            {/* Messages */}
            {msgResults.length > 0 && (
              <>
                <SectionHeader label={`Сообщения · ${msgResults.length}`} />
                {msgResults.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedChatId(r.chat_id); onClose(); }}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors text-left"
                  >
                    <Avatar
                      name={r.display_name}
                      color={r.avatar_color}
                      url={r.avatar_url}
                      size={11}
                      radius="rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-0.5">
                        <span className="text-sm font-semibold truncate text-foreground">
                          {r.display_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(r.created_at), {
                            addSuffix: true,
                            locale: lang === "ru" ? ru : undefined,
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate leading-snug">
                        {highlight(r.text || "", query)}
                      </p>
                      {(r.chat_name || r.other_user_name) && (
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                          <MessageSquare size={10} />
                          {r.chat_type === "direct" ? r.other_user_name : r.chat_name}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </motion.div>

    {/* Channel join preview — rendered via portal so it appears centered in full viewport */}
      {createPortal(
        <AnimatePresence>
          {previewChat && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
                onClick={() => setPreviewChat(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 32 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="fixed inset-0 z-[10000] flex items-center justify-center p-6 pointer-events-none"
              >
                <div className="pointer-events-auto w-full max-w-sm bg-card rounded-3xl shadow-2xl overflow-hidden border border-border">
                  {/* Avatar header */}
                  <div className="flex flex-col items-center pt-8 pb-5 px-6 gap-3">
                    <div
                      className="w-20 h-20 rounded-[22px] flex items-center justify-center overflow-hidden shadow-lg"
                      style={{ backgroundColor: previewChat.avatar_color || "#3B82F6" }}
                    >
                      {previewChat.avatar_url ? (
                        <img src={previewChat.avatar_url} alt={previewChat.name} className="w-full h-full object-cover" />
                      ) : previewChat.type === "channel" ? (
                        <Radio size={34} className="text-white opacity-90" />
                      ) : (
                        <Users size={34} className="text-white opacity-90" />
                      )}
                    </div>
                    <div className="text-center">
                      <h2 className="text-xl font-black text-foreground">{previewChat.name}</h2>
                      <p className="text-sm text-muted-foreground font-medium mt-0.5">
                        {previewChat.type === "channel" ? "Канал" : "Группа"} · <MemberCount count={previewChat.member_count} />
                      </p>
                      {previewChat.description && (
                        <p className="text-sm text-foreground/70 mt-2 leading-snug">{previewChat.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="px-5 pb-6 flex flex-col gap-2">
                    <button
                      onClick={() => doJoin(previewChat)}
                      disabled={joiningId === previewChat.id}
                      className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-black text-[15px] hover:bg-primary/90 transition-all shadow-[0_4px_20px_rgba(234,88,12,0.3)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                      {joiningId === previewChat.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <><UserPlus size={18} /> Вступить в {previewChat.type === "channel" ? "канал" : "группу"}</>
                      )}
                    </button>
                    <button
                      onClick={() => setPreviewChat(null)}
                      className="w-full py-3 rounded-2xl text-muted-foreground font-semibold text-sm hover:text-foreground transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

function GlobalChatRow({
  chat, query, joiningId, onJoin,
}: {
  chat: PublicChat;
  query: string;
  joiningId: number | null;
  onJoin: (chat: PublicChat) => void;
}) {
  const isJoining = joiningId === chat.id;
  const isMember = chat.is_member === true || (chat.is_member as any) === "true" || (chat.is_member as any) === 1;
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors cursor-pointer"
      onClick={() => onJoin(chat)}
    >
      <div
        className="w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0 overflow-hidden"
        style={{ backgroundColor: chat.avatar_color || "#3B82F6" }}
      >
        {chat.avatar_url ? (
          <img src={chat.avatar_url} alt={chat.name} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        ) : chat.type === "channel" ? (
          <Radio size={22} className="text-white opacity-80" />
        ) : (
          <Users size={22} className="text-white opacity-80" />
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-semibold text-sm text-foreground truncate">
            {highlight(chat.name, query)}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
            chat.type === "channel"
              ? "bg-primary/10 text-primary"
              : "bg-blue-500/10 text-blue-400"
          }`}>
            {chat.type === "channel" ? "Канал" : "Группа"}
          </span>
        </div>
        {chat.description && (
          <p className="text-xs text-muted-foreground truncate">{chat.description}</p>
        )}
        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
          <MemberCount count={chat.member_count} />
        </p>
      </div>

      <button
        onClick={e => { e.stopPropagation(); onJoin(chat); }}
        disabled={isJoining}
        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
          isMember
            ? "bg-secondary text-foreground hover:bg-secondary/80"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {isJoining ? (
          <Loader2 size={13} className="animate-spin" />
        ) : isMember ? (
          <><Check size={12} /> Открыть</>
        ) : (
          <><UserPlus size={12} /> Вступить</>
        )}
      </button>
    </div>
  );
}
