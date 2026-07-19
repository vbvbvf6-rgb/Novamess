import { useState, useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, useParams } from "wouter";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, localStoragePersister } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { useAppContext } from "@/contexts/AppContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { AddAccountDialog } from "@/components/layout/AddAccountDialog";
import { getSavedAccounts, saveAccount, removeAccount, SavedAccount } from "@/lib/accounts";
import { ScreenLock } from "@/components/ScreenLock";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, LogOut, ShieldCheck, X, Download, RefreshCw, RotateCcw } from "lucide-react";
import { MaintenanceScreen, MaintenanceData } from "@/components/MaintenanceScreen";

import { useNotifications } from "@/hooks/useNotifications";
import { playNotificationSound } from "@/lib/ringtones";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WhatsNewModal } from "@/components/WhatsNewModal";
import { OnboardingModal } from "@/components/OnboardingModal";
import { LoginSplash } from "@/components/LoginSplash";

import Home from "@/pages/Home";
import Calls from "@/pages/Calls";
import Contacts from "@/pages/Contacts";
import Stories from "@/pages/Stories";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import UserProfile from "@/pages/UserProfile";
import Feed from "@/pages/Feed";
import Wallet from "@/pages/Wallet";
import Admin from "@/pages/Admin";
import Prime from "@/pages/Prime";

import Bots from "@/pages/Bots";
import Changelog from "@/pages/Changelog";
import Clans from "@/pages/Clans";
import Leaderboard from "@/pages/Leaderboard";
import Events from "@/pages/Events";
import Support from "@/pages/Support";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import QrConfirm from "@/pages/QrConfirm";
import NotFound from "@/pages/not-found";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import JoinInvite from "@/pages/JoinInvite";


