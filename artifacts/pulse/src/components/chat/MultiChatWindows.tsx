import React from "react";
import { X, Layers } from "lucide-react";
import { ChatWindow } from "./ChatWindow";
import { useAppContext } from "@/contexts/AppContext";

export function MultiChatWindows() {
  const { openChatWindows, closeChatWindow } = useAppContext();
  if (!openChatWindows.length) return null;
  return (
    <aside
      aria-label="Открытые окна чатов"
      className="fixed z-[75] bottom-4 right-4 hidden md:flex items-end gap-3 max-w-[calc(100vw-2rem)]"
    >
      {openChatWindows.map((chatId) => (
        <section key={chatId} className="w-[min(380px,30vw)] h-[min(640px,72vh)] min-w-[300px] rounded-2xl border border-border bg-background shadow-2xl overflow-hidden flex flex-col">
          <div className="h-9 px-3 flex items-center justify-between bg-card border-b border-border shrink-0">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5"><Layers size={13} /> Окно чата</span>
            <button type="button" onClick={() => closeChatWindow(chatId)} aria-label="Закрыть окно чата" className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary">
              <X size={14} />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <ChatWindow chatId={chatId} />
          </div>
        </section>
      ))}
    </aside>
  );
}