import React from "react";
import { Link, useLocation } from "wouter";
import { MessageCircle, Phone, Rss, Gift, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", icon: MessageCircle, label: "Chats" },
  { href: "/calls", icon: Phone, label: "Calls" },
  { href: "/feed", icon: Rss, label: "Feed" },
  { href: "/gifts", icon: Gift, label: "Gifts" },
  { href: "/wallet", icon: Wallet, label: "Wallet" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="flex md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-inset-bottom">
      <div className="flex w-full items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[50px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon
                size={22}
                className={cn(
                  "transition-all",
                  isActive && "drop-shadow-[0_0_6px_hsl(var(--primary))] scale-110"
                )}
              />
              <span className={cn("text-[10px] font-semibold", isActive ? "text-primary" : "text-muted-foreground")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
