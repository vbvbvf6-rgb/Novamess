import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppProvider } from "@/contexts/AppContext";
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

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/calls" component={Calls} />
        <Route path="/feed" component={Feed} />
        <Route path="/contacts" component={Contacts} />
        <Route path="/gifts" component={Gifts} />
        <Route path="/stories" component={Stories} />
        <Route path="/wallet" component={Wallet} />
        <Route path="/profile" component={Profile} />
        <Route path="/settings" component={Settings} />
        <Route path="/user/:userId" component={UserProfile} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
