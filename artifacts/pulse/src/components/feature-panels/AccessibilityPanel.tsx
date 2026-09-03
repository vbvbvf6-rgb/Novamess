import React, { useCallback, useEffect, useMemo, useState } from "react";

export type AccessibilityLanguage = "ru" | "en";

export interface AccessibilitySettings {
  largerText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  keyboardHints: boolean;
}

export interface AccessibilityPanelProps {
  lang?: AccessibilityLanguage;
  className?: string;
}

const STORAGE_KEY = "pulse-accessibility-settings";
const CHANGE_EVENT = "pulse:accessibility-change";

const DEFAULT_SETTINGS: AccessibilitySettings = {
  largerText: false,
  highContrast: false,
  reducedMotion: false,
  keyboardHints: true,
};

type SettingKey = keyof AccessibilitySettings;

const copy = {
  ru: {
    eyebrow: "NOVA / ДОСТУПНОСТЬ",
    title: "Настройки для комфортного общения",
    intro: "Изменения применяются сразу и сохраняются на этом устройстве.",
    livePrefix: "Настройка изменена:",
    enabled: "включено",
    disabled: "выключено",
    largerText: {
      title: "Увеличенный шрифт",
      description: "Больше текста в сообщениях, списках и настройках",
    },
    highContrast: {
      title: "Высокая контрастность",
      description: "Более чёткие границы и заметный фокус клавиатуры",
    },
    reducedMotion: {
      title: "Уменьшить движение",
      description: "Минимум анимаций, переходов и автоматической прокрутки",
    },
    keyboardHints: {
      title: "Подсказки клавиатуры",
      description: "Показывать сочетания клавиш рядом с действиями",
    },
    keyboard: "Клавиши",
    preview: "Предпросмотр",
    previewBody: "Так выглядит сообщение с активными настройками.",
    shortcut: "Открыть поиск",
    reset: "Сбросить настройки",
    resetDone: "Настройки доступности сброшены",
    status: "Статус доступности",
    statusText: "Изменения применяются без перезагрузки страницы.",
  },
  en: {
    eyebrow: "NOVA / ACCESSIBILITY",
    title: "Make conversations work for you",
    intro: "Changes apply instantly and stay on this device.",
    livePrefix: "Setting changed:",
    enabled: "on",
    disabled: "off",
    largerText: {
      title: "Larger text",
      description: "Increase text across messages, lists, and settings",
    },
    highContrast: {
      title: "High contrast",
      description: "Sharper boundaries and a clearer keyboard focus",
    },
    reducedMotion: {
      title: "Reduce motion",
      description: "Limit animations, transitions, and automatic scrolling",
    },
    keyboardHints: {
      title: "Keyboard hints",
      description: "Show shortcuts next to available actions",
    },
    keyboard: "Keyboard",
    preview: "Preview",
    previewBody: "This is how a message looks with your settings active.",
    shortcut: "Open search",
    reset: "Reset settings",
    resetDone: "Accessibility settings reset",
    status: "Accessibility status",
    statusText: "Changes apply without reloading the page.",
  },
} as const;

function isAccessibilitySettings(value: unknown): value is AccessibilitySettings {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AccessibilitySettings>;
  return (
    typeof candidate.largerText === "boolean" &&
    typeof candidate.highContrast === "boolean" &&
    typeof candidate.reducedMotion === "boolean" &&
    typeof candidate.keyboardHints === "boolean"
  );
}

function readSettings(): AccessibilitySettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    const parsed: unknown = JSON.parse(stored);
    return isAccessibilitySettings(parsed) ? parsed : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function announce(settings: AccessibilitySettings, key: SettingKey, language: AccessibilityLanguage) {
  if (typeof window === "undefined") return;

  const labels = copy[language];
  const label = labels[key].title;
  const value = settings[key] ? labels.enabled : labels.disabled;
  window.dispatchEvent(
    new CustomEvent(CHANGE_EVENT, {
      detail: {
        settings,
        changed: key,
        value: settings[key],
      },
    }),
  );

  return `${labels.livePrefix} ${label}, ${value}`;
}

