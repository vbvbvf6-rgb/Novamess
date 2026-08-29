import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,    // данные «свежие» 5 минут
      gcTime: 1000 * 60 * 60 * 24, // хранить в памяти 24 часа
      retry: 2,
    },
  },
});

// Синхронный персистер — восстанавливает кеш ДО первого рендера
export const localStoragePersister = (() => {
  try {
    return createSyncStoragePersister({
      storage: window.localStorage,
      key: "nova-query-cache",
      throttleTime: 2000,
    });
  } catch {
    return undefined; // приватный режим — работаем без кеша
  }
})();

// Ключи запросов для seeding
export const QUERY_KEYS = {
  me:       ["/api/users/me"],
  chats:    ["/api/chats"],
  contacts: ["/api/contacts"],
  posts:    ["/api/posts"],
  stories:  ["/api/stories"],
} as const;

export async function clearPersistedQueryCache(): Promise<void> {
  queryClient.clear();
  try { await localStoragePersister?.removeClient?.(); } catch {}
  try { localStorage.removeItem("nova-query-cache"); } catch {}
  try { localStorage.removeItem("REACT_QUERY_OFFLINE_CACHE"); } catch {}
  try {
    Object.keys(localStorage)
      .filter((key) => /query|tanstack|react-query/i.test(key))
      .forEach((key) => localStorage.removeItem(key));
  } catch {}
  try {
    Object.keys(sessionStorage)
      .filter((key) => /query|tanstack|react-query/i.test(key))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {}
  try {
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }
  } catch {}
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    registration?.active?.postMessage({ type: "clear-caches" });
  } catch {}
}
