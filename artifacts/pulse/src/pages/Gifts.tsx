import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
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

// Sprite sheet: /gift-sprite.png — 7 cols × 5 rows (1408×768px)
// Row 0: Rose, Rocket, Diamond, Crown, Robot, MagicWand, Parrot
// Row 1: TreasureChest, HotAirBalloon, BirthdayCake, Books, Camera, Gamepad, Megaphone
// Row 2: Lightbulb, Compass, Palette, Balls, MusicNote, PaperPlane, Trophy
// Row 3: Planet, Lightning, HeartLock, GoldenKey, Car, Champagne, Guitar
// Row 4: Microscope, Pen, Whistle, GiftBox, Magnifier, Sunflower, Telescope
const GIFT_SPRITE_MAP: Record<string, [number, number]> = {
  // Common
  "Сердечко":          [2, 3],
  "Звёздочка":         [6, 2],
  "Мыльный пузырь":    [3, 2],
  "Конфета":           [3, 4],
  "Клубника":          [5, 4],
  "Леденец":           [3, 4],
  "Ромашка":           [5, 4],
  "Цветок сакуры":     [0, 0],
  "Пончик":            [2, 1],
  "Мороженое":         [2, 1],
  "Рыбка":             [4, 4],
  "Подсолнух":         [5, 4],
  "Чашка кофе":        [5, 3],
  "Луна":              [0, 3],
  "Четырёхлистник":    [1, 2],
  "Бабочка":           [2, 2],
  "Котёнок":           [4, 0],
  "Воздушный шар":     [1, 1],
  "Ретро-телефон":     [6, 1],
  "Пицца":             [3, 1],
  "Медвежонок":        [3, 4],
  "Торт":              [2, 1],
  "Игровая приставка": [5, 1],
  "Снеговик":          [3, 2],
  "Радужный кит":      [4, 4],
  // Rare
  "Корона":            [3, 0],
  "Красная роза":      [0, 0],
  "Бриллиант":         [2, 0],
  "Золотая монета":    [3, 3],
  "Ракета":            [1, 0],
  "Гитара":            [6, 3],
  "Кубок":             [6, 2],
  "Радуга":            [4, 2],
  "Молния":            [1, 3],
  "Дельфин":           [4, 4],
  "Лиса":              [6, 0],
  "Сова":              [6, 0],
  "Акула":             [0, 4],
  "Парусник":          [5, 2],
  "Самоцвет":          [2, 0],
  "Медаль":            [6, 2],
  "Попугай":           [6, 0],
  "Волшебная лампа":   [5, 0],
  "Морская звезда":    [6, 2],
  "Горящее сердце":    [2, 3],
  // Epic
  "Дракон":            [5, 0],
  "Единорог":          [5, 0],
  "Феникс":            [1, 0],
  "Планета":           [0, 3],
  "Волшебство":        [5, 0],
  "Кристалл":          [2, 0],
  "Пегас":             [5, 2],
  "Нарвал":            [4, 4],
  "Хрустальное сердце":[2, 3],
  "Жар-птица":         [1, 3],
  "Морской конёк":     [4, 4],
  "Грифон":            [3, 0],
  "Сапфировый кулон":  [2, 0],
  "Магический гриб":   [5, 0],
  "Золотая рыбка":     [4, 4],
  "Рубиновое кольцо":  [2, 3],
  "Волшебная скрипка": [6, 3],
  "Чёрный кот":        [4, 0],
  "Сфинкс":            [1, 2],
  "Огненный дракон":   [1, 3],
  // Legendary
  "Галактика":         [0, 3],
  "Ангел":             [5, 0],
  "Пульс":             [3, 4],
  "Легендарная звезда":[6, 2],
  "Бесконечность":     [0, 3],
  "Золотой дракон":    [3, 3],
  "Небесный кит":      [0, 3],
  "Северное сияние":   [0, 3],
  "Джинн":             [5, 0],
  "Хрустальный дворец":[3, 0],
  "Единый трон":       [3, 0],
  "Мировое дерево":    [5, 4],
  "Небесный феникс":   [1, 0],
  "Нептун":            [0, 3],
  "Звёздная колесница":[6, 2],
  // Cosmic
  "Нейтронная звезда": [0, 3],
  "Квазар":            [1, 3],
  "Чёрная дыра":       [0, 3],
  "Мультивселенная":   [0, 3],
  "Абсолют":           [6, 2],
  "Сингулярность":     [0, 3],
  "Создатель":         [5, 0],
  "Вселенский огонь":  [1, 3],
  "Бог Грома":         [1, 3],
  "Ось Мира":          [1, 2],
  "Левиафан":          [4, 4],
  "Солнечный дракон":  [1, 3],
  "Вечность":          [0, 3],
  "Первозданный Хаос": [0, 3],
  "Высший Разум":      [2, 0],
  // Prime exclusive
  "Корона Prime":      [3, 0],
  "Пульс Сердца":      [2, 3],
  "Звезда Prime":      [6, 2],
  "Вселенский Огонь":  [1, 3],
  "Сапфировый Трон":   [2, 0],
};

