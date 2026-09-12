import { useEffect, useState } from "react";
import { ArrowLeft, Check, Clock3, ExternalLink, Puzzle, Send, ShieldCheck } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { getPluginText, usePluginSystem } from "@/lib/pluginRegistry";
import { Switch } from "@/components/ui/switch";

export default function Plugins() {
  const { lang } = useLanguage();
  const { plugins, isEnabled, setEnabled } = usePluginSystem();
  const ru = lang === "ru";
  const [submission, setSubmission] = useState({ name: "", description: "", version: "1.0.0", entryUrl: "" });
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");

  const loadSubmissions = () => {
    const token = sessionStorage.getItem("pulse-token");
    fetch("/api/plugins/submissions/mine", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((response) => response.ok ? response.json() : [])
      .then(setSubmissions)
      .catch(() => setSubmissions([]));
  };

  useEffect(() => { loadSubmissions(); }, []);

  const submitPlugin = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmissionMessage("");
    try {
      const token = sessionStorage.getItem("pulse-token");
      const response = await fetch("/api/plugins/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(submission),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || (ru ? "Не удалось отправить заявку" : "Could not submit the plugin"));
      setSubmission({ name: "", description: "", version: "1.0.0", entryUrl: "" });
      setSubmissionMessage(ru ? "Заявка отправлена на проверку." : "The plugin was submitted for review.");
      loadSubmissions();
    } catch (error) {
      setSubmissionMessage(error instanceof Error ? error.message : (ru ? "Ошибка соединения" : "Connection error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10">
        <div className="mb-8 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Puzzle size={25} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              {ru ? "Расширения Nova" : "Nova extensions"}
            </p>
            <h1 className="text-3xl font-black tracking-tight">{ru ? "Плагины" : "Plugins"}</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {ru
                ? "Подключайте дополнительные возможности и управляйте ими отдельно для каждого аккаунта."
                : "Add extra capabilities and manage them separately for each account."}
            </p>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
          <ShieldCheck size={20} className="shrink-0 text-primary" />
          <span className="text-muted-foreground">
            {ru
              ? "Плагины появляются после проверки администратора. Внешние страницы запускаются изолированно и не получают доступ к приложению."
              : "Plugins appear after admin review. External pages run in isolation and cannot access the app."}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {plugins.map((plugin) => {
            const enabled = isEnabled(plugin.id);
            const Icon = plugin.icon;
            return (
              <article key={plugin.id} className="flex flex-col rounded-3xl border border-border/60 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground">
                    <Icon size={21} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold">{getPluginText(plugin, lang, "name")}</h2>
                      {enabled && <Check size={15} className="text-emerald-500" />}
                    </div>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">
                      {getPluginText(plugin, lang, "description")}
                    </p>
                  </div>
                  <Switch checked={enabled} onCheckedChange={(value) => setEnabled(plugin.id, value)} aria-label={getPluginText(plugin, lang, "name")} />
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4 text-xs text-muted-foreground">
                  <span>v{plugin.version} · {plugin.author}</span>
                  {enabled ? (
                    <Link href={plugin.route} className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline">
                      {ru ? "Открыть" : "Open"} <ExternalLink size={13} />
                    </Link>
                  ) : (
                    <span>{ru ? "Выключен" : "Disabled"}</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <section className="mt-8 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400">
              <Send size={18} />
            </div>
            <div>
              <h2 className="font-bold">{ru ? "Предложить свой плагин" : "Submit your plugin"}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {ru ? "Разместите страницу плагина по HTTPS и отправьте ссылку. После проверки она станет доступна пользователям." : "Host your plugin page over HTTPS and submit the link. It becomes available after review."}
              </p>
            </div>
          </div>
          <form onSubmit={submitPlugin} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
              <input required value={submission.name} onChange={(event) => setSubmission({ ...submission, name: event.target.value })} placeholder={ru ? "Название плагина" : "Plugin name"} className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              <input required value={submission.version} onChange={(event) => setSubmission({ ...submission, version: event.target.value })} placeholder="1.0.0" className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <textarea required value={submission.description} onChange={(event) => setSubmission({ ...submission, description: event.target.value })} placeholder={ru ? "Что делает плагин" : "What does the plugin do?"} rows={3} className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            <input required type="url" value={submission.entryUrl} onChange={(event) => setSubmission({ ...submission, entryUrl: event.target.value })} placeholder="https://example.com/my-plugin" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
                <Send size={15} /> {submitting ? (ru ? "Отправляем…" : "Submitting…") : (ru ? "Отправить на проверку" : "Submit for review")}
              </button>
              {submissionMessage && <span className="text-xs text-muted-foreground">{submissionMessage}</span>}
            </div>
          </form>
          {submissions.length > 0 && (
            <div className="mt-5 border-t border-border/50 pt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{ru ? "Ваши заявки" : "Your submissions"}</p>
              <div className="space-y-2">
                {submissions.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-xl bg-secondary/40 px-3 py-2 text-sm">
                    <Clock3 size={14} className="text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <span className={item.status === "approved" ? "text-emerald-500" : item.status === "rejected" ? "text-destructive" : "text-amber-500"}>
                      {item.status === "approved" ? (ru ? "одобрено" : "approved") : item.status === "rejected" ? (ru ? "отклонено" : "rejected") : (ru ? "на проверке" : "pending")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function PluginRoute() {
  const { pluginId } = useParams<{ pluginId: string }>();
  const [, navigate] = useLocation();
  const { lang } = useLanguage();
  const { plugins, isEnabled } = usePluginSystem();
  const plugin = plugins.find((item) => item.id === pluginId);

  useEffect(() => {
    if (!plugin || !isEnabled(plugin.id)) navigate("/plugins");
  }, [isEnabled, navigate, plugin]);

  if (!plugin || !isEnabled(plugin.id)) {
    return null;
  }

  const Icon = plugin.icon;
  const Component = plugin.component;

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-5 md:px-8 md:py-8">
        <Link href="/plugins" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft size={16} /> {lang === "ru" ? "Все плагины" : "All plugins"}
        </Link>
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border/50 bg-card px-4 py-3">
          <Icon size={18} className="text-primary" />
          <span className="text-sm font-bold">{getPluginText(plugin, lang, "name")}</span>
        </div>
        <Component />
      </div>
    </div>
  );
}