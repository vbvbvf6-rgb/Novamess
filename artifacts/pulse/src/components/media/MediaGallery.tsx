import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Image, LoaderCircle, Play, Video, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VideoPlayer } from "@/components/media/VideoPlayer";

interface ChatMediaItem {
  id: string;
  messageId: number;
  senderId: number;
  senderName: string;
  type: "image" | "video";
  mediaUrl: string;
  fileName?: string | null;
  createdAt: string;
}

function getToken() {
  return sessionStorage.getItem("pulse-token");
}

export function MediaGallery({ chatId }: { chatId: number }) {
  const [selected, setSelected] = useState<ChatMediaItem | null>(null);
  const { data: media = [], isLoading, isError } = useQuery<ChatMediaItem[]>({
    queryKey: ["chat-media", chatId],
    enabled: Number.isInteger(chatId) && chatId > 0,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const token = getToken();
      const response = await fetch(`/api/chats/${chatId}/media`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("Не удалось загрузить медиа");
      return response.json();
    },
  });

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-border bg-card" data-testid="section-chat-media">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Image size={16} className="text-primary" />
          <h3 className="text-sm font-bold">Медиа</h3>
          {!isLoading && media.length > 0 && <span className="ml-auto text-[11px] text-muted-foreground">{media.length}</span>}
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <LoaderCircle size={16} className="animate-spin" /> Загружаем медиа…
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Не удалось загрузить медиа чата</div>
        ) : media.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
            <Image size={30} className="opacity-40" />
            <p className="text-sm font-medium">Пока нет фото и видео</p>
            <p className="text-xs">Отправленные в этом чате файлы появятся здесь</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 p-3 sm:grid-cols-4">
            {media.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item)}
                className="group relative aspect-square overflow-hidden rounded-xl bg-secondary text-left"
                aria-label={`${item.type === "video" ? "Открыть видео" : "Открыть фото"} от ${item.senderName}`}
                data-testid={`button-chat-media-${item.id}`}
              >
                {item.type === "image" ? (
                  <img src={item.mediaUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <video src={item.mediaUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                )}
                {item.type === "video" && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/10 text-white">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                      <Play size={17} fill="currentColor" className="ml-0.5" />
                    </span>
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/65 to-transparent px-2 pb-1.5 pt-4 text-left text-[9px] text-white/90 opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                  {item.senderName}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm sm:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            data-testid="dialog-chat-media-viewer"
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Закрыть просмотр"
              data-testid="button-close-media-viewer"
            >
              <X size={20} />
            </button>
            <div className="w-full max-w-4xl" onClick={event => event.stopPropagation()}>
              {selected.type === "video" ? (
                <VideoPlayer
                  src={selected.mediaUrl}
                  className="mx-auto max-h-[82dvh] w-full rounded-2xl"
                  videoClassName="max-h-[82dvh] aspect-video"
                />
              ) : (
                <img src={selected.mediaUrl} alt="" className="mx-auto max-h-[82dvh] max-w-full rounded-2xl object-contain" />
              )}
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-white/75">
                {selected.type === "video" ? <Video size={14} /> : <Image size={14} />}
                {selected.senderName}
                <span>·</span>
                {new Date(selected.createdAt).toLocaleDateString("ru-RU")}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
