import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gift, Sparkles } from "lucide-react";

interface ShowcaseGift {
  id: number;
  name: string;
  emoji: string;
  rarity: string;
  animation_type: string;
  stars: number;
  count: number;
}

const RARITY_CONFIG: Record<string, { glow: string; border: string; bg: string; label: string; labelColor: string }> = {
  cosmic:    { glow: "rgba(139,92,246,0.8)",   border: "rgba(139,92,246,0.6)", bg: "rgba(139,92,246,0.12)", label: "COSMIC",    labelColor: "text-violet-300" },
  legendary: { glow: "rgba(245,158,11,0.8)",   border: "rgba(245,158,11,0.6)", bg: "rgba(245,158,11,0.12)", label: "LEGENDARY", labelColor: "text-amber-300" },
  epic:      { glow: "rgba(147,51,234,0.7)",    border: "rgba(147,51,234,0.5)", bg: "rgba(147,51,234,0.10)", label: "EPIC",      labelColor: "text-purple-300" },
  rare:      { glow: "rgba(59,130,246,0.6)",    border: "rgba(59,130,246,0.4)", bg: "rgba(59,130,246,0.08)", label: "RARE",      labelColor: "text-blue-300" },
  common:    { glow: "rgba(148,163,184,0.25)",  border: "rgba(148,163,184,0.2)", bg: "rgba(148,163,184,0.05)", label: "COMMON",  labelColor: "text-slate-400" },
};

const RARITY_ORBS: Record<string, { inner: string; outer: string }> = {
  cosmic:    { inner: "radial-gradient(circle at 35% 30%, #c084fc, #7c3aed 55%, #4c1d95)", outer: "rgba(139,92,246,0.5)" },
  legendary: { inner: "radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 55%, #92400e)", outer: "rgba(245,158,11,0.5)" },
  epic:      { inner: "radial-gradient(circle at 35% 30%, #c084fc, #9333ea 55%, #581c87)", outer: "rgba(147,51,234,0.5)" },
  rare:      { inner: "radial-gradient(circle at 35% 30%, #93c5fd, #3b82f6 55%, #1e3a8a)", outer: "rgba(59,130,246,0.5)" },
  common:    { inner: "radial-gradient(circle at 35% 30%, #e2e8f0, #94a3b8 55%, #475569)", outer: "rgba(148,163,184,0.3)" },
};

const GIFT_SPRITE_MAP: Record<string, [number, number]> = {
  "Сердечко": [2,3], "Звёздочка": [6,4], "Цветок сакуры": [0,0], "Пончик": [2,1], "Котёнок": [6,0],
  "Воздушный шар": [1,1], "Пицца": [2,1], "Торт": [2,1], "Луна": [6,4], "Корона": [3,0],
  "Красная роза": [0,0], "Бриллиант": [2,0], "Ракета": [1,0], "Гитара": [6,3], "Кубок": [6,2],
  "Молния": [1,3], "Попугай": [6,0], "Дракон": [5,0], "Единорог": [5,0], "Феникс": [1,0],
  "Планета": [0,3], "Волшебство": [5,0], "Кристалл": [2,0], "Галактика": [0,3], "Ангел": [5,0],
  "Пульс": [3,4], "Нейтронная звезда": [0,3], "Чёрная дыра": [0,3], "Квазар": [1,3],
  "Корона Prime": [3,0], "Пульс Сердца": [2,3], "Звезда Prime": [6,2],
};
const COLS = 7;
const ROWS = 5;

