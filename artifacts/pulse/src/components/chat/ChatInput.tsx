import React, { useState, useRef, useEffect } from "react";
import { useSendMessage, useGetMe, getGetMessagesQueryKey, getGetChatsQueryKey, Message } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Paperclip, Mic, SendHorizontal, X, Square, Trash2, Images, Reply, Pencil, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: "Смайлы", emojis: ["😀","😂","🤣","😊","😍","🥰","😘","😎","🤩","🥳","😭","😤","😡","🤔","😏","😴","🤤","😷","😱","😨","🤯","😮","🥺","😢","😔","😕","😫","🤗","🤭","🫢","🤫","🤥","😶","😐","😑"] },
  { label: "Жесты", emojis: ["👍","👎","👋","🤚","✋","🖐","🖖","👌","🤌","✌","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝","👏","🙌","🤲","🤝","🙏","💪","🦾"] },
  { label: "Сердца", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","💕","💞","💓","💗","💖","💘","💝","💫","⭐","🌟","✨","🔥","💎"] },
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

async function compressImage(file: File, maxPx = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width > height) { height = Math.round((height * maxPx) / width); width = maxPx; }
        else { width = Math.round((width * maxPx) / height); height = maxPx; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(url); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); readFileAsDataUrl(file).then(resolve).catch(reject); };
    img.src = url;
  });
}

export interface ChatInputProps {
  chatId: number;
  onMessageSent?: () => void;
  replyTo?: Message | null;
  editMessage?: Message | null;
  onCancelReply?: () => void;
  onCancelEdit?: () => void;
}

