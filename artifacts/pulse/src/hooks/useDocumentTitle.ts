import { useEffect } from "react";
import { useGetChats } from "@workspace/api-client-react";

const BASE_TITLE = "Nova — Мессенджер нового поколения";

export function useDocumentTitle() {
  const { data: chats } = useGetChats();

  useEffect(() => {
    const total = chats
      ? (chats as any[]).reduce((sum: number, c: any) => sum + (c.unreadCount ?? 0), 0)
      : 0;

    if (total > 0) {
      document.title = `(${total > 99 ? "99+" : total}) ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }

    return () => {
      document.title = BASE_TITLE;
    };
  }, [chats]);
}
