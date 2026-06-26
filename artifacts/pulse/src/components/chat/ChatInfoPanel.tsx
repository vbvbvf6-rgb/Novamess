import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Camera, UserPlus, Trash2, Search, Users, Radio, Copy, Check,
  RefreshCw, Shield, ShieldOff, LogOut, Bell, BellOff, Globe, Lock,
  Clock, MessageSquare, ChevronDown, Link, Crown, Settings, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { getGetChatsQueryKey } from "@workspace/api-client-react";
import { useAppContext } from "@/contexts/AppContext";

function compressAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("no ctx")); return; }
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2;
      const sy = (img.height - s) / 2;
      ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

interface Member {
  userId: number;
  role: string;
  user: {
    id: number;
    username: string;
    displayName: string;
    avatarColor: string;
    avatarUrl?: string | null;
    hasPrime?: boolean;
  };
}

interface UserResult {
  id: number;
  username: string;
  displayName: string;
  avatarColor?: string;
  avatarUrl?: string | null;
}

interface ChatInfoPanelProps {
  chatId: number;
  chatType?: "group" | "channel";
  displayName?: string;
  avatarUrl?: string | null;
  avatarColor?: string;
  description?: string | null;
  slowMode?: number | null;
  whoCanSend?: string | null;
  isPublic?: boolean | null;
  isMuted?: boolean;
  onClose: () => void;
  onNameChanged?: (name: string) => void;
  onDeleteChat?: () => void;
  onToggleMute?: () => void;
}

function getAuthHeaders(json?: boolean): Record<string, string> {
  const token = sessionStorage.getItem("pulse-token");
  const base: Record<string, string> = token ? { "Authorization": `Bearer ${token}` } : {};
  return json ? { "Content-Type": "application/json", ...base } : base;
}

const SLOW_MODE_OPTIONS = [
  { value: 0, label: "Выкл" },
  { value: 10, label: "10 сек" },
  { value: 30, label: "30 сек" },
  { value: 60, label: "1 мин" },
  { value: 300, label: "5 мин" },
  { value: 900, label: "15 мин" },
  { value: 3600, label: "1 час" },
];

function AvatarCircle({ name, color, url, size = 20, type }: {
  name: string; color?: string; url?: string | null; size?: number; type?: string;
}) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold overflow-hidden shrink-0 relative"
      style={{ width: size, height: size, backgroundColor: color || "#3B82F6", fontSize: size * 0.35 }}
    >
      <span className="absolute inset-0 flex items-center justify-center">
        {type === "channel" ? <Radio size={size * 0.45} /> : type === "group" ? <Users size={size * 0.45} /> : name?.[0]?.toUpperCase() || "?"}
      </span>
      {url && <img src={url} alt={name} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
    </div>
  );
}

type Tab = "basic" | "permissions" | "members";