const RARITY_ORBS: Record<string, { inner: string; outer: string; glow: string }> = {
  cosmic:    { inner: "radial-gradient(circle at 35% 30%, #c084fc, #7c3aed 55%, #4c1d95)", outer: "rgba(139,92,246,0.5)", glow: "0 0 28px rgba(139,92,246,0.9), 0 0 60px rgba(139,92,246,0.4)" },
  legendary: { inner: "radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 55%, #92400e)", outer: "rgba(245,158,11,0.5)", glow: "0 0 28px rgba(251,191,36,0.9), 0 0 60px rgba(245,158,11,0.4)" },
  epic:      { inner: "radial-gradient(circle at 35% 30%, #c084fc, #9333ea 55%, #581c87)", outer: "rgba(147,51,234,0.5)", glow: "0 0 22px rgba(147,51,234,0.85), 0 0 50px rgba(147,51,234,0.3)" },
  rare:      { inner: "radial-gradient(circle at 35% 30%, #93c5fd, #3b82f6 55%, #1e3a8a)", outer: "rgba(59,130,246,0.5)", glow: "0 0 18px rgba(59,130,246,0.8), 0 0 40px rgba(59,130,246,0.3)" },
  common:    { inner: "radial-gradient(circle at 35% 30%, #e2e8f0, #94a3b8 55%, #475569)", outer: "rgba(148,163,184,0.3)", glow: "0 0 12px rgba(148,163,184,0.6), 0 0 24px rgba(148,163,184,0.2)" },
};

const COLS = 7;
const ROWS = 5;

function GiftSprite({ col, row, size, glowColor }: { col: number; row: number; size: number; glowColor: string }) {
  const radius = Math.round(size * 0.22);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundImage: "url('/gift-sprite.png')",
        backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
        backgroundPosition: `${(col / (COLS - 1)) * 100}% ${(row / (ROWS - 1)) * 100}%`,
        backgroundRepeat: "no-repeat",
        boxShadow: `0 ${Math.round(size * 0.06)}px ${Math.round(size * 0.22)}px rgba(0,0,0,0.45), 0 0 ${Math.round(size * 0.22)}px ${glowColor}`,
        overflow: "hidden",
      }}
    />
  );
}

function GiftVisual({ name, emoji, animationType, size = 56, rarity = "common" }: {
  name: string; emoji: string; animationType: string; size?: number; rarity?: string;
}) {
  const spritePos = GIFT_SPRITE_MAP[name];
  const anim = getEmojiAnimation(animationType);
  const orb = RARITY_ORBS[rarity] || RARITY_ORBS.common;
  const orbSize = Math.round(size * 1.35);

  if (spritePos) {
    const [col, row] = spritePos;
    return (
      <motion.div
        style={{ width: size, height: size }}
        className="flex items-center justify-center"
        {...(anim as any)}
      >
        <GiftSprite col={col} row={row} size={size} glowColor={orb.outer} />
      </motion.div>
    );
  }

  // Emoji orb fallback for unmapped gifts
  return (
    <motion.div
      className="flex items-center justify-center relative"
      style={{ width: orbSize, height: orbSize }}
      {...(anim as any)}
    >
      <div
        className="absolute inset-0 rounded-full opacity-60"
        style={{ background: orb.outer, filter: "blur(8px)", transform: "scale(1.15)" }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: orb.inner, boxShadow: orb.glow }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: "42%", height: "35%", top: "10%", left: "14%",
          background: "radial-gradient(ellipse, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.1) 60%, transparent 100%)",
        }}
      />
      <span
        className="relative z-10 select-none leading-none block"
        style={{
          fontSize: size * 0.56,
          fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
          lineHeight: 1,
          filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))",
        }}
      >
        {emoji}
      </span>
    </motion.div>
  );
}

