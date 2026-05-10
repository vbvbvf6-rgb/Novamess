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
  UserPlus,
  Check,
  Trash2,
  Bot,
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

interface SidebarProps {
  mobileSidebarOpen: boolean;
  onMobileClose: () => void;
  onMobileOpen: () => void;
}

export function Sidebar({ mobileSidebarOpen, onMobileClose, onMobileOpen }: SidebarProps) {
  const [location, navigate] = useLocation();
  const { logout, currentUserId, savedAccounts, switchAccount, removeAccount, openAddAccount, canAddAccount } = useAppContext();
  const { t } = useLanguage();
  const { data: me } = useGetMe();
  const { data: chats } = useGetChats();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin((me as any)?.isAdmin === true);
  }, [me]);

  const totalUnread = chats?.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0) ?? 0;
  const initial = me?.displayName?.[0]?.toUpperCase() || "U";
  const isPremium = (me as any)?.hasPrime ?? false;

  const NAV_ITEMS = [
    { href: "/",         icon: MessageCircle, label: t("nav.chats") },
    { href: "/calls",    icon: Phone,         label: t("nav.calls") },
    { href: "/feed",     icon: Rss,           label: t("nav.feed") },
    { href: "/contacts", icon: Users,         label: t("nav.contacts") },
    { href: "/gifts",    icon: Gift,          label: t("nav.gifts") },
    { href: "/stories",  icon: History,       label: t("nav.stories") },
    { href: "/wallet",   icon: Wallet,        label: t("nav.wallet") },
    { href: "/bots",     icon: Bot,           label: "Боты" },
    { href: "/profile",  icon: UserCircle,    label: t("nav.profile") },
    { href: "/settings", icon: Settings,      label: t("nav.settings") },
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
          className="flex items-center gap-2 text-primary focus:text-primary cursor-pointer mt-1"
        >
          <UserPlus size={15} />
          Добавить аккаунт
          {savedAccounts.length > 0 && (
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-primary/60 bg-primary/10 px-1.5 py-0.5 rounded">{savedAccounts.length}/3</span>
          )}
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
    </>
  );

  const DesktopSidebar = (
    <div className="hidden md:flex flex-col h-[100dvh] w-[240px] bg-card border-r border-border py-4 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-3 px-5 mb-6">
        <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-[0_0_20px_rgba(255,85,0,0.3)] shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="white" />
          </svg>
        </div>
        <span className="font-black text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-muted-foreground">Pulse</span>
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
                  ? "bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(255,85,0,0.3)]"
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
              <span className="font-semibold text-sm truncate">{item.label}</span>
            </Link>
          );
        })}

        <Link
          href="/prime"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group border mt-2",
            location.startsWith("/prime")
              ? "bg-gradient-to-r from-orange-500 to-yellow-500 text-white border-transparent shadow-[0_4px_14px_rgba(245,158,11,0.4)]"
              : "border-orange-500/20 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/30"
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
                    isPremium && "ring-2 ring-orange-500 ring-offset-2 ring-offset-card"
                  )}
                  style={{ backgroundColor: me?.avatarColor || "#3B82F6" }}
                >
                  {me?.avatarUrl
                    ? <img src={me.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : initial}
                </div>
                {isPremium && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center shadow-sm border-2 border-card">
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
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                  <Link href="/admin" className="flex items-center w-full text-indigo-400 focus:text-indigo-400">
                    <Shield size={16} className="mr-2.5" />
                    <span className="font-semibold">{t("menu.administrator")}</span>
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="rounded-xl text-destructive focus:text-destructive cursor-pointer">
              <LogOut size={16} className="mr-2.5" />
              <span className="font-semibold">{t("menu.logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  const MobileSidebarContent = (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="flex items-center justify-between px-5 mb-6 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-[0_0_20px_rgba(255,85,0,0.3)] shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="white" />
            </svg>
          </div>
          <span className="font-black text-xl tracking-tight">Pulse</span>
        </div>
        <button
          onClick={onMobileClose}
          className="p-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 w-full flex flex-col gap-1.5 px-3 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const showBadge = item.href === "/" && totalUnread > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group relative",
                isActive
                  ? "bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(255,85,0,0.3)]"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <div className="relative shrink-0">
                <item.icon
                  size={20}
                  className={cn(
                    "transition-transform duration-300",
                    isActive ? "text-white scale-110" : ""
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
              <span className="font-semibold truncate text-[15px]">{item.label}</span>
            </Link>
          );
        })}

        <Link
          href="/prime"
          onClick={onMobileClose}
          className={cn(
            "flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group relative border mt-2",
            location.startsWith("/prime")
              ? "bg-gradient-to-r from-orange-500 to-yellow-500 text-white border-transparent shadow-[0_4px_14px_rgba(245,158,11,0.4)]"
              : "border-orange-500/20 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/30"
          )}
        >
          <Crown size={20} className="shrink-0" />
          <span className="font-semibold truncate text-[15px]">{t("nav.prime")}</span>
        </Link>

        {isAdmin && (
          <Link
            href="/admin"
            onClick={onMobileClose}
            className={cn(
              "flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group relative border mt-2",
              location.startsWith("/admin")
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent shadow-[0_4px_14px_rgba(99,102,241,0.4)]"
                : "border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/30"
            )}
          >
            <Shield size={20} className="shrink-0" />
            <span className="font-semibold truncate text-[15px]">{t("nav.admin")}</span>
          </Link>
        )}
      </nav>

      <div className="w-full px-3 py-4 mt-auto border-t border-border bg-card">
        {savedAccounts.length > 0 && (
          <div className="mb-3 space-y-1">
            {savedAccounts.map(acc => (
              <AccountRow
                key={acc.userId}
                account={acc}
                isActive={acc.userId === currentUserId}
                onSwitch={() => { switchAccount(acc.userId); onMobileClose(); }}
                onRemove={() => removeAccount(acc.userId)}
              />
            ))}
          </div>
        )}

        {canAddAccount && (
          <button
            onClick={() => { openAddAccount(); onMobileClose(); }}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-primary hover:bg-primary/10 transition-all font-semibold text-[15px] mb-3 border border-primary/20 border-dashed"
          >
            <UserPlus size={18} />
            Добавить аккаунт
          </button>
        )}

        <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/50">
          <div className="relative shrink-0">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden",
                isPremium && "ring-2 ring-orange-500 ring-offset-2 ring-offset-card"
              )}
              style={{ backgroundColor: me?.avatarColor || "#3B82F6" }}
            >
              {me?.avatarUrl ? (
                <img src={me.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : initial}
            </div>
          </div>

          <div className="flex flex-1 min-w-0 flex-col">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-bold truncate text-foreground leading-tight">{me?.displayName || "..."}</p>
              {(me as any)?.isVerified && <VerifiedBadge />}
            </div>
            <p className="text-xs text-muted-foreground truncate font-medium">@{me?.username || "..."}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0">
                <MoreHorizontal size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-56 rounded-2xl p-2 shadow-2xl border-border">
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link href="/profile" onClick={onMobileClose} className="flex items-center w-full">
                  <UserCircle size={16} className="mr-2.5 text-primary" />
                  <span className="font-semibold">{t("menu.myProfile")}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link href="/settings" onClick={onMobileClose} className="flex items-center w-full">
                  <Settings size={16} className="mr-2.5 text-muted-foreground" />
                  <span className="font-semibold">{t("menu.settings")}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="rounded-xl text-destructive focus:text-destructive cursor-pointer">
                <LogOut size={16} className="mr-2.5" />
                <span className="font-semibold">{t("menu.logout")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={onMobileOpen}
        className={cn(
          "md:hidden fixed top-4 left-4 z-40 w-11 h-11 rounded-2xl bg-card/80 backdrop-blur-md border border-border flex items-center justify-center text-foreground shadow-lg transition-all",
          mobileSidebarOpen && "opacity-0 pointer-events-none"
        )}
      >
        <Menu size={22} />
      </button>

      {DesktopSidebar}

      <div className={cn(
        "md:hidden fixed inset-y-0 left-0 w-80 z-40 transition-transform duration-300 ease-out shadow-2xl",
        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {MobileSidebarContent}
      </div>
    </>
  );
}