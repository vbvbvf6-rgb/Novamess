const decorations = [
  { emoji: "🎃", left: "3%", top: "16%", delay: "-1s" },
  { emoji: "🦇", left: "19%", top: "7%", delay: "-5s" },
  { emoji: "🕸️", left: "94%", top: "23%", delay: "-2.5s" },
  { emoji: "🦇", left: "89%", top: "52%", delay: "-7s" },
  { emoji: "🎃", left: "5%", top: "72%", delay: "-4s" },
  { emoji: "🕷️", left: "96%", top: "79%", delay: "-6s" },
  { emoji: "🦇", left: "34%", top: "91%", delay: "-3s" },
  { emoji: "✨", left: "75%", top: "9%", delay: "-8s" },
];

export function HalloweenEffects() {
  return (
    <div className="halloween-effects" aria-hidden="true">
      {decorations.map((item, index) => (
        <span
          key={`${item.emoji}-${index}`}
          style={{ left: item.left, top: item.top, animationDelay: item.delay }}
        >
          {item.emoji}
        </span>
      ))}
    </div>
  );
}
