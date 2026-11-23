import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeftRight, Check, ChevronRight, LockKeyhole, MessageCircle, Sparkles, WandSparkles, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetGiftCatalogQueryKey,
  getGetMessagesQueryKey,
  getGetMeQueryKey,
  getGetMyGiftsQueryKey,
  useExchangeGift,
  useOpenGift,
  useUpgradeGift,
} from "@workspace/api-client-react";
import type { GiftInstance } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import { useLocation } from "wouter";
import { GiftArtwork } from "./GiftArtwork";

type GiftDirection = "received" | "sent";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(date));
}

function messageOf(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}

export function GiftDetailsDialog({
  gift: initialGift,
  direction,
  onClose,
  onGiftChanged,
}: {
  gift: GiftInstance;
  direction: GiftDirection;
  onClose: () => void;
  onGiftChanged?: (gift: GiftInstance) => void;
}) {
  const [gift, setGift] = useState(initialGift);
  const [revealed, setRevealed] = useState(initialGift.inventoryStatus !== "received");
  const [showDetails, setShowDetails] = useState(initialGift.inventoryStatus !== "received");
  const [showExchangeConfirmation, setShowExchangeConfirmation] = useState(false);
  const [busyAction, setBusyAction] = useState<"open" | "upgrade" | "exchange" | null>(null);
  const reducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { setSelectedChatId } = useAppContext();
  const [, navigate] = useLocation();
  const openGift = useOpenGift();
  const upgradeGift = useUpgradeGift();
  const exchangeGift = useExchangeGift();
  const item = gift.giftItem;

  useEffect(() => {
    if (!revealed || showDetails) return;
    const timer = window.setTimeout(() => setShowDetails(true), reducedMotion ? 0 : 1050);
    return () => window.clearTimeout(timer);
  }, [revealed, showDetails, reducedMotion]);

  const refreshGiftQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetMyGiftsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetGiftCatalogQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() }),
      ...(gift.chatId
        ? [queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId: gift.chatId }) })]
        : []),
    ]);
  };

  const open = () => {
    if (busyAction) return;
    setBusyAction("open");
    openGift.mutate({ giftId: gift.id }, {
      onSuccess: async updated => {
        setGift(updated);
        onGiftChanged?.(updated);
        await refreshGiftQueries();
        setRevealed(true);
        toast({ title: "Подарок теперь в вашей коллекции", description: updated.giftItem.name });
        setBusyAction(null);
      },
      onError: error => {
        toast({ title: "Не удалось открыть подарок", description: messageOf(error), variant: "destructive" });
        setBusyAction(null);
      },
    });
  };

  const upgrade = () => {
    if (busyAction) return;
    setBusyAction("upgrade");
    upgradeGift.mutate({ giftId: gift.id }, {
      onSuccess: async updated => {
        setGift(updated);
        onGiftChanged?.(updated);
        await refreshGiftQueries();
        toast({ title: "Подарок улучшен", description: "В коллекции появилась новая версия." });
        setBusyAction(null);
      },
      onError: error => {
        toast({ title: "Не удалось улучшить подарок", description: messageOf(error), variant: "destructive" });
        setBusyAction(null);
      },
    });
  };

  const exchange = () => {
    if (busyAction || !canManage) return;
    setShowExchangeConfirmation(true);
  };

  const confirmExchange = () => {
    if (busyAction || !canManage) return;
    setShowExchangeConfirmation(false);
    setBusyAction("exchange");
    exchangeGift.mutate({ giftId: gift.id }, {
      onSuccess: async result => {
        setGift(result.gift);
        onGiftChanged?.(result.gift);
        await refreshGiftQueries();
        toast({ title: "Подарок обменян", description: `На баланс начислено ${result.balance} Nova.` });
        setBusyAction(null);
      },
      onError: error => {
        toast({ title: "Не удалось обменять подарок", description: messageOf(error), variant: "destructive" });
        setBusyAction(null);
      },
    });
  };

  const openChat = () => {
    if (!gift.chatId) return;
    setSelectedChatId(gift.chatId);
    navigate("/");
    onClose();
  };

  const canManage = direction === "received" && gift.inventoryStatus === "collected";
  const exchanged = gift.inventoryStatus === "exchanged";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onMouseDown={event => { if (event.target === event.currentTarget && !busyAction) onClose(); }}
        data-testid="dialog-gift-details"
      >
        <motion.section
          role="dialog" aria-modal="true" aria-labelledby="gift-detail-title"
          className="relative max-h-[94dvh] w-full max-w-[470px] overflow-y-auto rounded-t-[30px] border border-white/10 bg-card shadow-[0_30px_100px_rgba(0,0,0,.5)] sm:rounded-[30px]"
          initial={reducedMotion ? false : { opacity: 0, y: 28, scale: .97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: .98 }}
          transition={{ type: "spring", damping: 28, stiffness: 310 }}
        >
          <button type="button" onClick={onClose} disabled={!!busyAction} aria-label="Закрыть"
            className="absolute right-4 top-4 z-20 rounded-full border border-white/10 bg-background/70 p-2 text-muted-foreground transition hover:text-foreground disabled:opacity-40"
            data-testid="button-close-gift-details"><X size={17} /></button>
          <div className={`gift-dialog-hero relative flex h-[250px] items-center justify-center overflow-hidden ${`gift-rarity-${item.rarity}`}`}>
            <div className="gift-dialog-halo absolute h-48 w-48 rounded-full" aria-hidden="true" />
            {!showDetails && (
              <motion.div
                className="absolute inset-0 z-10"
                initial={{ opacity: 0 }} animate={{ opacity: revealed ? 1 : 0 }} transition={{ duration: .3 }}
                aria-hidden="true"
              >
                <div className="gift-reveal-sparks absolute inset-0" />
              </motion.div>
            )}
            <AnimatePresence mode="wait">
              {showDetails ? (
                <motion.div key="art"
                  initial={reducedMotion ? false : { opacity: 0, scale: .5, rotate: -16 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="relative z-10 flex h-40 w-40 items-center justify-center"
                >
                  <GiftArtwork item={item} className="gift-art h-36 w-36 drop-shadow-[0_20px_24px_rgba(0,0,0,.4)]" />
                </motion.div>
              ) : (
                <motion.div key="sealed"
                  initial={reducedMotion ? false : { scale: .9, opacity: .65 }}
                  animate={revealed ? { scale: [1, 1.12, .92, 1.22], opacity: 1, rotate: [0, -5, 5, 0] } : { scale: 1, opacity: 1 }}
                  transition={revealed ? { duration: reducedMotion ? 0 : .9, ease: "easeInOut" } : { duration: .3 }}
                  className="relative z-10 flex h-36 w-36 items-center justify-center rounded-[34px] border border-white/20 bg-card/70 shadow-2xl"
                >
                  <GiftArtwork item={item} className="h-28 w-28 object-contain opacity-90" />
                </motion.div>
              )}
            </AnimatePresence>
            {revealed && <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-4 right-5 z-10 rounded-full bg-black/25 px-3 py-1 text-[11px] font-bold text-white/80" data-testid="text-gift-serial">
              {gift.serialNumber ? `№ ${gift.serialNumber}` : item.isCollectible ? "Коллекционный экземпляр" : "Память из чата"}
            </motion.span>}
          </div>

          <AnimatePresence mode="wait">
            {showDetails ? (
              <motion.div key="details" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25 }} className="px-5 pb-5 pt-4 sm:px-7">
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-[.22em] text-primary/80" data-testid="status-gift-collection">
                    {gift.inventoryStatus === "collected" ? "Сохранено в коллекции" : exchanged ? "Обмен завершён" : direction === "sent" ? "Отправленный подарок" : "Подарок"}
                  </p>
                  <h2 id="gift-detail-title" className="mt-1 text-[25px] font-black tracking-tight text-foreground" data-testid="text-gift-detail-name">{item.name}</h2>
                  <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground" data-testid="text-gift-description">{item.description}</p>
                  {gift.message && <blockquote className="mx-auto mt-4 max-w-sm rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm leading-relaxed text-foreground/90" data-testid="text-gift-message">“{gift.message}”</blockquote>}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-border/70 bg-background/55 p-3" data-testid="text-gift-sender">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{direction === "received" ? "От кого" : "Получатель"}</span>
                    <p className="mt-1 truncate text-sm font-bold">{direction === "received" ? gift.senderName : gift.receiverName}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/55 p-3" data-testid="text-gift-date">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Получен</span>
                    <p className="mt-1 truncate text-sm font-bold">{formatDate(gift.createdAt)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/55 p-3" data-testid="text-gift-original-price">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Стоимость</span>
                    <p className="mt-1 text-sm font-extrabold text-amber-300">{item.price.toLocaleString("ru-RU")} Nova</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/55 p-3" data-testid="text-gift-supply">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Тираж</span>
                    <p className="mt-1 truncate text-sm font-bold">
                      {item.maxSupply === null ? "Без лимита" : `${item.soldCount.toLocaleString("ru-RU")} из ${item.maxSupply.toLocaleString("ru-RU")}`}
                      {item.availableCount !== null && <span className="ml-1 text-[11px] font-medium text-muted-foreground">· осталось {item.availableCount.toLocaleString("ru-RU")}</span>}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2" data-testid="gift-attributes">
                  <span className="rounded-full border border-border/70 bg-background/45 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground" data-testid="status-gift-collectible">
                    {item.isCollectible ? <><LockKeyhole className="mr-1 inline" size={12} /> Коллекционный</> : "Не коллекционный"}
                  </span>
                  {item.primeOnly && <span className="rounded-full bg-violet-400/10 px-3 py-1.5 text-[11px] font-bold text-violet-300" data-testid="status-gift-prime">Nova Prime</span>}
                  {gift.isUpgraded && <span className="rounded-full bg-violet-400/10 px-3 py-1.5 text-[11px] font-bold text-violet-300" data-testid="status-gift-upgraded">Улучшен</span>}
                  <span className="rounded-full bg-secondary/70 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground" data-testid="status-gift-inventory">{exchanged ? "Обменян" : gift.inventoryStatus === "collected" ? "В коллекции" : "Не открыт"}</span>
                </div>

                {gift.chatId && <button type="button" onClick={openChat} className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-left transition hover:bg-primary/10" data-testid="button-open-gift-chat">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><MessageCircle size={17} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-foreground">Вернуться в разговор</span><span className="mt-0.5 block text-[10px] text-muted-foreground">Подарок пришёл из этого чата</span></span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>}

                {direction === "received" && !exchanged && (
                  <div className="mt-4 flex flex-col gap-2">
                    {gift.inventoryStatus === "received" ? (
                      <button type="button" onClick={open} disabled={!!busyAction} className="gift-primary-action" data-testid="button-open-gift">
                        <Sparkles size={16} /> {busyAction === "open" ? "Открываем…" : "Открыть и сохранить"}
                      </button>
                    ) : (
                      <>
                        {item.isCollectible && !gift.isUpgraded && <button type="button" onClick={upgrade} disabled={!!busyAction || item.upgradePrice <= 0} className="gift-primary-action" data-testid="button-upgrade-gift">
                          <WandSparkles size={16} /> {busyAction === "upgrade" ? "Улучшаем…" : <>Улучшить <span className="ml-auto">{item.upgradePrice.toLocaleString("ru-RU")} Nova</span></>}
                        </button>}
                        {item.exchangeValue > 0 && (showExchangeConfirmation ? (
                          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[.06] p-3" data-testid="panel-confirm-gift-exchange">
                            <p className="text-xs font-semibold leading-relaxed text-foreground">Подарок исчезнет из коллекции. На баланс поступит {item.exchangeValue.toLocaleString("ru-RU")} Nova.</p>
                            <div className="mt-3 flex gap-2">
                              <button type="button" onClick={() => setShowExchangeConfirmation(false)} disabled={!!busyAction} className="flex-1 rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary disabled:opacity-50" data-testid="button-cancel-gift-exchange">Оставить подарок</button>
                              <button type="button" onClick={confirmExchange} disabled={!!busyAction} className="flex-1 rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-black hover:bg-amber-300 disabled:opacity-50" data-testid="button-confirm-gift-exchange">
                                {busyAction === "exchange" ? "Обмениваем…" : "Подтвердить обмен"}
                              </button>
                            </div>
                          </div>
                        ) : <button type="button" onClick={exchange} disabled={!!busyAction} className="gift-secondary-action" data-testid="button-exchange-gift">
                          <ArrowLeftRight size={16} /> Обменять на <span className="ml-auto">{item.exchangeValue.toLocaleString("ru-RU")} Nova</span>
                        </button>)}
                        {!item.isCollectible && item.exchangeValue <= 0 && <p className="rounded-xl bg-secondary/50 p-3 text-center text-xs text-muted-foreground" data-testid="text-gift-no-actions"><Check className="mr-1 inline" size={14} /> Подарок сохранён как памятный предмет</p>}
                      </>
                    )}
                    {canManage && <p className="text-center text-[10px] text-muted-foreground" data-testid="text-gift-action-note">Обмен удалит подарок из коллекции</p>}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="reveal-copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 pb-7 pt-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-[.22em] text-primary/80">Для вас</p>
                <h2 id="gift-detail-title" className="mt-1 text-xl font-black" data-testid="text-gift-reveal-title">{item.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground" data-testid="text-gift-reveal-sender">Отправитель: {gift.senderName}</p>
                {gift.inventoryStatus === "received" && <button type="button" onClick={open} disabled={!!busyAction} className="gift-primary-action mt-5" data-testid="button-open-gift">
                  <Sparkles size={16} /> {busyAction === "open" ? "Открываем…" : "Открыть подарок"}
                </button>}
                {busyAction === "open" && <p className="mt-3 text-[11px] text-muted-foreground" role="status" data-testid="status-gift-opening">Подарок раскрывается…</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}
