import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Plus, Users, Crown, Swords, Search, X, ChevronRight,
  LogOut, UserMinus, Star, ArrowLeft, MoreVertical, Check, Lock,
  Camera, Image as ImageIcon, Settings as SettingsIcon, Inbox, UserPlus, Send
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

interface JoinRequest {
  id: number;
  user_id: number;
  message: string | null;
  created_at: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  avatar_color: string;
}

interface Clan {
  id: number;
  name: string;
  tag: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  is_private: boolean;
  wins: number;
  losses: number;
  owner_name: string;
  owner_avatar: string | null;
  owner_color: string;
  member_count: number;
  my_role: "owner" | "officer" | "member" | null;
  my_pending_request?: number;
  created_at: string;
  members?: ClanMember[];
}

function getAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("pulse-token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

// Read + downscale an image file into a compact JPEG data URL for upload.
function readImageAsDataUrl(file: File, maxDim: number, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("no-ctx")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("load-failed")); };
    img.src = objectUrl;
  });
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
  const [isPrivate, setIsPrivate] = useState(false);
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
        body: JSON.stringify({ name: name.trim(), tag: tag.trim().toUpperCase(), description: description.trim(), isPrivate }),
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

          <label className="flex items-center gap-3 p-3 rounded-xl bg-secondary/60 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={e => setIsPrivate(e.target.checked)}
              className="w-4 h-4 rounded accent-primary"
            />
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Lock size={13} /> Закрытый клан
              </p>
              <p className="text-xs text-muted-foreground">Вступление только по заявке, которую одобряет владелец</p>
            </div>
          </label>

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

