import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MessageCircle, Phone, Users, History, Settings, Rss, UserCircle, Crown, Zap, Hash, X } from "lucide-react";
import { useGetChats, useGetContacts } from "@workspace/api-client-react";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

type PaletteItem = {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  action: () => void;
  group: "nav" | "chat" | "contact";
  avatarColor?: string;
  avatarUrl?: string;
};

const NAV_PAGES = [
  { href: "/",           label: "Чаты",      icon: <MessageCircle size={16} /> },
  { href: "/calls",      label: "Звонки",    icon: <Phone size={16} /> },
  { href: "/contacts",   label: "Контакты",  icon: <Users size={16} /> },
  { href: "/stories",    label: "Истории",   icon: <History size={16} /> },
  { href: "/feed",       label: "Лента",     icon: <Rss size={16} /> },
  { href: "/profile",    label: "Профиль",   icon: <UserCircle size={16} /> },
  { href: "/settings",   label: "Настройки", icon: <Settings size={16} /> },
  { href: "/prime",      label: "Prime",     icon: <Crown size={16} /> },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { setSelectedChatId } = useAppContext();
  const { data: chats } = useGetChats();
  const { data: contacts } = useGetContacts();

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const go = useCallback((fn: () => void) => {
    fn();
    onClose();
  }, [onClose]);

  const navItems: PaletteItem[] = NAV_PAGES.map(p => ({
    id: "nav-" + p.href,
    label: p.label,
    icon: p.icon,
    group: "nav" as const,
    action: () => go(() => setLocation(p.href)),
  }));

  const chatItems: PaletteItem[] = (chats ?? []).map((c: any) => {
    const name = c.type === "direct" ? (c.otherUser?.displayName || c.name || "Чат") : (c.name || "Чат");
    return {
      id: "chat-" + c.id,
      label: name,
      sublabel: c.type === "direct" ? "@" + (c.otherUser?.username || "") : c.type === "group" ? "Группа" : "Канал",
      icon: <MessageCircle size={16} />,
      group: "chat" as const,
      avatarColor: c.otherUser?.avatarColor || c.avatarColor,
      avatarUrl: c.otherUser?.avatarUrl || c.avatarUrl,
      action: () => go(() => { setLocation("/"); setSelectedChatId(c.id); }),
    };
  });

  const contactItems: PaletteItem[] = (contacts ?? []).map((u: any) => ({
    id: "contact-" + u.id,
    label: u.displayName || u.username,
    sublabel: "@" + u.username,
    icon: <Users size={16} />,
    group: "contact" as const,
    avatarColor: u.avatarColor,
    avatarUrl: u.avatarUrl,
    action: () => go(() => setLocation("/contacts")),
  }));

  const q = query.trim().toLowerCase();
  const filtered: PaletteItem[] = q
    ? [...navItems, ...chatItems, ...contactItems].filter(i =>
        i.label.toLowerCase().includes(q) || (i.sublabel?.toLowerCase().includes(q))
      )
    : navItems;

  const grouped: { title: string; items: PaletteItem[] }[] = [];
  if (!q) {
    grouped.push({ title: "Навигация", items: navItems });
  } else {
    const nav = filtered.filter(i => i.group === "nav");
    const chat = filtered.filter(i => i.group === "chat");
    const contact = filtered.filter(i => i.group === "contact");
    if (nav.length)     grouped.push({ title: "Страницы",  items: nav });
    if (chat.length)    grouped.push({ title: "Чаты",      items: chat });
    if (contact.length) grouped.push({ title: "Контакты",  items: contact });
  }

  const flat = grouped.flatMap(g => g.items);

  useEffect(() => { setCursor(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelectorAll("[data-palette-item]")[cursor] as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor, open]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, flat.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && flat[cursor]) { flat[cursor].action(); }
    if (e.key === "Escape") { onClose(); }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        />
        <motion.div
          className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Поиск чатов, страниц, контактов..."
              className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60 text-foreground"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={14} />
              </button>
            )}
            <kbd className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border hidden sm:inline">ESC</kbd>
          </div>

          <div ref={listRef} className="max-h-[400px] overflow-y-auto p-2 space-y-1">
            {grouped.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <Zap size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Ничего не найдено</p>
              </div>
            )}
            {grouped.map(group => {
              let globalIdx = flat.indexOf(group.items[0]);
              return (
                <div key={group.title}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 px-2 py-1.5">{group.title}</p>
                  {group.items.map((item, i) => {
                    const idx = globalIdx + i;
                    const isCurrent = idx === cursor;
                    const initial = item.label[0]?.toUpperCase() || "?";
                    return (
                      <button
                        key={item.id}
                        data-palette-item
                        onClick={item.action}
                        onMouseEnter={() => setCursor(idx)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left",
                          isCurrent ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-foreground"
                        )}
                      >
                        {(item.group === "chat" || item.group === "contact") ? (
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 overflow-hidden"
                            style={{ backgroundColor: item.avatarColor || "#6366f1" }}
                          >
                            {item.avatarUrl
                              ? <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
                              : initial}
                          </div>
                        ) : (
                          <div className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                            isCurrent ? "bg-white/20" : "bg-secondary"
                          )}>
                            <span className={isCurrent ? "text-white" : "text-muted-foreground"}>{item.icon}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{item.label}</p>
                          {item.sublabel && (
                            <p className={cn("text-[11px] truncate", isCurrent ? "text-white/70" : "text-muted-foreground")}>{item.sublabel}</p>
                          )}
                        </div>
                        {isCurrent && (
                          <kbd className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0", "bg-white/20 border-white/30 text-white")}>↵</kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground font-medium">
            <span><kbd className="font-bold">↑↓</kbd> навигация</span>
            <span><kbd className="font-bold">↵</kbd> открыть</span>
            <span><kbd className="font-bold">Esc</kbd> закрыть</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
