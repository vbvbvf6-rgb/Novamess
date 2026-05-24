export default function PulseLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pl_bolt" x1="35" y1="10" x2="65" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#a78bfa"/>
          <stop offset="50%"  stopColor="#8b5cf6"/>
          <stop offset="100%" stopColor="#6d28d9"/>
        </linearGradient>
        <linearGradient id="pl_bolt_shine" x1="38" y1="14" x2="55" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.55"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>
        <filter id="pl_glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="pl_outer_glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Outer glow halo */}
      <path
        d="M57 10 L28 52 L45 52 L38 90 L72 45 L54 45 Z"
        fill="#8b5cf6"
        opacity="0.25"
        filter="url(#pl_outer_glow)"
      />

      {/* Main bolt */}
      <path
        d="M57 10 L28 52 L45 52 L38 90 L72 45 L54 45 Z"
        fill="url(#pl_bolt)"
        filter="url(#pl_glow)"
      />

      {/* Shine overlay */}
      <path
        d="M57 10 L28 52 L45 52 L38 90 L72 45 L54 45 Z"
        fill="url(#pl_bolt_shine)"
      />
    </svg>
  );
}
