import React, { useState, useRef, useEffect, memo } from "react";
import { emojiToTwemojiUrl } from "@/lib/twemoji";
import { useSendMessage, useGetMe, getGetMessagesQueryKey, getGetChatsQueryKey, Message } from "@workspace/api-client-react";
import type { P2PChannel } from "@/hooks/useP2PChannel";
import { useQueryClient } from "@tanstack/react-query";
import { Paperclip, Mic, SendHorizontal, X, Square, Trash2, Images, Reply, Pencil, Clock, BarChart2, Plus, Minus, CalendarClock, Hourglass, Smile, Package, FileText, FileCode, FileArchive, File as FileIcon, Video, Camera } from "lucide-react";

interface DocPreview { name: string; size: number; mime: string; data: string; }

function formatBytes(b: number) {
  if (b < 1024) return `${b} Б`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} КБ`;
  return `${(b / (1024 * 1024)).toFixed(1)} МБ`;
}

function DocIcon({ mime, name }: { mime: string; name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mime === "application/pdf") return <FileText size={22} className="text-red-400" />;
  if (["zip","rar","7z","tar","gz","bz2"].includes(ext)) return <FileArchive size={22} className="text-yellow-400" />;
  if (["js","ts","html","css","py","json","xml","java","cpp","c","go","rs","php"].includes(ext)) return <FileCode size={22} className="text-green-400" />;
  if (["doc","docx","xls","xlsx","ppt","pptx","odt","ods"].includes(ext)) return <FileText size={22} className="text-blue-400" />;
  if (mime.startsWith("video/")) return <Video size={22} className="text-purple-400" />;
  return <FileIcon size={22} className="text-muted-foreground" />;
}
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";


const EMOJI_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  { label: "Смайлы", icon: "😀", emojis: ["😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","🥰","😘","🥲","😗","😙","🥺","😚","🙂","🤗","🤭","🤫","🤔","🤐","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","😕","☹️","😟","😧","😮","😲","😳","🥸","😢","😭","😤","😠","😡","🤬","💀","👻","👽","🤖","💩","😈","👹","👺","🤡","💫","💥","❗","❓","‼️"] },
  { label: "Жесты", icon: "👋", emojis: ["👋","🤚","🖐","✋","🖖","👌","🤌","🤏","✌","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🫀","🫁","🧠","🦷","🦴","👀","👁","👅","👄","💋","🧑","👶","🧒","👦","👧","🧑","👱","🧔","👩","👴","👵","🧓","👮","💂","🕵","👷","🫅","👸","🤴","🧙","🧝","🧛","🧟","🧞","🧜","🧚","🤶","🎅","🧑‍⚕️","🧑‍🏫","🧑‍🍳","🧑‍🔧","🧑‍🎤","🧑‍💻","🧑‍🚀"] },
  { label: "Сердца", icon: "❤️", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","❤️‍🔥","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","✡️","🕉","☯️","🆗","🆙","🆒","🆕","🆓","🉐","🉑","💯","🔝","🔛","🔜","🔚","⭕","🚫","💢","♨️","🚷","📵","🔞","❌","⭕","🛑","⛔","📛","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🟤","💫","⭐","🌟","✨","🌠","🔥","💥","☀️","🌤","⛅","☁️","❄️","⛄","🌊","💧","🌀"] },
  { label: "Животные", icon: "🐶", emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🕷","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮","🐈","🐓","🦃","🦚","🦜","🦢","🕊","🐇","🦝","🦨","🦡","🦦","🦥","🐁","🐀","🐿","🦔","🐾","🐉","🐲"] },
  { label: "Еда", icon: "🍎", emojis: ["🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶","🧄","🧅","🥔","🍠","🥐","🥖","🍞","🥨","🧀","🥚","🍳","🥞","🧇","🥓","🍗","🍖","🌮","🌯","🥙","🧆","🍣","🍱","🍤","🍙","🍚","🍛","🍜","🍝","🍲","🥘","🍛","🥗","🧂","🧈","🍿","🧂","🥫","🍱","🍘","🍥","🥮","🍢","🍡","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍩","🍪","🌰","🥜","🍯","🧃","🥤","🍵","☕","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧉","🍾","🥛","🧋"] },
  { label: "Путешествия", icon: "✈️", emojis: ["✈️","🚀","🛸","🚁","🛶","⛵","🚤","🛥","🛳","⛴","🚢","🚂","🚃","🚄","🚅","🚆","🚇","🚊","🚝","🚞","🚋","🚌","🚍","🚎","🚐","🚑","🚒","🚓","🚕","🚗","🚙","🛻","🚚","🚛","🚜","🏎","🏍","🛵","🚲","🛴","🛹","🚏","⛽","🚨","🚥","🚦","🛑","🚧","⚓","🛤","🗺","🧭","🌍","🌎","🌏","🗻","🌋","🏔","⛰","🏕","🏖","🏜","🏝","🏛","🏗","🏘","🏚","🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","🏯","🏰","💒","🗼","🗽","⛩","🕌","🛕","⛪","🕍","🗿","🗺","🧳","🌐","🎡","🎢","🎠","⛲","🎑"] },
  { label: "Предметы", icon: "💻", emojis: ["💻","🖥","🖨","⌨️","🖱","📱","☎️","📞","📟","📠","📺","📷","📸","📹","🎥","📻","🎙","🎚","🎛","⏱","⏲","⏰","🕰","⌛","⏳","📡","🔋","🔌","💡","🔦","🕯","🧯","💸","💵","💴","💶","💷","💰","💳","🪙","💎","🔑","🗝","🔐","🔏","🔓","🔒","🔧","🔩","⚙️","🔨","⛏","🪤","🔫","⚔️","🛡","🔪","🏹","🧲","🔮","🪄","💊","💉","🩹","🩺","🔭","🔬","🩻","🧰","🪜","🧱","🛋","🚪","🪑","🚿","🛁","🛏","🧸","🖼","🧶","🧵","👓","🕶","🌂","🧳","🎒","💼","👜","👝","🎓","⛑","🪖","🎩","👒","🧢","👑","💍","💄","💅","👠","👡","👢","👟","🥾","🧦","🧤","🧣","🧥","👗","👘","👙","👚","👛","🩱","🩲","🩳","👔","👕","👖","🧲","🪞","🛒"] },
  { label: "Флаги", icon: "🚩", emojis: ["🏳","🏴","🚩","🎌","🏁","🇦🇨","🇦🇩","🇦🇪","🇦🇫","🇦🇬","🇦🇮","🇦🇱","🇦🇲","🇦🇴","🇦🇶","🇦🇷","🇦🇸","🇦🇹","🇦🇺","🇦🇼","🇦🇽","🇦🇿","🇧🇦","🇧🇧","🇧🇩","🇧🇪","🇧🇫","🇧🇬","🇧🇭","🇧🇮","🇧🇯","🇧🇱","🇧🇲","🇧🇳","🇧🇴","🇧🇷","🇧🇸","🇧🇹","🇧🇼","🇧🇾","🇧🇿","🇨🇦","🇨🇩","🇨🇫","🇨🇬","🇨🇭","🇨🇮","🇨🇰","🇨🇱","🇨🇲","🇨🇳","🇨🇴","🇨🇷","🇨🇺","🇨🇻","🇨🇼","🇨🇾","🇨🇿","🇩🇪","🇩🇯","🇩🇰","🇩🇲","🇩🇴","🇩🇿","🇪🇦","🇪🇨","🇪🇪","🇪🇬","🇪🇭","🇪🇷","🇪🇸","🇪🇹","🇫🇮","🇫🇯","🇫🇰","🇫🇲","🇫🇴","🇫🇷","🇬🇦","🇬🇧","🇬🇩","🇬🇪","🇬🇫","🇬🇬","🇬🇭","🇬🇮","🇬🇱","🇬🇲","🇬🇳","🇬🇵","🇬🇶","🇬🇷","🇬🇸","🇬🇹","🇬🇺","🇬🇼","🇬🇾","🇭🇰","🇭🇳","🇭🇷","🇭🇹","🇭🇺","🇮🇩","🇮🇪","🇮🇱","🇮🇲","🇮🇳","🇮🇴","🇮🇶","🇮🇷","🇮🇸","🇮🇹","🇯🇪","🇯🇲","🇯🇴","🇯🇵","🇰🇪","🇰🇬","🇰🇭","🇰🇮","🇰🇲","🇰🇳","🇰🇵","🇰🇷","🇰🇼","🇰🇾","🇰🇿","🇱🇦","🇱🇧","🇱🇨","🇱🇮","🇱🇰","🇱🇷","🇱🇸","🇱🇹","🇱🇺","🇱🇻","🇱🇾","🇲🇦","🇲🇨","🇲🇩","🇲🇪","🇲🇫","🇲🇬","🇲🇭","🇲🇰","🇲🇱","🇲🇲","🇲🇳","🇲🇴","🇲🇵","🇲🇶","🇲🇷","🇲🇸","🇲🇹","🇲🇺","🇲🇻","🇲🇼","🇲🇽","🇲🇾","🇲🇿","🇳🇦","🇳🇨","🇳🇪","🇳🇫","🇳🇬","🇳🇮","🇳🇱","🇳🇴","🇳🇵","🇳🇷","🇳🇺","🇳🇿","🇴🇲","🇵🇦","🇵🇪","🇵🇫","🇵🇬","🇵🇭","🇵🇰","🇵🇱","🇵🇲","🇵🇳","🇵🇷","🇵🇸","🇵🇹","🇵🇼","🇵🇾","🇶🇦","🇷🇪","🇷🇴","🇷🇸","🇷🇺","🇷🇼","🇸🇦","🇸🇧","🇸🇨","🇸🇩","🇸🇪","🇸🇬","🇸🇭","🇸🇮","🇸🇰","🇸🇱","🇸🇲","🇸🇳","🇸🇴","🇸🇷","🇸🇸","🇸🇹","🇸🇻","🇸🇽","🇸🇾","🇸🇿","🇹🇨","🇹🇩","🇹🇫","🇹🇬","🇹🇭","🇹🇯","🇹🇰","🇹🇱","🇹🇲","🇹🇳","🇹🇴","🇹🇷","🇹🇹","🇹🇻","🇹🇼","🇹🇿","🇺🇦","🇺🇬","🇺🇸","🇺🇾","🇺🇿","🇻🇦","🇻🇨","🇻🇪","🇻🇬","🇻🇮","🇻🇳","🇻🇺","🇼🇫","🇼🇸","🇽🇰","🇾🇪","🇾🇹","🇿🇦","🇿🇲","🇿🇼"] },
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

async function compressImage(file: File, maxPx = 960, quality = 0.75): Promise<string> {
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
      if (!ctx) { readFileAsDataUrl(file).then(resolve).catch(reject); return; }
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
  isBot?: boolean;
  p2p?: P2PChannel;
  isChannel?: boolean;
  isChannelAdmin?: boolean;
}

export function ChatInput({ chatId, onMessageSent, replyTo, editMessage, onCancelReply, onCancelEdit, isBot, p2p, isChannel, isChannelAdmin }: ChatInputProps) {
  const { data: me } = useGetMe();
  const { toast } = useToast();

  const [text, setText] = useState("");
  const FLAGS_CATEGORY = 7;
  const STICKERS_TAB = EMOJI_CATEGORIES.length;
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [docPreviews, setDocPreviews] = useState<DocPreview[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [showScheduledList, setShowScheduledList] = useState(false);
  const [loadingScheduled, setLoadingScheduled] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [pollSending, setPollSending] = useState(false);
  const [pollError, setPollError] = useState("");
  const [showMobileActions, setShowMobileActions] = useState(false);

  const isPrimePlus = !!(me as any)?.hasPrime && (me as any)?.primeTier === "prime_plus";
  const isPrime = !!(me as any)?.hasPrime;

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
  // Track current text in a ref so the cleanup closure always sees the latest value
  // even when textareaRef.current is null (DOM already removed on unmount).
  const textValueRef = useRef<string>("");

  // Keep textValueRef in sync with the text state so the draft cleanup closure
  // always reads the latest value (even when textareaRef.current is null on unmount).
  useEffect(() => { textValueRef.current = text; });

  const draftKey = `pulse-draft-${chatId}`;

  useEffect(() => {
    const saved = localStorage.getItem(draftKey);
    if (saved) setText(saved);
    prevChatIdRef.current = chatId;
    return () => {
      const currentText = textValueRef.current.trim();
      if (currentText) {
        localStorage.setItem(`pulse-draft-${prevChatIdRef.current}`, currentText);
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
          textareaRef.current.style.height = "44px";
          const maxH = Math.min(140, Math.floor(window.innerHeight / 4));
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, maxH) + "px";
          if (window.matchMedia("(hover: hover)").matches) textareaRef.current.focus();
        }
      }, 50);
    } else if (!editMessage && prevEditRef.current) {
      const draft = localStorage.getItem(draftKey);
      setText(draft || "");
    }
    prevEditRef.current = editMessage;
  }, [editMessage]);

  useEffect(() => {
    if (replyTo && window.matchMedia("(hover: hover)").matches) {
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
    const token = sessionStorage.getItem("pulse-token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
  };

  const fetchScheduledMessages = async () => {
    if (!isPrime) return;
    setLoadingScheduled(true);
    try {
      const res = await fetch(`/api/messages/scheduled?chatId=${chatId}`, { headers: getAuthHeaders() });
      if (res.ok) setScheduledMessages(await res.json());
    } catch {}
    setLoadingScheduled(false);
  };

  const handleCancelScheduled = async (id: number) => {
    try {
      await fetch(`/api/messages/scheduled/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      setScheduledMessages(prev => prev.filter(m => m.id !== id));
    } catch {}
  };

  const applyTimePreset = (offsetMs: number) => {
    const d = new Date(Date.now() + offsetMs);
    const pad = (n: number) => n.toString().padStart(2, "0");
    setScheduledAt(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  const applyAbsolutePreset = (hour: number, offsetDays = 1) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour, 0, 0, 0);
    const pad = (n: number) => n.toString().padStart(2, "0");
    setScheduledAt(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  const formatScheduledAt = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    const isToday = d.toDateString() === now.toDateString();
    const isTomorrow = d.toDateString() === tomorrow.toDateString();
    const timeStr = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `Сегодня в ${timeStr}`;
    if (isTomorrow) return `Завтра в ${timeStr}`;
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) + ` в ${timeStr}`;
  };

  const sendTypingEvent = (typingType: string = "text") => {
    if (!typingTimeoutRef.current) {
      fetch(`/api/chats/${chatId}/typing`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ typingType }),
      }).catch(() => {});
      typingTimeoutRef.current = setTimeout(() => { typingTimeoutRef.current = null; }, 2500);
    }
    if (stopTypingTimeoutRef.current) clearTimeout(stopTypingTimeoutRef.current);
    stopTypingTimeoutRef.current = setTimeout(() => {
      fetch(`/api/chats/${chatId}/typing/stop`, { method: "POST", headers: getAuthHeaders() }).catch(() => {});
      stopTypingTimeoutRef.current = null;
      if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null; }
    }, 3000);
  };

  const handleSendPoll = async () => {
    const q = pollQuestion.trim();
    const opts = pollOptions.map(o => o.trim()).filter(o => o.length > 0);
    if (!q) { setPollError("Введите вопрос"); return; }
    if (opts.length < 2) { setPollError("Нужно минимум 2 варианта ответа"); return; }
    setPollSending(true);
    setPollError("");
    try {
      const token = sessionStorage.getItem("pulse-token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/polls", {
        method: "POST",
        headers,
        body: JSON.stringify({ chatId, question: q, options: opts, allowMultiple: pollAllowMultiple }),
      });
      if (!res.ok) {
        const data = await res.json();
        setPollError(data.error || "Ошибка создания опроса");
        return;
      }
      setShowPollCreator(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setPollAllowMultiple(false);
      queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
      onMessageSent?.();
    } catch {
      setPollError("Ошибка подключения");
    } finally {
      setPollSending(false);
    }
  };

  const xhrPost = (url: string, body: object, token: string | null, onProgress?: (pct: number) => void): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader("Content-Type", "application/json");
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); } catch { resolve(null); }
        } else { reject(new Error(`HTTP ${xhr.status}`)); }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(JSON.stringify(body));
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    // Always reset input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
    const MAX_FILE_MB = 100;
    const oversized = files.filter(f => f.size > MAX_FILE_MB * 1024 * 1024);
    if (oversized.length > 0) {
      toast({ title: "Файл слишком большой", description: `Максимальный размер — ${MAX_FILE_MB} МБ`, variant: "destructive" });
      return;
    }
    const MAX_IMAGES_PER_ALBUM = 20;
    const images: File[] = [];
    const docs: File[] = [];
    for (const f of files) {
      if (f.type.startsWith("image/") && !f.type.startsWith("image/svg")) images.push(f);
      else docs.push(f);
    }
    try {
      if (images.length > 0) {
        const results = await Promise.all(images.map(f => compressImage(f)));
        setImagePreviews(prev => [...prev, ...results]);
        sendTypingEvent("photo");
      }
      if (docs.length > 0) {
        const results = await Promise.all(docs.map(async f => ({
          name: f.name,
          size: f.size,
          mime: f.type || "application/octet-stream",
          data: await readFileAsDataUrl(f),
        })));
        setDocPreviews(prev => [...prev, ...results]);
      }
    } catch {
      toast({ title: "Ошибка загрузки файла", description: "Не удалось прочитать файл", variant: "destructive" });
    }
  };

  const removeImage = (idx: number) => setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  const removeDoc = (idx: number) => setDocPreviews(prev => prev.filter((_, i) => i !== idx));

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

    if (!text.trim() && imagePreviews.length === 0 && !audioBlob && docPreviews.length === 0) return;
    setIsSending(true);
    try {
      if (audioBlob) {
        const base64 = await readFileAsDataUrl(new File([audioBlob], "voice.webm", { type: audioBlob.type }));
        const sent = await sendMessage.mutateAsync({
          data: { chatId, type: "audio", mediaUrl: base64, text: `voice:${recordSeconds}`, replyToId: replyTo?.id }
        });
        if (sent) p2p?.send(sent as Message);
        setAudioBlob(null);
        setRecordSeconds(0);
      } else if (imagePreviews.length > 0) {
        const token = sessionStorage.getItem("pulse-token");
        setUploadProgress(0);
        try {
          if (imagePreviews.length === 1) {
            // Single image — lighter mutation path
            const sent = await sendMessage.mutateAsync({
              data: {
                chatId,
                type: "image",
                mediaUrl: imagePreviews[0],
                text: text.trim() || undefined,
                replyToId: replyTo?.id,
              }
            });
            if (sent) p2p?.send(sent as Message);
          } else {
            // 2+ images — split into batches of 20 and send each batch as a separate album
            const BATCH = 20;
            const batches: string[][] = [];
            for (let i = 0; i < imagePreviews.length; i += BATCH) {
              batches.push(imagePreviews.slice(i, i + BATCH));
            }
            for (let b = 0; b < batches.length; b++) {
              const m = await xhrPost("/api/messages", {
                chatId,
                type: "album",
                mediaUrl: JSON.stringify({ urls: batches[b] }),
                text: b === 0 ? (text.trim() || undefined) : undefined,
                replyToId: b === 0 ? replyTo?.id : undefined,
              }, token, (pct) => {
                const base = (b / batches.length) * 100;
                setUploadProgress(Math.round(base + (pct / batches.length)));
              });
              if (m?.id) p2p?.send(m);
            }
          }
        } finally {
          setUploadProgress(null);
        }
        setImagePreviews([]);
        setText("");
        onCancelReply?.();
      } else if (docPreviews.length > 0) {
        const token = sessionStorage.getItem("pulse-token");
        const totalDocs = docPreviews.length;
        for (let i = 0; i < docPreviews.length; i++) {
          const doc = docPreviews[i];
          setUploadProgress(0);
          try {
            const isVideo = doc.mime.startsWith("video/");
            const m = await xhrPost("/api/messages", {
              chatId,
              type: isVideo ? "video" : "document",
              mediaUrl: doc.data,
              text: JSON.stringify({ name: doc.name, size: doc.size, mime: doc.mime }),
              replyToId: replyTo?.id,
            }, token, (pct) => {
              const base = (i / totalDocs) * 100;
              const step = (1 / totalDocs) * 100;
              setUploadProgress(Math.round(base + (pct / 100) * step));
            });
            if (m?.id) p2p?.send(m);
            setDocPreviews(prev => prev.filter(d => d !== doc));
          } catch (docErr) {
            toast({ title: "Ошибка отправки", description: `Не удалось отправить «${doc.name}»`, variant: "destructive" });
          } finally {
            if (i === totalDocs - 1) setUploadProgress(null);
          }
        }
        setText("");
      } else {
        const textToSend = text.trim();
        const capturedReplyTo = replyTo;

        // Clear input immediately for instant feel
        setText("");
        if (textareaRef.current) textareaRef.current.style.height = "44px";

        {
          // Optimistic: add message to cache immediately so user sees it at once
          const tempId = -Date.now();
          queryClient.setQueryData(getGetMessagesQueryKey({ chatId }), (old: any) => {
            const optimistic: any = {
              id: tempId,
              chatId,
              senderId: me?.id ?? 0,
              text: textToSend,
              type: "text",
              mediaUrl: null,
              replyToId: capturedReplyTo?.id ?? null,
              replyTo: capturedReplyTo ?? null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isDeleted: false,
              isRead: false,
              isEdited: false,
              effect: null,
              giftData: null,
              pollData: null,
              reactions: [],
              sender: me ?? null,
              deletedContentVisible: false,
            };
            return old ? [...old, optimistic] : [optimistic];
          });
          try {
            const sent = await sendMessage.mutateAsync({ data: { chatId, text: textToSend, type: "text", replyToId: capturedReplyTo?.id } });
            if (sent) {
              // Swap optimistic message with the real one from server
              queryClient.setQueryData(getGetMessagesQueryKey({ chatId }), (old: any) =>
                Array.isArray(old) ? old.filter((m: any) => m.id !== tempId).concat([sent]) : [sent]
              );
              p2p?.send(sent as Message);
            }
          } catch (err) {
            // Rollback: remove optimistic message and restore text
            setText(textToSend);
            queryClient.setQueryData(getGetMessagesQueryKey({ chatId }), (old: any) =>
              Array.isArray(old) ? old.filter((m: any) => m.id !== tempId) : []
            );
            throw err;
          }
        }
      }
      localStorage.removeItem(draftKey);
      setShowEmoji(false);
      onCancelReply?.();
      queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
      onMessageSent?.();
      import("@/utils/questTracker").then(({ trackQuestAction }) => trackQuestAction("message_sent"));
    } catch (sendErr: any) {
      const isTimeout = (sendErr as Error)?.name === "TimeoutError";
      const apiMsg = sendErr?.response?.data?.error || sendErr?.data?.error || sendErr?.message || "";
      const errMsg = isTimeout
        ? "Превышено время ожидания сервера"
        : apiMsg || "Проверьте соединение и попробуйте снова";
      toast({ title: "Не удалось отправить сообщение", description: errMsg, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const MAX_VOICE_SECONDS = 120; // 2 minutes max recording

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32000 });
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
      sendTypingEvent("audio");
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds(s => {
          const next = s + 1;
          if (next >= MAX_VOICE_SECONDS) {
            if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
            setIsRecording(false);
          }
          return next;
        });
      }, 1000);
    } catch {
      toast({ title: "Нет доступа к микрофону", description: "Разрешите доступ к микрофону в настройках браузера", variant: "destructive" });
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

  const sendGif = async (gifUrl: string) => {
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "44px";
    setIsSending(true);
    try {
      const sent = await sendMessage.mutateAsync({
        data: { chatId, type: "image", mediaUrl: gifUrl, text: "gif" },
      });
      if (sent) p2p?.send(sent as Message);
      queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
      onMessageSent?.();
    } catch {} finally {
      setIsSending(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    if (window.matchMedia("(hover: hover)").matches) {
      textareaRef.current?.focus();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    e.target.style.height = "44px";
    const maxH = Math.min(140, Math.floor(window.innerHeight / 4));
    e.target.style.height = Math.min(e.target.scrollHeight, maxH) + "px";
    if (val.trim()) sendTypingEvent("text");
    if (!editMessage) localStorage.setItem(draftKey, val);
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Ошибка планирования");
        return;
      }
      const newMsg = await res.json();
      setScheduledMessages(prev => [...prev, newMsg].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()));
      setText("");
      setScheduledAt("");
      setShowScheduledList(true);
      if (textareaRef.current) textareaRef.current.style.height = "44px";
      localStorage.removeItem(draftKey);
    } catch {
      alert("Ошибка соединения");
    }
  };

  const _minDate = new Date(Date.now() + 60_000);
  const _pad = (n: number) => n.toString().padStart(2, "0");
  const minDatetime = `${_minDate.getFullYear()}-${_pad(_minDate.getMonth()+1)}-${_pad(_minDate.getDate())}T${_pad(_minDate.getHours())}:${_pad(_minDate.getMinutes())}`;

  const hasContent = text.trim().length > 0 || imagePreviews.length > 0 || docPreviews.length > 0 || !!audioBlob;

  if (isChannel && !isChannelAdmin) {
    if (!replyTo) {
      return (
        <div className="px-4 pb-4 md:px-6 md:pb-6 z-30">
          <div className="max-w-3xl mx-auto w-full">
            <div className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-secondary/50 border border-border text-muted-foreground text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
              <span className="font-medium">Канал — только администраторы могут публиковать. Нажмите «Ответить» на пост, чтобы оставить комментарий.</span>
            </div>
          </div>
        </div>
      );
    }
  }

  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.some(t => t === "Files")) setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const MAX_FILE_MB = 100;
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    const oversized = files.filter(f => f.size > MAX_FILE_MB * 1024 * 1024);
    if (oversized.length) {
      toast({ title: "Файл слишком большой", description: `Максимальный размер — ${MAX_FILE_MB} МБ`, variant: "destructive" });
      return;
    }
    const images = files.filter(f => f.type.startsWith("image/") && !f.type.includes("svg"));
    const docs = files.filter(f => !f.type.startsWith("image/") || f.type.includes("svg"));
    if (images.length) {
      const compressed = await Promise.all(images.map(f => compressImage(f)));
      setImagePreviews(prev => [...prev, ...compressed]);
    }
    for (const file of docs) {
      const data = await readFileAsDataUrl(file);
      setDocPreviews(prev => [...prev, { name: file.name, size: file.size, mime: file.type || "application/octet-stream", data }]);
    }
  };

  return (
    <div
      className={`relative px-4 md:px-6 z-30 transition-all ${isDragOver ? "after:content-[''] after:absolute after:inset-0 after:rounded-2xl after:border-2 after:border-dashed after:border-primary after:pointer-events-none" : ""}`}
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex flex-col pointer-events-none">
          <div className="flex-1 flex items-center justify-center border-4 border-dashed border-blue-400/60 bg-blue-500/10 m-2 mb-1 rounded-2xl">
            <div className="text-center">
              <FileIcon size={32} className="mx-auto mb-2 text-blue-400 opacity-60" />
              <p className="font-semibold text-sm text-blue-300">Отправка без сжатия</p>
              <p className="text-xs text-muted-foreground mt-0.5">Перетащите файлы сюда</p>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center border-4 border-dashed border-primary/60 bg-primary/10 m-2 mt-1 rounded-2xl">
            <div className="text-center">
              <Camera size={32} className="mx-auto mb-2 text-primary opacity-60" />
              <p className="font-semibold text-sm text-primary">Быстрая отправка</p>
              <p className="text-xs text-muted-foreground mt-0.5">Перетащите фото/видео сюда</p>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-3xl mx-auto w-full relative">
        <AnimatePresence>
          {showScheduler && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              className="absolute bottom-full mb-3 left-0 right-0 z-50 bg-card border border-border rounded-[24px] shadow-2xl origin-bottom overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <CalendarClock size={16} className="text-primary" />
                  </div>
                  <span className="font-bold text-[15px]">Запланировать</span>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-violet-400 border border-violet-500/20">
                    Prime
                  </span>
                </div>
                <button onClick={() => { setShowScheduler(false); setShowScheduledList(false); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-5 mb-4">
                <button
                  onClick={() => setShowScheduledList(false)}
                  className={`flex-1 py-2 rounded-[12px] text-[13px] font-black transition-all ${!showScheduledList ? "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(139,92,246,0.3)]" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  Выбрать время
                </button>
                <button
                  onClick={() => { setShowScheduledList(true); fetchScheduledMessages(); }}
                  className={`flex-1 py-2 rounded-[12px] text-[13px] font-black transition-all flex items-center justify-center gap-1.5 ${showScheduledList ? "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(139,92,246,0.3)]" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  Запланировано
                  {scheduledMessages.length > 0 && (
                    <span className={`text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center ${showScheduledList ? "bg-white/20" : "bg-primary text-primary-foreground"}`}>
                      {scheduledMessages.length}
                    </span>
                  )}
                </button>
              </div>

              {!showScheduledList ? (
                <div className="px-5 pb-5">
                  {/* Quick presets */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: "30 мин", action: () => applyTimePreset(30 * 60_000) },
                      { label: "1 час",  action: () => applyTimePreset(60 * 60_000) },
                      { label: "3 часа", action: () => applyTimePreset(3 * 60 * 60_000) },
                      { label: "Завтра 8:00",  action: () => applyAbsolutePreset(8) },
                      { label: "Завтра 12:00", action: () => applyAbsolutePreset(12) },
                      { label: "Завтра 18:00", action: () => applyAbsolutePreset(18) },
                    ].map(p => (
                      <button
                        key={p.label}
                        onClick={p.action}
                        className="py-2 px-3 rounded-[12px] bg-secondary hover:bg-primary/10 hover:text-primary text-[12px] font-bold transition-all border border-transparent hover:border-primary/20"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Manual picker */}
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    min={minDatetime}
                    onChange={e => setScheduledAt(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-[14px] px-4 py-3 text-[14px] font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all mb-3"
                  />

                  {scheduledAt && (
                    <p className="text-[12px] text-primary font-bold mb-3 flex items-center gap-1.5">
                      <Hourglass size={12} />
                      Отправка: {formatScheduledAt(scheduledAt)}
                    </p>
                  )}

                  <button
                    onClick={handleScheduledSend}
                    disabled={!text.trim() || !scheduledAt}
                    className="w-full py-3.5 bg-primary text-primary-foreground rounded-[14px] text-[14px] font-black disabled:opacity-40 transition-all hover:bg-primary/90 shadow-[0_4px_14px_rgba(234,88,12,0.3)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                  >
                    <CalendarClock size={16} />
                    {scheduledAt ? `Запланировать на ${formatScheduledAt(scheduledAt)}` : "Выберите время"}
                  </button>
                </div>
              ) : (
                <div className="px-5 pb-5">
                  {loadingScheduled ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                        <Clock size={20} />
                      </motion.div>
                    </div>
                  ) : scheduledMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                      <CalendarClock size={32} className="text-muted-foreground/40" />
                      <p className="text-[13px] font-bold text-muted-foreground">Нет запланированных сообщений</p>
                      <p className="text-[11px] text-muted-foreground/60">Перейдите на вкладку «Выбрать время»</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-none">
                      {scheduledMessages.map(msg => (
                        <motion.div
                          key={msg.id}
                          layout
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          className="flex items-start gap-3 bg-secondary rounded-[14px] p-3"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Clock size={13} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-foreground truncate">{msg.text}</p>
                            <p className="text-[11px] font-bold text-primary/70 mt-0.5">{formatScheduledAt(msg.scheduled_at)}</p>
                          </div>
                          <button
                            onClick={() => handleCancelScheduled(msg.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-destructive/15 hover:text-destructive text-muted-foreground transition-colors shrink-0"
                            title="Отменить"
                          >
                            <X size={14} />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showEmoji && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full mb-3 left-0 w-[340px] z-50 bg-card border border-border rounded-[24px] shadow-2xl overflow-hidden origin-bottom-left"
            >
              {/* Category/Sticker tab bar */}
              <div className="flex items-center gap-0.5 px-2 py-2 bg-secondary/50 border-b border-border overflow-x-auto scrollbar-none">
                {EMOJI_CATEGORIES.map((cat, i) => (
                  <button
                    key={i}
                    onClick={() => setEmojiCategory(i)}
                    title={cat.label}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${emojiCategory === i ? "bg-background shadow-sm border border-border scale-110" : "hover:bg-background/50"}`}
                  >
                    <img
                      src={emojiToTwemojiUrl(cat.icon)}
                      alt={cat.label}
                      width={20}
                      height={20}
                      draggable={false}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; e.currentTarget.insertAdjacentText("afterend", cat.icon); }}
                    />
                  </button>
                ))}
                {/* Sticker tab — coming soon */}
                <button
                  onClick={() => setEmojiCategory(STICKERS_TAB)}
                  title="Стикеры (скоро)"
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ml-0.5 relative ${emojiCategory === STICKERS_TAB ? "bg-background shadow-sm border border-border scale-110 text-muted-foreground" : "hover:bg-background/50 text-muted-foreground/50"}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/><circle cx="10" cy="13" r="1"/><circle cx="14" cy="13" r="1"/><path d="M10 17c.67.67 3.33.67 4 0"/>
                  </svg>
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M12 2v20M2 12h20" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>
                  </span>
                </button>
                <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 shrink-0 pr-1">
                  {emojiCategory === STICKERS_TAB ? "Скоро" : EMOJI_CATEGORIES[emojiCategory].label}
                </span>
              </div>

              {emojiCategory === STICKERS_TAB ? (
                /* Sticker panel — coming soon */
                <div className="p-6 flex flex-col items-center justify-center gap-3 min-h-[180px] text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                      <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/><circle cx="10" cy="13" r="1"/><circle cx="14" cy="13" r="1"/><path d="M10 17c.67.67 3.33.67 4 0"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[15px] font-black text-foreground">Стикеры появятся скоро</p>
                    <p className="text-[12px] text-muted-foreground mt-1 max-w-[220px] leading-relaxed">
                      Мы готовим уникальный пак стикеров Nova — следите за обновлениями!
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider">В разработке</span>
                  </div>
                </div>
              ) : (
                /* Emoji grid */
                <div className="p-3 grid grid-cols-8 gap-0.5 max-h-[240px] overflow-y-auto scrollbar-none">
                  {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji, i) => (
                    <button key={i} onClick={() => insertEmoji(emoji)}
                      className="hover:bg-secondary rounded-xl p-1.5 transition-colors flex items-center justify-center hover:scale-110 active:scale-95">
                      <img
                        src={emojiToTwemojiUrl(emoji)}
                        alt={emoji}
                        width={22}
                        height={22}
                        draggable={false}
                        onError={e => {
                          const el = e.currentTarget as HTMLImageElement;
                          el.style.display = "none";
                          el.insertAdjacentHTML("afterend", `<span style="font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif;font-size:20px;line-height:1">${emoji}</span>`);
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
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
              className="mb-2 flex items-center gap-3 bg-violet-500/10 backdrop-blur-md border border-violet-500/20 rounded-[20px] px-4 py-3"
            >
              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                <Pencil size={16} className="text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wider text-violet-400 mb-0.5">Редактирование</p>
                <p className="text-[13px] font-medium text-foreground truncate">{editMessage.text}</p>
              </div>
              <button onClick={onCancelEdit} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPollCreator && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="mb-3 bg-card border border-primary/20 rounded-[20px] overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 size={18} className="text-primary" />
                  <span className="text-[13px] font-black text-foreground uppercase tracking-wider">Новый опрос</span>
                </div>
                <button onClick={() => setShowPollCreator(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Вопрос</label>
                  <input
                    type="text"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="О чём спросить?"
                    maxLength={300}
                    autoFocus
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-[14px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Варианты ответа</label>
                  <div className="space-y-2">
                    {pollOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => setPollOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                          placeholder={`Вариант ${i + 1}`}
                          maxLength={100}
                          className="flex-1 bg-secondary/50 border border-border rounded-xl px-3 py-2 text-[13px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                        {pollOptions.length > 2 && (
                          <button onClick={() => setPollOptions(prev => prev.filter((_, j) => j !== i))}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                            <Minus size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    {pollOptions.length < 10 && (
                      <button
                        onClick={() => setPollOptions(prev => [...prev, ""])}
                        className="flex items-center gap-1.5 text-[12px] font-bold text-primary hover:text-primary/80 transition-colors py-1 px-1"
                      >
                        <Plus size={14} /> Добавить вариант
                      </button>
                    )}
                  </div>
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pollAllowMultiple}
                    onChange={(e) => setPollAllowMultiple(e.target.checked)}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-[13px] font-medium text-muted-foreground">Несколько ответов</span>
                </label>
                {pollError && (
                  <p className="text-[12px] font-bold text-destructive">{pollError}</p>
                )}
                <button
                  onClick={handleSendPoll}
                  disabled={pollSending || !pollQuestion.trim()}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-[13px] hover:bg-primary/90 disabled:opacity-50 transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                >
                  {pollSending ? "Создаём..." : "Создать опрос"}
                </button>
              </div>
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
                  <img src={src} alt="" className="h-28 w-28 object-cover block" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  {!isSending && (
                    <button onClick={() => removeImage(idx)} className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-colors opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
                      <X size={14} />
                    </button>
                  )}
                </motion.div>
              ))}
              {!isSending && (
                <button onClick={() => fileInputRef.current?.click()}
                  className="h-28 w-28 rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 flex items-center justify-center text-muted-foreground hover:text-primary transition-all shrink-0">
                  <Images size={28} />
                </button>
              )}
            </motion.div>
          )}
          {docPreviews.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="mb-3 flex flex-col gap-2"
            >
              {docPreviews.map((doc, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 bg-secondary/60 border border-border rounded-2xl px-3 py-2.5 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
                    <DocIcon mime={doc.mime} name={doc.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate text-foreground">{doc.name}</p>
                    <p className="text-[11px] text-muted-foreground">{formatBytes(doc.size)}</p>
                  </div>
                  <button onClick={() => removeDoc(idx)} disabled={isSending} className="w-7 h-7 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors shrink-0 disabled:opacity-40">
                    <X size={13} />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Upload progress bar */}
          {uploadProgress !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2"
            >
              <div className="flex items-center gap-2 px-1">
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ ease: "linear", duration: 0.2 }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground font-mono tabular-nums shrink-0">{uploadProgress}%</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile action sheet — only visible on small screens */}
        <AnimatePresence>
          {showMobileActions && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: "spring", damping: 28, stiffness: 340 }}
              className="md:hidden mb-2 bg-card border border-border rounded-[22px] shadow-2xl overflow-hidden"
            >
              <div className="grid grid-cols-4 gap-0 divide-x divide-border">
                <button
                  type="button"
                  onClick={() => { fileInputRef.current?.click(); setShowMobileActions(false); }}
                  className="flex flex-col items-center gap-1.5 py-4 px-2 hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground active:bg-secondary"
                >
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/15 flex items-center justify-center">
                    <Paperclip size={19} className="text-blue-400" />
                  </div>
                  <span className="text-[10px] font-bold leading-none">Файл</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPollCreator(v => !v); setPollError(""); setShowMobileActions(false); }}
                  className="flex flex-col items-center gap-1.5 py-4 px-2 hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground active:bg-secondary"
                >
                  <div className="w-10 h-10 rounded-2xl bg-green-500/15 flex items-center justify-center">
                    <BarChart2 size={19} className="text-green-400" />
                  </div>
                  <span className="text-[10px] font-bold leading-none">Опрос</span>
                </button>
                {isPrime ? (
                  <button
                    type="button"
                    onClick={() => { const next = !showScheduler; setShowScheduler(next); if (next) { setShowScheduledList(false); fetchScheduledMessages(); } setShowMobileActions(false); }}
                    className="flex flex-col items-center gap-1.5 py-4 px-2 hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground active:bg-secondary relative"
                  >
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${showScheduler ? "bg-primary/20" : "bg-violet-500/15"}`}>
                      <CalendarClock size={19} className={showScheduler ? "text-primary" : "text-violet-400"} />
                    </div>
                    <span className="text-[10px] font-bold leading-none">План</span>
                    {scheduledMessages.length > 0 && (
                      <span className="absolute top-3 right-3 min-w-[14px] h-3.5 px-0.5 bg-primary text-primary-foreground text-[8px] font-black rounded-full flex items-center justify-center">
                        {scheduledMessages.length}
                      </span>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { startRecording(); setShowMobileActions(false); }}
                    className="flex flex-col items-center gap-1.5 py-4 px-2 hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground active:bg-secondary"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/15 flex items-center justify-center">
                      <Mic size={19} className="text-rose-400" />
                    </div>
                    <span className="text-[10px] font-bold leading-none">Голос</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`p-1.5 bg-card border rounded-[28px] transition-all flex items-center gap-1.5 shadow-sm focus-within:shadow-md focus-within:border-primary/50 ${editMessage ? "border-primary/50 bg-primary/5" : "border-border"}`}>
          
          <AnimatePresence mode="wait">
            {isRecording ? (
              <motion.div
                key="recording"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1 flex items-center gap-3 px-4 h-12"
              >
                <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.2, repeat: Infinity }} className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                <span className="text-[15px] font-bold text-red-500">Запись...</span>
                <div className="flex flex-col items-end ml-auto gap-0.5">
                  <span className="text-[15px] font-black font-mono text-red-400 tracking-wider">{formatDuration(recordSeconds)}</span>
                  {!isPrimePlus && MAX_VOICE_SECONDS < Infinity && (
                    <span className={`text-[10px] font-bold ${recordSeconds >= MAX_VOICE_SECONDS * 0.8 ? "text-red-400" : "text-muted-foreground"}`}>
                      {isPrime ? "макс. 3:00" : "макс. 1:00"}
                    </span>
                  )}
                </div>
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
                className="flex-1 flex items-center gap-1"
              >
                <input ref={fileInputRef} type="file" accept="*/*" multiple onChange={handleFileChange} className="hidden" />
                
                {!editMessage && (
                  <>
                    <button type="button" onClick={() => { setShowEmoji(v => !v); }}
                      className={`w-10 h-10 md:w-10 md:h-10 flex items-center justify-center rounded-full transition-colors shrink-0 ${showEmoji ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                      <Smile size={20} strokeWidth={1.75} />
                    </button>
                  </>
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
                  className="flex-1 bg-transparent border-none resize-none max-h-36 min-h-[44px] py-3 px-2 focus:outline-none text-[15px] font-medium placeholder:text-muted-foreground/60 leading-normal overflow-hidden"
                  rows={1}
                  style={{ height: "44px" }}
                  onFocus={() => { setShowEmoji(false); }}
                />

                {!editMessage && !text.trim() && imagePreviews.length === 0 && (
                  <>
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="hidden md:flex w-12 h-12 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0 mb-[2px]">
                      <Paperclip size={20} />
                    </button>
                    <button type="button" onClick={() => { setShowPollCreator(v => !v); setPollError(""); }}
                      className={`hidden md:flex w-12 h-12 items-center justify-center rounded-full transition-colors shrink-0 mb-[2px] ${showPollCreator ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                      <BarChart2 size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMobileActions(v => !v)}
                      className={`flex md:hidden w-10 h-10 items-center justify-center rounded-full transition-all shrink-0 mb-[2px] ${showMobileActions ? "bg-primary/15 text-primary rotate-45" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                    >
                      <Plus size={18} />
                    </button>
                  </>
                )}

                {hasContent && !editMessage && isPrime && (
                  <div className="relative shrink-0 mb-[2px] hidden md:block">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !showScheduler;
                        setShowScheduler(next);
                        if (next) { setShowScheduledList(false); fetchScheduledMessages(); }
                      }}
                      className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors ${showScheduler ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                      title="Запланировать отправку (Prime)"
                    >
                      <CalendarClock size={20} />
                    </button>
                    {scheduledMessages.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-primary text-primary-foreground text-[10px] font-black rounded-full flex items-center justify-center leading-none pointer-events-none">
                        {scheduledMessages.length}
                      </span>
                    )}
                  </div>
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
                  className="w-12 h-12 flex items-center justify-center bg-primary text-primary-foreground rounded-[20px] hover:bg-primary/90 transition-all disabled:opacity-50 shadow-[0_4px_14px_rgba(234,88,12,0.3)] hover:scale-105 active:scale-95"
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