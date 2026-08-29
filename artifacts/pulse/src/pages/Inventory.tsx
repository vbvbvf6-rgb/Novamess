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

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("pulse-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function Inventory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<NicknameStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [equipping, setEquipping] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/users/me/nickname-styles", { headers: authHeaders() });
      if (!response.ok) throw new Error();
      setItems(await response.json());
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