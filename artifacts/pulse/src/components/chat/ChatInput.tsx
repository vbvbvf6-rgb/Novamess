import React, { useState, useRef, useEffect } from "react";
import { useSendMessage, getGetMessagesQueryKey, getGetChatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Paperclip, Mic, Smile, SendHorizontal, X, Square, Trash2, Images } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: "😀 Смайлы", emojis: ["😀","😂","🤣","😊","😍","🥰","😘","😎","🤩","🥳","😭","😤","😡","🤔","😏","😴","🤤","😷","😱","😨","🤯","😮","🥺","😢","😔","😕","😫","🤗","🤭","🫢","🤫","🤥","😶","😐","😑"] },
  { label: "👍 Жесты", emojis: ["👍","👎","👋","🤚","✋","🖐","🖖","👌","🤌","✌","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝","👏","🙌","🤲","🤝","🙏","💪","🦾"] },
  { label: "❤️ Сердца", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","💕","💞","💓","💗","💖","💘","💝","💫","⭐","🌟","✨","🔥","💎"] },
  { label: "🐶 Природа", emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐸","🐵","🐔","🐧","🐦","🦆","🦅","🦉","🦇","🐺","🦄","🦋","🌸","🌹","🌺","🌻","🌴","🌵"] },
  { label: "🍎 Еда", emojis: ["🍎","🍊","🍋","🍇","🍓","🍒","🍑","🥭","🍍","🥥","🍕","🍔","🌮","🌯","🍜","🍣","🍦","🎂","🍰","🧁","🍫","🍬","🍭","☕","🍵","🥤","🍺","🍷","🥂"] },
  { label: "⚽ Активность", emojis: ["⚽","🏀","🏈","⚾","🎾","🏐","🏉","🎱","🏓","🏸","🎯","⛳","🎳","🏋️","🤸","⛷️","🏂","🏄","🎮","🕹️","🎲","🎪","🎭","🎨"] },
];

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ChatInput({ chatId, onMessageSent }: { chatId: number; onMessageSent?: () => void }) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const queryClient = useQueryClient();
  const sendMessage = useSendMessage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendTypingEvent = () => {
    const uid = localStorage.getItem("pulse-user-id");
    if (!typingTimeoutRef.current) {
      fetch(`/api/chats/${chatId}/typing`, {
        method: "POST",
        headers: uid ? { "x-user-id": uid } : {},
      }).catch(() => {});
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
      }, 2500);
    }
    if (stopTypingTimeoutRef.current) clearTimeout(stopTypingTimeoutRef.current);
    stopTypingTimeoutRef.current = setTimeout(() => {
      fetch(`/api/chats/${chatId}/typing/stop`, {
        method: "POST",
        headers: uid ? { "x-user-id": uid } : {},
      }).catch(() => {});
      stopTypingTimeoutRef.current = null;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (stopTypingTimeoutRef.current) clearTimeout(stopTypingTimeoutRef.current);
      mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const results = await Promise.all(files.map(readFileAsDataUrl));
    setImagePreviews(prev => [...prev, ...results]);
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isSending) return;
    if (!text.trim() && imagePreviews.length === 0) return;

    setIsSending(true);
    try {
      if (imagePreviews.length > 0) {
        for (let i = 0; i < imagePreviews.length; i++) {
          await sendMessage.mutateAsync({
            data: {
              chatId,
              type: "image",
              mediaUrl: imagePreviews[i],
              text: i === imagePreviews.length - 1 && text.trim() ? text.trim() : undefined,
            }
          });
        }
        setImagePreviews([]);
        setText("");
      } else {
        await sendMessage.mutateAsync({ data: { chatId, text, type: "text" } });
        setText("");
        if (textareaRef.current) textareaRef.current.style.height = "40px";
      }
      queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
      onMessageSent?.();
    } finally {
      setIsSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch {
      alert("Нет доступа к микрофону. Разрешите доступ в настройках браузера.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsRecording(false);
    setAudioBlob(null);
    setRecordSeconds(0);
    chunksRef.current = [];
  };

  const sendVoice = async () => {
    if (!audioBlob) return;
    const base64 = await readFileAsDataUrl(audioBlob);
    sendMessage.mutate(
      { data: { chatId, type: "audio", mediaUrl: base64, text: `voice:${recordSeconds}` } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
          queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
        }
      }
    );
    setAudioBlob(null);
    setRecordSeconds(0);
  };

  const insertEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "40px";
    e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
    if (e.target.value.trim()) sendTypingEvent();
  };

  const hasContent = text.trim().length > 0 || imagePreviews.length > 0;

  return (
    <div className="relative">

      {/* Emoji Picker */}
      {showEmoji && (
        <div className="absolute bottom-full mb-2 left-0 right-0 z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex border-b border-border bg-background/80 px-1 overflow-x-auto scrollbar-none">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button key={i} onClick={() => setEmojiCategory(i)}
                className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${emojiCategory === i ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {cat.label}
              </button>
            ))}
          </div>
          <div className="p-3 grid grid-cols-8 gap-1 max-h-48 overflow-y-auto scrollbar-thin">
            {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji, i) => (
              <button key={i} onClick={() => insertEmoji(emoji)}
                className="text-xl hover:bg-secondary rounded-lg p-1 transition-colors text-center">
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Multi-image preview strip */}
      <AnimatePresence>
        {imagePreviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-2 flex gap-2 flex-wrap"
          >
            {imagePreviews.map((src, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="relative rounded-xl overflow-hidden border border-border shadow-md shrink-0"
              >
                <img src={src} alt="" className="h-24 w-24 object-cover block" />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80 transition-colors"
                >
                  <X size={13} />
                </button>
              </motion.div>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-24 w-24 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors shrink-0"
              title="Добавить ещё фото"
            >
              <Images size={22} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice ready to send preview */}
      <AnimatePresence>
        {audioBlob && !isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="mb-2 flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-2xl px-4 py-3"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Mic size={16} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Голосовое сообщение</p>
              <p className="text-xs text-muted-foreground">{formatDuration(recordSeconds)}</p>
            </div>
            <button onClick={cancelRecording} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 size={16} />
            </button>
            <button onClick={sendVoice} disabled={sendMessage.isPending}
              className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-[0_0_10px_rgba(0,188,212,0.3)]">
              <SendHorizontal size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording UI */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 mb-2"
          >
            <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}
              className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm font-medium text-red-400">Запись...</span>
            <span className="text-sm font-mono text-red-300 flex-1">{formatDuration(recordSeconds)}</span>
            <button onClick={cancelRecording} className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Отменить">
              <Trash2 size={16} />
            </button>
            <button onClick={stopRecording}
              className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-[0_0_10px_rgba(239,68,68,0.4)]" title="Остановить">
              <Square size={16} fill="white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main input bar */}
      {!isRecording && !audioBlob && (
        <form onSubmit={handleSend} className="flex items-center gap-2 bg-secondary rounded-2xl px-3 py-2 border border-border focus-within:border-primary/50 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-1.5 transition-colors shrink-0 ${imagePreviews.length > 0 ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            title="Прикрепить фото"
          >
            <Paperclip size={20} />
          </button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextareaChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder={imagePreviews.length > 0 ? "Добавить подпись..." : "Сообщение..."}
            className="flex-1 bg-transparent border-none resize-none max-h-32 min-h-[40px] py-2 px-1 focus:outline-none text-sm placeholder:text-muted-foreground leading-normal"
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

            {hasContent ? (
              <button
                type="submit"
                disabled={isSending}
                className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-[0_0_10px_rgba(0,188,212,0.3)] disabled:opacity-50"
              >
                {isSending ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                  <SendHorizontal size={18} />
                )}
              </button>
            ) : (
              <button type="button" onClick={startRecording}
                className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title="Голосовое сообщение">
                <Mic size={20} />
              </button>
            )}
          </div>
        </form>
      )}

      {showEmoji && <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />}
    </div>
  );
}
