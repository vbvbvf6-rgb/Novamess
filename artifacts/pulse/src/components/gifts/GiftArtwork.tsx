import { useEffect, useState } from "react";
import { GIFT_LOCAL_PNG } from "@/lib/twemoji";

interface GiftArtworkItem {
  id: number;
  name: string;
  emoji?: string | null;
  imageUrl?: string | null;
}

export function GiftArtwork({ item, className = "" }: { item: GiftArtworkItem; className?: string }) {
  const localArtwork = GIFT_LOCAL_PNG[item.name];
  const sources = [item.imageUrl, localArtwork].filter(Boolean) as string[];
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => setSourceIndex(0), [item.id, item.imageUrl, item.name]);

  if (sourceIndex >= sources.length) {
    return <span className={`inline-flex items-center justify-center ${className}`} role="img" aria-label={item.name}>{item.emoji || "🎁"}</span>;
  }

  return (
    <img
      src={sources[sourceIndex]}
      alt={item.name}
      loading="lazy"
      decoding="async"
      onError={() => setSourceIndex(index => Math.min(index + 1, sources.length))}
      className={`object-contain ${className}`}
      data-testid={`img-gift-art-${item.id}`}
    />
  );
}
