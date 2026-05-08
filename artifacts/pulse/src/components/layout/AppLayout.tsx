import React from "react";
import { Sidebar } from "./Sidebar";
import { useAppContext } from "@/contexts/AppContext";
import { ActiveCall } from "@/components/calls/ActiveCall";
import { IncomingCall } from "@/components/calls/IncomingCall";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { activeCall } = useAppContext();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 flex overflow-hidden relative">
        {children}
        <ActiveCall />
        <IncomingCall />
      </main>
    </div>
  );
}
