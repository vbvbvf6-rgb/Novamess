import { useState } from "react";
import type { GiftItem } from "@workspace/api-client-react";
import { GIFT_LOCAL_PNG, emojiToTwemojiUrl } from "@/lib/twemoji";

export function GiftArtwork({ item, className = "" }: { item: GiftItem; className?: string }) {
  const sources = [item.imageUrl, GIFT_LOCAL_PNG[item.name], emojiToTwemojiUrl(item.emoji)].filter(Boolean) as string[];
  const [sourceIndex, setSourceIndex] = useState(0);

  return (
    <img
      src={sources[sourceIndex]}
      alt={item.name}
      onError={() => setSourceIndex(index => Math.min(index + 1, sources.length - 1))}
      className={`object-contain ${className}`}
      data-testid={`img-gift-art-${item.id}`}
    />
  );
}