export function ChatInput({ chatId, onMessageSent, replyTo, editMessage, onCancelReply, onCancelEdit }: ChatInputProps) {
  const { data: me } = useGetMe();

  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [showScheduler, setShowScheduler] = useState(false);

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
  const prevChatIdRef = useRef<number>(chatId);
  const prevEditRef = useRef<Message | null | undefined>(null);

  const draftKey = `pulse-draft-${chatId}`;

  useEffect(() => {
    const saved = localStorage.getItem(draftKey);
    if (saved) setText(saved);
    prevChatIdRef.current = chatId;
    return () => {
      if (textareaRef.current && textareaRef.current.value.trim()) {
        localStorage.setItem(`pulse-draft-${prevChatIdRef.current}`, textareaRef.current.value);
      } else {
        localStorage.removeItem(`pulse-draft-${prevChatIdRef.current}`);
      }
    };
  }, [chatId]);

  useEffect(() => {
    if (editMessage && editMessage !== prevEditRef.current) {
      setText(editMessage.text || "");
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "52px";
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + "px";
          textareaRef.current.focus();
        }
      }, 50);
    } else if (!editMessage && prevEditRef.current) {
      const draft = localStorage.getItem(draftKey);
      setText(draft || "");
    }
    prevEditRef.current = editMessage;
  }, [editMessage]);

  useEffect(() => {
    if (replyTo) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [replyTo]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (stopTypingTimeoutRef.current) clearTimeout(stopTypingTimeoutRef.current);
      mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("pulse-token");
    if (token) return { "Authorization": `Bearer ${token}` };
    const uid = localStorage.getItem("pulse-user-id");
    return uid ? { "x-user-id": uid } : {};
  };

  const sendTypingEvent = () => {
    if (!typingTimeoutRef.current) {
      fetch(`/api/chats/${chatId}/typing`, { method: "POST", headers: getAuthHeaders() }).catch(() => {});
      typingTimeoutRef.current = setTimeout(() => { typingTimeoutRef.current = null; }, 2500);
    }
    if (stopTypingTimeoutRef.current) clearTimeout(stopTypingTimeoutRef.current);
    stopTypingTimeoutRef.current = setTimeout(() => {
      fetch(`/api/chats/${chatId}/typing/stop`, { method: "POST", headers: getAuthHeaders() }).catch(() => {});
      stopTypingTimeoutRef.current = null;
      if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null; }
    }, 3000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const results = await Promise.all(files.map(f => compressImage(f)));
    setImagePreviews(prev => [...prev, ...results]);
    e.target.value = "";
  };

  const removeImage = (idx: number) => setImagePreviews(prev => prev.filter((_, i) => i !== idx));

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isSending) return;

    const headers: Record<string, string> = { "Content-Type": "application/json", ...getAuthHeaders() };

    if (editMessage) {
      if (!text.trim()) return;
      setIsSending(true);
      try {
        await fetch(`/api/messages/${editMessage.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ text: text.trim() }),
        });
        queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
        setText("");
        localStorage.removeItem(draftKey);
        onCancelEdit?.();
      } finally { setIsSending(false); }
      return;
    }

    if (!text.trim() && imagePreviews.length === 0 && !audioBlob) return;
    setIsSending(true);
    try {
      if (audioBlob) {
        const base64 = await readFileAsDataUrl(audioBlob);
        await sendMessage.mutateAsync({
          data: { chatId, type: "audio", mediaUrl: base64, text: `voice:${recordSeconds}`, replyToId: replyTo?.id }
        });
        setAudioBlob(null);
        setRecordSeconds(0);
      } else if (imagePreviews.length > 0) {
        for (let i = 0; i < imagePreviews.length; i++) {
          await sendMessage.mutateAsync({
            data: {
              chatId,
              type: "image",
              mediaUrl: imagePreviews[i],
              text: i === imagePreviews.length - 1 && text.trim() ? text.trim() : undefined,
              replyToId: replyTo?.id,
            }
          });
        }
        setImagePreviews([]);
        setText("");
      } else {
        await sendMessage.mutateAsync({ data: { chatId, text, type: "text", replyToId: replyTo?.id } });
        setText("");
        if (textareaRef.current) textareaRef.current.style.height = "52px";
      }
      localStorage.removeItem(draftKey);
      setShowEmoji(false);
      onCancelReply?.();
      queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
      onMessageSent?.();
    } finally { setIsSending(false); }
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
      alert("Нет доступа к микрофону.");
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

  const insertEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "52px";
    e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
    if (e.target.value.trim()) sendTypingEvent();
    if (!editMessage) localStorage.setItem(draftKey, e.target.value);
  };

  const handleScheduledSend = async () => {
    if (!text.trim() || !scheduledAt) return;
    try {
      const headers = { "Content-Type": "application/json", ...getAuthHeaders() };
      const res = await fetch("/api/messages/schedule", {
        method: "POST",
        headers,
        body: JSON.stringify({ chatId, text: text.trim(), scheduledAt: new Date(scheduledAt).toISOString() }),
      });
      if (!res.ok) return alert("Ошибка");
      setText("");
      setScheduledAt("");
      setShowScheduler(false);
      if (textareaRef.current) textareaRef.current.style.height = "52px";
      localStorage.removeItem(draftKey);
    } catch {
      alert("Ошибка соединения");
    }
  };

  const _minDate = new Date(Date.now() + 60_000);
  const _pad = (n: number) => n.toString().padStart(2, "0");
  const minDatetime = `${_minDate.getFullYear()}-${_pad(_minDate.getMonth()+1)}-${_pad(_minDate.getDate())}T${_pad(_minDate.getHours())}:${_pad(_minDate.getMinutes())}`;

  const hasContent = text.trim().length > 0 || imagePreviews.length > 0 || audioBlob;

  return (
    <div className="relative px-4 pb-4 md:px-6 md:pb-6 z-30">
      <div className="max-w-3xl mx-auto w-full relative">
        <AnimatePresence>
          {showScheduler && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full mb-3 left-0 right-0 z-50 bg-card border border-border rounded-[24px] p-5 shadow-2xl origin-bottom"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5 font-bold text-[15px]">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock size={16} className="text-primary" />
                  </div>
                  Запланировать
                </div>
                <button onClick={() => setShowScheduler(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <X size={18} />
                </button>
              </div>
              <input
                type="datetime-local"
                value={scheduledAt}
                min={minDatetime}
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full bg-secondary border-transparent rounded-[16px] px-4 py-3.5 text-[15px] font-bold focus:outline-none focus:bg-background focus:ring-2 focus:ring-primary transition-all mb-4"
              />
              <button
                onClick={handleScheduledSend}
                disabled={!text.trim() || !scheduledAt}
                className="w-full py-4 bg-primary text-primary-foreground rounded-[16px] text-[15px] font-black disabled:opacity-50 transition-all hover:bg-primary/90 shadow-[0_4px_14px_rgba(255,85,0,0.3)] hover:-translate-y-0.5 active:translate-y-0"
              >
                Сохранить
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showEmoji && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full mb-3 left-0 md:w-[320px] z-50 bg-card border border-border rounded-[24px] shadow-2xl overflow-hidden origin-bottom-left"
            >
              <div className="flex gap-1 p-2 bg-secondary/50 border-b border-border overflow-x-auto scrollbar-none">
                {EMOJI_CATEGORIES.map((cat, i) => (
                  <button key={i} onClick={() => setEmojiCategory(i)}
                    className={`px-3 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-all shrink-0 ${emojiCategory === i ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}>
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="p-3 grid grid-cols-7 gap-1 max-h-[220px] overflow-y-auto scrollbar-none">
                {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji, i) => (
                  <button key={i} onClick={() => insertEmoji(emoji)}
                    className="text-2xl hover:bg-secondary rounded-xl p-1.5 transition-colors text-center hover:scale-110 active:scale-95">
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {replyTo && !editMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: 10 }}
              className="mb-2 flex items-center gap-3 bg-secondary/80 backdrop-blur-md border border-border rounded-[20px] px-4 py-3"
            >
              <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shrink-0">
                <Reply size={16} className="text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wider text-primary mb-0.5">{replyTo.sender?.displayName || "Пользователь"}</p>
                <p className="text-[13px] font-medium text-muted-foreground truncate">
                  {replyTo.type === "image" ? "📷 Фото" : replyTo.type === "audio" ? "🎤 Голосовое" : replyTo.text}
                </p>
              </div>
              <button onClick={onCancelReply} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-background text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {editMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: 10 }}
              className="mb-2 flex items-center gap-3 bg-orange-500/10 backdrop-blur-md border border-orange-500/20 rounded-[20px] px-4 py-3"
            >
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                <Pencil size={16} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wider text-orange-500 mb-0.5">Редактирование</p>
                <p className="text-[13px] font-medium text-foreground truncate">{editMessage.text}</p>
              </div>
              <button onClick={onCancelEdit} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {imagePreviews.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="mb-3 flex gap-2.5 flex-wrap"
            >
              {imagePreviews.map((src, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  className="relative rounded-2xl overflow-hidden border border-border shadow-sm shrink-0 group">
                  <img src={src} alt="" className="h-28 w-28 object-cover block" />
                  <button onClick={() => removeImage(idx)} className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100">
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
              <button onClick={() => fileInputRef.current?.click()}
                className="h-28 w-28 rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 flex items-center justify-center text-muted-foreground hover:text-primary transition-all shrink-0">
                <Images size={28} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`p-1.5 bg-card border rounded-[28px] transition-all flex items-end gap-1.5 shadow-sm focus-within:shadow-md focus-within:border-primary/50 ${editMessage ? "border-orange-500/50 bg-orange-500/5" : "border-border"}`}>
          
          <AnimatePresence mode="wait">
            {isRecording ? (
              <motion.div
                key="recording"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1 flex items-center gap-3 px-4 h-12"
              >
                <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.2, repeat: Infinity }} className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                <span className="text-[15px] font-bold text-red-500">Запись...</span>
                <span className="text-[15px] font-black font-mono text-red-400 ml-auto tracking-wider">{formatDuration(recordSeconds)}</span>
                <button onClick={cancelRecording} className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors shrink-0 ml-2"><Trash2 size={18} /></button>
                <button onClick={stopRecording} className="w-10 h-10 flex items-center justify-center bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-[0_4px_14px_rgba(239,68,68,0.4)] shrink-0"><Square size={16} fill="white" /></button>
              </motion.div>
            ) : audioBlob ? (
              <motion.div
                key="audio-preview"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1 flex items-center gap-3 px-2 h-12"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Mic size={18} className="text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground">Голосовое</p>
                  <p className="text-[11px] font-black text-primary/70">{formatDuration(recordSeconds)}</p>
                </div>
                <button onClick={cancelRecording} className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"><Trash2 size={18} /></button>
              </motion.div>
            ) : (
              <motion.form
                key="input"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onSubmit={handleSend}
                className="flex-1 flex items-end gap-1"
              >
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                
                {!editMessage && (
                  <button type="button" onClick={() => setShowEmoji(v => !v)}
                    className="w-12 h-12 flex items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0 mb-[2px]">
                    <span className="text-xl leading-none">😀</span>
                  </button>
                )}

                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={handleTextareaChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    if (e.key === "Escape") { onCancelReply?.(); onCancelEdit?.(); setShowEmoji(false); }
                  }}
                  placeholder={editMessage ? "Редактировать..." : imagePreviews.length > 0 ? "Подпись..." : "Написать сообщение..."}
                  className="flex-1 bg-transparent border-none resize-none max-h-32 min-h-[52px] py-4 px-2 focus:outline-none text-[15px] font-medium placeholder:text-muted-foreground/60 leading-normal scrollbar-none"
                  rows={1}
                  style={{ height: "52px" }}
                  onFocus={() => setShowEmoji(false)}
                />

                {!editMessage && !text.trim() && imagePreviews.length === 0 && (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-12 h-12 flex items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0 mb-[2px]">
                    <Paperclip size={20} />
                  </button>
                )}

                {hasContent && !editMessage && (
                  <button type="button" onClick={() => setShowScheduler(v => !v)}
                    className="w-12 h-12 flex items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0 mb-[2px]">
                    <Clock size={20} />
                  </button>
                )}
              </motion.form>
            )}
          </AnimatePresence>

          {(!isRecording) && (
            <div className="shrink-0 mb-[2px]">
              {hasContent ? (
                <button
                  onClick={() => handleSend()}
                  disabled={isSending}
                  className="w-12 h-12 flex items-center justify-center bg-primary text-primary-foreground rounded-[20px] hover:bg-primary/90 transition-all disabled:opacity-50 shadow-[0_4px_14px_rgba(255,85,0,0.3)] hover:scale-105 active:scale-95"
                >
                  <SendHorizontal size={20} className={isSending ? "animate-pulse" : "translate-x-[-1px]"} />
                </button>
              ) : !editMessage && !audioBlob ? (
                <button
                  onClick={startRecording}
                  className="w-12 h-12 flex items-center justify-center bg-secondary text-foreground rounded-[20px] hover:bg-secondary/80 transition-all hover:scale-105 active:scale-95"
                >
                  <Mic size={20} />
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}