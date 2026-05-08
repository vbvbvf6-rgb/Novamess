import React from "react";
import { Message } from "@workspace/api-client-react";
import { format } from "date-fns";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { Check, CheckCheck } from "lucide-react";
import { motion } from "framer-motion";

export function MessageBubble({ message }: { message: Message }) {
  const { currentUserId } = useAppContext();
  const isMine = message.senderId === currentUserId;

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), "HH:mm");
  };

  if (message.type === "gift") {
    const emoji = message.giftData?.giftItem?.emoji || "🎁";
    const giftName = message.giftData?.giftItem?.name || "Gift";
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="flex justify-center w-full my-3"
      >
        <div className="flex flex-col items-center gap-2 max-w-[220px]">
          <div className="bg-card/90 backdrop-blur border border-border/60 rounded-3xl px-6 py-5 flex flex-col items-center gap-2 shadow-lg">
            <motion.span
              animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="text-5xl"
            >
              {emoji}
            </motion.span>
            <p className="text-sm font-bold text-center">{isMine ? "You sent" : `${message.sender?.displayName ?? "Someone"} sent`} a {giftName}</p>
            {message.text && (
              <p className="text-xs text-muted-foreground italic text-center">"{message.text}"</p>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">{formatTime(message.createdAt)}</span>
        </div>
      </motion.div>
    );
  }

  const renderContent = () => {
    switch (message.type) {
      case "text":
        return <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>;
      case "image":
        return (
          <div className="rounded-xl overflow-hidden">
            <img
              src={message.mediaUrl || ""}
              alt="photo"
              className="max-w-xs max-h-64 object-cover block"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            {message.text && <p className="text-sm mt-2 px-1">{message.text}</p>}
          </div>
        );
      case "call":
        return <p className="text-sm font-medium italic opacity-80">📞 Call ended</p>;
      default:
        return <p className="text-sm">[{message.type}] {message.text}</p>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex w-full group", isMine ? "justify-end" : "justify-start")}
    >
      <div className={cn(
        "flex max-w-[75%] md:max-w-[65%]",
        isMine ? "flex-row-reverse" : "flex-row",
        "items-end gap-2"
      )}>
        {!isMine && (
          <div
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white mb-1 overflow-hidden"
            style={{ backgroundColor: message.sender?.avatarColor || "#555" }}
          >
            {message.sender?.avatarUrl ? (
              <img src={message.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              (message.sender?.displayName || "U")[0].toUpperCase()
            )}
          </div>
        )}

        <div className={cn(
          "relative px-4 py-2.5 rounded-2xl shadow-sm",
          isMine
            ? "bg-primary text-primary-foreground rounded-br-sm bg-gradient-to-br from-primary to-blue-600 shadow-[0_4px_15px_rgba(0,188,212,0.2)]"
            : "bg-secondary text-foreground rounded-bl-sm border border-border"
        )}>
          {!isMine && message.sender && (
            <p className="text-[11px] font-semibold mb-1" style={{ color: message.sender.avatarColor }}>
              {message.sender.displayName}
            </p>
          )}

          {renderContent()}

          <div className={cn(
            "flex items-center justify-end gap-1 mt-1 text-[10px] opacity-70",
            isMine ? "text-primary-foreground" : "text-muted-foreground"
          )}>
            <span>{formatTime(message.createdAt)}</span>
            {isMine && (
              message.isRead ? <CheckCheck size={14} /> : <Check size={14} />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
