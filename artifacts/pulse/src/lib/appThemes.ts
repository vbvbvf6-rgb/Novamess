export interface AppTheme {
  id: string;
  name: string;
  emoji: string;
  mode: "light" | "dark";
  preview: string;
  vars: Record<string, string>;
}

export const APP_THEMES: AppTheme[] = [
  {
    id: "light",
    name: "Светлая",
    emoji: "☀️",
    mode: "light",
    preview: "linear-gradient(135deg, #ffffff, #dbeafe)",
    vars: {},
  },
  {
    id: "dark",
    name: "Тёмная",
    emoji: "🌙",
    mode: "dark",
    preview: "linear-gradient(135deg, #111827, #1e293b)",
    vars: {},
  },
  {
    id: "ocean",
    name: "Океан",
    emoji: "🌊",
    mode: "dark",
    preview: "linear-gradient(135deg, #082f49, #0e7490)",
    vars: {
      "--background": "201 55% 7%", "--foreground": "190 35% 95%",
      "--card": "201 45% 11%", "--card-foreground": "190 35% 95%", "--card-border": "201 35% 19%",
      "--popover": "201 45% 11%", "--popover-foreground": "190 35% 95%", "--popover-border": "201 35% 19%",
      "--primary": "188 86% 45%", "--primary-foreground": "0 0% 100%",
      "--secondary": "201 35% 17%", "--secondary-foreground": "190 35% 95%",
      "--muted": "201 35% 17%", "--muted-foreground": "195 20% 64%",
      "--accent": "188 86% 45%", "--accent-foreground": "0 0% 100%",
      "--border": "201 35% 19%", "--input": "201 35% 19%", "--ring": "188 86% 45%",
    },
  },
  {
    id: "forest",
    name: "Лесная",
    emoji: "🌿",
    mode: "dark",
    preview: "linear-gradient(135deg, #052e16, #15803d)",
    vars: {
      "--background": "150 35% 6%", "--foreground": "140 25% 94%",
      "--card": "150 28% 10%", "--card-foreground": "140 25% 94%", "--card-border": "150 22% 18%",
      "--popover": "150 28% 10%", "--popover-foreground": "140 25% 94%", "--popover-border": "150 22% 18%",
      "--primary": "152 69% 46%", "--primary-foreground": "0 0% 100%",
      "--secondary": "150 22% 16%", "--secondary-foreground": "140 25% 94%",
      "--muted": "150 22% 16%", "--muted-foreground": "140 15% 62%",
      "--accent": "152 69% 46%", "--accent-foreground": "0 0% 100%",
      "--border": "150 22% 18%", "--input": "150 22% 18%", "--ring": "152 69% 46%",
    },
  },
  {
    id: "rose",
    name: "Розовая",
    emoji: "🌸",
    mode: "dark",
    preview: "linear-gradient(135deg, #4c0519, #db2777)",
    vars: {
      "--background": "340 32% 7%", "--foreground": "340 25% 95%",
      "--card": "340 25% 11%", "--card-foreground": "340 25% 95%", "--card-border": "340 20% 19%",
      "--popover": "340 25% 11%", "--popover-foreground": "340 25% 95%", "--popover-border": "340 20% 19%",
      "--primary": "337 81% 60%", "--primary-foreground": "0 0% 100%",
      "--secondary": "340 20% 17%", "--secondary-foreground": "340 25% 95%",
      "--muted": "340 20% 17%", "--muted-foreground": "330 15% 63%",
      "--accent": "337 81% 60%", "--accent-foreground": "0 0% 100%",
      "--border": "340 20% 19%", "--input": "340 20% 19%", "--ring": "337 81% 60%",
    },
  },
  {
    id: "lavender",
    name: "Лавандовая",
    emoji: "🔮",
    mode: "dark",
    preview: "linear-gradient(135deg, #2e1065, #7c3aed)",
    vars: {
      "--background": "260 35% 7%", "--foreground": "260 25% 95%",
      "--card": "260 28% 11%", "--card-foreground": "260 25% 95%", "--card-border": "260 22% 19%",
      "--popover": "260 28% 11%", "--popover-foreground": "260 25% 95%", "--popover-border": "260 22% 19%",
      "--primary": "258 90% 68%", "--primary-foreground": "0 0% 100%",
      "--secondary": "260 22% 17%", "--secondary-foreground": "260 25% 95%",
      "--muted": "260 22% 17%", "--muted-foreground": "255 15% 64%",
      "--accent": "258 90% 68%", "--accent-foreground": "0 0% 100%",
      "--border": "260 22% 19%", "--input": "260 22% 19%", "--ring": "258 90% 68%",
    },
  },
  {
    id: "sunset",
    name: "Закат",
    emoji: "🌅",
    mode: "light",
    preview: "linear-gradient(135deg, #ffedd5, #fecaca)",
    vars: {
      "--background": "24 100% 97%", "--foreground": "18 30% 15%",
      "--card": "0 0% 100%", "--card-foreground": "18 30% 15%", "--card-border": "24 35% 87%",
      "--popover": "0 0% 100%", "--popover-foreground": "18 30% 15%", "--popover-border": "24 35% 87%",
      "--primary": "12 86% 55%", "--primary-foreground": "0 0% 100%",
      "--secondary": "24 80% 92%", "--secondary-foreground": "18 30% 20%",
      "--muted": "24 60% 91%", "--muted-foreground": "18 20% 46%",
      "--accent": "12 86% 55%", "--accent-foreground": "0 0% 100%",
      "--border": "24 35% 87%", "--input": "24 35% 87%", "--ring": "12 86% 55%",
    },
  },
  {
    id: "mint",
    name: "Мятная",
    emoji: "🍃",
    mode: "light",
    preview: "linear-gradient(135deg, #ecfdf5, #a7f3d0)",
    vars: {
      "--background": "155 45% 97%", "--foreground": "164 35% 13%",
      "--card": "0 0% 100%", "--card-foreground": "164 35% 13%", "--card-border": "155 28% 84%",
      "--popover": "0 0% 100%", "--popover-foreground": "164 35% 13%", "--popover-border": "155 28% 84%",
      "--primary": "158 64% 40%", "--primary-foreground": "0 0% 100%",
      "--secondary": "155 35% 90%", "--secondary-foreground": "164 35% 18%",
      "--muted": "155 30% 91%", "--muted-foreground": "160 18% 42%",
      "--accent": "158 64% 40%", "--accent-foreground": "0 0% 100%",
      "--border": "155 28% 84%", "--input": "155 28% 84%", "--ring": "158 64% 40%",
    },
  },
  {
    id: "sapphire",
    name: "Сапфир",
    emoji: "💠",
    mode: "dark",
    preview: "linear-gradient(135deg, #172554, #2563eb)",
    vars: {
      "--background": "224 55% 7%", "--foreground": "215 30% 96%",
      "--card": "224 48% 11%", "--card-foreground": "215 30% 96%", "--card-border": "223 40% 21%",
      "--popover": "224 48% 11%", "--popover-foreground": "215 30% 96%", "--popover-border": "223 40% 21%",
      "--primary": "217 91% 60%", "--primary-foreground": "0 0% 100%",
      "--secondary": "224 38% 17%", "--secondary-foreground": "215 30% 93%",
      "--muted": "224 38% 16%", "--muted-foreground": "218 20% 64%",
      "--accent": "217 91% 60%", "--accent-foreground": "0 0% 100%",
      "--border": "223 40% 21%", "--input": "223 40% 21%", "--ring": "217 91% 60%",
    },
  },
];

const CSS_VAR_KEYS = [
  "--background", "--foreground", "--card", "--card-foreground", "--card-border",
  "--popover", "--popover-foreground", "--popover-border", "--primary", "--primary-foreground",
  "--secondary", "--secondary-foreground", "--muted", "--muted-foreground",
  "--accent", "--accent-foreground", "--border", "--input", "--ring",
];

export function applyAppTheme(themeId: string) {
  const theme = APP_THEMES.find(item => item.id === themeId) || APP_THEMES[0];
  CSS_VAR_KEYS.forEach(key => document.documentElement.style.removeProperty(key));
  Object.entries(theme.vars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
  document.documentElement.classList.toggle("dark", theme.mode === "dark");
  document.documentElement.classList.toggle("light", theme.mode === "light");
  document.documentElement.dataset.appTheme = theme.id;
}