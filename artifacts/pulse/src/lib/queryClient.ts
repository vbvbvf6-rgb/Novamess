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
