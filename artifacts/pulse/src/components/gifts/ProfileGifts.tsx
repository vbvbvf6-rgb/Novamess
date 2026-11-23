import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Pin, PinOff, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileGift {
  id: number;
  senderId: number | null;
  senderName: string;
  message?: string | null;
  createdAt: string;
  name: string;
  emoji: string;
  imageUrl?: string | null;
  description?: string | null;
  isPinned: boolean;
}

function authHeaders(json = false): Record<string, string> {
  const token = sessionStorage.getItem("pulse-token");
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function ProfileGifts({ userId, editable }: { userId: number; editable: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [busyGiftId, setBusyGiftId] = useState<number | null>(null);
  const queryKey = ["profile-gifts", userId];
  const { data, isLoading, isError } = useQuery<{ pinned: ProfileGift[]; received: ProfileGift[] }>({
    queryKey,
    enabled: Number.isInteger(userId) && userId > 0,
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/profile-gifts`, { headers: authHeaders(), cache: "no-store" });
      if (!response.ok) throw new Error("Не удалось загрузить подарки");
      return response.json();
    },
  });

  const togglePin = async (gift: ProfileGift) => {
    setBusyGiftId(gift.id);
    try {
      const response = await fetch(`/api/users/me/profile-gifts/${gift.id}/pin`, {
        method: gift.isPinned ? "DELETE" : "POST",
        headers: authHeaders(true),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось обновить подарок");
      await queryClient.invalidateQueries({ queryKey });
      toast({ title: gift.isPinned ? "Подарок убран из профиля" : "Подарок закреплён в профиле" });
    } catch (error) {
      toast({
        title: "Не удалось обновить подарок",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyGiftId(null);
    }
  };

  const gifts = editable ? (data?.received ?? []) : (data?.pinned ?? []);

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card" data-testid="section-profile-gifts">
      <div className="flex items-center gap-2 px-5 pb-3 pt-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-500/10 text-pink-400">
          <Gift size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Подарки</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {editable ? "Закрепляйте полученные подарки в профиле" : "Подарки, закреплённые в профиле"}
          </p>
        </div>
        {data?.pinned?.length ? (
          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
            <Sparkles size={11} /> {data.pinned.length}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-3">
          {[0, 1, 2].map(index => <div key={index} className="h-28 animate-pulse rounded-2xl bg-secondary/70" />)}
        </div>
      ) : isError ? (
        <p className="px-5 pb-5 text-sm text-muted-foreground">Не удалось загрузить подарки.</p>
      ) : gifts.length === 0 ? (
        <div className="flex flex-col items-center px-5 pb-7 pt-2 text-center text-muted-foreground">
          <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-2xl">🎁</span>
          <p className="text-sm font-semibold">{editable ? "Пока нет полученных подарков" : "Пока нет закреплённых подарков"}</p>
          <p className="mt-1 text-xs">{editable ? "Подарки можно закрепить здесь после получения" : "Владелец профиля ещё ничего не закрепил"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-3">
          {gifts.map(gift => (
            <article
              key={gift.id}
              className="relative min-w-0 rounded-2xl border border-border/70 bg-background/70 p-3 text-center"
              data-testid={`card-profile-gift-${gift.id}`}
            >
              {gift.isPinned && (
                <span className="absolute right-2 top-2 rounded-full bg-amber-400/15 p-1 text-amber-400" title="Закреплён в профиле">
                  <Pin size={11} />
                </span>
              )}
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center">
                {gift.imageUrl ? (
                  <img src={gift.imageUrl} alt={gift.name} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-4xl" role="img" aria-label={gift.name}>{gift.emoji || "🎁"}</span>
                )}
              </div>
              <p className="truncate text-xs font-black">{gift.name}</p>
              <p className="mt-1 truncate text-[10px] text-muted-foreground">от {gift.senderName}</p>
              {gift.message && <p className="mt-1 line-clamp-2 text-[10px] text-foreground/70">{gift.message}</p>}
              {editable && (
                <button
                  type="button"
                  onClick={() => void togglePin(gift)}
                  disabled={busyGiftId === gift.id || (!gift.isPinned && (data?.pinned.length ?? 0) >= 12)}
                  className={`mt-2 inline-flex items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    gift.isPinned ? "bg-secondary text-muted-foreground hover:text-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                  data-testid={`${gift.isPinned ? "button-unpin-gift" : "button-pin-gift"}-${gift.id}`}
                >
                  {gift.isPinned ? <PinOff size={11} /> : <Pin size={11} />}
                  {busyGiftId === gift.id ? "Сохраняем…" : gift.isPinned ? "Открепить" : "Закрепить"}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
