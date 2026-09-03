import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { useAppContext } from "@/contexts/AppContext";
import { ActiveCall } from "@/components/calls/ActiveCall";
import { IncomingCall } from "@/components/calls/IncomingCall";
import { CommandPalette } from "@/components/CommandPalette";
import { useToast } from "@/hooks/use-toast";
import { NetworkStatus } from "@/components/NetworkStatus";
import { MultiChatWindows } from "@/components/chat/MultiChatWindows";
import { MediaMiniPlayer } from "@/components/chat/MediaMiniPlayer";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { activeCall } = useAppContext();
  const { selectedChatId, openChatWindow } = useAppContext();
  const { toast } = useToast();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Track call status transitions to show "call ended" / "connection lost" notifications
  const prevCallRef = React.useRef<{ id?: number; status?: string } | null>(null);
  useEffect(() => {
    const prev = prevCallRef.current;
    const cur = activeCall ? { id: activeCall.id, status: activeCall.status } : null;

    if (prev && prev.status === "active" && !cur) {
      // Call was active and is now gone — show neutral message regardless of who ended it
      toast({ title: "📞 Звонок завершён" });
    }

    prevCallRef.current = cur;
  }, [activeCall, toast]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
      }
      if (e.altKey && e.key === "Enter" && selectedChatId) {
        e.preventDefault();
        openChatWindow(selectedChatId);
      }
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName || "")) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedChatId, openChatWindow]);

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
    <div
      className="flex w-full overflow-hidden bg-background text-foreground relative"
      style={{
        height: "var(--app-h, 100dvh)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      <Sidebar
        mobileSidebarOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        onOpenPalette={() => setPaletteOpen(true)}
      />
      <main className="flex-1 flex overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
        {children}
      </main>
      <MultiChatWindows />
      <MediaMiniPlayer />
      <ActiveCall />
      <IncomingCall />
      <BottomNav
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenSidebar={() => setMobileSidebarOpen(true)}
      />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <NetworkStatus />
    </div>
  );
}
