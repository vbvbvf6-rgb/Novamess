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
  Star, Battery, FolderOpen, ArrowLeft, Mic, Headphones, Bot,
  SlidersHorizontal, Layers, Calendar
} from "lucide-react";
import { useGetMe, useUpdateMe } from "@workspace/api-client-react";
import { useAppContext } from "@/contexts/AppContext";
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
  "#3B82F6","#EC4899","#10B981","#F59E0B","#8B5CF6",
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
            <img src={setupData.qrUrl} alt="QR Code" className="w-40 h-40 rounded-xl border border-border" />
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
  const isActive = active === id;
  return (
    <button
      onClick={() => href ? (window.location.href = href) : onClick(id)}
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

export default function Settings() {
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
  const [phoneNumber, setPhoneNumber] = useState("");
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

  // Apply page zoom on mount
  useEffect(() => {
    const saved = localStorage.getItem("pulse-page-zoom") || "100";
    (document.documentElement as any).style.zoom = `${saved}%`;
  }, []);

  // Prime theme
  const [primeTheme, setPrimeTheme] = useState(() => localStorage.getItem("pulse-prime-theme") || "cyan");
  useEffect(() => {
    if ((user as any)?.hasPrime) applyPrimeTheme(primeTheme);
  }, [(user as any)?.hasPrime]);

  // Avatar file upload
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [cancelPrimeLoading, setCancelPrimeLoading] = useState(false);

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
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL("image/jpeg", 0.75);
      setAvatarUrl(compressed);
      // Auto-save avatar immediately
      const uid = sessionStorage.getItem("pulse-user-id");
      fetch("/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ avatarUrl: compressed }),
      })
        .then((r) => r.ok ? r.json() : Promise.reject(r.status))
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
          toast({ title: lang === "ru" ? "Фото обновлено" : "Photo updated" });
        })
        .catch(() => {
          toast({ title: t("settings.saveError"), variant: "destructive" });
        });
    };
    img.src = objectUrl;
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
        toast({ title: lang === "ru" ? "Подписка отменена" : "Subscription cancelled", description: lang === "ru" ? "Pulse Prime деактивирован." : "Pulse Prime has been deactivated." });
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

  // Storage
  const [storageSize, setStorageSize] = useState("0");
  const [cacheCleared, setCacheCleared] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Settings navigation — sidebar active section (null = show sidebar on mobile)
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Chat Settings
  const [linkPreview, setLinkPreview] = useState(() => lsb("pulse-link-preview", true));
  const [sendOnEnter, setSendOnEnter] = useState(() => lsb("pulse-send-on-enter", true));
  const [animatedEmoji, setAnimatedEmoji] = useState(() => lsb("pulse-animated-emoji", true));
  const [msgGroupDate, setMsgGroupDate] = useState(() => lsb("pulse-msg-group-date", true));
  const [emojiSize, setEmojiSize] = useState(() => ls("pulse-emoji-size", "medium"));

  // Advanced
  const [dataSaver, setDataSaver] = useState(() => lsb("pulse-data-saver", false));
  const [autoDownload, setAutoDownload] = useState(() => lsb("pulse-auto-download", true));

  // Battery
  const [powerSaving, setPowerSaving] = useState(() => lsb("pulse-power-saving", false));

  // Stars
  const starsBalance = 0;

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
      setPhoneNumber((user as any).phoneNumber || "");
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

  const handleExportData = async () => {
    try {
      const token = sessionStorage.getItem("pulse-token");
      const headers: Record<string, string> = token ? { "Authorization": `Bearer ${token}` } : {};
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
      toast({ title: t("settings.exportReady"), description: t("settings.exportReadyDesc") });
    } catch {
      toast({ title: t("common.error"), description: lang === "ru" ? "Не удалось экспортировать данные." : "Could not export data.", variant: "destructive" });
    }
  };

  const handleCopyProfileLink = () => {
    const link = `${window.location.origin}/profile/${user?.id || ""}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast({ title: t("settings.linkCopied"), description: t("settings.linkCopiedDesc") });
  };

  const handleEndSessions = () => {
    sessionStorage.clear();
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
        <div className="h-16 border-b border-border flex items-center px-5 bg-card/80 backdrop-blur-md shrink-0">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <SettingsIcon size={20} className="text-primary" /> {t("settings.title")}
          </h1>
        </div>

        {/* Profile card — taps into account section */}
        <button
          onClick={() => setActiveSection("account")}
          className={cn(
            "flex items-center gap-4 px-5 py-4 w-full text-left transition-colors border-b border-border",
            displaySection === "account" ? "bg-primary/5" : "hover:bg-secondary"
          )}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0 overflow-hidden shadow-md"
            style={{ backgroundColor: avatarColor }}
          >
            {avatarPreview
              ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              : (displayName[0]?.toUpperCase() || "?")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base truncate">{displayName || user?.displayName || "..."}</p>
            <p className="text-sm text-muted-foreground truncate">@{user?.username}</p>
            {phoneNumber && <p className="text-xs text-muted-foreground mt-0.5 truncate">{phoneNumber}</p>}
          </div>
          <ChevronRight size={18} className="text-muted-foreground shrink-0" />
        </button>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto scrollbar-none py-2">

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
            <NavItem id="scale"    icon={<Monitor size={16}/>} color="bg-indigo-600" label={lang==="ru"?"Масштаб интерфейса":"Interface Scale"} badge={`${pageZoom}%`} active={displaySection} onClick={setActiveSection}/>
          </NavGroup>

          {/* Group 3: Premium */}
          <NavGroup>
            <NavItem id="prime" icon={<Crown size={16}/>} color="bg-gradient-to-br from-amber-400 to-orange-500"
              label="Pulse Prime"
              badge={(user as any)?.hasPrime ? (lang==="ru"?"Активен":"Active") : undefined}
              badgeAmber={(user as any)?.hasPrime}
              active={displaySection} onClick={setActiveSection}/>
            <NavItem id="stars" icon={<Star size={16}/>}  color="bg-gradient-to-br from-yellow-400 to-amber-500"
              label={lang==="ru"?"Мои звёзды":"My Stars"} badge="0"
              active={displaySection} onClick={setActiveSection}/>
            <NavItem id="gift"  icon={<Gift size={16}/>}  color="bg-gradient-to-br from-pink-500 to-rose-600"
              label={lang==="ru"?"Отправить подарок":"Send a Gift"} href="/gifts"
              active={displaySection} onClick={setActiveSection}/>
          </NavGroup>

          {/* Group 4: Help */}
          <NavGroup>
            <NavItem id="faq"      icon={<HelpCircle size={16}/>} color="bg-teal-500"   label="Pulse FAQ"                                    active={displaySection} onClick={setActiveSection}/>
            <NavItem id="features" icon={<Layers size={16}/>}     color="bg-cyan-600"   label={lang==="ru"?"Возможности Pulse":"Pulse Features"} active={displaySection} onClick={setActiveSection}/>
            <NavItem id="support"  icon={<Shield size={16}/>}     color="bg-green-600"  label={lang==="ru"?"Поддержка":"Support"}             active={displaySection} onClick={setActiveSection}/>
            <NavItem id="dev"      icon={<Bot size={16}/>}         color="bg-gradient-to-br from-violet-500 to-indigo-600"
              label={lang==="ru"?"Разработчику":"Developer"} href="/bots"
              active={displaySection} onClick={setActiveSection}/>
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
        <header className="h-16 border-b border-border flex items-center px-5 gap-3 bg-card/80 backdrop-blur-md shrink-0">
          <button
            onClick={() => setActiveSection(null)}
            className="md:hidden w-9 h-9 rounded-xl hover:bg-secondary flex items-center justify-center text-muted-foreground transition-colors shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-bold flex-1 truncate">
            {displaySection === "account"       ? (lang==="ru"?"Мой аккаунт":"My Account")
            : displaySection === "notifications" ? (lang==="ru"?"Уведомления и звуки":"Notifications & Sounds")
            : displaySection === "privacy"       ? (lang==="ru"?"Конфиденциальность и безопасность":"Privacy & Security")
            : displaySection === "chat-settings" ? (lang==="ru"?"Настройки чатов":"Chat Settings")
            : displaySection === "folders"       ? (lang==="ru"?"Папки с чатами":"Folders")
            : displaySection === "advanced"      ? (lang==="ru"?"Расширенные":"Advanced")
            : displaySection === "speakers"      ? (lang==="ru"?"Динамики и камера":"Speakers & Camera")
            : displaySection === "battery"       ? (lang==="ru"?"Батарея и анимации":"Battery & Animations")
            : displaySection === "language"      ? (lang==="ru"?"Язык":"Language")
            : displaySection === "scale"         ? (lang==="ru"?"Масштаб интерфейса":"Interface Scale")
            : displaySection === "prime"         ? "Pulse Prime"
            : displaySection === "stars"         ? (lang==="ru"?"Мои звёзды":"My Stars")
            : displaySection === "faq"           ? "Pulse FAQ"
            : displaySection === "features"      ? (lang==="ru"?"Возможности Pulse":"Pulse Features")
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
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => avatarFileRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                      >
                        <Upload size={14}/> {lang==="ru"?"Загрузить фото":"Upload photo"}
                      </button>
                      {avatarUrl && (
                        <button type="button" onClick={() => setAvatarUrl("")}
                          className="px-3 py-2 text-sm text-destructive/70 hover:text-destructive transition-colors">
                          {lang==="ru"?"Удалить":"Remove"}
                        </button>
                      )}
                    </div>
                    <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile}/>
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
                  <div>
                    <Label className="text-sm font-medium mb-1 block flex items-center gap-1.5"><Phone size={13}/> {t("settings.phone")}</Label>
                    <Input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder={t("settings.phonePlaceholder")} type="tel" className="bg-background"/>
                    <p className="text-xs text-muted-foreground mt-1">{t("settings.phoneNote")}</p>
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
                      onClick={() => { if (user) { setDisplayName(user.displayName||""); setBio(user.bio||""); setStatusText((user as any).statusText||""); setAvatarColor(user.avatarColor||"#3B82F6"); setAvatarUrl((user as any).avatarUrl||""); setPhoneNumber((user as any).phoneNumber||""); setOnlineStatus((user.status as any)||"online"); }}}
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
                  desc={(user as any)?.hasPrime ? t("settings.showOnlineStatusDesc") : (lang==="ru"?"Только для Pulse Prime участников":"Pulse Prime members only")}
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
                <Row icon={<Monitor size={18}/>} color="bg-primary/10 text-primary"
                  label={t("settings.activeSessions")}
                  desc={`${lang==="ru"?"Браузер":"Browser"}: ${navigator.userAgent.includes("Chrome")?"Chrome":navigator.userAgent.includes("Firefox")?"Firefox":(lang==="ru"?"Другой":"Other")}`}
                  onClick={handleEndSessions} right={<span className="text-xs text-muted-foreground">{t("settings.endSessions")}</span>}/>
                <TwoFaSection user={user} toast={toast} lang={lang}/>
                <ScreenLockSection lang={lang} toast={toast}/>
                <SecurityQuestionSection lang={lang} toast={toast}/>
              </Section>
            </div>
          )}

          {/* ─── CHAT SETTINGS ─────────────────────────────── */}
          {displaySection === "chat-settings" && (
            <div className="max-w-2xl mx-auto space-y-6">
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
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl"><Type size={18}/></div>
                    <div>
                      <p className="text-sm font-medium">{lang==="ru"?"Размер эмодзи":"Emoji Size"}</p>
                      <p className="text-xs text-muted-foreground">{lang==="ru"?"Размер больших эмодзи в сообщениях":"Size of large emoji in messages"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ value:"small", label:lang==="ru"?"Маленький":"Small", px:"20px" },{ value:"medium", label:lang==="ru"?"Средний":"Medium", px:"28px" },{ value:"large", label:lang==="ru"?"Большой":"Large", px:"36px" }].map(opt => (
                      <button key={opt.value} onClick={() => { setEmojiSize(opt.value); setLs("pulse-emoji-size", opt.value); toast({ title: t("common.saved") }); }}
                        className={`py-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${emojiSize===opt.value ? "border-primary bg-primary/8 text-primary" : "border-border hover:border-primary/30"}`}
                        style={{ fontSize: opt.px }}>
                        😊
                        <span className="text-xs text-muted-foreground" style={{ fontSize:"11px" }}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
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
                  { key:"bots",   label:lang==="ru"?"Боты":"Bots",                   emoji:"🤖", desc:lang==="ru"?"Чаты с ботами":"Bot conversations" },
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
          {displaySection === "speakers" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Section title={lang==="ru"?"Устройства ввода/вывода":"Input/Output Devices"} icon={<Headphones size={13}/>}>
                {[
                  { icon:<Mic size={22} className="text-orange-500"/>, bg:"bg-orange-500/10 border-orange-500/20", title:lang==="ru"?"Микрофон":"Microphone", desc:lang==="ru"?"Системный микрофон по умолчанию":"System default microphone" },
                  { icon:<Headphones size={22} className="text-blue-500"/>, bg:"bg-blue-500/10 border-blue-500/20", title:lang==="ru"?"Динамики":"Speakers", desc:lang==="ru"?"Системный динамик по умолчанию":"System default speakers" },
                  { icon:<Camera size={22} className="text-violet-500"/>, bg:"bg-violet-500/10 border-violet-500/20", title:lang==="ru"?"Камера":"Camera", desc:lang==="ru"?"Системная камера по умолчанию":"System default camera" },
                ].map((dev, i, arr) => (
                  <div key={i} className={`p-4 flex items-center gap-4 ${i < arr.length-1 ? "border-b border-border" : ""}`}>
                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${dev.bg}`}>{dev.icon}</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{dev.title}</p>
                      <p className="text-xs text-muted-foreground">{dev.desc}</p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg shrink-0">{lang==="ru"?"Активен":"Active"}</span>
                  </div>
                ))}
              </Section>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-sm text-muted-foreground text-center">
                  {lang==="ru"?"Управление устройствами доступно через настройки браузера и ОС.":"Manage devices through your browser and OS settings."}
                </p>
              </div>
            </div>
          )}

          {/* ─── BATTERY & ANIMATIONS ─────────────────────── */}
          {displaySection === "battery" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Section title={lang==="ru"?"Производительность":"Performance"} icon={<Battery size={13}/>}>
                <Row icon={<Smartphone size={18}/>} color="bg-green-500/10 text-green-500"
                  label={t("settings.reduceAnimations")} desc={t("settings.reduceAnimationsDesc")}
                  right={<Switch checked={reduceAnimations} onCheckedChange={v => { setReduceAnimations(v); setLs("pulse-reduce-animations", v); }}/>}/>
                <Row icon={<Battery size={18}/>} color="bg-emerald-500/10 text-emerald-500"
                  label={lang==="ru"?"Режим экономии заряда":"Power Saving Mode"}
                  desc={lang==="ru"?"Отключить фоновые анимации и эффекты":"Disable background animations and effects"}
                  right={<Switch checked={powerSaving} onCheckedChange={v => { setPowerSaving(v); setLs("pulse-power-saving", v); toast({ title: t("common.saved") }); }}/>}/>
                <Row icon={<Zap size={18}/>} color="bg-yellow-500/10 text-yellow-500"
                  label={lang==="ru"?"Анимированные подарки":"Animated Gifts"}
                  desc={lang==="ru"?"Воспроизводить анимации при получении подарка":"Play animations when receiving gifts"}
                  right={<Switch checked={!powerSaving} onCheckedChange={v => { setPowerSaving(!v); setLs("pulse-power-saving", !v); }}/>}/>
              </Section>
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

          {/* ─── INTERFACE SCALE ───────────────────────────── */}
          {displaySection === "scale" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Section title={lang==="ru"?"Масштаб страницы":"Page Scale"} icon={<Monitor size={13}/>}>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 text-primary rounded-xl"><Monitor size={18}/></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{lang==="ru"?"Масштаб интерфейса":"Interface Scale"}</p>
                      <p className="text-xs text-muted-foreground">{lang==="ru"?"Изменить размер всего интерфейса":"Scale the entire interface"}</p>
                    </div>
                    <span className="text-sm font-bold text-primary min-w-[3rem] text-right">{pageZoom}%</span>
                  </div>
                  <input type="range" min={75} max={150} step={5} value={pageZoom}
                    onChange={e => { const v=e.target.value; setPageZoom(v); setLs("pulse-page-zoom", v); (document.documentElement as any).style.zoom=`${v}%`; }}
                    className="w-full accent-primary"/>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>75%</span><span>100%</span><span>150%</span>
                  </div>
                </div>
              </Section>
              <Section title={t("settings.fontSize")} icon={<Type size={13}/>}>
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-2">
                    {FONT_SIZE_OPTIONS.map(opt => (
                      <button key={opt.value}
                        onClick={() => { setFontSize(opt.value); setLs("pulse-font-size", opt.value); toast({ title: t("common.saved"), description: `${t("settings.fontSize")}: ${opt.label}` }); }}
                        className={`py-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-0.5 ${fontSize===opt.value ? "border-primary bg-primary/8 text-primary" : "border-border hover:border-primary/30"}`}
                        style={{ fontSize: opt.size }}>
                        {opt.label}
                        {fontSize===opt.value && <CheckCircle size={12} className="text-primary"/>}
                      </button>
                    ))}
                  </div>
                </div>
              </Section>
              <Section title={lang==="ru"?"Оформление":"Appearance"} icon={<Palette size={13}/>}>
                <Row icon={isDark ? <Moon size={18}/> : <Sun size={18}/>} color="bg-primary/10 text-primary"
                  label={isDark ? t("settings.darkTheme") : t("settings.lightTheme")}
                  desc={isDark ? t("settings.darkThemeDesc") : t("settings.lightThemeDesc")}
                  right={<Switch checked={isDark} onCheckedChange={toggleTheme}/>}/>
              </Section>
            </div>
          )}

          {/* ─── PULSE PRIME ───────────────────────────────── */}
          {displaySection === "prime" && (
            <div className="max-w-2xl mx-auto space-y-6">
              {(user as any)?.hasPrime ? (
                <Section title="Pulse Prime" icon={<Crown size={13}/>}>
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
                  <h3 className="text-2xl font-black mb-2">Pulse Prime</h3>
                  <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">{lang==="ru"?"Разблокируйте эксклюзивные темы, скрытый статус и другие привилегии.":"Unlock exclusive themes, hidden status, and other perks."}</p>
                  <a href="/prime" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl font-bold shadow-lg hover:opacity-90 transition-opacity">
                    <Crown size={18}/> {lang==="ru"?"Получить Prime":"Get Prime"}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ─── MY STARS ──────────────────────────────────── */}
          {displaySection === "stars" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-amber-500/30">
                  <Star size={36} className="text-white fill-white"/>
                </div>
                <h3 className="text-4xl font-black mb-1">{starsBalance}</h3>
                <p className="text-muted-foreground text-sm mb-6">{lang==="ru"?"Ваши звёзды":"Your Stars"}</p>
                <div className="flex gap-3 justify-center">
                  <a href="/prime" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-2xl font-bold text-sm shadow hover:opacity-90 transition-opacity">
                    <Star size={15}/> {lang==="ru"?"Получить звёзды":"Get Stars"}
                  </a>
                  <a href="/gifts" className="inline-flex items-center gap-2 px-5 py-2.5 bg-card border border-border rounded-2xl font-bold text-sm text-foreground hover:bg-secondary transition-colors">
                    <Gift size={15}/> {lang==="ru"?"Потратить":"Spend"}
                  </a>
                </div>
              </div>
              <Section title={lang==="ru"?"История транзакций":"Transaction History"} icon={<Star size={13}/>}>
                <div className="p-8 text-center text-muted-foreground text-sm">
                  {lang==="ru"?"Транзакций пока нет":"No transactions yet"}
                </div>
              </Section>
              <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
                <p className="text-sm font-semibold">{lang==="ru"?"Как получить звёзды?":"How to earn Stars?"}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{lang==="ru"?"Звёзды можно получить через Pulse Prime или как подарок от других пользователей. Используйте их для отправки гифтов.":"Stars can be earned through Pulse Prime or as gifts from others. Use them to send gifts and unlock content."}</p>
              </div>
            </div>
          )}

          {/* ─── PULSE FAQ ─────────────────────────────────── */}
          {displaySection === "faq" && (
            <div className="max-w-2xl mx-auto space-y-3">
              {[
                { q:lang==="ru"?"Как создать группу?":"How to create a group?", a:lang==="ru"?"Нажмите иконку карандаша в списке чатов и выберите «Создать группу».":"Tap the pencil icon in the chat list and select 'Create Group'." },
                { q:lang==="ru"?"Как включить 2FA?":"How to enable 2FA?", a:lang==="ru"?"Настройки → Конфиденциальность и безопасность → Двухфакторная аутентификация.":"Settings → Privacy & Security → Two-Factor Authentication." },
                { q:lang==="ru"?"Что такое Pulse Prime?":"What is Pulse Prime?", a:lang==="ru"?"Pulse Prime — платная подписка с эксклюзивными темами, скрытым статусом и другими привилегиями.":"Pulse Prime is a paid subscription with exclusive themes, hidden status, and other perks." },
                { q:lang==="ru"?"Как удалить аккаунт?":"How to delete account?", a:lang==="ru"?"Свяжитесь с поддержкой через раздел «Поддержка» в настройках.":"Contact support through the 'Support' section in settings." },
                { q:lang==="ru"?"Как работают стикеры?":"How do stickers work?", a:lang==="ru"?"Нажмите иконку смайлика в поле ввода сообщения для открытия панели стикеров.":"Tap the smile icon in the message input to open the sticker panel." },
                { q:lang==="ru"?"Как установить PIN-блокировку?":"How to set a screen lock PIN?", a:lang==="ru"?"Настройки → Конфиденциальность → Блокировка экрана.":"Settings → Privacy & Security → Screen Lock." },
              ].map((item, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-4">
                  <p className="font-semibold text-sm mb-2">{item.q}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          )}

          {/* ─── PULSE FEATURES ────────────────────────────── */}
          {displaySection === "features" && (
            <div className="max-w-2xl mx-auto space-y-3">
              {[
                { emoji:"💬", title:lang==="ru"?"Чаты":"Chats", desc:lang==="ru"?"Личные, групповые и канальные чаты с историей, ответами, реакциями и поиском":"Direct, group and channel chats with history, replies, reactions and search" },
                { emoji:"📞", title:lang==="ru"?"Звонки":"Calls", desc:lang==="ru"?"Аудио и видеозвонки с экраном принятия/отклонения и историей":"Audio and video calls with accept/decline screens and call history" },
                { emoji:"🎁", title:lang==="ru"?"Подарки":"Gifts", desc:lang==="ru"?"Анимированные подарки: обычный, редкий, эпический, легендарный":"Animated gifts with rarities: common, rare, epic, legendary" },
                { emoji:"📖", title:lang==="ru"?"Истории":"Stories", desc:lang==="ru"?"24-часовые истории с полноэкранным просмотром":"24-hour stories with full-screen viewer" },
                { emoji:"👥", title:lang==="ru"?"Контакты":"Contacts", desc:lang==="ru"?"Список контактов с поиском и управлением":"Contact list with search and management" },
                { emoji:"🤖", title:lang==="ru"?"Боты":"Bots", desc:lang==="ru"?"Создавайте ботов с командами и ответами":"Create bots with commands and responses" },
                { emoji:"🔒", title:lang==="ru"?"Безопасность":"Security", desc:lang==="ru"?"2FA, PIN-блокировка, исчезающие сообщения, приватность":"2FA, PIN lock, disappearing messages, privacy controls" },
                { emoji:"⭐", title:"Pulse Prime", desc:lang==="ru"?"Эксклюзивные темы, скрытый статус и другие привилегии":"Exclusive themes, hidden online status, and other perks" },
                { emoji:"🎨", title:lang==="ru"?"Стикеры":"Stickers", desc:lang==="ru"?"Уникальные SVG-стикеры для выражения эмоций":"Unique SVG stickers to express emotions" },
              ].map((f, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-4 flex items-start gap-4">
                  <span className="text-3xl shrink-0">{f.emoji}</span>
                  <div>
                    <p className="font-semibold text-sm mb-1">{f.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── SUPPORT ───────────────────────────────────── */}
          {displaySection === "support" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Section title={t("settings.about")} icon={<Zap size={13}/>}>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-orange-700 flex items-center justify-center shrink-0"><Zap size={22} className="text-white fill-white"/></div>
                    <div>
                      <p className="font-bold text-base">Pulse Messenger</p>
                      <p className="text-xs text-muted-foreground">{t("settings.version")}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="bg-muted/50 rounded-xl p-2.5">
                      <p className="font-medium text-foreground mb-0.5">{t("settings.accountInfo")}</p>
                      <p>@{user?.username}</p><p>ID: {user?.id}</p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-2.5">
                      <p className="font-medium text-foreground mb-0.5">{t("settings.statusInfo")}</p>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${currentStatusOpt?.color}`}/>
                        {currentStatusOpt?.label}
                      </div>
                      <p>{user?.isVerified ? t("settings.verified") : t("settings.notVerified")}</p>
                    </div>
                  </div>
                </div>
              </Section>
              <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
                <a href="/support" className="flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center shrink-0"><MessageSquare size={14} className="text-primary"/></div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">{lang==="ru"?"Служба поддержки":"Support Team"}</p>
                    <p className="text-xs text-muted-foreground">{lang==="ru"?"Задать вопрос, решить проблему":"Ask a question or report an issue"}</p>
                  </div>
                  <ChevronRight size={15} className="text-muted-foreground"/>
                </a>
                <a href="/support" className="flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shrink-0"><AlertTriangle size={14} className="text-white"/></div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">{lang==="ru"?"Сообщить об ошибке":"Report a Bug"}</p>
                    <p className="text-xs text-muted-foreground">{lang==="ru"?"Помогите нам улучшить Pulse":"Help us improve Pulse"}</p>
                  </div>
                  <ChevronRight size={15} className="text-muted-foreground"/>
                </a>
              </div>
            </div>
          )}

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
