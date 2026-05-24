import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { useAppContext } from "@/contexts/AppContext";
import { ActiveCall } from "@/components/calls/ActiveCall";
import { IncomingCall } from "@/components/calls/IncomingCall";
import { CommandPalette } from "@/components/CommandPalette";
import { useToast } from "@/hooks/use-toast";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { activeCall } = useAppContext();
  const { toast } = useToast();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message: string };
      toast({ title: "Ошибка звонка", description: detail?.message, variant: "destructive" });
    };
    window.addEventListener("pulse:call-error", handler);
    return () => window.removeEventListener("pulse:call-error", handler);
  }, [toast]);

  useEffect(() => {
    const handler = () => setMobileSidebarOpen(true);
    window.addEventListener("pulse:open-sidebar", handler);
    return () => window.removeEventListener("pulse:open-sidebar", handler);
  }, []);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <Sidebar
        mobileSidebarOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        onOpenPalette={() => setPaletteOpen(true)}
      />
      <main className="flex-1 flex overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
        {children}
        <ActiveCall />
        <IncomingCall />
      </main>
      <BottomNav
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenSidebar={() => setMobileSidebarOpen(true)}
      />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
