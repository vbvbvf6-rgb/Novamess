import { useState, useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, useParams } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { AddAccountDialog } from "@/components/layout/AddAccountDialog";
import { getSavedAccounts, saveAccount, removeAccount, SavedAccount } from "@/lib/accounts";
import { ScreenLock } from "@/components/ScreenLock";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, LogOut, ShieldCheck, Megaphone, X, Download, RefreshCw } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WhatsNewModal } from "@/components/WhatsNewModal";
import { OnboardingModal } from "@/components/OnboardingModal";

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

let queryClient = new QueryClient();

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
            Ваш документ отправлен на проверку администратору. После подтверждения вы получите полный доступ к Aura.
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
        const data = (e as CustomEvent).detail as { chatId: number; senderName: string; body: string; messageId: number };
        notify(data.senderName, {
          body: data.body,
          url: "/",
          tag: `chat-${data.chatId}`,
          type: "message",
        });
      } catch {}
    };

    window.addEventListener("pulse:new-message", handler);
    return () => window.removeEventListener("pulse:new-message", handler);
  }, []);

  return null;
}

function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<{ id: number; message: string } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("pulse-token");
    if (!token) return;
    fetch("/api/announcement", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.id && data?.message) {
          const dismissKey = `nova-dismissed-ann-${data.id}`;
          if (!localStorage.getItem(dismissKey)) {
            setAnnouncement(data);
            setVisible(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  if (!visible || !announcement) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      className="fixed top-0 left-0 right-0 z-[200] bg-primary text-primary-foreground px-4 py-2.5 flex items-center gap-3 shadow-xl"
    >
      <Megaphone size={15} className="shrink-0" />
      <p className="text-sm font-medium flex-1 leading-snug">{announcement.message}</p>
      <button
        onClick={() => {
          localStorage.setItem(`nova-dismissed-ann-${announcement.id}`, "1");
          setVisible(false);
        }}
        className="shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

function PwaUpdateBanner() {
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpdate = () => {
    setUpdating(true);
    setProgress(0);

    // Animate progress bar over ~2 seconds
    const startTime = Date.now();
    const duration = 2000;
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (pct < 100) {
        requestAnimationFrame(tick);
      } else {
        // Mark changelog to show after reload, then apply update
        localStorage.setItem("aura-pending-changelog", "true");
        setTimeout(() => applyUpdate(), 150);
      }
    };
    requestAnimationFrame(tick);
  };

  const show = updateAvailable && !dismissed;

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            key="pwa-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm"
            onClick={() => !updating && setDismissed(true)}
          />
          <motion.div
            key="pwa-modal"
            initial={{ opacity: 0, scale: 0.92, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 32 }}
            transition={{ type: "spring", damping: 26, stiffness: 340 }}
            className="fixed inset-0 z-[501] flex items-center justify-center p-5 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
              {/* Top stripe: animated shimmer when idle, real progress when updating */}
              {!updating ? (
                <div className="h-1 bg-gradient-to-r from-primary via-orange-400 to-amber-500 animate-pulse" />
              ) : (
                <div className="h-1 bg-secondary/60 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary via-orange-400 to-amber-500 transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              <div className="px-6 pt-6 pb-5">
                {/* Icon */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                    <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
                      <path d="M50 13 C50 13 54.5 41 87 50 C54.5 59 50 87 50 87 C50 87 45.5 59 13 50 C45.5 41 50 13 50 13Z" fill="white" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-primary mb-0.5">Новая версия</p>
                    <h2 className="text-[20px] font-black text-foreground leading-tight">
                      {updating ? "Устанавливаю..." : "Обновление Aura"}
                    </h2>
                    <p className="text-[13px] text-muted-foreground">
                      {updating ? `${progress}% готово` : "готово к установке"}
                    </p>
                  </div>
                </div>

                {!updating && (
                  <>
                    {/* Description */}
                    <div className="bg-secondary/60 border border-border rounded-2xl px-4 py-3 mb-5 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0">
                          <Download size={14} className="text-green-400" />
                        </div>
                        <p className="text-[13px] text-foreground font-medium">Обновление уже скачано</p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                          <RefreshCw size={14} className="text-blue-400" />
                        </div>
                        <p className="text-[13px] text-muted-foreground">После обновления откроется список изменений</p>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => setDismissed(true)}
                        className="flex-1 py-3 rounded-[16px] border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary transition-all"
                      >
                        Позже
                      </button>
                      <button
                        onClick={handleUpdate}
                        className="flex-[2] py-3 bg-primary text-primary-foreground rounded-[16px] text-[15px] font-black hover:bg-primary/90 transition-all shadow-[0_4px_14px_rgba(234,88,12,0.4)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                      >
                        ⚡ Обновить сейчас
                      </button>
                    </div>
                  </>
                )}

                {updating && (
                  <div className="space-y-3">
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full transition-all duration-100"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-[13px] text-center text-muted-foreground">
                      Пожалуйста, не закрывайте приложение…
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function MainAppInner({ onLogout, onSwitchAccount, onRemoveAccount, onOpenAddAccount }: MainAppProps) {
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

  return (
    <AppProvider
      onLogout={onLogout}
      onSwitchAccount={onSwitchAccount}
      onRemoveAccount={onRemoveAccount}
      onOpenAddAccount={onOpenAddAccount}
    >
      <TooltipProvider>
        <GlobalNotificationListener />
        <PwaUpdateBanner />
        <WhatsNewModal />
        <OnboardingModal />
        <AnnouncementBanner />
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

              <Route path="/leaderboard" component={Leaderboard} />
              <Route path="/events" component={Events} />
              <Route path="/support" component={Support} />
              <Route path="/profile" component={Profile} />
              <Route path="/settings" component={Settings} />
              <Route path="/user/:userId" component={UserProfile} />
              <Route path="/qr/:tokenId" component={QrConfirm} />
              <Route path="/privacy" component={Privacy} />
              <Route path="/terms" component={Terms} />
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
    sessionStorage.removeItem("pulse-user-id");
    sessionStorage.removeItem("pulse-user");
    sessionStorage.removeItem("pulse-token");
    sessionStorage.removeItem("pulse-tab-owned");
    queryClient.clear();
    setUserId(null);
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
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </LanguageProvider>
    </ErrorBoundary>
    </div>
  );
}

export default App;
