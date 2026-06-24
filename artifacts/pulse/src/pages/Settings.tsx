import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Settings as SettingsIcon, Bell, Moon, Lock, Shield, Smartphone, Save,
  Sun, Palette, Database, Edit3, CheckCircle, LogOut, Link, Key, Eye,
  EyeOff, Phone, Globe, Type, Download, Trash2, Copy, Check, ChevronDown,
  ChevronRight, User, Radio, BellOff, Volume2, VolumeX, Clock, MessageSquare,
  Gift, PhoneCall, Monitor, Zap, AlertTriangle, X, Flame, Upload, Camera, Crown,
  ShieldCheck, QrCode, Fingerprint, LogIn, HelpCircle,
  Battery, FolderOpen, ArrowLeft, Mic, Headphones, Bot,
  SlidersHorizontal, Layers, Calendar, Play, FileText, MapPin
} from "lucide-react";
import { useLocation } from "wouter";
import { useGetMe, useUpdateMe, getGetChatsQueryKey } from "@workspace/api-client-react";
import { useAppContext } from "@/contexts/AppContext";
import { RINGTONES, previewRingtone, storeCustomRingtone } from "@/lib/ringtones";
import { useLanguage } from "@/contexts/LanguageContext";
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
import type { Lang } from "@/i18n/translations";

const AVATAR_COLORS = [
  "#000000","#3B82F6","#EC4899","#10B981","#F59E0B","#8B5CF6",
  "#06B6D4","#EF4444","#F97316","#14B8A6","#84CC16",
  "#6366F1","#A855F7","#E11D48","#059669","#D97706",
];

const STATUS_PRESETS = [
  { emoji: "💬", ru: "Доступен",       en: "Available" },
  { emoji: "🔕", ru: "Не беспокоить",  en: "Do not disturb" },
  { emoji: "📍", ru: "В офисе",        en: "At the office" },
  { emoji: "🏠", ru: "Дома",           en: "At home" },
  { emoji: "🚗", ru: "В дороге",       en: "On the road" },
  { emoji: "😴", ru: "Сплю",           en: "Sleeping" },
  { emoji: "🎮", ru: "Играю",          en: "Gaming" },
  { emoji: "🎧", ru: "Слушаю музыку",  en: "Listening to music" },
];

interface PrimeTheme {
  id: string;
  name: string;
  emoji: string;
  preview: string;
  vars: Record<string, string>;
}

const PRIME_THEMES: PrimeTheme[] = [
  {
    id: "obsidian", name: "Тёплый обсидиан", emoji: "🔥", preview: "#1a0d07",
    vars: {
      "--background": "20 12% 6%", "--foreground": "40 15% 90%",
      "--card": "20 12% 10%", "--card-foreground": "40 15% 90%", "--card-border": "20 10% 15%",
      "--popover": "20 12% 10%", "--popover-foreground": "40 15% 90%", "--popover-border": "20 10% 15%",
      "--primary": "16 100% 50%", "--primary-foreground": "0 0% 100%",
      "--secondary": "20 10% 16%", "--secondary-foreground": "40 15% 90%",
      "--muted": "20 10% 16%", "--muted-foreground": "30 10% 60%",
      "--accent": "16 100% 50%", "--accent-foreground": "0 0% 100%",
      "--border": "20 10% 15%", "--input": "20 10% 15%", "--ring": "16 100% 50%",
    },
  },
  {
    id: "midnight", name: "Полночь", emoji: "🌊", preview: "#060d1e",
    vars: {
      "--background": "222 47% 5%", "--foreground": "213 30% 92%",
      "--card": "222 40% 9%", "--card-foreground": "213 30% 92%", "--card-border": "222 35% 14%",
      "--popover": "222 40% 9%", "--popover-foreground": "213 30% 92%", "--popover-border": "222 35% 14%",
      "--primary": "213 100% 62%", "--primary-foreground": "0 0% 100%",
      "--secondary": "222 35% 14%", "--secondary-foreground": "213 30% 92%",
      "--muted": "222 35% 14%", "--muted-foreground": "220 15% 55%",
      "--accent": "213 100% 62%", "--accent-foreground": "0 0% 100%",
      "--border": "222 35% 14%", "--input": "222 35% 14%", "--ring": "213 100% 62%",
    },
  },
  {
    id: "forest", name: "Лес", emoji: "🌿", preview: "#050f08",
    vars: {
      "--background": "150 30% 5%", "--foreground": "140 20% 90%",
      "--card": "150 22% 9%", "--card-foreground": "140 20% 90%", "--card-border": "150 18% 14%",
      "--popover": "150 22% 9%", "--popover-foreground": "140 20% 90%", "--popover-border": "150 18% 14%",
      "--primary": "152 76% 45%", "--primary-foreground": "0 0% 100%",
      "--secondary": "150 18% 14%", "--secondary-foreground": "140 20% 90%",
      "--muted": "150 18% 14%", "--muted-foreground": "140 12% 55%",
      "--accent": "152 76% 45%", "--accent-foreground": "0 0% 100%",
      "--border": "150 18% 14%", "--input": "150 18% 14%", "--ring": "152 76% 45%",
    },
  },
  {
    id: "rose", name: "Роза", emoji: "🌸", preview: "#140608",
    vars: {
      "--background": "340 25% 5%", "--foreground": "340 20% 92%",
      "--card": "340 18% 9%", "--card-foreground": "340 20% 92%", "--card-border": "340 15% 15%",
      "--popover": "340 18% 9%", "--popover-foreground": "340 20% 92%", "--popover-border": "340 15% 15%",
      "--primary": "346 84% 62%", "--primary-foreground": "0 0% 100%",
      "--secondary": "340 15% 15%", "--secondary-foreground": "340 20% 92%",
      "--muted": "340 15% 15%", "--muted-foreground": "330 10% 55%",
      "--accent": "346 84% 62%", "--accent-foreground": "0 0% 100%",
      "--border": "340 15% 15%", "--input": "340 15% 15%", "--ring": "346 84% 62%",
    },
  },
  {
    id: "violet", name: "Сумерки", emoji: "🔮", preview: "#0b0814",
    vars: {
      "--background": "260 35% 5%", "--foreground": "260 20% 92%",
      "--card": "260 28% 9%", "--card-foreground": "260 20% 92%", "--card-border": "260 22% 15%",
      "--popover": "260 28% 9%", "--popover-foreground": "260 20% 92%", "--popover-border": "260 22% 15%",
      "--primary": "258 90% 68%", "--primary-foreground": "0 0% 100%",
      "--secondary": "260 22% 15%", "--secondary-foreground": "260 20% 92%",
      "--muted": "260 22% 15%", "--muted-foreground": "255 12% 56%",
      "--accent": "258 90% 68%", "--accent-foreground": "0 0% 100%",
      "--border": "260 22% 15%", "--input": "260 22% 15%", "--ring": "258 90% 68%",
    },
  },
  {
    id: "arctic", name: "Арктика", emoji: "❄️", preview: "#05111a",
    vars: {
      "--background": "200 40% 5%", "--foreground": "195 22% 92%",
      "--card": "200 32% 9%", "--card-foreground": "195 22% 92%", "--card-border": "200 26% 15%",
      "--popover": "200 32% 9%", "--popover-foreground": "195 22% 92%", "--popover-border": "200 26% 15%",
      "--primary": "199 89% 55%", "--primary-foreground": "0 0% 100%",
      "--secondary": "200 26% 15%", "--secondary-foreground": "195 22% 92%",
      "--muted": "200 26% 15%", "--muted-foreground": "195 14% 55%",
      "--accent": "199 89% 55%", "--accent-foreground": "0 0% 100%",
      "--border": "200 26% 15%", "--input": "200 26% 15%", "--ring": "199 89% 55%",
    },
  },
  {
    id: "amber", name: "Золото", emoji: "✨", preview: "#110d02",
    vars: {
      "--background": "40 35% 5%", "--foreground": "40 20% 92%",
      "--card": "40 25% 9%", "--card-foreground": "40 20% 92%", "--card-border": "40 20% 15%",
      "--popover": "40 25% 9%", "--popover-foreground": "40 20% 92%", "--popover-border": "40 20% 15%",
      "--primary": "43 96% 52%", "--primary-foreground": "40 35% 5%",
      "--secondary": "40 20% 15%", "--secondary-foreground": "40 20% 92%",
      "--muted": "40 20% 15%", "--muted-foreground": "35 12% 56%",
      "--accent": "43 96% 52%", "--accent-foreground": "40 35% 5%",
      "--border": "40 20% 15%", "--input": "40 20% 15%", "--ring": "43 96% 52%",
    },
  },
  {
    id: "crimson", name: "Кровавый", emoji: "🩸", preview: "#110305",
    vars: {
      "--background": "0 30% 5%", "--foreground": "0 15% 92%",
      "--card": "0 22% 9%", "--card-foreground": "0 15% 92%", "--card-border": "0 18% 15%",
      "--popover": "0 22% 9%", "--popover-foreground": "0 15% 92%", "--popover-border": "0 18% 15%",
      "--primary": "0 90% 55%", "--primary-foreground": "0 0% 100%",
      "--secondary": "0 18% 15%", "--secondary-foreground": "0 15% 92%",
      "--muted": "0 18% 15%", "--muted-foreground": "0 8% 56%",
      "--accent": "0 90% 55%", "--accent-foreground": "0 0% 100%",
      "--border": "0 18% 15%", "--input": "0 18% 15%", "--ring": "0 90% 55%",
    },
  },
];

const CSS_VAR_KEYS = [
  "--background","--foreground","--card","--card-foreground","--card-border",
  "--popover","--popover-foreground","--popover-border","--primary","--primary-foreground",
  "--secondary","--secondary-foreground","--muted","--muted-foreground",
  "--accent","--accent-foreground","--border","--input","--ring",
];

function applyPrimeTheme(themeId: string) {
  const theme = PRIME_THEMES.find(t => t.id === themeId);
  CSS_VAR_KEYS.forEach(k => document.documentElement.style.removeProperty(k));
  if (theme) {
    Object.entries(theme.vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  }
}

const LANGUAGE_OPTIONS = [
  { value: "ru", label: "Русский", flag: "🇷🇺" },
  { value: "en", label: "English", flag: "🇬🇧" },
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

function hashPin(pin: string): string {
  let h = 5381;
  for (let i = 0; i < pin.length; i++) h = ((h << 5) + h) ^ pin.charCodeAt(i);
  return String(h >>> 0);
}

function TwoFaSection({ user, toast, lang }: { user: any; toast: any; lang: string }) {
  const [enabled, setEnabled] = useState<boolean>(!!(user as any)?.totpEnabled);
  const [showSetup, setShowSetup] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; qrUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [disablePw, setDisablePw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { setEnabled(!!(user as any)?.totpEnabled); }, [user]);

  const getHeaders = (): Record<string, string> => {
    const token = sessionStorage.getItem("pulse-token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
  };

  const handleSetupOpen = async () => {
    setErr(""); setCode("");
    if (!setupData) {
      setLoading(true);
      try {
        const res = await fetch("/api/auth/2fa/setup", { headers: getHeaders() });
        const data = await res.json();
        if (res.ok) setSetupData(data);
        else setErr(data.error || "Ошибка");
      } catch { setErr("Ошибка подключения"); }
      setLoading(false);
    }
    setShowSetup(true);
  };

  const handleEnable = async () => {
    if (code.length !== 6) { setErr("Введите 6-значный код"); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeaders() },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok) {
        setEnabled(true); setShowSetup(false);
        toast({ title: "2FA включена", description: "Аккаунт защищён двухфакторной аутентификацией" });
      } else setErr(data.error || "Неверный код");
    } catch { setErr("Ошибка подключения"); }
    setLoading(false);
  };

  const handleDisable = async () => {
    if (!disablePw) { setErr("Введите пароль"); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeaders() },
        body: JSON.stringify({ password: disablePw }),
      });
      const data = await res.json();
      if (res.ok) {
        setEnabled(false); setShowSetup(false); setDisablePw("");
        toast({ title: "2FA отключена" });
      } else setErr(data.error || "Неверный пароль");
    } catch { setErr("Ошибка подключения"); }
    setLoading(false);
  };

  return (
    <div className="p-4 space-y-3 border-t border-border">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-500/10 text-green-500 rounded-xl"><ShieldCheck size={18} /></div>
        <div className="flex-1">
          <p className="text-sm font-medium">{lang === "ru" ? "Двухфакторная аутентификация" : "Two-factor authentication"}</p>
          <p className="text-xs text-muted-foreground">{enabled ? (lang === "ru" ? "Включена ✓" : "Enabled ✓") : (lang === "ru" ? "Выключена" : "Disabled")}</p>
        </div>
        <button
          onClick={enabled ? () => { setShowSetup(v => !v); setErr(""); } : handleSetupOpen}
          disabled={loading}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${enabled ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-green-500/10 text-green-500 hover:bg-green-500/20"}`}
        >
          {loading ? "..." : enabled ? (lang === "ru" ? "Отключить" : "Disable") : (lang === "ru" ? "Включить" : "Enable")}
        </button>
      </div>

      {showSetup && !enabled && setupData && (
        <div className="bg-background rounded-xl border border-border p-4 space-y-3">
          <p className="text-xs text-muted-foreground">{lang === "ru" ? "Отсканируйте QR-код в приложении Google Authenticator или Authy:" : "Scan the QR code in Google Authenticator or Authy:"}</p>
          <div className="flex justify-center">
            <img src={setupData.qrUrl} alt="QR Code" className="w-40 h-40 rounded-xl border border-border" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          </div>
          <div className="bg-muted rounded-lg px-3 py-2 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">{lang === "ru" ? "Или введите ключ вручную:" : "Or enter key manually:"}</p>
            <p className="font-mono text-xs text-foreground break-all select-all">{setupData.secret}</p>
          </div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={e => { setCode(e.target.value.replace(/\D/g, "")); setErr(""); }}
            placeholder={lang === "ru" ? "6-значный код" : "6-digit code"}
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-center font-mono text-lg tracking-widest focus:outline-none focus:border-primary"
          />
          {err && <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle size={11} />{err}</p>}
          <button
            onClick={handleEnable}
            disabled={loading || code.length !== 6}
            className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "..." : (lang === "ru" ? "Подтвердить и включить" : "Confirm & enable")}
          </button>
        </div>
      )}

      {showSetup && enabled && (
        <div className="bg-background rounded-xl border border-border p-4 space-y-3">
          <p className="text-xs text-muted-foreground">{lang === "ru" ? "Введите пароль аккаунта для отключения 2FA:" : "Enter account password to disable 2FA:"}</p>
          <input
            type="password"
            value={disablePw}
            onChange={e => { setDisablePw(e.target.value); setErr(""); }}
            placeholder={lang === "ru" ? "Текущий пароль" : "Current password"}
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
          {err && <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle size={11} />{err}</p>}
          <button
            onClick={handleDisable}
            disabled={loading || !disablePw}
            className="w-full py-2.5 bg-destructive/90 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "..." : (lang === "ru" ? "Отключить 2FA" : "Disable 2FA")}
          </button>
        </div>
      )}
    </div>
  );
}