function LandscapeBlock() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    // Try to lock orientation via the Screen Orientation API (supported in Chrome/Android WebView)
    const tryLock = async () => {
      try {
        if (screen.orientation && (screen.orientation as any).lock) {
          await (screen.orientation as any).lock("portrait");
        }
      } catch {
        // Not supported or requires fullscreen — fall back to CSS overlay
      }
    };
    tryLock();

    // Only block on real touch devices (phones/tablets) — desktop browsers always have maxTouchPoints = 0
    // In Replit iframe preview maxTouchPoints is also 0, so this won't fire there
    const isTouchDevice = navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    // Use screen.orientation.type (physical orientation) instead of CSS media query.
    // The CSS `(orientation: landscape)` fires when viewport width > height, which happens
    // when the virtual keyboard opens on mobile — even though the device is portrait.
    // screen.orientation.type reflects the actual physical screen rotation and is unaffected by the keyboard.
    const checkOrientation = () => {
      if (screen.orientation) {
        const isLandscape = screen.orientation.type.startsWith("landscape");
        const isSmall = Math.min(screen.width, screen.height) <= 900;
        setOn(isLandscape && isSmall);
      } else {
        // Safari fallback: use screen.width vs screen.height (physical dims, keyboard-safe)
        const isLandscape = screen.width > screen.height;
        const isSmall = Math.min(screen.width, screen.height) <= 900;
        setOn(isLandscape && isSmall);
      }
    };

    checkOrientation();
    screen.orientation?.addEventListener?.("change", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    return () => {
      screen.orientation?.removeEventListener?.("change", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  if (!on) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background gap-5 select-none">
      <motion.div
        animate={{ rotate: [0, 90] }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"
      >
        <RotateCcw size={32} className="text-primary" />
      </motion.div>
      <div className="text-center px-8">
        <p className="font-black text-xl mb-1">Поверните устройство</p>
        <p className="text-muted-foreground text-sm">Nova работает только в портретной ориентации</p>
      </div>
    </div>
  );
}

interface MainAppProps {
  onLogout: () => void;
  onSwitchAccount: (userId: number) => void;
  onRemoveAccount: (userId: number) => void;
  onOpenAddAccount: () => void;
}

function VerificationPending({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="bg-card border border-border rounded-3xl p-8 shadow-2xl text-center">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6"
          >
            <ShieldCheck size={40} className="text-primary" />
          </motion.div>
          <h1 className="text-2xl font-black text-foreground mb-2">Аккаунт на проверке</h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Ваш документ отправлен на проверку администратору. После подтверждения вы получите полный доступ к Nova.
          </p>
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 flex items-center gap-3 text-left">
            <Clock size={18} className="text-primary shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Обычно проверка занимает <span className="font-semibold text-foreground">несколько часов</span>. Войдите снова, чтобы проверить статус.
            </p>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
          >
            <LogOut size={16} /> Выйти из аккаунта
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function MainApp({ onLogout, onSwitchAccount, onRemoveAccount, onOpenAddAccount }: MainAppProps) {
  return <MainAppInner onLogout={onLogout} onSwitchAccount={onSwitchAccount} onRemoveAccount={onRemoveAccount} onOpenAddAccount={onOpenAddAccount} />;
}

interface InAppNotif {
  id: string;
  chatId: number;
  senderName: string;
  body: string;
  senderAvatar?: string;
  chatType?: string;
  chatName?: string;
}

// In-app floating banner for messages when the app is open/visible
function InAppMessageBanner() {
  const { selectedChatId, setSelectedChatId } = useAppContext();
  const [, navigate] = useLocation();
  const [notifs, setNotifs] = useState<InAppNotif[]>([]);
  const selectedChatIdRef = useRef(selectedChatId);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { selectedChatIdRef.current = selectedChatId; }, [selectedChatId]);

  useEffect(() => {
    const handler = (e: Event) => {
      try {
        // Respect "message notifications" toggle
        if (localStorage.getItem("pulse-notify-messages") === "false") return;

        const data = (e as CustomEvent).detail as {
          chatId: number; senderName: string; body: string; messageId: number;
          senderAvatar?: string; chatType?: string; chatName?: string;
        };

        // Don't show if user is already viewing this chat
        if (data.chatId === selectedChatIdRef.current) return;

        // Respect "show preview" toggle
        const showPreview = localStorage.getItem("pulse-notify-preview") !== "false";

        const notif: InAppNotif = {
          id: `${data.chatId}-${data.messageId || Date.now()}`,
          chatId: data.chatId,
          senderName: data.senderName,
          body: showPreview ? data.body : "Новое сообщение",
          senderAvatar: data.senderAvatar,
          chatType: data.chatType,
          chatName: data.chatName,
        };

        // Play short notification sound if sounds are enabled
        if (localStorage.getItem("pulse-notify-sounds") !== "false") {
          playNotificationSound();
        }

        setNotifs(prev => {
          // Replace existing notification from same chat with newer one
          const filtered = prev.filter(n => n.chatId !== data.chatId);
          return [...filtered, notif].slice(-3); // cap at 3
        });
      } catch {}
    };

    window.addEventListener("pulse:new-message", handler);
    return () => window.removeEventListener("pulse:new-message", handler);
  }, []);

  // Auto-dismiss the oldest notification after 4s
  useEffect(() => {
    if (notifs.length === 0) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setNotifs(prev => prev.slice(1));
    }, 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [notifs]);

  const dismiss = (id: string) => setNotifs(prev => prev.filter(n => n.id !== id));

  const open = (chatId: number) => {
    setSelectedChatId(chatId);
    navigate("/");
    setNotifs([]);
  };

  return (
    <div className="fixed top-3 inset-x-0 z-[900] flex flex-col items-center gap-2 px-3 pointer-events-none">
      <AnimatePresence mode="sync">
        {notifs.map(notif => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: -56, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.94 }}
            transition={{ type: "spring", damping: 28, stiffness: 400 }}
            className="w-full max-w-sm pointer-events-auto"
          >
            <div
              onClick={() => open(notif.chatId)}
              className="bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl shadow-black/25 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform select-none"
            >
              {/* accent bar at top */}
              <div className="h-0.5 bg-gradient-to-r from-primary via-blue-400 to-primary/60" />
              <div className="flex items-center gap-3 px-3.5 py-2.5">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl shrink-0 overflow-hidden bg-primary/15 flex items-center justify-center">
                  {notif.senderAvatar ? (
                    <img src={notif.senderAvatar} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-sm font-bold text-primary">
                      {(notif.senderName || "?")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground leading-tight truncate">
                    {notif.chatType !== "direct" && notif.chatName ? notif.chatName : notif.senderName}
                  </p>
                  {notif.chatType !== "direct" && notif.chatName && (
                    <p className="text-[11px] text-primary/80 leading-none mt-0.5">{notif.senderName}</p>
                  )}
                  <p className="text-[12px] text-muted-foreground truncate mt-0.5 leading-snug">{notif.body}</p>
                </div>
                {/* Dismiss button */}
                <button
                  onClick={ev => { ev.stopPropagation(); dismiss(notif.id); }}
                  className="shrink-0 p-1.5 rounded-xl text-muted-foreground hover:bg-secondary/80 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function GlobalNotificationListener() {
  const { notify, requestPermission, registerPushSubscription } = useNotifications();

  useEffect(() => {
    const uid = sessionStorage.getItem("pulse-user-id");
    if (!uid) return;

    // Request permission + register push on first visit
    if (typeof Notification !== "undefined") {
      if (Notification.permission === "default") {
        requestPermission();
      } else if (Notification.permission === "granted") {
        registerPushSubscription();
      }
    }

    const handler = (e: Event) => {
      try {
        const data = (e as CustomEvent).detail as {
          chatId: number; senderName: string; body: string; messageId: number; senderAvatar?: string;
        };
        // notify() shows OS notification — it skips automatically when app is focused,
        // so InAppMessageBanner handles the foreground case instead
        notify(data.senderName, {
          body: data.body,
          url: "/",
          tag: `chat-${data.chatId}`,
          type: "message",
          senderAvatar: data.senderAvatar,
        });
      } catch {}
    };

    window.addEventListener("pulse:new-message", handler);
    return () => window.removeEventListener("pulse:new-message", handler);
  }, []);

  return null;
}

function PwaUpdateBanner() {
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleUpdate = () => {
    setUpdating(true);
    localStorage.setItem("aura-pending-changelog", "true");
    applyUpdate();
  };

  const show = updateAvailable && !dismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="pwa-toast"
          initial={{ opacity: 0, y: 80, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.95 }}
          transition={{ type: "spring", damping: 28, stiffness: 360 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500] w-[calc(100%-2rem)] max-w-sm pointer-events-auto"
        >
          <div className="bg-card border border-primary/30 rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden">
            {/* Progress stripe at top */}
            <div className={`h-0.5 bg-gradient-to-r from-primary via-blue-400 to-blue-500 ${!updating ? "animate-pulse" : ""}`}
              style={updating ? { width: "100%", transition: "width 0.3s" } : {}}
            />
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Icon */}
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shrink-0 shadow shadow-primary/30">
                <svg width="18" height="18" viewBox="0 0 100 100" fill="none">
                  <path d="M50 13 C50 13 54.5 41 87 50 C54.5 59 50 87 50 87 C50 87 45.5 59 13 50 C45.5 41 50 13 50 13Z" fill="white" />
                </svg>
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-foreground leading-tight">
                  {updating ? "Устанавливаю обновление…" : "Доступно обновление Nova"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {updating ? "Страница перезагрузится автоматически" : "Скачано и готово к установке"}
                </p>
              </div>

              {/* Actions */}
              {!updating && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setDismissed(true)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                    title="Позже"
                  >
                    <X size={14} />
                  </button>
                  <button
                    onClick={handleUpdate}
                    className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-[12px] font-black hover:bg-primary/90 transition-all shadow-[0_2px_10px_rgba(59,130,246,0.35)] active:scale-95"
                  >
                    Обновить
                  </button>
                </div>
              )}

              {updating && (
                <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Rendered *inside* AppProvider so useAppContext() resolves correctly.
// (MainAppInner itself renders AppProvider, so it can't call the hook directly —
// that runs before the provider it returns is mounted.)
function MainAppEffects() {
  const [, navigate] = useLocation();
  const { setSelectedChatId } = useAppContext();

  // Handle notification tap: navigate to specific chat
  // Works both when app is open (SW postMessage) and when opened fresh (?chat=X URL)
  useEffect(() => {
    // 1. Fresh open from notification (SW opened a new window with /?chat=123)
    const params = new URLSearchParams(window.location.search);
    const chatFromUrl = params.get("chat");
    if (chatFromUrl) {
      const id = Number(chatFromUrl);
      if (id > 0) {
        setSelectedChatId(id);
        navigate("/", { replace: true });
      }
    }

    // 2. App was already open — AppContext dispatches this after setting selectedChatId
    const onNavigateHome = () => navigate("/");
    window.addEventListener("pulse:navigate-home", onNavigateHome);
    return () => window.removeEventListener("pulse:navigate-home", onNavigateHome);
  }, []);

  useEffect(() => {
    const checkScheduled = async () => {
      const token = sessionStorage.getItem("pulse-token");
      if (!token) return;
      const headers: Record<string, string> = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

      const now = Date.now();
      const keysToProcess: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("pulse-scheduled-")) keysToProcess.push(key);
      }

      for (const key of keysToProcess) {
        const chatId = Number(key.replace("pulse-scheduled-", ""));
        if (!chatId) continue;
        try {
          const items: { id: string; text: string; at: number }[] = JSON.parse(localStorage.getItem(key) || "[]");
          const due = items.filter(m => m.at <= now);
          if (!due.length) continue;
          const remaining = items.filter(m => m.at > now);
          localStorage.setItem(key, JSON.stringify(remaining));
          for (const m of due) {
            await fetch("/api/messages", {
              method: "POST",
              headers,
              body: JSON.stringify({ chatId, text: m.text, type: "text" }),
            }).catch(() => {});
          }
        } catch {}
      }
    };

    checkScheduled();
    const id = setInterval(checkScheduled, 15_000);
    return () => clearInterval(id);
  }, []);

  return null;
}

function MainAppInner({ onLogout, onSwitchAccount, onRemoveAccount, onOpenAddAccount }: MainAppProps) {
  useDocumentTitle();

  return (
    <AppProvider
      onLogout={onLogout}
      onSwitchAccount={onSwitchAccount}
      onRemoveAccount={onRemoveAccount}
      onOpenAddAccount={onOpenAddAccount}
    >
      <TooltipProvider>
        <MainAppEffects />
        <GlobalNotificationListener />
        <InAppMessageBanner />
        <PwaUpdateBanner />
        <WhatsNewModal />
        <OnboardingModal />
        <ScreenLock>
          <AppLayout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/calls" component={Calls} />
              <Route path="/feed" component={Feed} />
              <Route path="/contacts" component={Contacts} />
              <Route path="/stories" component={Stories} />
              <Route path="/wallet" component={Wallet} />
              <Route path="/admin" component={Admin} />
              <Route path="/prime" component={Prime} />

              <Route path="/bots" component={Bots} />
              <Route path="/changelog" component={Changelog} />
              <Route path="/clans" component={Clans} />
              <Route path="/leaderboard" component={Leaderboard} />
              <Route path="/events" component={Events} />
              <Route path="/support" component={Support} />
              <Route path="/profile" component={Profile} />
              <Route path="/settings" component={Settings} />
              <Route path="/user/:userId" component={UserProfile} />
              <Route path="/qr/:tokenId" component={QrConfirm} />
              <Route path="/privacy" component={Privacy} />
              <Route path="/terms" component={Terms} />
              <Route path="/invite/:token" component={JoinInvite} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </ScreenLock>
        <Toaster />
      </TooltipProvider>
    </AppProvider>
  );
}

function QrLoginGate() {
  const { tokenId } = useParams<{ tokenId: string }>();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (tokenId) {
      sessionStorage.setItem("pulse-pending-qr", tokenId);
    }
    navigate("/");
  }, []);

  return null;
}

function AuthPages({ onLogin }: { onLogin: (userId: number) => void }) {
  const [, navigate] = useLocation();

  const handleLogin = (userId: number) => {
    const pendingQr = sessionStorage.getItem("pulse-pending-qr");
    if (pendingQr) {
      sessionStorage.removeItem("pulse-pending-qr");
      navigate(`/qr/${pendingQr}`);
    } else {
      navigate("/");
    }
    onLogin(userId);
  };

  return (
    <Switch>
      <Route path="/register" component={() => <Register onLogin={handleLogin} />} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/qr/:tokenId" component={QrLoginGate} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route component={() => <Login onLogin={handleLogin} />} />
    </Switch>
  );
}

function App() {
  const [zoom, setZoom] = useState<number>(() => {
    const saved = localStorage.getItem("pulse-page-zoom");
    return saved ? Number(saved) : 100;
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const val = (e as CustomEvent<number>).detail;
      setZoom(val);
    };
    window.addEventListener("pulse:zoom-change", handler);
    return () => window.removeEventListener("pulse:zoom-change", handler);
  }, []);

  const [userId, setUserId] = useState<number | null>(() => {
    const stored = sessionStorage.getItem("pulse-user-id");

    // Fresh window/tab (sessionStorage is empty) — auto-restore from saved accounts
    if (!stored) {
      const accounts = getSavedAccounts();
      if (accounts.length > 0 && accounts[0].token) {
        const acc = accounts[0];
        sessionStorage.setItem("pulse-token", acc.token ?? "");
        sessionStorage.setItem("pulse-user-id", String(acc.userId));
        sessionStorage.setItem("pulse-user", JSON.stringify({
          id: acc.userId,
          displayName: acc.displayName,
          username: acc.username,
          avatarUrl: acc.avatarUrl,
          avatarColor: acc.avatarColor,
        }));
        sessionStorage.setItem("pulse-tab-owned", "1");
        return acc.userId;
      }
      return null;
    }

    // Detect inherited sessionStorage (tab opened via Ctrl+click / duplicate).
    // After explicit login or account switch we set "pulse-tab-owned" so the
    // app knows this tab legitimately owns this session.
    // If pulse-tab-owned is absent, the session was inherited — clear it and
    // try to restore from saved accounts.
    if (!sessionStorage.getItem("pulse-tab-owned")) {
      sessionStorage.removeItem("pulse-user-id");
      sessionStorage.removeItem("pulse-user");
      sessionStorage.removeItem("pulse-token");
      const accounts = getSavedAccounts();
      if (accounts.length > 0 && accounts[0].token) {
        const acc = accounts[0];
        sessionStorage.setItem("pulse-token", acc.token ?? "");
        sessionStorage.setItem("pulse-user-id", String(acc.userId));
        sessionStorage.setItem("pulse-user", JSON.stringify({
          id: acc.userId,
          displayName: acc.displayName,
          username: acc.username,
          avatarUrl: acc.avatarUrl,
          avatarColor: acc.avatarColor,
        }));
        sessionStorage.setItem("pulse-tab-owned", "1");
        return acc.userId;
      }
      return null;
    }

    const id = Number(stored);
    const accounts = getSavedAccounts();
    if (!accounts.some(a => a.userId === id)) {
      const user = (() => { try { return JSON.parse(sessionStorage.getItem("pulse-user") || "{}"); } catch { return {}; } })();
      if (user.displayName || user.username) {
        saveAccount({
          userId: id,
          displayName: user.displayName || "User",
          username: user.username || "",
          avatarUrl: user.avatarUrl || null,
          avatarColor: user.avatarColor || "#3B82F6",
        });
      }
    }
    return id;
  });
  const [addingAccount, setAddingAccount] = useState(false);

  // Maintenance mode check
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceData | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    // Initial fetch
    fetch("/api/maintenance")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setMaintenanceData(d); })
      .catch(() => {});
    // Fallback poll every 60s (SSE handles real-time updates below)
    const id = setInterval(() => {
      fetch("/api/maintenance")
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setMaintenanceData(d); })
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Real-time maintenance + ban via SSE
  useEffect(() => {
    if (!userId) return;
    const token = sessionStorage.getItem("pulse-token");
    if (!token) return;
    const url = `/api/users/me/events?_token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    const handleMaintenance = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as MaintenanceData;
        setMaintenanceData(data);
      } catch {}
    };

    // When admin bans this user in real-time — log them out immediately
    const handleBanned = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { userId: number; banReason: string | null; banExpiresAt: string | null };
        if (data.userId !== userId) return;
        es.close();
        // Clear session
        sessionStorage.removeItem("pulse-user-id");
        sessionStorage.removeItem("pulse-user");
        sessionStorage.removeItem("pulse-token");
        sessionStorage.removeItem("pulse-tab-owned");
        queryClient.clear();
        // Store ban info so Login page can show it immediately
        sessionStorage.setItem("pulse-banned-info", JSON.stringify({
          banReason: data.banReason || "Причина не указана",
          banExpiresAt: data.banExpiresAt || null,
        }));
        setUserId(null);
      } catch {}
    };

    es.addEventListener("maintenance", handleMaintenance);
    es.addEventListener("banned", handleBanned);
    return () => {
      es.removeEventListener("maintenance", handleMaintenance);
      es.removeEventListener("banned", handleBanned);
      es.close();
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) { setIsAdminUser(false); return; }
    const token = sessionStorage.getItem("pulse-token");
    if (!token) return;
    fetch("/api/admin/check", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setIsAdminUser(d?.isAdmin === true))
      .catch(() => {});
  }, [userId]);

  // Global handler: when any API call returns 401 (expired/invalid token),
  // clear this tab's session and return to login screen
  useEffect(() => {
    const handleUnauthorized = () => {
      sessionStorage.removeItem("pulse-user-id");
      sessionStorage.removeItem("pulse-user");
      sessionStorage.removeItem("pulse-token");
      sessionStorage.removeItem("pulse-tab-owned");
      queryClient.clear();
      setUserId(null);
    };
    window.addEventListener("pulse:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("pulse:unauthorized", handleUnauthorized);
  }, []);

  const [showLoginSplash, setShowLoginSplash] = useState(false);

  const persistAndSwitch = (id: number) => {
    queryClient.clear();
    setUserId(id);
  };

  const handleLogin = (id: number) => {
    const user = (() => { try { return JSON.parse(sessionStorage.getItem("pulse-user") || "{}"); } catch { return {}; } })();
    const token = sessionStorage.getItem("pulse-token");
    saveAccount({
      userId: id,
      displayName: user.displayName || "User",
      username: user.username || "",
      avatarUrl: user.avatarUrl || null,
      avatarColor: user.avatarColor || "#3B82F6",
      token: token || undefined,
    });
    sessionStorage.setItem("pulse-tab-owned", "1");
    setShowLoginSplash(true);
    persistAndSwitch(id);
  };

  const handleSwitchAccount = (id: number) => {
    const accounts = getSavedAccounts();
    const acc = accounts.find(a => a.userId === id);
    if (!acc) return;
    if (acc.token) {
      sessionStorage.setItem("pulse-token", acc.token);
    } else {
      sessionStorage.removeItem("pulse-token");
    }
    sessionStorage.setItem("pulse-user-id", String(id));
    sessionStorage.setItem("pulse-user", JSON.stringify({
      id: acc.userId,
      displayName: acc.displayName,
      username: acc.username,
      avatarUrl: acc.avatarUrl,
      avatarColor: acc.avatarColor,
    }));
    sessionStorage.setItem("pulse-tab-owned", "1");
    persistAndSwitch(id);
  };

  const handleRemoveAccount = (id: number) => {
    removeAccount(id);
    if (id === userId) {
      const remaining = getSavedAccounts();
      if (remaining.length > 0) {
        handleSwitchAccount(remaining[0].userId);
      } else {
        sessionStorage.removeItem("pulse-user-id");
        sessionStorage.removeItem("pulse-user");
        sessionStorage.removeItem("pulse-token");
        sessionStorage.removeItem("pulse-tab-owned");
        queryClient.clear();
        setUserId(null);
      }
    }
  };

  const handleLogout = () => {
    const currentId = userId;
    sessionStorage.removeItem("pulse-user-id");
    sessionStorage.removeItem("pulse-user");
    sessionStorage.removeItem("pulse-token");
    sessionStorage.removeItem("pulse-tab-owned");
    // Remove from localStorage so the user isn't auto-restored on next page load
    if (currentId !== null) removeAccount(currentId);
    queryClient.clear();

    // If another saved account exists, switch to it instead of going to login
    const remaining = getSavedAccounts().filter(a => a.userId !== currentId);
    if (remaining.length > 0) {
      const acc = remaining[0];
      if (acc.token) sessionStorage.setItem("pulse-token", acc.token);
      sessionStorage.setItem("pulse-user-id", String(acc.userId));
      sessionStorage.setItem("pulse-user", JSON.stringify({
        id: acc.userId,
        displayName: acc.displayName,
        username: acc.username,
        avatarUrl: acc.avatarUrl,
        avatarColor: acc.avatarColor,
      }));
      sessionStorage.setItem("pulse-tab-owned", "1");
      setUserId(acc.userId);
    } else {
      setUserId(null);
    }
  };

  const handleAccountAdded = (id: number) => {
    setAddingAccount(false);
    sessionStorage.setItem("pulse-tab-owned", "1");
    persistAndSwitch(id);
  };

  return (
    <div style={{
      zoom: `${zoom}%`,
      height: zoom === 100 ? "var(--app-h, 100dvh)" : `${(100 / (zoom / 100)).toFixed(4)}dvh`,
      width: `${(100 / (zoom / 100)).toFixed(4)}%`,
      overflow: "hidden",
    }}>
    <ErrorBoundary>
    <LandscapeBlock />
    <LanguageProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={localStoragePersister ? {
          persister: localStoragePersister,
          maxAge: 1000 * 60 * 60 * 24,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              const key = query.queryKey[0];
              return typeof key === "string" && (
                key === "/api/chats" ||
                key === "/api/users/me" ||
                key === "/api/stories" ||
                key === "/api/contacts" ||
                key === "/api/posts"
              );
            },
          },
        } : { persister: { persistClient: async () => {}, restoreClient: async () => undefined, removeClient: async () => {} } }}
      >
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            <Route path="/privacy" component={Privacy} />
            <Route path="/terms" component={Terms} />
            <Route>
              {userId ? (
                <ErrorBoundary>
                  <>
                    <MainApp
                      key={userId}
                      onLogout={handleLogout}
                      onSwitchAccount={handleSwitchAccount}
                      onRemoveAccount={handleRemoveAccount}
                      onOpenAddAccount={() => setAddingAccount(true)}
                    />
                    <AddAccountDialog
                      open={addingAccount}
                      onClose={() => setAddingAccount(false)}
                      onAccountAdded={handleAccountAdded}
                    />
                  </>
                </ErrorBoundary>
              ) : (
                <AuthPages onLogin={handleLogin} />
              )}
            </Route>
          </Switch>
          <PwaInstallPrompt />
        </WouterRouter>
      </PersistQueryClientProvider>
    </LanguageProvider>
    <AnimatePresence>
      {showLoginSplash && <LoginSplash onDone={() => setShowLoginSplash(false)} />}
    </AnimatePresence>
    {/* Maintenance overlay — shown for non-admin users during technical break */}
    {maintenanceData?.active && !isAdminUser && (
      <MaintenanceScreen
        data={maintenanceData}
        onExpired={() => setMaintenanceData(prev => prev ? { ...prev, active: false } : null)}
      />
    )}
    </ErrorBoundary>
    </div>
  );
}

export default App;
