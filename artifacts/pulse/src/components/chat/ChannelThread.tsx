import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Send, MessageSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ThreadComment {
  id: number;
  senderId: number;
  text: string;
  type: string;
  mediaUrl?: string | null;
  createdAt: string;
  sender?: {
    displayName?: string;
    avatarColor?: string;
    avatarUrl?: string;
    username?: string;
  };
}

interface ChannelThreadProps {
  messageId: number;
  chatId: number;
  parentText?: string | null;
  parentSender?: string;
  currentUserId: number;
  onClose: () => void;
}

export function ChannelThread({
  messageId,
  chatId,
  parentText,
  parentSender,
  currentUserId,
  onClose,
}: ChannelThreadProps) {
  const [comments, setComments] = useState<ThreadComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem("pulse-token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages/${messageId}/thread`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) setComments(await res.json());
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (window.matchMedia("(hover: hover)").matches) {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [messageId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          chatId,
          text: trimmed,
          type: "text",
          replyToId: messageId,
        }),
      });
      if (res.ok) {
        const msg = await res.json();
        setComments(prev => [...prev, msg]);
        setText("");
        if (textareaRef.current) {
          textareaRef.current.style.height = "40px";
        }
      }
    } catch {
    } finally {
      setSending(false);
    }
  };

  const pluralComments = (n: number) => {
    if (n % 10 === 1 && n % 100 !== 11) return "комментарий";
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return "комментария";
    return "комментариев";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 48 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 48 }}
      transition={{ type: "spring", damping: 26, stiffness: 300 }}
      className="fixed inset-y-0 right-0 w-full max-w-[360px] bg-card border-l border-border flex flex-col z-40 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border shrink-0 bg-card">
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={17} />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-[15px] leading-tight">Комментарии</h3>
          <p className="text-[11px] text-muted-foreground font-medium">
            {loading ? "..." : `${comments.length} ${pluralComments(comments.length)}`}
          </p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <MessageSquare size={15} className="text-primary" />
        </div>
      </div>

      {/* Parent post preview */}
      {(parentText || parentSender) && (
        <div className="px-4 py-3 bg-secondary/30 border-b border-border shrink-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary/70 mb-1">
            {parentSender || "Пост канала"}
          </p>
          <div className="flex items-start gap-2">
            <div className="w-0.5 h-full rounded-full bg-primary shrink-0 self-stretch min-h-[16px]" />
            <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2 font-medium">
              {parentText || "Сообщение канала"}
            </p>
          </div>
        </div>
      )}

      {/* Comments list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-none">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Loader2 size={22} className="animate-spin text-primary/60" />
            <span className="text-[12px] text-muted-foreground">Загрузка...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary/60 flex items-center justify-center">
              <MessageSquare size={24} className="text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-foreground">Нет комментариев</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Первым оставьте комментарий</p>
            </div>
          </div>
        ) : (
          comments.map(comment => {
            const isMine = comment.senderId === currentUserId;
            const initial = (comment.sender?.displayName || "?")[0].toUpperCase();
            return (
              <div
                key={comment.id}
                className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-black shrink-0 overflow-hidden mb-0.5"
                  style={{ backgroundColor: comment.sender?.avatarColor || "#6366f1" }}
                >
                  {comment.sender?.avatarUrl ? (
                    <img
                      src={comment.sender.avatarUrl}
                      alt={initial}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                </div>

                <div className={`max-w-[78%] flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}>
                  {!isMine && (
                    <span className="text-[10px] font-bold text-muted-foreground px-1">
                      {comment.sender?.displayName || "Пользователь"}
                    </span>
                  )}
                  <div
                    className={`px-3 py-2 text-[13px] font-medium leading-relaxed break-words ${
                      isMine
                        ? "bg-primary text-primary-foreground rounded-[16px] rounded-br-[4px]"
                        : "bg-secondary text-foreground rounded-[16px] rounded-bl-[4px]"
                    }`}
                  >
                    {comment.type === "image" && comment.mediaUrl ? (
                      <img src={comment.mediaUrl} alt="GIF" className="max-w-[180px] rounded-lg" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      comment.text
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground/50 px-1">
                    {format(new Date(comment.createdAt), "HH:mm")}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-border shrink-0 flex items-end gap-2 bg-card">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => {
            setText(e.target.value);
            e.target.style.height = "40px";
            e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
          }}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Написать комментарий..."
          className="flex-1 bg-secondary rounded-xl px-3.5 py-2.5 text-[13px] font-medium resize-none min-h-[40px] max-h-[100px] border-none outline-none scrollbar-none placeholder:text-muted-foreground/60 leading-normal"
          rows={1}
          style={{ height: "40px" }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all disabled:opacity-40 shrink-0 hover:scale-105 active:scale-95 shadow-[0_2px_10px_rgba(139,92,246,0.3)]"
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} className="translate-x-[-1px]" />
          )}
        </button>
      </div>
    </motion.div>
  );
}
