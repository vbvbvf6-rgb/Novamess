import React, { useState, useEffect, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Settings as SettingsIcon, Bell, Moon, Lock, Shield, Smartphone, Save,
  Sun, Palette, Database, Edit3, CheckCircle, LogOut, Link, Key, Eye,
  EyeOff, Phone, Globe, Type, Download, Trash2, Copy, Check, ChevronDown,
  ChevronRight, User, Radio, BellOff, Volume2, VolumeX, Clock, MessageSquare,
  Gift, PhoneCall, Monitor, Zap, AlertTriangle, X
} from "lucide-react";
import { useGetMe, useUpdateMe } from "@workspace/api-client-react";
import { useAppContext } from "@/contexts/AppContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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

const AVATAR_COLORS = [
  "#3B82F6","#EC4899","#10B981","#F59E0B","#8B5CF6",
  "#06B6D4","#EF4444","#F97316","#14B8A6","#84CC16",
  "#6366F1","#A855F7","#E11D48","#059669","#D97706",
];

const STATUS_PRESETS = [
  { emoji: "💬", text: "Доступен" },
  { emoji: "🔕", text: "Не беспокоить" },
  { emoji: "📍", text: "В офисе" },
  { emoji: "🏠", text: "Дома" },
  { emoji: "🚗", text: "В дороге" },
  { emoji: "😴", text: "Сплю" },
  { emoji: "🎮", text: "Играю" },
  { emoji: "🎧", text: "Слушаю музыку" },
];

const ONLINE_STATUS_OPTIONS = [
  { value: "online", label: "В сети", color: "bg-green-500", desc: "Виден как активный" },
  { value: "away", label: "Отошёл", color: "bg-yellow-500", desc: "Временно недоступен" },
  { value: "offline", label: "Не в сети", color: "bg-gray-400", desc: "Скрыть активность" },
] as const;

const FONT_SIZE_OPTIONS = [
  { value: "small", label: "Маленький", size: "13px" },
  { value: "medium", label: "Средний", size: "15px" },
  { value: "large", label: "Большой", size: "17px" },
] as const;

const LANGUAGE_OPTIONS = [
  { value: "ru", label: "Русский", flag: "🇷🇺" },
  { value: "en", label: "English", flag: "🇬🇧" },
] as const;

const LAST_SEEN_OPTIONS = [
  { value: "everyone", label: "Все" },
  { value: "contacts", label: "Контакты" },
  { value: "nobody", label: "Никто" },
] as const;

function ls(key: string, def: string): string {
  return localStorage.getItem(key) ?? def;
}
function lsb(key: string, def: boolean): boolean {
  const v = localStorage.getItem(key);
  return v === null ? def : v === "true";
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
        {icon} {title}
      </h2>
      <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
        {children}
      </div>
    </section>
  );
}

