import { useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";

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
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import NotFound from "@/pages/not-found";

let queryClient = new QueryClient();

function MainApp({ onLogout }: { onLogout: () => void }) {
  return (
    <LanguageProvider>
    <AppProvider onLogout={onLogout}>
      <TooltipProvider>
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
            <Route path="/profile" component={Profile} />
            <Route path="/settings" component={Settings} />
            <Route path="/user/:userId" component={UserProfile} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
        <Toaster />
      </TooltipProvider>
    </AppProvider>
    </LanguageProvider>
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
  const [userId, setUserId] = useState<number | null>(() => {
    const stored = localStorage.getItem("pulse-user-id");
    return stored ? Number(stored) : null;
  });

  const handleLogin = (id: number) => {
    queryClient.clear();
    setUserId(id);
  };

  const handleLogout = () => {
    localStorage.removeItem("pulse-user-id");
    localStorage.removeItem("pulse-user");
    queryClient.clear();
    setUserId(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        {userId ? (
          <MainApp onLogout={handleLogout} />
        ) : (
          <AuthPages onLogin={handleLogin} />
        )}
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