function getAnimation(animationType: string, rarity: string) {
  const base = {
    hearts:    { animate: { scale: [1,1.25,0.92,1.15,1], rotate: [0,-12,12,-6,0] }, transition: { duration: 1.6, repeat: Infinity } },
    fireworks: { animate: { scale: [1,1.5,0.82,1.28,1], rotate: [0,22,-22,12,0] }, transition: { duration: 1.1, repeat: Infinity } },
    stars:     { animate: { rotate: [0,360], scale: [1,1.2,0.95,1.1,1] }, transition: { duration: 2.2, repeat: Infinity, ease: "linear" as const } },
    sparkle:   { animate: { scale: [1,1.35,0.88,1.22,1], rotate: [0,8,-8,0] }, transition: { duration: 1.4, repeat: Infinity } },
    diamonds:  { animate: { rotate: [0,25,-25,12,0], scale: [1,1.38,0.88,1.22,1] }, transition: { duration: 1.8, repeat: Infinity } },
    lightning: { animate: { scale: [1,1.5,0.82,1.3,1], x: [-3,3,-3,2,0] }, transition: { duration: 0.7, repeat: Infinity, repeatDelay: 1.0 } },
    galaxy:    { animate: { rotate: [0,360], scale: [1,1.1,0.94,1.06,1] }, transition: { duration: 3.5, repeat: Infinity, ease: "linear" as const } },
    supernova: { animate: { scale: [1,1.65,0.75,1.4,0.92,1], rotate: [0,15,-10,5,0] }, transition: { duration: 1.6, repeat: Infinity, repeatDelay: 0.4 } },
    vortex:    { animate: { rotate: [0,360], scale: [1,1.15,0.9,1.08,1] }, transition: { duration: 1.2, repeat: Infinity, ease: "linear" as const } },
    magic:     { animate: { rotate: [0,360], scale: [1,1.25,0.92,1.15,1] }, transition: { duration: 1.6, repeat: Infinity } },
    flame:     { animate: { scale: [1,1.2,0.9,1.15,1], rotate: [-5,5,-4,4,-5], y: [0,-6,2,-4,0] }, transition: { duration: 0.8, repeat: Infinity } },
    bounce:    { animate: { y: [0,-18,3,-11,0], scale: [1,0.9,1.1,0.95,1] }, transition: { duration: 1.0, repeat: Infinity } },
    confetti:  { animate: { y: [0,-15,4,-9,0], rotate: [0,15,-15,8,0], scale: [1,1.08,0.95,1.05,1] }, transition: { duration: 1.3, repeat: Infinity } },
    balloons:  { animate: { y: [0,-20,-5,-14,0], rotate: [-6,6,-5,5,-6] }, transition: { duration: 2.6, repeat: Infinity } },
  } as Record<string, any>;

  const slow = rarity === "common" || rarity === "rare";
  const anim = base[animationType] || { animate: { y: [0,-10,0], rotate: [0,5,-5,0] }, transition: { duration: 2, repeat: Infinity } };
  if (slow && anim.transition) {
    return { ...anim, transition: { ...anim.transition, duration: (anim.transition.duration || 2) * 1.5 } };
  }
  return anim;
}

