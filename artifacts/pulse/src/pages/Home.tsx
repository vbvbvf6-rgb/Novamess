import React, { useEffect } from "react";
import { ChatList } from "@/components/chat/ChatList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useAppContext } from "@/contexts/AppContext";

export default function Home() {
  const { selectedChatId, setSelectedChatId } = useAppContext();

  useEffect(() => {
    const handler = (e: Event) => {
      const chatId = (e as CustomEvent).detail;
      if (chatId) setSelectedChatId(Number(chatId));
    };
    window.addEventListener("open-chat", handler);
    return () => window.removeEventListener("open-chat", handler);
  }, [setSelectedChatId]);

  useEffect(() => {
    if (!selectedChatId) return;
    const onPopState = (e: PopStateEvent) => {
      e.preventDefault();
      setSelectedChatId(null);
      window.history.pushState(null, "", window.location.href);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [selectedChatId, setSelectedChatId]);

  return (
    <div className="flex w-full h-full">
      <ChatList />
      <div className="flex-1 hidden md:flex">
        {selectedChatId ? (
          <ChatWindow chatId={selectedChatId} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background/50">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <div className="w-8 h-8 bg-primary rounded-full" />
              </div>
              <h2 className="text-xl font-bold mb-2">Pulse</h2>
              <p className="text-muted-foreground max-w-sm">Выберите чат слева или найдите пользователя чтобы начать переписку.</p>
            </div>
          </div>
        )}
      </div>
      {/* Mobile view logic can be added here to slide over */}
      {selectedChatId && (
        <div className="absolute inset-0 z-10 md:hidden bg-background">
          <ChatWindow chatId={selectedChatId} />
        </div>
      )}
    </div>
  );
}
