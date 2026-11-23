import { useState } from "react";
import type { GiftItem } from "@workspace/api-client-react";
import { GIFT_LOCAL_PNG, emojiToTwemojiUrl } from "@/lib/twemoji";

const animationClassByType: Record<string, string> = {
  bounce: "gift-art-motion--bounce",
  sparkle: "gift-art-motion--sparkle",
  hearts: "gift-art-motion--hearts",
  confetti: "gift-art-motion--confetti",
  roses: "gift-art-motion--bloom",
  fireworks: "gift-art-motion--burst",
  orbit: "gift-art-motion--orbit",
  bloom: "gift-art-motion--bloom",
  stars: "gift-art-motion--sparkle",
  balloons: "gift-art-motion--bounce",
  diamonds: "gift-art-motion--sparkle",
  flame: "gift-art-motion--flame",
  galaxy: "gift-art-motion--orbit",
  lightning: "gift-art-motion--burst",
  magic: "gift-art-motion--magic",
  supernova: "gift-art-motion--burst",
  vortex: "gift-art-motion--orbit",
};

export function GiftArtwork({ item, className = "" }: { item: GiftItem; className?: string }) {
  const sources = [item.imageUrl, GIFT_LOCAL_PNG[item.name], emojiToTwemojiUrl(item.emoji)].filter(Boolean) as string[];
  const [sourceIndex, setSourceIndex] = useState(0);

  return (
    <span
      className={`gift-art-motion ${animationClassByType[item.animationType] || ""}`}
      data-gift-animation={item.animationType}
    >
      <img
        src={sources[sourceIndex]}
        alt={item.name}
        onError={() => setSourceIndex(index => Math.min(index + 1, sources.length - 1))}
        className={`gift-art object-contain ${className}`}
        data-testid={`img-gift-art-${item.id}`}
      />
    </span>
  );
}
