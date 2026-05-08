import React, { useState, useEffect } from "react";
import { useGetGiftCatalog, useGetSentGifts, useGetReceivedGifts, GiftItem, Gift } from "@workspace/api-client-react";
import { Sparkles, ArrowUpRight, ArrowDownLeft, Gift as GiftIcon, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";

const RARITY_CONFIG: Record<string, { gradient: string; glow: string; badge: string; label: string }> = {
  legendary: {
    gradient: 'from-yellow-300 via-orange-400 to-red-500',
    glow: 'shadow-[0_0_30px_rgba(251,191,36,0.5)] hover:shadow-[0_0_50px_rgba(251,191,36,0.7)]',
    badge: 'bg-yellow-500/30 text-yellow-300 border-yellow-400/50',
    label: 'LEGENDARY',
  },
  epic: {
    gradient: 'from-purple-400 via-pink-500 to-purple-700',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_35px_rgba(168,85,247,0.6)]',
    badge: 'bg-purple-500/30 text-purple-300 border-purple-400/50',
    label: 'EPIC',
  },
  rare: {
    gradient: 'from-blue-400 via-cyan-400 to-teal-500',
    glow: 'shadow-[0_0_12px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]',
    badge: 'bg-blue-500/30 text-blue-300 border-blue-400/50',
    label: 'RARE',
  },
  common: {
    gradient: 'from-slate-400 via-slate-500 to-slate-600',
    glow: 'shadow-[0_0_6px_rgba(100,116,139,0.2)] hover:shadow-[0_0_15px_rgba(100,116,139,0.3)]',
    badge: 'bg-slate-500/30 text-slate-300 border-slate-400/50',
    label: 'COMMON',
  },
};

