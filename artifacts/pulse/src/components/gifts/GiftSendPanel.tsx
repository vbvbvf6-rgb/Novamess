import { useMemo, useState } from "react";
import { EyeOff, Gift, Loader2, Search, Send, UserRound, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetGiftCatalogQueryKey,
  getGetMeQueryKey,
  getGetMyGiftsQueryKey,
  getSearchUsersQueryKey,
  useGetContacts,
  useGetGiftCatalog,
  useSearchUsers,
  useSendGift,
} from "@workspace/api-client-react";
import type { GiftItem, User } from "@workspace/api-client-react";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { GiftArtwork } from "./GiftArtwork";

function uniqueCatalog(items: GiftItem[]) {
  return [...new Map(items.map(item => [item.name.trim().toLocaleLowerCase("ru"), item] as const)).values()];
}

export function GiftSendPanel({ onSent }: { onSent: () => void }) {
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipient, setRecipient] = useState<User | null>(null);
  const [selectedGiftId, setSelectedGiftId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const queryClient = useQueryClient();
  const { currentUserId } = useAppContext();
  const { toast } = useToast();

  const catalogQuery = useGetGiftCatalog({
    query: { queryKey: getGetGiftCatalogQueryKey(), staleTime: 60_000 },
  });
  const contactsQuery = useGetContacts();
  const normalizedSearch = recipientSearch.trim().replace(/^@/, "");
  const searchQuery = useSearchUsers(
    { q: normalizedSearch },
    { query: { queryKey: getSearchUsersQueryKey({ q: normalizedSearch }), enabled: normalizedSearch.length >= 2, staleTime: 30_000 } },
  );
  const sendGift = useSendGift();

  const catalog = useMemo(() => uniqueCatalog(catalogQuery.data ?? []), [catalogQuery.data]);
  const recipients = useMemo(() => {
    const source = normalizedSearch.length >= 2 ? searchQuery.data ?? [] : contactsQuery.data ?? [];
    const unique = new Map<number, User>();
    for (const user of source) {
      if (user.id !== currentUserId && !user.isBot) unique.set(user.id, user);
    }
    return [...unique.values()].slice(0, 8);
  }, [contactsQuery.data, currentUserId, normalizedSearch.length, searchQuery.data]);
  const selectedGift = catalog.find(item => item.id === selectedGiftId);

  const submit = () => {
    if (!recipient || !selectedGift || sendGift.isPending || selectedGift.availableCount === 0) return;
    sendGift.mutate(
      {
        data: {
          receiverId: recipient.id,
          giftItemId: selectedGift.id,
          message: message.trim(),
          isAnonymous,
        },
      },
      {
        onSuccess: async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: getGetMyGiftsQueryKey() }),
            queryClient.invalidateQueries({ queryKey: getGetGiftCatalogQueryKey() }),
            queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() }),
          ]);
          toast({
            title: "Подарок отправлен",
            description: "Он появится в коллекции получателя и не будет опубликован в чате.",
          });
          onSent();
        },
        onError: error => {
          toast({
            title: "Не удалось отправить подарок",
            description: error instanceof Error ? error.message : "Попробуйте ещё раз.",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <section className="overflow-hidden rounded-[28px] border border-primary/15 bg-card/70" data-testid="panel-send-gift">
      <div className="border-b border-border/70 bg-gradient-to-r from-primary/[.08] via-transparent to-pink-400/[.08] px-5 py-5 sm:px-7">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
            <EyeOff size={19} />
          </span>
          <div>
            <h2 className="text-lg font-black tracking-tight">Подарок вне чата</h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
              Выберите человека и подарок. Получатель увидит его в своей коллекции; сообщение в переписке не создаётся.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(240px,.72fr)_minmax(0,1.28fr)]">
        <section aria-labelledby="gift-recipient-heading">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-primary">Шаг 1</p>
          <h3 id="gift-recipient-heading" className="mt-1 text-sm font-extrabold">Кому отправить</h3>
          {recipient ? (
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/[.06] p-3" data-testid="selected-gift-recipient">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-black text-white" style={{ backgroundColor: recipient.avatarColor }}>
                {recipient.avatarUrl ? <img src={recipient.avatarUrl} alt="" className="h-full w-full object-cover" /> : recipient.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{recipient.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">@{recipient.username}</p>
              </div>
              <button type="button" onClick={() => setRecipient(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Выбрать другого получателя" data-testid="button-change-gift-recipient">
                <X size={15} />
              </button>
            </div>
          ) : (
            <>
              <label className="mt-3 flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 text-muted-foreground focus-within:border-primary/50">
                <Search size={15} />
                <input
                  value={recipientSearch}
                  onChange={event => setRecipientSearch(event.target.value)}
                  placeholder="Имя или @username"
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
                  autoComplete="off"
                  data-testid="input-gift-recipient-search"
                />
                {recipientSearch && <button type="button" onClick={() => setRecipientSearch("")} aria-label="Очистить поиск" className="rounded p-1 hover:text-foreground"><X size={13} /></button>}
              </label>
              <div className="mt-2 max-h-64 space-y-1 overflow-y-auto" role="listbox" aria-label="Получатели подарка">
                {normalizedSearch.length >= 2 && searchQuery.isLoading ? (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">Ищем пользователей…</p>
                ) : recipients.length ? recipients.map(user => (
                  <button
                    key={user.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => setRecipient(user)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-secondary/70"
                    data-testid={`button-gift-recipient-${user.id}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-black text-white" style={{ backgroundColor: user.avatarColor }}>
                      {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : user.displayName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-foreground">{user.displayName}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">@{user.username}</span>
                    </span>
                    <UserRound size={15} className="text-muted-foreground" />
                  </button>
                )) : (
                  <p className="px-3 py-4 text-center text-xs leading-relaxed text-muted-foreground">
                    {normalizedSearch.length >= 2 ? "Никого не нашли. Попробуйте другое имя." : contactsQuery.isLoading ? "Загружаем контакты…" : "Введите от двух символов или выберите контакт после загрузки."}
                  </p>
                )}
              </div>
            </>
          )}
        </section>

        <section aria-labelledby="gift-choice-heading">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-primary">Шаг 2</p>
          <h3 id="gift-choice-heading" className="mt-1 text-sm font-extrabold">Выберите подарок</h3>
          {catalogQuery.isLoading ? (
            <div className="flex min-h-36 items-center justify-center text-primary"><Loader2 size={20} className="animate-spin" /></div>
          ) : catalogQuery.isError ? (
            <div className="mt-3 rounded-2xl border border-destructive/20 bg-destructive/[.04] p-4 text-center">
              <p className="text-xs text-destructive">Каталог подарков не загрузился.</p>
              <button type="button" onClick={() => void catalogQuery.refetch()} className="mt-2 rounded-lg bg-secondary px-3 py-2 text-xs font-bold">Повторить</button>
            </div>
          ) : (
            <div className="mt-3 grid max-h-[390px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-4" data-testid="grid-gift-send-catalog">
              {catalog.map(item => {
                const selected = item.id === selectedGiftId;
                const unavailable = item.availableCount === 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedGiftId(item.id)}
                    disabled={unavailable}
                    aria-pressed={selected}
                    className={`group min-w-0 rounded-2xl border p-3 text-left transition ${selected ? "border-primary bg-primary/[.08] ring-1 ring-primary/40" : "border-border/70 bg-background/55 hover:border-primary/35 hover:bg-secondary/50"} disabled:cursor-not-allowed disabled:opacity-45`}
                    data-testid={`button-send-gift-item-${item.id}`}
                  >
                    <span className="flex h-24 items-center justify-center rounded-xl bg-gradient-to-b from-white/[.05] to-transparent">
                      <GiftArtwork item={item} className="h-[76px] w-[76px] drop-shadow-lg" />
                    </span>
                    <span className="mt-2 block truncate text-xs font-extrabold">{item.name}</span>
                    <span className="mt-1 block truncate text-[10px] font-semibold text-amber-300">{item.price.toLocaleString("ru-RU")} Nova</span>
                    {unavailable && <span className="mt-1 block text-[9px] font-bold text-muted-foreground">Нет в наличии</span>}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 border-t border-border/70 bg-background/35 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(220px,.72fr)] sm:px-7">
        <label>
          <span className="mb-1.5 block text-xs font-bold text-muted-foreground">Тёплые слова (необязательно)</span>
          <textarea
            value={message}
            onChange={event => setMessage(event.target.value.slice(0, 280))}
            maxLength={280}
            rows={2}
            placeholder="Добавьте короткое сообщение"
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            data-testid="input-private-gift-message"
          />
        </label>
        <div className="flex flex-col justify-between gap-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background/70 p-3">
            <input type="checkbox" checked={isAnonymous} onChange={event => setIsAnonymous(event.target.checked)} className="mt-0.5 accent-primary" data-testid="checkbox-private-gift-anonymous" />
            <span className="flex min-w-0 items-start gap-2">
              <EyeOff size={15} className="mt-0.5 shrink-0 text-primary" />
              <span>
                <span className="block text-xs font-bold text-foreground">Отправить анонимно</span>
                <span className="mt-0.5 block text-[10px] leading-relaxed text-muted-foreground">По умолчанию имя отправителя скрыто.</span>
              </span>
            </span>
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={!recipient || !selectedGift || selectedGift.availableCount === 0 || sendGift.isPending}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
            data-testid="button-send-private-gift"
          >
            {sendGift.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {selectedGift ? `Отправить за ${selectedGift.price.toLocaleString("ru-RU")} Nova` : <><Gift size={16} /> Выберите подарок</>}
          </button>
        </div>
      </div>
    </section>
  );
}
