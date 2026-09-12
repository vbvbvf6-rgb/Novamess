import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Puzzle, StickyNote } from "lucide-react";
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
  source?: "builtin" | "remote";
  serverId?: number;
  entryUrl?: string;
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

function createRemotePluginComponent(entryUrl: string, name: string) {
  return function RemotePluginFrame() {
    return (
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <iframe
          src={entryUrl}
          title={name}
          sandbox="allow-scripts allow-forms allow-popups"
          referrerPolicy="no-referrer"
          className="h-[min(720px,75dvh)] w-full border-0 bg-white"
        />
      </div>
    );
  };
}

function mapRemotePlugin(raw: any): NovaPlugin | null {
  if (!raw || !Number.isInteger(Number(raw.id)) || typeof raw.entry_url !== "string") return null;
  const id = `remote-${Number(raw.id)}`;
  const name = String(raw.name || "Plugin").slice(0, 80);
  return {
    id,
    name: { ru: name, en: name },
    description: { ru: String(raw.description || ""), en: String(raw.description || "") },
    version: String(raw.version || "1.0.0"),
    author: String(raw.author_display_name || raw.author_username || "Nova user"),
    icon: Puzzle,
    route: `/plugins/${id}`,
    component: createRemotePluginComponent(raw.entry_url, name),
    source: "remote",
    serverId: Number(raw.id),
    entryUrl: raw.entry_url,
  };
}

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
  const [remotePlugins, setRemotePlugins] = useState<NovaPlugin[]>([]);
  const loadedUserIdRef = useRef<number | null>(currentUserId);

  useEffect(() => {
    loadedUserIdRef.current = currentUserId;
    const ids = readEnabledIds(currentUserId);
    setEnabledIds(ids);
  }, [currentUserId]);

  useEffect(() => {
    let active = true;
    if (!currentUserId) {
      setRemotePlugins([]);
      return () => { active = false; };
    }
    const token = sessionStorage.getItem("pulse-token");
    fetch("/api/plugins", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((response) => response.ok ? response.json() : [])
      .then((items: any[]) => {
        if (active) setRemotePlugins(items.map(mapRemotePlugin).filter((item): item is NovaPlugin => item !== null));
      })
      .catch(() => { if (active) setRemotePlugins([]); });
    return () => { active = false; };
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

  const plugins = useMemo(() => [...NOVA_PLUGINS, ...remotePlugins], [remotePlugins]);
  const enabledPlugins = useMemo(() => plugins.filter((plugin) => isEnabled(plugin.id)), [isEnabled, plugins]);

  const value = useMemo(
    () => ({ plugins, enabledPlugins, isEnabled, setEnabled }),
    [enabledPlugins, isEnabled, plugins, setEnabled],
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