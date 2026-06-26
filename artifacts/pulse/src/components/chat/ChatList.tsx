import React, { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useGetChats, Chat } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Search, Pin, VolumeX, Users, Radio, Bot, HeadphonesIcon, Bug,
  SquarePen, X, ChevronRight, Check, CheckCheck, Clock, ArrowLeft, Crown, Bookmark,
  FolderPlus, Folder, Trash2, FolderOpen, Plus } from "lucide-react";
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

type FolderKey = "all" | "unread" | "groups" | `folder:${number}`;

interface UserFolder {
  id: number;
  name: string;
  icon: string;
  sortOrder: number;
}

const SYSTEM_FOLDERS: { key: FolderKey; label: string }[] = [
  { key: "all",    label: "Все" },
  { key: "unread", label: "Новые" },
  { key: "groups", label: "Группы" },
];

const FOLDER_ICONS = ["📁","💬","⭐","🔥","👔","🏠","🎮","📚","💼","❤️","🎵","🌍","🏋️","🎨","💰","🤝","🐾","📰","✈️","🎉"];

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
    <span
      title="Администратор"
      className="inline-flex items-center justify-center shrink-0 rounded-full"
      style={{ width: 18, height: 18, background: "linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)", boxShadow: "0 0 8px rgba(245,158,11,0.65), 0 0 16px rgba(220,38,38,0.2)" }}
    >
      <svg width="10" height="9" viewBox="0 0 20 15" fill="white">
        <path d="M0 13h20v2H0zM1.5 11L4 3l5 5.5L10 0l1 8.5L16 3l2.5 8H1.5z"/>
      </svg>
    </span>
  );
}

