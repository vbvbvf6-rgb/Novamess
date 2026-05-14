import React from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { useAppContext } from "@/contexts/AppContext";
import { ActiveCall } from "@/components/calls/ActiveCall";
import { IncomingCall } from "@/components/calls/IncomingCall";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { activeCall } = useAppContext();

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <Sidebar mobileSidebarOpen={false} onMobileClose={() => {}} />
      <main className="flex-1 flex overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
        {children}
        <ActiveCall />
        <IncomingCall />
      </main>
      <BottomNav />
    </div>
  );
}
