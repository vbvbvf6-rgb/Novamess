import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  MessageCircle,
  Phone,
  Users,
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
  UserPlus,
  Check,
  Trash2,
  Trophy,
  Sun,
  Moon,
  Search,
  CalendarDays,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGetMe, useGetChats } from "@workspace/api-client-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SavedAccount } from "@/lib/accounts";
import PulseLogo from "@/components/PulseLogo";

function AccountRow({
  account,
  isActive,
  onSwitch,
  onRemove,
}: {
  account: SavedAccount;
  isActive: boolean;
  onSwitch: () => void;
  onRemove: () => void;
}) {
  const initial = account.displayName[0]?.toUpperCase() || "?";
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
        isActive ? "bg-primary/10 border border-primary/20 shadow-sm" : "hover:bg-secondary cursor-pointer border border-transparent"
      )}
      onClick={!isActive ? onSwitch : undefined}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden shadow-sm relative"
        style={{ backgroundColor: account.avatarColor }}
      >
        <span className="absolute inset-0 flex items-center justify-center">{initial}</span>
        {account.avatarUrl && (
          <img src={account.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-foreground truncate leading-tight">{account.displayName}</p>
        <p className="text-[11px] text-muted-foreground truncate font-medium">@{account.username}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isActive && <Check size={16} className="text-primary" />}
        {!isActive && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1.5 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:bg-destructive/10 active:text-destructive transition-all"
            title="Удалить аккаунт"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function MobileAccountFooter({
  me, initial, isPremium, savedAccounts, currentUserId, canAddAccount,
  switchAccount, removeAccount, openAddAccount, logout,
}: {
  me: any; initial: string; isPremium: boolean;
  savedAccounts: SavedAccount[]; currentUserId: number | null; canAddAccount: boolean;
  switchAccount: (id: number) => void; removeAccount: (id: number) => void;
  openAddAccount: () => void; logout: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="w-full px-4 pb-6 pt-4 mt-auto border-t border-border/50 bg-background/50 backdrop-blur-sm">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/50 hover:border-border shadow-sm transition-all focus:outline-none"
      >
        <div className="relative shrink-0">
          <div
            className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden relative", isPremium && "ring-2 ring-violet-500 ring-offset-2 ring-offset-card")}
            style={{ backgroundColor: me?.avatarColor || "#3B82F6" }}
          >
            <span className="absolute inset-0 flex items-center justify-center">{initial}</span>
            {me?.avatarUrl && <img src={me.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
          </div>
          {savedAccounts.length > 1 ? (
            <div className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-sm border-2 border-card">
              {savedAccounts.length}
            </div>
          ) : (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-card shadow-sm" title="В сети" />
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[14px] font-bold truncate text-foreground leading-tight">{me?.displayName || "..."}</p>
          <p className="text-[12px] text-muted-foreground truncate font-medium">@{me?.username || "..."}</p>
        </div>
        <MoreHorizontal size={18} className={cn("text-muted-foreground shrink-0 transition-transform", expanded && "rotate-90")} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-1.5">
              {savedAccounts.map(acc => (
               <div key={acc.userId} className="bg-card rounded-xl border border-border/50 p-1">
                 <AccountRow
                  account={acc}
                  isActive={acc.userId === currentUserId}
                  onSwitch={() => { setExpanded(false); switchAccount(acc.userId); }}
                  onRemove={() => removeAccount(acc.userId)}
                 />
               </div>
              ))}
              {canAddAccount && (
                <button
                  onClick={() => { setExpanded(false); openAddAccount(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-primary bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-colors text-[13px] font-bold"
                >
                  <UserPlus size={16} />
                  Добавить аккаунт
                  {savedAccounts.length > 0 && (
                    <span className="ml-auto text-[10px] font-black uppercase tracking-wider text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">{savedAccounts.length}/3</span>
                  )}
                </button>
              )}
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors text-[13px] font-bold mt-2"
              >
                <LogOut size={16} />
                Выйти
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SidebarProps {
  mobileSidebarOpen: boolean;
  onMobileClose: () => void;
  onMobileOpen?: () => void;
  onOpenPalette?: () => void;
}

export function Sidebar({ mobileSidebarOpen, onMobileClose, onMobileOpen, onOpenPalette }: SidebarProps) {
  const [location, navigate] = useLocation();
  const { logout, currentUserId, savedAccounts, switchAccount, removeAccount, openAddAccount, canAddAccount, isDark, toggleTheme } = useAppContext();
  const { t } = useLanguage();
  const { data: me } = useGetMe();
  const { data: chats } = useGetChats();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showEvents, setShowEvents] = useState(() => localStorage.getItem("pulse-show-events") !== "false");

  useEffect(() => {
    setIsAdmin((me as any)?.isAdmin === true);
  }, [me]);

  useEffect(() => {
    const handler = () => setShowEvents(localStorage.getItem("pulse-show-events") === "true");
    window.addEventListener("pulse:events-toggle", handler);
    return () => window.removeEventListener("pulse:events-toggle", handler);
  }, []);

  const totalUnread = chats?.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0) ?? 0;
  const initial = me?.displayName?.[0]?.toUpperCase() || "U";
  const isPremium = (me as any)?.hasPrime ?? false;

  // Pending contact requests badge
  const [pendingRequests, setPendingRequests] = useState(0);
  const fetchPending = () => {
    const token = sessionStorage.getItem("pulse-token");
    if (!token) return;
    fetch("/api/contact-requests/incoming", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then((rows: any[]) => setPendingRequests(rows.length))
      .catch(() => {});
  };
  useEffect(() => { fetchPending(); }, [currentUserId]);
  useEffect(() => {
    const onNew = () => setPendingRequests(p => p + 1);
    const onResolved = () => fetchPending(); // re-fetch after accept/decline
    window.addEventListener("pulse:contact-request", onNew);
    window.addEventListener("pulse:contact-request-accepted", onResolved);
    window.addEventListener("pulse:contact-requests-resolved", onResolved);
    return () => {
      window.removeEventListener("pulse:contact-request", onNew);
      window.removeEventListener("pulse:contact-request-accepted", onResolved);
      window.removeEventListener("pulse:contact-requests-resolved", onResolved);
    };
  }, []);

  const NAV_ITEMS: Array<{ href: string; icon: any; label: string; soon?: boolean }> = [
    { href: "/",             icon: MessageCircle,  label: t("nav.chats") },
    { href: "/calls",        icon: Phone,          label: t("nav.calls") },
    { href: "/feed",         icon: Rss,            label: t("nav.feed") },
    { href: "/contacts",     icon: Users,          label: t("nav.contacts") },
    { href: "/stories",      icon: History,        label: t("nav.stories") },
    ...(showEvents ? [{ href: "/events", icon: CalendarDays, label: t("nav.events") }] : []),
    { href: "/wallet",       icon: Wallet,         label: t("nav.wallet") },
    { href: "/gifts",        icon: Gift,           label: "Подарки" },
    { href: "/leaderboard",  icon: Trophy,         label: t("nav.leaderboard") },
    { href: "/profile",      icon: UserCircle,     label: t("nav.profile") },
    { href: "/settings",     icon: Settings,       label: t("nav.settings") },
  ];

  const AccountsSection = (
    <>
      {savedAccounts.length > 0 && (
        <div className="p-1.5 space-y-1">
          {savedAccounts.map(acc => (
            <AccountRow
              key={acc.userId}
              account={acc}
              isActive={acc.userId === currentUserId}
              onSwitch={() => switchAccount(acc.userId)}
              onRemove={() => removeAccount(acc.userId)}
            />
          ))}
        </div>
      )}
      {canAddAccount && (
        <div className="px-1.5 pb-1">
          <button
            onClick={openAddAccount}
            className="w-full flex items-center gap-2 px-3 py-2 text-primary hover:bg-primary/10 cursor-pointer rounded-xl text-[13px] font-bold transition-colors"
          >
            <UserPlus size={16} />
            Добавить аккаунт
            {savedAccounts.length > 0 && (
              <span className="ml-auto text-[10px] font-black uppercase tracking-wider text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded-full">{savedAccounts.length}/3</span>
            )}
          </button>
        </div>
      )}
      <DropdownMenuSeparator className="bg-border/50" />
    </>
  );

  const DesktopSidebar = (
    <div className="hidden md:flex flex-col w-[260px] bg-[#f2f3f5] dark:bg-[#0a0a0d] rounded-r-[28px] shrink-0 relative z-20 shadow-[4px_0_32px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_32px_rgba(0,0,0,0.55)] overflow-hidden border-r border-border/40" style={{ height: "var(--app-h, 100dvh)" }}>
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <div className="relative shrink-0 drop-shadow-[0_4px_12px_rgba(59,130,246,0.45)]">
          <PulseLogo size={38} />
        </div>
        <span
          className="font-black text-[22px] tracking-tight flex-1"
          style={{
            background: "linear-gradient(135deg, #ff9a3c 0%, #ff5c1a 50%, #e63200 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Aura
        </span>
        <div className="flex gap-1">
          <button
            onClick={onOpenPalette}
            title="Поиск (Ctrl+K)"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <Search size={16} strokeWidth={2.5} />
          </button>
          <button
            onClick={toggleTheme}
            title={isDark ? "Светлая тема" : "Тёмная тема"}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            {isDark ? <Sun size={16} strokeWidth={2.5} /> : <Moon size={16} strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1 w-full px-4 overflow-y-auto scrollbar-none py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const showBadge = (item.href === "/" && totalUnread > 0) || (item.href === "/contacts" && pendingRequests > 0);
          const badgeCount = item.href === "/" ? totalUnread : pendingRequests;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3.5 px-3.5 py-3 rounded-[16px] transition-all duration-200 group relative",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <div className="relative shrink-0">
                <item.icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={cn(
                    "transition-transform duration-300",
                    isActive ? "scale-100 text-white" : "group-hover:scale-110"
                  )}
                />
                {showBadge && (
                  <div className={cn(
                    "absolute -top-2 -right-2 text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm border-2",
                    isActive ? "bg-white text-primary border-primary" : "bg-primary text-white border-card"
                  )}>
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </div>
                )}
              </div>
              <span className={cn("text-[14px] truncate flex-1", isActive ? "font-bold" : "font-semibold")}>
                {item.label}
              </span>
              {item.soon && (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 shrink-0">Soon</span>
              )}
            </Link>
          );
        })}

        <div className="mt-4 pt-4 border-t border-border/50 flex flex-col gap-1">
          <Link
            href="/prime"
            className={cn(
              "flex items-center gap-3.5 px-3.5 py-3 rounded-[16px] transition-all duration-200 group relative overflow-hidden",
              location.startsWith("/prime")
                ? "text-white shadow-md"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            )}
          >
            {location.startsWith("/prime") && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600" />
            )}
            <Crown size={20} strokeWidth={2.5} className={cn("shrink-0 relative z-10", location.startsWith("/prime") ? "text-white" : "text-blue-500")} />
            <span className={cn("text-[14px] truncate relative z-10", location.startsWith("/prime") ? "font-bold" : "font-semibold")}>
              {t("nav.prime")}
            </span>
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3.5 px-3.5 py-3 rounded-[16px] transition-all duration-200 group relative mt-1 overflow-hidden",
                location.startsWith("/admin")
                  ? "text-white shadow-md"
                  : "bg-secondary/50 text-foreground hover:bg-secondary"
              )}
            >
              {location.startsWith("/admin") && (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600" />
              )}
              <Shield size={20} strokeWidth={2.5} className={cn("shrink-0 relative z-10", location.startsWith("/admin") ? "text-white" : "text-indigo-500")} />
              <span className={cn("text-[14px] truncate relative z-10", location.startsWith("/admin") ? "font-bold" : "font-semibold")}>
                {t("nav.admin")}
              </span>
            </Link>
          )}
        </div>
      </nav>

      <div className="w-full px-4 pb-5 pt-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/80 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 border border-black/8 dark:border-white/8 shadow-sm transition-all focus:outline-none">
              <div className="relative shrink-0">
                {/* Animated ring for Prime+ / static for Prime */}
                {isPremium && (me as any)?.primeTier === "prime_plus" ? (
                  <div
                    className="absolute -inset-[3px] rounded-full"
                    style={{
                      background: "linear-gradient(135deg, #a855f7, #ec4899, #f97316, #a855f7)",
                      backgroundSize: "300% 300%",
                      animation: "primeRingSpin 2.5s linear infinite",
                    }}
                  />
                ) : isPremium ? (
                  <div className="absolute -inset-[3px] rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 opacity-90" />
                ) : null}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden relative z-10"
                  style={{
                    backgroundColor: me?.avatarColor || "#3B82F6",
                    outline: isPremium ? "2px solid var(--background)" : undefined,
                    outlineOffset: isPremium ? "1px" : undefined,
                  }}
                >
                  {me?.avatarUrl
                    ? <img src={me.avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    : initial}
                </div>
                {/* Prime+ sparkle badge */}
                {isPremium && (me as any)?.primeTier === "prime_plus" && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm border-2 border-card z-10"
                    style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}>
                    <Sparkles size={9} className="text-white" />
                  </div>
                )}
                {/* Prime crown badge */}
                {isPremium && (me as any)?.primeTier !== "prime_plus" && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center shadow-sm border-2 border-card z-10">
                    <Crown size={9} className="text-white" />
                  </div>
                )}
                {/* Admin shield badge */}
                {isAdmin && !isPremium && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm border-2 border-card z-10"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                    <Shield size={9} className="text-white" />
                  </div>
                )}
                {isAdmin && isPremium && (
                  <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center shadow-sm border border-card z-10"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                    <Shield size={7} className="text-white" />
                  </div>
                )}
                {savedAccounts.length > 1 && (
                  <div className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-sm border-2 border-card z-10">
                    {savedAccounts.length}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-[14px] font-bold truncate text-foreground leading-tight">{me?.displayName || "..."}</p>
                  {isAdmin && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none border shrink-0"
                      style={{
                        background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.2))",
                        borderColor: "rgba(99,102,241,0.5)",
                        color: "#818cf8",
                      }}
                    >
                      <Shield size={8} className="shrink-0" />
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground truncate font-medium">@{me?.username || "..."}</p>
              </div>
              <MoreHorizontal size={18} className="text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-[260px] rounded-2xl p-1.5 border-border shadow-2xl mb-2 ml-2">
            {AccountsSection}
            <div className="p-1 space-y-1">
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 px-3">
                <Link href="/profile" className="flex items-center w-full">
                  <UserCircle size={18} className="mr-3 text-primary" />
                  <span className="font-bold text-[13px]">{t("menu.myProfile")}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 px-3">
                <Link href="/settings" className="flex items-center w-full">
                  <Settings size={18} className="mr-3 text-muted-foreground" />
                  <span className="font-bold text-[13px]">{t("menu.settings")}</span>
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <div className="my-1 border-t border-border/50" />
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 px-3 data-[highlighted]:bg-indigo-500/10">
                    <Link href="/admin" className="flex items-center w-full text-indigo-500">
                      <Shield size={18} className="mr-3" />
                      <span className="font-bold text-[13px]">{t("menu.administrator")}</span>
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <div className="my-1 border-t border-border/50" />
              <DropdownMenuItem onClick={logout} className="rounded-xl text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive cursor-pointer py-2.5 px-3">
                <LogOut size={18} className="mr-3" />
                <span className="font-bold text-[13px]">{t("menu.logout")}</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  const MobileSidebar = (
    <>
      <div
        className={`fixed inset-0 z-[90] md:hidden bg-background/80 backdrop-blur-sm transition-opacity duration-300 ${mobileSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onMobileClose}
      />
      <div
        className={`mobile-sidebar-drawer fixed left-0 top-0 bottom-0 z-[91] md:hidden w-[280px] bg-[#f2f3f5] dark:bg-[#0a0a0d] rounded-r-[28px] flex flex-col pt-6 shadow-[4px_0_32px_rgba(0,0,0,0.3)] dark:shadow-[4px_0_32px_rgba(0,0,0,0.6)] transition-transform duration-300 overflow-y-auto overscroll-contain`}
        style={{ transform: mobileSidebarOpen ? "translateX(0)" : "translateX(-100%)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center gap-3 px-5 mb-6">
          <div className="relative shrink-0 drop-shadow-[0_3px_10px_rgba(59,130,246,0.4)]">
            <PulseLogo size={36} />
          </div>
          <span
            className="font-black text-[22px] tracking-tight flex-1"
            style={{
              background: "linear-gradient(135deg, #ff9a3c 0%, #ff5c1a 50%, #e63200 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >Aura</span>
          <button
            onClick={toggleTheme}
            title={isDark ? "Светлая тема" : "Тёмная тема"}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary bg-secondary/50 transition-all"
          >
            {isDark ? <Sun size={18} strokeWidth={2.5} /> : <Moon size={18} strokeWidth={2.5} />}
          </button>
          <button onClick={onMobileClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary bg-secondary/50 transition-all">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-4 overflow-y-auto scrollbar-none pb-4">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const showBadge = item.href === "/" && totalUnread > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                  "flex items-center gap-3.5 px-3.5 py-3 rounded-[16px] transition-all duration-200 group relative",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <div className="relative shrink-0">
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={cn("transition-transform duration-300", isActive ? "scale-100 text-white" : "group-hover:scale-110")} />
                  {showBadge && (
                    <div className={cn("absolute -top-2 -right-2 text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm border-2", isActive ? "bg-white text-primary border-primary" : "bg-primary text-white border-card")}>
                      {totalUnread > 99 ? "99+" : totalUnread}
                    </div>
                  )}
                </div>
                <span className={cn("text-[14px] truncate flex-1", isActive ? "font-bold" : "font-semibold")}>{item.label}</span>
              </Link>
            );
          })}

          <div className="mt-4 pt-4 border-t border-border/50 flex flex-col gap-1">
            <Link
              href="/prime"
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3.5 px-3.5 py-3 rounded-[16px] transition-all duration-200 group relative overflow-hidden",
                location.startsWith("/prime")
                  ? "text-white shadow-md"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              )}
            >
              {location.startsWith("/prime") && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600" />
              )}
              <Crown size={20} strokeWidth={2.5} className={cn("shrink-0 relative z-10", location.startsWith("/prime") ? "text-white" : "text-blue-500")} />
              <span className={cn("text-[14px] truncate relative z-10", location.startsWith("/prime") ? "font-bold" : "font-semibold")}>
                {t("nav.prime")}
              </span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={onMobileClose}
                className={cn(
                  "flex items-center gap-3.5 px-3.5 py-3 rounded-[16px] transition-all duration-200 group relative mt-1 overflow-hidden",
                  location.startsWith("/admin")
                    ? "text-white shadow-md"
                    : "bg-secondary/50 text-foreground hover:bg-secondary"
                )}
              >
                {location.startsWith("/admin") && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600" />
                )}
                <Shield size={20} strokeWidth={2.5} className={cn("shrink-0 relative z-10", location.startsWith("/admin") ? "text-white" : "text-indigo-500")} />
                <span className={cn("text-[14px] truncate relative z-10", location.startsWith("/admin") ? "font-bold" : "font-semibold")}>
                  {t("nav.admin")}
                </span>
              </Link>
            )}
          </div>
        </nav>

        <MobileAccountFooter
          me={me}
          initial={initial}
          isPremium={isPremium}
          savedAccounts={savedAccounts}
          currentUserId={currentUserId}
          canAddAccount={canAddAccount}
          switchAccount={(id) => { switchAccount(id); onMobileClose(); }}
          removeAccount={removeAccount}
          openAddAccount={() => { openAddAccount(); onMobileClose(); }}
          logout={() => { onMobileClose(); logout(); }}
        />
      </div>
    </>
  );

  return <>{DesktopSidebar}{MobileSidebar}</>;
}