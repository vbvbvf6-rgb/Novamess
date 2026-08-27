import { useEffect, useState } from "react";

export default function PulseLogo({ size = 40 }: { size?: number }) {
  const [customIcon, setCustomIcon] = useState<string | null>(() => {
    try { return localStorage.getItem("nova-app-icon"); } catch { return null; }
  });
  useEffect(() => {
    const update = () => setCustomIcon(localStorage.getItem("nova-app-icon"));
    window.addEventListener("pulse:app-icon", update);
    return () => window.removeEventListener("pulse:app-icon", update);
  }, []);
  if (customIcon) {
    return <img src={customIcon} alt="Nova" width={size} height={size} className="rounded-[24%] object-cover" onError={() => { localStorage.removeItem("nova-app-icon"); setCustomIcon(null); }} />;
  }
  const id = `nl_${Math.round(size)}_${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}_bg`} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffd166"/>
          <stop offset="35%" stopColor="#ff9433"/>
          <stop offset="70%" stopColor="#ff5c1a"/>
          <stop offset="100%" stopColor="#d63600"/>
        </linearGradient>
        <linearGradient id={`${id}_shine`} x1="10" y1="10" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65"/>
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0.1"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id={`${id}_star`} x1="50" y1="15" x2="50" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.82"/>
        </linearGradient>
        <filter id={`${id}_glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id={`${id}_shadow`} x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#c83000" floodOpacity="0.5"/>
        </filter>
        <filter id={`${id}_inner`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      {/* Background rounded square with rich gradient */}
      <rect x="3" y="3" width="94" height="94" rx="24" fill={`url(#${id}_bg)`} filter={`url(#${id}_shadow)`}/>

      {/* Inner subtle border for depth */}
      <rect x="3" y="3" width="94" height="94" rx="24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"/>

      {/* Aura 4-pointed star burst */}
      <path
        d="M50 13 C50 13 54.5 41 87 50 C54.5 59 50 87 50 87 C50 87 45.5 59 13 50 C45.5 41 50 13 50 13Z"
        fill={`url(#${id}_star)`}
        filter={`url(#${id}_glow)`}
      />

      {/* Shine overlay on top-left */}
      <path
        d="M50 13 C50 13 54.5 41 87 50 C54.5 59 50 87 50 87 C50 87 45.5 59 13 50 C45.5 41 50 13 50 13Z"
        fill={`url(#${id}_shine)`}
      />

      {/* Bright center dot */}
      <circle cx="50" cy="50" r="5.5" fill="white" opacity="0.95"/>
      <circle cx="50" cy="50" r="2.5" fill="white" opacity="1"/>

      {/* Gloss highlight on icon */}
      <ellipse cx="38" cy="28" rx="16" ry="10" fill="white" opacity="0.12" transform="rotate(-20 38 28)"/>
    </svg>
  );
}
