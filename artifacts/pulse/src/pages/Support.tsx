import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bug, MessageSquare, Plus, Send, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, X, RefreshCw, AlertCircle, Inbox, Crown, Zap,
  Trash2, Paperclip, Image, Flag
} from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";
import { useSearch } from "wouter";

const getCurrentUserId = () => Number(sessionStorage.getItem("pulse-user-id") || "0");
function getHeader(): Record<string, string> {
  const token = sessionStorage.getItem("pulse-token");
  return { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) };
}

const BUG_CATEGORIES = [
  { value: "ui", label: "🖥️ Интерфейс" },
  { value: "crash", label: "💥 Вылет / сбой" },
  { value: "performance", label: "🐢 Производительность" },
  { value: "feature", label: "❌ Функция не работает" },
  { value: "security", label: "🔒 Безопасность" },
  { value: "other", label: "🔧 Другое" },
];

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    new:         { label: "Новый",         cls: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
    acknowledged:{ label: "Принят",        cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
    in_progress: { label: "В работе",      cls: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
    resolved:    { label: "Решён",         cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
    closed:      { label: "Закрыт",        cls: "bg-muted/50 text-muted-foreground border-border" },
    open:        { label: "Открыт",        cls: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
    pending:     { label: "Ожидает ответа",cls: "bg-primary/10 text-primary border-primary/30" },
    answered:    { label: "Отвечен",       cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  };
  const s = map[status] || { label: status, cls: "bg-secondary text-muted-foreground border-border" };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ── Bug Report Form ────────────────────────────────────────────────────────────

function BugReportForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const getPlatformInfo = () => {
    return JSON.stringify({
      ua: navigator.userAgent.slice(0, 200),
      lang: navigator.language,
      screen: `${screen.width}x${screen.height}`,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) { setError("Заполните все поля"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/support/bugs", {
        method: "POST",
        headers: getHeader(),
        body: JSON.stringify({ title: title.trim(), description: description.trim(), category, platformInfo: getPlatformInfo() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка"); setLoading(false); return; }
      setDone(true);
      setTimeout(() => { onSuccess(); }, 1500);
    } catch { setError("Ошибка соединения"); }
    setLoading(false);
  };

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-emerald-400" />
        </div>
        <div className="text-center">
          <h3 className="font-bold text-lg mb-1">Репорт отправлен!</h3>
          <p className="text-sm text-muted-foreground">Мы рассмотрим его в ближайшее время</p>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Категория</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BUG_CATEGORIES.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                category === c.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Заголовок</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Кратко опишите проблему..."
          maxLength={200}
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Описание</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={"Подробно опишите:\n• Что вы делали?\n• Что ожидали увидеть?\n• Что произошло на самом деле?"}
          rows={5}
          maxLength={5000}
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
        />
        <p className="text-[10px] text-muted-foreground mt-1 text-right">{description.length}/5000</p>
      </div>

      <div className="bg-secondary/30 border border-border rounded-xl px-3 py-2 flex items-start gap-2">
        <AlertCircle size={14} className="text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">К репорту автоматически прикрепляется информация о браузере и разрешении экрана</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={loading || !title.trim() || !description.trim()}
        className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Bug size={16} />
        {loading ? "Отправка..." : "Отправить репорт"}
      </button>
    </form>
  );
}

// ── Bug Reports List ───────────────────────────────────────────────────────────

function BugReportsList() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/support/bugs", { headers: getHeader() });
      if (res.ok) setReports(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить этот репорт?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/support/bugs/${id}`, { method: "DELETE", headers: getHeader() });
      if (res.ok) setReports(prev => prev.filter(r => r.id !== id));
    } catch {}
    setDeletingId(null);
  };

  if (showForm) {
    return (
      <div>
        <button onClick={() => setShowForm(false)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
          <ChevronLeft size={16} /> Назад
        </button>
        <BugReportForm onSuccess={() => { setShowForm(false); fetchReports(); }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Мои репорты</h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors"
        >
          <Plus size={14} /> Новый репорт
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-card border border-border rounded-2xl animate-pulse" />)}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bug size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">Репортов нет</p>
          <p className="text-sm mt-1">Нашли баг? Сообщите нам!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-semibold text-sm flex-1 break-words min-w-0">{r.title}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  {statusBadge(r.status)}
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{r.description}</p>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>{BUG_CATEGORIES.find(c => c.value === r.category)?.label || r.category}</span>
                <span>#{r.id}</span>
                <span>{new Date(r.created_at).toLocaleDateString("ru-RU")}</span>
              </div>
              {r.admin_note && (
                <div className="mt-3 p-2 bg-primary/5 border border-primary/20 rounded-xl">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Ответ команды:</p>
                  <p className="text-xs">{r.admin_note}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Support Ticket Thread ─────────────────────────────────────────────────────

function TicketThread({ ticketId, onBack }: { ticketId: number; onBack: () => void }) {
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showAppeal, setShowAppeal] = useState(false);
  const [appealText, setAppealText] = useState("");
  const [appealSending, setAppealSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const fetchTicket = async () => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, { headers: getHeader() });
      if (res.ok) { const data = await res.json(); setTicket(data); }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchTicket(); }, [ticketId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [ticket?.messages?.length]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new window.Image();
      img.onload = () => {
        const MAX = 1024;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        setPhotoPreview(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!msgText.trim() && !photoPreview) || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: getHeader(),
        body: JSON.stringify({ text: msgText.trim() || " ", imageUrl: photoPreview || undefined }),
      });
      if (res.ok) {
        const msg = await res.json();
        setTicket((t: any) => ({ ...t, messages: [...(t.messages || []), msg] }));
        setMsgText("");
        setPhotoPreview(null);
      }
    } catch {}
    setSending(false);
  };

  const handleAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealText.trim() || appealSending) return;
    setAppealSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: getHeader(),
        body: JSON.stringify({ text: `🚩 АПЕЛЛЯЦИЯ: ${appealText.trim()}`, imageUrl: undefined }),
      });
      if (res.ok) {
        const msg = await res.json();
        setTicket((t: any) => ({ ...t, status: "open", messages: [...(t.messages || []), msg] }));
        setShowAppeal(false);
        setAppealText("");
      }
    } catch {}
    setAppealSending(false);
  };

  if (loading) return <div className="flex items-center justify-center py-16"><RefreshCw size={24} className="animate-spin text-muted-foreground" /></div>;
  if (!ticket) return <div className="text-center py-16 text-muted-foreground">Тикет не найден</div>;

  const isClosed = ticket.status === "closed" || ticket.status === "resolved";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm break-words">{ticket.subject}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            {statusBadge(ticket.status)}
            <span className="text-[10px] text-muted-foreground">#{ticket.id}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0 max-h-[400px]">
        {ticket.messages?.map((msg: any) => (
          <div key={msg.id} className={`flex ${msg.is_admin ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
              msg.is_admin
                ? "bg-secondary text-foreground rounded-tl-sm"
                : "bg-primary text-primary-foreground rounded-tr-sm"
            }`}>
              {msg.is_admin && (
                <p className="text-[10px] font-bold text-primary mb-0.5 uppercase tracking-wider">Поддержка</p>
              )}
              {msg.image_url && (
                <img src={msg.image_url} alt="Фото" className="rounded-xl mb-2 max-w-[240px] max-h-48 object-cover cursor-pointer" onClick={() => window.open(msg.image_url, "_blank")} />
              )}
              {msg.text && msg.text.trim() !== " " && <p className="whitespace-pre-wrap">{msg.text}</p>}
              <p className={`text-[10px] mt-1 ${msg.is_admin ? "text-muted-foreground" : "text-primary-foreground/60"}`}>
                {new Date(msg.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {isClosed ? (
        <div className="shrink-0 border-t border-border pt-3">
          <p className="text-center text-sm text-muted-foreground mb-3">Тикет закрыт</p>
          {!showAppeal ? (
            <button
              onClick={() => setShowAppeal(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 text-sm font-semibold transition-colors"
            >
              <Flag size={14} /> Подать апелляцию
            </button>
          ) : (
            <form onSubmit={handleAppeal} className="space-y-2">
              <textarea
                value={appealText}
                onChange={e => setAppealText(e.target.value)}
                placeholder="Опишите причину апелляции..."
                rows={3}
                className="w-full bg-background border border-primary/30 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowAppeal(false); setAppealText(""); }} className="flex-1 py-2 rounded-xl border border-border text-muted-foreground text-sm font-semibold hover:bg-secondary transition-colors">
                  Отмена
                </button>
                <button type="submit" disabled={!appealText.trim() || appealSending} className="flex-1 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold disabled:opacity-50 transition-colors">
                  {appealSending ? "Отправка..." : "Отправить"}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="shrink-0">
          {photoPreview && (
            <div className="relative mb-2 inline-block">
              <img src={photoPreview} alt="Превью" className="rounded-xl max-h-28 object-cover border border-border" />
              <button onClick={() => setPhotoPreview(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center">
                <X size={10} />
              </button>
            </div>
          )}
          <form onSubmit={handleSend} className="flex gap-2">
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="p-2.5 rounded-xl border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
              title="Прикрепить фото"
            >
              <Image size={16} />
            </button>
            <input
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
              placeholder="Написать сообщение..."
              className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button
              type="submit"
              disabled={(!msgText.trim() && !photoPreview) || sending}
              className="p-2.5 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Support Tickets List ───────────────────────────────────────────────────────

function SupportTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState("");
  const [firstMsg, setFirstMsg] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/support/tickets", { headers: getHeader() });
      if (res.ok) setTickets(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !firstMsg.trim()) { setError("Заполните все поля"); return; }
    setCreating(true); setError("");
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: getHeader(),
        body: JSON.stringify({ subject: subject.trim(), firstMessage: firstMsg.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка"); setCreating(false); return; }
      setShowNew(false);
      setSubject(""); setFirstMsg("");
      await fetchTickets();
      setActiveTicket(data.ticket.id);
    } catch { setError("Ошибка соединения"); }
    setCreating(false);
  };

  if (activeTicket) {
    return <TicketThread ticketId={activeTicket} onBack={() => { setActiveTicket(null); fetchTickets(); }} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Мои обращения</h3>
        <button
          onClick={() => setShowNew(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-bold transition-colors"
        >
          {showNew ? <X size={14} /> : <Plus size={14} />}
          {showNew ? "Отмена" : "Новое обращение"}
        </button>
      </div>

      <AnimatePresence>
        {showNew && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={handleCreate}
            className="bg-card border border-primary/30 rounded-2xl p-4 space-y-3 mb-4"
          >
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Тема обращения..."
              maxLength={200}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
            <textarea
              value={firstMsg}
              onChange={e => setFirstMsg(e.target.value)}
              placeholder="Опишите вашу проблему подробно..."
              rows={4}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={creating || !subject.trim() || !firstMsg.trim()}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {creating ? "Создание..." : "Создать обращение"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-20 bg-card border border-border rounded-2xl animate-pulse" />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Inbox size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">Обращений нет</p>
          <p className="text-sm mt-1">Создайте новое, если нужна помощь</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTicket(t.id)}
              className="w-full bg-card border border-border rounded-2xl p-4 text-left hover:border-primary/30 hover:bg-secondary/30 transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="font-semibold text-sm truncate">{t.subject}</p>
                {statusBadge(t.status)}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
                {t.last_is_admin ? "🛡️ Поддержка: " : ""}{t.last_message}
              </p>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>#{t.id}</span>
                <span>{Number(t.message_count)} сообщений</span>
                <span className="ml-auto">{new Date(t.updated_at).toLocaleDateString("ru-RU")}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Support() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialTab = params.get("tab") === "bugs" ? "bugs" : "tickets";
  const [tab, setTab] = useState<"bugs" | "tickets">(initialTab);
  const { data: me } = useGetMe();
  const hasPrime = (me as any)?.hasPrime ?? false;

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <header className="border-b border-border flex items-center px-5 gap-3 bg-card/90 backdrop-blur-xl z-10 shrink-0 relative overflow-hidden" style={{ minHeight: "calc(4rem + env(safe-area-inset-top, 0px))", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/6 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10 flex-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))", border: "1px solid rgba(59,130,246,0.2)" }}>
            <MessageSquare size={17} className="text-primary" />
          </div>
          <h1 className="text-xl font-black text-foreground">Поддержка</h1>
          {hasPrime && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Crown size={9} /> PRIME
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 pb-24 md:pb-6 space-y-4">

          {/* Tabs */}
          <div className="flex gap-1 bg-secondary/50 rounded-2xl p-1">
            <button
              onClick={() => setTab("tickets")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === "tickets" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare size={15} /> Поддержка
            </button>
            <button
              onClick={() => setTab("bugs")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === "bugs" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bug size={15} /> Сообщить об ошибке
            </button>
          </div>

          {/* Info banner */}
          {tab === "tickets" && !hasPrime && (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
              <Clock size={18} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Служба поддержки</p>
                <p className="text-xs text-muted-foreground mt-0.5">Создайте обращение — наша команда ответит в ближайшее время. Среднее время ответа: 1–24 часа.</p>
              </div>
            </div>
          )}
          {tab === "bugs" && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
              <Bug size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Репорт бага</p>
                <p className="text-xs text-muted-foreground mt-0.5">Помогите нам улучшить Nova. Каждый репорт рассматривается нашей командой разработчиков.</p>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: tab === "tickets" ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {tab === "tickets" ? <SupportTickets /> : <BugReportsList />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
