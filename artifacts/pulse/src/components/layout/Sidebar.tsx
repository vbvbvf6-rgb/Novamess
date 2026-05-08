import React from "react";
import { Link, useLocation } from "wouter";
import { 
  MessageCircle, 
  Phone, 
  Users, 
  Gift, 
  History,
  UserCircle,
  Settings,
  Rss
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", icon: MessageCircle, label: "Chats" },
  { href: "/calls", icon: Phone, label: "Calls" },
  { href: "/feed", icon: Rss, label: "Feed" },
  { href: "/contacts", icon: Users, label: "Contacts" },
  { href: "/gifts", icon: Gift, label: "Gifts" },
  { href: "/stories", icon: History, label: "Stories" },
  { href: "/profile", icon: UserCircle, label: "Profile" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-16 md:w-20 lg:w-64 h-screen bg-card border-r border-border flex flex-col items-center lg:items-stretch py-4 flex-shrink-0">
      <div className="flex items-center justify-center lg:justify-start lg:px-6 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(0,188,212,0.5)]">
          <MessageCircle className="text-primary-foreground" size={24} />
        </div>
        <span className="hidden lg:block ml-3 font-bold text-xl tracking-tight text-white">Pulse</span>
      </div>

      <nav className="flex-1 w-full flex flex-col gap-1 px-2 lg:px-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative",
              isActive 
                ? "bg-primary/10 text-primary shadow-[inset_4px_0_0_0_hsl(var(--primary))]" 
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}>
              <item.icon size={22} className={cn(
                "transition-transform group-hover:scale-110 shrink-0",
                isActive && "drop-shadow-[0_0_6px_hsl(var(--primary))]"
              )} />
              <span className="hidden lg:block font-medium truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
