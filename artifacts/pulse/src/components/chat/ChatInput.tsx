import React, { useState, useRef, useEffect, memo } from "react";
import { emojiToTwemojiUrl } from "@/lib/twemoji";
import { useSendMessage, useGetMe, getGetMessagesQueryKey, getGetChatsQueryKey, Message } from "@workspace/api-client-react";
import type { P2PChannel } from "@/hooks/useP2PChannel";
import { useQueryClient } from "@tanstack/react-query";
import { Paperclip, Mic, SendHorizontal, X, Square, Trash2, Images, Reply, Pencil, Clock, BarChart2, Plus, Minus, Wand2, CalendarClock, Hourglass, Sticker } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MemeGifPicker } from "./MemeGifPicker";

const STICKERS = [
  { id: "sticker-01", url: "/stickers/sticker-01.svg", label: "Счастье" },
  { id: "sticker-02", url: "/stickers/sticker-02.svg", label: "Радость" },
  { id: "sticker-03", url: "/stickers/sticker-03.svg", label: "Крутой" },
  { id: "sticker-04", url: "/stickers/sticker-04.svg", label: "Мило" },
  { id: "sticker-05", url: "/stickers/sticker-05.svg", label: "Огонь" },
  { id: "sticker-06", url: "/stickers/sticker-06.svg", label: "Праздник" },
  { id: "sticker-07", url: "/stickers/sticker-07.svg", label: "Злюка" },
  { id: "sticker-08", url: "/stickers/sticker-08.svg", label: "Вечеринка" },
  { id: "sticker-09", url: "/stickers/sticker-09.svg", label: "Задумался" },
  { id: "sticker-10", url: "/stickers/sticker-10.svg", label: "Звёздочки" },
  { id: "sticker-11", url: "/stickers/sticker-11.svg", label: "Гордость" },
  { id: "sticker-12", url: "/stickers/sticker-12.svg", label: "Сон" },
];

