import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Check,
  Gift,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import {
  getGetAdminGiftCatalogQueryKey,
  getGetGiftCatalogQueryKey,
  useArchiveAdminGift,
  useCreateAdminGift,
  useGetAdminGiftCatalog,
  useUpdateAdminGift,
  type AdminGiftInput,
  type GiftItem,
} from "@workspace/api-client-react";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { emojiToTwemojiUrl, GIFT_LOCAL_PNG } from "@/lib/twemoji";

const rarityNames: Record<string, string> = {
  common: "Обычный",
  rare: "Редкий",
  epic: "Эпический",
  legendary: "Легендарный",
  cosmic: "Космический",
};

const animationNames: Record<string, string> = {
  bounce: "Прыжок",
  sparkle: "Сияние",
  hearts: "Сердца",
  confetti: "Конфетти",
  roses: "Розы",
  fireworks: "Фейерверк",
  orbit: "Орбита",
  bloom: "Цветение",
  stars: "Звёзды",
  balloons: "Шары",
  diamonds: "Алмазы",
  flame: "Пламя",
  galaxy: "Галактика",
  lightning: "Молния",
  magic: "Магия",
  supernova: "Сверхновая",
  vortex: "Вихрь",
};

const blankGift: AdminGiftInput = {
  name: "",
  emoji: "🎁",
  animationType: "sparkle",
  rarity: "common",
  stars: 1,
  price: 100,
  description: "",
  primeOnly: false,
  imageUrl: "",
  isCollectible: false,
  isActive: true,
  maxSupply: null,
  exchangeValue: 0,
  upgradePrice: 0,
};

function giftArt(item: Pick<GiftItem, "name" | "emoji" | "imageUrl">) {
  return item.imageUrl || GIFT_LOCAL_PNG[item.name] || emojiToTwemojiUrl(item.emoji);
}

function numericValue(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && Number.isInteger(number) ? number : fallback;
}