function Row({ icon, color, label, desc, right, onClick }: {
  icon: React.ReactNode; color: string; label: string; desc?: string;
  right?: React.ReactNode; onClick?: () => void;
}) {
  return (
    <div
      className={`p-4 flex items-center justify-between ${onClick ? "cursor-pointer hover:bg-secondary transition-colors" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${color}`}>{icon}</div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

export default function Settings() {
  const { isDark, toggleTheme, logout } = useAppContext();
  const { data: user } = useGetMe();
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Profile fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [statusText, setStatusText] = useState("");
  const [avatarColor, setAvatarColor] = useState("#3B82F6");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [onlineStatus, setOnlineStatus] = useState<"online" | "offline" | "away">("online");
  const [hasChanges, setHasChanges] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Appearance
  const [reduceAnimations, setReduceAnimations] = useState(() => lsb("pulse-reduce-animations", false));
  const [fontSize, setFontSize] = useState(() => ls("pulse-font-size", "medium"));
  const [language, setLanguage] = useState(() => ls("pulse-language", "ru"));

  // Notifications
  const [notifyMessages, setNotifyMessages] = useState(() => lsb("pulse-notify-messages", true));
  const [notifySounds, setNotifySounds] = useState(() => lsb("pulse-notify-sounds", true));
  const [notifyGifts, setNotifyGifts] = useState(() => lsb("pulse-notify-gifts", true));
  const [notifyCalls, setNotifyCalls] = useState(() => lsb("pulse-notify-calls", true));
  const [notifyPreview, setNotifyPreview] = useState(() => lsb("pulse-notify-preview", true));

  // Privacy
  const [lastSeenVisibility, setLastSeenVisibility] = useState(() => ls("pulse-privacy-last-seen", "everyone"));
  const [readReceipts, setReadReceipts] = useState(() => lsb("pulse-privacy-read-receipts", true));
  const [profilePhotoVisible, setProfilePhotoVisible] = useState(() => lsb("pulse-privacy-photo-visible", true));

  // Username change
  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  // Security
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // Storage
  const [storageSize, setStorageSize] = useState("0");
  const [cacheCleared, setCacheCleared] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Apply font size globally
  useEffect(() => {
    const opt = FONT_SIZE_OPTIONS.find(f => f.value === fontSize);
    if (opt) document.documentElement.style.setProperty("--app-font-size", opt.size);
  }, [fontSize]);

  // Calculate storage size
  useEffect(() => {
    const calc = () => {
      let size = 0;
      for (const key of Object.keys(localStorage)) {
        size += (localStorage.getItem(key) || "").length + key.length;
      }
      setStorageSize((size / 1024).toFixed(1));
    };
    calc();
  }, [cacheCleared]);

  // Populate form from user
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setBio(user.bio || "");
      setStatusText((user as any).statusText || "");
      setAvatarColor(user.avatarColor || "#3B82F6");
      setAvatarUrl((user as any).avatarUrl || "");
      setPhoneNumber((user as any).phoneNumber || "");
      setOnlineStatus((user.status as any) || "online");
    }
  }, [user]);

  // Detect changes
  useEffect(() => {
    if (!user) return;
    const changed =
      displayName !== (user.displayName || "") ||
      bio !== (user.bio || "") ||
      statusText !== ((user as any).statusText || "") ||
      avatarColor !== (user.avatarColor || "#3B82F6") ||
      avatarUrl !== ((user as any).avatarUrl || "") ||
      phoneNumber !== ((user as any).phoneNumber || "") ||
      onlineStatus !== ((user.status as any) || "online");
    setHasChanges(changed);
  }, [displayName, bio, statusText, avatarColor, avatarUrl, phoneNumber, onlineStatus, user]);

  const handleSave = () => {
    updateMe.mutate(
      {
        data: {
          displayName,
          bio,
          avatarColor,
          statusText,
          avatarUrl: avatarUrl || undefined,
          phoneNumber: phoneNumber || undefined,
          status: onlineStatus,
        } as any,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
          setHasChanges(false);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
          toast({ title: "Сохранено", description: "Изменения профиля сохранены." });
        },
        onError: () => {
          toast({ title: "Ошибка", description: "Не удалось сохранить изменения.", variant: "destructive" });
        },
      }
    );
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({ title: "Ошибка", description: "Заполните все поля.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Ошибка", description: "Новые пароли не совпадают.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Ошибка", description: "Пароль — минимум 6 символов.", variant: "destructive" });
      return;
    }
    setPwLoading(true);
    try {
      const uid = localStorage.getItem("pulse-user-id");
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(uid ? { "x-user-id": uid } : {}) },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Ошибка", description: data.error || "Ошибка смены пароля.", variant: "destructive" });
      } else {
        toast({ title: "Готово", description: "Пароль успешно изменён." });
        setShowChangePassword(false);
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      }
    } catch {
      toast({ title: "Ошибка", description: "Ошибка соединения.", variant: "destructive" });
    }
    setPwLoading(false);
  };

  const handleClearCache = () => {
    const critical = ["pulse-user-id", "pulse-token", "pulse-theme", "pulse-is-dark"];
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("pulse-") && !critical.includes(key)) {
        localStorage.removeItem(key);
      }
    }
    setCacheCleared(c => !c);
    toast({ title: "Готово", description: "Кэш очищен." });
  };

  const handleExportData = async () => {
    try {
      const uid = localStorage.getItem("pulse-user-id");
      const headers: Record<string, string> = uid ? { "x-user-id": uid } : {};
      const [profileRes, statsRes] = await Promise.all([
        fetch("/api/users/me", { headers }),
        fetch("/api/stats/me", { headers }),
      ]);
      const profile = await profileRes.json();
      const stats = await statsRes.json();
      const data = {
        exportDate: new Date().toISOString(),
        profile: { ...profile, passwordHash: undefined },
        stats,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `pulse-data-${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Экспорт готов", description: "Данные загружены в файл." });
    } catch {
      toast({ title: "Ошибка", description: "Не удалось экспортировать данные.", variant: "destructive" });
    }
  };

  const handleCopyProfileLink = () => {
    const link = `${window.location.origin}/profile/${user?.id || ""}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast({ title: "Скопировано", description: "Ссылка на профиль скопирована." });
  };

  const handleEndSessions = () => {
    sessionStorage.clear();
    toast({ title: "Готово", description: "Все другие сессии завершены." });
  };

  const handleChangeUsername = async () => {
    const trimmed = newUsername.trim().toLowerCase();
    if (!trimmed) { setUsernameError("Введите новый никнейм"); return; }
    if (trimmed.length < 3 || trimmed.length > 32) { setUsernameError("От 3 до 32 символов"); return; }
    if (!/^[a-z0-9_]+$/.test(trimmed)) { setUsernameError("Только латинские буквы, цифры и _"); return; }
    setUsernameLoading(true);
    setUsernameError("");
    try {
      const uid = localStorage.getItem("pulse-user-id");
      const res = await fetch("/api/users/me/username", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(uid ? { "x-user-id": uid } : {}) },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUsernameError(data.error || "Ошибка смены никнейма");
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
        setShowUsernameEdit(false);
        setNewUsername("");
        toast({ title: "Никнейм изменён", description: `Ваш новый никнейм: @${data.username}` });
      }
    } catch {
      setUsernameError("Ошибка соединения");
    }
    setUsernameLoading(false);
  };

  const getUsernameCooldown = () => {
    const changedAt = (user as any)?.usernameChangedAt;
    if (!changedAt) return null;
    const last = new Date(changedAt);
    const next = new Date(last.getTime() + 7 * 24 * 60 * 60 * 1000);
    const diffMs = next.getTime() - Date.now();
    if (diffMs <= 0) return null;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days} ${days === 1 ? "день" : days < 5 ? "дня" : "дней"}`;
    return `${hours} ${hours === 1 ? "час" : hours < 5 ? "часа" : "часов"}`;
  };

  const usernameCooldown = getUsernameCooldown();

  const setLs = (key: string, val: boolean | string) => localStorage.setItem(key, String(val));

  const avatarPreview = avatarUrl || null;
  const currentStatusOpt = ONLINE_STATUS_OPTIONS.find(o => o.value === onlineStatus)!;

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center px-6 justify-between bg-card/80 backdrop-blur-md z-10 shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <SettingsIcon className="text-primary" size={22} /> Настройки
        </h1>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={updateMe.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {saved ? "Сохранено!" : "Сохранить"}
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-2xl w-full mx-auto scrollbar-thin space-y-6 pb-24">

        {/* ── ПРОФИЛЬ ── */}
        <Section title="Мой профиль" icon={<Edit3 size={13} />}>
          {/* Avatar + preview */}
          <div className="p-4">
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-lg overflow-hidden"
                style={{ backgroundColor: avatarColor }}
              >
                {avatarPreview
                  ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" onError={() => setAvatarUrl("")} />
                  : displayName[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{displayName || "Ваше имя"}</p>
                <p className="text-sm text-muted-foreground truncate">@{user?.username || "username"}</p>
                {statusText && <p className="text-xs text-muted-foreground mt-0.5 truncate">{statusText}</p>}
              </div>
              <button
                onClick={handleCopyProfileLink}
                className="shrink-0 p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                title="Скопировать ссылку на профиль"
              >
                {linkCopied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
              </button>
            </div>

            {/* Avatar URL */}
            <div className="mb-3">
              <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                <Link size={11} /> URL аватара
              </Label>
              <Input
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="bg-background text-sm"
              />
            </div>

            {/* Avatar colors */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Цвет аватара</Label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setAvatarColor(color)}
                    className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${avatarColor === color ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-110" : ""}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="p-4 space-y-3">
            <div>
              <Label className="text-sm font-medium mb-1 block">Имя</Label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Ваше имя" className="bg-background" />
            </div>

            {/* Username change */}
            <div>
              <Label className="text-sm font-medium mb-1 block flex items-center gap-1.5">
                <User size={13} /> Никнейм
              </Label>
              {!showUsernameEdit ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground">
                    <span className="text-muted-foreground">@</span>
                    <span className="font-mono">{user?.username || "—"}</span>
                  </div>
                  {usernameCooldown ? (
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl shrink-0">
                      <Clock size={13} className="text-yellow-500 shrink-0" />
                      <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium whitespace-nowrap">через {usernameCooldown}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setShowUsernameEdit(true); setNewUsername(user?.username || ""); setUsernameError(""); }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 border border-primary/20 rounded-xl text-primary text-xs font-medium hover:bg-primary/20 transition-colors shrink-0"
                    >
                      <Edit3 size={13} /> Изменить
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center border border-border rounded-xl overflow-hidden bg-background focus-within:border-primary transition-colors">
                      <span className="px-3 text-muted-foreground text-sm font-mono select-none">@</span>
                      <input
                        value={newUsername}
                        onChange={e => { setNewUsername(e.target.value); setUsernameError(""); }}
                        onKeyDown={e => { if (e.key === "Enter") handleChangeUsername(); if (e.key === "Escape") setShowUsernameEdit(false); }}
                        placeholder={user?.username || "новый_ник"}
                        autoFocus
                        className="flex-1 py-2 pr-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-mono"
                        maxLength={32}
                      />
                    </div>
                    <button
                      onClick={handleChangeUsername}
                      disabled={usernameLoading}
                      className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
                    >
                      {usernameLoading ? "..." : "Сохранить"}
                    </button>
                    <button
                      onClick={() => { setShowUsernameEdit(false); setUsernameError(""); }}
                      className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {usernameError && (
                    <div className="flex items-center gap-1.5 text-xs text-red-500">
                      <AlertTriangle size={12} className="shrink-0" /> {usernameError}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Только латиница, цифры и _ · Смена раз в 7 дней
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium mb-1 block">О себе</Label>
              <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Расскажите о себе..." rows={3} className="bg-background resize-none" />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1 block flex items-center gap-1.5">
                <Phone size={13} /> Номер телефона
              </Label>
              <Input
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="+7 (999) 123-45-67"
                type="tel"
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">Виден только вашим контактам</p>
            </div>
          </div>

          {/* Status */}
          <div className="p-4">
            <Label className="text-sm font-medium mb-2 block">Текстовый статус</Label>
            <Input value={statusText} onChange={e => setStatusText(e.target.value)} placeholder="Что происходит?" className="bg-background mb-3" />
            <div className="flex flex-wrap gap-2">
              {STATUS_PRESETS.map(preset => (
                <button
                  key={preset.text}
                  onClick={() => setStatusText(`${preset.emoji} ${preset.text}`)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${statusText === `${preset.emoji} ${preset.text}` ? "bg-primary/10 border-primary text-primary" : "border-border hover:border-primary/50 hover:bg-secondary"}`}
                >
                  {preset.emoji} {preset.text}
                </button>
              ))}
            </div>
          </div>

          {/* Online status */}
          <div className="p-4">
            <Label className="text-sm font-medium mb-2 block flex items-center gap-1.5">
              <Radio size={13} /> Статус присутствия
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {ONLINE_STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setOnlineStatus(opt.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${onlineStatus === opt.value ? "border-primary bg-primary/8" : "border-border hover:border-primary/30 hover:bg-secondary"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ── ОФОРМЛЕНИЕ ── */}
        <Section title="Оформление" icon={<Palette size={13} />}>
          <Row
            icon={isDark ? <Moon size={18} /> : <Sun size={18} />}
            color="bg-primary/10 text-primary"
            label={isDark ? "Тёмная тема" : "Светлая тема"}
            desc={isDark ? "Тёмное оформление" : "Светлое оформление"}
            right={<Switch checked={isDark} onCheckedChange={toggleTheme} />}
          />
          <Row
            icon={<Smartphone size={18} />}
            color="bg-green-500/10 text-green-500"
            label="Уменьшить анимации"
            desc="Отключить сложные переходы"
            right={
              <Switch
                checked={reduceAnimations}
                onCheckedChange={v => { setReduceAnimations(v); setLs("pulse-reduce-animations", v); }}
              />
            }
          />
          {/* Font size */}
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl"><Type size={18} /></div>
              <div>
                <p className="text-sm font-medium">Размер шрифта</p>
                <p className="text-xs text-muted-foreground">Размер текста в чатах</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {FONT_SIZE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setFontSize(opt.value); setLs("pulse-font-size", opt.value); toast({ title: "Сохранено", description: `Размер шрифта: ${opt.label}` }); }}
                  className={`py-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-0.5 ${fontSize === opt.value ? "border-primary bg-primary/8 text-primary" : "border-border hover:border-primary/30"}`}
                  style={{ fontSize: opt.size }}
                >
                  {opt.label}
                  {fontSize === opt.value && <CheckCircle size={12} className="text-primary" />}
                </button>
              ))}
            </div>
          </div>
          {/* Language */}
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl"><Globe size={18} /></div>
              <div>
                <p className="text-sm font-medium">Язык интерфейса</p>
                <p className="text-xs text-muted-foreground">Выбор языка приложения</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setLanguage(opt.value); setLs("pulse-language", opt.value); toast({ title: "Язык сохранён", description: `Выбран: ${opt.label}` }); }}
                  className={`py-2.5 px-4 rounded-xl border text-sm font-medium transition-all flex items-center gap-2 ${language === opt.value ? "border-primary bg-primary/8 text-primary" : "border-border hover:border-primary/30"}`}
                >
                  <span className="text-lg">{opt.flag}</span> {opt.label}
                  {language === opt.value && <CheckCircle size={14} className="ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ── УВЕДОМЛЕНИЯ ── */}
        <Section title="Уведомления" icon={<Bell size={13} />}>
          <Row
            icon={<MessageSquare size={18} />}
            color="bg-blue-500/10 text-blue-500"
            label="Сообщения"
            desc="Уведомления о новых сообщениях"
            right={
              <Switch
                checked={notifyMessages}
                onCheckedChange={v => { setNotifyMessages(v); setLs("pulse-notify-messages", v); toast({ title: v ? "Включено" : "Выключено", description: "Уведомления о сообщениях" }); }}
              />
            }
          />
          <Row
            icon={<PhoneCall size={18} />}
            color="bg-green-500/10 text-green-500"
            label="Звонки"
            desc="Уведомления о входящих звонках"
            right={
              <Switch
                checked={notifyCalls}
                onCheckedChange={v => { setNotifyCalls(v); setLs("pulse-notify-calls", v); toast({ title: v ? "Включено" : "Выключено", description: "Уведомления о звонках" }); }}
              />
            }
          />
          <Row
            icon={<Gift size={18} />}
            color="bg-pink-500/10 text-pink-500"
            label="Подарки"
            desc="Уведомления о полученных подарках"
            right={
              <Switch
                checked={notifyGifts}
                onCheckedChange={v => { setNotifyGifts(v); setLs("pulse-notify-gifts", v); toast({ title: v ? "Включено" : "Выключено", description: "Уведомления о подарках" }); }}
              />
            }
          />
          <Row
            icon={notifySounds ? <Volume2 size={18} /> : <VolumeX size={18} />}
            color="bg-orange-500/10 text-orange-500"
            label="Звуки"
            desc="Звук при получении уведомлений"
            right={
              <Switch
                checked={notifySounds}
                onCheckedChange={v => { setNotifySounds(v); setLs("pulse-notify-sounds", v); toast({ title: v ? "Включено" : "Выключено", description: "Звуки уведомлений" }); }}
              />
            }
          />
          {/* Preview */}
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl"><Eye size={18} /></div>
                <div>
                  <p className="text-sm font-medium">Предпросмотр</p>
                  <p className="text-xs text-muted-foreground">
                    {notifyPreview ? "Показывать текст сообщения" : "Скрывать текст в уведомлении"}
                  </p>
                </div>
              </div>
              <Switch
                checked={notifyPreview}
                onCheckedChange={v => { setNotifyPreview(v); setLs("pulse-notify-preview", v); toast({ title: v ? "Включено" : "Выключено", description: "Предпросмотр в уведомлениях" }); }}
              />
            </div>
            {!notifyMessages && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
                <BellOff size={13} /> Уведомления о сообщениях отключены
              </div>
            )}
          </div>
        </Section>

        {/* ── КОНФИДЕНЦИАЛЬНОСТЬ ── */}
        <Section title="Конфиденциальность" icon={<Shield size={13} />}>
          {/* Last seen */}
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-teal-500/10 text-teal-500 rounded-xl"><Clock size={18} /></div>
              <div>
                <p className="text-sm font-medium">Последний визит</p>
                <p className="text-xs text-muted-foreground">Кто видит время вашего последнего визита</p>
              </div>
            </div>
            <div className="flex gap-2">
              {LAST_SEEN_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setLastSeenVisibility(opt.value); setLs("pulse-privacy-last-seen", opt.value); toast({ title: "Сохранено", description: `Последний визит: ${opt.label}` }); }}
                  className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all flex flex-col items-center gap-0.5 ${lastSeenVisibility === opt.value ? "border-primary bg-primary/8 text-primary" : "border-border hover:border-primary/30"}`}
                >
                  {opt.label}
                  {lastSeenVisibility === opt.value && <CheckCircle size={10} className="text-primary" />}
                </button>
              ))}
            </div>
          </div>

          <Row
            icon={<CheckCircle size={18} />}
            color="bg-blue-500/10 text-blue-500"
            label="Отчёты о прочтении"
            desc="Показывать галочки прочтения"
            right={
              <Switch
                checked={readReceipts}
                onCheckedChange={v => { setReadReceipts(v); setLs("pulse-privacy-read-receipts", v); toast({ title: "Сохранено", description: v ? "Галочки прочтения включены" : "Галочки прочтения скрыты" }); }}
              />
            }
          />
          <Row
            icon={<User size={18} />}
            color="bg-violet-500/10 text-violet-500"
            label="Фото профиля"
            desc={profilePhotoVisible ? "Видно всем" : "Скрыто от других"}
            right={
              <Switch
                checked={profilePhotoVisible}
                onCheckedChange={v => { setProfilePhotoVisible(v); setLs("pulse-privacy-photo-visible", v); toast({ title: "Сохранено", description: v ? "Фото профиля видно всем" : "Фото профиля скрыто" }); }}
              />
            }
          />
        </Section>

        {/* ── БЕЗОПАСНОСТЬ ── */}
        <Section title="Безопасность" icon={<Lock size={13} />}>
          <div
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary transition-colors"
            onClick={() => setShowChangePassword(!showChangePassword)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl"><Key size={18} /></div>
              <div>
                <p className="text-sm font-medium">Сменить пароль</p>
                <p className="text-xs text-muted-foreground">Обновить пароль аккаунта</p>
              </div>
            </div>
            {showChangePassword ? <ChevronDown size={18} className="text-muted-foreground" /> : <ChevronRight size={18} className="text-muted-foreground" />}
          </div>

          {showChangePassword && (
            <div className="p-4 space-y-3 bg-background/50">
              <div className="relative">
                <Label className="text-sm mb-1 block">Текущий пароль</Label>
                <Input
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Текущий пароль"
                  className="bg-background pr-10"
                />
                <button type="button" onClick={() => setShowCurrentPw(v => !v)} className="absolute right-3 bottom-2.5 text-muted-foreground hover:text-foreground">
                  {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="relative">
                <Label className="text-sm mb-1 block">Новый пароль</Label>
                <Input
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  className="bg-background pr-10"
                />
                <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 bottom-2.5 text-muted-foreground hover:text-foreground">
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div>
                <Label className="text-sm mb-1 block">Подтвердите пароль</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Повторите новый пароль"
                  className="bg-background"
                />
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle size={12} /> Пароли не совпадают</p>
              )}
              <button
                onClick={handleChangePassword}
                disabled={pwLoading}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {pwLoading ? "Сохраняем..." : "Сменить пароль"}
              </button>
            </div>
          )}

          <Row
            icon={<Monitor size={18} />}
            color="bg-cyan-500/10 text-cyan-500"
            label="Активные сессии"
            desc={`Браузер: ${navigator.userAgent.includes("Chrome") ? "Chrome" : navigator.userAgent.includes("Firefox") ? "Firefox" : "Другой"}`}
            onClick={handleEndSessions}
            right={<span className="text-xs text-muted-foreground">Завершить другие →</span>}
          />
        </Section>

        {/* ── ХРАНИЛИЩЕ ── */}
        <Section title="Хранилище и данные" icon={<Database size={13} />}>
          {/* Storage bar */}
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl"><Database size={18} /></div>
              <div className="flex-1">
                <div className="flex justify-between items-baseline">
                  <p className="text-sm font-medium">Локальный кэш</p>
                  <span className="text-sm font-bold text-orange-500">{storageSize} КБ</span>
                </div>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (Number(storageSize) / 100) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <button
              onClick={handleClearCache}
              className="flex items-center gap-2 w-full py-2.5 px-4 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors text-sm font-medium"
            >
              <Trash2 size={15} /> Очистить кэш приложения
            </button>
          </div>

          {/* Export */}
          <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary transition-colors" onClick={handleExportData}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 text-green-500 rounded-xl"><Download size={18} /></div>
              <div>
                <p className="text-sm font-medium">Экспорт данных</p>
                <p className="text-xs text-muted-foreground">Скачать профиль и статистику (JSON)</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </div>
        </Section>

        {/* ── О ПРИЛОЖЕНИИ ── */}
        <Section title="О приложении" icon={<Zap size={13} />}>
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                <Zap size={22} className="text-white fill-white" />
              </div>
              <div>
                <p className="font-bold text-base">Pulse Messenger</p>
                <p className="text-xs text-muted-foreground">Версия 2.0.0 · Сборка 2026</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="bg-muted/50 rounded-xl p-2.5">
                <p className="font-medium text-foreground mb-0.5">Аккаунт</p>
                <p>@{user?.username}</p>
                <p>ID: {user?.id}</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-2.5">
                <p className="font-medium text-foreground mb-0.5">Статус</p>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${currentStatusOpt?.color}`} />
                  {currentStatusOpt?.label}
                </div>
                <p>{user?.isVerified ? "✅ Верифицирован" : "Не верифицирован"}</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── ВЫХОД ── */}
        <div className="flex justify-center pt-2 pb-12">
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="flex items-center gap-2 text-destructive hover:bg-destructive/10 px-6 py-3 rounded-xl font-bold transition-colors"
          >
            <LogOut size={18} /> Выйти из аккаунта
          </button>
        </div>
      </div>

      {/* Sticky bottom save bar — visible whenever profile has unsaved changes */}
      {hasChanges && (
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-card/95 backdrop-blur-md border-t border-border shadow-lg">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Есть несохранённые изменения профиля</p>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  if (user) {
                    setDisplayName(user.displayName || "");
                    setBio(user.bio || "");
                    setStatusText((user as any).statusText || "");
                    setAvatarColor(user.avatarColor || "#3B82F6");
                    setAvatarUrl((user as any).avatarUrl || "");
                    setPhoneNumber((user as any).phoneNumber || "");
                    setOnlineStatus((user.status as any) || "online");
                  }
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors border border-border"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={updateMe.isPending}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saved ? <CheckCircle size={16} /> : <Save size={16} />}
                {updateMe.isPending ? "Сохраняем..." : saved ? "Сохранено!" : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Выход из аккаунта</AlertDialogTitle>
            <AlertDialogDescription>Вы уверены, что хотите выйти из Pulse?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={logout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Выйти
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