function makePrimeSVG(emoji: string, from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${from}"/><stop offset="100%" style="stop-color:${to}"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(#g)"/><text x="50" y="68" font-size="52" text-anchor="middle" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${emoji}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const PRIME_STICKERS = [
  { id: "prime-01", url: makePrimeSVG("💎", "#7c3aed", "#06b6d4"), label: "Бриллиант" },
  { id: "prime-02", url: makePrimeSVG("👑", "#f59e0b", "#ef4444"), label: "Корона" },
  { id: "prime-03", url: makePrimeSVG("🌟", "#a855f7", "#ec4899"), label: "Звезда" },
  { id: "prime-04", url: makePrimeSVG("🔥", "#ef4444", "#f97316"), label: "Огонь" },
  { id: "prime-05", url: makePrimeSVG("🦋", "#3b82f6", "#06b6d4"), label: "Бабочка" },
  { id: "prime-06", url: makePrimeSVG("🌈", "#22c55e", "#3b82f6"), label: "Радуга" },
  { id: "prime-07", url: makePrimeSVG("🎯", "#ec4899", "#8b5cf6"), label: "Цель" },
  { id: "prime-08", url: makePrimeSVG("🚀", "#7c3aed", "#ec4899"), label: "Ракета" },
  { id: "prime-09", url: makePrimeSVG("🌙", "#1e40af", "#7c3aed"), label: "Луна" },
  { id: "prime-10", url: makePrimeSVG("⚡", "#f59e0b", "#ef4444"), label: "Молния" },
  { id: "prime-11", url: makePrimeSVG("🦄", "#ec4899", "#8b5cf6"), label: "Единорог" },
  { id: "prime-12", url: makePrimeSVG("🌺", "#ef4444", "#f97316"), label: "Цветок" },
  { id: "prime-13", url: makePrimeSVG("🐉", "#7c3aed", "#ef4444"), label: "Дракон" },
  { id: "prime-14", url: makePrimeSVG("🎸", "#1e40af", "#06b6d4"), label: "Гитара" },
  { id: "prime-15", url: makePrimeSVG("🏆", "#f59e0b", "#22c55e"), label: "Трофей" },
  { id: "prime-16", url: makePrimeSVG("🎪", "#ec4899", "#f97316"), label: "Шоу" },
];

const EMOJI_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  { label: "Смайлы", icon: "😀", emojis: ["😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","🥰","😘","🥲","😗","😙","🥺","😚","🙂","🤗","🤭","🤫","🤔","🤐","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","😕","☹️","😟","😧","😮","😲","😳","🥸","😢","😭","😤","😠","😡","🤬","💀","👻","👽","🤖","💩","😈","👹","👺","🤡","💫","💥","❗","❓","‼️"] },
  { label: "Жесты", icon: "👋", emojis: ["👋","🤚","🖐","✋","🖖","👌","🤌","🤏","✌","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🫀","🫁","🧠","🦷","🦴","👀","👁","👅","👄","💋","🧑","👶","🧒","👦","👧","🧑","👱","🧔","👩","👴","👵","🧓","👮","💂","🕵","👷","🫅","👸","🤴","🧙","🧝","🧛","🧟","🧞","🧜","🧚","🤶","🎅","🧑‍⚕️","🧑‍🏫","🧑‍🍳","🧑‍🔧","🧑‍🎤","🧑‍💻","🧑‍🚀"] },
  { label: "Сердца", icon: "❤️", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","❤️‍🔥","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","✡️","🕉","☯️","🆗","🆙","🆒","🆕","🆓","🉐","🉑","💯","🔝","🔛","🔜","🔚","⭕","🚫","💢","♨️","🚷","📵","🔞","❌","⭕","🛑","⛔","📛","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🟤","💫","⭐","🌟","✨","🌠","🔥","💥","☀️","🌤","⛅","🌈","☁️","❄️","⛄","🌊","💧","🌀"] },
  { label: "Животные", icon: "🐶", emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🕷","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮","🐈","🐓","🦃","🦚","🦜","🦢","🕊","🐇","🦝","🦨","🦡","🦦","🦥","🐁","🐀","🐿","🦔","🐾","🐉","🐲"] },
  { label: "Еда", icon: "🍎", emojis: ["🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶","🧄","🧅","🥔","🍠","🥐","🥖","🍞","🥨","🧀","🥚","🍳","🥞","🧇","🥓","🍗","🍖","🌮","🌯","🥙","🧆","🍣","🍱","🍤","🍙","🍚","🍛","🍜","🍝","🍲","🥘","🍛","🥗","🧂","🧈","🍿","🧂","🥫","🍱","🍘","🍥","🥮","🍢","🍡","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍩","🍪","🌰","🥜","🍯","🧃","🥤","🍵","☕","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧉","🍾","🥛","🧋"] },
  { label: "Путешествия", icon: "✈️", emojis: ["✈️","🚀","🛸","🚁","🛶","⛵","🚤","🛥","🛳","⛴","🚢","🚂","🚃","🚄","🚅","🚆","🚇","🚊","🚝","🚞","🚋","🚌","🚍","🚎","🚐","🚑","🚒","🚓","🚕","🚗","🚙","🛻","🚚","🚛","🚜","🏎","🏍","🛵","🚲","🛴","🛹","🚏","⛽","🚨","🚥","🚦","🛑","🚧","⚓","🛤","🗺","🧭","🌍","🌎","🌏","🗻","🌋","🏔","⛰","🏕","🏖","🏜","🏝","🏛","🏗","🏘","🏚","🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","🏯","🏰","💒","🗼","🗽","⛩","🕌","🛕","⛪","🕍","🗿","🗺","🧳","🌐","🎡","🎢","🎠","⛲","🎑"] },
  { label: "Предметы", icon: "💻", emojis: ["💻","🖥","🖨","⌨️","🖱","📱","☎️","📞","📟","📠","📺","📷","📸","📹","🎥","📻","🎙","🎚","🎛","⏱","⏲","⏰","🕰","⌛","⏳","📡","🔋","🔌","💡","🔦","🕯","🧯","💸","💵","💴","💶","💷","💰","💳","🪙","💎","🔑","🗝","🔐","🔏","🔓","🔒","🔧","🔩","⚙️","🔨","⛏","🪤","🔫","⚔️","🛡","🔪","🏹","🧲","🔮","🪄","💊","💉","🩹","🩺","🔭","🔬","🩻","🧰","🪜","🧱","🛋","🚪","🪑","🚿","🛁","🛏","🧸","🖼","🧶","🧵","👓","🕶","🌂","🧳","🎒","💼","👜","👝","🎓","⛑","🪖","🎩","👒","🧢","👑","💍","💄","💅","👠","👡","👢","👟","🥾","🧦","🧤","🧣","🧥","👗","👘","👙","👚","👛","🩱","🩲","🩳","👔","👕","👖","🧲","🪞","🛒"] },
  { label: "Флаги", icon: "🚩", emojis: ["🏳","🏴","🚩","🎌","🏁","🏳️‍🌈","🇦🇨","🇦🇩","🇦🇪","🇦🇫","🇦🇬","🇦🇮","🇦🇱","🇦🇲","🇦🇴","🇦🇶","🇦🇷","🇦🇸","🇦🇹","🇦🇺","🇦🇼","🇦🇽","🇦🇿","🇧🇦","🇧🇧","🇧🇩","🇧🇪","🇧🇫","🇧🇬","🇧🇭","🇧🇮","🇧🇯","🇧🇱","🇧🇲","🇧🇳","🇧🇴","🇧🇷","🇧🇸","🇧🇹","🇧🇼","🇧🇾","🇧🇿","🇨🇦","🇨🇩","🇨🇫","🇨🇬","🇨🇭","🇨🇮","🇨🇰","🇨🇱","🇨🇲","🇨🇳","🇨🇴","🇨🇷","🇨🇺","🇨🇻","🇨🇼","🇨🇾","🇨🇿","🇩🇪","🇩🇯","🇩🇰","🇩🇲","🇩🇴","🇩🇿","🇪🇦","🇪🇨","🇪🇪","🇪🇬","🇪🇭","🇪🇷","🇪🇸","🇪🇹","🇫🇮","🇫🇯","🇫🇰","🇫🇲","🇫🇴","🇫🇷","🇬🇦","🇬🇧","🇬🇩","🇬🇪","🇬🇫","🇬🇬","🇬🇭","🇬🇮","🇬🇱","🇬🇲","🇬🇳","🇬🇵","🇬🇶","🇬🇷","🇬🇸","🇬🇹","🇬🇺","🇬🇼","🇬🇾","🇭🇰","🇭🇳","🇭🇷","🇭🇹","🇭🇺","🇮🇩","🇮🇪","🇮🇱","🇮🇲","🇮🇳","🇮🇴","🇮🇶","🇮🇷","🇮🇸","🇮🇹","🇯🇪","🇯🇲","🇯🇴","🇯🇵","🇰🇪","🇰🇬","🇰🇭","🇰🇮","🇰🇲","🇰🇳","🇰🇵","🇰🇷","🇰🇼","🇰🇾","🇰🇿","🇱🇦","🇱🇧","🇱🇨","🇱🇮","🇱🇰","🇱🇷","🇱🇸","🇱🇹","🇱🇺","🇱🇻","🇱🇾","🇲🇦","🇲🇨","🇲🇩","🇲🇪","🇲🇫","🇲🇬","🇲🇭","🇲🇰","🇲🇱","🇲🇲","🇲🇳","🇲🇴","🇲🇵","🇲🇶","🇲🇷","🇲🇸","🇲🇹","🇲🇺","🇲🇻","🇲🇼","🇲🇽","🇲🇾","🇲🇿","🇳🇦","🇳🇨","🇳🇪","🇳🇫","🇳🇬","🇳🇮","🇳🇱","🇳🇴","🇳🇵","🇳🇷","🇳🇺","🇳🇿","🇴🇲","🇵🇦","🇵🇪","🇵🇫","🇵🇬","🇵🇭","🇵🇰","🇵🇱","🇵🇲","🇵🇳","🇵🇷","🇵🇸","🇵🇹","🇵🇼","🇵🇾","🇶🇦","🇷🇪","🇷🇴","🇷🇸","🇷🇺","🇷🇼","🇸🇦","🇸🇧","🇸🇨","🇸🇩","🇸🇪","🇸🇬","🇸🇭","🇸🇮","🇸🇰","🇸🇱","🇸🇲","🇸🇳","🇸🇴","🇸🇷","🇸🇸","🇸🇹","🇸🇻","🇸🇽","🇸🇾","🇸🇿","🇹🇨","🇹🇩","🇹🇫","🇹🇬","🇹🇭","🇹🇯","🇹🇰","🇹🇱","🇹🇲","🇹🇳","🇹🇴","🇹🇷","🇹🇹","🇹🇻","🇹🇼","🇹🇿","🇺🇦","🇺🇬","🇺🇸","🇺🇾","🇺🇿","🇻🇦","🇻🇨","🇻🇪","🇻🇬","🇻🇮","🇻🇳","🇻🇺","🇼🇫","🇼🇸","🇽🇰","🇾🇪","🇾🇹","🇿🇦","🇿🇲","🇿🇼"] },
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
      if (!ctx) { resolve(url); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); readFileAsDataUrl(file).then(resolve).catch(reject); };
    img.src = url;
  });
}