export function ChatInfoPanel({
  chatId, chatType, displayName, avatarUrl, avatarColor, description,
  slowMode, whoCanSend, isPublic, isMuted, onClose, onNameChanged, onDeleteChat, onToggleMute,
}: ChatInfoPanelProps) {
  const queryClient = useQueryClient();
  const { currentUserId, setSelectedChatId } = useAppContext();
  const [tab, setTab] = useState<Tab>("basic");

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [editName, setEditName] = useState(displayName || "");
  const [editDesc, setEditDesc] = useState(description || "");
  const [savingName, setSavingName] = useState(false);
  const [savingDesc, setSavingDesc] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(avatarUrl || null);
  const [addSearch, setAddSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resettingInvite, setResettingInvite] = useState(false);
  const [localSlowMode, setLocalSlowMode] = useState(slowMode ?? 0);
  const [localWhoCanSend, setLocalWhoCanSend] = useState(whoCanSend || "all");
  const [localIsPublic, setLocalIsPublic] = useState(isPublic ?? false);
  const [localIsMuted, setLocalIsMuted] = useState(isMuted ?? false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myMember = members.find(m => m.userId === currentUserId);
  const isAdmin = myMember?.role === "owner" || myMember?.role === "admin";
  const isOwner = myMember?.role === "owner";

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/members`, { headers: getAuthHeaders() });
      if (res.ok) setMembers(await res.json());
    } catch {}
    setLoadingMembers(false);
  }, [chatId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const fetchInviteLink = useCallback(async () => {
    if (!isAdmin && !loadingMembers) return;
    setLoadingInvite(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/invite`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setInviteLink(data.link);
      }
    } catch {}
    setLoadingInvite(false);
  }, [chatId, isAdmin, loadingMembers]);

  useEffect(() => {
    if (!loadingMembers && isAdmin) fetchInviteLink();
  }, [loadingMembers, isAdmin, fetchInviteLink]);

  const patchChat = async (fields: Record<string, unknown>) => {
    await fetch(`/api/chats/${chatId}`, {
      method: "PUT",
      headers: getAuthHeaders(true),
      body: JSON.stringify(fields),
    });
    queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}`] });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressAvatar(file);
      setAvatarPreview(compressed);
      await patchChat({ avatarUrl: compressed });
    } catch {}
    e.target.value = "";
  };

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === displayName) return;
    setSavingName(true);
    await patchChat({ name: trimmed });
    onNameChanged?.(trimmed);
    setSavingName(false);
  };

  const handleSaveDesc = async () => {
    if (editDesc === (description || "")) return;
    setSavingDesc(true);
    await patchChat({ description: editDesc });
    setSavingDesc(false);
  };

  const handleSlowModeChange = async (val: number) => {
    setLocalSlowMode(val);
    await patchChat({ slowMode: val });
  };

  const handleWhoCanSendChange = async (val: string) => {
    setLocalWhoCanSend(val);
    await patchChat({ whoCanSend: val });
  };

  const handleIsPublicChange = async (val: boolean) => {
    setLocalIsPublic(val);
    await patchChat({ isPublic: val });
  };

  const handleMuteToggle = async () => {
    const next = !localIsMuted;
    setLocalIsMuted(next);
    await patchChat({ isMuted: next });
    onToggleMute?.();
  };

  const handleCopyInvite = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const handleResetInvite = async () => {
    setResettingInvite(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/invite/reset`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setInviteLink(data.link);
      }
    } catch {}
    setResettingInvite(false);
  };

  const searchUsers = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}&limit=20`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const memberIds = new Set(members.map(m => m.userId));
        setSearchResults((data.users || data || []).filter((u: UserResult) => !memberIds.has(u.id)));
      }
    } catch {}
    setSearching(false);
  };

  const onAddSearchChange = (val: string) => {
    setAddSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => searchUsers(val), 300);
  };

  const handleAddMember = async (user: UserResult) => {
    await fetch(`/api/chats/${chatId}/members`, {
      method: "POST",
      headers: getAuthHeaders(true),
      body: JSON.stringify({ userId: user.id, role: "member" }),
    });
    await fetchMembers();
    setSearchResults(prev => prev.filter(u => u.id !== user.id));
    queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
  };

  const handleRemoveMember = async (userId: number) => {
    await fetch(`/api/chats/${chatId}/members/${userId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    setMembers(prev => prev.filter(m => m.userId !== userId));
    queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
  };

  const handlePromoteMember = async (userId: number, newRole: "admin" | "member") => {
    await fetch(`/api/chats/${chatId}/members/${userId}`, {
      method: "PATCH",
      headers: getAuthHeaders(true),
      body: JSON.stringify({ role: newRole }),
    });
    setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role: newRole } : m));
    queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
  };

  const handleLeaveChat = async () => {
    await fetch(`/api/chats/${chatId}/leave`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
    setSelectedChatId(null);
    onClose();
  };

  const handleDeleteChat = async () => {
    await fetch(`/api/chats/${chatId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
    setSelectedChatId(null);
    onDeleteChat?.();
    onClose();
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "basic", label: "Основное", icon: <Info size={13} /> },
    { id: "permissions", label: "Права", icon: <Shield size={13} /> },
    { id: "members", label: `Участники${members.length ? ` · ${members.length}` : ""}`, icon: <Users size={13} /> },
  ];

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute top-0 right-0 h-full w-full sm:w-[340px] bg-card border-l border-border flex flex-col z-20 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          {chatType === "channel"
            ? <Radio size={15} className="text-primary" />
            : <Users size={15} className="text-primary" />}
          <h3 className="font-semibold text-sm">
            {chatType === "channel" ? "Настройки канала" : "Настройки группы"}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold transition-colors ${
              tab === t.id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence mode="wait">
          {/* ── BASIC TAB ── */}
          {tab === "basic" && (
            <motion.div
              key="basic"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
              className="p-4 space-y-4"
            >
              {/* Avatar */}
              {isAdmin && (
                <div className="flex flex-col items-center pt-2 pb-4 border-b border-border">
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl overflow-hidden ring-2 ring-border group-hover:ring-primary/50 transition-all relative"
                      style={{ backgroundColor: avatarColor }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center">
                        {chatType === "channel" ? <Radio size={28} /> : (displayName || "G")[0]?.toUpperCase() || "G"}
                      </span>
                      {avatarPreview && <img src={avatarPreview} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
                    </div>
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                      <Camera size={22} className="text-white" />
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  <p className="text-xs text-muted-foreground mt-2">Нажмите для смены фото</p>
                </div>
              )}

              {/* Name */}
              {isAdmin && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                    {chatType === "channel" ? "Название канала" : "Название группы"}
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={handleSaveName}
                      onKeyDown={e => e.key === "Enter" && handleSaveName()}
                      className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                    {savingName && <span className="text-xs text-muted-foreground self-center">...</span>}
                  </div>
                </div>
              )}

              {/* Description */}
              {isAdmin && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Описание</p>
                  <textarea
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    onBlur={handleSaveDesc}
                    rows={3}
                    placeholder="Расскажите о группе или канале..."
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                  {savingDesc && <p className="text-[11px] text-muted-foreground mt-1">Сохранение...</p>}
                </div>
              )}

              {!isAdmin && description && (
                <div className="bg-secondary/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                </div>
              )}

              {/* Public/Private toggle */}
              {isAdmin && chatType && (
                <div className="flex items-center justify-between bg-secondary/50 rounded-xl px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    {localIsPublic ? <Globe size={16} className="text-primary" /> : <Lock size={16} className="text-muted-foreground" />}
                    <div>
                      <p className="text-sm font-medium">{localIsPublic ? "Публичный" : "Приватный"}</p>
                      <p className="text-[11px] text-muted-foreground">{localIsPublic ? "Виден в поиске" : "Только по ссылке"}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleIsPublicChange(!localIsPublic)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${localIsPublic ? "bg-primary" : "bg-border"}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${localIsPublic ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                </div>
              )}

              {/* Mute toggle */}
              <div className="flex items-center justify-between bg-secondary/50 rounded-xl px-3 py-3">
                <div className="flex items-center gap-2.5">
                  {localIsMuted ? <BellOff size={16} className="text-muted-foreground" /> : <Bell size={16} className="text-primary" />}
                  <div>
                    <p className="text-sm font-medium">{localIsMuted ? "Уведомления выкл" : "Уведомления вкл"}</p>
                    <p className="text-[11px] text-muted-foreground">{localIsMuted ? "Нажмите для включения" : "Нажмите для отключения"}</p>
                  </div>
                </div>
                <button
                  onClick={handleMuteToggle}
                  className={`w-10 h-6 rounded-full transition-colors relative ${!localIsMuted ? "bg-primary" : "bg-border"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${!localIsMuted ? "left-[18px]" : "left-0.5"}`} />
                </button>
              </div>

              {/* Invite link */}
              {isAdmin && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Link size={10} /> Пригласительная ссылка
                  </p>
                  {loadingInvite ? (
                    <div className="bg-secondary/50 rounded-xl p-3 text-xs text-muted-foreground">Загрузка...</div>
                  ) : inviteLink ? (
                    <div className="bg-secondary/50 rounded-xl p-3 space-y-2">
                      <p className="text-xs text-primary font-mono break-all">{inviteLink}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCopyInvite}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors"
                        >
                          {copied ? <><Check size={12} /> Скопировано</> : <><Copy size={12} /> Скопировать</>}
                        </button>
                        <button
                          onClick={handleResetInvite}
                          disabled={resettingInvite}
                          className="px-3 py-1.5 bg-secondary text-muted-foreground rounded-lg text-xs hover:bg-border transition-colors"
                          title="Сбросить ссылку"
                        >
                          <RefreshCw size={12} className={resettingInvite ? "animate-spin" : ""} />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Danger zone */}
              <div className="border-t border-border pt-4 space-y-2">
                {!isOwner && (
                  <button
                    onClick={() => setShowConfirmLeave(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut size={16} />
                    <span className="text-sm font-medium">Покинуть {chatType === "channel" ? "канал" : "группу"}</span>
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => setShowConfirmDelete(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={16} />
                    <span className="text-sm font-medium">Удалить {chatType === "channel" ? "канал" : "группу"}</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ── PERMISSIONS TAB ── */}
          {tab === "permissions" && (
            <motion.div
              key="permissions"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
              className="p-4 space-y-4"
            >
              {!isAdmin && (
                <div className="bg-secondary/50 rounded-xl p-3 text-xs text-muted-foreground text-center">
                  Только администраторы могут изменять настройки прав.
                </div>
              )}

              {/* Who can send */}
              {chatType === "group" && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                    <MessageSquare size={10} /> Кто может писать сообщения
                  </p>
                  <div className="space-y-1.5">
                    {[
                      { value: "all", label: "Все участники", desc: "Любой участник группы может писать" },
                      { value: "admins", label: "Только администраторы", desc: "Обычные участники не могут писать" },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        disabled={!isAdmin}
                        onClick={() => isAdmin && handleWhoCanSendChange(opt.value)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                          localWhoCanSend === opt.value
                            ? "bg-primary/10 border border-primary/30"
                            : "bg-secondary/50 border border-transparent hover:bg-secondary"
                        } ${!isAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          localWhoCanSend === opt.value ? "border-primary" : "border-border"
                        }`}>
                          {localWhoCanSend === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Slow mode */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Clock size={10} /> Медленный режим
                </p>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Ограничивает частоту отправки сообщений участниками.
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {SLOW_MODE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      disabled={!isAdmin}
                      onClick={() => isAdmin && handleSlowModeChange(opt.value)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-colors text-center ${
                        localSlowMode === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/70 text-muted-foreground hover:bg-secondary"
                      } ${!isAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel-specific: public setting summary */}
              {chatType === "channel" && (
                <div className="bg-secondary/50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {localIsPublic ? <Globe size={14} className="text-primary" /> : <Lock size={14} className="text-muted-foreground" />}
                    <p className="text-sm font-medium">{localIsPublic ? "Публичный канал" : "Приватный канал"}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {localIsPublic
                      ? "Канал виден в поиске, любой может подписаться"
                      : "Канал доступен только по пригласительной ссылке"}
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => handleIsPublicChange(!localIsPublic)}
                      className="mt-2 text-xs text-primary font-medium hover:underline"
                    >
                      {localIsPublic ? "Сделать приватным" : "Сделать публичным"}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ── MEMBERS TAB ── */}
          {tab === "members" && (
            <motion.div
              key="members"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
              className="p-4 space-y-3"
            >
              {/* Add member */}
              {isAdmin && (
                <div>
                  <button
                    onClick={() => { setShowAdd(p => !p); setAddSearch(""); setSearchResults([]); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-bold hover:bg-primary/20 transition-colors"
                  >
                    <UserPlus size={14} />
                    Добавить участника
                  </button>
                  {showAdd && (
                    <div className="mt-2 space-y-2">
                      <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          autoFocus
                          value={addSearch}
                          onChange={e => onAddSearchChange(e.target.value)}
                          placeholder="Поиск пользователей..."
                          className="w-full bg-background border border-border rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      {searching && <p className="text-xs text-muted-foreground text-center py-1">Поиск...</p>}
                      {searchResults.length > 0 && (
                        <div className="space-y-0.5 max-h-40 overflow-y-auto scrollbar-thin">
                          {searchResults.slice(0, 8).map(u => (
                            <button
                              key={u.id}
                              onClick={() => handleAddMember(u)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-secondary transition-colors text-left"
                            >
                              <AvatarCircle name={u.displayName} color={u.avatarColor} url={u.avatarUrl} size={32} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{u.displayName}</p>
                                <p className="text-xs text-muted-foreground">@{u.username}</p>
                              </div>
                              <UserPlus size={14} className="text-primary shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                      {addSearch.trim() && !searching && searchResults.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-1">Пользователи не найдены</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Members list */}
              {loadingMembers ? (
                <div className="py-6 text-center text-xs text-muted-foreground">Загрузка...</div>
              ) : (
                <div className="space-y-0.5">
                  {[...members]
                    .sort((a, b) => {
                      const order = { owner: 0, admin: 1, member: 2 };
                      return (order[a.role as keyof typeof order] ?? 3) - (order[b.role as keyof typeof order] ?? 3);
                    })
                    .map(m => (
                      <div
                        key={m.userId}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-secondary/50 transition-colors group"
                      >
                        <AvatarCircle
                          name={m.user.displayName}
                          color={m.user.avatarColor}
                          url={m.user.avatarUrl}
                          size={36}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{m.user.displayName}</p>
                            {m.user.hasPrime && (
                              <Crown size={11} className="text-yellow-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">@{m.user.username}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {m.role === "owner" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">Владелец</span>
                          )}
                          {m.role === "admin" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">Админ</span>
                          )}
                          {isAdmin && m.role !== "owner" && m.userId !== currentUserId && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-all">
                              {m.role === "admin" ? (
                                <button
                                  onClick={() => handlePromoteMember(m.userId, "member")}
                                  title="Снять права админа"
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 transition-all"
                                >
                                  <ShieldOff size={13} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handlePromoteMember(m.userId, "admin")}
                                  title="Назначить администратором"
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                                >
                                  <Shield size={13} />
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveMember(m.userId)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                title="Удалить из группы"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirm Leave */}
      <AnimatePresence>
        {showConfirmLeave && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 flex items-center justify-center z-30 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-5 shadow-2xl w-full max-w-[280px]"
            >
              <p className="font-bold text-base mb-1">Покинуть {chatType === "channel" ? "канал" : "группу"}?</p>
              <p className="text-sm text-muted-foreground mb-4">Вы сможете вернуться по пригласительной ссылке.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmLeave(false)}
                  className="flex-1 py-2 rounded-xl bg-secondary text-sm font-medium hover:bg-border transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleLeaveChat}
                  className="flex-1 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  Покинуть
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Delete */}
      <AnimatePresence>
        {showConfirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 flex items-center justify-center z-30 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-5 shadow-2xl w-full max-w-[280px]"
            >
              <p className="font-bold text-base mb-1">Удалить {chatType === "channel" ? "канал" : "группу"}?</p>
              <p className="text-sm text-muted-foreground mb-4">Все сообщения и данные будут безвозвратно удалены.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 py-2 rounded-xl bg-secondary text-sm font-medium hover:bg-border transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleDeleteChat}
                  className="flex-1 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  Удалить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