function ChatAvatar({ chat, displayName }: { chat: Chat; displayName: string }) {
  const { userStatusMap } = useAppContext();
  const avatarColor =
    chat.type === "direct"
      ? ((chat.otherUser as any)?.avatarColor || chat.avatarColor || "#333")
      : (chat.avatarColor || "#3B82F6");

  const avatarUrl =
    chat.type === "direct"
      ? (chat.otherUser as any)?.avatarUrl
      : (chat as any).avatarUrl;

  const letter = displayName[0]?.toUpperCase() || "?";
  const otherUserId = chat.type === "direct" ? (chat.otherUser as any)?.id : null;
  const liveStatus = otherUserId ? (userStatusMap[otherUserId] ?? (chat.otherUser as any)?.status) : null;
  const status = chat.type === "direct" ? liveStatus : null;
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
        <span className="absolute inset-0 flex items-center justify-center">
          {chat.type === "channel" ? (
            <Radio size={24} className="text-white opacity-80" />
          ) : chat.type === "group" ? (
            <Users size={24} className="text-white opacity-80" />
          ) : (chat.otherUser as any)?.isBot ? (
            <Bot size={24} className="text-white opacity-80" />
          ) : letter}
        </span>
        {avatarUrl && (
          <img src={avatarUrl} alt={displayName} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
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
  const { selectedChatId, setSelectedChatId, typingByChat, typingTypeByChat, currentUserId } = useAppContext();
  const { t, lang } = useLanguage();
  const [, navigate] = useLocation();
  const { data: chats, isLoading } = useGetChats();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [folder, setFolder] = useState<FolderKey>("all");
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  // Custom folders state
  const [userFolders, setUserFolders] = useState<UserFolder[]>([]);
  const [folderChatIds, setFolderChatIds] = useState<Set<number>>(new Set());
  const [showFolderCreate, setShowFolderCreate] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderIcon, setNewFolderIcon] = useState("📁");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [contextMenuChat, setContextMenuChat] = useState<Chat | null>(null);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [folderTabLongPress, setFolderTabLongPress] = useState<number | null>(null);
  const folderTabPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/folders", { headers: getAuthHeaders() });
      if (res.ok) setUserFolders(await res.json());
    } catch {}
  }, []);

  const fetchFolderChatIds = useCallback(async (folderId: number) => {
    try {
      const res = await fetch(`/api/folders/${folderId}/chats`, { headers: getAuthHeaders() });
      if (res.ok) setFolderChatIds(new Set(await res.json()));
    } catch {}
  }, []);

  useEffect(() => { fetchFolders(); }, [fetchFolders]);

  useEffect(() => {
    if (folder.startsWith("folder:")) {
      fetchFolderChatIds(Number(folder.split(":")[1]));
    }
  }, [folder, fetchFolderChatIds]);

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ name: newFolderName.trim(), icon: newFolderIcon }),
      });
      if (res.ok) {
        const f = await res.json();
        setUserFolders(prev => [...prev, f]);
        setShowFolderCreate(false);
        setNewFolderName("");
        setNewFolderIcon("📁");
        toast({ title: "Папка создана", description: f.name });
      }
    } catch {}
    setCreatingFolder(false);
  };

  const deleteFolder = async (folderId: number) => {
    try {
      await fetch(`/api/folders/${folderId}`, { method: "DELETE", headers: getAuthHeaders() });
      setUserFolders(prev => prev.filter(f => f.id !== folderId));
      if (folder === `folder:${folderId}`) setFolder("all");
      toast({ title: "Папка удалена" });
    } catch {}
    setFolderTabLongPress(null);
  };

  const addChatToFolder = async (folderId: number, chatId: number) => {
    try {
      await fetch(`/api/folders/${folderId}/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ chatId }),
      });
      if (folder === `folder:${folderId}`) {
        setFolderChatIds(prev => new Set([...prev, chatId]));
      }
      toast({ title: "Чат добавлен в папку" });
    } catch {}
    setContextMenuChat(null);
    setShowFolderPicker(false);
  };

  const removeChatFromFolder = async () => {
    if (!contextMenuChat || !folder.startsWith("folder:")) return;
    const folderId = Number(folder.split(":")[1]);
    try {
      await fetch(`/api/folders/${folderId}/chats/${contextMenuChat.id}`, { method: "DELETE", headers: getAuthHeaders() });
      setFolderChatIds(prev => { const s = new Set(prev); s.delete(contextMenuChat.id); return s; });
      toast({ title: "Чат убран из папки" });
    } catch {}
    setContextMenuChat(null);
  };

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
    if ((chat as any).type === "saved") return false;
    if (folder === "unread") return (chat.unreadCount ?? 0) > 0;
    if (folder === "groups") return chat.type === "group" || chat.type === "channel";
    if (folder.startsWith("folder:")) return folderChatIds.has(chat.id);
    return true;
  });

  const sorted = filtered
    ?.filter((chat: Chat) => !(chat.otherUser as any)?.isBot)
    .slice().sort((a: Chat, b: Chat) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const aRaw = a.lastMessage?.createdAt || (a as any).createdAt;
      const bRaw = b.lastMessage?.createdAt || (b as any).createdAt;
      const aMs = aRaw ? new Date(aRaw).getTime() : 0;
      const bMs = bRaw ? new Date(bRaw).getTime() : 0;
      return (isNaN(bMs) ? 0 : bMs) - (isNaN(aMs) ? 0 : aMs);
    });

  return (
    <div className="relative overflow-hidden w-full md:w-[380px] lg:w-[420px] flex flex-col bg-background border-r border-border shrink-0 z-20" style={{ height: "var(--app-h, 100dvh)" }}>
      <AnimatePresence>
        {showGlobalSearch && (
          <GlobalSearch onClose={() => setShowGlobalSearch(false)} />
        )}
      </AnimatePresence>
      <div className="px-4 pb-3" style={{ paddingTop: "max(16px, env(safe-area-inset-top, 16px))" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #ea580c, #f97316)", boxShadow: "0 2px 10px rgba(234,88,12,0.45)" }}>
              <Crown size={15} className="text-white" />
            </div>
            <span className="text-[18px] font-black text-foreground tracking-tight">Aura</span>
          </div>
          <button
            onClick={openCreate}
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all shrink-0 hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, rgba(234,88,12,0.15), rgba(249,115,22,0.1))", border: "1px solid rgba(234,88,12,0.25)" }}
          >
            <SquarePen size={18} className="text-primary" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGlobalSearch(true)}
            className="relative flex-1 flex items-center h-11 bg-secondary/40 hover:bg-secondary/70 border border-border/50 hover:border-border rounded-2xl transition-all px-4 gap-3 text-left"
          >
            <Search className="text-muted-foreground w-4 h-4 shrink-0" />
            <span className="text-[14px] font-medium text-muted-foreground/60 flex-1">
              {t("chatlist.search")}
            </span>
          </button>
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-none pb-1 -mx-4 px-4" style={{ scrollPaddingInline: "16px" }}>
          {SYSTEM_FOLDERS.map(f => {
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

          {userFolders.map(f => {
            const key = `folder:${f.id}` as FolderKey;
            const isActive = folder === key;
            return (
              <button
                key={f.id}
                onClick={() => setFolder(key)}
                onTouchStart={() => {
                  folderTabPressTimer.current = setTimeout(() => setFolderTabLongPress(f.id), 600);
                }}
                onTouchEnd={() => { if (folderTabPressTimer.current) clearTimeout(folderTabPressTimer.current); }}
                onTouchMove={() => { if (folderTabPressTimer.current) clearTimeout(folderTabPressTimer.current); }}
                onContextMenu={e => { e.preventDefault(); setFolderTabLongPress(f.id); }}
                className={cn(
                  "shrink-0 px-3 py-2 rounded-[14px] text-sm font-bold transition-all whitespace-nowrap border flex items-center gap-1.5",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                )}
              >
                <span>{f.icon}</span>
                <span>{f.name}</span>
              </button>
            );
          })}

          <button
            onClick={() => { setNewFolderName(""); setNewFolderIcon("📁"); setShowFolderCreate(true); }}
            className="shrink-0 w-9 h-9 rounded-[14px] border border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
            title="Новая папка"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div className="px-2">
        <StoriesBar />
      </div>

      <div className="chat-list-scroll flex-1 overflow-y-auto overflow-x-hidden scrollbar-none mt-2 px-2 pb-28 md:pb-4">
        {folder === "all" && (
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
              {folder === "unread"
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
                ? (lastMessage as any).isDeleted
                  ? "🗑 Сообщение удалено"
                  : lastMessage.type === "text"
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
                  onContextMenu={e => { e.preventDefault(); setContextMenuChat(chat); }}
                  onTouchStart={() => { longPressTimer.current = setTimeout(() => setContextMenuChat(chat), 500); }}
                  onTouchEnd={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                  onTouchMove={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                  className={cn(
                    "w-full flex items-center gap-4 px-3 py-3 rounded-2xl transition-all text-left group border",
                    isSelected
                      ? "bg-primary/8 border-primary/20"
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
                            if ((lastMessage as any).isDelivered) return <CheckCheck size={14} strokeWidth={2.5} className="text-muted-foreground opacity-55" />;
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
                              {(() => {
                                const tt = typingTypeByChat[chat.id] || "text";
                                const name = typingByChat[chat.id][0];
                                const multi = typingByChat[chat.id].length > 1;
                                if (tt === "audio") return <span className="truncate">{multi ? "записывают" : `${name} записывает`} 🎤</span>;
                                if (tt === "photo") return <span className="truncate">{multi ? "отправляют" : `${name} отправляет`} 📷</span>;
                                if (tt === "video") return <span className="truncate">{multi ? "отправляют" : `${name} отправляет`} 🎬</span>;
                                return (
                                  <>
                                    <span className="truncate">{multi ? "печатают" : `${name} печатает`}</span>
                                    <span className="flex items-center gap-[3px] shrink-0">
                                      {[0, 0.15, 0.3].map((delay, i) => (
                                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary inline-block"
                                          style={{ animation: `typingBounce 1s ease-in-out infinite`, animationDelay: `${delay}s` }} />
                                      ))}
                                    </span>
                                  </>
                                );
                              })()}
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
                            chat.isMuted ? "bg-secondary text-muted-foreground border border-border" : "bg-primary text-primary-foreground shadow-[0_2px_10px_rgba(234,88,12,0.4)]"
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

      {createPortal(
        <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
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
                        className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-black disabled:opacity-50 hover:bg-primary/90 transition-all text-base shadow-[0_4px_14px_rgba(234,88,12,0.3)] hover:-translate-y-0.5 active:translate-y-0 disabled:shadow-none disabled:-translate-y-0"
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
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden relative"
                                  style={{ backgroundColor: user.avatarColor || "#333" }}
                                >
                                  <span className="absolute inset-0 flex items-center justify-center">{user.displayName[0].toUpperCase()}</span>
                                  {user.avatarUrl && <img src={user.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
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
                        className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-black disabled:opacity-50 hover:bg-primary/90 transition-all text-base shadow-[0_4px_14px_rgba(234,88,12,0.3)] hover:-translate-y-0.5 active:translate-y-0"
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
      </AnimatePresence>,
      document.body
      )}

      {/* Folder Create Modal */}
      {createPortal(
        <AnimatePresence>
        {showFolderCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowFolderCreate(false); }}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-card rounded-[32px] border border-border w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FolderPlus size={18} className="text-primary" />
                </div>
                <h2 className="font-black text-xl text-foreground flex-1">Новая папка</h2>
                <button onClick={() => setShowFolderCreate(false)} className="p-2 -mr-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Название</label>
                  <Input
                    autoFocus
                    placeholder="Например: Работа, Семья..."
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") createFolder(); }}
                    className="bg-secondary/50 border-transparent focus-visible:bg-card h-12 rounded-xl text-base font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Иконка</label>
                  <div className="grid grid-cols-10 gap-1.5">
                    {FOLDER_ICONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => setNewFolderIcon(emoji)}
                        className={cn(
                          "w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all border",
                          newFolderIcon === emoji
                            ? "bg-primary/20 border-primary/50 scale-110"
                            : "bg-secondary/50 border-transparent hover:bg-secondary"
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={createFolder}
                  disabled={!newFolderName.trim() || creatingFolder}
                  className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-black disabled:opacity-50 hover:bg-primary/90 transition-all shadow-[0_4px_14px_rgba(234,88,12,0.3)]"
                >
                  {creatingFolder ? "Создание..." : `Создать папку ${newFolderIcon}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body
      )}

      {/* Chat Context Menu (long-press) */}
      {createPortal(
        <AnimatePresence>
        {contextMenuChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-end justify-center"
            onClick={e => { if (e.target === e.currentTarget) { setContextMenuChat(null); setShowFolderPicker(false); } }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-card rounded-t-[32px] border-t border-x border-border w-full max-w-md overflow-hidden shadow-2xl pb-safe"
            >
              <div className="px-6 py-5 border-b border-border">
                <p className="font-black text-base text-foreground">
                  {contextMenuChat.type === "direct"
                    ? (contextMenuChat.otherUser as any)?.displayName || contextMenuChat.name
                    : contextMenuChat.name}
                </p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Действия с чатом</p>
              </div>

              {!showFolderPicker ? (
                <div className="p-3 space-y-1">
                  <button
                    onClick={() => setShowFolderPicker(true)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-secondary transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FolderOpen size={18} className="text-primary" />
                    </div>
                    <span className="font-bold text-[15px] text-foreground">Добавить в папку</span>
                  </button>
                  {folder.startsWith("folder:") && (
                    <button
                      onClick={removeChatFromFolder}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-secondary transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                        <Trash2 size={18} className="text-red-500" />
                      </div>
                      <span className="font-bold text-[15px] text-foreground">Убрать из папки</span>
                    </button>
                  )}
                  <button
                    onClick={() => { setContextMenuChat(null); setShowFolderPicker(false); }}
                    className="w-full flex items-center justify-center px-4 py-3.5 rounded-2xl hover:bg-secondary transition-colors text-muted-foreground font-bold text-[15px] mt-1"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <div className="p-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-3 py-2">Выберите папку</p>
                  {userFolders.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm font-medium">
                      Нет папок. Создайте папку сначала.
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {userFolders.map(f => (
                        <button
                          key={f.id}
                          onClick={() => addChatToFolder(f.id, contextMenuChat.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-secondary transition-colors text-left"
                        >
                          <span className="text-xl">{f.icon}</span>
                          <span className="font-bold text-[15px] text-foreground">{f.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setShowFolderPicker(false)}
                    className="w-full flex items-center justify-center px-4 py-3 rounded-2xl hover:bg-secondary transition-colors text-muted-foreground font-bold text-sm mt-1"
                  >
                    ← Назад
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body
      )}

      {/* Folder Tab Long-press: delete confirmation */}
      {createPortal(
        <AnimatePresence>
        {folderTabLongPress !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-end justify-center"
            onClick={e => { if (e.target === e.currentTarget) setFolderTabLongPress(null); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-card rounded-t-[32px] border-t border-x border-border w-full max-w-md overflow-hidden shadow-2xl pb-safe"
            >
              {(() => {
                const f = userFolders.find(x => x.id === folderTabLongPress);
                if (!f) return null;
                return (
                  <>
                    <div className="px-6 py-5 border-b border-border flex items-center gap-3">
                      <span className="text-2xl">{f.icon}</span>
                      <div>
                        <p className="font-black text-base text-foreground">{f.name}</p>
                        <p className="text-xs text-muted-foreground font-medium">Управление папкой</p>
                      </div>
                    </div>
                    <div className="p-3 space-y-1">
                      <button
                        onClick={() => deleteFolder(f.id)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-red-500/10 transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                          <Trash2 size={18} className="text-red-500" />
                        </div>
                        <span className="font-bold text-[15px] text-red-500">Удалить папку</span>
                      </button>
                      <button
                        onClick={() => setFolderTabLongPress(null)}
                        className="w-full flex items-center justify-center px-4 py-3.5 rounded-2xl hover:bg-secondary transition-colors text-muted-foreground font-bold text-[15px]"
                      >
                        Отмена
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}