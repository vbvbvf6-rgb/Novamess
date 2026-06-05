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
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

function VerifiedBadge() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="currentColor" className="text-primary"/>
      <path d="M7 12l3.5 3.5L17 8" stroke="currentColor" className="text-primary-foreground" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

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
        "flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all group",
        isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary cursor-pointer border border-transparent"
      )}
      onClick={!isActive ? onSwitch : undefined}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden shadow-sm"
        style={{ backgroundColor: account.avatarColor }}
      >
        {account.avatarUrl ? (
          <img src={account.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate leading-tight">{account.displayName}</p>
        <p className="text-xs text-muted-foreground truncate opacity-80">@{account.username}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isActive && <Check size={14} className="text-primary" />}
        {!isActive && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
            title="Удалить аккаунт"
          >
            <Trash2 size={13} />
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
    <div className="w-full px-3 pt-3 mt-auto border-t border-border">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-border transition-all focus:outline-none"
      >
        <div className="relative shrink-0">
          <div
            className={cn("w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden", isPremium && "ring-2 ring-violet-500 ring-offset-2 ring-offset-card")}
            style={{ backgroundColor: me?.avatarColor || "#3B82F6" }}
          >
            {me?.avatarUrl ? <img src={me.avatarUrl} alt="" className="w-full h-full object-cover" /> : initial}
          </div>
          {savedAccounts.length > 1 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center shadow-sm border-2 border-card">
              {savedAccounts.length}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-bold truncate text-foreground leading-tight">{me?.displayName || "..."}</p>
          <p className="text-xs text-muted-foreground truncate">@{me?.username || "..."}</p>
        </div>
        <MoreHorizontal size={16} className={cn("text-muted-foreground shrink-0 transition-transform", expanded && "rotate-90")} />
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
            <div className="pt-2 space-y-1">
              {savedAccounts.map(acc => (
                <AccountRow
                  key={acc.userId}
                  account={acc}
                  isActive={acc.userId === currentUserId}
                  onSwitch={() => { setExpanded(false); switchAccount(acc.userId); }}
                  onRemove={() => removeAccount(acc.userId)}
                />
              ))}
              {canAddAccount && (
                <button
                  onClick={() => { setExpanded(false); openAddAccount(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-primary hover:bg-primary/10 transition-colors text-sm font-semibold"
                >
                  <UserPlus size={15} />
                  Добавить аккаунт
                  {savedAccounts.length > 0 && (
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">{savedAccounts.length}/3</span>
                  )}
                </button>
              )}
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors text-sm font-semibold"
              >
                <LogOut size={15} />
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

  const NAV_ITEMS: Array<{ href: string; icon: any; label: string; soon?: boolean }> = [
    { href: "/",             icon: MessageCircle,  label: t("nav.chats") },
    { href: "/calls",        icon: Phone,          label: t("nav.calls") },
    { href: "/feed",         icon: Rss,            label: t("nav.feed") },
    { href: "/contacts",     icon: Users,          label: t("nav.contacts") },
    { href: "/stories",      icon: History,        label: t("nav.stories") },
    ...(showEvents ? [{ href: "/events", icon: CalendarDays, label: t("nav.events") }] : []),
    { href: "/wallet",       icon: Wallet,         label: t("nav.wallet") },
    { href: "/leaderboard",  icon: Trophy,         label: t("nav.leaderboard") },
    { href: "/profile",      icon: UserCircle,     label: t("nav.profile") },
    { href: "/settings",     icon: Settings,       label: t("nav.settings") },
  ];

  const AccountsSection = (
    <>
      {savedAccounts.length > 0 && (
        <div className="px-1 pb-1 space-y-1">
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
        <DropdownMenuItem
          onClick={openAddAccount}
          className="flex items-center gap-2 text-primary data-[highlighted]:bg-primary data-[highlighted]:text-white cursor-pointer mt-1 rounded-xl"
        >
          <UserPlus size={15} />
          Добавить аккаунт
          {savedAccounts.length > 0 && (
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">{savedAccounts.length}/3</span>
          )}
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
    </>
  );

  const DesktopSidebar = (
    <div className="hidden md:flex flex-col h-[100dvh] w-[240px] bg-card border-r border-border py-4 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-2 px-4 mb-5">
        <div className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]">
          <PulseLogo size={36} />
        </div>
        <span className="font-black text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-muted-foreground flex-1">Pulse</span>
        <button
          onClick={onOpenPalette}
          title="Поиск (Ctrl+K)"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <Search size={15} />
        </button>
        <button
          onClick={toggleTheme}
          title={isDark ? "Светлая тема" : "Тёмная тема"}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      <nav className="flex-1 flex flex-col gap-1 w-full px-3 overflow-y-auto scrollbar-none">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const showBadge = item.href === "/" && totalUnread > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                isActive
                  ? "bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(234,88,12,0.3)]"
                  : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              )}
            >
              <div className="relative shrink-0">
                <item.icon
                  size={18}
                  className={cn(
                    "transition-transform duration-300 group-hover:scale-110",
                    isActive && "text-white"
                  )}
                />
                {showBadge && (
                  <div className={cn(
                    "absolute -top-2 -right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm",
                    isActive ? "bg-white text-primary" : "bg-primary text-white"
                  )}>
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </div>
                )}
              </div>
              <span className="font-semibold text-sm truncate flex-1">{item.label}</span>
              {item.soon && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/25 shrink-0">Soon</span>
              )}
            </Link>
          );
        })}

        <Link
          href="/prime"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group border mt-2",
            location.startsWith("/prime")
              ? "bg-gradient-to-r from-orange-500 to-red-500 text-white border-transparent shadow-[0_4px_14px_rgba(234,88,12,0.4)]"
              : "border-violet-500/20 text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/30"
          )}
        >
          <Crown size={18} className="transition-transform duration-300 group-hover:scale-110 shrink-0" />
          <span className="font-semibold text-sm truncate">{t("nav.prime")}</span>
        </Link>

        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group border mt-2",
              location.startsWith("/admin")
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent shadow-[0_4px_14px_rgba(99,102,241,0.4)]"
                : "border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/30"
            )}
          >
            <Shield size={18} className="transition-transform duration-300 group-hover:scale-110 shrink-0" />
            <span className="font-semibold text-sm truncate">{t("nav.admin")}</span>
          </Link>
        )}
      </nav>

      <div className="w-full px-3 pt-3 mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-border transition-all focus:outline-none">
              <div className="relative shrink-0">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden",
                    isPremium && "ring-2 ring-violet-500 ring-offset-2 ring-offset-card"
                  )}
                  style={{ backgroundColor: me?.avatarColor || "#3B82F6" }}
                >
                  {me?.avatarUrl
                    ? <img src={me.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : initial}
                </div>
                {isPremium && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center shadow-sm border-2 border-card">
                    <Sparkles size={8} className="text-white" />
                  </div>
                )}
                {savedAccounts.length > 1 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center shadow-sm border-2 border-card">
                    {savedAccounts.length}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-bold truncate text-foreground leading-tight">{me?.displayName || "..."}</p>
                <p className="text-xs text-muted-foreground truncate font-medium">@{me?.username || "..."}</p>
              </div>
              <MoreHorizontal size={16} className="text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-64 rounded-2xl p-2 border-border shadow-2xl">
            {AccountsSection}
            <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
              <Link href="/profile" className="flex items-center w-full">
                <UserCircle size={16} className="mr-2.5 text-primary" />
                <span className="font-semibold">{t("menu.myProfile")}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
              <Link href="/settings" className="flex items-center w-full">
                <Settings size={16} className="mr-2.5 text-muted-foreground" />
                <span className="font-semibold">{t("menu.settings")}</span>
              </Link>
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer data-[highlighted]:bg-indigo-500 data-[highlighted]:text-white">
                  <Link href="/admin" className="flex items-center w-full text-indigo-400">
                    <Shield size={16} className="mr-2.5" />
                    <span className="font-semibold">{t("menu.administrator")}</span>
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="rounded-xl text-destructive data-[highlighted]:bg-destructive data-[highlighted]:text-white cursor-pointer">
              <LogOut size={16} className="mr-2.5" />
              <span className="font-semibold">{t("menu.logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  const MobileSidebar = (
    <>
      <div
        className={`fixed inset-0 z-[90] md:hidden bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${mobileSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onMobileClose}
      />
      <div
        className={`fixed left-0 top-0 bottom-0 z-[91] md:hidden w-[280px] bg-card border-r border-border flex flex-col py-4 shadow-2xl transition-transform duration-300 overflow-y-auto`}
        style={{ transform: mobileSidebarOpen ? "translateX(0)" : "translateX(-100%)" }}
      >
        <div className="flex items-center gap-2 px-4 mb-5">
          <div className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]">
            <PulseLogo size={36} />
          </div>
          <span className="font-black text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-muted-foreground flex-1">Pulse</span>
          <button onClick={onMobileClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto scrollbar-none">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const showBadge = item.href === "/" && totalUnread > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(234,88,12,0.3)]"
                    : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                )}
              >
                <div className="relative shrink-0">
                  <item.icon size={18} className={cn("transition-transform duration-300 group-hover:scale-110", isActive && "text-white")} />
                  {showBadge && (
                    <div className={cn("absolute -top-2 -right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm", isActive ? "bg-white text-primary" : "bg-primary text-white")}>
                      {totalUnread > 99 ? "99+" : totalUnread}
                    </div>
                  )}
                </div>
                <span className="font-semibold text-sm truncate flex-1">{item.label}</span>
              </Link>
            );
          })}

          <Link
            href="/prime"
            onClick={onMobileClose}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group border mt-2",
              location.startsWith("/prime")
                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white border-transparent shadow-[0_4px_14px_rgba(234,88,12,0.4)]"
                : "border-violet-500/20 text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/30"
            )}
          >
            <Crown size={18} className="transition-transform duration-300 group-hover:scale-110 shrink-0" />
            <span className="font-semibold text-sm truncate">{t("nav.prime")}</span>
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group border mt-2",
                location.startsWith("/admin")
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent shadow-[0_4px_14px_rgba(99,102,241,0.4)]"
                  : "border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/30"
              )}
            >
              <Shield size={18} className="transition-transform duration-300 group-hover:scale-110 shrink-0" />
              <span className="font-semibold text-sm truncate">{t("nav.admin")}</span>
            </Link>
          )}
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