function getEmojiAnimation(animationType: string) {
  switch (animationType) {
    case 'hearts':
      return { animate: { scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] }, transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } };
    case 'fireworks':
      return { animate: { scale: [1, 1.4, 0.9, 1.2, 1], rotate: [0, 15, -15, 8, 0] }, transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } };
    case 'stars':
      return { animate: { rotate: [0, 360], scale: [1, 1.2, 1] }, transition: { duration: 3, repeat: Infinity, ease: 'linear' } };
    case 'sparkle':
      return { animate: { scale: [1, 1.25, 1, 1.15, 1], filter: ['brightness(1)', 'brightness(1.8)', 'brightness(1)'] }, transition: { duration: 1.8, repeat: Infinity } };
    case 'confetti':
      return { animate: { y: [0, -12, 0], rotate: [0, 10, -10, 0] }, transition: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } };
    case 'balloons':
      return { animate: { y: [0, -15, 0], rotate: [-5, 5, -5] }, transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } };
    case 'roses':
      return { animate: { rotate: [-8, 8, -8], scale: [1, 1.1, 1] }, transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } };
    case 'diamonds':
      return { animate: { rotate: [0, 20, -20, 0], scale: [1, 1.3, 1] }, transition: { duration: 2.2, repeat: Infinity } };
    case 'snowflake':
      return { animate: { rotate: [0, 360], y: [0, 8, 0] }, transition: { rotate: { duration: 6, repeat: Infinity, ease: 'linear' }, y: { duration: 2, repeat: Infinity } } };
    case 'rainbow':
      return { animate: { scale: [1, 1.15, 1], filter: ['hue-rotate(0deg)', 'hue-rotate(360deg)'] }, transition: { duration: 3, repeat: Infinity } };
    case 'lightning':
      return { animate: { scale: [1, 1.3, 1, 1.2, 1], rotate: [0, -5, 5, 0] }, transition: { duration: 0.8, repeat: Infinity, repeatDelay: 1 } };
    case 'flame':
      return { animate: { scale: [1, 1.2, 0.95, 1.15, 1], rotate: [-3, 3, -3] }, transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' } };
    case 'magic':
      return { animate: { rotate: [0, 360], scale: [1, 1.2, 1] }, transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } };
    case 'galaxy':
      return { animate: { rotate: [0, 360], scale: [1, 1.1, 1] }, transition: { duration: 5, repeat: Infinity, ease: 'linear' } };
    case 'neon':
      return { animate: { scale: [1, 1.05, 1], filter: ['brightness(1)', 'brightness(2)', 'brightness(1)'] }, transition: { duration: 1.2, repeat: Infinity } };
    case 'wave':
      return { animate: { y: [0, -8, 4, -4, 0], rotate: [0, 5, -5, 0] }, transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } };
    case 'music':
      return { animate: { rotate: [-10, 10, -10], scale: [1, 1.15, 1] }, transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } };
    case 'butterfly':
      return { animate: { scaleX: [1, 0.6, 1, 0.6, 1], y: [0, -10, 0] }, transition: { scaleX: { duration: 0.6, repeat: Infinity }, y: { duration: 2, repeat: Infinity } } };
    case 'tropical':
      return { animate: { rotate: [-5, 5, -5], scale: [1, 1.1, 1] }, transition: { duration: 1.5, repeat: Infinity } };
    case 'crystal':
      return { animate: { rotate: [0, 15, -15, 0], scale: [1, 1.2, 1], filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'] }, transition: { duration: 2, repeat: Infinity } };
    case 'ice':
      return { animate: { scale: [1, 1.1, 1], filter: ['brightness(1)', 'brightness(1.4)', 'brightness(1)'], rotate: [0, 5, -5, 0] }, transition: { duration: 2.5, repeat: Infinity } };
    case 'aurora':
      return { animate: { scale: [1, 1.15, 1], filter: ['hue-rotate(0deg) brightness(1)', 'hue-rotate(60deg) brightness(1.3)', 'hue-rotate(0deg) brightness(1)'] }, transition: { duration: 3, repeat: Infinity } };
    case 'explosion':
      return { animate: { scale: [1, 1.5, 0.8, 1.3, 1], rotate: [0, -20, 20, -10, 0] }, transition: { duration: 1.5, repeat: Infinity, repeatDelay: 0.5 } };
    case 'wind':
      return { animate: { x: [0, 8, -4, 6, 0], rotate: [-5, 10, -10, 5, 0] }, transition: { duration: 2, repeat: Infinity } };
    case 'candy':
      return { animate: { rotate: [0, 30, -30, 0], scale: [1, 1.2, 1] }, transition: { duration: 1.5, repeat: Infinity } };
    default:
      return { animate: { y: [0, -10, 0], rotate: [0, 5, -5, 0] }, transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } };
  }
}

function FloatingParticles({ rarity }: { rarity: string }) {
  const colors: Record<string, string[]> = {
    legendary: ['#fbbf24', '#f59e0b', '#ef4444', '#fcd34d'],
    epic: ['#a855f7', '#ec4899', '#8b5cf6', '#c084fc'],
    rare: ['#3b82f6', '#06b6d4', '#0ea5e9', '#22d3ee'],
    common: ['#94a3b8', '#64748b', '#cbd5e1', '#e2e8f0'],
  };
  const particleColors = colors[rarity] || colors.common;
  const count = rarity === 'legendary' ? 8 : rarity === 'epic' ? 6 : rarity === 'rare' ? 4 : 2;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
          style={{
            top: '50%',
            left: '50%',
            backgroundColor: particleColors[i % particleColors.length],
          }}
          animate={{
            x: [0, Math.cos(i * (360 / count) * Math.PI / 180) * 40, 0],
            y: [0, Math.sin(i * (360 / count) * Math.PI / 180) * 40, 0],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: i * 0.3,
            ease: 'easeInOut',
          }}
        />
      ))}
    </>
  );
}