function ScreenLockSection({ lang, toast }: { lang: string; toast: any }) {
  const [pinEnabled, setPinEnabled] = useState(() => localStorage.getItem("pulse-screen-lock-enabled") === "true");
  const [showSetup, setShowSetup] = useState(false);
  const [mode, setMode] = useState<"set" | "disable">("set");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [oldPin, setOldPin] = useState("");
  const [err, setErr] = useState("");

  const handleEnable = () => {
    if (newPin.length < 4) { setErr(lang === "ru" ? "Минимум 4 цифры" : "Minimum 4 digits"); return; }
    if (newPin !== confirmPin) { setErr(lang === "ru" ? "Коды не совпадают" : "PINs do not match"); return; }
    localStorage.setItem("pulse-screen-lock-pin", hashPin(newPin));
    localStorage.setItem("pulse-screen-lock-pin-length", String(newPin.length));
    localStorage.setItem("pulse-screen-lock-enabled", "true");
    setPinEnabled(true); setShowSetup(false); setNewPin(""); setConfirmPin(""); setErr("");
    toast({ title: lang === "ru" ? "Блокировка включена" : "Screen lock enabled" });
  };

  const handleDisable = () => {
    const stored = localStorage.getItem("pulse-screen-lock-pin") || "";
    if (hashPin(oldPin) !== stored) { setErr(lang === "ru" ? "Неверный PIN" : "Incorrect PIN"); return; }
    localStorage.removeItem("pulse-screen-lock-pin");
    localStorage.removeItem("pulse-screen-lock-enabled");
    setPinEnabled(false); setShowSetup(false); setOldPin(""); setErr("");
    toast({ title: lang === "ru" ? "Блокировка отключена" : "Screen lock disabled" });
  };

  const handleLockNow = () => {
    sessionStorage.removeItem("pulse-unlocked");
    window.dispatchEvent(new CustomEvent("pulse-lock"));
    toast({ title: lang === "ru" ? "Экран заблокирован" : "Screen locked" });
  };

  return (
    <div className="p-4 space-y-3 border-t border-border">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-violet-500/10 text-violet-500 rounded-xl"><Fingerprint size={18} /></div>
        <div className="flex-1">
          <p className="text-sm font-medium">{lang === "ru" ? "Блокировка экрана" : "Screen lock"}</p>
          <p className="text-xs text-muted-foreground">{pinEnabled ? (lang === "ru" ? "PIN-код установлен ✓" : "PIN set ✓") : (lang === "ru" ? "Не установлена" : "Not set")}</p>
        </div>
        <button
          onClick={() => { setShowSetup(v => !v); setMode(pinEnabled ? "disable" : "set"); setErr(""); }}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${pinEnabled ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-violet-500/10 text-violet-500 hover:bg-violet-500/20"}`}
        >
          {pinEnabled ? (lang === "ru" ? "Изменить / Выкл." : "Change / Off") : (lang === "ru" ? "Включить" : "Enable")}
        </button>
      </div>

      {pinEnabled && (
        <button onClick={handleLockNow} className="w-full py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors flex items-center justify-center gap-2">
          <Lock size={13} /> {lang === "ru" ? "Заблокировать сейчас" : "Lock now"}
        </button>
      )}

      {showSetup && mode === "set" && (
        <div className="bg-background rounded-xl border border-border p-4 space-y-3">
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={newPin}
            onChange={e => { setNewPin(e.target.value.replace(/\D/g, "")); setErr(""); }}
            placeholder={lang === "ru" ? "Новый PIN (4-8 цифр)" : "New PIN (4-8 digits)"}
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-center font-mono text-lg tracking-widest focus:outline-none focus:border-primary"
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={confirmPin}
            onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, "")); setErr(""); }}
            placeholder={lang === "ru" ? "Повторите PIN" : "Confirm PIN"}
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-center font-mono text-lg tracking-widest focus:outline-none focus:border-primary"
          />
          {err && <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle size={11} />{err}</p>}
          <button onClick={handleEnable} disabled={newPin.length < 4}
            className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50">
            {lang === "ru" ? "Установить PIN" : "Set PIN"}
          </button>
        </div>
      )}

      {showSetup && mode === "disable" && (
        <div className="bg-background rounded-xl border border-border p-4 space-y-3">
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={oldPin}
            onChange={e => { setOldPin(e.target.value.replace(/\D/g, "")); setErr(""); }}
            placeholder={lang === "ru" ? "Текущий PIN" : "Current PIN"}
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-center font-mono text-lg tracking-widest focus:outline-none focus:border-primary"
          />
          {err && <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle size={11} />{err}</p>}
          <button onClick={handleDisable} disabled={!oldPin}
            className="w-full py-2.5 bg-destructive/90 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
            {lang === "ru" ? "Отключить блокировку" : "Disable lock"}
          </button>
        </div>
      )}
    </div>
  );
}