function Icon({
  name,
  size = 20,
}: {
  name: "text" | "contrast" | "motion" | "keyboard" | "check" | "reset";
  size?: number;
}) {
  const paths = {
    text: (
      <>
        <path d="M5 5.5h14" />
        <path d="M12 5.5v13" />
        <path d="m8.5 18.5 3.5-2.25 3.5 2.25" />
      </>
    ),
    contrast: (
      <>
        <circle cx="12" cy="12" r="7.5" />
        <path d="M12 4.5a7.5 7.5 0 0 1 0 15z" fill="currentColor" stroke="none" />
      </>
    ),
    motion: (
      <>
        <path d="M4 17.5c2-1.1 3.3-2.7 4.1-5.2.8-2.4 2.1-4.1 4-5.2" />
        <path d="m14.2 7.1 2.2-.2-.2 2.2" />
        <path d="M4 7.1c1 .4 1.8.9 2.5 1.7" />
      </>
    ),
    keyboard: (
      <>
        <rect x="3.5" y="6.5" width="17" height="11" rx="2" />
        <path d="M6.5 10h.01M9.5 10h.01M12.5 10h.01M15.5 10h.01M18.5 10h.01" />
        <path d="M7 14h10" />
      </>
    ),
    check: <path d="m6.5 12.5 3.4 3.4 7.6-8" />,
    reset: (
      <>
        <path d="M4.5 8.5A7.5 7.5 0 1 1 5 16" />
        <path d="M4.5 4.5v4h4" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  describedBy,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  describedBy: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      onClick={onChange}
      className="relative h-7 w-12 shrink-0 rounded-full border border-border/80 p-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      style={{
        backgroundColor: checked ? "hsl(var(--primary))" : "hsl(var(--muted))",
      }}
    >
      <span
        aria-hidden="true"
        className="block h-5 w-5 rounded-full bg-background shadow-sm transition-transform duration-200"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );
}

