import React, { useState, useEffect, useRef } from "react";
import { useGetContacts, useSearchUsers, useAddContact, useRemoveContact, getGetContactsQueryKey, getGetChatsQueryKey } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { Search, UserPlus, UserMinus, MessageSquare, Users, Bell, Check, X, Clock, Radio, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/contexts/AppContext";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "contacts" | "groups" | "incoming" | "outgoing";

interface ContactRequest {
  id: number;
  from_user_id?: number;
  to_user_id?: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarColor: string;
  status?: string;
  created_at: string;
}

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<Tab>("contacts");
  const [incoming, setIncoming] = useState<ContactRequest[]>([]);
  const [outgoing, setOutgoing] = useState<ContactRequest[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [editingNicknameId, setEditingNicknameId] = useState<number | null>(null);
  const [nicknameInput, setNicknameInput] = useState("");
  const nicknameInputRef = useRef<HTMLInputElement>(null);
  const { data: contacts, isLoading: contactsLoading } = useGetContacts();
  const { data: searchResults, isLoading: searchLoading } = useSearchUsers(
    { q: searchQuery },
    { query: { enabled: searchQuery.length > 0 } as any }
  );

  const addContact = useAddContact();
  const removeContact = useRemoveContact();
  const queryClient = useQueryClient();
  const { setSelectedChatId } = useAppContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const token = sessionStorage.getItem("pulse-token");
  const authHeader: Record<string, string> = token ? { "Authorization": `Bearer ${token}` } : {};

  const fetchRequests = async () => {
    if (!token) return;
    setLoadingReqs(true);
    try {
      const [incRes, outRes] = await Promise.all([
        fetch("/api/contact-requests/incoming", { headers: authHeader }),
        fetch("/api/contact-requests/outgoing", { headers: authHeader }),
      ]);
      if (incRes.ok) setIncoming(await incRes.json());
      if (outRes.ok) setOutgoing(await outRes.json());
    } catch {}
    setLoadingReqs(false);
  };

  useEffect(() => {
    if (tab === "incoming" || tab === "outgoing") fetchRequests();
  }, [tab]);

  // Live update when a new request comes in
  useEffect(() => {
    const handler = () => {
      if (tab === "incoming") fetchRequests();
    };
    window.addEventListener("pulse:contact-request", handler);
    return () => window.removeEventListener("pulse:contact-request", handler);
  }, [tab]);

  const handleAddContact = async (userId: number) => {
    addContact.mutate(
      { data: { userId } },
      {
        onSuccess: async () => {
          queryClient.invalidateQueries({ queryKey: getGetContactsQueryKey() });
          import("@/utils/questTracker").then(({ trackQuestAction }) => trackQuestAction("contact_added"));
          try {
            const res = await fetch("/api/chats/direct", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...authHeader },
              body: JSON.stringify({ userId }),
            });
            if (res.ok) queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
          } catch {}
        }
      }
    );
  };

  const handleRemoveContact = (userId: number) => {
    removeContact.mutate(
      { contactId: userId },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetContactsQueryKey() }) }
    );
  };

  const handleMessage = async (userId: number) => {
    try {
      const res = await fetch("/api/chats/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const chat = await res.json();
        queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
        setSelectedChatId(chat.id);
        setLocation("/");
      } else {
        toast({ title: "Ошибка", description: "Не удалось открыть чат", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка", description: "Нет соединения с сервером", variant: "destructive" });
    }
  };

  const handleSendRequest = async (toUserId: number) => {
    try {
      const res = await fetch("/api/contact-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ toUserId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "already_contacts") {
          toast({ title: "Вы уже контакты" });
        } else {
          toast({ title: "Заявка отправлена", description: "Пользователь получит уведомление" });
          fetchRequests();
        }
      }
    } catch {
      toast({ title: "Ошибка", variant: "destructive" });
    }
  };

  const handleAccept = async (reqId: number) => {
    try {
      const res = await fetch(`/api/contact-requests/${reqId}/accept`, {
        method: "POST",
        headers: authHeader,
      });
      if (res.ok) {
        toast({ title: "Заявка принята" });
        queryClient.invalidateQueries({ queryKey: getGetContactsQueryKey() });
        fetchRequests();
        window.dispatchEvent(new CustomEvent("pulse:contact-requests-resolved"));
      }
    } catch {}
  };

  const handleDecline = async (reqId: number) => {
    try {
      await fetch(`/api/contact-requests/${reqId}/decline`, {
        method: "POST",
        headers: authHeader,
      });
      fetchRequests();
      window.dispatchEvent(new CustomEvent("pulse:contact-requests-resolved"));
    } catch {}
  };

  const handleCancel = async (reqId: number) => {
    try {
      await fetch(`/api/contact-requests/${reqId}`, {
        method: "DELETE",
        headers: authHeader,
      });
      fetchRequests();
      window.dispatchEvent(new CustomEvent("pulse:contact-requests-resolved"));
    } catch {}
  };

  const startEditNickname = (user: any) => {
    setEditingNicknameId(user.id);
    setNicknameInput((user as any).nickname || "");
    setTimeout(() => nicknameInputRef.current?.focus(), 50);
  };

  const handleSaveNickname = async (contactId: number) => {
    const trimmed = nicknameInput.trim();
    try {
      const res = await fetch(`/api/contacts/${contactId}/nickname`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ nickname: trimmed || null }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: getGetContactsQueryKey() });
        toast({ title: trimmed ? `Псевдоним сохранён: «${trimmed}»` : "Псевдоним удалён" });
      }
    } catch {
      toast({ title: "Ошибка", variant: "destructive" });
    }
    setEditingNicknameId(null);
  };

  const isBotUser = (u: any) => Boolean(u?.is_bot || u?.isBot || ["nova_ai", "deepseek_ai"].includes((u?.username || "").toLowerCase()));
  const rawUsers = searchQuery.length > 0 ? searchResults : contacts;
  const displayUsers = (rawUsers as any[])?.filter((u: any) => !isBotUser(u) && !u?.isGroup && !u?.isChannel && u?.type !== "group" && u?.type !== "channel");
  const groupUsers = (rawUsers as any[])?.filter((u: any) => !isBotUser(u) && (u?.isGroup || u?.isChannel || u?.type === "group" || u?.type === "channel"));
  const isLoading = searchQuery.length > 0 ? searchLoading : contactsLoading;
  const incomingPending = incoming.length;

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <header className="border-b border-border flex items-center px-5 justify-between bg-card/90 backdrop-blur-xl z-10 shrink-0 relative overflow-hidden" style={{ minHeight: "calc(4rem + env(safe-area-inset-top, 0px))", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/6 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))", border: "1px solid rgba(59,130,246,0.2)" }}>
            <Users size={17} className="text-primary" />
          </div>
          <h1 className="text-xl font-black text-foreground">Контакты</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 pb-0 border-b border-border bg-background/95 backdrop-blur-sm z-10 shrink-0">
        {([
          { key: "contacts", label: "Контакты" },
          { key: "groups", label: "Каналы / Группы" },
          { key: "incoming", label: "Входящие", badge: incomingPending },
          { key: "outgoing", label: "Исходящие" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-[13px] font-bold transition-all relative border-b-2 ${tab === t.key ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}
          >
            {t.label}
            {"badge" in t && t.badge ? (
              <span className="min-w-[18px] h-4.5 px-1 bg-primary text-primary-foreground text-[10px] font-black rounded-full flex items-center justify-center">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {(tab === "contacts" || tab === "groups") && (
        <>
          <div className="px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm z-10 shrink-0">
            <div className="relative max-w-3xl mx-auto w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={tab === "contacts" ? "Поиск контактов и пользователей..." : "Поиск каналов и групп..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50 border-transparent focus-visible:ring-primary focus-visible:bg-card h-11 rounded-2xl font-medium"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 max-w-3xl w-full mx-auto scrollbar-none">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/50">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (tab === "contacts" ? displayUsers : groupUsers)?.length === 0 ? (
              <div className="text-center text-muted-foreground mt-20">
                <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={32} className="text-muted-foreground/50" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-1">
                  {searchQuery ? (tab === "contacts" ? "Пользователи не найдены" : "Каналы и группы не найдены") : (tab === "contacts" ? "Контакты отсутствуют" : "Каналы и группы отсутствуют")}
                </h2>
                <p>{searchQuery ? "Попробуйте другой запрос" : tab === "contacts" ? "Введите имя или ник чтобы найти пользователей" : "Введите название канала или группы"}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(tab === "contacts" ? displayUsers : groupUsers)?.map((user: User) => {
                  const isContact = contacts?.some((c: { id: number }) => c.id === user.id) ?? false;
                  return (
                    <div key={user.id} className="flex items-center gap-4 p-4 rounded-2xl border border-border/60 bg-card/40 hover:bg-card hover:border-border hover:shadow-sm transition-all group">
                      <div className="relative shrink-0">
                        <button
                          onClick={() => setLocation(`/user/${user.id}`)}
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden hover:opacity-90 transition-opacity relative"
                          style={{ backgroundColor: user.avatarColor || "#333" }}
                        >
                          <span className="absolute inset-0 flex items-center justify-center">{user.displayName[0].toUpperCase()}</span>
                          {user.avatarUrl && <img src={user.avatarUrl} alt={user.displayName} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
                        </button>
                        {tab === "contacts" ? <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card z-10 ${user.status === "online" ? "bg-green-500" : user.status === "away" ? "bg-yellow-500" : "bg-gray-500"}`} /> : null}
                      </div>

                      {/* Name / nickname inline edit */}
                      {tab === "contacts" && isContact && editingNicknameId === user.id ? (
                        <form
                          className="flex-1 min-w-0 flex items-center gap-2"
                          onSubmit={(e) => { e.preventDefault(); handleSaveNickname(user.id); }}
                        >
                          <Input
                            ref={nicknameInputRef}
                            value={nicknameInput}
                            onChange={(e) => setNicknameInput(e.target.value)}
                            placeholder={user.displayName}
                            maxLength={40}
                            className="h-8 text-sm py-0 px-2 rounded-xl"
                            onKeyDown={(e) => { if (e.key === "Escape") setEditingNicknameId(null); }}
                          />
                          <button type="submit" className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500/15 text-green-500 hover:bg-green-500/25 transition-colors shrink-0" title="Сохранить">
                            <Check size={15} />
                          </button>
                          <button type="button" onClick={() => setEditingNicknameId(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0" title="Отмена">
                            <X size={15} />
                          </button>
                        </form>
                      ) : (
                        <button onClick={() => setLocation(`/user/${user.id}`)} className="flex-1 min-w-0 text-left">
                          {tab === "contacts" && isContact && (user as any).nickname ? (
                            <>
                              <h3 className="font-semibold text-foreground truncate hover:text-primary transition-colors">{(user as any).nickname}</h3>
                              <p className="text-sm text-muted-foreground truncate">{user.displayName} · @{user.username}</p>
                            </>
                          ) : (
                            <>
                              <h3 className="font-semibold text-foreground truncate hover:text-primary transition-colors">{user.displayName}</h3>
                              <p className="text-sm text-muted-foreground truncate">@{user.username} {(user as any).bio ? `• ${(user as any).bio}` : ""}</p>
                            </>
                          )}
                        </button>
                      )}

                      {!(tab === "contacts" && isContact && editingNicknameId === user.id) && (
                      <div className="flex items-center gap-1.5">
                        {tab === "contacts" ? (
                          <button onClick={() => handleMessage(user.id)} className="w-9 h-9 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors" title="Написать">
                            <MessageSquare size={17} />
                          </button>
                        ) : (
                          <button onClick={() => handleMessage(user.id)} className="w-9 h-9 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors" title="Открыть">
                            <Radio size={17} />
                          </button>
                        )}
                        {tab === "contacts" && isContact && (
                          <button
                            onClick={() => startEditNickname(user)}
                            className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Задать псевдоним"
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {tab === "contacts" && searchQuery.length > 2 && !isContact ? (
                          <button
                            onClick={() => handleSendRequest(user.id)}
                            className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-green-500 hover:bg-green-500/10 transition-colors"
                            title="Отправить заявку"
                          >
                            <UserPlus size={17} />
                          </button>
                        ) : tab === "contacts" && isContact ? (
                          <button
                            onClick={() => handleRemoveContact(user.id)}
                            disabled={removeContact.isPending}
                            className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Удалить контакт"
                          >
                            <UserMinus size={17} />
                          </button>
                        ) : null}
                      </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {(tab === "incoming" || tab === "outgoing") && (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 max-w-3xl w-full mx-auto scrollbar-none">
          {loadingReqs ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/50">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-48" /></div>
                </div>
              ))}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {(tab === "incoming" ? incoming : outgoing).length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-muted-foreground mt-20">
                  <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell size={32} className="text-muted-foreground/50" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground mb-1">
                    {tab === "incoming" ? "Нет входящих заявок" : "Нет исходящих заявок"}
                  </h2>
                  <p className="text-sm">{tab === "incoming" ? "Когда кто-то отправит вам заявку — она появится здесь" : "Ваши заявки в контакты появятся здесь"}</p>
                </motion.div>
              ) : (tab === "incoming" ? incoming : outgoing).map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: tab === "incoming" ? 80 : -80 }}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-border/60 bg-card/40 hover:bg-card transition-all mb-3"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0 relative"
                    style={{ backgroundColor: req.avatarColor || "#333" }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center">{req.displayName?.[0]?.toUpperCase()}</span>
                    {req.avatarUrl && <img src={req.avatarUrl} alt={req.displayName} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{req.displayName}</p>
                    <p className="text-sm text-muted-foreground truncate">@{req.username}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {tab === "incoming" ? (
                      <>
                        <button
                          onClick={() => handleAccept(req.id)}
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500/15 text-green-500 hover:bg-green-500/25 transition-colors"
                          title="Принять"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => handleDecline(req.id)}
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                          title="Отклонить"
                        >
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${req.status === "accepted" ? "bg-green-500/15 text-green-500" : req.status === "declined" ? "bg-destructive/15 text-destructive" : "bg-secondary text-muted-foreground"}`}>
                          {req.status === "accepted" ? "Принято" : req.status === "declined" ? "Отклонено" : "Ожидает"}
                        </span>
                        {req.status === "pending" && (
                          <button
                            onClick={() => handleCancel(req.id)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Отменить"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
}
