import React, { useState } from "react";
import { useGetContacts, useSearchUsers, useAddContact, useRemoveContact, getGetContactsQueryKey, getGetChatsQueryKey } from "@workspace/api-client-react";
import { Search, UserPlus, UserMinus, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/contexts/AppContext";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: contacts, isLoading: contactsLoading } = useGetContacts();
  const { data: searchResults, isLoading: searchLoading } = useSearchUsers(
    { q: searchQuery },
    { query: { enabled: searchQuery.length > 2 } as any }
  );

  const addContact = useAddContact();
  const removeContact = useRemoveContact();
  const queryClient = useQueryClient();
  const { setSelectedChatId } = useAppContext();
  const [, setLocation] = useLocation();

  const token = sessionStorage.getItem("pulse-token");
  const authHeader: Record<string, string> = token ? { "Authorization": `Bearer ${token}` } : {};

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
            if (res.ok) {
              queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
            }
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
      }
    } catch {
      setLocation("/");
    }
  };

  const displayUsers = searchQuery.length > 2 ? searchResults : contacts;
  const isLoading = searchQuery.length > 2 ? searchLoading : contactsLoading;

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <header className="border-b border-border flex items-center px-6 justify-between bg-card/80 backdrop-blur-md z-10 shrink-0" style={{ minHeight: "calc(4rem + env(safe-area-inset-top, 0px))", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <h1 className="text-xl font-bold">Контакты</h1>
      </header>

      <div className="p-4 border-b border-border bg-background z-10 shrink-0">
        <div className="relative max-w-3xl mx-auto w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Поиск контактов и пользователей..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border focus-visible:ring-primary h-12 rounded-xl"
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
        ) : displayUsers?.length === 0 ? (
          <div className="text-center text-muted-foreground mt-20">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={32} className="text-muted-foreground/50" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">
              {searchQuery ? "Пользователи не найдены" : "Контакты отсутствуют"}
            </h2>
            <p>{searchQuery ? "Попробуйте другой запрос" : "Введите имя или ник чтобы найти пользователей"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayUsers?.map((user) => {
              const isContact = contacts?.some(c => c.id === user.id) ?? false;
              return (
                <div key={user.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors group">
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setLocation(`/user/${user.id}`)}
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: user.avatarColor || "#333" }}
                    >
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                      ) : (
                        user.displayName[0].toUpperCase()
                      )}
                    </button>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card z-10 ${user.status === "online" ? "bg-green-500" : user.status === "away" ? "bg-yellow-500" : "bg-gray-500"}`} />
                  </div>

                  <button
                    onClick={() => setLocation(`/user/${user.id}`)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <h3 className="font-semibold text-foreground truncate hover:text-primary transition-colors">{user.displayName}</h3>
                    <p className="text-sm text-muted-foreground truncate">@{user.username} {user.bio ? `• ${user.bio}` : ""}</p>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleMessage(user.id)}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                      title="Send message"
                    >
                      <MessageSquare size={18} />
                    </button>

                    {searchQuery.length > 2 && !isContact ? (
                      <button
                        onClick={() => handleAddContact(user.id)}
                        disabled={addContact.isPending}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-green-500 hover:bg-green-500/10 transition-colors"
                        title="Add contact"
                      >
                        <UserPlus size={18} />
                      </button>
                    ) : isContact ? (
                      <button
                        onClick={() => handleRemoveContact(user.id)}
                        disabled={removeContact.isPending}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Remove contact"
                      >
                        <UserMinus size={18} />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
