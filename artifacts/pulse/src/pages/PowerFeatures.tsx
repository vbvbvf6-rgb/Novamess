import React, { useEffect, useMemo, useState } from "react";
import { useGetContacts } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import AccessibilityPanel from "@/components/feature-panels/AccessibilityPanel";
import { cn } from "@/lib/utils";
import {
  Accessibility, Shield, Users, ListMusic, Save, Plus, Trash2, Play,
  Pause, FileAudio, UserCog, ScrollText, ShieldAlert, CheckCircle2,
} from "lucide-react";

const tokenHeaders = () => {
  const token = sessionStorage.getItem("pulse-token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { ...tokenHeaders(), ...(init?.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Не удалось выполнить запрос");
  return data as T;
}

function Card({ title, description, icon, children }: { title: string; description: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card/80 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center" aria-hidden="true">{icon}</div>
        <div><h2 className="font-bold text-base">{title}</h2><p className="text-xs text-muted-foreground mt-0.5">{description}</p></div>
      </div>
      {children}
    </section>
  );
}

function Choice({ label, value, current, onClick }: { label: string; value: string; current: string; onClick: (value: string) => void }) {
  return <button type="button" onClick={() => onClick(value)} aria-pressed={current === value}
    className={cn("px-3 py-2 rounded-xl border text-xs font-semibold transition-colors", current === value ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary")}>{label}</button>;
}

export function PrivacyPanel() {
  const { lang } = useLanguage();
  const { data: contacts } = useGetContacts();
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [overrideId, setOverrideId] = useState("");
  const [override, setOverride] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const fields = [
    ["whoCanMessage", lang === "ru" ? "Кто может писать первым" : "Who can message first"],
    ["whoCanInvite", lang === "ru" ? "Кто может приглашать в группы" : "Who can invite you"],
    ["phoneVisibility", lang === "ru" ? "Номер телефона виден" : "Phone number visible to"],
    ["onlineVisibility", lang === "ru" ? "Статус онлайн виден" : "Online status visible to"],
    ["avatarVisibility", lang === "ru" ? "Аватар виден" : "Avatar visible to"],
    ["callsFrom", lang === "ru" ? "Кто может звонить" : "Who can call"],
  ];
  const labels = { everyone: lang === "ru" ? "Все" : "Everyone", contacts: lang === "ru" ? "Контакты" : "Contacts", nobody: lang === "ru" ? "Никто" : "Nobody" };
  useEffect(() => { api<any>("/api/privacy/settings").then(setSettings).catch(() => setSettings({})); }, []);
  const save = async (next: Record<string, string>) => {
    setSettings(next); await api("/api/privacy/settings", { method: "PUT", body: JSON.stringify(next) }); setSaved(true); setTimeout(() => setSaved(false), 1600);
  };
  const saveOverride = async () => {
    if (!overrideId) return;
    await api(`/api/privacy/overrides/${overrideId}`, { method: "PUT", body: JSON.stringify(override) });
    setOverride({}); setOverrideId(""); setSaved(true); setTimeout(() => setSaved(false), 1600);
  };
  return <Card title={lang === "ru" ? "Приватность" : "Privacy"} description={lang === "ru" ? "Серверные правила и исключения для отдельных контактов" : "Server-side rules and per-contact exceptions"} icon={<Shield size={18} />}>
    <div className="p-5 space-y-5">
      {!settings ? <div className="text-sm text-muted-foreground">Загрузка…</div> : fields.map(([key, title]) => <div key={key} className="space-y-2">
        <p className="text-sm font-semibold">{title}</p><div className="flex flex-wrap gap-2">
          {(["everyone", "contacts", "nobody"] as const).map(value => <Choice key={value} value={value} label={labels[value]} current={settings[key] || "everyone"} onClick={v => save({ ...settings, [key]: v })} />)}
        </div>
      </div>)}
      <div className="pt-3 border-t border-border space-y-3">
        <div><p className="text-sm font-semibold">{lang === "ru" ? "Исключение для контакта" : "Contact exception"}</p><p className="text-xs text-muted-foreground">Можно переопределить любое правило только для одного человека.</p></div>
        <select value={overrideId} onChange={e => setOverrideId(e.target.value)} aria-label="Контакт" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
          <option value="">Выберите контакт</option>{(contacts as any[] || []).map(contact => <option key={contact.id} value={contact.id}>{contact.displayName || contact.username}</option>)}
        </select>
        {overrideId && <div className="grid sm:grid-cols-2 gap-2">{fields.map(([key, title]) => <label key={key} className="text-xs text-muted-foreground">{title}<select value={override[key] || ""} onChange={e => setOverride(prev => ({ ...prev, [key]: e.target.value }))} className="mt-1 w-full rounded-xl border border-border bg-background px-2 py-2 text-xs"><option value="">По умолчанию</option><option value="everyone">Все</option><option value="contacts">Контакты</option><option value="nobody">Никто</option></select></label>)}</div>}
        {overrideId && <button type="button" onClick={saveOverride} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Save size={15} /> Сохранить исключение</button>}
      </div>
      {saved && <p className="text-xs text-green-500 flex items-center gap-1"><CheckCircle2 size={14} /> Сохранено</p>}
    </div>
  </Card>;
}

export function AntiSpamPanel() {
  const [chatId, setChatId] = useState("");
  const [config, setConfig] = useState<any>({ captcha_enabled: false, slow_mode_seconds: 0, links_new_member_seconds: 0, filter_words_enabled: false, suspicious_accounts_enabled: true, banned_words: [] });
  const [words, setWords] = useState("");
  const [message, setMessage] = useState("");
  const load = async () => { if (!chatId) return; try { const data = await api<any>(`/api/chats/${chatId}/antispam`); setConfig(data); setWords((data.banned_words || []).join(", ")); } catch (e) { setMessage((e as Error).message); } };
  const save = async () => { try { const data = await api<any>(`/api/chats/${chatId}/antispam`, { method: "PUT", body: JSON.stringify({ captchaEnabled: config.captcha_enabled, slowModeSeconds: config.slow_mode_seconds, linksNewMemberSeconds: config.links_new_member_seconds, filterWordsEnabled: config.filter_words_enabled, suspiciousAccountsEnabled: config.suspicious_accounts_enabled, bannedWords: words.split(",").map(w => w.trim()).filter(Boolean) }) }); setConfig(data); setMessage("Антиспам сохранён"); } catch (e) { setMessage((e as Error).message); } };
  const toggle = (key: string) => setConfig((v: any) => ({ ...v, [key]: !v[key] }));
  return <Card title="Антиспам групп" description="CAPTCHA, slow mode, ссылки новых участников и фильтры" icon={<ShieldAlert size={18} />}><div className="p-5 space-y-4">
    <div className="flex gap-2"><input value={chatId} onChange={e => setChatId(e.target.value)} placeholder="ID группы" inputMode="numeric" className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" /><button onClick={load} className="px-4 rounded-xl border border-border text-sm font-semibold hover:bg-secondary">Загрузить</button></div>
    <div className="grid sm:grid-cols-2 gap-2">{[["captcha_enabled", "CAPTCHA для новых участников"], ["filter_words_enabled", "Фильтр запрещённых слов"], ["suspicious_accounts_enabled", "Проверка подозрительных аккаунтов"]].map(([key, label]) => <button key={key} type="button" onClick={() => toggle(key)} aria-pressed={config[key]} className={cn("p-3 rounded-2xl border text-left text-sm font-semibold", config[key] ? "border-primary bg-primary/10" : "border-border")}>{config[key] ? "✓ " : ""}{label}</button>)}</div>
    <div className="grid sm:grid-cols-2 gap-3"><label className="text-xs text-muted-foreground">Медленный режим (сек.)<input type="number" min="0" max="86400" value={config.slow_mode_seconds || 0} onChange={e => setConfig((v: any) => ({ ...v, slow_mode_seconds: Number(e.target.value) }))} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" /></label><label className="text-xs text-muted-foreground">Ссылки запрещены новым участникам (сек.)<input type="number" min="0" max="2592000" value={config.links_new_member_seconds || 0} onChange={e => setConfig((v: any) => ({ ...v, links_new_member_seconds: Number(e.target.value) }))} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" /></label></div>
    <label className="text-xs text-muted-foreground">Слова через запятую<input value={words} onChange={e => setWords(e.target.value)} placeholder="слово, фраза" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" /></label>
    <button onClick={save} disabled={!chatId} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Save size={15} /> Сохранить</button>{message && <p className="text-xs text-muted-foreground">{message}</p>}
  </div></Card>;
}

export function RolesPanel() {
  const [chatId, setChatId] = useState(""); const [memberId, setMemberId] = useState(""); const [role, setRole] = useState("moderator"); const [roles, setRoles] = useState<any[]>([]); const [log, setLog] = useState<any[]>([]); const [message, setMessage] = useState("");
  const load = async () => { if (!chatId) return; try { const data = await api<any>(`/api/chats/${chatId}/roles`); setRoles(data.roles || []); setLog(await api<any[]>(`/api/chats/${chatId}/action-log`)); } catch (e) { setMessage((e as Error).message); } };
  const assign = async () => { try { await api(`/api/chats/${chatId}/roles/${memberId}`, { method: "PATCH", body: JSON.stringify({ role }) }); setMessage("Роль обновлена"); await load(); } catch (e) { setMessage((e as Error).message); } };
  return <Card title="Роли и журнал действий" description="Модератор, редактор, помощник и аналитик с отдельными правами" icon={<UserCog size={18} />}><div className="p-5 space-y-4">
    <div className="flex gap-2"><input value={chatId} onChange={e => setChatId(e.target.value)} placeholder="ID группы" className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" /><button onClick={load} className="px-4 rounded-xl border border-border text-sm font-semibold">Загрузить</button></div>
    <div className="grid grid-cols-[1fr_auto_auto] gap-2"><input value={memberId} onChange={e => setMemberId(e.target.value)} placeholder="ID участника" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" /><select value={role} onChange={e => setRole(e.target.value)} className="rounded-xl border border-border bg-background px-2 text-sm"><option value="moderator">Модератор</option><option value="editor">Редактор</option><option value="assistant">Помощник</option><option value="analyst">Аналитик</option><option value="member">Участник</option></select><button onClick={assign} className="rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground">Назначить</button></div>
    {roles.length > 0 && <div className="space-y-2">{roles.map(item => <div key={item.user_id} className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2 text-sm"><span>{item.display_name || item.username}</span><span className="text-xs font-semibold text-primary">{item.role}</span></div>)}</div>}
    {log.length > 0 && <div className="pt-3 border-t border-border"><h3 className="text-sm font-semibold flex items-center gap-2 mb-2"><ScrollText size={15} /> Последние действия</h3>{log.slice(0, 8).map(item => <p key={item.id} className="text-xs text-muted-foreground py-1">{item.actor_name || "Система"} · {item.action}</p>)}</div>}
    {message && <p className="text-xs text-muted-foreground">{message}</p>}
  </div></Card>;
}

type Playlist = { id: number; name: string; description?: string; track_count?: number };
type Track = { id: number; title: string; artist?: string; media_url: string };

export function PlaylistWidget({ compact = false }: { compact?: boolean }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]); const [selected, setSelected] = useState<any>(null); const [name, setName] = useState(""); const [title, setTitle] = useState(""); const [artist, setArtist] = useState(""); const [url, setUrl] = useState(""); const [playing, setPlaying] = useState<number | null>(null); const [error, setError] = useState("");
  const load = async () => { try { setPlaylists(await api<Playlist[]>("/api/playlists")); } catch (e) { setError((e as Error).message); } };
  useEffect(() => { load(); }, []);
  const create = async () => { if (!name.trim()) return; await api("/api/playlists", { method: "POST", body: JSON.stringify({ name }) }); setName(""); load(); };
  const open = async (id: number) => setSelected(await api<any>(`/api/playlists/${id}`));
  const addTrack = async () => { if (!selected || !title.trim() || !url.trim()) return; await api(`/api/playlists/${selected.id}/tracks`, { method: "POST", body: JSON.stringify({ title, artist, mediaUrl: url }) }); setTitle(""); setArtist(""); setUrl(""); open(selected.id); load(); };
  const removeTrack = async (id: number) => { await api(`/api/playlists/${selected.id}/tracks/${id}`, { method: "DELETE" }); open(selected.id); load(); };
  return <div className={cn("space-y-3", compact && "text-sm")}><div className="flex items-center gap-2"><ListMusic size={18} className="text-primary" /><h3 className="font-bold">Плейлисты</h3></div>
    <div className="flex gap-2"><input value={name} onChange={e => setName(e.target.value)} placeholder="Новый плейлист" className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" /><button onClick={create} className="rounded-xl bg-primary px-3 text-primary-foreground"><Plus size={16} /></button></div>
    <div className="flex gap-2 overflow-x-auto pb-1">{playlists.map(p => <button key={p.id} onClick={() => open(p.id)} className={cn("shrink-0 rounded-xl border px-3 py-2 text-left", selected?.id === p.id ? "border-primary bg-primary/10" : "border-border")}><span className="block font-semibold">{p.name}</span><span className="text-[11px] text-muted-foreground">{p.track_count || 0} треков</span></button>)}</div>
    {selected && <div className="rounded-2xl border border-border bg-background/50 p-3 space-y-2"><p className="font-bold">{selected.name}</p>{(selected.tracks as Track[]).map(track => <div key={track.id} className="flex items-center gap-2 rounded-xl bg-secondary/50 p-2"><button onClick={() => setPlaying(playing === track.id ? null : track.id)} aria-label={playing === track.id ? "Пауза" : "Воспроизвести"} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">{playing === track.id ? <Pause size={14} /> : <Play size={14} />}</button><div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{track.title}</p><p className="text-xs text-muted-foreground truncate">{track.artist || "Nova"}</p></div><button onClick={() => removeTrack(track.id)} aria-label="Удалить трек" className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>{playing === track.id && <audio src={track.media_url} controls autoPlay className="w-full max-w-[240px]" onEnded={() => setPlaying(null)} />}</div>)}
      <div className="grid sm:grid-cols-3 gap-2 pt-2"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Название трека" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" /><input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Исполнитель" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" /><input value={url} onChange={e => setUrl(e.target.value)} placeholder="Ссылка на аудио" type="url" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" /></div><button onClick={addTrack} className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary"><FileAudio size={14} /> Добавить трек</button>
    </div>}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}

export default function PowerFeatures() {
  const { lang } = useLanguage();
  return <div className="flex-1 overflow-y-auto"><div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
    <header><p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">Nova / Power features</p><h1 className="text-2xl sm:text-3xl font-black mt-2">{lang === "ru" ? "Комфорт, приватность и сообщества" : "Comfort, privacy and communities"}</h1><p className="text-sm text-muted-foreground mt-2 max-w-2xl">{lang === "ru" ? "Все критичные правила синхронизируются с сервером. Локальные настройки доступны сразу, даже офлайн." : "Critical rules sync to the server. Local accessibility settings apply instantly, even offline."}</p></header>
    <AccessibilityPanel lang={lang === "ru" ? "ru" : "en"} />
    <PrivacyPanel /><AntiSpamPanel /><RolesPanel />
    <Card title="Музыка в профиле" description="Создавайте плейлисты и слушайте отправленные или внешние аудиотреки" icon={<ListMusic size={18} />}><div className="p-5"><PlaylistWidget /></div></Card>
  </div></div>;
}