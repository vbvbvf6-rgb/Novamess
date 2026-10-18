type DecorationKind = "bat" | "ghost" | "moon" | "pumpkin" | "spider" | "spark";

const decorations: { kind: DecorationKind; placement: string; delay: string }[] = [
  { kind: "moon", placement: "halloween-moon", delay: "-2s" },
  { kind: "pumpkin", placement: "halloween-pumpkin", delay: "-4s" },
  { kind: "ghost", placement: "halloween-ghost", delay: "-1s" },
  { kind: "bat", placement: "halloween-bat-one", delay: "-5s" },
  { kind: "bat", placement: "halloween-bat-two", delay: "-8s" },
  { kind: "bat", placement: "halloween-bat-three", delay: "-11s" },
  { kind: "spider", placement: "halloween-spider", delay: "-3s" },
  { kind: "spark", placement: "halloween-spark-one", delay: "-6s" },
  { kind: "spark", placement: "halloween-spark-two", delay: "-9s" },
];

function HalloweenGlyph({ kind }: { kind: DecorationKind }) {
  if (kind === "pumpkin") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path className="pumpkin-stem" d="M31 15c-2-6 2-10 10-10-1 5-3 9-8 12" />
        <path className="pumpkin-body" d="M31 17c-5-5-12-6-17-2C4 22 5 43 15 52c5 5 11 4 17 0 6 4 12 5 17 0 10-9 11-30 1-37-5-4-12-3-17 2-1-2-1-2-2 0Z" />
        <path className="pumpkin-ridge" d="M31 19c-5 8-5 23 0 32m3-32c5 8 5 23 0 32" />
        <path className="pumpkin-face" d="m17 31 8 3-7 5Zm30 0-8 3 7 5Zm-22 9 7 4 7-4-2 8h-10Z" />
      </svg>
    );
  }

  if (kind === "ghost") {
    return (
      <svg viewBox="0 0 56 64" aria-hidden="true">
        <path className="ghost-body" d="M8 55V27a20 20 0 0 1 40 0v28l-8-6-7 7-7-7-8 7-5-7Z" />
        <ellipse className="ghost-face" cx="21" cy="29" rx="3" ry="5" />
        <ellipse className="ghost-face" cx="36" cy="29" rx="3" ry="5" />
        <path className="ghost-face" d="M25 40q3-4 7 0-3 7-7 0Z" />
      </svg>
    );
  }

  if (kind === "moon") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path className="moon-body" d="M43 46a23 23 0 0 1-23-37A25 25 0 1 0 57 39a23 23 0 0 1-14 7Z" />
      </svg>
    );
  }

  if (kind === "spider") {
    return (
      <svg viewBox="0 0 48 68" aria-hidden="true">
        <path className="spider-thread" d="M24 0v24" />
        <ellipse className="spider-body" cx="24" cy="31" rx="7" ry="8" />
        <circle className="spider-eye" cx="22" cy="30" r="1.2" />
        <circle className="spider-eye" cx="26" cy="30" r="1.2" />
        <path className="spider-legs" d="m18 27-8-5m8 10-9 1m10 3-8 7m17-16 8-5m-8 10 9 1m-10 3 8 7" />
      </svg>
    );
  }

  if (kind === "spark") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="m16 1 3.2 10.8L30 16l-10.8 3.2L16 30l-3.2-10.8L2 16l10.8-4.2L16 1Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 56 40" aria-hidden="true">
      <path className="bat-body" d="M2 12c7-7 15-7 26 1 11-8 19-8 26-1-4 3-5 7-3 11-5-2-10-1-16 6l-7 9-7-9c-6-7-11-8-16-6 2-4 1-8-3-11Z" />
      <circle className="bat-eye" cx="23" cy="17" r="1.5" />
      <circle className="bat-eye" cx="33" cy="17" r="1.5" />
    </svg>
  );
}

export function HalloweenEffects() {
  return (
    <div className="halloween-effects" aria-hidden="true">
      {decorations.map(({ kind, placement, delay }) => (
        <span
          key={placement}
          className={`halloween-decoration ${placement}`}
          style={{ animationDelay: delay }}
        >
          <HalloweenGlyph kind={kind} />
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
