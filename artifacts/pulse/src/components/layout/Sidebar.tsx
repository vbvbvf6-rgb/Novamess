import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  MessageCircle,
  Phone,
  Users,
  Gift,
  History,
  UserCircle,
  Settings,
  Rss,
  Wallet,
  MoreHorizontal,
  LogOut,
  Shield,
  Sparkles,
  Crown,
  X,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";
import { useGetMe, useGetChats } from "@workspace/api-client-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ADMIN_USER_IDS = [4];

const NAV_ITEMS = [
  { href: "/", icon: MessageCircle, label: "Чаты" },
  { href: "/calls", icon: Phone, label: "Звонки" },
  { href: "/feed", icon: Rss, label: "Лента" },
  { href: "/contacts", icon: Users, label: "Контакты" },
  { href: "/gifts", icon: Gift, label: "Подарки" },
  { href: "/stories", icon: History, label: "Истории" },
  { href: "/wallet", icon: Wallet, label: "Кошелёк" },
  { href: "/profile", icon: UserCircle, label: "Профиль" },
  { href: "/settings", icon: Settings, label: "Настройки" },
];

function VerifiedBadge() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#00BCD4"/>
      <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shrink-0">
      ⭐
    </span>
  );
}

interface SidebarProps {
  mobileSidebarOpen: boolean;
  onMobileClose: () => void;
  onMobileOpen: () => void;
}

export function Sidebar({ mobileSidebarOpen, onMobileClose, onMobileOpen }: SidebarProps) {
  const [location, navigate] = useLocation();
  const { logout } = useAppContext();
  const { data: me } = useGetMe();
  const { data: chats } = useGetChats();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(ADMIN_USER_IDS.includes(me?.id ?? -1));

  useEffect(() => {
    const uid = localStorage.getItem("pulse-user-id");
    if (!uid) return;
    fetch("/api/admin/check", { headers: { "x-user-id": uid } })
      .then(r => r.json())
      .then(d => { if (d.isAdmin) setIsAdmin(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (me?.id && ADMIN_USER_IDS.includes(me.id)) setIsAdmin(true);
  }, [me?.id]);

  const totalUnread = chats?.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0) ?? 0;

  const initial = me?.displayName?.[0]?.toUpperCase() || "U";
  const isPremium = (me as any)?.hasPrime ?? false;

  const openSupportChat = async () => {
    const uid = localStorage.getItem("pulse-user-id");
    if (!uid) return;
    try {
      const usersRes = await fetch("/api/users/search?q=pulse_support", { headers: { "x-user-id": uid } });
      let botUsers = usersRes.ok ? await usersRes.json() : [];
      if (!botUsers.length) {
        const aiRes = await fetch("/api/users/search?q=deepseek_ai", { headers: { "x-user-id": uid } });
        botUsers = aiRes.ok ? await aiRes.json() : [];
      }
      if (!botUsers.length) { toast({ variant: "destructive", title: "Бот недоступен", description: "Бот поддержки временно недоступен." }); return; }
      const bot = botUsers[0];
      const chatRes = await fetch("/api/chats/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": uid },
        body: JSON.stringify({ userId: bot.id }),
      });
      if (chatRes.ok) {
        const chat = await chatRes.json();
        navigate("/");
        onMobileClose();
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("open-chat", { detail: chat.id }));
        }, 100);
      }
    } catch {}
  };

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 lg:px-6 mb-6 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(0,188,212,0.5)] shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="white" />
            </svg>
          </div>
          <span className="font-bold text-xl tracking-tight text-white">Pulse</span>
        </div>
        <button
          onClick={onMobileClose}
          className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 w-full flex flex-col gap-1 px-2 lg:px-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const showBadge = item.href === "/" && totalUnread > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative",
                isActive
                  ? "bg-primary/10 text-primary shadow-[inset_4px_0_0_0_hsl(var(--primary))]"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <div className="relative shrink-0">
                <item.icon
                  size={22}
                  className={cn(
                    "transition-transform group-hover:scale-110",
                    isActive && "drop-shadow-[0_0_6px_hsl(var(--primary))]"
                  )}
                />
                {showBadge && (
                  <div className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[9px] font-bold px-1 py-px rounded-full min-w-[16px] text-center leading-tight">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </div>
                )}
              </div>
              <span className="font-medium truncate">{item.label}</span>
            </Link>
          );
        })}

        <Link
          href="/prime"
          onClick={onMobileClose}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative border border-yellow-500/20",
            location.startsWith("/prime")
              ? "bg-yellow-500/20 text-yellow-300"
              : "text-yellow-400/70 hover:bg-yellow-500/10 hover:text-yellow-300"
          )}
        >
          <Crown size={22} className="transition-transform group-hover:scale-110 shrink-0" />
          <span className="font-medium truncate">Pulse Prime</span>
        </Link>

        {isAdmin && (
          <Link
            href="/admin"
            onClick={onMobileClose}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative border border-purple-500/20",
              location.startsWith("/admin")
                ? "bg-purple-500/20 text-purple-300"
                : "text-purple-400/70 hover:bg-purple-500/10 hover:text-purple-300"
            )}
          >
            <Shield size={22} className="transition-transform group-hover:scale-110 shrink-0" />
            <span className="font-medium truncate">Админ-панель</span>
          </Link>
        )}
      </nav>

      <div className="w-full px-2 lg:px-4 pt-3 mt-auto border-t border-border">
        <div className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-secondary transition-colors">
          <div className="relative shrink-0">
            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden",
                isPremium && "ring-2 ring-yellow-400/60 ring-offset-1 ring-offset-card"
              )}
              style={{ backgroundColor: me?.avatarColor || "#3B82F6" }}
            >
              {me?.avatarUrl ? (
                <img src={me.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            {isPremium && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center shadow-sm">
                <Sparkles size={9} className="text-yellow-900" />
              </div>
            )}
          </div>

          <div className="flex flex-1 min-w-0 flex-col">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold truncate text-foreground leading-tight">{me?.displayName || "..."}</p>
              {(me as any)?.isVerified && <VerifiedBadge />}
            </div>
            <div className="flex items-center gap-1">
              <p className="text-xs text-muted-foreground truncate">@{me?.username || "..."}</p>
              {isPremium && <PremiumBadge />}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-52">
              <DropdownMenuItem asChild>
                <Link href="/profile" onClick={onMobileClose} className="flex items-center w-full cursor-pointer">
                  <UserCircle size={15} className="mr-2 text-primary" />
                  Мой профиль
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" onClick={onMobileClose} className="flex items-center w-full cursor-pointer">
                  <Settings size={15} className="mr-2 text-muted-foreground" />
                  Настройки
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin" onClick={onMobileClose} className="flex items-center w-full cursor-pointer text-purple-400 focus:text-purple-400">
                      <Shield size={15} className="mr-2" />
                      Администратор
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut size={15} className="mr-2" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button - shown when sidebar is closed */}
      <button
        onClick={onMobileOpen}
        className={cn(
          "md:hidden fixed top-3 left-3 z-40 w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground shadow-lg transition-all",
          mobileSidebarOpen && "opacity-0 pointer-events-none"
        )}
      >
        <Menu size={20} />
      </button>

      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 h-screen bg-card border-r border-border flex-col py-4 flex-shrink-0">
        {SidebarContent}
      </div>

      {/* Mobile sidebar overlay */}
      <div className={cn(
        "md:hidden fixed top-0 left-0 h-full w-72 bg-card border-r border-border flex flex-col py-4 z-40 transition-transform duration-300 shadow-2xl",
        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {SidebarContent}
      </div>
    </>
  );
}
