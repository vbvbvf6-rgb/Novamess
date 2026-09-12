import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { StickyNote } from "lucide-react";
import { QuickNotesPlugin } from "@/pages/plugins/QuickNotesPlugin";
import { useAppContext } from "@/contexts/AppContext";

export type PluginLocale = "ru" | "en";

export interface NovaPlugin {
  id: string;
  name: Record<PluginLocale, string>;
  description: Record<PluginLocale, string>;
  version: string;
  author: string;
  icon: LucideIcon;
  route: string;
  defaultEnabled?: boolean;
  component: React.ComponentType;
}

export const NOVA_PLUGINS: readonly NovaPlugin[] = [
  {
    id: "quick-notes",
    name: { ru: "Быстрые заметки", en: "Quick notes" },
    description: {
      ru: "Личные заметки, которые всегда под рукой и не отправляются на сервер.",
      en: "Personal notes that stay close at hand and never leave this device.",
    },
    version: "1.0.0",
    author: "Nova",
    icon: StickyNote,
    route: "/plugins/quick-notes",
    component: QuickNotesPlugin,
  },
];

interface PluginSystemValue {
  plugins: readonly NovaPlugin[];
  enabledPlugins: NovaPlugin[];
  isEnabled: (pluginId: string) => boolean;
  setEnabled: (pluginId: string, enabled: boolean) => void;
}

const PluginSystemContext = createContext<PluginSystemValue | undefined>(undefined);
const STORAGE_PREFIX = "nova-plugins";

function storageKey(userId: number | null) {
  return `${STORAGE_PREFIX}:${userId ?? "guest"}`;
}

function readEnabledIds(userId: number | null): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(userId)) || "null");
    if (!Array.isArray(value)) return [];
    return value.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function PluginProvider({ children }: { children: React.ReactNode }) {
  const { currentUserId } = useAppContext();
  const [enabledIds, setEnabledIds] = useState<string[]>(() => readEnabledIds(currentUserId));
  const loadedUserIdRef = useRef<number | null>(currentUserId);

  useEffect(() => {
    loadedUserIdRef.current = currentUserId;
    const ids = readEnabledIds(currentUserId);
    setEnabledIds(ids);
  }, [currentUserId]);

  useEffect(() => {
    if (loadedUserIdRef.current !== currentUserId) return;
    localStorage.setItem(storageKey(currentUserId), JSON.stringify(enabledIds));
  }, [currentUserId, enabledIds]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey(currentUserId)) return;
      setEnabledIds(readEnabledIds(currentUserId));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [currentUserId]);

  const isEnabled = useCallback((pluginId: string) => enabledIds.includes(pluginId), [enabledIds]);

  const setEnabled = useCallback((pluginId: string, enabled: boolean) => {
    setEnabledIds((current) => {
      if (enabled) return current.includes(pluginId) ? current : [...current, pluginId];
      return current.filter((id) => id !== pluginId);
    });
  }, []);

  const enabledPlugins = useMemo(
    () => NOVA_PLUGINS.filter((plugin) => isEnabled(plugin.id)),
    [isEnabled],
  );

  const value = useMemo(
    () => ({ plugins: NOVA_PLUGINS, enabledPlugins, isEnabled, setEnabled }),
    [enabledPlugins, isEnabled, setEnabled],
  );

  return <PluginSystemContext.Provider value={value}>{children}</PluginSystemContext.Provider>;
}

export function usePluginSystem() {
  const context = useContext(PluginSystemContext);
  if (!context) throw new Error("usePluginSystem must be used within PluginProvider");
  return context;
}

export function getPluginText(plugin: NovaPlugin, locale: PluginLocale, field: "name" | "description") {
  return plugin[field][locale] || plugin[field].ru;
}