function EditClanModal({
  clan,
  onClose,
  onSaved,
}: {
  clan: Clan;
  onClose: () => void;
  onSaved: (updated: Partial<Clan>) => void;
}) {
  const [description, setDescription] = useState(clan.description || "");
  const [isPrivate, setIsPrivate] = useState(clan.is_private);
  const [logoUrl, setLogoUrl] = useState(clan.logo_url);
  const [coverUrl, setCoverUrl] = useState(clan.cover_url);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingLogo(true);
    try {
      setLogoUrl(await readImageAsDataUrl(file, 512, 0.85));
    } catch {
      toast({ title: "Не удалось загрузить изображение", variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingCover(true);
    try {
      setCoverUrl(await readImageAsDataUrl(file, 1280, 0.82));
    } catch {
      toast({ title: "Не удалось загрузить изображение", variant: "destructive" });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/clans/${clan.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          description: description.trim(),
          isPrivate,
          logoUrl: logoUrl || "",
          coverUrl: coverUrl || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка сохранения"); return; }
      toast({ title: "Клан обновлён" });
      onSaved({ description: description.trim(), is_private: isPrivate, logo_url: logoUrl, cover_url: coverUrl });
      onClose();
    } catch {
      setError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto scrollbar-none"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <SettingsIcon size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-black text-lg text-foreground">Настройки клана</h2>
            <p className="text-xs text-muted-foreground">[{clan.tag}] {clan.name}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 rounded-xl text-muted-foreground hover:bg-secondary transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Cover upload */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5">Обложка клана</label>
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="relative w-full h-24 rounded-2xl bg-secondary border border-border overflow-hidden flex items-center justify-center group"
            >
              {coverUrl && <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                {uploadingCover ? (
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImageIcon size={14} /> {coverUrl ? "Изменить" : "Загрузить"}
                  </span>
                )}
              </div>
              {!coverUrl && <ImageIcon size={22} className="text-muted-foreground" />}
            </button>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFile} />
          </div>

          {/* Logo upload */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="relative w-16 h-16 rounded-2xl bg-secondary border border-border overflow-hidden flex items-center justify-center shrink-0 group"
            >
              {logoUrl && <img src={logoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                {uploadingLogo ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Camera size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
              {!logoUrl && <span className="text-foreground font-black text-xs">{clan.tag}</span>}
            </button>
            <div>
              <p className="text-sm font-bold text-foreground">Логотип клана</p>
              <p className="text-xs text-muted-foreground">Нажмите на аватар, чтобы загрузить</p>
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5">Описание</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={300}
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
          </div>

          <label className="flex items-center gap-3 p-3 rounded-xl bg-secondary/60 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={e => setIsPrivate(e.target.checked)}
              className="w-4 h-4 rounded accent-primary"
            />
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Lock size={13} /> Закрытый клан
              </p>
              <p className="text-xs text-muted-foreground">Вступление только по заявке</p>
            </div>
          </label>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || uploadingLogo || uploadingCover}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function JoinRequestModal({
  clan,
  onClose,
  onSent,
}: {
  clan: Clan;
  onClose: () => void;
  onSent: () => void;
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/clans/${clan.id}/request`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка отправки заявки"); return; }
      toast({ title: "Заявка отправлена!", description: `[${clan.tag}] ${clan.name}` });
      onSent();
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
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <UserPlus size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-black text-lg text-foreground">Заявка на вступление</h2>
            <p className="text-xs text-muted-foreground">[{clan.tag}] {clan.name}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 rounded-xl text-muted-foreground hover:bg-secondary transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5">Сообщение владельцу <span className="font-normal">(необязательно)</span></label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Расскажите, почему хотите вступить..."
              maxLength={200}
              rows={3}
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send size={14} />
            {loading ? "Отправка..." : "Отправить заявку"}
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
  const [clanState, setClanState] = useState<Clan>(clan);
  const [showEdit, setShowEdit] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestActionId, setRequestActionId] = useState<number | null>(null);
  const [hasSentRequest, setHasSentRequest] = useState(!!clan.my_pending_request);
  const { toast } = useToast();

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/clans/${clan.id}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setClanState(prev => ({ ...prev, ...data, members: undefined }));
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [clan.id]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const myRole = members.find(m => m.user_id === currentUserId)?.role ?? null;
  const isInClan = !!myRole;
  const canManage = myRole === "owner" || myRole === "officer";

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const res = await fetch(`/api/clans/${clan.id}/requests`, { headers: getAuthHeaders() });
      if (res.ok) setRequests(await res.json());
    } catch {} finally {
      setRequestsLoading(false);
    }
  }, [clan.id]);

  useEffect(() => { if (canManage) fetchRequests(); }, [canManage, fetchRequests]);

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

  const handleRequestAccept = async (reqId: number) => {
    setRequestActionId(reqId);
    try {
      const res = await fetch(`/api/clans/${clan.id}/requests/${reqId}/accept`, { method: "POST", headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Ошибка", description: data.error, variant: "destructive" }); return; }
      toast({ title: "Заявка одобрена" });
      setRequests(prev => prev.filter(r => r.id !== reqId));
      fetchMembers();
    } catch {
      toast({ title: "Ошибка сети", variant: "destructive" });
    } finally {
      setRequestActionId(null);
    }
  };

  const handleRequestDecline = async (reqId: number) => {
    setRequestActionId(reqId);
    try {
      const res = await fetch(`/api/clans/${clan.id}/requests/${reqId}/decline`, { method: "POST", headers: getAuthHeaders() });
      if (!res.ok) { const data = await res.json(); toast({ title: "Ошибка", description: data.error, variant: "destructive" }); return; }
      toast({ title: "Заявка отклонена" });
      setRequests(prev => prev.filter(r => r.id !== reqId));
    } catch {
      toast({ title: "Ошибка сети", variant: "destructive" });
    } finally {
      setRequestActionId(null);
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
      className="flex flex-col h-full w-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50 shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl text-muted-foreground hover:bg-secondary transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-muted-foreground bg-secondary px-2 py-0.5 rounded-lg">[{clanState.tag}]</span>
            <h2 className="font-black text-base text-foreground truncate">{clanState.name}</h2>
            {clanState.is_private && <Lock size={12} className="text-muted-foreground shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground">{clanState.member_count} участников</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowEdit(true)}
            title="Настройки клана"
            className="p-2 rounded-xl text-muted-foreground hover:bg-secondary transition-colors"
          >
            <SettingsIcon size={18} />
          </button>
        )}
        {isInClan ? (
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-xs font-bold"
          >
            <LogOut size={14} />
            Выйти
          </button>
        ) : clanState.is_private ? (
          hasSentRequest ? (
            <button disabled className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-muted-foreground text-xs font-bold cursor-default">
              <Check size={14} />
              Заявка отправлена
            </button>
          ) : (
            <button
              onClick={() => setShowRequestModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-bold shadow-md shadow-primary/20"
            >
              <UserPlus size={14} />
              Подать заявку
            </button>
          )
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
        {/* Cover + logo */}
        <div className="relative h-32">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900 overflow-hidden">
            {clanState.cover_url && (
              <img src={clanState.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent" />
          </div>
          <div className="absolute bottom-0 left-4 translate-y-1/2 w-16 h-16 rounded-2xl border-4 border-background bg-gradient-to-br from-slate-600 to-slate-800 overflow-hidden flex items-center justify-center shadow-lg z-10">
            {clanState.logo_url ? (
              <img src={clanState.logo_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <span className="text-white font-black text-sm">{clanState.tag}</span>
            )}
          </div>
        </div>
        <div className="h-9" />

        {/* Clan info */}
        {clanState.description && (
          <div className="px-4 py-3 border-b border-border/30">
            <p className="text-sm text-muted-foreground leading-relaxed">{clanState.description}</p>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 p-4 border-b border-border/30">
          <div className="bg-secondary/60 rounded-2xl p-3 text-center">
            <Users size={18} className="text-primary mx-auto mb-1" />
            <p className="text-lg font-black text-foreground">{clanState.member_count}</p>
            <p className="text-xs text-muted-foreground">Участников</p>
          </div>
          <div className="bg-secondary/60 rounded-2xl p-3 text-center">
            <Swords size={18} className="text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-black text-foreground">{clanState.wins ?? 0}-{clanState.losses ?? 0}</p>
            <p className="text-xs text-muted-foreground">Побед-поражений</p>
          </div>
        </div>

        {/* Pending join requests (owner/officer) */}
        {canManage && (
          <div className="border-b border-border/30">
            <button
              onClick={() => setShowRequests(v => !v)}
              className="w-full flex items-center gap-3 p-4 hover:bg-secondary/40 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Inbox size={16} className="text-amber-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-foreground">Заявки на вступление</p>
                <p className="text-xs text-muted-foreground">{requests.length > 0 ? `${requests.length} ожидают решения` : "Нет новых заявок"}</p>
              </div>
              {showRequests ? <ChevronRight size={16} className="text-muted-foreground rotate-90 transition-transform" /> : <ChevronRight size={16} className="text-muted-foreground" />}
            </button>
            <AnimatePresence>
              {showRequests && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3 space-y-2">
                    {requestsLoading ? (
                      <p className="text-xs text-muted-foreground py-2">Загрузка...</p>
                    ) : requests.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">Заявок пока нет</p>
                    ) : requests.map(r => (
                      <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/50">
                        <Avatar url={r.avatar_url} color={r.avatar_color} name={r.display_name} size={36} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{r.display_name}</p>
                          {r.message && <p className="text-xs text-muted-foreground truncate">{r.message}</p>}
                        </div>
                        <button
                          onClick={() => handleRequestAccept(r.id)}
                          disabled={requestActionId === r.id}
                          className="p-1.5 rounded-lg text-green-500 hover:bg-green-500/10 transition-colors disabled:opacity-50"
                          title="Одобрить"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => handleRequestDecline(r.id)}
                          disabled={requestActionId === r.id}
                          className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                          title="Отклонить"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

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

      <AnimatePresence>
        {showEdit && (
          <EditClanModal
            clan={clanState}
            onClose={() => setShowEdit(false)}
            onSaved={(updated) => { setClanState(prev => ({ ...prev, ...updated })); onRefresh(); }}
          />
        )}
        {showRequestModal && (
          <JoinRequestModal
            clan={clanState}
            onClose={() => setShowRequestModal(false)}
            onSent={() => setHasSentRequest(true)}
          />
        )}
      </AnimatePresence>
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
      <div className="flex flex-col h-full w-full bg-background">
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
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-primary/20 overflow-hidden relative">
              {myClan.logo_url ? <img src={myClan.logo_url} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <Shield size={20} className="text-white" />}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-muted-foreground">[{myClan.tag}]</span>
                <span className="font-bold text-sm text-foreground truncate">{myClan.name}</span>
                {myClan.is_private && <Lock size={11} className="text-muted-foreground shrink-0" />}
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
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shrink-0 shadow-sm overflow-hidden relative">
                  {clan.logo_url ? <img src={clan.logo_url} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <span className="text-white font-black text-xs">{clan.tag}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground truncate">{clan.name}</span>
                    {clan.is_private && <Lock size={11} className="text-muted-foreground shrink-0" />}
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
                    {(clan.wins > 0 || clan.losses > 0) && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <Swords size={11} className="text-amber-500 shrink-0" />
                        <span className="text-xs text-muted-foreground">{clan.wins}-{clan.losses}</span>
                      </>
                    )}
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