function SecurityQuestionSection({ lang, toast }: { lang: string; toast: any }) {
  const [status, setStatus] = React.useState<"idle" | "loading" | "loaded">("idle");
  const [hasQuestion, setHasQuestion] = React.useState(false);
  const [currentQuestion, setCurrentQuestion] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");

  const load = React.useCallback(async () => {
    if (status === "loading" || status === "loaded") return;
    setStatus("loading");
    try {
      const token = sessionStorage.getItem("pulse-token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/users/me/security-question/check", { headers });
      const data = await res.json();
      setHasQuestion(!!data.hasQuestion);
      setCurrentQuestion(data.question || null);
    } catch {}
    setStatus("loaded");
  }, [status]);

  const handleOpen = () => {
    load();
    setShowForm(v => !v);
    setQuestion("");
    setAnswer("");
    setErr("");
  };

  const handleSave = async () => {
    if (!question.trim()) { setErr(lang === "ru" ? "Введите вопрос" : "Enter a question"); return; }
    if (answer.trim().length < 2) { setErr(lang === "ru" ? "Ответ слишком короткий" : "Answer too short"); return; }
    setSaving(true);
    setErr("");
    try {
      const token = sessionStorage.getItem("pulse-token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/users/me/security-question", {
        method: "PUT",
        headers,
        body: JSON.stringify({ question: question.trim(), answer: answer.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Ошибка"); return; }
      setHasQuestion(true);
      setCurrentQuestion(question.trim());
      setShowForm(false);
      setQuestion("");
      setAnswer("");
      toast({ title: lang === "ru" ? "Контрольный вопрос сохранён" : "Security question saved" });
    } catch {
      setErr(lang === "ru" ? "Ошибка подключения" : "Connection error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary transition-colors"
        onClick={handleOpen}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <HelpCircle size={18} />
          </div>
          <div>
            <p className="text-sm font-medium">{lang === "ru" ? "Контрольный вопрос" : "Security Question"}</p>
            <p className="text-xs text-muted-foreground">
              {status === "loaded"
                ? hasQuestion
                  ? (lang === "ru" ? "Установлен · Нажмите для изменения" : "Set · Tap to change")
                  : (lang === "ru" ? "Не установлен · Нужен для сброса пароля" : "Not set · Required for password reset")
                : (lang === "ru" ? "Для восстановления пароля" : "For password recovery")}
            </p>
          </div>
        </div>
        {showForm
          ? <ChevronDown size={18} className="text-muted-foreground" />
          : <ChevronRight size={18} className="text-muted-foreground" />}
      </div>

      {showForm && (
        <div className="p-4 space-y-3 bg-background/50">
          {hasQuestion && currentQuestion && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1">
                {lang === "ru" ? "Текущий вопрос" : "Current question"}
              </p>
              <p className="text-sm text-foreground font-medium">{currentQuestion}</p>
            </div>
          )}
          <div>
            <Label className="text-sm mb-1 block">{lang === "ru" ? "Новый вопрос" : "New question"}</Label>
            <Input
              value={question}
              onChange={e => { setQuestion(e.target.value); setErr(""); }}
              placeholder={lang === "ru" ? "Например: Имя вашего первого питомца?" : "E.g. Name of your first pet?"}
              className="bg-background"
            />
          </div>
          <div>
            <Label className="text-sm mb-1 block">{lang === "ru" ? "Ответ" : "Answer"}</Label>
            <Input
              value={answer}
              onChange={e => { setAnswer(e.target.value); setErr(""); }}
              placeholder={lang === "ru" ? "Ответ (регистр не важен)" : "Answer (case-insensitive)"}
              className="bg-background"
            />
          </div>
          {err && <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle size={11} />{err}</p>}
          <button
            onClick={handleSave}
            disabled={saving || !question.trim() || answer.trim().length < 2}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {saving
              ? (lang === "ru" ? "Сохраняем..." : "Saving...")
              : (lang === "ru" ? "Сохранить вопрос" : "Save question")}
          </button>
        </div>
      )}
    </>
  );
}

function SpeakersSection({ lang }: { lang: string }) {
  const [devices, setDevices] = useState<{ mic: MediaDeviceInfo[]; speaker: MediaDeviceInfo[]; camera: MediaDeviceInfo[] }>({ mic: [], speaker: [], camera: [] });
  const [permission, setPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const [testing, setTesting] = useState<null | "mic" | "speaker">(null);
  const [micLevel, setMicLevel] = useState(0);
  const stopMicRef = useRef(false);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(devs => {
      const mics = devs.filter(d => d.kind === "audioinput");
      const speakers = devs.filter(d => d.kind === "audiooutput");
      const cameras = devs.filter(d => d.kind === "videoinput");
      setDevices({ mic: mics, speaker: speakers, camera: cameras });
      if (mics.length > 0 && mics[0].label) setPermission("granted");
    }).catch(() => {});
  }, []);

  const requestAccess = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      const devs = await navigator.mediaDevices.enumerateDevices();
      setDevices({ mic: devs.filter(d => d.kind === "audioinput"), speaker: devs.filter(d => d.kind === "audiooutput"), camera: devs.filter(d => d.kind === "videoinput") });
      setPermission("granted");
    } catch { setPermission("denied"); }
  };

  const micRafRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);

  const stopMicTest = useCallback(() => {
    stopMicRef.current = true;
    if (micRafRef.current !== null) { cancelAnimationFrame(micRafRef.current); micRafRef.current = null; }
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
    micCtxRef.current?.close().catch(() => {});
    micCtxRef.current = null;
    setTesting(null);
    setMicLevel(0);
  }, []);

  // Ensure mic stream is released if user navigates away mid-test
  useEffect(() => () => stopMicTest(), [stopMicTest]);

  const testMic = async () => {
    if (testing === "mic") { stopMicTest(); return; }
    stopMicRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setTesting("mic");
      const ctx = new AudioContext();
      micCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      ctx.createMediaStreamSource(stream).connect(analyser);
      analyser.fftSize = 64;
      const arr = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (stopMicRef.current) return;
        analyser.getByteFrequencyData(arr);
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        setMicLevel(avg);
        micRafRef.current = requestAnimationFrame(tick);
      };
      micRafRef.current = requestAnimationFrame(tick);
      setTimeout(() => stopMicTest(), 5000);
    } catch { setPermission("denied"); }
  };

  const testSpeaker = async () => {
    if (testing === "speaker") { setTesting(null); return; }
    setTesting("speaker");
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); setTesting(null); }, 1000);
  };

  const devGroups = [
    { key: "mic", icon: <Mic size={18}/>, color: "bg-orange-500/10 text-orange-500", title: lang === "ru" ? "Микрофоны" : "Microphones", devs: devices.mic, onTest: testMic, testLabel: testing === "mic" ? (lang === "ru" ? "Стоп" : "Stop") : (lang === "ru" ? "Тест" : "Test") },
    { key: "speaker", icon: <Headphones size={18}/>, color: "bg-blue-500/10 text-blue-500", title: lang === "ru" ? "Динамики" : "Speakers", devs: devices.speaker, onTest: testSpeaker, testLabel: testing === "speaker" ? "♪" : (lang === "ru" ? "Тест" : "Test") },
    { key: "camera", icon: <Camera size={18}/>, color: "bg-violet-500/10 text-violet-500", title: lang === "ru" ? "Камеры" : "Cameras", devs: devices.camera },
  ] as const;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {permission === "unknown" && (
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0"><Mic size={16}/></div>
          <div className="flex-1">
            <p className="text-sm font-medium">{lang === "ru" ? "Требуется доступ к устройствам" : "Device access required"}</p>
            <p className="text-xs text-muted-foreground">{lang === "ru" ? "Нажмите, чтобы обнаружить микрофоны, камеру и динамики" : "Click to detect microphones, camera and speakers"}</p>
          </div>
          <button onClick={requestAccess} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold shrink-0">{lang === "ru" ? "Разрешить" : "Allow"}</button>
        </div>
      )}
      {permission === "denied" && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 bg-destructive/20 rounded-xl text-destructive shrink-0"><Mic size={16}/></div>
          <p className="text-sm text-destructive">{lang === "ru" ? "Доступ к устройствам заблокирован. Разрешите его в настройках браузера." : "Device access blocked. Enable it in browser settings."}</p>
        </div>
      )}
      {testing === "mic" && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-2">{lang === "ru" ? "Уровень микрофона:" : "Mic level:"}</p>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-75" style={{ width: `${Math.min(100, (micLevel / 128) * 100)}%` }}/>
          </div>
        </div>
      )}
      {devGroups.map(group => (
        <Section key={group.key} title={group.title} icon={group.icon}>
          {group.devs.length === 0 ? (
            <div className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-xl shrink-0 ${group.color}`}>{group.icon}</div>
              <p className="text-sm text-muted-foreground">{lang === "ru" ? "Устройства не обнаружены" : "No devices found"}</p>
            </div>
          ) : (
            group.devs.map((dev, idx) => (
              <div key={dev.deviceId} className={`p-4 flex items-center gap-3 ${idx < group.devs.length - 1 ? "border-b border-border" : ""}`}>
                <div className={`p-2 rounded-xl shrink-0 ${group.color}`}>{group.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{dev.label || `${group.title} ${idx + 1}`}</p>
                  {idx === 0 && <p className="text-[11px] text-muted-foreground">{lang === "ru" ? "По умолчанию" : "Default"}</p>}
                </div>
                {(group.key === "mic" || group.key === "speaker") && idx === 0 && (
                  <button onClick={group.onTest} className="text-xs font-bold px-2.5 py-1 rounded-lg border border-border hover:bg-secondary transition-colors shrink-0">
                    {group.testLabel}
                  </button>
                )}
                {idx === 0 && <span className="text-[10px] font-bold px-2 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg shrink-0">{lang === "ru" ? "Активен" : "Active"}</span>}
              </div>
            ))
          )}
        </Section>
      ))}
      <div className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0"><Headphones size={16}/></div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {lang === "ru" ? "Устройство по умолчанию выбирается системой. Для смены устройства используйте настройки ОС или браузера." : "The default device is selected by your system. Change it in your OS or browser settings."}
        </p>
      </div>
    </div>
  );
}

function NotificationPermissionBanner() {
  const { permission, requestPermission, isSupported } = useNotifications();
  const [requesting, setRequesting] = React.useState(false);

  if (!isSupported) return null;

  if (permission === "granted") {
    return (
      <div className="mx-4 mb-2 flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2.5">
        <CheckCircle size={14} className="shrink-0" />
        <span>Уведомления разрешены браузером</span>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="mx-4 mb-2 flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span>Уведомления заблокированы в браузере. Разрешите их вручную в настройках браузера.</span>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-2 flex items-center justify-between gap-3 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <Bell size={14} className="text-primary shrink-0" />
        <span className="text-xs text-foreground">Разрешить push-уведомления?</span>
      </div>
      <button
        disabled={requesting}
        onClick={async () => {
          setRequesting(true);
          await requestPermission();
          setRequesting(false);
        }}
        className="shrink-0 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        {requesting ? "..." : "Включить"}
      </button>
    </div>
  );
}

function NavGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-3 bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border mb-2">
      {children}
    </div>
  );
}

function NavItem({ id, icon, color, label, badge, badgeAmber, active, onClick, href }: {
  id: string; icon: React.ReactNode; color: string; label: string;
  badge?: string; badgeAmber?: boolean; active: string;
  onClick: (id: string | null) => void; href?: string;
}) {
  const [, setLoc] = useLocation();
  const isActive = active === id;
  return (
    <button
      onClick={() => href ? setLoc(href) : onClick(id)}
      className={cn(
        "flex items-center gap-3 px-4 py-3 w-full text-left transition-colors",
        isActive ? "bg-primary/8" : "hover:bg-secondary/60"
      )}
    >
      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white", color)}>
        {icon}
      </div>
      <span className="text-sm font-medium flex-1 truncate">{label}</span>
      {badge && (
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full mr-0.5 shrink-0",
          badgeAmber ? "bg-amber-500/15 text-amber-500" : "text-muted-foreground"
        )}>
          {badge}
        </span>
      )}
      <ChevronRight size={15} className={cn(isActive ? "text-primary" : "text-muted-foreground", "shrink-0")} />
    </button>
  );
}

// ─── FAQ Section ──────────────────────────────────────────────────────────────

function FaqSection({ lang }: { lang: string }) {
  const [open, setOpen] = useState<number | null>(null);

  const items = lang === "ru" ? [
    { q: "Как создать группу или канал?", a: "Нажмите иконку карандаша в верхнем углу списка чатов → «Создать группу» или «Создать канал». Добавьте участников и задайте название." },
    { q: "Как включить двухфакторную аутентификацию?", a: "Настройки → Конфиденциальность и безопасность → Двухфакторная аутентификация. Отсканируйте QR-код в любом приложении-аутентификаторе (Google Authenticator, Authy)." },
    { q: "Что такое Aura Prime и Prime+?", a: "Prime — платная подписка с золотым кольцом, значком ⭐, эксклюзивными темами и 2× Spark. Prime+ добавляет алмазное кольцо, 3× Spark, ежемесячный эпический подарок, видео-аватар и закрытый Prime+ Lounge." },
    { q: "Как работают исчезающие сообщения?", a: "В чате → ⋯ меню → «Исчезающие сообщения». Выберите таймер (5с, 1м, 1ч, 1д, 1нед). Сообщения автоматически удаляются после прочтения по истечении времени." },
    { q: "Что такое Spark ⚡?", a: "Spark — внутренняя валюта Aura. Её можно заработать через ежедневные бонусы и задания, или купить в Кошельке. Spark тратится на подарки и подписку Prime." },
    { q: "Как установить PIN-блокировку экрана?", a: "Настройки → Конфиденциальность и безопасность → Блокировка экрана. Задайте 4–8 значный PIN-код. Приложение заблокируется через 1 минуту бездействия." },
    { q: "Как отправить подарок?", a: "Откройте любой чат → нажмите иконку 🎁 в поле ввода. Выберите подарок по редкости и стоимости, добавьте сообщение. Подарок можно отправить анонимно." },
    { q: "Как работают истории?", a: "Истории видны 24 часа. Нажмите на аватар в верхней панели, чтобы посмотреть. Создать историю: значок камеры в истории друга или из профиля." },
    { q: "Как найти человека?", a: "Поиск по нику в глобальном поиске (лупа) — введите @username. В разделе «Контакты» можно добавить пользователей и управлять списком." },
    { q: "Как сменить тему оформления?", a: "Настройки → Мой аккаунт → Темы. Тёмная/светлая тема — иконка луны вверху. Aura Prime открывает 8+ эксклюзивных тем (Obsidian, Midnight, Forest и др.)." },
    { q: "Как удалить сообщение?", a: "Долгое нажатие на сообщение → «Удалить». Можно удалить только у себя или у всех (в течение 48 часов)." },
    { q: "Как работают реакции на сообщения?", a: "Долгое нажатие на сообщение → выберите эмодзи из панели реакций. Prime+ позволяет ставить двойные реакции." },
  ] : [
    { q: "How to create a group or channel?", a: "Tap the pencil icon at the top of the chat list → 'Create Group' or 'Create Channel'. Add members and set a name." },
    { q: "How to enable Two-Factor Authentication?", a: "Settings → Privacy & Security → Two-Factor Authentication. Scan the QR code with any authenticator app (Google Authenticator, Authy)." },
    { q: "What is Aura Prime and Prime+?", a: "Prime is a paid subscription with a gold ring, ⭐ badge, exclusive themes and 2× Spark. Prime+ adds a diamond ring, 3× Spark, monthly epic gift, video avatar and exclusive Prime+ Lounge." },
    { q: "How do disappearing messages work?", a: "In any chat → ⋯ menu → 'Disappearing Messages'. Choose a timer (5s, 1m, 1h, 1d, 1wk). Messages delete automatically after being read when the timer expires." },
    { q: "What is Spark ⚡?", a: "Spark is Aura's in-app currency. Earn it through daily bonuses and tasks, or buy it in the Wallet. Spend Spark on gifts and Prime subscriptions." },
    { q: "How to set a screen lock PIN?", a: "Settings → Privacy & Security → Screen Lock. Set a 4–8 digit PIN. The app locks after 1 minute of inactivity." },
    { q: "How to send a gift?", a: "Open any chat → tap the 🎁 icon in the input area. Choose a gift by rarity and cost, add a message. Gifts can be sent anonymously." },
    { q: "How do stories work?", a: "Stories are visible for 24 hours. Tap an avatar in the top bar to view. Create a story from your profile or the stories bar." },
    { q: "How to find someone?", a: "Use global search (magnifier) and type @username. In 'Contacts' you can add users and manage your contact list." },
    { q: "How to change the theme?", a: "Settings → My Account → Themes. Toggle dark/light with the moon icon at the top. Aura Prime unlocks 8+ exclusive themes (Obsidian, Midnight, Forest, etc.)." },
    { q: "How to delete a message?", a: "Long-press a message → 'Delete'. You can delete for yourself only, or for everyone (within 48 hours)." },
    { q: "How do message reactions work?", a: "Long-press a message → choose an emoji from the reaction panel. Prime+ allows double reactions." },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-2">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {items.map((item, i) => (
          <div key={i} className={`${i < items.length - 1 ? "border-b border-border" : ""}`}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/50 transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <HelpCircle size={13} className="text-primary" />
              </div>
              <span className="flex-1 text-sm font-semibold text-foreground leading-snug">{item.q}</span>
              <ChevronDown size={15} className={`text-muted-foreground shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && (
              <div className="px-4 pb-4 pt-0">
                <div className="ml-9 text-sm text-muted-foreground leading-relaxed bg-secondary/30 rounded-xl p-3">
                  {item.a}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── Support Section ──────────────────────────────────────────────────────────

function SupportSection({ lang, user, t, currentStatusOpt, onNavigate }: { lang: string; user: any; t: (key: string) => string; currentStatusOpt: any; onNavigate?: (section: string) => void }) {
  const [copied, setCopied] = useState(false);

  const copyDebugInfo = () => {
    const info = [
      `Aura Messenger v2.0.0`,
      `User: @${user?.username} (ID: ${user?.id})`,
      `Browser: ${navigator.userAgent}`,
      `Platform: ${navigator.platform}`,
      `Language: ${navigator.language}`,
      `Screen: ${window.screen.width}×${window.screen.height}`,
      `Time: ${new Date().toISOString()}`,
    ].join("\n");
    navigator.clipboard.writeText(info).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const systemStats = [
    { label: lang === "ru" ? "Браузер" : "Browser", value: navigator.userAgent.includes("Chrome") ? "Chrome" : navigator.userAgent.includes("Firefox") ? "Firefox" : navigator.userAgent.includes("Safari") ? "Safari" : lang === "ru" ? "Другой" : "Other" },
    { label: "Platform", value: navigator.platform || "—" },
    { label: lang === "ru" ? "Разрешение" : "Resolution", value: `${window.screen.width}×${window.screen.height}` },
    { label: lang === "ru" ? "Язык" : "Language", value: navigator.language },
    { label: "User ID", value: String(user?.id ?? "—") },
    { label: "@username", value: `@${user?.username ?? "—"}` },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* About card */}
      <Section title={t("settings.about")} icon={<Zap size={13}/>}>
        <div className="p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shrink-0 shadow-lg">
              <Zap size={26} className="text-white fill-white"/>
            </div>
            <div>
              <p className="font-black text-base">Aura Messenger</p>
              <p className="text-xs text-muted-foreground">Version 2.0.0 — Production</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-green-500"/>
                <span className="text-[11px] text-green-500 font-medium">{lang === "ru" ? "Все системы работают" : "All systems operational"}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: lang === "ru" ? "Аккаунт" : "Account", value: `@${user?.username}` },
              { label: "ID", value: String(user?.id ?? "—") },
              { label: lang === "ru" ? "Статус" : "Status", value: currentStatusOpt?.label ?? "—" },
              { label: lang === "ru" ? "Верификация" : "Verified", value: user?.isVerified ? (lang === "ru" ? "✓ Да" : "✓ Yes") : (lang === "ru" ? "Нет" : "No") },
            ].map((stat, i) => (
              <div key={i} className="bg-muted/40 rounded-xl p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">{stat.label}</p>
                <p className="text-sm font-semibold text-foreground truncate">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Contact options */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
        {[
          { icon: <MessageSquare size={14} className="text-primary"/>, bg: "bg-primary/15", title: lang === "ru" ? "Служба поддержки" : "Support Team", desc: lang === "ru" ? "Задать вопрос или сообщить о проблеме" : "Ask a question or report an issue", href: "/support" },
          { icon: <AlertTriangle size={14} className="text-red-400"/>, bg: "bg-red-500/15", title: lang === "ru" ? "Сообщить об ошибке" : "Report a Bug", desc: lang === "ru" ? "Помогите нам улучшить Aura" : "Help us improve Aura", href: "/support" },
          { icon: <Shield size={14} className="text-green-400"/>, bg: "bg-green-500/15", title: lang === "ru" ? "Конфиденциальность" : "Privacy Policy", desc: lang === "ru" ? "Политика конфиденциальности (152-ФЗ)" : "Privacy policy and data handling", href: "/privacy" },
          { icon: <HelpCircle size={14} className="text-blue-400"/>, bg: "bg-blue-500/15", title: lang === "ru" ? "Часто задаваемые вопросы" : "FAQ", desc: lang === "ru" ? "Ответы на популярные вопросы" : "Answers to common questions", onClick: "faq" },
        ].map((item, i) => (
          item.onClick ? (
            <button key={i} onClick={() => onNavigate?.(item.onClick as string)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors text-left">
              <div className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>{item.icon}</div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight size={15} className="text-muted-foreground"/>
            </button>
          ) : (
            <a key={i} href={item.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors">
              <div className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>{item.icon}</div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight size={15} className="text-muted-foreground"/>
            </a>
          )
        ))}
      </div>

      {/* System info */}
      <Section title={lang === "ru" ? "Системная информация" : "System Info"} icon={<Monitor size={13}/>}>
        <div className="p-4 space-y-2">
          {systemStats.map((stat, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{stat.label}</span>
              <span className="font-mono font-semibold text-foreground max-w-[60%] truncate text-right">{stat.value}</span>
            </div>
          ))}
          <button
            onClick={copyDebugInfo}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {copied ? <><CheckCircle size={12} className="text-green-500"/> {lang === "ru" ? "Скопировано!" : "Copied!"}</> : <><Copy size={12}/> {lang === "ru" ? "Скопировать для поддержки" : "Copy for support"}</>}
          </button>
        </div>
      </Section>
    </div>
  );
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { isDark, toggleTheme, logout } = useAppContext();
  const { t, lang, setLang } = useLanguage();
  const { data: user } = useGetMe();
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Online status options — translated
  const ONLINE_STATUS_OPTIONS = [
    { value: "online",  label: t("status.online"),  color: "bg-green-500",  desc: t("status.online.desc") },
    { value: "away",    label: t("status.away"),    color: "bg-yellow-500", desc: t("status.away.desc") },
    { value: "offline", label: t("status.offline"), color: "bg-gray-400",   desc: t("status.offline.desc") },
  ] as const;

  const FONT_SIZE_OPTIONS = [
    { value: "small",  label: t("settings.fontSmall"),  size: "13px" },
    { value: "medium", label: t("settings.fontMedium"), size: "15px" },
    { value: "large",  label: t("settings.fontLarge"),  size: "17px" },
  ] as const;

  const LAST_SEEN_OPTIONS = [
    { value: "everyone", label: t("settings.lastSeenEveryone") },
    { value: "contacts", label: t("settings.lastSeenContacts") },
    { value: "nobody",   label: t("settings.lastSeenNobody") },
  ] as const;

  // Profile fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [statusText, setStatusText] = useState("");
  const [avatarColor, setAvatarColor] = useState("#3B82F6");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [onlineStatus, setOnlineStatus] = useState<"online" | "offline" | "away">("online");
  const [hasChanges, setHasChanges] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Appearance
  const [reduceAnimations, setReduceAnimations] = useState(() => lsb("pulse-reduce-animations", false));
  const [fontSize, setFontSize] = useState(() => ls("pulse-font-size", "medium"));
  const [language, setLanguage] = useState(() => ls("pulse-language", "ru"));
  const [pageZoom, setPageZoom] = useState(() => ls("pulse-page-zoom", "100"));

  // Notifications
  const [notifyMessages, setNotifyMessages] = useState(() => lsb("pulse-notify-messages", true));
  const [notifySounds, setNotifySounds] = useState(() => lsb("pulse-notify-sounds", true));
  const [notifyGifts, setNotifyGifts] = useState(() => lsb("pulse-notify-gifts", true));
  const [notifyCalls, setNotifyCalls] = useState(() => lsb("pulse-notify-calls", true));
  const [notifyPreview, setNotifyPreview] = useState(() => lsb("pulse-notify-preview", true));
  const [notificationSound, setNotificationSound] = useState(() => localStorage.getItem("pulse-notification-sound") || "classic");
  const [ringtone, setRingtone] = useState(() => localStorage.getItem("pulse-ringtone") || "pulse");
  const [customRingtoneName, setCustomRingtoneName] = useState(() => localStorage.getItem("pulse-ringtone-name") || "");
  const customRingtoneInputRef = useRef<HTMLInputElement>(null);

  const handleCustomRingtoneFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ab = await file.arrayBuffer();
      await storeCustomRingtone(ab);
      localStorage.setItem("pulse-ringtone-name", file.name);
      localStorage.setItem("pulse-ringtone", "custom");
      setCustomRingtoneName(file.name);
      setRingtone("custom");
      previewRingtone("custom");
    } catch {
      toast({ title: "Не удалось загрузить файл", variant: "destructive" });
    }
    e.target.value = "";
  };

  // Privacy
  const [lastSeenVisibility, setLastSeenVisibility] = useState(() => ls("pulse-privacy-last-seen", "everyone"));
  const [readReceipts, setReadReceipts] = useState<boolean>(() => {
    if ((user as any)?.readReceiptsEnabled !== undefined) return !!(user as any).readReceiptsEnabled;
    return lsb("pulse-privacy-read-receipts", true);
  });
  const [showOnlineStatusToggle, setShowOnlineStatusToggle] = useState<boolean>(() => {
    if ((user as any)?.showOnlineStatus !== undefined) return !!(user as any).showOnlineStatus;
    return lsb("pulse-privacy-show-online", true);
  });
  const [profilePhotoVisible, setProfilePhotoVisible] = useState(() => lsb("pulse-privacy-photo-visible", true));
  const [globalAutoDelete, setGlobalAutoDelete] = useState<number | null>(() => {
    const v = localStorage.getItem("pulse-global-auto-delete");
    return v ? Number(v) : null;
  });

  // Zoom is now applied via transform in App.tsx — nothing to apply here on mount

  // Prime theme
  const [primeTheme, setPrimeTheme] = useState(() => localStorage.getItem("pulse-prime-theme") || "cyan");
  useEffect(() => {
    if ((user as any)?.hasPrime) applyPrimeTheme(primeTheme);
  }, [(user as any)?.hasPrime, primeTheme]);

  // Avatar file upload
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const videoAvatarRef = useRef<HTMLInputElement>(null);
  const [cancelPrimeLoading, setCancelPrimeLoading] = useState(false);

  const saveAvatarUrl = (compressed: string) => {
    setAvatarUrl(compressed);
    const token = sessionStorage.getItem("pulse-token");
    fetch("/api/users/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
      body: JSON.stringify({ avatarUrl: compressed }),
    })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
        toast({ title: lang === "ru" ? "Фото обновлено" : "Photo updated" });
      })
      .catch(() => { toast({ title: t("settings.saveError"), variant: "destructive" }); });
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 400;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      saveAvatarUrl(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.src = objectUrl;
  };

  const handleVideoAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };
    video.onseeked = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      const MAX = 400;
      const scale = Math.min(1, MAX / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      saveAvatarUrl(canvas.toDataURL("image/jpeg", 0.85));
    };
    video.onerror = () => { URL.revokeObjectURL(objectUrl); };
    video.src = objectUrl;
    video.load();
  };


  const handleCancelPrime = async () => {
    setCancelPrimeLoading(true);
    try {
      const token = sessionStorage.getItem("pulse-token");
      const res = await fetch("/api/prime/cancel", {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
        toast({ title: lang === "ru" ? "Подписка отменена" : "Subscription cancelled", description: lang === "ru" ? "Aura Prime деактивирован." : "Aura Prime has been deactivated." });
      } else {
        toast({ title: t("common.error"), variant: "destructive" });
      }
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
    setCancelPrimeLoading(false);
  };

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

  // Sessions management
  const [sessions, setSessions] = useState<Array<{id:string;device:string;ip:string;createdAt:string;lastActiveAt:string;isCurrent:boolean}>>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [showSessions, setShowSessions] = useState(false);

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const token = sessionStorage.getItem("pulse-token");
      const res = await fetch("/api/auth/sessions", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (res.ok) { const d = await res.json(); setSessions(d.sessions || []); }
    } catch {}
    setSessionsLoading(false);
  };
  const revokeSession = async (id: string) => {
    const token = sessionStorage.getItem("pulse-token");
    await fetch(`/api/auth/sessions/${id}`, { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} });
    setSessions(prev => prev.filter(s => s.id !== id));
    toast({ title: lang === "ru" ? "Сессия завершена" : "Session terminated" });
  };
  const revokeAllOther = async () => {
    const token = sessionStorage.getItem("pulse-token");
    await fetch("/api/auth/sessions", { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} });
    await loadSessions();
    toast({ title: lang === "ru" ? "Все другие сессии завершены" : "All other sessions terminated" });
  };

  // Account deletion
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "удалить") { toast({ title: lang === "ru" ? "Введите слово «удалить» для подтверждения" : "Type «удалить» to confirm", variant: "destructive" }); return; }
    setDeleteLoading(true);
    try {
      const token = sessionStorage.getItem("pulse-token");
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ password: deletePassword }),
      });
      const d = await res.json();
      if (res.ok) {
        toast({ title: lang === "ru" ? "Аккаунт удалён" : "Account deleted" });
        sessionStorage.clear();
        localStorage.removeItem("pulse-accounts");
        window.location.href = "/";
      } else {
        toast({ title: d.error || (lang === "ru" ? "Ошибка удаления" : "Deletion failed"), variant: "destructive" });
      }
    } catch {
      toast({ title: lang === "ru" ? "Ошибка сети" : "Network error", variant: "destructive" });
    }
    setDeleteLoading(false);
  };

  const handleExportData = async () => {
    const token = sessionStorage.getItem("pulse-token");
    const res = await fetch("/api/users/me/export", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) { toast({ title: lang === "ru" ? "Ошибка экспорта" : "Export failed", variant: "destructive" }); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `nova-export-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: lang === "ru" ? "Данные скачаны" : "Data downloaded" });
  };

  // Storage
  const [storageSize, setStorageSize] = useState("0");
  const [cacheCleared, setCacheCleared] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Settings navigation — sidebar active section (null = show sidebar on mobile)
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Events
  const [showEvents, setShowEvents] = useState(() => lsb("pulse-show-events", true));

  // Chat Settings
  const [linkPreview, setLinkPreview] = useState(() => lsb("pulse-link-preview", true));
  const [sendOnEnter, setSendOnEnter] = useState(() => lsb("pulse-send-on-enter", true));
  const [animatedEmoji, setAnimatedEmoji] = useState(() => lsb("pulse-animated-emoji", true));
  const [msgEffects, setMsgEffects] = useState(() => lsb("pulse-msg-effects", true));
  const [msgGroupDate, setMsgGroupDate] = useState(() => lsb("pulse-msg-group-date", true));

  // Advanced
  const [dataSaver, setDataSaver] = useState(() => lsb("pulse-data-saver", false));
  const [autoDownload, setAutoDownload] = useState(() => lsb("pulse-auto-download", true));

  // Battery
  const [powerSaving, setPowerSaving] = useState(() => lsb("pulse-power-saving", false));


  // Apply font size globally
  useEffect(() => {
    const opt = FONT_SIZE_OPTIONS.find(f => f.value === fontSize);
    if (opt) document.documentElement.style.fontSize = opt.size;
  }, [fontSize, lang]);

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
      setOnlineStatus((user.status as any) || "online");
      if ((user as any).readReceiptsEnabled !== undefined) setReadReceipts(!!(user as any).readReceiptsEnabled);
      if ((user as any).showOnlineStatus !== undefined) setShowOnlineStatusToggle(!!(user as any).showOnlineStatus);
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

      onlineStatus !== ((user.status as any) || "online");
    setHasChanges(changed);
  }, [displayName, bio, statusText, avatarColor, avatarUrl, onlineStatus, user]);

  const handleSave = () => {
    updateMe.mutate(
      {
        data: {
          displayName,
          bio,
          avatarColor,
          statusText,
          avatarUrl: avatarUrl || undefined,
          status: onlineStatus,
        } as any,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
          queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
          setHasChanges(false);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
          toast({ title: t("settings.saveSuccess"), description: t("settings.saveSuccessDesc") });
        },
        onError: () => {
          toast({ title: t("settings.saveError"), description: t("settings.saveErrorDesc"), variant: "destructive" });
        },
      }
    );
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({ title: t("common.error"), description: lang === "ru" ? "Заполните все поля." : "Fill in all fields.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t("common.error"), description: lang === "ru" ? "Новые пароли не совпадают." : "New passwords don't match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: t("common.error"), description: lang === "ru" ? "Пароль — минимум 6 символов." : "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setPwLoading(true);
    try {
      const uid = sessionStorage.getItem("pulse-user-id");
      const token = sessionStorage.getItem("pulse-token");
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: t("common.error"), description: data.error || (lang === "ru" ? "Ошибка смены пароля." : "Password change error."), variant: "destructive" });
      } else {
        toast({ title: t("settings.passwordChanged"), description: t("settings.passwordChangedDesc") });
        setShowChangePassword(false);
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      }
    } catch {
      toast({ title: t("common.error"), description: lang === "ru" ? "Ошибка соединения." : "Connection error.", variant: "destructive" });
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
    toast({ title: t("settings.cacheCleared"), description: t("settings.cacheClearedDesc") });
  };

  const handleCopyProfileLink = () => {
    const link = `${window.location.origin}/profile/${user?.id || ""}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast({ title: t("settings.linkCopied"), description: t("settings.linkCopiedDesc") });
  };

  const handleEndSessions = () => {
    const token = sessionStorage.getItem("pulse-token");
    const userId = sessionStorage.getItem("pulse-user-id");
    const tabOwned = sessionStorage.getItem("pulse-tab-owned");
    sessionStorage.clear();
    if (token) sessionStorage.setItem("pulse-token", token);
    if (userId) sessionStorage.setItem("pulse-user-id", userId);
    if (tabOwned) sessionStorage.setItem("pulse-tab-owned", tabOwned);
    toast({ title: lang === "ru" ? "Готово" : "Done", description: lang === "ru" ? "Все другие сессии завершены." : "All other sessions ended." });
  };

  const handleChangeUsername = async () => {
    const trimmed = newUsername.trim().toLowerCase();
    if (!trimmed) { setUsernameError(lang === "ru" ? "Введите новый никнейм" : "Enter a new username"); return; }
    if (trimmed.length < 3 || trimmed.length > 32) { setUsernameError(lang === "ru" ? "От 3 до 32 символов" : "3 to 32 characters"); return; }
    if (!/^[a-z0-9_]+$/.test(trimmed)) { setUsernameError(lang === "ru" ? "Только латинские буквы, цифры и _" : "Letters, digits and _ only"); return; }
    setUsernameLoading(true);
    setUsernameError("");
    try {
      const uid = sessionStorage.getItem("pulse-user-id");
      const token = sessionStorage.getItem("pulse-token");
      const res = await fetch("/api/users/me/username", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUsernameError(data.error || (lang === "ru" ? "Ошибка смены никнейма" : "Username change error"));
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
        setShowUsernameEdit(false);
        setNewUsername("");
        toast({ title: lang === "ru" ? "Никнейм изменён" : "Username changed", description: `@${data.username}` });
      }
    } catch {
      setUsernameError(lang === "ru" ? "Ошибка соединения" : "Connection error");
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
    if (lang === "ru") {
      if (days > 0) return `${days} ${days === 1 ? "день" : days < 5 ? "дня" : "дней"}`;
      return `${hours} ${hours === 1 ? "час" : hours < 5 ? "часа" : "часов"}`;
    } else {
      if (days > 0) return `${days} ${days === 1 ? "day" : "days"}`;
      return `${hours} ${hours === 1 ? "hour" : "hours"}`;
    }
  };

  const usernameCooldown = getUsernameCooldown();

  const setLs = (key: string, val: boolean | string) => localStorage.setItem(key, String(val));

  const avatarPreview = avatarUrl || null;
  const currentStatusOpt = ONLINE_STATUS_OPTIONS.find(o => o.value === onlineStatus)!;
  const displaySection = activeSection ?? "account";

  return (
    <div className="flex-1 flex h-full bg-background overflow-hidden">
      {/* Header */}
      {/* ══════════════════════════════════════════════════════
          LEFT SIDEBAR — Telegram-style navigation
      ══════════════════════════════════════════════════════ */}
      <div className={cn(
        "flex-col h-full bg-background border-r border-border shrink-0",
        "md:flex md:w-[300px]",
        activeSection === null ? "flex w-full" : "hidden"
      )}>
        {/* Sidebar header */}
        <div className="border-b border-border flex items-center px-5 bg-card/90 backdrop-blur-xl shrink-0 relative overflow-hidden" style={{ minHeight: "calc(4rem + env(safe-area-inset-top, 0px))", paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/6 via-transparent to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, rgba(234,88,12,0.15), rgba(234,88,12,0.05))", border: "1px solid rgba(234,88,12,0.2)" }}>
              <SettingsIcon size={17} className="text-primary" />
            </div>
            <h1 className="text-xl font-black text-foreground">{t("settings.title")}</h1>
          </div>
        </div>

        {/* Profile card — taps into account section */}
        <button
          onClick={() => setActiveSection("account")}
          className={cn(
            "flex items-center gap-4 px-6 py-4 w-full text-left transition-colors border-b border-border",
            displaySection === "account" ? "bg-primary/5" : "hover:bg-secondary"
          )}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0 overflow-hidden shadow-md"
            style={{ backgroundColor: avatarColor }}
          >
            {avatarPreview
              ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              : (displayName[0]?.toUpperCase() || "?")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base truncate">{displayName || user?.displayName || "..."}</p>
            <p className="text-sm text-muted-foreground truncate">@{user?.username}</p>
          </div>
          <ChevronRight size={18} className="text-muted-foreground shrink-0" />
        </button>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto scrollbar-none py-2 pb-24 md:pb-2">

          {/* Group 1: Main settings */}
          <NavGroup>
            <NavItem id="account"       icon={<User size={16}/>}           color="bg-blue-500"                                        label={lang==="ru"?"Мой аккаунт":"My Account"}           active={displaySection} onClick={setActiveSection}/>
            <NavItem id="notifications" icon={<Bell size={16}/>}           color="bg-red-500"                                         label={lang==="ru"?"Уведомления и звуки":"Notifications & Sounds"} active={displaySection} onClick={setActiveSection}/>
            <NavItem id="privacy"       icon={<Lock size={16}/>}           color="bg-gray-500"                                        label={lang==="ru"?"Конфиденц. и безопасность":"Privacy & Security"} active={displaySection} onClick={setActiveSection}/>
            <NavItem id="chat-settings" icon={<MessageSquare size={16}/>}  color="bg-green-600"                                       label={lang==="ru"?"Настройки чатов":"Chat Settings"}    active={displaySection} onClick={setActiveSection}/>
            <NavItem id="folders"       icon={<FolderOpen size={16}/>}     color="bg-sky-500"                                         label={lang==="ru"?"Папки с чатами":"Folders"}           active={displaySection} onClick={setActiveSection}/>
            <NavItem id="advanced"      icon={<SlidersHorizontal size={16}/>} color="bg-slate-600"                                    label={lang==="ru"?"Расширенные":"Advanced"}              active={displaySection} onClick={setActiveSection}/>
            <NavItem id="speakers"      icon={<Headphones size={16}/>}     color="bg-orange-500"                                      label={lang==="ru"?"Динамики и камера":"Speakers & Camera"} active={displaySection} onClick={setActiveSection}/>
            <NavItem id="battery"       icon={<Battery size={16}/>}        color="bg-emerald-600"                                     label={lang==="ru"?"Батарея и анимации":"Battery & Animations"} active={displaySection} onClick={setActiveSection}/>
          </NavGroup>

          {/* Group 2: Interface */}
          <NavGroup>
            <NavItem id="language" icon={<Globe size={16}/>}   color="bg-blue-600"   label={lang==="ru"?"Язык":"Language"}             badge={lang==="ru"?"Русский":"English"}  active={displaySection} onClick={setActiveSection}/>
          </NavGroup>

          {/* Group 3: Premium */}
          <NavGroup>
            <NavItem id="prime" icon={<Crown size={16}/>} color="bg-gradient-to-br from-amber-400 to-orange-500"
              label="Aura Prime"
              badge={(user as any)?.hasPrime ? (lang==="ru"?"Активен":"Active") : undefined}
              badgeAmber={(user as any)?.hasPrime}
              active={displaySection} onClick={setActiveSection}/>


          </NavGroup>

          {/* Group 4: Help */}
          <NavGroup>
            <NavItem id="faq"      icon={<HelpCircle size={16}/>} color="bg-teal-500"   label="Aura FAQ"                                   active={displaySection} onClick={setActiveSection}/>
            <NavItem id="support"  icon={<Shield size={16}/>}     color="bg-green-600"  label={lang==="ru"?"Поддержка":"Support"}             active={displaySection} onClick={setActiveSection}/>
          </NavGroup>

          {/* Logout */}
          <div className="mx-3 mt-1 mb-8">
            <button
              onClick={() => setShowLogoutDialog(true)}
              className="flex items-center gap-2.5 text-destructive hover:bg-destructive/8 px-4 py-3 rounded-xl font-semibold transition-colors w-full text-sm"
            >
              <LogOut size={17} /> {t("settings.logout")}
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          RIGHT CONTENT PANEL
      ══════════════════════════════════════════════════════ */}
      <div className={cn(
        "flex-col h-full overflow-hidden flex-1",
        "md:flex",
        activeSection !== null ? "flex" : "hidden"
      )}>

        {/* Content header */}
        <header className="border-b border-border flex items-center px-5 gap-3 bg-card/90 backdrop-blur-xl shrink-0 relative overflow-hidden" style={{ minHeight: "calc(4rem + env(safe-area-inset-top, 0px))", paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
          <button
            onClick={() => setActiveSection(null)}
            className="md:hidden w-9 h-9 rounded-xl hover:bg-secondary flex items-center justify-center text-muted-foreground transition-colors shrink-0 relative z-10"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-black flex-1 truncate text-foreground relative z-10">
            {displaySection === "account"       ? (lang==="ru"?"Мой аккаунт":"My Account")
            : displaySection === "notifications" ? (lang==="ru"?"Уведомления и звуки":"Notifications & Sounds")
            : displaySection === "privacy"       ? (lang==="ru"?"Конфиденциальность и безопасность":"Privacy & Security")
            : displaySection === "chat-settings" ? (lang==="ru"?"Настройки чатов":"Chat Settings")
            : displaySection === "folders"       ? (lang==="ru"?"Папки с чатами":"Folders")
            : displaySection === "advanced"      ? (lang==="ru"?"Расширенные":"Advanced")
            : displaySection === "speakers"      ? (lang==="ru"?"Динамики и камера":"Speakers & Camera")
            : displaySection === "battery"       ? (lang==="ru"?"Батарея и анимации":"Battery & Animations")
            : displaySection === "language"      ? (lang==="ru"?"Язык":"Language")
            : displaySection === "prime"         ? "Aura Prime"

            : displaySection === "faq"           ? "Aura FAQ"
            : displaySection === "support"       ? (lang==="ru"?"Поддержка":"Support")
            : ""}
          </h2>
          {displaySection === "account" && hasChanges && (
            <button
              onClick={handleSave}
              disabled={updateMe.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
            >
              {saved ? <CheckCircle size={16}/> : <Save size={16}/>}
              {saved ? t("common.saved") : t("common.save")}
            </button>
          )}
        </header>

        {/* Scrollable section content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 space-y-6">

          {/* ─── MY ACCOUNT ─────────────────────────────────── */}
          {displaySection === "account" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Section title={t("settings.profile")} icon={<Edit3 size={13}/>}>
                <div className="p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-lg overflow-hidden"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {avatarPreview
                        ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" onError={() => setAvatarUrl("")}/>
                        : displayName[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{displayName || "..."}</p>
                      <p className="text-sm text-muted-foreground truncate">@{user?.username || "username"}</p>
                      {statusText && <p className="text-xs text-muted-foreground mt-0.5 truncate">{statusText}</p>}
                    </div>
                    <button
                      onClick={handleCopyProfileLink}
                      className="shrink-0 p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                      title={t("settings.copyLink")}
                    >
                      {linkCopied ? <Check size={18} className="text-green-500"/> : <Copy size={18}/>}
                    </button>
                  </div>

                  <div className="mb-3">
                    <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                      <Camera size={11}/> {t("settings.avatarUrl")}
                    </Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => avatarFileRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                      >
                        <Upload size={14}/> {lang==="ru"?"Загрузить фото":"Upload photo"}
                      </button>
                      {(user as any)?.hasPrime && (
                        <button
                          type="button"
                          onClick={() => videoAvatarRef.current?.click()}
                          className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded-xl text-sm text-purple-400 hover:bg-purple-500/20 transition-colors"
                        >
                          <span className="text-[12px]">🎬</span> {lang==="ru"?"Видео-аватар":"Video avatar"}
                        </button>
                      )}
                      {avatarUrl && (
                        <button type="button" onClick={() => setAvatarUrl("")}
                          className="px-3 py-2 text-sm text-destructive/70 hover:text-destructive transition-colors">
                          {lang==="ru"?"Удалить":"Remove"}
                        </button>
                      )}
                    </div>
                    <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile}/>
                    <input ref={videoAvatarRef} type="file" accept="video/*" className="hidden" onChange={handleVideoAvatarFile}/>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">{t("settings.avatarColor")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_COLORS.map(color => (
                        <button key={color} onClick={() => setAvatarColor(color)}
                          className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${avatarColor === color ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-110" : ""}`}
                          style={{ backgroundColor: color }}/>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-4 border-t border-border">
                  <div>
                    <Label className="text-sm font-medium mb-1 block">{t("settings.displayName")}</Label>
                    <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={t("settings.displayNamePlaceholder")} className="bg-background"/>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-1 block flex items-center gap-1.5"><User size={13}/> {t("settings.username")}</Label>
                    {!showUsernameEdit ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground">
                          <span className="text-muted-foreground">@</span>
                          <span className="font-mono">{user?.username || "—"}</span>
                        </div>
                        {usernameCooldown ? (
                          <div className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl shrink-0">
                            <Clock size={13} className="text-yellow-500 shrink-0"/>
                            <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium whitespace-nowrap">{t("settings.usernameCooldown")} {usernameCooldown}</span>
                          </div>
                        ) : (
                          <button onClick={() => { setShowUsernameEdit(true); setNewUsername(user?.username || ""); setUsernameError(""); }}
                            className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 border border-primary/20 rounded-xl text-primary text-xs font-medium hover:bg-primary/20 transition-colors shrink-0">
                            <Edit3 size={13}/> {t("settings.usernameChange")}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center border border-border rounded-xl overflow-hidden bg-background focus-within:border-primary transition-colors">
                            <span className="px-3 text-muted-foreground text-sm font-mono select-none">@</span>
                            <input value={newUsername}
                              onChange={e => { setNewUsername(e.target.value); setUsernameError(""); }}
                              onKeyDown={e => { if (e.key==="Enter") handleChangeUsername(); if (e.key==="Escape") setShowUsernameEdit(false); }}
                              placeholder={user?.username || "new_username"} autoFocus
                              className="flex-1 py-2 pr-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-mono"
                              maxLength={32}/>
                          </div>
                          <button onClick={handleChangeUsername} disabled={usernameLoading}
                            className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0">
                            {usernameLoading ? "..." : t("settings.usernameSave")}
                          </button>
                          <button onClick={() => { setShowUsernameEdit(false); setUsernameError(""); }}
                            className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground shrink-0">
                            <X size={16}/>
                          </button>
                        </div>
                        {usernameError && <div className="flex items-center gap-1.5 text-xs text-red-500"><AlertTriangle size={12} className="shrink-0"/> {usernameError}</div>}
                        <p className="text-xs text-muted-foreground">{t("settings.usernameNote")}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-1 block">{t("settings.bio")}</Label>
                    <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder={t("settings.bioPlaceholder")} rows={3} className="bg-background resize-none"/>
                  </div>
                </div>

                <div className="p-4 border-t border-border">
                  <Label className="text-sm font-medium mb-2 block">{t("settings.statusText")}</Label>
                  <Input value={statusText} onChange={e => setStatusText(e.target.value)} placeholder={t("settings.statusPlaceholder")} className="bg-background mb-3"/>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_PRESETS.map(preset => {
                      const presetText = `${preset.emoji} ${lang==="ru" ? preset.ru : preset.en}`;
                      return (
                        <button key={preset.ru} onClick={() => setStatusText(presetText)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${statusText===presetText ? "bg-primary/10 border-primary text-primary" : "border-border hover:border-primary/50 hover:bg-secondary"}`}>
                          {presetText}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Section>

              <Section title={t("settings.onlineStatus")} icon={<Radio size={13}/>}>
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-2">
                    {ONLINE_STATUS_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setOnlineStatus(opt.value)}
                        className={`p-3 rounded-xl border text-left transition-all ${onlineStatus===opt.value ? "border-primary bg-primary/8" : "border-border hover:border-primary/30 hover:bg-secondary"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2.5 h-2.5 rounded-full ${opt.color}`}/>
                          <span className="text-sm font-medium">{opt.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </Section>

              {hasChanges && (
                <div className="sticky bottom-0 bg-card/95 backdrop-blur-md border border-border p-4 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
                  <p className="text-sm text-muted-foreground">{t("settings.unsavedChanges")}</p>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => { if (user) { setDisplayName(user.displayName||""); setBio(user.bio||""); setStatusText((user as any).statusText||""); setAvatarColor(user.avatarColor||"#3B82F6"); setAvatarUrl((user as any).avatarUrl||""); setOnlineStatus((user.status as any)||"online"); }}}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors border border-border">
                      {t("common.cancel")}
                    </button>
                    <button onClick={handleSave} disabled={updateMe.isPending}
                      className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                      {saved ? <CheckCircle size={16}/> : <Save size={16}/>}
                      {updateMe.isPending ? t("common.saving") : saved ? t("common.saved") : t("common.save")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── NOTIFICATIONS ─────────────────────────────── */}
          {displaySection === "notifications" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <NotificationPermissionBanner/>
              <Section title={t("settings.notifications")} icon={<Bell size={13}/>}>
                <Row icon={<Bell size={18}/>} color="bg-primary/10 text-primary"
                  label={t("settings.notifyMessages")} desc={t("settings.notifyMessagesDesc")}
                  right={<Switch checked={notifyMessages} onCheckedChange={v => { setNotifyMessages(v); setLs("pulse-notify-messages", v); toast({ title: v ? t("notify.on") : t("notify.off"), description: t("settings.notifyMessages") }); }}/>}/>
                <Row icon={<Volume2 size={18}/>} color="bg-blue-500/10 text-blue-500"
                  label={t("settings.notifySounds")} desc={t("settings.notifySoundsDesc")}
                  right={<Switch checked={notifySounds} onCheckedChange={v => { setNotifySounds(v); setLs("pulse-notify-sounds", v); toast({ title: v ? t("notify.on") : t("notify.off"), description: t("settings.notifySounds") }); }}/>}/>
                <Row icon={<Gift size={18}/>} color="bg-pink-500/10 text-pink-500"
                  label={t("settings.notifyGifts")} desc={t("settings.notifyGiftsDesc")}
                  right={<Switch checked={notifyGifts} onCheckedChange={v => { setNotifyGifts(v); setLs("pulse-notify-gifts", v); }}/>}/>
                <Row icon={<PhoneCall size={18}/>} color="bg-green-500/10 text-green-500"
                  label={t("settings.notifyCalls")} desc={t("settings.notifyCallsDesc")}
                  right={<Switch checked={notifyCalls} onCheckedChange={v => { setNotifyCalls(v); setLs("pulse-notify-calls", v); }}/>}/>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl"><Eye size={18}/></div>
                      <div>
                        <p className="text-sm font-medium">{t("settings.notifyPreview")}</p>
                        <p className="text-xs text-muted-foreground">{notifyPreview ? t("settings.notifyPreviewOn") : t("settings.notifyPreviewOff")}</p>
                      </div>
                    </div>
                    <Switch checked={notifyPreview} onCheckedChange={v => { setNotifyPreview(v); setLs("pulse-notify-preview", v); }}/>
                  </div>
                  {!notifyMessages && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
                      <BellOff size={13}/> {t("settings.notifyDisabled")}
                    </div>
                  )}
                </div>
              </Section>

              {/* Ringtone Picker — available to all users */}
              <Section
                title={lang === "ru" ? "Мелодия звонка" : "Ringtone"}
                icon={<PhoneCall size={13}/>}
              >
                <div className="p-4">
                  <p className="text-xs text-muted-foreground mb-4">
                    {lang === "ru"
                      ? "Выберите мелодию для входящих звонков"
                      : "Choose the ringtone for incoming calls"}
                  </p>
                  {/* Hidden file input for custom ringtone */}
                  <input
                    ref={customRingtoneInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleCustomRingtoneFile}
                  />
                  <div className="space-y-2">
                    {RINGTONES.map(rt => (
                      <div
                        key={rt.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          ringtone === rt.id
                            ? "border-primary bg-primary/8"
                            : "border-border hover:border-primary/40 bg-secondary/30"
                        }`}
                        onClick={() => {
                          if (rt.id === "custom") {
                            customRingtoneInputRef.current?.click();
                            return;
                          }
                          setRingtone(rt.id);
                          localStorage.setItem("pulse-ringtone", rt.id);
                          previewRingtone(rt.id);
                        }}
                      >
                        <span className="text-xl shrink-0">{rt.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{rt.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {rt.id === "custom" && customRingtoneName
                              ? customRingtoneName
                              : rt.desc}
                          </p>
                        </div>
                        {ringtone === rt.id ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {rt.id === "custom" && (
                              <button
                                className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors text-[11px] font-medium"
                                onClick={e => { e.stopPropagation(); customRingtoneInputRef.current?.click(); }}
                              >
                                {lang === "ru" ? "Изменить" : "Change"}
                              </button>
                            )}
                            <CheckCircle size={18} className="text-primary" />
                          </div>
                        ) : (
                          rt.id !== "custom" && (
                            <button
                              className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                              onClick={e => { e.stopPropagation(); previewRingtone(rt.id); }}
                              title={lang === "ru" ? "Прослушать" : "Preview"}
                            >
                              <Play size={14}/>
                            </button>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Section>

              {/* Prime+ Custom Notification Sounds */}
              {(user as any)?.hasPrime && (
                <Section
                  title={lang==="ru"?"Звук уведомлений (Prime+)":"Notification Sound (Prime+)"}
                  icon={<Headphones size={13}/>}
                >
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground mb-4">
                      {lang==="ru"?"Выберите звук для входящих сообщений":"Choose notification sound for incoming messages"}
                    </p>
                    <div className="space-y-2">
                      {[
                        { id: "classic", label: lang==="ru"?"Классический":"Classic", desc: lang==="ru"?"Стандартный звук Aura":"Standard Aura tone", icon: "🔔" },
                        { id: "pulse", label: "Aura Beat", desc: lang==="ru"?"Двойной тон":"Double tone", icon: "💫" },
                        { id: "chime", label: lang==="ru"?"Перезвон":"Chime", desc: lang==="ru"?"Мелодичный звон":"Melodic chime", icon: "🎵" },
                        { id: "soft", label: lang==="ru"?"Мягкий":"Soft", desc: lang==="ru"?"Тихий и спокойный":"Quiet and calm", icon: "🌙" },
                        { id: "space", label: "Space Echo", desc: "Prime+", icon: "🚀", prime: true },
                        { id: "crystal", label: "Crystal Bell", desc: "Prime+", icon: "💎", prime: true },
                        { id: "deep", label: "Deep Bass", desc: "Prime+", icon: "⚡", prime: true },
                      ].filter(s => !s.prime || (user as any)?.primeTier === "prime_plus").map(sound => (
                        <div
                          key={sound.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            notificationSound === sound.id
                              ? "border-primary bg-primary/8"
                              : "border-border hover:border-primary/40 bg-secondary/30"
                          }`}
                          onClick={() => {
                            setNotificationSound(sound.id);
                            localStorage.setItem("pulse-notification-sound", sound.id);
                            try {
                              const ctx = new AudioContext();
                              const gain = ctx.createGain();
                              gain.connect(ctx.destination);
                              gain.gain.setValueAtTime(0, ctx.currentTime);
                              gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02);
                              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
                              const plays: { freq: number; type: OscillatorType; start: number; dur: number }[] = 
                                sound.id === "classic" ? [{ freq: 880, type: "sine", start: 0, dur: 0.5 }]
                                : sound.id === "pulse" ? [{ freq: 880, type: "sine", start: 0, dur: 0.2 }, { freq: 1100, type: "sine", start: 0.2, dur: 0.2 }]
                                : sound.id === "chime" ? [{ freq: 1047, type: "sine", start: 0, dur: 0.3 }, { freq: 1319, type: "sine", start: 0.15, dur: 0.3 }, { freq: 1568, type: "sine", start: 0.3, dur: 0.4 }]
                                : sound.id === "soft" ? [{ freq: 440, type: "sine", start: 0, dur: 0.7 }]
                                : sound.id === "space" ? [{ freq: 220, type: "sine", start: 0, dur: 0.4 }, { freq: 440, type: "sine", start: 0.2, dur: 0.4 }, { freq: 880, type: "sine", start: 0.4, dur: 0.4 }]
                                : sound.id === "crystal" ? [{ freq: 2093, type: "sine", start: 0, dur: 0.5 }, { freq: 2637, type: "sine", start: 0.1, dur: 0.5 }]
                                : [{ freq: 110, type: "sine", start: 0, dur: 0.6 }, { freq: 82, type: "sine", start: 0.1, dur: 0.6 }];
                              plays.forEach(p => {
                                const o = ctx.createOscillator();
                                o.type = p.type;
                                o.frequency.value = p.freq;
                                o.connect(gain);
                                o.start(ctx.currentTime + p.start);
                                o.stop(ctx.currentTime + p.start + p.dur);
                              });
                              setTimeout(() => ctx.close(), 2000);
                            } catch {}
                          }}
                        >
                          <span className="text-xl shrink-0">{sound.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{sound.label}</p>
                            <p className="text-xs text-muted-foreground">{sound.desc}</p>
                          </div>
                          {notificationSound === sound.id && (
                            <CheckCircle size={18} className="text-primary shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Section>
              )}
            </div>
          )}

          {/* ─── PRIVACY & SECURITY ────────────────────────── */}
          {displaySection === "privacy" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Section title={t("settings.privacy")} icon={<Shield size={13}/>}>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-teal-500/10 text-teal-500 rounded-xl"><Clock size={18}/></div>
                    <div>
                      <p className="text-sm font-medium">{t("settings.lastSeen")}</p>
                      <p className="text-xs text-muted-foreground">{t("settings.lastSeenDesc")}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {LAST_SEEN_OPTIONS.map(opt => (
                      <button key={opt.value}
                        onClick={() => { setLastSeenVisibility(opt.value); setLs("pulse-privacy-last-seen", opt.value); toast({ title: t("common.saved"), description: `${t("settings.lastSeen")}: ${opt.label}` }); }}
                        className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all flex flex-col items-center gap-0.5 ${lastSeenVisibility===opt.value ? "border-primary bg-primary/8 text-primary" : "border-border hover:border-primary/30"}`}>
                        {opt.label}
                        {lastSeenVisibility===opt.value && <CheckCircle size={10} className="text-primary"/>}
                      </button>
                    ))}
                  </div>
                </div>
                <Row icon={<CheckCircle size={18}/>} color="bg-blue-500/10 text-blue-500"
                  label={t("settings.readReceipts")} desc={t("settings.readReceiptsDesc")}
                  right={<Switch checked={readReceipts} onCheckedChange={v => { setReadReceipts(v); setLs("pulse-privacy-read-receipts", v); updateMe.mutate({ data: { readReceiptsEnabled: v } as any }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/users/me"] }) }); toast({ title: t("common.saved") }); }}/>}/>
                <Row icon={<User size={18}/>} color="bg-green-500/10 text-green-500"
                  label={t("settings.showOnlineStatus")}
                  desc={(user as any)?.hasPrime ? t("settings.showOnlineStatusDesc") : (lang==="ru"?"Только для Aura Prime участников":"Aura Prime members only")}
                  right={(user as any)?.hasPrime
                    ? <Switch checked={showOnlineStatusToggle} onCheckedChange={v => { setShowOnlineStatusToggle(v); setLs("pulse-privacy-show-online", v); updateMe.mutate({ data: { showOnlineStatus: v } as any }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/users/me"] }) }); }}/>
                    : <a href="/prime" className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"><Crown size={9}/> Prime</a>}/>
                <Row icon={<Camera size={18}/>} color="bg-violet-500/10 text-violet-500"
                  label={t("settings.profilePhoto")} desc={profilePhotoVisible ? t("settings.profilePhotoOn") : t("settings.profilePhotoOff")}
                  right={<Switch checked={profilePhotoVisible} onCheckedChange={v => { setProfilePhotoVisible(v); setLs("pulse-privacy-photo-visible", v); }}/>}/>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl"><Flame size={18}/></div>
                    <div>
                      <p className="text-sm font-medium">{t("autodelete.globalDefault")}</p>
                      <p className="text-xs text-muted-foreground">{t("autodelete.globalDefaultDesc")}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[{ label: t("autodelete.off"), value: null },{ label:"5с",value:5},{ label:"1м",value:60},{ label:"1ч",value:3600},{ label:"1д",value:86400},{ label:"1нед",value:604800}].map(opt => (
                      <button key={String(opt.value)}
                        onClick={() => { setGlobalAutoDelete(opt.value); localStorage.setItem("pulse-global-auto-delete", String(opt.value)); toast({ title: t("common.saved") }); }}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${globalAutoDelete===opt.value ? "border-primary bg-primary/8 text-primary" : "border-border hover:border-primary/30"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </Section>

              <Section title={t("settings.security")} icon={<ShieldCheck size={13}/>}>
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary transition-colors" onClick={() => setShowChangePassword(!showChangePassword)}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl"><Key size={18}/></div>
                    <div>
                      <p className="text-sm font-medium">{t("settings.changePassword")}</p>
                      <p className="text-xs text-muted-foreground">{t("settings.changePasswordDesc")}</p>
                    </div>
                  </div>
                  {showChangePassword ? <ChevronDown size={18} className="text-muted-foreground"/> : <ChevronRight size={18} className="text-muted-foreground"/>}
                </div>
                {showChangePassword && (
                  <div className="p-4 space-y-3 bg-background/50">
                    <div className="relative">
                      <Label className="text-sm mb-1 block">{t("settings.currentPassword")}</Label>
                      <Input type={showCurrentPw?"text":"password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder={t("settings.currentPassword")} className="bg-background pr-10"/>
                      <button type="button" onClick={() => setShowCurrentPw(v => !v)} className="absolute right-3 bottom-2.5 text-muted-foreground hover:text-foreground">{showCurrentPw ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                    </div>
                    <div className="relative">
                      <Label className="text-sm mb-1 block">{t("settings.newPassword")}</Label>
                      <Input type={showNewPw?"text":"password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t("settings.passwordMinLength")} className="bg-background pr-10"/>
                      <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 bottom-2.5 text-muted-foreground hover:text-foreground">{showNewPw ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                    </div>
                    <div>
                      <Label className="text-sm mb-1 block">{t("settings.confirmPassword")}</Label>
                      <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t("settings.confirmPassword")} className="bg-background"/>
                    </div>
                    {newPassword && confirmPassword && newPassword!==confirmPassword && <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle size={12}/> {t("settings.passwordMismatch")}</p>}
                    <button onClick={handleChangePassword} disabled={pwLoading}
                      className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                      {pwLoading ? t("settings.passwordChanging") : t("settings.passwordChange")}
                    </button>
                  </div>
                )}
                {/* Active Sessions Manager */}
                <div className="border-t border-border/50">
                  <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary transition-colors"
                    onClick={() => { setShowSessions(v => !v); if (!showSessions) loadSessions(); }}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 text-primary rounded-xl"><Monitor size={18}/></div>
                      <div>
                        <p className="text-sm font-medium">{lang==="ru"?"Активные сессии":"Active Sessions"}</p>
                        <p className="text-xs text-muted-foreground">{lang==="ru"?"Управление устройствами, где выполнен вход":"Manage logged-in devices"}</p>
                      </div>
                    </div>
                    {showSessions ? <ChevronDown size={18} className="text-muted-foreground"/> : <ChevronRight size={18} className="text-muted-foreground"/>}
                  </div>
                  {showSessions && (
                    <div className="px-4 pb-4 space-y-2 bg-background/50">
                      {sessionsLoading ? (
                        <p className="text-xs text-muted-foreground text-center py-3">{lang==="ru"?"Загрузка...":"Loading..."}</p>
                      ) : sessions.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-3">{lang==="ru"?"Нет активных сессий":"No active sessions"}</p>
                      ) : (
                        <>
                          {sessions.map(s => (
                            <div key={s.id} className={`flex items-start justify-between p-3 rounded-xl border ${s.isCurrent ? "border-primary/30 bg-primary/5" : "border-border/50 bg-card"}`}>
                              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                <Smartphone size={16} className={s.isCurrent ? "text-primary mt-0.5 shrink-0" : "text-muted-foreground mt-0.5 shrink-0"}/>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate">{s.device.length > 60 ? s.device.slice(0,60)+"…" : s.device}</p>
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin size={9}/>{s.ip}</p>
                                  <p className="text-[10px] text-muted-foreground">{lang==="ru"?"Последняя активность:":"Last active:"} {new Date(s.lastActiveAt).toLocaleString(lang==="ru"?"ru-RU":"en-US",{dateStyle:"short",timeStyle:"short"})}</p>
                                  {s.isCurrent && <span className="text-[10px] text-primary font-semibold">{lang==="ru"?"Это устройство":"This device"}</span>}
                                </div>
                              </div>
                              {!s.isCurrent && (
                                <button onClick={() => revokeSession(s.id)} className="ml-2 p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0">
                                  <X size={14}/>
                                </button>
                              )}
                            </div>
                          ))}
                          {sessions.filter(s => !s.isCurrent).length > 0 && (
                            <button onClick={revokeAllOther} className="w-full py-2 text-xs font-medium text-destructive hover:bg-destructive/8 rounded-xl border border-destructive/20 transition-colors">
                              {lang==="ru"?"Завершить все другие сессии":"Terminate all other sessions"}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <TwoFaSection user={user} toast={toast} lang={lang}/>
                <ScreenLockSection lang={lang} toast={toast}/>
                <SecurityQuestionSection lang={lang} toast={toast}/>
              </Section>

              {/* Data & Privacy section */}
              <Section title={lang==="ru"?"Данные и конфиденциальность":"Data & Privacy"} icon={<Database size={13}/>}>
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary transition-colors" onClick={handleExportData}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl"><Download size={18}/></div>
                    <div>
                      <p className="text-sm font-medium">{lang==="ru"?"Скачать мои данные":"Download My Data"}</p>
                      <p className="text-xs text-muted-foreground">{lang==="ru"?"Экспорт данных (152-ФЗ)":"Export your data (GDPR)"}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground"/>
                </div>

                <div className="p-4 flex items-center justify-between hover:bg-secondary transition-colors border-t border-border/50 cursor-pointer" onClick={() => setLocation("/privacy")}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 text-green-500 rounded-xl"><Shield size={18}/></div>
                    <div>
                      <p className="text-sm font-medium">{lang==="ru"?"Политика конфиденциальности":"Privacy Policy"}</p>
                      <p className="text-xs text-muted-foreground">{lang==="ru"?"Как мы обрабатываем ваши данные (152-ФЗ)":"How we handle your data"}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground"/>
                </div>

                <div className="p-4 flex items-center justify-between hover:bg-secondary transition-colors border-t border-border/50 cursor-pointer" onClick={() => setLocation("/terms")}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl"><FileText size={18}/></div>
                    <div>
                      <p className="text-sm font-medium">{lang==="ru"?"Пользовательское соглашение":"Terms of Service"}</p>
                      <p className="text-xs text-muted-foreground">{lang==="ru"?"Правила использования Сервиса":"Rules of using the Service"}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground"/>
                </div>

                {/* Delete Account */}
                <div className="border-t border-border/50">
                  <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary transition-colors"
                    onClick={() => setShowDeleteAccount(v => !v)}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-destructive/10 text-destructive rounded-xl"><Trash2 size={18}/></div>
                      <div>
                        <p className="text-sm font-medium text-destructive">{lang==="ru"?"Удалить аккаунт":"Delete Account"}</p>
                        <p className="text-xs text-muted-foreground">{lang==="ru"?"Безвозвратное удаление всех данных":"Permanently delete all your data"}</p>
                      </div>
                    </div>
                    {showDeleteAccount ? <ChevronDown size={18} className="text-muted-foreground"/> : <ChevronRight size={18} className="text-muted-foreground"/>}
                  </div>
                  {showDeleteAccount && (
                    <div className="px-4 pb-4 space-y-3 bg-destructive/3">
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                        <p className="text-xs text-destructive font-medium flex items-center gap-1.5"><AlertTriangle size={12}/> {lang==="ru"?"Внимание! Это действие необратимо":"Warning! This action is irreversible"}</p>
                        <p className="text-xs text-muted-foreground mt-1">{lang==="ru"?"Все ваши сообщения, чаты, история звонков и другие данные будут удалены навсегда.":"All your messages, chats, call history and other data will be permanently deleted."}</p>
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">{lang==="ru"?"Введите пароль":"Enter your password"}</Label>
                        <Input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} placeholder={lang==="ru"?"Ваш пароль":"Your password"} className="bg-background"/>
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">{lang==="ru"?'Введите слово "удалить" для подтверждения':'Type "удалить" to confirm'}</Label>
                        <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="удалить" className="bg-background font-mono"/>
                      </div>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteLoading || !deletePassword || deleteConfirmText !== "удалить"}
                        className="w-full py-2.5 bg-destructive text-destructive-foreground rounded-xl font-medium text-sm hover:bg-destructive/90 transition-colors disabled:opacity-40">
                        {deleteLoading ? (lang==="ru"?"Удаление...":"Deleting...") : (lang==="ru"?"Удалить мой аккаунт навсегда":"Permanently Delete My Account")}
                      </button>
                    </div>
                  )}
                </div>
              </Section>
            </div>
          )}

          {/* ─── CHAT SETTINGS ─────────────────────────────── */}
          {displaySection === "chat-settings" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Section title={lang==="ru"?"Интерфейс":"Interface"} icon={<Layers size={13}/>}>
                <Row icon={<Calendar size={18}/>} color="bg-violet-500/10 text-violet-500"
                  label={lang==="ru"?"События в меню":"Events in Sidebar"}
                  desc={lang==="ru"?"Показывать раздел «События» в боковом меню":"Show the Events section in the sidebar"}
                  right={<Switch checked={showEvents} onCheckedChange={v => {
                    setShowEvents(v);
                    setLs("pulse-show-events", v);
                    window.dispatchEvent(new CustomEvent("pulse:events-toggle"));
                    toast({ title: v ? (lang==="ru"?"События включены":"Events enabled") : (lang==="ru"?"События скрыты":"Events hidden") });
                  }}/>}/>
              </Section>
              <Section title={lang==="ru"?"Настройки чатов":"Chat Settings"} icon={<MessageSquare size={13}/>}>
                <Row icon={<Link size={18}/>} color="bg-blue-500/10 text-blue-500"
                  label={lang==="ru"?"Предпросмотр ссылок":"Link Preview"}
                  desc={lang==="ru"?"Показывать превью ссылок в сообщениях":"Show link previews in messages"}
                  right={<Switch checked={linkPreview} onCheckedChange={v => { setLinkPreview(v); setLs("pulse-link-preview", v); toast({ title: t("common.saved") }); }}/>}/>
                <Row icon={<MessageSquare size={18}/>} color="bg-green-500/10 text-green-500"
                  label={lang==="ru"?"Отправка по Enter":"Send on Enter"}
                  desc={lang==="ru"?"Enter отправляет сообщение, Shift+Enter — новая строка":"Enter sends message, Shift+Enter for new line"}
                  right={<Switch checked={sendOnEnter} onCheckedChange={v => { setSendOnEnter(v); setLs("pulse-send-on-enter", v); toast({ title: t("common.saved") }); }}/>}/>
                <Row icon={<Zap size={18}/>} color="bg-yellow-500/10 text-yellow-500"
                  label={lang==="ru"?"Анимированные эмодзи":"Animated Emoji"}
                  desc={lang==="ru"?"Воспроизводить анимации эмодзи в чатах":"Play emoji animations in chats"}
                  right={<Switch checked={animatedEmoji} onCheckedChange={v => { setAnimatedEmoji(v); setLs("pulse-animated-emoji", v); toast({ title: t("common.saved") }); }}/>}/>
                <Row icon={<Calendar size={18}/>} color="bg-violet-500/10 text-violet-500"
                  label={lang==="ru"?"Группировка по дате":"Group by Date"}
                  desc={lang==="ru"?"Разделять сообщения по датам":"Separate messages by date"}
                  right={<Switch checked={msgGroupDate} onCheckedChange={v => { setMsgGroupDate(v); setLs("pulse-msg-group-date", v); toast({ title: t("common.saved") }); }}/>}/>
              </Section>
            </div>
          )}

          {/* ─── FOLDERS ───────────────────────────────────── */}
          {displaySection === "folders" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Section title={lang==="ru"?"Папки с чатами":"Chat Folders"} icon={<FolderOpen size={13}/>}>
                {[
                  { key:"all",    label:lang==="ru"?"Все чаты":"All Chats",          emoji:"💬", desc:lang==="ru"?"Все ваши диалоги":"All your conversations" },
                  { key:"unread", label:lang==="ru"?"Непрочитанные":"Unread",        emoji:"🔵", desc:lang==="ru"?"Чаты с новыми сообщениями":"Chats with new messages" },
                  { key:"groups", label:lang==="ru"?"Группы и каналы":"Groups & Channels", emoji:"👥", desc:lang==="ru"?"Групповые чаты и каналы":"Group chats and channels" },

                ].map((folder, idx, arr) => (
                  <div key={folder.key} className={`p-4 flex items-center gap-4 ${idx < arr.length-1 ? "border-b border-border" : ""}`}>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">{folder.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{folder.label}</p>
                      <p className="text-xs text-muted-foreground">{folder.desc}</p>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 bg-secondary rounded-lg text-muted-foreground shrink-0">{lang==="ru"?"Встроено":"Built-in"}</span>
                  </div>
                ))}
              </Section>
              <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0"><FolderOpen size={16}/></div>
                <p className="text-sm text-muted-foreground">{lang==="ru"?"Пользовательские папки появятся в будущих обновлениях":"Custom folders coming in a future update"}</p>
              </div>
            </div>
          )}

          {/* ─── ADVANCED ──────────────────────────────────── */}
          {displaySection === "advanced" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Section title={lang==="ru"?"Загрузка и данные":"Data & Downloads"} icon={<Download size={13}/>}>
                <Row icon={<Download size={18}/>} color="bg-blue-500/10 text-blue-500"
                  label={lang==="ru"?"Экономия трафика":"Data Saver"}
                  desc={lang==="ru"?"Загружать изображения в низком качестве":"Load images in lower quality"}
                  right={<Switch checked={dataSaver} onCheckedChange={v => { setDataSaver(v); setLs("pulse-data-saver", v); toast({ title: t("common.saved") }); }}/>}/>
                <Row icon={<Download size={18}/>} color="bg-green-500/10 text-green-500"
                  label={lang==="ru"?"Автозагрузка фото":"Auto-download Photos"}
                  desc={lang==="ru"?"Автоматически загружать фото в чатах":"Automatically download photos in chats"}
                  right={<Switch checked={autoDownload} onCheckedChange={v => { setAutoDownload(v); setLs("pulse-auto-download", v); toast({ title: t("common.saved") }); }}/>}/>
              </Section>
              <Section title={t("settings.storage")} icon={<Database size={13}/>}>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl"><Database size={18}/></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-baseline">
                        <p className="text-sm font-medium">{t("settings.localCache")}</p>
                        <span className="text-sm font-bold text-orange-500">{storageSize} {lang==="ru"?"КБ":"KB"}</span>
                      </div>
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all" style={{ width:`${Math.min(100,(Number(storageSize)/100)*100)}%` }}/>
                      </div>
                    </div>
                  </div>
                  <button onClick={handleClearCache}
                    className="flex items-center gap-2 w-full py-2.5 px-4 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors text-sm font-medium">
                    <Trash2 size={15}/> {t("settings.clearCache")}
                  </button>
                </div>
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary transition-colors" onClick={handleExportData}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 text-green-500 rounded-xl"><Download size={18}/></div>
                    <div>
                      <p className="text-sm font-medium">{t("settings.exportData")}</p>
                      <p className="text-xs text-muted-foreground">{t("settings.exportDataDesc")}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground"/>
                </div>
              </Section>
            </div>
          )}

          {/* ─── SPEAKERS & CAMERA ────────────────────────── */}
          {displaySection === "speakers" && <SpeakersSection lang={lang} />}

          {/* ─── BATTERY & ANIMATIONS ─────────────────────── */}
          {displaySection === "battery" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Section title={lang==="ru"?"Производительность":"Performance"} icon={<Battery size={13}/>}>
                <Row icon={<Smartphone size={18}/>} color="bg-green-500/10 text-green-500"
                  label={t("settings.reduceAnimations")} desc={t("settings.reduceAnimationsDesc")}
                  right={<Switch checked={reduceAnimations} onCheckedChange={v => { setReduceAnimations(v); setLs("pulse-reduce-animations", v); toast({ title: t("common.saved") }); }}/>}/>
                <Row icon={<Battery size={18}/>} color="bg-emerald-500/10 text-emerald-500"
                  label={lang==="ru"?"Режим экономии заряда":"Power Saving Mode"}
                  desc={lang==="ru"?"Отключить фоновые анимации и эффекты":"Disable background animations and effects"}
                  right={<Switch checked={powerSaving} onCheckedChange={v => { setPowerSaving(v); setLs("pulse-power-saving", v); toast({ title: t("common.saved") }); }}/>}/>
                <Row icon={<Gift size={18}/>} color="bg-yellow-500/10 text-yellow-500"
                  label={lang==="ru"?"Анимированные подарки":"Animated Gifts"}
                  desc={lang==="ru"?"Воспроизводить анимацию при получении подарков":"Play animation when receiving gifts"}
                  right={<Switch checked={animatedEmoji} onCheckedChange={v => { setAnimatedEmoji(v); setLs("pulse-animated-emoji", v); toast({ title: t("common.saved") }); }}/>}/>
                <Row icon={<Zap size={18}/>} color="bg-blue-500/10 text-blue-500"
                  label={lang==="ru"?"Эффекты сообщений":"Message Effects"}
                  desc={lang==="ru"?"Конфетти, снег и огонь при отправке":"Confetti, snow and fire on send"}
                  right={<Switch checked={msgEffects} onCheckedChange={v => { setMsgEffects(v); setLs("pulse-msg-effects", v); toast({ title: t("common.saved") }); }}/>}/>
              </Section>
              <div className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0"><Battery size={16}/></div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {lang==="ru"
                    ? "Режим экономии заряда отключает фоновые анимации и частицы, сохраняя ключевые переходы интерфейса."
                    : "Power saving mode disables background animations and particles while keeping essential UI transitions."}
                </p>
              </div>
            </div>
          )}

          {/* ─── LANGUAGE ──────────────────────────────────── */}
          {displaySection === "language" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Section title={lang==="ru"?"Язык интерфейса":"Interface Language"} icon={<Globe size={13}/>}>
                {LANGUAGE_OPTIONS.map((opt, idx) => (
                  <div key={opt.value}
                    onClick={() => { setLanguage(opt.value); setLs("pulse-language", opt.value); setLang(opt.value as any); toast({ title: t("common.saved"), description: opt.label }); }}
                    className={`p-4 flex items-center gap-4 cursor-pointer transition-colors ${idx<LANGUAGE_OPTIONS.length-1?"border-b border-border":""} ${language===opt.value?"bg-primary/5":"hover:bg-secondary"}`}>
                    <span className="text-2xl">{opt.flag}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{opt.label}</p>
                    </div>
                    {language===opt.value && <CheckCircle size={18} className="text-primary shrink-0"/>}
                  </div>
                ))}
              </Section>
            </div>
          )}

          {/* ─── PULSE PRIME ───────────────────────────────── */}
          {displaySection === "prime" && (
            <div className="max-w-2xl mx-auto space-y-6">
              {(user as any)?.hasPrime ? (
                <Section title="Aura Prime" icon={<Crown size={13}/>}>
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0"><Crown size={20} className="text-white"/></div>
                      <div>
                        <p className="font-semibold text-sm text-amber-400">{lang==="ru"?"Подписка активна":"Subscription active"}</p>
                        {(user as any)?.primeExpiresAt && <p className="text-xs text-muted-foreground">{lang==="ru"?"До":"Until"}: {new Date((user as any).primeExpiresAt).toLocaleDateString(lang==="ru"?"ru-RU":"en-US")}</p>}
                      </div>
                    </div>
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{lang==="ru"?"Тема интерфейса":"Interface Theme"}</p>
                      <div className="grid grid-cols-4 gap-2">
                        {PRIME_THEMES.map(theme => {
                          const isActive = primeTheme === theme.id;
                          return (
                            <button key={theme.id} title={theme.name}
                              onClick={() => { setPrimeTheme(theme.id); localStorage.setItem("pulse-prime-theme", theme.id); applyPrimeTheme(theme.id); toast({ title: lang==="ru"?"Тема применена":"Theme applied", description:`${theme.emoji} ${theme.name}` }); }}
                              className={`relative flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all border ${isActive ? "border-primary bg-primary/10 scale-[1.03] shadow-md shadow-primary/20" : "border-border/50 bg-card/50 hover:border-primary/40 hover:bg-primary/5"}`}>
                              <div className="w-8 h-8 rounded-full ring-2 ring-white/10 shadow-md" style={{ background:`hsl(${theme.vars["--primary"]})` }}>
                                <div className="w-full h-full rounded-full" style={{ background:`radial-gradient(circle at 30% 30%, hsl(${theme.vars["--card"]}) 40%, ${theme.preview} 100%)`, opacity:0.85 }}/>
                              </div>
                              <span className="text-[10px] leading-tight font-medium text-center text-foreground/80 line-clamp-2">{theme.emoji} {theme.name.split(" ")[0]}</span>
                              {isActive && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary shadow-sm"/>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <button onClick={handleCancelPrime} disabled={cancelPrimeLoading}
                      className="flex items-center gap-2 w-full py-2.5 px-4 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors text-sm font-medium disabled:opacity-50">
                      <X size={15}/> {cancelPrimeLoading ? (lang==="ru"?"Отменяем...":"Cancelling...") : (lang==="ru"?"Отменить Prime подписку":"Cancel Prime subscription")}
                    </button>
                  </div>
                </Section>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-amber-500/30">
                    <Crown size={36} className="text-white"/>
                  </div>
                  <h3 className="text-2xl font-black mb-2">Aura Prime</h3>
                  <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">{lang==="ru"?"Разблокируйте эксклюзивные темы, скрытый статус и другие привилегии.":"Unlock exclusive themes, hidden status, and other perks."}</p>
                  <a href="/prime" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl font-bold shadow-lg hover:opacity-90 transition-opacity">
                    <Crown size={18}/> {lang==="ru"?"Получить Prime":"Get Prime"}
                  </a>
                </div>
              )}
            </div>
          )}


          {/* ─── PULSE FAQ ─────────────────────────────────── */}
          {displaySection === "faq" && <FaqSection lang={lang} />}

          {/* ─── PULSE FEATURES ────────────────────────────── */}

          {/* ─── SUPPORT ───────────────────────────────────── */}
          {displaySection === "support" && <SupportSection lang={lang} user={user} t={t} currentStatusOpt={currentStatusOpt} onNavigate={setActiveSection} />}

        </div>
      </div>

      {/* ── LOGOUT ALERT DIALOG ── */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.logoutConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("settings.logoutConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={logout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("menu.logout")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
