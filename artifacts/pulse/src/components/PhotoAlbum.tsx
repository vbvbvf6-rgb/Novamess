import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { getGetChatsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

type PhotoScope = "user" | "chat";
interface PhotoAlbumData {
  photos: string[];
  activeUrl: string | null;
}

const MAX_PHOTOS = 10;

function tokenHeaders(json = false): Record<string, string> {
  const token = sessionStorage.getItem("pulse-token");
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, 960 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) return reject(new Error("Не удалось обработать фотографию"));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Не удалось открыть этот файл как изображение"));
    };
    image.src = objectUrl;
  });
}

export function PhotoAlbum({
  scope,
  entityId,
  editable = false,
  onActiveChange,
}: {
  scope: PhotoScope;
  entityId: number;
  editable?: boolean;
  onActiveChange?: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = ["photo-album", scope, entityId];
  const readUrl = scope === "user"
    ? `/api/users/${entityId}/photos`
    : `/api/chats/${entityId}/photos`;
  const writeUrl = scope === "user"
    ? "/api/users/me/photos"
    : `/api/chats/${entityId}/photos`;
  const { data, isLoading, isError } = useQuery<PhotoAlbumData>({
    queryKey,
    enabled: Number.isInteger(entityId) && entityId > 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await fetch(readUrl, { headers: tokenHeaders(), cache: "no-store" });
      if (!response.ok) throw new Error("Не удалось загрузить фотографии");
      return response.json();
    },
  });

  const updatePhoto = async (action: "add" | "activate" | "remove", photoUrl: string, activate = false) => {
    const response = await fetch(writeUrl, {
      method: "POST",
      headers: tokenHeaders(true),
      body: JSON.stringify({ action, photoUrl, activate }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Не удалось обновить фотографии");

    queryClient.setQueryData(queryKey, result as PhotoAlbumData);
    queryClient.invalidateQueries({ queryKey });
    if (scope === "user") {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
    } else {
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${entityId}`] });
    }
    onActiveChange?.(result.activeUrl ?? null);
    return result as PhotoAlbumData;
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setBusy(true);
    try {
      let current = data ?? { photos: [], activeUrl: null };
      for (const file of files) {
        if (!file.type.startsWith("image/")) throw new Error("Выберите файл изображения");
        const photoUrl = await compressPhoto(file);
        current = await updatePhoto("add", photoUrl, !current.activeUrl);
      }
      toast({ title: files.length === 1 ? "Фото добавлено" : `Добавлено фото: ${files.length}` });
    } catch (error) {
      toast({
        title: "Не удалось добавить фото",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleAction = async (action: "activate" | "remove", photoUrl: string) => {
    setBusy(true);
    try {
      await updatePhoto(action, photoUrl);
      toast({ title: action === "activate" ? "Основное фото изменено" : "Фото удалено из альбома" });
    } catch (error) {
      toast({
        title: "Не удалось обновить фото",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-background/60 p-4" data-testid={`photo-album-${scope}-${entityId}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">Фотографии</h3>
          <p className="text-xs text-muted-foreground">
            {editable ? `${data?.photos.length ?? 0} из ${MAX_PHOTOS}; отметьте основное фото` : "Все фотографии профиля"}
          </p>
        </div>
        {editable && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFiles}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy || (data?.photos.length ?? 0) >= MAX_PHOTOS}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/20 disabled:opacity-50"
              data-testid={`button-add-photos-${scope}-${entityId}`}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
              Добавить
            </button>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-2">
          {[0, 1, 2].map(index => <div key={index} className="h-20 w-20 animate-pulse rounded-xl bg-secondary" />)}
        </div>
      ) : isError ? (
        <p className="text-xs text-muted-foreground">Не удалось загрузить фотографии.</p>
      ) : !data?.photos.length ? (
        <p className="rounded-xl bg-secondary/50 px-3 py-4 text-center text-xs text-muted-foreground">
          Фотографии ещё не добавлены
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {data.photos.map((url, index) => {
            const active = url === data.activeUrl;
            return (
              <div key={`${url.slice(0, 48)}-${index}`} className="relative">
                <button
                  type="button"
                  onClick={() => editable && !active && void handleAction("activate", url)}
                  disabled={!editable || busy}
                  aria-label={active ? `Основное фото ${index + 1}` : `Сделать фото ${index + 1} основным`}
                  className={`relative h-20 w-20 overflow-hidden rounded-xl border-2 transition ${
                    active ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                  } ${editable ? "cursor-pointer" : "cursor-default"}`}
                  data-testid={`button-photo-${scope}-${entityId}-${index}`}
                >
                  <img src={url} alt={`Фото ${index + 1}`} loading="lazy" className="h-full w-full object-cover" />
                  {active && (
                    <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check size={12} />
                    </span>
                  )}
                </button>
                {editable && (
                  <button
                    type="button"
                    onClick={() => void handleAction("remove", url)}
                    disabled={busy}
                    aria-label={`Удалить фото ${index + 1}`}
                    className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow transition hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