function SettingRow({
  icon,
  settingKey,
  title,
  description,
  checked,
  onChange,
  label,
}: {
  icon: React.ReactNode;
  settingKey: SettingKey;
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  const descriptionId = `nova-accessibility-${settingKey}-description`;

  return (
    <div
      className="group flex items-center gap-3 border-b border-border/70 px-4 py-4 last:border-b-0 sm:px-5"
      data-setting-row={settingKey}
    >
      <div
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary"
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1 pr-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold tracking-[-0.01em] text-foreground">{title}</p>
          {settingKey === "keyboardHints" && (
            <span
              className="hidden items-center gap-1 rounded-md border border-border bg-background/70 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex"
              aria-hidden="true"
            >
              <span>⌘</span>
              <span>K</span>
            </span>
          )}
        </div>
        <p id={descriptionId} className="mt-1 max-w-[34rem] text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} describedBy={descriptionId} />
    </div>
  );
}

export function AccessibilityPanel({ lang = "ru", className = "" }: AccessibilityPanelProps) {
  const text = copy[lang];
  const [settings, setSettings] = useState<AccessibilitySettings>(readSettings);
  const [announcement, setAnnouncement] = useState("");
  const [resetNotice, setResetNotice] = useState(false);

  const settingRows = useMemo(
    () => [
      { key: "largerText" as const, icon: <Icon name="text" />, copy: text.largerText },
      { key: "highContrast" as const, icon: <Icon name="contrast" />, copy: text.highContrast },
      { key: "reducedMotion" as const, icon: <Icon name="motion" />, copy: text.reducedMotion },
      { key: "keyboardHints" as const, icon: <Icon name="keyboard" />, copy: text.keyboardHints },
    ],
    [text],
  );

  const applySettings = useCallback((next: AccessibilitySettings) => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    root.toggleAttribute("data-nova-font-size", next.largerText);
    root.toggleAttribute("data-nova-high-contrast", next.highContrast);
    root.toggleAttribute("data-nova-reduced-motion", next.reducedMotion);
    root.toggleAttribute("data-nova-keyboard-hints", next.keyboardHints);
    root.style.setProperty("--app-font-size", next.largerText ? "17px" : "15px");
  }, []);

  useEffect(() => {
    applySettings(settings);
  }, [applySettings, settings]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const styleId = "nova-accessibility-runtime-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        html[data-nova-font-size="true"] { font-size: 112.5%; }
        html[data-nova-high-contrast="true"] {
          --background: 0 0% 100%;
          --foreground: 0 0% 4%;
          --card: 0 0% 100%;
          --card-foreground: 0 0% 4%;
          --card-border: 0 0% 8%;
          --border: 0 0% 18%;
          --input: 0 0% 18%;
          --muted: 0 0% 92%;
          --muted-foreground: 0 0% 20%;
          --primary: 221 100% 32%;
          --ring: 221 100% 32%;
        }
        html.dark[data-nova-high-contrast="true"] {
          --background: 0 0% 4%;
          --foreground: 0 0% 100%;
          --card: 0 0% 7%;
          --card-foreground: 0 0% 100%;
          --card-border: 0 0% 92%;
          --border: 0 0% 82%;
          --input: 0 0% 82%;
          --muted: 0 0% 16%;
          --muted-foreground: 0 0% 90%;
          --primary: 49 100% 62%;
          --primary-foreground: 0 0% 4%;
          --ring: 49 100% 62%;
        }
        html[data-nova-high-contrast="true"] :focus-visible {
          outline: 3px solid hsl(var(--ring)) !important;
          outline-offset: 3px !important;
        }
        html[data-nova-reduced-motion="true"] *,
        html[data-nova-reduced-motion="true"] *::before,
        html[data-nova-reduced-motion="true"] *::after {
          animation-duration: .01ms !important;
          animation-iteration-count: 1 !important;
          scroll-behavior: auto !important;
          transition-duration: .01ms !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const incoming: unknown = JSON.parse(event.newValue);
        if (isAccessibilitySettings(incoming)) setSettings(incoming);
      } catch {
        // Ignore malformed values from another tab.
      }
    };

    const handleAccessibilityChange = (event: Event) => {
      const detail = (event as CustomEvent<{ settings?: unknown }>).detail;
      if (detail && isAccessibilitySettings(detail.settings)) setSettings(detail.settings);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(CHANGE_EVENT, handleAccessibilityChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(CHANGE_EVENT, handleAccessibilityChange);
    };
  }, []);

  const changeSetting = (key: SettingKey) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Settings still apply for the current session if storage is unavailable.
    }
    setAnnouncement(announce(next, key, lang) ?? "");
    setResetNotice(false);
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch {
      // Settings still apply for the current session if storage is unavailable.
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { settings: DEFAULT_SETTINGS, reset: true } }));
    }
    setAnnouncement(text.resetDone);
    setResetNotice(true);
  };

  return (
    <section
      aria-labelledby="nova-accessibility-title"
      className={`w-full max-w-2xl overflow-hidden rounded-[28px] border border-border/80 bg-card text-card-foreground shadow-[0_20px_60px_-30px_hsl(var(--primary)/.35)] ${className}`}
      style={{
        backgroundImage:
          "linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--card)) 76%, hsl(var(--primary) / .07) 100%)",
      }}
    >
      <div className="relative overflow-hidden border-b border-border/70 px-5 pb-5 pt-6 sm:px-7 sm:pt-7">
        <div
          aria-hidden="true"
          className="absolute -right-12 -top-20 h-48 w-48 rounded-full border-[22px] border-primary/10"
        />
        <div
          aria-hidden="true"
          className="absolute right-8 top-7 h-20 w-20 rounded-full border border-primary/15"
        />
        <div className="relative">
          <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-primary">{text.eyebrow}</p>
          <h1 id="nova-accessibility-title" className="mt-2 max-w-md text-[clamp(1.35rem,3vw,1.8rem)] font-semibold leading-tight tracking-[-0.04em]">
            {text.title}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{text.intro}</p>
        </div>
      </div>

      <div className="px-3 py-3 sm:px-4 sm:py-4">
        <div
          className="overflow-hidden rounded-2xl border border-border/80 bg-background/45"
          role="group"
          aria-label={text.status}
        >
          {settingRows.map((row) => (
            <SettingRow
              key={row.key}
              icon={row.icon}
              settingKey={row.key}
              title={row.copy.title}
              description={row.copy.description}
              checked={settings[row.key]}
              onChange={() => changeSetting(row.key)}
              label={`${row.copy.title}: ${settings[row.key] ? text.enabled : text.disabled}`}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-3 px-5 pb-4 sm:grid-cols-[1fr_auto] sm:px-7">
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            {text.preview}
          </div>
          <p className="mt-3 text-sm leading-5">{text.previewBody}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Nova · 09:41</span>
            {settings.keyboardHints && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/70 px-2 py-1 font-mono text-[10px]">
                <span aria-hidden="true">⌘</span>
                <span>K</span>
                <span className="font-sans">{text.shortcut}</span>
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={resetSettings}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          aria-label={text.reset}
        >
          <Icon name="reset" size={15} />
          <span>{text.reset}</span>
        </button>
      </div>

      <div className="flex items-center gap-2 border-t border-border/60 px-5 py-3 text-[11px] text-muted-foreground sm:px-7">
        <Icon name={resetNotice ? "check" : "keyboard"} size={14} />
        <span>{resetNotice ? text.resetDone : text.statusText}</span>
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </section>
  );
}

export default AccessibilityPanel;