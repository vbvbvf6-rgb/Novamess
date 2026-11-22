import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, Loader2, Send, X, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getGetMessagesQueryKey, getGetChatsQueryKey } from "@workspace/api-client-react";

interface GiftCatalogItem {
  id: number;
  name: string;
  emoji: string;
  animationType: string;
  rarity: string;
  price: number;
  description: string;
  imageUrl?: string | null;
}

interface GiftPickerProps {
  recipientId: number;
  chatId?: number;
  onClose: () => void;
  onSent?: (chatId: number) => void;
}

const rarityLabel: Record<string, string> = {
  common: "Обычный",
  rare: "Редкий",
  epic: "Эпический",
  legendary: "Легендарный",
};

function authHeaders(json = false): Record<string, string> {
  const token = sessionStorage.getItem("pulse-token");
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function GiftPicker({ recipientId, chatId, onClose, onSent }: GiftPickerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [catalog, setCatalog] = useState<GiftCatalogItem[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/gifts", { headers: authHeaders(), cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => []);
        if (!response.ok) throw new Error(body.error || "Не удалось загрузить подарки");
        if (active) setCatalog(Array.isArray(body) ? body : []);
      })
      .catch((error) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Не удалось загрузить подарки");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const sendGift = async () => {
    if (!selected || sending) return;
    setSending(true);
    try {
      let targetChatId = chatId;
      if (!targetChatId) {
        const chatResponse = await fetch("/api/chats/direct", {
          method: "POST",
          headers: authHeaders(true),
          body: JSON.stringify({ userId: recipientId }),
        });
        const chatBody = await chatResponse.json().catch(() => ({}));
        if (!chatResponse.ok) throw new Error(chatBody.error || "Не удалось открыть чат");
        targetChatId = Number(chatBody.id);
      }

      const response = await fetch("/api/gifts/send", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          receiverId: recipientId,
          giftItemId: selected,
          chatId: targetChatId,
          message: note,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Не удалось отправить подарок");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ chatId: targetChatId }) }),
        queryClient.invalidateQueries({ queryKey: ["/api/users/me"] }),
      ]);
      toast({ title: "Подарок отправлен", description: "Он уже появился в чате." });
      onSent?.(targetChatId);
      onClose();
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Не удалось отправить подарок",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const selectedGift = catalog.find((item) => item.id === selected);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/65 p-0 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
        data-testid="dialog-gift-picker"
      >
        <motion.div
          className="w-full max-w-lg max-h-[92dvh] overflow-hidden rounded-t-[28px] sm:rounded-[28px] border border-border bg-card shadow-2xl"
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
        >
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-500/15 text-pink-400">
              <Gift size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-black text-foreground">Выбрать подарок</h2>
              <p className="text-xs text-muted-foreground">Подарок будет отправлен в чат</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Закрыть"
              data-testid="button-close-gift-picker"
            >
              <X size={18} />
            </button>
          </div>

          <div className="max-h-[calc(92dvh-160px)] overflow-y-auto p-4">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
            ) : loadError ? (
              <p className="py-10 text-center text-sm text-destructive" role="alert">{loadError}</p>
            ) : catalog.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Подарки пока не добавлены.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {catalog.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setSelected(item.id)}
                    className={`group rounded-2xl border p-3 text-left transition-all ${
                      selected === item.id
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border bg-background/70 hover:border-primary/50 hover:bg-secondary/60"
                    }`}
                    data-testid={`button-select-gift-${item.id}`}
                  >
                    <div className="gift-picker-art relative mx-auto mb-2 flex h-20 items-center justify-center">
                      <div className="absolute inset-2 rounded-full bg-pink-500/10 blur-xl" />
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="gift-art relative z-10 h-[72px] w-[72px] object-contain drop-shadow-lg"
                        />
                      ) : (
                        <span className="gift-art relative z-10 text-5xl" role="img" aria-label={item.name}>{item.emoji}</span>
                      )}
                    </div>
                    <p className="truncate text-xs font-black text-foreground" data-testid={`text-gift-name-${item.id}`}>{item.name}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{rarityLabel[item.rarity] || item.rarity}</p>
                    <p className="mt-2 flex items-center gap-1 text-xs font-black text-amber-400">
                      <Sparkles size={12} /> {item.price} искр
                    </p>
                  </button>
                ))}
              </div>
            )}

            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-bold text-muted-foreground">Подпись к подарку</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value.slice(0, 280))}
                maxLength={280}
                rows={2}
                placeholder="Напишите пару тёплых слов"
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                data-testid="input-gift-note"
              />
            </label>
          </div>

          <div className="border-t border-border bg-card/95 p-4">
            <button
              type="button"
              onClick={sendGift}
              disabled={!selectedGift || sending || loading || !!loadError}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="button-send-gift"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {selectedGift ? `Отправить за ${selectedGift.price} искр` : "Выберите подарок"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
