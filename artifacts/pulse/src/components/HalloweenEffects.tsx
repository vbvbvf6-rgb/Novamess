const decorations = [
  { kind: "bat", left: "8%", top: "18%", delay: "-2s", size: "1.15rem" },
  { kind: "moon", left: "91%", top: "14%", delay: "-5s", size: "1.3rem" },
  { kind: "bat", left: "88%", top: "72%", delay: "-8s", size: "1rem" },
  { kind: "spark", left: "17%", top: "78%", delay: "-3s", size: ".8rem" },
  { kind: "spark", left: "79%", top: "25%", delay: "-6s", size: ".65rem" },
];

export function HalloweenEffects() {
  return (
    <div className="halloween-effects" aria-hidden="true">
      {decorations.map((item, index) => (
        <span
          key={`${item.kind}-${index}`}
          className={`halloween-decoration halloween-${item.kind}`}
          style={{
            left: item.left,
            top: item.top,
            animationDelay: item.delay,
            width: item.size,
            height: item.size,
          }}
        >
          {item.kind === "bat" && (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 8.5c3-2.8 6.1-2.7 10 .6 3.9-3.3 7-3.4 10-.6-1.7 1.5-2.1 3.3-1.5 5.1-2.6-1-4.9-.4-7.1 2.4L12 19l-1.4-3c-2.2-2.8-4.5-3.4-7.1-2.4.6-1.8.2-3.6-1.5-5.1Z" />
            </svg>
          )}
          {item.kind === "moon" && (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.4 15.2A8.9 8.9 0 0 1 8.8 3.6a9 9 0 1 0 11.6 11.6Z" />
            </svg>
          )}
          {item.kind === "spark" && (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="m12 1.8 2.1 7.1 7.1 3.1-7.1 2.1-2.1 7-2.1-7-7.1-2.1 7.1-3.1L12 1.8Z" />
            </svg>
          )}
        </span>
      ))}
      <span className="halloween-web halloween-web-top">
        <svg viewBox="0 0 160 160" fill="none">
          <path d="M160 0 0 160M160 0 54 160M160 0 108 160M160 0V160M160 0H0M160 0H80M160 0H120M130 0Q130 30 160 30M96 0Q96 64 160 64M60 0Q60 100 160 100M20 0Q20 140 160 140M160 38Q124 38 124 0M160 76Q84 76 84 0M160 114Q46 114 46 0" />
        </svg>
      </span>
      <span className="halloween-web halloween-web-bottom">
        <svg viewBox="0 0 160 160" fill="none">
          <path d="M0 160 160 0M0 160 106 0M0 160 52 0M0 160V0M0 160H160M0 160H80M0 160H40M30 160Q30 130 0 130M64 160Q64 96 0 96M100 160Q100 60 0 60M140 160Q140 20 0 20M0 122Q36 122 36 160M0 84Q76 84 76 160M0 46Q114 46 114 160" />
        </svg>
      </span>
    </div>
  );
}