const PREVIEW_PARTICLES: Record<string, string[]> = {
  hearts:    ["❤️","💕","💖","🌸","💗"],
  fireworks: ["✨","💥","🌟","🎆","⭐"],
  stars:     ["⭐","🌟","✨","💫","🌠"],
  sparkle:   ["✨","💫","⚡","🔆","🌟"],
  confetti:  ["🎊","🎉","🌟","💛","🎈"],
  balloons:  ["🎈","🎀","✨","🥳","🎉"],
  diamonds:  ["💎","✨","💙","🔷","🌟"],
  lightning: ["⚡","💥","🌩️","✨","⚡"],
  flame:     ["🔥","✨","💫","🌟","🔥"],
  magic:     ["✨","🪄","💫","⭐","🌟"],
  galaxy:    ["🌌","⭐","💫","🌟","✨"],
  supernova: ["💥","✨","⭐","🌟","💥"],
  vortex:    ["🌀","💫","✨","⭐","🌀"],
  bounce:    ["✨","💫","⭐","🎉","🌟"],
};

function GiftHoverPreview({ item, anchorRef, visible }: {
  item: GiftItem;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  visible: boolean;
}) {
  const [pos, setPos] = useState<{ x: number; y: number; side: "right" | "left" }>({ x: 0, y: 0, side: "right" });
  const PREVIEW_W = 188;

  useEffect(() => {
    if (!visible || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const gap = 10;
    const rightSpace = window.innerWidth - r.right;
    const side: "right" | "left" = rightSpace >= PREVIEW_W + gap ? "right" : "left";
    const x = side === "right" ? r.right + gap : r.left - PREVIEW_W - gap;
    const y = Math.max(8, Math.min(r.top + r.height / 2 - 148, window.innerHeight - 310));
    setPos({ x, y, side });
  }, [visible, anchorRef]);

  const cfg = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
  const orb = RARITY_ORBS[item.rarity] || RARITY_ORBS.common;
  const particles = PREVIEW_PARTICLES[item.animationType] || PREVIEW_PARTICLES.sparkle;
  const NUM_P = 10;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          key="gift-preview"
          initial={{ opacity: 0, scale: 0.82, x: pos.side === "right" ? -14 : 14 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.82, x: pos.side === "right" ? -14 : 14 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: "fixed", left: pos.x, top: pos.y, width: PREVIEW_W, zIndex: 9999, pointerEvents: "none" }}
          className={`rounded-2xl border ${cfg.border} overflow-hidden`}
        >
          {/* Layered background */}
          <div className={`absolute inset-0 bg-gradient-to-br ${cfg.cardBg}`} />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-2xl" />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.07), transparent 65%)" }} />

          <div className="relative z-10 flex flex-col items-center px-3 pt-4 pb-3 gap-2">
            {/* Icon + particles arena */}
            <div className="relative flex items-center justify-center" style={{ width: 112, height: 112 }}>
              {/* Glow backdrop */}
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: orb.outer, filter: "blur(22px)", opacity: 0.55, transform: "scale(1.15)" }}
              />
              {/* Orbiting particles */}
              {Array.from({ length: NUM_P }).map((_, i) => {
                const angle = (i / NUM_P) * Math.PI * 2;
                const r1 = 42, r2 = 50;
                return (
                  <motion.span
                    key={i}
                    className="absolute text-xs select-none"
                    style={{ top: "50%", left: "50%", marginTop: -10, marginLeft: -10, transformOrigin: "center" }}
                    animate={{
                      x: [0, Math.cos(angle) * r1, Math.cos(angle + 0.4) * r2, 0],
                      y: [0, Math.sin(angle) * r1, Math.sin(angle + 0.4) * r2, 0],
                      opacity: [0, 1, 0.85, 0],
                      scale: [0.3, 1.1, 0.8, 0],
                    }}
                    transition={{
                      duration: 2.4,
                      repeat: Infinity,
                      delay: (i / NUM_P) * 2.4,
                      ease: "easeInOut",
                    }}
                  >
                    {particles[i % particles.length]}
                  </motion.span>
                );
              })}
              {/* Burst particles — faster outward pops */}
              {Array.from({ length: 6 }).map((_, i) => {
                const angle = (i / 6) * Math.PI * 2 + 0.3;
                return (
                  <motion.span
                    key={`b${i}`}
                    className="absolute text-[10px] select-none"
                    style={{ top: "50%", left: "50%", marginTop: -8, marginLeft: -8 }}
                    animate={{
                      x: [0, Math.cos(angle) * 58],
                      y: [0, Math.sin(angle) * 58],
                      opacity: [0.9, 0],
                      scale: [1.2, 0.3],
                    }}
                    transition={{
                      duration: 1.1,
                      repeat: Infinity,
                      delay: i * 0.18 + 0.6,
                      ease: "easeOut",
                      repeatDelay: 1.4,
                    }}
                  >
                    ✨
                  </motion.span>
                );
              })}
              {/* Main icon — larger */}
              <div className="relative z-10 flex items-center justify-center" style={{ width: 80, height: 80 }}>
                <GiftVisual name={item.name} emoji={item.emoji} animationType={item.animationType} size={80} rarity={item.rarity} />
              </div>
            </div>

            {/* Rarity badge */}
            <div className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${cfg.badge}`}>
              {cfg.label}
            </div>

            {/* Name */}
            <p className={`text-[13px] font-black text-center leading-tight ${cfg.textColor}`}>{item.name}</p>

            {/* Description */}
            {(item as any).description && (
              <p className="text-[10px] text-white/45 text-center leading-relaxed px-1">
                {(item as any).description}
              </p>
            )}

            {/* Price row */}
            <div className="flex items-center gap-1.5 bg-white/8 border border-white/10 px-3 py-1 rounded-full mt-0.5">
              <Zap size={11} className="text-yellow-400" />
              <span className="text-[12px] font-black text-yellow-400">{item.stars.toLocaleString()}</span>
              <span className="text-[10px] text-white/40">⭐</span>
            </div>

            {/* Tap hint */}
            <p className="text-[9px] text-white/25 mt-0.5">Нажмите, чтобы отправить</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function GiftCard({ item, onClick, hasPrime }: { item: GiftItem; onClick: () => void; hasPrime: boolean }) {
  const cfg = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
  const isPrimeOnly = !!(item as any).primeOnly;
  const isLocked = isPrimeOnly && !hasPrime;
  const [hovered, setHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const cardRef = useRef<HTMLButtonElement>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHoverStart = () => {
    setHovered(true);
    previewTimer.current = setTimeout(() => setShowPreview(true), 380);
  };

  const handleHoverEnd = () => {
    setHovered(false);
    setShowPreview(false);
    if (previewTimer.current) { clearTimeout(previewTimer.current); previewTimer.current = null; }
  };

  useEffect(() => () => { if (previewTimer.current) clearTimeout(previewTimer.current); }, []);

  return (
    <>
    <GiftHoverPreview item={item} anchorRef={cardRef} visible={showPreview} />
    <motion.button
      ref={cardRef}
      whileHover={{ y: -8, scale: 1.04, rotateX: 4 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      onClick={onClick}
      style={{ perspective: 800, aspectRatio: "3/4" }}
      className={`relative flex flex-col items-center rounded-[20px] cursor-pointer border overflow-hidden transition-shadow ${cfg.border} ${cfg.glow}`}
    >
      {/* Card background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${cfg.cardBg}`} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 20%, rgba(255,255,255,0.07) 0%, transparent 70%)" }} />

      {/* Shimmer on hover */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0"
        style={{ background: `radial-gradient(circle at 50% 35%, ${cfg.shimmer}, transparent 65%)` }}
      />

      {/* Top rarity badge */}
      <div className={`relative z-10 mt-2.5 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${cfg.badge}`}>
        {cfg.label}
      </div>

      {/* Gift visual — central focus */}
      <div className="relative z-10 flex-1 flex items-center justify-center w-full">
        <GiftVisual name={item.name} emoji={item.emoji} animationType={item.animationType} size={62} rarity={item.rarity} />
      </div>

      {/* Glow ring behind emoji */}
      <div
        className="absolute z-[5]"
        style={{
          width: 72, height: 72,
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: cfg.shimmer,
          borderRadius: "50%",
          filter: "blur(18px)",
          opacity: hovered ? 0.8 : 0.4,
          transition: "opacity 0.3s",
        }}
      />

      {/* Bottom name + stars */}
      <div className="relative z-10 w-full px-2 pb-2.5 pt-1 text-center">
        <p className={`text-[11px] font-bold leading-tight truncate ${cfg.textColor}`}>{item.name}</p>
        <div className="flex items-center justify-center gap-0.5 mt-0.5">
          <span className="text-[10px]">⭐</span>
          <span className="text-[10px] text-yellow-400 font-black">{item.stars}</span>
        </div>
      </div>

      {/* Prime lock overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[3px] rounded-[20px] flex flex-col items-center justify-center gap-2 z-20">
          <Lock size={18} className="text-amber-400 drop-shadow-lg" />
          <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">Prime</span>
        </div>
      )}

      {/* Prime badge */}
      {isPrimeOnly && !isLocked && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500/80 border border-amber-400/60 flex items-center justify-center z-20">
          <Crown size={10} className="text-amber-100" />
        </div>
      )}
    </motion.button>
    </>
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

