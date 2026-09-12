import { useEffect } from "react";
import { ArrowLeft, Check, ExternalLink, Puzzle, ShieldCheck } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { getPluginText, usePluginSystem } from "@/lib/pluginRegistry";
import { Switch } from "@/components/ui/switch";

export default function Plugins() {
  const { lang } = useLanguage();
  const { plugins, isEnabled, setEnabled } = usePluginSystem();
  const ru = lang === "ru";

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
              ? "Плагины подключаются из проверенного реестра приложения. Произвольный код из браузера не выполняется."
              : "Plugins come from the app's trusted registry. Arbitrary browser code is never executed."}
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