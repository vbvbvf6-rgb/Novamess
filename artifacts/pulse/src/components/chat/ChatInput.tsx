import React, { useState, useRef } from "react";
import { useSendMessage, getGetMessagesQueryKey, getGetChatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Paperclip, Mic, Smile, SendHorizontal, X, Image } from "lucide-react";

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "😀 Smileys",
    emojis: ["😀","😂","🤣","😊","😍","🥰","😘","😎","🤩","🥳","😭","😤","😡","🤔","😏","😴","🤤","😷","😱","😨","🤯","😮","🥺","😢","😔","😕","😫","🤗","🤭","🫢","🤫","🤥","😶","😐","😑"],
  },
  {
    label: "👍 Gestures",
    emojis: ["👍","👎","👋","🤚","✋","🖐","🖖","👌","🤌","✌","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝","👏","🙌","🤲","🤝","🙏","💪","🦾"],
  },
  {
    label: "❤️ Hearts",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","💕","💞","💓","💗","💖","💘","💝","💫","⭐","🌟","✨","🔥","💎"],
  },
  {
    label: "🐶 Nature",
    emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐸","🐵","🐔","🐧","🐦","🦆","🦅","🦉","🦇","🐺","🦄","🦋","🌸","🌹","🌺","🌻","🌴","🌵"],
  },
  {
    label: "🍎 Food",
    emojis: ["🍎","🍊","🍋","🍇","🍓","🍒","🍑","🥭","🍍","🥥","🍕","🍔","🌮","🌯","🍜","🍣","🍦","🎂","🍰","🧁","🍫","🍬","🍭","☕","🍵","🥤","🍺","🍷","🥂"],
  },
  {
    label: "⚽ Activities",
    emojis: ["⚽","🏀","🏈","⚾","🎾","🏐","🏉","🎱","🏓","🏸","🎯","⛳","🎳","🏋️","🤸","⛷️","🏂","🏄","🎮","🕹️","🎲","🎪","🎭","🎨"],
  },
];

export function ChatInput({ chatId }: { chatId: number }) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const sendMessage = useSendMessage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() && !imagePreview) return;

    if (imagePreview) {
      sendMessage.mutate(
        { data: { chatId, text: text.trim() || undefined, type: "image", mediaUrl: imagePreview } },
        {
          onSuccess: () => {
            setText("");
            setImagePreview(null);
            queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
            queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
          }
        }
      );
    } else {
      sendMessage.mutate(
        { data: { chatId, text, type: "text" } },
        {
          onSuccess: () => {
            setText("");
            if (textareaRef.current) textareaRef.current.style.height = "40px";
            queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
            queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
          }
        }
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const insertEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "40px";
    e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
  };

  return (
    <div className="relative">
      {/* Emoji Picker */}
      {showEmoji && (
        <div className="absolute bottom-full mb-2 left-0 right-0 z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex border-b border-border bg-background/80 px-1 overflow-x-auto scrollbar-none">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={i}
                onClick={() => setEmojiCategory(i)}
                className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${emojiCategory === i ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="p-3 grid grid-cols-8 gap-1 max-h-48 overflow-y-auto scrollbar-thin">
            {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji, i) => (
              <button
                key={i}
                onClick={() => insertEmoji(emoji)}
                className="text-xl hover:bg-secondary rounded-lg p-1 transition-colors text-center"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-2 relative inline-block">
          <div className="relative rounded-xl overflow-hidden border border-border shadow-md inline-block">
            <img src={imagePreview} alt="preview" className="max-h-40 max-w-xs object-contain" />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2 bg-secondary rounded-2xl px-3 py-2 border border-border focus-within:border-primary/50 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 text-muted-foreground hover:text-primary transition-colors shrink-0"
          title="Attach photo"
        >
          {imagePreview ? <Image size={20} className="text-primary" /> : <Paperclip size={20} />}
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextareaChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={imagePreview ? "Add a caption..." : "Type a message..."}
          className="flex-1 bg-transparent border-none resize-none max-h-32 min-h-[40px] py-1.5 px-1 focus:outline-none text-sm placeholder:text-muted-foreground leading-relaxed align-middle"
          rows={1}
          style={{ height: "40px" }}
        />

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            className={`p-1.5 transition-colors rounded-full ${showEmoji ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Smile size={20} />
          </button>
          {text.trim() || imagePreview ? (
            <button
              type="submit"
              disabled={sendMessage.isPending}
              className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-[0_0_10px_rgba(0,188,212,0.3)] disabled:opacity-50"
            >
              <SendHorizontal size={18} />
            </button>
          ) : (
            <button type="button" className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <Mic size={20} />
            </button>
          )}
        </div>
      </form>

      {showEmoji && (
        <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
      )}
    </div>
  );
}