function GiftCard({ item, onClick }: { item: GiftItem; onClick: () => void }) {
  const cfg = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
  const emojiAnim = getEmojiAnimation(item.animationType);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={`relative cursor-pointer rounded-2xl overflow-hidden transition-shadow duration-300 ${cfg.glow}`}
      data-testid={`gift-card-${item.id}`}
    >
      <div className={`p-[1.5px] rounded-2xl bg-gradient-to-br ${cfg.gradient}`}>
        <div className="bg-[hsl(222,47%,13%)] rounded-2xl p-4 flex flex-col items-center justify-center text-center min-h-[160px] relative overflow-hidden">
          {hovered && item.rarity !== 'common' && (
            <FloatingParticles rarity={item.rarity} />
          )}

          <motion.span
            className="text-5xl mb-3 filter drop-shadow-lg inline-block relative z-10"
            {...emojiAnim}
          >
            {item.emoji}
          </motion.span>

          <h3 className="font-bold text-sm mb-1 leading-tight relative z-10">{item.name}</h3>
          <div className="flex items-center gap-1 text-yellow-400 font-medium text-xs relative z-10">
            <Sparkles size={11} />
            <span>{item.stars}</span>
          </div>

          <span className={`absolute top-2 left-2 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function CelebrationOverlay({ animationType, onDone }: { animationType: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  const particleCount = 40;
  const colors: Record<string, string[]> = {
    hearts: ['❤️', '💕', '💖', '💗', '💓'],
    fireworks: ['🎆', '🎇', '✨', '💥', '⭐'],
    confetti: ['🎊', '🎉', '🎈', '🌟', '💛', '💚', '💜', '🧡'],
    stars: ['⭐', '🌟', '✨', '💫', '🌠'],
    balloons: ['🎈', '🎀', '🎉', '🥳', '🎊'],
    sparkle: ['✨', '💫', '⚡', '🌟', '💥'],
    roses: ['🌹', '💐', '🌸', '🌺', '🌷'],
    diamonds: ['💎', '💍', '👑', '✨', '🌟'],
    snowflake: ['❄️', '⛄', '🌨️', '☃️', '🌬️'],
    rainbow: ['🌈', '🦄', '🌟', '✨', '💫'],
    lightning: ['⚡', '🌩️', '💥', '🔆', '✨'],
    flame: ['🔥', '💥', '✨', '🌟', '⚡'],
    magic: ['✨', '🪄', '🔮', '💫', '🌟'],
    galaxy: ['🌌', '⭐', '💫', '🌠', '🪐'],
    aurora: ['🌌', '✨', '💫', '🌈', '🌟'],
    explosion: ['💥', '🔥', '⚡', '💫', '✨'],
    neon: ['💡', '✨', '⚡', '🌟', '💫'],
    music: ['🎵', '🎶', '🎸', '🎹', '🎺'],
    butterfly: ['🦋', '🌸', '🌺', '✨', '💫'],
    tropical: ['🌺', '🌴', '🍍', '🌊', '☀️'],
    crystal: ['💎', '💠', '🔷', '✨', '🌟'],
    ice: ['❄️', '💎', '🌨️', '☃️', '🔷'],
    wave: ['🌊', '💦', '🌀', '🫧', '✨'],
    wind: ['🌬️', '🪁', '🍃', '🌀', '💨'],
    candy: ['🍭', '🍬', '🍫', '🎉', '🌈'],
  };

  const emojis = colors[animationType] || colors.confetti;

  return (
    <motion.div
      className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {Array.from({ length: particleCount }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-3xl"
          style={{ top: '50%', left: '50%' }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.5, rotate: 0 }}
          animate={{
            x: (Math.random() - 0.5) * window.innerWidth * 1.5,
            y: (Math.random() - 0.5) * window.innerHeight * 1.5,
            opacity: [1, 1, 0],
            scale: [0.5, 1.5 + Math.random(), 0],
            rotate: Math.random() * 720 - 360,
          }}
          transition={{ duration: 2 + Math.random() * 1.5, ease: 'easeOut' }}
        >
          {emojis[i % emojis.length]}
        </motion.div>
      ))}
      <motion.div
        className="text-center z-10"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="bg-black/60 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
          <div className="text-6xl mb-3">🎁</div>
          <div className="text-2xl font-black text-white">Gift Sent!</div>
          <div className="text-sm text-white/60 mt-1">Your gift is on its way</div>
        </div>
      </motion.div>
    </motion.div>
  );
}

const RARITY_ORDER = ['legendary', 'epic', 'rare', 'common'];

export default function Gifts() {
  const { data: catalog, isLoading: catalogLoading } = useGetGiftCatalog();
  const { data: receivedGifts, isLoading: receivedLoading } = useGetReceivedGifts();
  const { data: sentGifts, isLoading: sentLoading } = useGetSentGifts();

  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationAnim, setCelebrationAnim] = useState('confetti');

  const filtered = catalog?.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRarity = filterRarity === 'all' || item.rarity === filterRarity;
    return matchSearch && matchRarity;
  }).sort((a, b) => {
    const ra = RARITY_ORDER.indexOf(a.rarity);
    const rb = RARITY_ORDER.indexOf(b.rarity);
    return ra - rb;
  });

  const getRarityColor = (rarity: string) => RARITY_CONFIG[rarity] || RARITY_CONFIG.common;

  const handleSendGift = () => {
    if (!selectedGift) return;
    setCelebrationAnim(selectedGift.animationType);
    setSelectedGift(null);
    setShowCelebration(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <AnimatePresence>
        {showCelebration && (
          <CelebrationOverlay
            animationType={celebrationAnim}
            onDone={() => setShowCelebration(false)}
          />
        )}
      </AnimatePresence>

      <header className="h-16 border-b border-border flex items-center px-6 justify-between bg-card/80 backdrop-blur-md z-10 shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <GiftIcon className="text-primary" size={20} /> Gifts
        </h1>
        <div className="text-sm text-muted-foreground">
          {catalog?.length ?? 0} gifts available
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full scrollbar-thin">
        <Tabs defaultValue="catalog" className="w-full max-w-6xl mx-auto">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex justify-center">
              <TabsList className="bg-card border border-border h-11 p-1">
                <TabsTrigger value="catalog" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5 py-1.5 rounded-lg transition-all text-sm">
                  <Sparkles size={14} className="mr-1.5" /> Catalog
                </TabsTrigger>
                <TabsTrigger value="received" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5 py-1.5 rounded-lg transition-all text-sm">
                  <ArrowDownLeft size={14} className="mr-1.5" /> Received
                </TabsTrigger>
                <TabsTrigger value="sent" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5 py-1.5 rounded-lg transition-all text-sm">
                  <ArrowUpRight size={14} className="mr-1.5" /> Sent
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="catalog" className="mt-0">
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[160px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search gifts..."
                    className="pl-8 h-9 bg-card border-border text-sm"
                    data-testid="input-gift-search"
                  />
                </div>
                <div className="flex gap-1">
                  {['all', 'legendary', 'epic', 'rare', 'common'].map(r => (
                    <button
                      key={r}
                      onClick={() => setFilterRarity(r)}
                      data-testid={`filter-rarity-${r}`}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                        filterRarity === r
                          ? r === 'all' ? 'bg-primary text-primary-foreground border-primary'
                          : `border ${getRarityColor(r).badge} bg-opacity-40`
                          : 'bg-card border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </div>

          <TabsContent value="catalog" className="mt-0 outline-none">
            {catalogLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {Array.from({ length: 24 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
              </div>
            ) : filtered?.length === 0 ? (
              <div className="text-center text-muted-foreground py-20">No gifts match your search</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filtered?.map(item => (
                  <GiftCard key={item.id} item={item} onClick={() => setSelectedGift(item)} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="received" className="mt-0">
            {receivedLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
              </div>
            ) : !receivedGifts || receivedGifts.length === 0 ? (
              <div className="text-center text-muted-foreground py-20 flex flex-col items-center gap-3">
                <GiftIcon size={48} className="opacity-20" />
                <p className="font-medium">No received gifts yet</p>
                <p className="text-sm opacity-60">When someone sends you a gift, it will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {receivedGifts.map((gift: Gift) => {
                  const cfg = RARITY_CONFIG[gift.giftItem?.rarity || 'common'];
                  return (
                    <motion.div
                      key={gift.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-[1.5px] rounded-2xl bg-gradient-to-br ${cfg.gradient}`}
                    >
                      <div className="bg-card rounded-2xl p-4 flex items-center gap-4">
                        <span className="text-4xl">{gift.giftItem?.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold">{gift.giftItem?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            From {gift.isAnonymous ? 'Anonymous' : (gift.sender?.displayName || 'Unknown')}
                          </p>
                          {gift.message && <p className="text-sm mt-1 italic opacity-80">&quot;{gift.message}&quot;</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(gift.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-400 text-sm font-bold shrink-0">
                          <Sparkles size={14} />{gift.giftItem?.stars}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-0">
            {sentLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
              </div>
            ) : !sentGifts || sentGifts.length === 0 ? (
              <div className="text-center text-muted-foreground py-20 flex flex-col items-center gap-3">
                <ArrowUpRight size={48} className="opacity-20" />
                <p className="font-medium">No sent gifts yet</p>
                <p className="text-sm opacity-60">Send a gift to your contacts from the catalog</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sentGifts.map((gift: Gift) => {
                  const cfg = RARITY_CONFIG[gift.giftItem?.rarity || 'common'];
                  return (
                    <motion.div
                      key={gift.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-[1.5px] rounded-2xl bg-gradient-to-br ${cfg.gradient}`}
                    >
                      <div className="bg-card rounded-2xl p-4 flex items-center gap-4">
                        <span className="text-4xl">{gift.giftItem?.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold">{gift.giftItem?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            To {gift.receiver?.displayName || 'Unknown'}
                          </p>
                          {gift.message && <p className="text-sm mt-1 italic opacity-80">&quot;{gift.message}&quot;</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(gift.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-400 text-sm font-bold shrink-0">
                          <Sparkles size={14} />{gift.giftItem?.stars}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AnimatePresence>
        {selectedGift && (
          <Dialog open onOpenChange={() => setSelectedGift(null)}>
            <DialogContent className="sm:max-w-sm border-none bg-transparent shadow-none p-0" aria-describedby={undefined}>
              <DialogTitle className="sr-only">{selectedGift?.name}</DialogTitle>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <div className={`p-[2px] rounded-3xl bg-gradient-to-br ${getRarityColor(selectedGift.rarity).gradient} relative overflow-hidden`}>
                  <div className="bg-[hsl(222,47%,13%)] rounded-3xl p-6 flex flex-col items-center text-center">
                    <motion.span
                      className="text-8xl mb-4 filter drop-shadow-2xl inline-block"
                      {...getEmojiAnimation(selectedGift.animationType)}
                    >
                      {selectedGift.emoji}
                    </motion.span>
                    <h2 className="text-2xl font-black mb-1">{selectedGift.name}</h2>
                    <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full border mb-3 ${getRarityColor(selectedGift.rarity).badge}`}>
                      {selectedGift.rarity}
                    </span>
                    <p className="text-muted-foreground text-sm mb-5 max-w-xs">{selectedGift.description}</p>

                    <div className="flex items-center justify-between w-full p-3.5 rounded-xl bg-black/30 border border-white/5 mb-5">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">Animation</p>
                        <p className="text-sm font-semibold capitalize">{selectedGift.animationType}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">Price</p>
                        <div className="flex items-center gap-1 text-yellow-400 font-black text-lg">
                          <Sparkles size={16} /> {selectedGift.stars}
                        </div>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSendGift}
                      data-testid="button-send-gift"
                      className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-black text-base hover:opacity-90 transition-opacity shadow-[0_0_25px_rgba(0,188,212,0.4)]"
                    >
                      Send Gift
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