function GiftOrb({ gift, size }: { gift: ShowcaseGift; size: number }) {
  const spriteCoords = GIFT_SPRITE_MAP[gift.name];
  const cfg = RARITY_CONFIG[gift.rarity] || RARITY_CONFIG.common;
  const orb = RARITY_ORBS[gift.rarity] || RARITY_ORBS.common;
  const anim = getAnimation(gift.animation_type, gift.rarity);
  const isHigh = ["epic","legendary","cosmic"].includes(gift.rarity);
  const isTop = ["legendary","cosmic"].includes(gift.rarity);
  const radius = Math.round(size * 0.22);
  const shimmerDelay = isTop ? 1.2 : isHigh ? 2.5 : 5;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {isHigh && (
        <motion.div
          style={{
            position: "absolute",
            inset: -Math.round(size * 0.2),
            borderRadius: "50%",
            background: cfg.glow,
            filter: `blur(${Math.round(size * 0.28)}px)`,
            zIndex: 0,
          }}
          animate={{ opacity: [0.2, 0.65, 0.2], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: isTop ? 1.6 : 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <motion.div
        {...anim}
        style={{ position: "relative", zIndex: 1 }}
      >
        {spriteCoords ? (
          <div
            style={{
              width: size,
              height: size,
              borderRadius: radius,
              backgroundImage: "url('/gift-sprite.png')",
              backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
              backgroundPosition: `${(spriteCoords[0] / (COLS - 1)) * 100}% ${(spriteCoords[1] / (ROWS - 1)) * 100}%`,
              backgroundRepeat: "no-repeat",
              boxShadow: `0 ${Math.round(size * 0.06)}px ${Math.round(size * 0.25)}px rgba(0,0,0,0.5), 0 0 ${Math.round(size * 0.25)}px ${cfg.glow}`,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <motion.div
              style={{
                position: "absolute", top: 0, width: "55%", height: "100%",
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)",
                transform: "skewX(-20deg)", pointerEvents: "none",
              }}
              animate={{ x: ["-110%", "280%"] }}
              transition={{ duration: 1.4, repeat: Infinity, repeatDelay: shimmerDelay, ease: "easeInOut" }}
            />
          </div>
        ) : (
          <div
            style={{
              width: size,
              height: size,
              borderRadius: radius,
              background: orb.inner,
              boxShadow: `0 0 ${Math.round(size*0.3)}px ${orb.outer}, 0 0 ${Math.round(size*0.6)}px ${cfg.glow}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: Math.round(size * 0.52),
              lineHeight: 1,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <span style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.5))" }}>{gift.emoji}</span>
            <motion.div
              style={{
                position: "absolute", top: 0, width: "55%", height: "100%",
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
                transform: "skewX(-20deg)", pointerEvents: "none",
              }}
              animate={{ x: ["-110%", "280%"] }}
              transition={{ duration: 1.4, repeat: Infinity, repeatDelay: shimmerDelay, ease: "easeInOut" }}
            />
          </div>
        )}
      </motion.div>
      {isHigh && (
        <motion.div
          style={{
            position: "absolute",
            inset: -2,
            borderRadius: radius + 2,
            border: `${isTop ? 2 : 1.5}px solid ${cfg.border}`,
            zIndex: 2,
            pointerEvents: "none",
          }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.96, 1.04, 0.96] }}
          transition={{ duration: isTop ? 1.4 : 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

export function GiftShowcase({ userId }: { userId: number }) {
  const [gifts, setGifts] = useState<ShowcaseGift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const token = sessionStorage.getItem("pulse-token");
    fetch(`/api/users/${userId}/gift-showcase`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setGifts(Array.isArray(data) ? data : []))
      .catch(() => setGifts([]))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="rounded-3xl bg-card border border-border p-4">
        <div className="flex gap-3 justify-center">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-14 h-14 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (gifts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-card border border-border overflow-hidden"
    >
      <div className="px-5 pt-4 pb-3 flex items-center gap-2">
        <Sparkles size={13} className="text-amber-400" />
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Витрина подарков</h3>
      </div>
      <div className="px-4 pb-5 flex flex-wrap gap-3 justify-start">
        {gifts.map((gift, idx) => {
          const cfg = RARITY_CONFIG[gift.rarity] || RARITY_CONFIG.common;
          const size = gift.rarity === "cosmic" ? 68 : gift.rarity === "legendary" ? 64 : gift.rarity === "epic" ? 60 : 54;
          return (
            <motion.div
              key={gift.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.07 }}
              className="flex flex-col items-center gap-1.5 cursor-default group"
              title={`${gift.name} (${cfg.label})${gift.count > 1 ? ` × ${gift.count}` : ""}`}
            >
              <div style={{ position: "relative" }}>
                <GiftOrb gift={gift} size={size} />
                {gift.count > 1 && (
                  <div
                    className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[9px] font-black flex items-center justify-center px-1 border-2 border-card z-10"
                  >
                    {gift.count > 99 ? "99+" : gift.count}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className={`text-[9px] font-black uppercase tracking-widest ${cfg.labelColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  {cfg.label}
                </span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-[68px] truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {gift.name}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
