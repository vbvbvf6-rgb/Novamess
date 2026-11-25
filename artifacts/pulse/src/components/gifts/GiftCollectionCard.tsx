import { ArrowUpRight, LockKeyhole } from "lucide-react";
import type { GiftInstance } from "@workspace/api-client-react";
import { GiftArtwork } from "./GiftArtwork";

const rarityClasses: Record<string, string> = {
  common: "gift-rarity-common",
  rare: "gift-rarity-rare",
  epic: "gift-rarity-epic",
  legendary: "gift-rarity-legendary",
  cosmic: "gift-rarity-cosmic",
};

function statusLabel(status: GiftInstance["inventoryStatus"]) {
  if (status === "received") return "Не открыт";
  if (status === "collected") return "В коллекции";
  return "Обменян";
}

export function GiftCollectionCard({
  gift,
  direction,
  onSelect,
}: {
  gift: GiftInstance;
  direction: "received" | "sent";
  onSelect: (gift: GiftInstance, direction: "received" | "sent") => void;
}) {
  const item = gift.giftItem;

  return (
    <button
      type="button"
      onClick={() => onSelect(gift, direction)}
      className={`gift-collection-tile group relative flex min-h-[246px] w-full flex-col overflow-hidden rounded-[24px] border p-4 text-left transition-colors ${rarityClasses[item.rarity] || rarityClasses.common}`}
      data-testid={`card-gift-${gift.id}`}
      aria-label={`Подробнее: ${item.name}`}
    >
      <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_50%_10%,rgba(244,174,111,0.15),transparent_70%)]" aria-hidden="true" />
      <div className="relative flex items-center justify-between gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${gift.inventoryStatus === "received" ? "bg-amber-400/12 text-amber-300" : gift.inventoryStatus === "collected" ? "bg-emerald-400/10 text-emerald-300" : "bg-secondary/80 text-muted-foreground"}`} data-testid={`status-gift-${gift.id}`}>
          {statusLabel(gift.inventoryStatus)}
        </span>
        {gift.isUpgraded && <span className="rounded-full bg-violet-400/15 px-2 py-1 text-[10px] font-bold text-violet-300" data-testid={`status-gift-upgraded-${gift.id}`}>Улучшен</span>}
      </div>
      <div className="relative mx-auto flex h-[132px] w-full items-center justify-center">
        <span className="absolute h-20 w-20 rounded-full bg-amber-300/10 blur-2xl" aria-hidden="true" />
        <GiftArtwork item={item} className="relative z-10 h-[112px] w-[112px] drop-shadow-[0_14px_16px_rgba(0,0,0,.32)]" />
      </div>
      <div className="relative mt-auto flex w-full items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-extrabold tracking-tight text-foreground" data-testid={`text-gift-name-${gift.id}`}>{item.name}</p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground" data-testid={`text-gift-context-${gift.id}`}>
            {direction === "received" ? `От ${gift.isAnonymous ? gift.senderName : gift.senderName}` : `Для ${gift.receiverName}`}
          </p>
        </div>
        <span className="gift-price-pill shrink-0" data-testid={`text-gift-price-${gift.id}`}>
          {item.price.toLocaleString("ru-RU")} <span className="text-[9px]">Nova</span>
        </span>
      </div>
      <div className="relative mt-3 flex items-center justify-between border-t border-white/8 pt-2.5 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5" data-testid={`text-gift-serial-${gift.id}`}>
          {item.isCollectible && gift.serialNumber ? <>№ {gift.serialNumber}</> : <><LockKeyhole size={11} /> {item.isCollectible ? "Коллекционный" : "Память из чата"}</>}
        </span>
        <span className="inline-flex items-center gap-1 text-foreground/70 group-hover:text-foreground"><span>Детали</span><ArrowUpRight size={12} /></span>
      </div>
    </button>
  );
}