const PLUS_GIFT_PLANS = [
  { id: "monthly",  months: 1,  label: "1 месяц",  emoji: "💎", price: 599,  stars: 1200 },
  { id: "halfyear", months: 6,  label: "6 месяцев", emoji: "✨", price: 2394, stars: 1800, badge: "Популярное" },
  { id: "yearly",   months: 12, label: "12 месяцев",emoji: "🔮", price: 3588, stars: 3000, badge: "Лучшая цена" },
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

const RARITY_ORDER = ["cosmic", "legendary", "epic", "rare", "common"];

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
  const [giftTier, setGiftTier] = useState<"prime" | "prime_plus">("prime");
  const [selectedPlan, setSelectedPlan] = useState(PRIME_PLANS[1]);
  const [primeRecipient, setPrimeRecipient] = useState<UserSearchResult | null>(null);
  const [isSendingPrime, setIsSendingPrime] = useState(false);
  const [primeError, setPrimeError] = useState<string | null>(null);

  const activePlans = giftTier === "prime_plus" ? PLUS_GIFT_PLANS : PRIME_PLANS;

  const getUserIdHeader = useCallback((): Record<string, string> => {
    const token = sessionStorage.getItem("pulse-token");
    if (token) return { "Authorization": `Bearer ${token}` };
    const uid = sessionStorage.getItem("pulse-user-id");
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
        body: JSON.stringify({ planId: selectedPlan.id, recipientId: primeRecipient.id, tier: giftTier }),
      });
      const d = await res.json();
      if (!res.ok) { setPrimeError(d.error || "Ошибка"); setIsSendingPrime(false); return; }
      if (d.balance !== undefined) setBalance(d.balance);
      setShowPrimeDialog(false);
      setPrimeRecipient(null);
      setCelebrationAnim("stars");
      setCelebrationGift(`${giftTier === "prime_plus" ? "Prime+" : "Prime"} ${selectedPlan.label}`);
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
                  {["all", "cosmic", "legendary", "epic", "rare", "common"].map(r => (
                    <button key={r} onClick={() => setFilterRarity(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all border ${filterRarity === r ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
                      {r === "all" ? "Все" : r === "cosmic" ? "Cosmic" : r === "legendary" ? "Legend" : r === "epic" ? "Epic" : r === "rare" ? "Rare" : "Common"}
                    </button>
                  ))}
                </div>
              </div>

              {catalogLoading ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {Array.from({ length: 24 }).map((_, i) => <Skeleton key={i} className="rounded-[20px]" style={{ aspectRatio: "3/4" }} />)}
                </div>
              ) : filtered?.length === 0 ? (
                <div className="text-center text-muted-foreground py-16">Подарки не найдены</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
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
                        <GiftVisual name={gift.giftItem?.name || ""} emoji={gift.giftItem?.emoji || "🎁"} animationType={gift.giftItem?.animationType || "sparkle"} size={48} rarity={gift.giftItem?.rarity || "common"} />
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
                        <GiftVisual name={gift.giftItem?.name || ""} emoji={gift.giftItem?.emoji || "🎁"} animationType={gift.giftItem?.animationType || "sparkle"} size={48} rarity={gift.giftItem?.rarity || "common"} />
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
                    <GiftVisual name={selectedGift.name} emoji={selectedGift.emoji} animationType={selectedGift.animationType} size={96} rarity={selectedGift.rarity} />
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
              <DialogTitle className="sr-only">Подарить подписку</DialogTitle>
              <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
                <div className={`rounded-3xl border bg-[hsl(222,47%,10%)] p-5 flex flex-col items-center text-center ${giftTier === "prime_plus" ? "border-purple-500/40" : "border-amber-400/30"}`}>
                  <div className="text-5xl mb-3">{selectedPlan.emoji}</div>
                  <h2 className={`text-xl font-black mb-1 ${giftTier === "prime_plus" ? "text-purple-300" : "text-amber-200"}`}>
                    Подарить {giftTier === "prime_plus" ? "Prime+" : "Prime"}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Подписка на <span className={`font-bold ${giftTier === "prime_plus" ? "text-purple-300" : "text-amber-300"}`}>{selectedPlan.label}</span> — {selectedPlan.price} Монет
                  </p>

                  {/* Tier switcher */}
                  <div className="flex w-full gap-1.5 mb-4 bg-black/30 p-1 rounded-xl border border-white/5">
                    <button
                      onClick={() => { setGiftTier("prime"); setSelectedPlan(PRIME_PLANS[1]); }}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${giftTier === "prime" ? "bg-amber-500/20 border border-amber-400/50 text-amber-200" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      👑 Prime
                    </button>
                    <button
                      onClick={() => { setGiftTier("prime_plus"); setSelectedPlan(PLUS_GIFT_PLANS[1]); }}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${giftTier === "prime_plus" ? "bg-purple-500/20 border border-purple-500/40 text-purple-300" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      💎 Prime+
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 w-full mb-5">
                    {activePlans.map(plan => (
                      <button key={plan.id} onClick={() => setSelectedPlan(plan)}
                        className={`relative flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all text-xs ${
                          selectedPlan.id === plan.id
                            ? giftTier === "prime_plus"
                              ? "bg-purple-500/20 border-purple-400/50 text-purple-200"
                              : "bg-amber-500/20 border-amber-400/50 text-amber-200"
                            : "bg-card/40 border-border text-muted-foreground hover:border-amber-400/30"
                        }`}>
                        <span className="text-xl">{plan.emoji}</span>
                        <span className="font-bold">{plan.label}</span>
                        <span className={`font-bold ${giftTier === "prime_plus" ? "text-purple-400" : "text-yellow-400"}`}>⭐ {plan.stars}</span>
                        {plan.badge && <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full whitespace-nowrap ${plan.id === "yearly" ? "bg-violet-500/80 text-white" : giftTier === "prime_plus" ? "bg-purple-500/80 text-white" : "bg-amber-500/80 text-white"}`}>{plan.badge}</span>}
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
                      <div className={`flex items-center gap-1.5 font-black text-lg ${giftTier === "prime_plus" ? "text-purple-400" : "text-amber-400"}`}>⭐ {selectedPlan.stars} Монет</div>
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
                    className={`w-full py-3.5 rounded-xl font-black text-base transition-all ${
                      primeRecipient && balance >= selectedPlan.stars
                        ? giftTier === "prime_plus"
                          ? "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white hover:opacity-90 shadow-[0_0_25px_rgba(168,85,247,0.4)]"
                          : "bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:opacity-90 shadow-[0_0_25px_rgba(245,158,11,0.4)]"
                        : "bg-secondary text-muted-foreground cursor-not-allowed opacity-60"
                    }`}>
                    {isSendingPrime ? "Отправляем..." : !primeRecipient ? "Выберите получателя" : balance < selectedPlan.stars ? "Недостаточно Монет" : `Подарить ${giftTier === "prime_plus" ? "Prime+" : "Prime"} ${selectedPlan.label}`}
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
