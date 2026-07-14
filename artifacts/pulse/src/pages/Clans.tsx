import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Plus, Users, Crown, Swords, Search, X, ChevronRight,
  LogOut, UserMinus, Star, ArrowLeft, MoreVertical, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ClanMember {
  user_id: number;
  display_name: string;
  username: string;
  avatar_url: string | null;
  avatar_color: string;
  role: "owner" | "officer" | "member";
  status: string;
  joined_at: string;
}

interface Clan {
  id: number;
  name: string;
  tag: string;
  description: string | null;
  logo_url: string | null;
  owner_name: string;
  owner_avatar: string | null;
  owner_color: string;
  member_count: number;
  my_role: "owner" | "officer" | "member" | null;
  created_at: string;
  members?: ClanMember[];
}

function getAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("pulse-token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function Avatar({ url, color, name, size = 40 }: { url?: string | null; color?: string; name: string; size?: number }) {
  const initial = name?.[0]?.toUpperCase() || "?";
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold overflow-hidden shrink-0 relative"
      style={{ width: size, height: size, backgroundColor: color || "#3B82F6", fontSize: size * 0.38 }}
    >
      <span className="absolute inset-0 flex items-center justify-center">{initial}</span>
      {url && <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Владелец",
  officer: "Офицер",
  member: "Участник",
};

const ROLE_COLOR: Record<string, string> = {
  owner: "text-yellow-500",
  officer: "text-blue-400",
  member: "text-muted-foreground",
};

function CreateClanModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/clans", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: name.trim(), tag: tag.trim().toUpperCase(), description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка создания клана"); return; }
      toast({ title: "Клан создан!", description: `[${data.tag}] ${data.name}` });
      onCreated();
      onClose();
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-black text-lg text-foreground">Создать клан</h2>
            <p className="text-xs text-muted-foreground">Объедините игроков</p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 rounded-xl text-muted-foreground hover:bg-secondary transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5">Название</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Например: Ночная Стража"
              maxLength={50}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5">Тег (2-5 символов)</label>
            <input
              type="text"
              value={tag}
              onChange={e => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="NW"
              maxLength={5}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">Только заглавные латинские буквы и цифры</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5">Описание <span className="font-normal">(необязательно)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="О чём ваш клан?"
              maxLength={300}
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim() || !tag.trim()}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Создание..." : "Создать клан"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function ClanDetailView({
  clan,
  currentUserId,
  onBack,
  onRefresh,
}: {
  clan: Clan;
  currentUserId: number;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const [members, setMembers] = useState<ClanMember[]>(clan.members || []);
  const [loading, setLoading] = useState(!clan.members);
  const { toast } = useToast();

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/clans/${clan.id}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [clan.id]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const myRole = members.find(m => m.user_id === currentUserId)?.role ?? null;
  const isInClan = !!myRole;

  const handleJoin = async () => {
    try {
      const res = await fetch(`/api/clans/${clan.id}/join`, { method: "POST", headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Ошибка", description: data.error, variant: "destructive" }); return; }
      toast({ title: "Вы вступили в клан!", description: clan.name });
      fetchMembers();
      onRefresh();
    } catch {
      toast({ title: "Ошибка сети", variant: "destructive" });
    }
  };

  const handleLeave = async () => {
    try {
      const res = await fetch(`/api/clans/${clan.id}/leave`, { method: "POST", headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Ошибка", description: data.error, variant: "destructive" }); return; }
      toast({ title: "Вы покинули клан" });
      fetchMembers();
      onRefresh();
    } catch {
      toast({ title: "Ошибка сети", variant: "destructive" });
    }
  };

  const handleKick = async (userId: number) => {
    try {
      const res = await fetch(`/api/clans/${clan.id}/members/${userId}`, { method: "DELETE", headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Ошибка", description: data.error, variant: "destructive" }); return; }
      toast({ title: "Участник исключён" });
      fetchMembers();
    } catch {}
  };

  const handlePromote = async (userId: number, newRole: "officer" | "member") => {
    try {
      const res = await fetch(`/api/clans/${clan.id}/members/${userId}/role`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Ошибка", description: data.error, variant: "destructive" }); return; }
      toast({ title: newRole === "officer" ? "Назначен офицером" : "Понижен до участника" });
      fetchMembers();
    } catch {}
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50 shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl text-muted-foreground hover:bg-secondary transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-muted-foreground bg-secondary px-2 py-0.5 rounded-lg">[{clan.tag}]</span>
            <h2 className="font-black text-base text-foreground truncate">{clan.name}</h2>
          </div>
          <p className="text-xs text-muted-foreground">{clan.member_count} участников</p>
        </div>
        {isInClan ? (
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-xs font-bold"
          >
            <LogOut size={14} />
            Выйти
          </button>
        ) : (
          <button
            onClick={handleJoin}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-bold shadow-md shadow-primary/20"
          >
            <Plus size={14} />
            Вступить
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none">
        {/* Clan info */}
        {clan.description && (
          <div className="px-4 py-3 border-b border-border/30">
            <p className="text-sm text-muted-foreground leading-relaxed">{clan.description}</p>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 p-4 border-b border-border/30">
          <div className="bg-secondary/60 rounded-2xl p-3 text-center">
            <Users size={18} className="text-primary mx-auto mb-1" />
            <p className="text-lg font-black text-foreground">{clan.member_count}</p>
            <p className="text-xs text-muted-foreground">Участников</p>
          </div>
          <div className="bg-secondary/60 rounded-2xl p-3 text-center">
            <Swords size={18} className="text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-black text-foreground">—</p>
            <p className="text-xs text-muted-foreground">Побед в битвах</p>
          </div>
        </div>

        {/* Members list */}
        <div className="p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Участники</p>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-secondary" />
                  <div className="flex-1">
                    <div className="h-3 bg-secondary rounded-full w-24 mb-1.5" />
                    <div className="h-2.5 bg-secondary rounded-full w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-secondary/50 transition-colors group">
                  <Avatar url={m.avatar_url} color={m.avatar_color} name={m.display_name} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{m.display_name}</p>
                    <p className={cn("text-xs font-semibold", ROLE_COLOR[m.role])}>
                      {m.role === "owner" && <Crown size={10} className="inline mr-1" />}
                      {ROLE_LABEL[m.role]}
                    </p>
                  </div>
                  {/* Management actions (owner only on non-owners) */}
                  {myRole === "owner" && m.user_id !== currentUserId && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {m.role === "member" ? (
                        <button
                          onClick={() => handlePromote(m.user_id, "officer")}
                          title="Назначить офицером"
                          className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-400/10 transition-colors"
                        >
                          <Star size={14} />
                        </button>
                      ) : m.role === "officer" ? (
                        <button
                          onClick={() => handlePromote(m.user_id, "member")}
                          title="Понизить до участника"
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                        >
                          <Star size={14} />
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleKick(m.user_id)}
                        title="Исключить"
                        className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <UserMinus size={14} />
                      </button>
                    </div>
                  )}
                  {/* Officers can kick regular members */}
                  {myRole === "officer" && m.role === "member" && m.user_id !== currentUserId && (
                    <button
                      onClick={() => handleKick(m.user_id)}
                      title="Исключить"
                      className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <UserMinus size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function Clans() {
  const [clans, setClans] = useState<Clan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedClan, setSelectedClan] = useState<Clan | null>(null);
  const currentUserId = Number(sessionStorage.getItem("pulse-user-id") || "0");

  const fetchClans = useCallback(async () => {
    try {
      const res = await fetch("/api/clans", { headers: getAuthHeaders() });
      if (res.ok) setClans(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClans(); }, [fetchClans]);

  const filtered = clans.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.tag.toLowerCase().includes(search.toLowerCase())
  );

  const myClan = clans.find(c => c.my_role !== null);

  if (selectedClan) {
    return (
      <div className="flex flex-col h-full bg-background">
        <AnimatePresence mode="wait">
          <ClanDetailView
            key={selectedClan.id}
            clan={selectedClan}
            currentUserId={currentUserId}
            onBack={() => { setSelectedClan(null); fetchClans(); }}
            onRefresh={fetchClans}
          />
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Swords size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-black text-xl text-foreground">Кланы</h1>
            <p className="text-xs text-muted-foreground">Объединяйтесь и сражайтесь</p>
          </div>
          {!myClan && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 hover:bg-primary/90 transition-all"
            >
              <Plus size={14} />
              Создать
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск кланов..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all"
          />
        </div>
      </div>

      {/* My clan banner */}
      {myClan && (
        <div className="px-4 py-3 border-b border-border/30 bg-primary/5">
          <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">Мой клан</p>
          <button
            onClick={() => setSelectedClan(myClan)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-primary/20 hover:border-primary/40 shadow-sm transition-all"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
              <Shield size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-muted-foreground">[{myClan.tag}]</span>
                <span className="font-bold text-sm text-foreground truncate">{myClan.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABEL[myClan.my_role!]} · {myClan.member_count} участников
              </p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground shrink-0" />
          </button>
        </div>
      )}

      {/* Clans list */}
      <div className="flex-1 overflow-y-auto scrollbar-none p-4">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border animate-pulse">
                <div className="w-11 h-11 rounded-2xl bg-secondary shrink-0" />
                <div className="flex-1">
                  <div className="h-3.5 bg-secondary rounded-full w-32 mb-2" />
                  <div className="h-2.5 bg-secondary rounded-full w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 flex items-center justify-center mb-4">
              <Swords size={28} className="text-amber-500" />
            </div>
            <p className="font-bold text-foreground mb-1">
              {search ? "Кланы не найдены" : "Кланов пока нет"}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {search ? "Попробуйте другой запрос" : "Станьте первым — создайте клан!"}
            </p>
            {!search && !myClan && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
              >
                <Plus size={16} />
                Создать клан
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((clan, i) => (
              <motion.button
                key={clan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedClan(clan)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all text-left"
              >
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-white font-black text-xs">{clan.tag}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground truncate">{clan.name}</span>
                    {clan.my_role && (
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">МОЙ</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Users size={11} className="text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground">{clan.member_count}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <Crown size={11} className="text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">{clan.owner_name}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground shrink-0" />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateClanModal onClose={() => setShowCreate(false)} onCreated={fetchClans} />
        )}
      </AnimatePresence>
    </div>
  );
}
