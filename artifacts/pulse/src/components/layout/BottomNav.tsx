import React from "react";
import { Link, useLocation } from "wouter";
import { MessageCircle, Phone, Users, Rss, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetChats } from "@workspace/api-client-react";
import { useAppContext } from "@/contexts/AppContext";

interface BottomNavProps {
  onOpenPalette?: () => void;
  onOpenSidebar?: () => void;
}

export function BottomNav({ onOpenPalette, onOpenSidebar }: BottomNavProps) {
  const [location] = useLocation();
  const { data: chats } = useGetChats();
  const { selectedChatId } = useAppContext();

  const totalUnread = chats?.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0) ?? 0;

  const NAV_ITEMS = [
    { href: "/",         icon: MessageCircle, label: "Чаты",    badge: totalUnread },
    { href: "/calls",    icon: Phone,         label: "Звонки",  badge: 0 },
    { href: "/contacts", icon: Users,         label: "Контакты",badge: 0 },
    { href: "/feed",     icon: Rss,           label: "Лента",   badge: 0 },
  ];

  if (selectedChatId) return null;

  return (
    <nav
      className="flex md:hidden fixed bottom-0 inset-x-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="w-full bg-card/95 backdrop-blur-xl border-t border-border flex items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/"
            ? location === "/"
            : location.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-[3px] flex-1 py-2 min-h-[52px] transition-all active:scale-95",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <item.icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={cn("transition-all duration-200", isActive && "scale-110")}
                  fill={isActive ? "currentColor" : "none"}
                />
                {item.badge > 0 && (
                  <div className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shadow-sm">
                    {item.badge > 99 ? "99+" : item.badge}
                  </div>
                )}
              </div>
              <span className={cn("text-[10px] font-semibold leading-none transition-colors", isActive ? "text-primary" : "text-muted-foreground/60")}>
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          onClick={onOpenSidebar}
          className="relative flex flex-col items-center justify-center gap-[3px] flex-1 py-2 min-h-[52px] transition-all active:scale-95 text-muted-foreground"
        >
          <Menu size={24} strokeWidth={1.8} />
          <span className="text-[10px] font-semibold leading-none text-muted-foreground/60">Ещё</span>
        </button>
      </div>
    </nav>
  );
}