export function AdminGiftsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: gifts = [], isLoading, isError, refetch, isFetching } = useGetAdminGiftCatalog({
    query: { queryKey: getGetAdminGiftCatalogQueryKey(), refetchOnMount: "always" },
  });
  const createGift = useCreateAdminGift();
  const updateGift = useUpdateAdminGift();
  const archiveGift = useArchiveAdminGift();
  const [editingGift, setEditingGift] = useState<GiftItem | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const form = useForm<AdminGiftInput>({ defaultValues: blankGift });
  const isCollectible = form.watch("isCollectible");
  const saving = createGift.isPending || updateGift.isPending;

  const filteredGifts = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("ru-RU");
    if (!needle) return gifts;
    return gifts.filter(item =>
      `${item.name} ${item.description} ${item.rarity}`.toLocaleLowerCase("ru-RU").includes(needle),
    );
  }, [gifts, search]);

  const resetForm = () => {
    setEditingGift(null);
    setShowForm(false);
    form.reset(blankGift);
  };

  const editGift = (gift: GiftItem) => {
    setEditingGift(gift);
    setShowForm(true);
    form.reset({
      name: gift.name,
      emoji: gift.emoji,
      animationType: gift.animationType,
      rarity: gift.rarity,
      stars: gift.stars,
      price: gift.price,
      description: gift.description,
      primeOnly: gift.primeOnly,
      imageUrl: gift.imageUrl ?? "",
      isCollectible: gift.isCollectible,
      isActive: gift.isActive,
      maxSupply: gift.maxSupply,
      exchangeValue: gift.exchangeValue,
      upgradePrice: gift.upgradePrice,
    });
  };

  const onSubmit = form.handleSubmit(async values => {
    const payload: AdminGiftInput = {
      ...values,
      name: values.name.trim(),
      emoji: values.emoji.trim(),
      description: values.description.trim(),
      imageUrl: typeof values.imageUrl === "string" && values.imageUrl.trim() ? values.imageUrl.trim() : null,
      stars: numericValue(values.stars, 1),
      price: numericValue(values.price, 0),
      maxSupply: values.maxSupply === null || values.maxSupply === undefined ? null : numericValue(values.maxSupply, 1),
      exchangeValue: numericValue(values.exchangeValue, 0),
      upgradePrice: numericValue(values.upgradePrice, 0),
    };
    if (!payload.name || !payload.emoji) {
      toast({ title: "Заполните название и символ подарка", variant: "destructive" });
      return;
    }
    if (payload.isCollectible && payload.maxSupply !== null && payload.maxSupply < 1) {
      toast({ title: "Тираж должен быть не меньше 1", variant: "destructive" });
      return;
    }

    try {
      if (editingGift) {
        await updateGift.mutateAsync({ giftId: editingGift.id, data: payload });
        toast({ title: `Подарок «${payload.name}» обновлён` });
      } else {
        await createGift.mutateAsync({ data: payload });
        toast({ title: `Подарок «${payload.name}» добавлен` });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetAdminGiftCatalogQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetGiftCatalogQueryKey() }),
      ]);
      resetForm();
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Не удалось сохранить подарок",
        variant: "destructive",
      });
    }
  });

  const archive = async (gift: GiftItem) => {
    if (!window.confirm(`Скрыть «${gift.name}» из каталога? Полученные ранее подарки останутся в истории.`)) return;
    try {
      await archiveGift.mutateAsync({ giftId: gift.id });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetAdminGiftCatalogQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetGiftCatalogQueryKey() }),
      ]);
      toast({ title: `Подарок «${gift.name}» скрыт из каталога` });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Не удалось скрыть подарок",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card" data-testid="section-admin-gifts">
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-400">
          <Gift size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold">Каталог подарков</h2>
          <p className="text-xs text-muted-foreground">Создавайте подарки, задавайте тираж и коллекционные свойства</p>
        </div>
        <button
          type="button"
          onClick={() => { setEditingGift(null); setShowForm(true); form.reset(blankGift); }}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
          data-testid="button-create-gift"
        >
          <Plus size={15} /> Добавить подарок
        </button>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="rounded-xl border border-border p-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
          aria-label="Обновить каталог"
          data-testid="button-refresh-admin-gifts"
        >
          <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
        </button>
      </div>

      {showForm && (
        <div className="border-b border-border/60 bg-background/45 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">{editingGift ? "Изменить подарок" : "Новый подарок"}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Настройки вступят в силу сразу после сохранения.</p>
            </div>
            <button type="button" onClick={resetForm} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary" aria-label="Закрыть форму" data-testid="button-close-gift-form">
              <X size={17} />
            </button>
          </div>

          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4" data-testid="form-admin-gift">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                  Название
                  <input {...form.register("name", { required: true, maxLength: 80 })} maxLength={80} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" data-testid="input-admin-gift-name" />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                  Эмодзи подарка
                  <input {...form.register("emoji", { required: true, maxLength: 32 })} maxLength={32} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-lg text-foreground outline-none focus:border-primary" data-testid="input-admin-gift-emoji" />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                  Редкость
                  <select {...form.register("rarity")} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" data-testid="select-admin-gift-rarity">
                    {Object.entries(rarityNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                  Анимация
                  <select {...form.register("animationType")} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" data-testid="select-admin-gift-animation">
                    {Object.entries(animationNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </div>

              <label className="block space-y-1.5 text-xs font-semibold text-muted-foreground">
                Описание
                <textarea {...form.register("description", { maxLength: 280 })} maxLength={280} rows={2} className="w-full resize-y rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" data-testid="input-admin-gift-description" />
              </label>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                  Цена, искры
                  <input type="number" min={0} max={10_000_000} step={1} {...form.register("price", { valueAsNumber: true })} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" data-testid="input-admin-gift-price" />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                  Звёзды
                  <input type="number" min={1} max={1_000_000} step={1} {...form.register("stars", { valueAsNumber: true })} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" data-testid="input-admin-gift-stars" />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                  Обмен на искры
                  <input type="number" min={0} max={10_000_000} step={1} {...form.register("exchangeValue", { valueAsNumber: true })} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" data-testid="input-admin-gift-exchange" />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                  Улучшение, искры
                  <input type="number" min={0} max={10_000_000} step={1} {...form.register("upgradePrice", { valueAsNumber: true })} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" data-testid="input-admin-gift-upgrade-price" />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                  Тираж
                  <input type="number" min={1} max={10_000_000} step={1} placeholder="Без лимита" {...form.register("maxSupply", { setValueAs: value => value === "" ? null : Number(value) })} disabled={!isCollectible} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary disabled:opacity-45" data-testid="input-admin-gift-supply" />
                </label>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <ImageIcon size={14} />
                Ссылка на изображение (или путь в public, например /gifts/rose.svg)
                <input {...form.register("imageUrl")} className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" placeholder="Необязательно" data-testid="input-admin-gift-image-url" />
              </label>

              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground">
                  <input type="checkbox" {...form.register("isCollectible")} className="accent-primary" data-testid="checkbox-admin-gift-collectible" />
                  <Sparkles size={14} className="text-amber-400" /> Коллекционный
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground">
                  <input type="checkbox" {...form.register("primeOnly")} className="accent-primary" data-testid="checkbox-admin-gift-prime" />
                  Только для Prime
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground">
                  <input type="checkbox" {...form.register("isActive")} className="accent-primary" data-testid="checkbox-admin-gift-active" />
                  Показывать в каталоге
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-3">
                <button type="button" onClick={resetForm} className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-secondary" data-testid="button-cancel-admin-gift">
                  Отмена
                </button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50" data-testid="button-submit-admin-gift">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : editingGift ? <Save size={14} /> : <Check size={14} />}
                  {saving ? "Сохраняем…" : editingGift ? "Сохранить изменения" : "Создать подарок"}
                </button>
              </div>
            </form>
          </Form>
        </div>
      )}

      <div className="flex flex-col gap-3 p-4">
        <label className="sr-only" htmlFor="admin-gifts-search">Поиск по каталогу</label>
        <input
          id="admin-gifts-search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Найти подарок…"
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary sm:max-w-sm"
          data-testid="input-search-admin-gifts"
        />
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-primary" /></div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-sm text-destructive" role="alert" data-testid="error-admin-gifts">Не удалось загрузить каталог подарков.</p>
            <button type="button" onClick={() => void refetch()} className="rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-secondary" data-testid="button-retry-admin-gifts">Повторить</button>
          </div>
        ) : filteredGifts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground" data-testid="empty-admin-gifts">
            {search ? "Ничего не найдено." : "Каталог пуст. Добавьте первый подарок."}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="list-admin-gifts">
            {filteredGifts.map(item => (
              <article
                key={item.id}
                className={`relative overflow-hidden rounded-2xl border p-3 ${item.isActive ? "border-border bg-background" : "border-border/60 bg-secondary/35 opacity-75"}`}
                data-testid={`card-admin-gift-${item.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/15 to-violet-500/15">
                    <img src={giftArt(item)} alt={item.name} className="h-11 w-11 object-contain drop-shadow-lg" onError={event => { event.currentTarget.src = emojiToTwemojiUrl(item.emoji); }} data-testid={`image-admin-gift-${item.id}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold" data-testid={`text-admin-gift-name-${item.id}`}>{item.name}</h3>
                    <p className="truncate text-[11px] text-muted-foreground">{item.description || "Без описания"}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">{rarityNames[item.rarity] || item.rarity}</span>
                      {item.isCollectible && <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold text-amber-500">Коллекционный</span>}
                      {!item.isActive && <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-bold text-muted-foreground">Скрыт</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/60 pt-2.5 text-[10px]">
                  <div><span className="block text-muted-foreground">Цена</span><b className="mt-0.5 block text-amber-400">{item.price.toLocaleString("ru-RU")} ✦</b></div>
                  <div><span className="block text-muted-foreground">Получено</span><b className="mt-0.5 block">{item.soldCount.toLocaleString("ru-RU")}</b></div>
                  <div><span className="block text-muted-foreground">Тираж</span><b className="mt-0.5 block">{item.maxSupply?.toLocaleString("ru-RU") ?? "∞"}</b></div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => editGift(item)} className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-bold hover:border-primary/50 hover:bg-primary/5" data-testid={`button-edit-admin-gift-${item.id}`}>
                    Изменить
                  </button>
                  {item.isActive && (
                    <button type="button" onClick={() => void archive(item)} disabled={archiveGift.isPending} className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive disabled:opacity-50" aria-label={`Скрыть подарок ${item.name}`} data-testid={`button-archive-admin-gift-${item.id}`}>
                      {archiveGift.isPending ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
