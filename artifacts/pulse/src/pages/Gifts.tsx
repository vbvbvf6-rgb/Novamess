import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Gift, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetGiftCatalogQueryKey,
  getGetMyGiftsQueryKey,
  useGetGiftCatalog,
  useGetMyGifts,
} from "@workspace/api-client-react";
import type { GiftInstance } from "@workspace/api-client-react";
import { GiftCollectionCard } from "@/components/gifts/GiftCollectionCard";
import { GiftDetailsDialog } from "@/components/gifts/GiftDetailsDialog";
import "@/components/gifts/gifts.css";

type CollectionTab = "received" | "sent";
type SelectedGift = { gift: GiftInstance; direction: CollectionTab };

export default function Gifts() {
  const [tab, setTab] = useState<CollectionTab>("received");
  const [search, setSearch] = useState("");
  const [selectedGift, setSelectedGift] = useState<SelectedGift | null>(null);
  const queryClient = useQueryClient();
  const reducedMotion = useReducedMotion();
  const giftsQuery = useGetMyGifts({ query: { queryKey: getGetMyGiftsQueryKey(), staleTime: 30_000 } });
  const catalogQuery = useGetGiftCatalog({ query: { queryKey: getGetGiftCatalogQueryKey(), staleTime: 60_000 } });

  const received = giftsQuery.data?.received ?? [];
  const sent = giftsQuery.data?.sent ?? [];
  const source = tab === "received" ? received : sent;
  const filtered = useMemo(() => source.filter(gift => {
    const term = search.trim().toLocaleLowerCase("ru");
    return !term || gift.giftItem.name.toLocaleLowerCase("ru").includes(term) ||
      gift.senderName.toLocaleLowerCase("ru").includes(term) ||
      gift.receiverName.toLocaleLowerCase("ru").includes(term);
  }), [source, search]);
  const collectibleCount = received.filter(gift => gift.giftItem.isCollectible && gift.inventoryStatus !== "exchanged").length;

  const retry = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetMyGiftsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetGiftCatalogQueryKey() }),
    ]);
  };

  return (
    <main className="gifts-page flex min-h-[100dvh] min-w-0 flex-1 flex-col overflow-y-auto bg-background" data-testid="page-gifts">
      <header className="sticky top-0 z-20 flex min-h-[calc(4rem+env(safe-area-inset-top,0px))] shrink-0 items-center justify-between border-b border-border/70 bg-background/90 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] border border-primary/15 bg-primary/10 text-primary"><Gift size={19} /></span>
          <div className="min-w-0"><h1 className="truncate text-lg font-black tracking-tight sm:text-xl">Подарки</h1><p className="truncate text-[11px] text-muted-foreground">Моменты, которые остаются с вами</p></div>
        </div>
        <button type="button" onClick={retry} aria-label="Обновить коллекцию" className="rounded-xl p-2.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground" data-testid="button-refresh-gifts">
          <RefreshCw size={16} className={giftsQuery.isFetching ? "animate-spin" : ""} />
        </button>
      </header>

      <div className="mx-auto w-full max-w-[1220px] px-4 pb-28 pt-5 sm:px-7 sm:pt-7">
        <motion.section initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="gift-collection-banner relative mb-6 overflow-hidden rounded-[28px] border border-primary/15 p-5 sm:p-7" data-testid="section-gift-collection-intro">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-primary"><Sparkles size={13} /> Личная коллекция</p>
              <h2 className="mt-3 max-w-lg text-[30px] font-black leading-[1.04] tracking-[-.04em] text-foreground sm:text-[40px]" data-testid="text-gifts-headline">Небольшие знаки.<br /><span className="text-primary">Большие истории.</span></h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">Каждый подарок хранит чей-то жест, слова и момент из разговора.</p>
            </div>
            <div className="flex gap-2">
              <div className="min-w-[114px] rounded-2xl border border-border/70 bg-background/45 px-4 py-3" data-testid="stat-gifts-collectibles">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Коллекционные</p>
                <p className="mt-1 text-2xl font-black">{collectibleCount}</p>
              </div>
              <div className="min-w-[114px] rounded-2xl border border-border/70 bg-background/45 px-4 py-3" data-testid="stat-gifts-catalog">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">В каталоге</p>
                <p className="mt-1 text-2xl font-black">{catalogQuery.data?.length ?? "—"}</p>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-fit rounded-2xl border border-border/70 bg-secondary/45 p-1" role="tablist" aria-label="Подарки полученные или отправленные">
            <button type="button" onClick={() => setTab("received")} role="tab" aria-selected={tab === "received"} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${tab === "received" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} data-testid="tab-received-gifts">
              <ArrowDownLeft size={14} /> Полученные <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px]">{received.length}</span>
            </button>
            <button type="button" onClick={() => setTab("sent")} role="tab" aria-selected={tab === "sent"} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${tab === "sent" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} data-testid="tab-sent-gifts">
              <ArrowUpRight size={14} /> Отправленные <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px]">{sent.length}</span>
            </button>
          </div>
          <label className="flex h-10 w-full items-center gap-2.5 rounded-xl border border-border/70 bg-card/70 px-3 text-muted-foreground focus-within:border-primary/40 sm:max-w-[260px]">
            <Search size={15} />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Найти подарок" className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/70" data-testid="input-search-gifts" />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Очистить поиск" className="rounded-md p-1 hover:text-foreground" data-testid="button-clear-gift-search"><X size={13} /></button>}
          </label>
        </div>

        {giftsQuery.isLoading ? (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-label="Загрузка подарков" data-testid="state-gifts-loading">
            {Array.from({ length: 8 }, (_, index) => <div key={index} className="h-[246px] animate-pulse rounded-[24px] border border-border/60 bg-card/70"><div className="mx-auto mt-12 h-24 w-24 rounded-full bg-secondary/75" /><div className="mx-4 mt-8 h-3 rounded bg-secondary/75" /><div className="mx-4 mt-3 h-2 w-2/3 rounded bg-secondary/55" /></div>)}
          </section>
        ) : giftsQuery.isError ? (
          <section className="flex min-h-[280px] flex-col items-center justify-center rounded-[26px] border border-dashed border-destructive/30 bg-destructive/[.03] px-6 text-center" data-testid="state-gifts-error">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><Gift size={20} /></span>
            <h3 className="mt-4 text-sm font-bold">Коллекция не загрузилась</h3>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">Проверьте соединение и попробуйте загрузить подарки ещё раз.</p>
            <button type="button" onClick={retry} className="mt-4 rounded-xl bg-secondary px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary/80" data-testid="button-retry-gifts">Повторить</button>
          </section>
        ) : filtered.length === 0 ? (
          <section className="flex min-h-[300px] flex-col items-center justify-center rounded-[26px] border border-dashed border-border bg-card/35 px-6 text-center" data-testid="state-gifts-empty">
            <span className="gift-empty-mark flex h-16 w-16 items-center justify-center rounded-[22px] border border-primary/15 bg-primary/5 text-primary"><Gift size={26} /></span>
            <h3 className="mt-5 text-base font-extrabold">{search ? "Ничего не нашлось" : tab === "received" ? "Здесь появятся ваши подарки" : "Вы ещё не отправляли подарки"}</h3>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{search ? "Попробуйте другое имя подарка или собеседника." : tab === "received" ? "Подарки из разговоров сохранятся здесь вместе с историей." : "Отправленные подарки останутся здесь как напоминание о разговоре."}</p>
            {search && <button type="button" onClick={() => setSearch("")} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold" data-testid="button-reset-gift-search"><X size={13} /> Сбросить поиск</button>}
          </section>
        ) : (
          <AnimatePresence mode="wait">
            <motion.section key={tab} initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5" aria-label={tab === "received" ? "Полученные подарки" : "Отправленные подарки"} data-testid={`grid-gifts-${tab}`}>
              {filtered.map((gift, index) => <GiftCollectionCard key={gift.id} gift={gift} direction={tab} index={index} onSelect={(entry, direction) => setSelectedGift({ gift: entry, direction })} />)}
            </motion.section>
          </AnimatePresence>
        )}
        {catalogQuery.isError && <p className="mt-4 text-center text-[11px] text-muted-foreground" role="status" data-testid="status-gift-catalog-unavailable">Каталог временно недоступен; сведения о ваших подарках сохранены.</p>}
      </div>

      {selectedGift && <GiftDetailsDialog key={selectedGift.gift.id} gift={selectedGift.gift} direction={selectedGift.direction} onClose={() => setSelectedGift(null)} onGiftChanged={updated => setSelectedGift(current => current ? { ...current, gift: updated } : null)} />}
    </main>
  );
}
