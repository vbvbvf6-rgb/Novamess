import React, { useState, useEffect, useCallback, useRef } from "react";
import { useGetGiftCatalog, useGetSentGifts, useGetReceivedGifts, useGetMe, GiftItem, Gift } from "@workspace/api-client-react";
import { Zap, ArrowUpRight, ArrowDownLeft, Gift as GiftIcon, Search, AlertTriangle, X, UserRound, MessageSquare, EyeOff, Crown, Lock, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

const RARITY_BG: Record<string, string> = {
  cosmic:    "bg-violet-500/20 border-violet-400/15",
  legendary: "bg-amber-500/20 border-amber-400/15",
  epic:      "bg-purple-500/20 border-purple-400/15",
  rare:      "bg-blue-500/20 border-blue-400/15",
  common:    "bg-slate-500/15 border-white/5",
};

const RARITY_CONFIG: Record<string, {
  cardBg: string; border: string; glow: string;
  badge: string; label: string; shimmer: string; textColor: string;
}> = {
  cosmic: {
    cardBg: "from-violet-500/25 via-fuchsia-400/15 to-pink-500/25",
    border: "border-violet-400/50",
    glow: "shadow-[0_4px_28px_rgba(139,92,246,0.55)]",
    badge: "bg-violet-500/30 text-violet-200 border-violet-400/50",
    label: "COSMIC", shimmer: "rgba(167,139,250,0.25)", textColor: "text-violet-200",
  },
  legendary: {
    cardBg: "from-amber-500/25 via-yellow-400/15 to-orange-400/20",
    border: "border-amber-400/50",
    glow: "shadow-[0_4px_24px_rgba(245,158,11,0.5)]",
    badge: "bg-amber-500/30 text-amber-200 border-amber-400/50",
    label: "LEGENDARY", shimmer: "rgba(251,191,36,0.25)", textColor: "text-amber-200",
  },
  epic: {
    cardBg: "from-purple-500/25 via-violet-400/15 to-indigo-500/20",
    border: "border-purple-400/40",
    glow: "shadow-[0_4px_18px_rgba(147,51,234,0.45)]",
    badge: "bg-purple-500/30 text-purple-200 border-purple-400/50",
    label: "EPIC", shimmer: "rgba(192,132,252,0.25)", textColor: "text-purple-200",
  },
  rare: {
    cardBg: "from-blue-500/20 via-sky-400/12 to-cyan-500/18",
    border: "border-blue-400/35",
    glow: "shadow-[0_4px_14px_rgba(59,130,246,0.4)]",
    badge: "bg-blue-500/30 text-blue-200 border-blue-400/40",
    label: "RARE", shimmer: "rgba(96,165,250,0.2)", textColor: "text-blue-200",
  },
  common: {
    cardBg: "from-slate-500/15 via-slate-400/8 to-slate-500/12",
    border: "border-slate-400/20",
    glow: "shadow-[0_2px_8px_rgba(0,0,0,0.25)]",
    badge: "bg-slate-500/30 text-slate-300 border-slate-400/30",
    label: "COMMON", shimmer: "rgba(148,163,184,0.15)", textColor: "text-slate-300",
  },
};

function getEmojiAnimation(animationType: string) {
  switch (animationType) {
    case "hearts":    return { animate: { scale: [1, 1.2, 0.95, 1.1, 1], rotate: [0, -10, 10, -5, 0] }, transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } };
    case "fireworks": return { animate: { scale: [1, 1.4, 0.88, 1.2, 1], rotate: [0, 18, -18, 10, 0] }, transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" } };
    case "stars":     return { animate: { rotate: [0, 360], scale: [1, 1.15, 1] }, transition: { duration: 2.5, repeat: Infinity, ease: "linear" } };
    case "sparkle":   return { animate: { scale: [1, 1.3, 0.9, 1.2, 1] }, transition: { duration: 1.6, repeat: Infinity } };
    case "confetti":  return { animate: { y: [0, -12, 3, -7, 0], rotate: [0, 12, -12, 6, 0] }, transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" } };
    case "balloons":  return { animate: { y: [0, -16, -4, -12, 0], rotate: [-5, 5, -4, 4, -5] }, transition: { duration: 2.8, repeat: Infinity, ease: "easeInOut" } };
    case "diamonds":  return { animate: { rotate: [0, 22, -22, 10, 0], scale: [1, 1.3, 0.92, 1.18, 1] }, transition: { duration: 2, repeat: Infinity } };
    case "lightning": return { animate: { scale: [1, 1.4, 0.88, 1.22, 1], x: [-2, 2, -2, 1, 0] }, transition: { duration: 0.8, repeat: Infinity, repeatDelay: 1.2 } };
    case "flame":     return { animate: { scale: [1, 1.15, 0.93, 1.1, 1], rotate: [-4, 4, -3, 3, -4], y: [0, -4, 1, -3, 0] }, transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" } };
    case "magic":     return { animate: { rotate: [0, 360], scale: [1, 1.2, 0.95, 1.12, 1] }, transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } };
    case "galaxy":    return { animate: { rotate: [0, 360], scale: [1, 1.06, 0.97, 1.03, 1] }, transition: { duration: 4, repeat: Infinity, ease: "linear" } };
    case "supernova": return { animate: { scale: [1, 1.5, 0.8, 1.3, 0.95, 1] }, transition: { duration: 1.8, repeat: Infinity, repeatDelay: 0.6 } };
    case "vortex":    return { animate: { rotate: [0, 360], scale: [1, 1.1, 0.94, 1.05, 1] }, transition: { duration: 1.4, repeat: Infinity, ease: "linear" } };
    case "bounce":    return { animate: { y: [0, -14, 2, -9, 0], scale: [1, 0.93, 1.07, 0.97, 1] }, transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut" } };
    default:          return { animate: { y: [0, -8, 0], rotate: [0, 4, -4, 0] }, transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } };
  }
}

const GIFT_IMAGE_MAP: Record<string, string> = {
  "Сердечко":       "/gifts/heart.png",
  "Звёздочка":      "/gifts/star-42.png",
  "Цветок сакуры":  "/gifts/sakura.png",
  "Пончик":         "/gifts/donut.png",
  "Котёнок":        "/gifts/kitten.png",
  "Воздушный шар":  "/gifts/balloon.png",
  "Четырёхлистник": "/gifts/clover.png",
  "Пицца":          "/gifts/pizza.png",
  "Торт":           "/gifts/birthday-cake.png",
  "Луна":           "/gifts/moon.png",
  "Корона":         "/gifts/crown.png",
  "Корона Prime":   "/gifts/crown.png",
  "Красная роза":   "/gifts/rose-in-glass.png",
  "Бриллиант":      "/gifts/diamond-heart.png",
  "Волшебство":     "/gifts/magic-crystal.png",
  "Кристалл":       "/gifts/magic-crystal.png",
  "Пульс":          "/gifts/confetti-box.png",
  "Медведь":        "/gifts/teddy-bear.png",
};

function GiftVisual({ name, emoji, animationType, size = 56 }: {
  name: string; emoji: string; animationType: string; size?: number;
}) {
  const imgSrc = GIFT_IMAGE_MAP[name];
  const anim = getEmojiAnimation(animationType);
  if (imgSrc) {
    return (
      <motion.div style={{ width: size, height: size }} className="flex items-center justify-center" {...(anim as any)}>
        <img src={imgSrc} alt={name} style={{ width: size, height: size, objectFit: "contain", filter: `drop-shadow(0 ${Math.round(size*0.06)}px ${Math.round(size*0.18)}px rgba(0,0,0,0.45))` }} draggable={false} />
      </motion.div>
    );
  }
  return (
    <motion.span className="select-none block leading-none" style={{ fontSize: size * 0.82, fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif', filter: `drop-shadow(0 ${Math.round(size*0.06)}px ${Math.round(size*0.15)}px rgba(0,0,0,0.45))`, lineHeight: 1 }} {...(anim as any)}>
      {emoji}
    </motion.span>
  );
}

function GiftCard({ item, onClick, hasPrime }: { item: GiftItem; onClick: () => void; hasPrime: boolean }) {
  const bg = RARITY_BG[item.rarity] || RARITY_BG.common;
  const isPrimeOnly = !!(item as any).primeOnly;
  const isLocked = isPrimeOnly && !hasPrime;

  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1.5 p-3 pt-4 rounded-2xl cursor-pointer border transition-all ${bg}`}
    >
      <div className="w-16 h-16 flex items-center justify-center">
        <GiftVisual name={item.name} emoji={item.emoji} animationType={item.animationType} size={56} />
      </div>
      <p className="text-[11px] font-medium text-center leading-tight text-foreground/85 line-clamp-1 w-full px-0.5">{item.name}</p>
      <div className="flex items-center gap-0.5 text-[11px] text-yellow-400 font-bold">
        <span>⭐</span><span>{item.stars}</span>
      </div>
      {isPrimeOnly && (
        <span className="absolute top-1.5 right-1.5 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-400/30">P</span>
      )}
      {isLocked && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center gap-1">
          <Lock size={16} className="text-amber-400" />
          <span className="text-[9px] font-bold text-amber-400">Prime</span>
        </div>
      )}
    </motion.button>
  );
}

function CelebrationOverlay({ animationType, giftName, emoji, onDone }: { animationType: string; giftName: string; emoji: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, [onDone]);
  const emojiSets: Record<string, string[]> = {
    hearts: ["❤️","💕","💖","💗","💓","🌸","✨"],
    fireworks: ["🎆","🎇","✨","💥","⭐","🌟","🎉"],
    confetti: ["🎊","🎉","🎈","🌟","💛","💜","🧡","🩷"],
    stars: ["⭐","🌟","✨","💫","🌠","⚡"],
    balloons: ["🎈","🎀","🎉","🥳","🎊","✨"],
    sparkle: ["✨","💫","⚡","🌟","💥","🔆"],
    magic: ["✨","🪄","💫","🌟","⭐","🎆"],
  };
  const emojis = emojiSets[animationType] || emojiSets.confetti;
  return (
    <motion.div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {Array.from({ length: 45 }).map((_, i) => (
        <motion.div key={i} className="absolute text-2xl" style={{ top: "50%", left: "50%" }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
          animate={{ x: (Math.random() - 0.5) * window.innerWidth * 1.5, y: (Math.random() - 0.5) * window.innerHeight * 1.5, opacity: [1, 1, 0], scale: [0.5, 1.5 + Math.random(), 0], rotate: Math.random() * 720 - 360 }}
          transition={{ duration: 2 + Math.random() * 1.5, ease: "easeOut" }}>
          {i % 4 === 0 ? emoji : emojis[i % emojis.length]}
        </motion.div>
      ))}
      <motion.div className="text-center z-10" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <div className="bg-black/60 backdrop-blur-xl rounded-3xl p-8 border border-white/10 flex flex-col items-center">
          <div className="mb-4 flex items-center justify-center" style={{ width: 96, height: 96 }}>
            <GiftVisual name={giftName} emoji={emoji} animationType={animationType} size={96} />
          </div>
          <div className="text-2xl font-black text-white">Подарок отправлен!</div>
          <div className="text-sm text-white/60 mt-1">{giftName} улетел к получателю ✨</div>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface UserSearchResult { id: number; username: string; displayName: string; avatarColor: string; avatarUrl?: string | null; }

const PRIME_PLANS = [
  { id: "monthly",  months: 1,  label: "1 месяц",  emoji: "🎁", price: 299,  stars: 1000 },
  { id: "halfyear", months: 6,  label: "6 месяцев", emoji: "⭐", price: 1494, stars: 1500, badge: "Популярное" },
  { id: "yearly",   months: 12, label: "12 месяцев",emoji: "👑", price: 2388, stars: 2500, badge: "Лучшая цена" },
];

function RecipientPicker({ value, onChange, getUserIdHeader }: {
  value: UserSearchResult | null;
  onChange: (u: UserSearchResult | null) => void;
  getUserIdHeader: () => Record<string, string>;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDrop, setShowDrop] = useState(false);

  useEffect(() => {
    if (!search.trim()) { setResults([]); setShowDrop(false); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(search)}`, { headers: getUserIdHeader() });
        if (res.ok) { const d = await res.json(); setResults(d); setShowDrop(true); }
      } catch {}
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  if (value) return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/30">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden" style={{ backgroundColor: value.avatarColor }}>
        {value.avatarUrl ? <img src={value.avatarUrl} alt="" className="w-full h-full object-cover" /> : value.displayName[0].toUpperCase()}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="font-semibold text-sm">{value.displayName}</p>
        <p className="text-xs text-muted-foreground">@{value.username}</p>
      </div>
      <button onClick={() => { onChange(null); setSearch(""); }} className="text-muted-foreground hover:text-foreground p-1"><X size={16} /></button>
    </div>
  );

  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input value={search} onChange={e => setSearch(e.target.value)} onFocus={() => results.length > 0 && setShowDrop(true)}
        placeholder="Поиск по имени или никнейму..."
        className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
      />
      {showDrop && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
          {results.map(u => (
            <button key={u.id} onClick={() => { onChange(u); setShowDrop(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary text-left transition-colors">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden" style={{ backgroundColor: u.avatarColor }}>
                {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : u.displayName[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm">{u.displayName}</p>
                <p className="text-xs text-muted-foreground">@{u.username}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {loading && <p className="text-xs text-muted-foreground mt-1 px-1">Поиск...</p>}
    </div>
  );
}

const RARITY_ORDER = ["legendary", "epic", "rare", "common"];

export default function Gifts() {
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();
  const hasPrime = (me as any)?.hasPrime ?? false;
  const { data: catalog, isLoading: catalogLoading } = useGetGiftCatalog();
  const { data: receivedGifts, isLoading: receivedLoading } = useGetReceivedGifts();
  const { data: sentGifts, isLoading: sentLoading } = useGetSentGifts();

  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRarity, setFilterRarity] = useState<string>("all");
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationAnim, setCelebrationAnim] = useState("confetti");
  const [celebrationGift, setCelebrationGift] = useState("");
  const [celebrationEmoji, setCelebrationEmoji] = useState("🎁");
  const [balance, setBalance] = useState<number>(0);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [selectedRecipient, setSelectedRecipient] = useState<UserSearchResult | null>(null);
  const [giftMessage, setGiftMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [showPrimeDialog, setShowPrimeDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(PRIME_PLANS[1]);
  const [primeRecipient, setPrimeRecipient] = useState<UserSearchResult | null>(null);
  const [isSendingPrime, setIsSendingPrime] = useState(false);
  const [primeError, setPrimeError] = useState<string | null>(null);

  const getUserIdHeader = useCallback((): Record<string, string> => {
    const token = localStorage.getItem("pulse-token");
    if (token) return { "Authorization": `Bearer ${token}` };
    const uid = localStorage.getItem("pulse-user-id");
    return uid ? { "x-user-id": uid } : {};
  }, []);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet", { headers: getUserIdHeader() });
      if (res.ok) { const d = await res.json(); setBalance(d.balance); }
    } catch {}
  }, []);

  useEffect(() => { fetchBalance(); }, []);
  useEffect(() => { if (selectedGift) { fetchBalance(); setSendError(null); } }, [selectedGift]);

  const filtered = catalog?.filter((item: GiftItem) => {
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRarity = filterRarity === "all" || item.rarity === filterRarity;
    return matchSearch && matchRarity;
  }).sort((a: GiftItem, b: GiftItem) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));

  const getRarityColor = (rarity: string) => RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
  const canAfford = selectedGift ? balance >= selectedGift.stars : false;
  const canSend = canAfford && !!selectedRecipient && !isSending;

  const handleSendGift = async () => {
    if (!selectedGift || !selectedRecipient) { setSendError("Выберите получателя подарка"); return; }
    setIsSending(true); setSendError(null);
    try {
      const spendRes = await fetch("/api/wallet/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getUserIdHeader() },
        body: JSON.stringify({ amount: selectedGift.stars }),
      });
      if (!spendRes.ok) {
        const d = await spendRes.json();
        setSendError(d.error || "Недостаточно средств");
        if (d.balance !== undefined) setBalance(d.balance);
        setIsSending(false); return;
      }
      const spendData = await spendRes.json();
      setBalance(spendData.balance);

      await fetch("/api/gifts/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getUserIdHeader() },
        body: JSON.stringify({ giftItemId: selectedGift.id, receiverId: selectedRecipient.id, message: giftMessage.trim() || undefined, isAnonymous }),
      });

      queryClient.invalidateQueries({ queryKey: ["/api/gifts/sent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gifts/received"] });

      setCelebrationAnim(selectedGift.animationType);
      setCelebrationGift(selectedGift.name);
      setCelebrationEmoji(selectedGift.emoji);
      setSelectedGift(null);
      setSelectedRecipient(null);
      setGiftMessage(""); setIsAnonymous(false);
      setShowCelebration(true);
    } catch { setSendError("Ошибка при отправке подарка"); }
    setIsSending(false);
  };

  const handleGiftPrime = async () => {
    if (!primeRecipient) { setPrimeError("Выберите получателя"); return; }
    setIsSendingPrime(true); setPrimeError(null);
    try {
      const res = await fetch("/api/prime/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getUserIdHeader() },
        body: JSON.stringify({ planId: selectedPlan.id, recipientId: primeRecipient.id }),
      });
      const d = await res.json();
      if (!res.ok) { setPrimeError(d.error || "Ошибка"); setIsSendingPrime(false); return; }
      if (d.balance !== undefined) setBalance(d.balance);
      setShowPrimeDialog(false);
      setPrimeRecipient(null);
      setCelebrationAnim("stars");
      setCelebrationGift(`Prime ${selectedPlan.label}`);
      setCelebrationEmoji(selectedPlan.emoji);
      setShowCelebration(true);
    } catch { setPrimeError("Ошибка сервера"); }
    setIsSendingPrime(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <AnimatePresence>
        {showCelebration && (
          <CelebrationOverlay animationType={celebrationAnim} giftName={celebrationGift} emoji={celebrationEmoji} onDone={() => setShowCelebration(false)} />
        )}
      </AnimatePresence>

      <header className="h-16 border-b border-rose-900/40 flex items-center px-6 justify-between z-10 shrink-0" style={{ background: "linear-gradient(135deg, #1a0409 0%, #2d0916 100%)" }}>
        <h1 className="text-xl font-bold flex items-center gap-2 text-rose-100">
          <span className="text-2xl">🌹</span> Подарки
        </h1>
        <div className="flex items-center gap-1.5 text-sm font-bold text-rose-300 bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/30">
          <Zap size={14} className="text-rose-400" /> {balance} Монета
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full scrollbar-thin">
        <Tabs defaultValue="catalog" className="w-full max-w-5xl mx-auto">
          <div className="flex justify-center mb-5">
            <TabsList className="bg-card border border-border h-11 p-1">
              <TabsTrigger value="catalog" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5 py-1.5 rounded-lg text-sm">Каталог</TabsTrigger>
              <TabsTrigger value="received" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5 py-1.5 rounded-lg text-sm">
                <ArrowDownLeft size={14} className="mr-1" /> Получены
              </TabsTrigger>
              <TabsTrigger value="sent" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5 py-1.5 rounded-lg text-sm">
                <ArrowUpRight size={14} className="mr-1" /> Отправлены
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="catalog" className="mt-0 outline-none space-y-6">
            {/* ── Gift Prime Section ── */}
            <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-yellow-400/5 to-orange-500/10 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Crown size={16} className="text-amber-400" />
                <h2 className="font-black text-base text-amber-200">Подарить Prime</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Подарите другу подписку Pulse Prime — эксклюзивные подарки и функции</p>
              <div className="grid grid-cols-3 gap-3">
                {PRIME_PLANS.map(plan => (
                  <motion.button
                    key={plan.id}
                    whileHover={{ y: -3, scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setSelectedPlan(plan); setShowPrimeDialog(true); setPrimeError(null); }}
                    className={`relative flex flex-col items-center gap-1.5 p-3 pt-4 rounded-2xl border transition-all ${plan.id === "halfyear" ? "bg-amber-500/20 border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]" : "bg-card/60 border-border hover:border-amber-400/30"}`}
                  >
                    {plan.badge && (
                      <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${plan.id === "yearly" ? "bg-violet-500/80 text-violet-100" : "bg-amber-500/80 text-amber-100"}`}>
                        {plan.badge}
                      </span>
                    )}
                    <span className="text-3xl">{plan.emoji}</span>
                    <p className="text-xs font-bold text-foreground">{plan.label}</p>
                    <div className="flex items-center gap-0.5 text-[11px] text-yellow-400 font-bold">
                      <span>⭐</span><span>{plan.stars}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{plan.price} Монет</p>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* ── Gift Catalog ── */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GiftIcon size={16} className="text-rose-400" />
                <h2 className="font-black text-base text-foreground">Отправить подарок</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Подарки остаются в профиле получателя навсегда</p>

              <div className="flex gap-2 flex-wrap mb-4">
                <div className="relative flex-1 min-w-[140px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск..." className="pl-8 h-9 bg-card border-border text-sm" />
                </div>
                <div className="flex gap-1 flex-wrap">
                  {["all", "legendary", "epic", "rare", "common"].map(r => (
                    <button key={r} onClick={() => setFilterRarity(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all border ${filterRarity === r ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
                      {r === "all" ? "Все" : r}
                    </button>
                  ))}
                </div>
              </div>

              {catalogLoading ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2">
                  {Array.from({ length: 24 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
                </div>
              ) : filtered?.length === 0 ? (
                <div className="text-center text-muted-foreground py-16">Подарки не найдены</div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2">
                  {filtered?.map((item: GiftItem) => (
                    <GiftCard key={item.id} item={item} hasPrime={hasPrime} onClick={() => {
                      if ((item as any).primeOnly && !hasPrime) { window.location.href = "/prime"; return; }
                      setSelectedGift(item); setSelectedRecipient(null); setSendError(null);
                    }} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="received" className="mt-0">
            {receivedLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
            ) : !receivedGifts || receivedGifts.length === 0 ? (
              <div className="text-center text-muted-foreground py-20 flex flex-col items-center gap-3">
                <GiftIcon size={48} className="opacity-20" />
                <p className="font-medium">Нет полученных подарков</p>
                <p className="text-sm opacity-60">Когда вам подарят что-то, это появится здесь</p>
              </div>
            ) : (
              <div className="space-y-3">
                {receivedGifts.map((gift: Gift) => {
                  const cfg = RARITY_CONFIG[gift.giftItem?.rarity || "common"];
                  return (
                    <motion.div key={gift.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      className={`rounded-2xl border ${cfg.border} bg-card/80 p-4 flex items-center gap-4`}>
                      <div className="shrink-0 flex items-center justify-center w-14 h-14 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <GiftVisual name={gift.giftItem?.name || ""} emoji={gift.giftItem?.emoji || "🎁"} animationType={gift.giftItem?.animationType || "sparkle"} size={48} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{gift.giftItem?.name}</p>
                        <p className="text-xs text-muted-foreground">От {gift.isAnonymous ? "Анонима" : (gift.sender?.displayName || "Неизвестно")}</p>
                        {gift.message && <p className="text-xs mt-0.5 italic opacity-70">&quot;{gift.message}&quot;</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(gift.createdAt), { addSuffix: true })}</p>
                      </div>
                      <div className="flex items-center gap-0.5 text-yellow-400 text-sm font-bold shrink-0"><span>⭐</span>{gift.giftItem?.stars}</div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-0">
            {sentLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
            ) : !sentGifts || sentGifts.length === 0 ? (
              <div className="text-center text-muted-foreground py-20 flex flex-col items-center gap-3">
                <ArrowUpRight size={48} className="opacity-20" />
                <p className="font-medium">Нет отправленных подарков</p>
                <p className="text-sm opacity-60">Отправьте подарок из каталога</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sentGifts.map((gift: Gift) => {
                  const cfg = RARITY_CONFIG[gift.giftItem?.rarity || "common"];
                  return (
                    <motion.div key={gift.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      className={`rounded-2xl border ${cfg.border} bg-card/80 p-4 flex items-center gap-4`}>
                      <div className="shrink-0 flex items-center justify-center w-14 h-14 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <GiftVisual name={gift.giftItem?.name || ""} emoji={gift.giftItem?.emoji || "🎁"} animationType={gift.giftItem?.animationType || "sparkle"} size={48} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{gift.giftItem?.name}</p>
                        <p className="text-xs text-muted-foreground">Кому: {gift.receiver?.displayName || "Неизвестно"}</p>
                        {gift.message && <p className="text-xs mt-0.5 italic opacity-70">&quot;{gift.message}&quot;</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(gift.createdAt), { addSuffix: true })}</p>
                      </div>
                      <div className="flex items-center gap-0.5 text-yellow-400 text-sm font-bold shrink-0"><span>⭐</span>{gift.giftItem?.stars}</div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Send Gift Dialog ── */}
      <AnimatePresence>
        {selectedGift && (
          <Dialog open onOpenChange={() => { setSelectedGift(null); setSendError(null); }}>
            <DialogContent className="sm:max-w-md border-none bg-transparent shadow-none p-0 max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
              <DialogTitle className="sr-only">{selectedGift.name}</DialogTitle>
              <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
                <div className={`rounded-3xl border ${getRarityColor(selectedGift.rarity).border} bg-[hsl(222,47%,10%)] p-5 flex flex-col items-center text-center`}>
                  <div className="mb-3 flex items-center justify-center" style={{ width: 96, height: 96 }}>
                    <GiftVisual name={selectedGift.name} emoji={selectedGift.emoji} animationType={selectedGift.animationType} size={96} />
                  </div>
                  <h2 className="text-xl font-black mb-1">{selectedGift.name}</h2>
                  <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full border mb-2 ${getRarityColor(selectedGift.rarity).badge}`}>{selectedGift.rarity}</span>
                  <p className="text-muted-foreground text-sm mb-4 max-w-xs">{selectedGift.description}</p>

                  <div className="w-full space-y-3 mb-4">
                    <div className="text-left">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5"><UserRound size={12} /> Кому отправить *</label>
                      <RecipientPicker value={selectedRecipient} onChange={setSelectedRecipient} getUserIdHeader={getUserIdHeader} />
                    </div>
                    <div className="text-left">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5"><MessageSquare size={12} /> Сообщение (необязательно)</label>
                      <textarea value={giftMessage} onChange={e => setGiftMessage(e.target.value)} placeholder="Добавьте пожелание..." rows={2} maxLength={200}
                        className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none" />
                    </div>
                    <button onClick={() => setIsAnonymous(v => !v)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-sm font-medium ${isAnonymous ? "bg-primary/10 border-primary/30 text-primary" : "bg-black/20 border-white/10 text-muted-foreground hover:border-white/20"}`}>
                      <EyeOff size={15} />{isAnonymous ? "Анонимно (вкл.)" : "Отправить анонимно"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between w-full p-3.5 rounded-xl bg-black/30 border border-white/5 mb-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">Стоимость</p>
                      <div className="flex items-center gap-1.5 text-primary font-black text-lg"><Zap size={16} className="text-primary" /> {selectedGift.stars} Монета</div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">Ваш баланс</p>
                      <div className={`flex items-center gap-1 font-bold text-sm ${canAfford ? "text-green-400" : "text-red-400"}`}><Zap size={14} /> {balance} Монета</div>
                    </div>
                  </div>

                  {!canAfford && (
                    <div className="w-full flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-2.5 text-sm font-semibold mb-3">
                      <AlertTriangle size={16} className="shrink-0" /> Недостаточно Монет. Пополните баланс в Кошельке.
                    </div>
                  )}
                  {sendError && (
                    <div className="w-full flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-2.5 text-sm font-semibold mb-3">
                      <AlertTriangle size={16} className="shrink-0" />{sendError}
                    </div>
                  )}

                  <motion.button whileHover={canSend ? { scale: 1.03 } : {}} whileTap={canSend ? { scale: 0.97 } : {}}
                    onClick={handleSendGift} disabled={!canAfford || isSending || !selectedRecipient}
                    className={`w-full py-3.5 rounded-xl font-black text-base transition-all ${canAfford && selectedRecipient ? "bg-primary text-primary-foreground hover:opacity-90 shadow-[0_0_25px_rgba(255,80,0,0.35)]" : "bg-secondary text-muted-foreground cursor-not-allowed opacity-60"}`}>
                    {isSending ? "Отправляем..." : !selectedRecipient ? "Выберите получателя" : !canAfford ? "Недостаточно средств" : "Отправить подарок"}
                  </motion.button>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* ── Gift Prime Dialog ── */}
      <AnimatePresence>
        {showPrimeDialog && (
          <Dialog open onOpenChange={() => { setShowPrimeDialog(false); setPrimeError(null); }}>
            <DialogContent className="sm:max-w-md border-none bg-transparent shadow-none p-0" aria-describedby={undefined}>
              <DialogTitle className="sr-only">Подарить Prime</DialogTitle>
              <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
                <div className="rounded-3xl border border-amber-400/30 bg-[hsl(222,47%,10%)] p-5 flex flex-col items-center text-center">
                  <div className="text-5xl mb-3">{selectedPlan.emoji}</div>
                  <h2 className="text-xl font-black mb-1 text-amber-200">Подарить Prime</h2>
                  <p className="text-sm text-muted-foreground mb-5">Подписка на <span className="text-amber-300 font-bold">{selectedPlan.label}</span> — {selectedPlan.price} Монет</p>

                  <div className="grid grid-cols-3 gap-2 w-full mb-5">
                    {PRIME_PLANS.map(plan => (
                      <button key={plan.id} onClick={() => setSelectedPlan(plan)}
                        className={`relative flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all text-xs ${selectedPlan.id === plan.id ? "bg-amber-500/20 border-amber-400/50 text-amber-200" : "bg-card/40 border-border text-muted-foreground hover:border-amber-400/30"}`}>
                        <span className="text-xl">{plan.emoji}</span>
                        <span className="font-bold">{plan.label}</span>
                        <span className="text-yellow-400 font-bold">⭐ {plan.stars}</span>
                        {plan.badge && <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full whitespace-nowrap ${plan.id === "yearly" ? "bg-violet-500/80 text-white" : "bg-amber-500/80 text-white"}`}>{plan.badge}</span>}
                      </button>
                    ))}
                  </div>

                  <div className="w-full space-y-3 mb-4 text-left">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><UserRound size={12} /> Кому подарить *</label>
                    <RecipientPicker value={primeRecipient} onChange={setPrimeRecipient} getUserIdHeader={getUserIdHeader} />
                  </div>

                  <div className="flex items-center justify-between w-full p-3.5 rounded-xl bg-black/30 border border-white/5 mb-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">Стоимость</p>
                      <div className="flex items-center gap-1.5 text-amber-400 font-black text-lg">⭐ {selectedPlan.stars} Монет</div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">Ваш баланс</p>
                      <div className={`flex items-center gap-1 font-bold text-sm ${balance >= selectedPlan.stars ? "text-green-400" : "text-red-400"}`}><Zap size={14} /> {balance}</div>
                    </div>
                  </div>

                  {primeError && (
                    <div className="w-full flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-2.5 text-sm font-semibold mb-3">
                      <AlertTriangle size={16} className="shrink-0" />{primeError}
                    </div>
                  )}

                  <motion.button whileHover={primeRecipient && balance >= selectedPlan.stars ? { scale: 1.03 } : {}} whileTap={primeRecipient && balance >= selectedPlan.stars ? { scale: 0.97 } : {}}
                    onClick={handleGiftPrime} disabled={!primeRecipient || balance < selectedPlan.stars || isSendingPrime}
                    className={`w-full py-3.5 rounded-xl font-black text-base transition-all ${primeRecipient && balance >= selectedPlan.stars ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:opacity-90 shadow-[0_0_25px_rgba(245,158,11,0.4)]" : "bg-secondary text-muted-foreground cursor-not-allowed opacity-60"}`}>
                    {isSendingPrime ? "Отправляем..." : !primeRecipient ? "Выберите получателя" : balance < selectedPlan.stars ? "Недостаточно Монет" : `Подарить Prime ${selectedPlan.label}`}
                  </motion.button>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