const BOT_COMMANDS = [
  { command: "/start", description: "Запустить бота" },
  { command: "/help", description: "Получить справку" },
];

const GENERAL_COMMANDS = [
  { command: "/memer", description: "Отправить GIF-мем 🎭" },
];

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

  const [text, setText] = useState("");
  const STICKERS_TAB = -1;
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [showScheduledList, setShowScheduledList] = useState(false);
  const [loadingScheduled, setLoadingScheduled] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [pollSending, setPollSending] = useState(false);
  const [pollError, setPollError] = useState("");
  const [stickerTab, setStickerTab] = useState<"regular" | "prime">("regular");
  const [selectedEffect, setSelectedEffect] = useState<string | null>(null);
  const [showEffectPicker, setShowEffectPicker] = useState(false);
  const [showMemeGifPicker, setShowMemeGifPicker] = useState(false);

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
          textareaRef.current.style.height = "44px";
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + "px";
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const results = await Promise.all(files.map(f => compressImage(f)));
    setImagePreviews(prev => [...prev, ...results]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    sendTypingEvent("photo");
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

    if (text.trim() === "/memer") {
      setText("");
      if (textareaRef.current) textareaRef.current.style.height = "44px";
      setShowMemeGifPicker(true);
      setIsSending(false);
      return;
    }
    if (!text.trim() && imagePreviews.length === 0 && !audioBlob) return;
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
        if (imagePreviews.length >= 2) {
          const token = sessionStorage.getItem("pulse-token");
          const hdrs: Record<string, string> = { "Content-Type": "application/json" };
          if (token) hdrs["Authorization"] = `Bearer ${token}`;
          const res = await fetch("/api/messages", {
            method: "POST",
            headers: hdrs,
            body: JSON.stringify({
              chatId,
              type: "album",
              mediaUrl: imagePreviews[0],
              text: JSON.stringify({ urls: imagePreviews, caption: text.trim() }),
              replyToId: replyTo?.id,
            }),
          });
          if (res.ok) { const m = await res.json(); if (m?.id) p2p?.send(m); }
        } else {
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
        }
        setImagePreviews([]);
        setText("");
      } else {
        const textToSend = text.trim();
        const capturedReplyTo = replyTo;

        // Clear input immediately for instant feel
        setText("");
        if (textareaRef.current) textareaRef.current.style.height = "44px";

        if (selectedEffect) {
          const token = sessionStorage.getItem("pulse-token");
          const hdrs: Record<string, string> = { "Content-Type": "application/json" };
          if (token) hdrs["Authorization"] = `Bearer ${token}`;
          const res = await fetch("/api/messages", {
            method: "POST",
            headers: hdrs,
            body: JSON.stringify({ chatId, text: textToSend, type: "text", replyToId: capturedReplyTo?.id, effect: selectedEffect }),
          });
          if (res.ok) { const m = await res.json(); if (m?.id) p2p?.send(m); }
          setSelectedEffect(null);
        } else {
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
    } finally { setIsSending(false); }
  };

  const MAX_VOICE_SECONDS = isPrimePlus ? Infinity : isPrime ? 180 : 60;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 });
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

  const sendGif = async (gifUrl: string) => {
    setText("");
    setShowMemeGifPicker(false);
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
    textareaRef.current?.focus();
  };

  const sendSticker = async (sticker: { url: string }) => {
    setShowEmoji(false);
    setIsSending(true);
    try {
      await sendMessage.mutateAsync({
        data: { chatId, type: "sticker", mediaUrl: sticker.url, text: "" }
      });
      queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId }) });
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
      onMessageSent?.();
    } finally {
      setIsSending(false);
    }
  };

  const showCommandMenu = isBot && !editMessage && text.startsWith("/") && text.length > 0;
  const filteredCommands = BOT_COMMANDS.filter(c =>
    c.command.startsWith(text.split(" ")[0].toLowerCase())
  );
  const showGeneralCommandMenu = !isBot && !editMessage && text.startsWith("/") && text.length > 0 && !showMemeGifPicker;
  const filteredGeneralCommands = GENERAL_COMMANDS.filter(c =>
    c.command.startsWith(text.split(" ")[0].toLowerCase())
  );

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    e.target.style.height = "44px";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
    if (val.trim()) sendTypingEvent("text");
    if (!editMessage) localStorage.setItem(draftKey, val);
    if (val === "/memer") {
      setShowMemeGifPicker(true);
    } else if (showMemeGifPicker) {
      setShowMemeGifPicker(false);
    }
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

  const hasContent = text.trim().length > 0 || imagePreviews.length > 0 || audioBlob;

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

  return (
    <div className="relative px-4 md:px-6 z-30" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}>
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
                    className="w-full py-3.5 bg-primary text-primary-foreground rounded-[14px] text-[14px] font-black disabled:opacity-40 transition-all hover:bg-primary/90 shadow-[0_4px_14px_rgba(139,92,246,0.3)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
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
          {showMemeGifPicker && (
            <MemeGifPicker
              onSelect={sendGif}
              onClose={() => { setShowMemeGifPicker(false); setText(""); }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showGeneralCommandMenu && filteredGeneralCommands.length > 0 && !showMemeGifPicker && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className="absolute bottom-full mb-2 left-0 right-0 z-50 bg-card border border-border rounded-[20px] shadow-2xl overflow-hidden"
            >
              <div className="px-4 py-2 border-b border-border">
                <span className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">Команды</span>
              </div>
              {filteredGeneralCommands.map((cmd) => (
                <button
                  key={cmd.command}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (cmd.command === "/memer") {
                      setText("");
                      setShowMemeGifPicker(true);
                    } else {
                      setText(cmd.command + " ");
                    }
                    textareaRef.current?.focus();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
                >
                  <span className="text-[15px] font-black text-primary">{cmd.command}</span>
                  <span className="text-[13px] text-muted-foreground">{cmd.description}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCommandMenu && filteredCommands.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className="absolute bottom-full mb-2 left-0 right-0 z-50 bg-card border border-border rounded-[20px] shadow-2xl overflow-hidden"
            >
              <div className="px-4 py-2 border-b border-border">
                <span className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">Команды бота</span>
              </div>
              {filteredCommands.map((cmd) => (
                <button
                  key={cmd.command}
                  onMouseDown={(e) => { e.preventDefault(); setText(cmd.command + " "); textareaRef.current?.focus(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
                >
                  <span className="text-[15px] font-black text-primary">{cmd.command}</span>
                  <span className="text-[13px] text-muted-foreground">{cmd.description}</span>
                </button>
              ))}
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
                {/* Sticker tab */}
                <button
                  onClick={() => setEmojiCategory(STICKERS_TAB)}
                  title="Стикеры"
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ml-0.5 ${emojiCategory === STICKERS_TAB ? "bg-background shadow-sm border border-border scale-110 text-primary" : "hover:bg-background/50 text-muted-foreground"}`}
                >
                  <Sticker size={18} />
                </button>
                <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 shrink-0 pr-1">
                  {emojiCategory === STICKERS_TAB ? "Стикеры" : EMOJI_CATEGORIES[emojiCategory].label}
                </span>
              </div>

              {emojiCategory === STICKERS_TAB ? (
                /* Sticker panel */
                <div>
                  {isPrimePlus && (
                    <div className="flex gap-1 px-3 pt-2">
                      <button
                        onClick={() => setStickerTab("regular")}
                        className={`flex-1 py-1.5 rounded-[10px] text-[12px] font-black transition-all ${stickerTab === "regular" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        Стикеры
                      </button>
                      <button
                        onClick={() => setStickerTab("prime")}
                        className={`flex-1 py-1.5 rounded-[10px] text-[12px] font-black transition-all flex items-center justify-center gap-1 ${stickerTab === "prime" ? "bg-purple-500/20 text-purple-400" : "text-muted-foreground hover:text-purple-400"}`}
                      >
                        <span className="text-[11px]">👑</span> Prime+
                      </button>
                    </div>
                  )}
                  <div className="p-3 grid grid-cols-4 gap-2 max-h-[240px] landscape:max-h-[120px] overflow-y-auto scrollbar-none">
                    {(stickerTab === "prime" && isPrimePlus ? PRIME_STICKERS : STICKERS).map(s => (
                      <button
                        key={s.id}
                        onClick={() => sendSticker(s)}
                        title={s.label}
                        className={`aspect-square rounded-xl transition-all hover:scale-110 active:scale-95 p-1 flex items-center justify-center ${stickerTab === "prime" ? "hover:bg-purple-500/10 ring-1 ring-purple-500/20" : "hover:bg-secondary"}`}
                      >
                        <img src={s.url} alt={s.label} className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Emoji grid — rendered as native <span> for correct flag & all emoji support */
                <div className="p-3 grid grid-cols-8 gap-0.5 max-h-[240px] landscape:max-h-[120px] overflow-y-auto scrollbar-none">
                  {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji, i) => (
                    <button key={i} onClick={() => insertEmoji(emoji)}
                      className="hover:bg-secondary rounded-xl p-1.5 transition-colors flex items-center justify-center hover:scale-110 active:scale-95">
                      <span
                        style={{ fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif', fontSize: '20px', lineHeight: 1, userSelect: 'none' }}
                        aria-label={emoji}
                      >
                        {emoji}
                      </span>
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

        <div className={`p-1.5 bg-card border rounded-[28px] transition-all flex items-end gap-1.5 shadow-sm focus-within:shadow-md focus-within:border-primary/50 ${editMessage ? "border-primary/50 bg-primary/5" : "border-border"}`}>
          
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
                className="flex-1 flex items-end gap-1"
              >
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                
                {!editMessage && (
                  <>
                    <button type="button" onClick={() => { setShowEmoji(v => !v); }}
                      className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors shrink-0 mb-[2px] ${showEmoji ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                      <span className="text-xl leading-none">😀</span>
                    </button>
                    {isPrimePlus && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowEffectPicker(v => !v)}
                          className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors shrink-0 mb-[2px] ${showEffectPicker || selectedEffect ? "bg-purple-500/20 text-purple-400" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                          title="Эффект отправки"
                        >
                          <Wand2 size={20} />
                        </button>
                        <AnimatePresence>
                          {showEffectPicker && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: 8 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: 8 }}
                              className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-card border border-border rounded-2xl p-2 shadow-xl z-50 flex gap-1.5"
                            >
                              {[
                                { id: null, label: "Нет", icon: "✖" },
                                { id: "confetti", label: "Конфетти", icon: "🎊" },
                                { id: "snow", label: "Снег", icon: "❄️" },
                                { id: "fire", label: "Огонь", icon: "🔥" },
                              ].map(eff => (
                                <button
                                  key={String(eff.id)}
                                  type="button"
                                  onClick={() => { setSelectedEffect(eff.id); setShowEffectPicker(false); }}
                                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all text-center ${
                                    selectedEffect === eff.id
                                      ? "bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/40"
                                      : "hover:bg-secondary text-foreground"
                                  }`}
                                >
                                  <span className="text-lg leading-none">{eff.icon}</span>
                                  <span className="text-[10px] font-bold leading-none">{eff.label}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
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
                      className="w-12 h-12 flex items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0 mb-[2px]">
                      <Paperclip size={20} />
                    </button>
                    <button type="button" onClick={() => { setShowPollCreator(v => !v); setPollError(""); }}
                      className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors shrink-0 mb-[2px] ${showPollCreator ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                      <BarChart2 size={20} />
                    </button>
                  </>
                )}

                {hasContent && !editMessage && isPrime && (
                  <div className="relative shrink-0 mb-[2px]">
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
                  className="w-12 h-12 flex items-center justify-center bg-primary text-primary-foreground rounded-[20px] hover:bg-primary/90 transition-all disabled:opacity-50 shadow-[0_4px_14px_rgba(139,92,246,0.3)] hover:scale-105 active:scale-95"
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