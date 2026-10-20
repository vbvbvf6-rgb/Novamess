import { useCallback, useEffect, useState } from "react";
import { Check, Palette, RefreshCw, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface NicknameStyle {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: string;
  preview_css?: string;
  equipped: boolean;
}

interface AvatarFrame {
  id: number;
  slug: string;
  name: string;
  description: string;
  equipped: boolean;
}

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("pulse-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function Inventory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<NicknameStyle[]>([]);
  const [frames, setFrames] = useState<AvatarFrame[]>([]);
  const [loading, setLoading] = useState(true);
  const [equipping, setEquipping] = useState<number | null>(null);
  const [equippingFrame, setEquippingFrame] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stylesResponse, framesResponse] = await Promise.all([
        fetch("/api/users/me/nickname-styles", { headers: authHeaders() }),
        fetch("/api/users/me/avatar-frames", { headers: authHeaders() }),
      ]);
      if (!stylesResponse.ok || !framesResponse.ok) throw new Error();
      const [styles, avatarFrames] = await Promise.all([stylesResponse.json(), framesResponse.json()]);
      setItems(Array.isArray(styles) ? styles : []);
      setFrames(Array.isArray(avatarFrames) ? avatarFrames : []);
    } catch {
      toast({ title: "Не удалось загрузить инвентарь", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const equip = async (item: NicknameStyle) => {
    setEquipping(item.id);
    try {
      const response = await fetch(`/api/users/me/nickname-styles/${item.id}/equip`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setItems(current => current.map(entry => ({ ...entry, equipped: entry.id === item.id })));
      await queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      window.dispatchEvent(new CustomEvent("pulse:user-profile-updated", {
        detail: { nicknameStyle: data.nicknameStyle ?? item.slug },
      }));
      window.dispatchEvent(new CustomEvent("pulse:nickname-style-changed", { detail: { style: item.slug } }));
      toast({ title: `Стиль «${item.name}» активирован` });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Не удалось активировать стиль", variant: "destructive" });
    } finally {
      setEquipping(null);
    }
  };

  const equipFrame = async (slug: string) => {
    setEquippingFrame(slug);
    try {
      const response = await fetch(`/api/users/me/avatar-frames/${encodeURIComponent(slug)}/equip`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setFrames(current => current.map(frame => ({ ...frame, equipped: frame.slug === slug })));
      await queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      window.dispatchEvent(new CustomEvent("pulse:avatar-frame-changed", { detail: { frame: slug } }));
      toast({ title: "Хэллоуинская рамка активирована" });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Не удалось активировать рамку", variant: "destructive" });
    } finally {
      setEquippingFrame(null);
    }
  };

  const removeFrame = async () => {
    setEquippingFrame("none");
    try {
      const response = await fetch("/api/users/me/avatar-frames/none/equip", {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setFrames(current => current.map(frame => ({ ...frame, equipped: false })));
      await queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      window.dispatchEvent(new CustomEvent("pulse:avatar-frame-changed", { detail: { frame: null } }));
      toast({ title: "Рамка снята" });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Не удалось снять рамку", variant: "destructive" });
    } finally {
      setEquippingFrame(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <header className="border-b border-border flex items-center justify-between px-5 shrink-0" style={{ minHeight: "calc(4rem + env(safe-area-inset-top, 0px))", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-violet-500/10 border border-fuchsia-500/25 flex items-center justify-center">
            <Sparkles size={17} className="text-fuchsia-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Инвентарь</h1>
            <p className="text-xs text-muted-foreground">Твои стили никнейма</p>
          </div>
        </div>
        <button onClick={load} className="p-2 rounded-xl text-muted-foreground hover:bg-secondary" title="Обновить">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <div className="mb-5 rounded-2xl border border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-500/10 to-violet-500/10 p-5">
            <div className="flex items-center gap-3 mb-2">
              <Palette size={20} className="text-fuchsia-400" />
              <h2 className="font-bold">Цветной ник виден везде</h2>
            </div>
            <p className="text-sm text-muted-foreground">Выбери оформление — оно будет отображаться в чатах, группах, каналах, кланах и профиле.</p>
          </div>
            <div className="mb-5 rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-violet-500/10 p-5">
              <div className="mb-2 flex items-center gap-3">
                <span className="text-xl">🎃</span>
                <h2 className="font-bold">Рамки профиля</h2>
              </div>
              <p className="text-sm text-muted-foreground">Рамка появится вокруг аватара в твоём и публичном профиле.</p>
              {frames.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">Рамок пока нет — получи её за хэллоуинский квест или от администратора.</p>
              ) : (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {frames.map(frame => (
                    <button
                      key={frame.id}
                      data-testid={`button-equip-frame-${frame.slug}`}
                      onClick={() => !frame.equipped && equipFrame(frame.slug)}
                      disabled={equippingFrame !== null}
                      className={`flex min-w-0 items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors ${frame.equipped ? "border-orange-500/50 bg-orange-500/10" : "border-border bg-card hover:border-orange-500/40"}`}
                    >
                      <span className={`avatar-frame-${frame.slug} flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-lg`}>👻</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{frame.name}</span>
                        <span className="block text-xs text-muted-foreground">{frame.equipped ? "Активна" : "Нажми, чтобы надеть"}</span>
                      </span>
                      {frame.equipped && <Check size={15} className="shrink-0 text-orange-400" />}
                    </button>
                  ))}
                  {frames.some(frame => frame.equipped) && (
                    <button
                      data-testid="button-remove-avatar-frame"
                      onClick={removeFrame}
                      disabled={equippingFrame !== null}
                      className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary disabled:opacity-50"
                    >
                      Снять рамку
                    </button>
                  )}
                </div>
              )}
            </div>
          {loading ? <div className="py-16 text-center text-muted-foreground">Загрузка инвентаря…</div> : items.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-2xl">В инвентаре пока нет стилей</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {items.map((item, index) => (
                <motion.button key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
                  onClick={() => !item.equipped && equip(item)} disabled={equipping !== null}
                  className={`text-left rounded-2xl border p-4 transition-all ${item.equipped ? "border-primary/50 bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className={`text-lg font-black nickname-style nickname-style-${item.slug}`}>@username</span>
                    {item.equipped ? <span className="text-xs text-emerald-400 font-bold flex items-center gap-1"><Check size={14} /> Активен</span> : <span className="text-xs text-muted-foreground">Нажми, чтобы надеть</span>}
                  </div>
                  <p className="font-semibold text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}