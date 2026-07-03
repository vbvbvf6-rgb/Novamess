import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { MessageCircle, Phone, Users, Rss, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetChats } from "@workspace/api-client-react";
import { useAppContext } from "@/contexts/AppContext";
import { motion, AnimatePresence } from "framer-motion";

interface BottomNavProps {
  onOpenPalette?: () => void;
  onOpenSidebar?: () => void;
}

export function BottomNav({ onOpenPalette, onOpenSidebar }: BottomNavProps) {
  const [location] = useLocation();
  const { data: chats } = useGetChats();
  const { selectedChatId, activeCall } = useAppContext();

  const totalUnread = chats?.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0) ?? 0;
  const [pendingRequests, setPendingRequests] = useState(0);
  const fetchPendingNav = () => {
    const token = sessionStorage.getItem("pulse-token");
    if (!token) return;
    fetch("/api/contact-requests/incoming", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then((rows: any[]) => setPendingRequests(rows.length))
      .catch(() => {});
  };
  useEffect(() => { fetchPendingNav(); }, []);
  useEffect(() => {
    const onNew = () => setPendingRequests(p => p + 1);
    const onResolved = () => fetchPendingNav();
    window.addEventListener("pulse:contact-request", onNew);
    window.addEventListener("pulse:contact-request-accepted", onResolved);
    window.addEventListener("pulse:contact-requests-resolved", onResolved);
    return () => {
      window.removeEventListener("pulse:contact-request", onNew);
      window.removeEventListener("pulse:contact-request-accepted", onResolved);
      window.removeEventListener("pulse:contact-requests-resolved", onResolved);
    };
  }, []);

  const [visible, setVisible] = useState(true);
  const touchStartY = useRef(0);
  const lastScrollTop = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const scheduleShow = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setVisible(true);
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      const dy = touchStartY.current - e.touches[0].clientY;
      if (dy > 12) {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        setVisible(false);
      } else if (dy < -12) {
        scheduleShow();
      }
    };

    const onTouchEnd = () => {
      // Re-show after a moment if user just tapped (no real scroll)
    };

    // capture: true catches scroll from any child container (overflow-y-auto etc.)
    const onScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || typeof target.scrollTop !== "number") return;
      const st = target.scrollTop;
      const diff = st - lastScrollTop.current;
      if (diff > 8) {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        setVisible(false);
      } else if (diff < -8) {
        scheduleShow();
      }
      lastScrollTop.current = st;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("scroll", onScroll, { capture: true });
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  // Always re-show when route changes
  useEffect(() => {
    setVisible(true);
    lastScrollTop.current = 0;
  }, [location]);

  const NAV_ITEMS = [
    { href: "/",         icon: MessageCircle, label: "Чаты",     badge: totalUnread },
    { href: "/calls",    icon: Phone,         label: "Звонки",   badge: 0 },
    { href: "/contacts", icon: Users,         label: "Контакты", badge: pendingRequests },
    { href: "/feed",     icon: Rss,           label: "Лента",    badge: 0 },
  ];

  if (activeCall) return null;
  if (selectedChatId && location === "/") return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          key="bottom-nav"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.7 }}
          className="flex md:hidden fixed bottom-0 inset-x-0 z-50 pointer-events-none"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div
            className="mx-3 mb-3 flex-1 pointer-events-auto"
            style={{
              background: "hsl(var(--card) / 0.88)",
              backdropFilter: "blur(40px) saturate(200%)",
              WebkitBackdropFilter: "blur(40px) saturate(200%)",
              border: "1px solid hsl(var(--foreground) / 0.07)",
              borderRadius: "24px",
              boxShadow: "0 12px 48px hsl(0 0% 0% / 0.18), 0 2px 8px hsl(0 0% 0% / 0.08), inset 0 1px 0 hsl(var(--foreground) / 0.05)",
            }}
          >
            <div className="flex items-stretch justify-around px-1 py-1">
              {NAV_ITEMS.map((item) => {
                const isActive = item.href === "/"
                  ? location === "/"
                  : location.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-1 flex-1 py-2.5 min-h-[62px] rounded-[20px] my-1 mx-0.5 transition-colors duration-150",
                      isActive ? "text-primary" : "text-muted-foreground active:opacity-70"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="bnActive"
                        className="absolute inset-0 rounded-[20px]"
                        style={{ background: "hsl(var(--primary) / 0.12)" }}
                        transition={{ type: "spring", stiffness: 420, damping: 36 }}
                      />
                    )}

                    <div className="relative z-10">
                      <item.icon
                        size={23}
                        strokeWidth={isActive ? 2.5 : 1.75}
                        className="transition-transform duration-150"
                        style={{ transform: isActive ? "scale(1.08)" : "scale(1)" }}
                        fill={isActive ? "currentColor" : "none"}
                      />
                      {item.badge > 0 && (
                        <span className="absolute -top-2 -right-2.5 min-w-[17px] h-[17px] px-0.5 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center border-2 border-card leading-none">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </div>

                    <span className={cn(
                      "text-[10.5px] font-semibold leading-none relative z-10 tracking-tight",
                      isActive ? "text-primary" : "text-muted-foreground/60"
                    )}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}

              <button
                onClick={onOpenSidebar}
                className="relative flex flex-col items-center justify-center gap-1 flex-1 py-2.5 min-h-[62px] rounded-[20px] my-1 mx-0.5 text-muted-foreground active:opacity-70 transition-colors duration-150"
              >
                <Menu size={23} strokeWidth={1.75} />
                <span className="text-[10.5px] font-semibold leading-none text-muted-foreground/60 tracking-tight">Ещё</span>
              </button>
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
