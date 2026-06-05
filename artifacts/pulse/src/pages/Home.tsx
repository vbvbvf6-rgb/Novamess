import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { ChatList } from "@/components/chat/ChatList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useAppContext } from "@/contexts/AppContext";

const SWIPE_THRESHOLD = 90;   // px needed to trigger close
const SWIPE_VELOCITY = 0.4;   // px/ms — fast flick counts even if short

export default function Home() {
  const [, setLocation] = useLocation();
  const { selectedChatId, setSelectedChatId } = useAppContext();

  // ── swipe state ──────────────────────────────────────────────────────────
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);
  const [dragX, setDragX] = useState(0);        // current drag offset
  const [closing, setClosing] = useState(false); // animate-out in progress
  const dragging = useRef(false);

  const closeChat = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setSelectedChatId(null);
      setClosing(false);
      setDragX(0);
    }, 220);
  }, [setSelectedChatId]);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only start tracking when touch begins near the left edge (first 40px)
    // or anywhere — we allow full-width swipe
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
    dragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    if (dx > 0) {
      setDragX(dx);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    dragging.current = false;

    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dt = Date.now() - touchStartTime.current;
    const velocity = dx / dt;

    if (dx > SWIPE_THRESHOLD || (dx > 30 && velocity > SWIPE_VELOCITY)) {
      closeChat();
    } else {
      setDragX(0); // snap back
    }
  };

  // ── open-chat event ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const chatId = (e as CustomEvent).detail;
      if (chatId) setSelectedChatId(Number(chatId));
    };
    window.addEventListener("open-chat", handler);
    return () => window.removeEventListener("open-chat", handler);
  }, [setSelectedChatId]);

  // ── hardware / browser back button ───────────────────────────────────────
  useEffect(() => {
    if (!selectedChatId) return;
    const onPopState = (e: PopStateEvent) => {
      e.preventDefault();
      closeChat();
      window.history.pushState(null, "", window.location.href);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [selectedChatId, closeChat]);

  // ── resolve swipe transform ──────────────────────────────────────────────
  const screenW = typeof window !== "undefined" ? window.innerWidth : 400;
  const overlayX = closing ? screenW : dragX;
  const isAnimating = closing || dragX === 0;

  return (
    <div className="flex w-full h-full">
      <ChatList />
      <div className="flex-1 hidden md:flex">
        {selectedChatId ? (
          <ChatWindow chatId={selectedChatId} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background/50 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
              <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-orange-500/3 blur-[80px]" />
            </div>
            <div className="text-center relative z-10 space-y-8 max-w-sm px-6">
              <div className="space-y-4">
                <div className="w-20 h-20 mx-auto rounded-[28px] bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-[0_8px_40px_rgba(234,88,12,0.2)]">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                    <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="white" />
                  </svg>
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-muted-foreground">Pulse</h2>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Выберите чат слева или начните новый
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: "💬", label: "Новый чат", sub: "Найти", href: "/contacts" },
                  { icon: "🔍", label: "Поиск", sub: "Ctrl+K", href: null },
                  { icon: "📡", label: "Лента", sub: "Feed", href: "/feed" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => item.href ? setLocation(item.href) : null}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-secondary/60 hover:bg-secondary border border-border/50 hover:border-border transition-all active:scale-95 group"
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
                    <div>
                      <p className="text-[11px] font-bold text-foreground leading-tight">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">{item.sub}</p>
                    </div>
                  </button>
                ))}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ── Mobile chat overlay with swipe-to-close ─────────────────────── */}
      {selectedChatId && (
        <>
          {/* Dim the chat list behind while dragging */}
          {dragX > 0 && (
            <div
              className="absolute inset-0 z-[29] md:hidden pointer-events-none"
              style={{ background: `rgba(0,0,0,${0.25 * (1 - dragX / screenW)})` }}
            />
          )}

          <div
            className="absolute inset-0 z-30 md:hidden bg-background"
            style={{
              transform: `translateX(${overlayX}px)`,
              transition: isAnimating ? "transform 0.22s cubic-bezier(0.32,0,0.67,0)" : "none",
              willChange: "transform",
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Swipe hint edge — a subtle left shadow that appears while dragging */}
            {dragX > 0 && (
              <div
                className="absolute left-0 top-0 bottom-0 w-1 pointer-events-none"
                style={{
                  background: "linear-gradient(to right, rgba(var(--primary),0.6), transparent)",
                  opacity: Math.min(dragX / 60, 1),
                }}
              />
            )}
            <ChatWindow chatId={selectedChatId} />
          </div>
        </>
      )}
    </div>
  );
}
