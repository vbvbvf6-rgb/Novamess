import { useEffect, useState } from "react";

export const NOVA_ICON_PRESETS = [
  { id: "orange", label: "Оранжевый", colors: ["#ffd166", "#ff5c1a", "#d63600"] },
  { id: "violet", label: "Фиолетовый", colors: ["#c084fc", "#7c3aed", "#4c1d95"] },
  { id: "blue", label: "Синий", colors: ["#67e8f9", "#2563eb", "#172554"] },
  { id: "green", label: "Зелёный", colors: ["#bef264", "#16a34a", "#14532d"] },
  { id: "pink", label: "Розовый", colors: ["#fda4af", "#e11d48", "#831843"] },
] as const;

function iconDataUrl(presetId: string): string {
  const preset = NOVA_ICON_PRESETS.find(item => item.id === presetId) || NOVA_ICON_PRESETS[0];
  const [start, middle, end] = preset.colors;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${start}"/><stop offset=".5" stop-color="${middle}"/><stop offset="1" stop-color="${end}"/></linearGradient></defs><rect x="3" y="3" width="94" height="94" rx="24" fill="url(#g)"/><path d="M50 13c0 0 4.5 28 37 37-32.5 9-37 37-37 37 0 0-4.5-28-37-37 32.5-9 37-37 37-37Z" fill="white"/><circle cx="50" cy="50" r="5.5" fill="white"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function syncBrowserIcon(customIcon: string | null, presetId: string) {
  if (typeof document === "undefined") return;
  const href = customIcon || iconDataUrl(presetId);
  document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach(link => {
    link.href = href;
  });
}

export default function PulseLogo({ size = 40 }: { size?: number }) {
  const [customIcon, setCustomIcon] = useState<string | null>(() => {
    try { return localStorage.getItem("nova-app-icon"); } catch { return null; }
  });
  const [preset, setPreset] = useState(() => {
    try { return localStorage.getItem("nova-app-icon-preset") || "orange"; } catch { return "orange"; }
  });
  useEffect(() => {
    const update = () => {
      const nextCustomIcon = localStorage.getItem("nova-app-icon");
      const nextPreset = localStorage.getItem("nova-app-icon-preset") || "orange";
      setCustomIcon(nextCustomIcon);
      setPreset(nextPreset);
      syncBrowserIcon(nextCustomIcon, nextPreset);
    };
    window.addEventListener("pulse:app-icon", update);
    window.addEventListener("storage", update);
    update();
    return () => {
      window.removeEventListener("pulse:app-icon", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  if (customIcon) {
    return <img src={customIcon} alt="Nova" width={size} height={size} className="rounded-[24%] object-cover" onError={() => { localStorage.removeItem("nova-app-icon"); setCustomIcon(null); }} />;
  }
  const id = `nl_${Math.round(size)}_${Math.random().toString(36).slice(2, 6)}`;
  const presetColors = NOVA_ICON_PRESETS.find(item => item.id === preset)?.colors || NOVA_ICON_PRESETS[0].colors;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}_bg`} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={presetColors[0]}/>
          <stop offset="50%" stopColor={presetColors[1]}/>
          <stop offset="100%" stopColor={presetColors[2]}/>
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
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor={presetColors[2]} floodOpacity="0.5"/>
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
