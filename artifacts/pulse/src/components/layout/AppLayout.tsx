import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { useAppContext } from "@/contexts/AppContext";
import { ActiveCall } from "@/components/calls/ActiveCall";
import { IncomingCall } from "@/components/calls/IncomingCall";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { activeCall } = useAppContext();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar
        mobileSidebarOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        onMobileOpen={() => setMobileSidebarOpen(true)}
      />
      <main className="flex-1 flex overflow-hidden relative">
        {children}
        <ActiveCall />
        <IncomingCall />
      </main>
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
    </div>
  );
}
