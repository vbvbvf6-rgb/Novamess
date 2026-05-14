import { useState, useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { AddAccountDialog } from "@/components/layout/AddAccountDialog";
import { getSavedAccounts, saveAccount, removeAccount, SavedAccount } from "@/lib/accounts";
import { ScreenLock } from "@/components/ScreenLock";
import { motion } from "framer-motion";
import { Clock, LogOut, ShieldCheck } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

import Home from "@/pages/Home";
import Calls from "@/pages/Calls";
import Contacts from "@/pages/Contacts";
import Gifts from "@/pages/Gifts";
import Stories from "@/pages/Stories";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import UserProfile from "@/pages/UserProfile";
import Feed from "@/pages/Feed";
import Wallet from "@/pages/Wallet";
import Admin from "@/pages/Admin";
import Prime from "@/pages/Prime";
import Bots from "@/pages/Bots";
import Leaderboard from "@/pages/Leaderboard";
import Support from "@/pages/Support";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import NotFound from "@/pages/not-found";

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
            Ваш документ отправлен на проверку администратору. После подтверждения вы получите полный доступ к Pulse.
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
  const sseRef = useRef<EventSource | null>(null);

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

    const token = sessionStorage.getItem("pulse-token");
    if (!token) return; // No token — don't open SSE (auth guard will reject it anyway)
    const es = new EventSource(`/api/users/me/events?_token=${encodeURIComponent(token)}`);
    sseRef.current = es;

    es.addEventListener("new-message", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { chatId: number; senderName: string; body: string; messageId: number };
        notify(data.senderName, {
          body: data.body,
          url: "/",
          tag: `chat-${data.chatId}`,
          type: "message",
        });
      } catch {}
    });

    return () => {
      es.close();
      sseRef.current = null;
    };
  }, []);

  return null;
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
        <ScreenLock>
          <AppLayout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/calls" component={Calls} />
              <Route path="/feed" component={Feed} />
              <Route path="/contacts" component={Contacts} />
              <Route path="/gifts" component={Gifts} />
              <Route path="/stories" component={Stories} />
              <Route path="/wallet" component={Wallet} />
              <Route path="/admin" component={Admin} />
              <Route path="/prime" component={Prime} />
              <Route path="/bots" component={Bots} />
              <Route path="/leaderboard" component={Leaderboard} />
              <Route path="/support" component={Support} />
              <Route path="/profile" component={Profile} />
              <Route path="/settings" component={Settings} />
              <Route path="/user/:userId" component={UserProfile} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </ScreenLock>
        <Toaster />
      </TooltipProvider>
    </AppProvider>
  );
}

function AuthPages({ onLogin }: { onLogin: (userId: number) => void }) {
  const [, navigate] = useLocation();

  const handleLogin = (userId: number) => {
    navigate("/");
    onLogin(userId);
  };

  return (
    <Switch>
      <Route path="/register" component={() => <Register onLogin={handleLogin} />} />
      <Route path="/forgot-password" component={ForgotPassword} />
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
    if (!stored) return null;

    // Detect inherited sessionStorage (tab opened via Ctrl+click / duplicate).
    // After explicit login or account switch we set "pulse-tab-owned" so the
    // app knows this tab legitimately owns this session.
    // If pulse-tab-owned is absent, the session was inherited — clear it so
    // the tab starts fresh at the login screen.
    if (!sessionStorage.getItem("pulse-tab-owned")) {
      sessionStorage.removeItem("pulse-user-id");
      sessionStorage.removeItem("pulse-user");
      sessionStorage.removeItem("pulse-token");
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

  const scale = zoom / 100;

  return (
    <div style={{
      transform: `scale(${scale})`,
      transformOrigin: "top left",
      width: `${100 / scale}%`,
      height: `${100 / scale}vh`,
      overflow: "hidden",
    }}>
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          {userId ? (
            <>
              <MainApp
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
          ) : (
            <AuthPages onLogin={handleLogin} />
          )}
        </WouterRouter>
      </QueryClientProvider>
    </LanguageProvider>
    </div>
  );
}

export default App;
