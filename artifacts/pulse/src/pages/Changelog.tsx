import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Newspaper, RefreshCw, Rocket, Calendar, Tag, Sparkles, ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface AppUpdate {
  id: number;
  version: string;
  title: string;
  body: string;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
}

export default function Changelog() {
  const { lang } = useLanguage();
  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/updates");
      if (!res.ok) throw new Error();
      setUpdates(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString(lang === "en" ? "en-US" : "ru-RU", {
      day: "numeric", month: "long", year: "numeric",
    });
  };

  return (
    <div className="flex-1 flex flex-col w-full min-h-[var(--app-h,100vh)] bg-background overflow-y-auto scrollbar-none">
      {/* Header */}
      <div
        className="shrink-0 border-b border-border bg-card/80 backdrop-blur-xl px-5 flex items-center justify-between relative overflow-hidden"
        style={{ minHeight: "calc(4rem + env(safe-area-inset-top,0px))", paddingTop: "env(safe-area-inset-top,0px)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-transparent to-primary/5 pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/20 to-primary/10 border border-violet-400/20 flex items-center justify-center shadow-lg shadow-violet-500/10">
            <Newspaper size={18} className="text-violet-400" />
          </div>
          <div>
            <h1 className="font-black text-base leading-tight">{lang === "en" ? "What's New" : "Что нового"}</h1>
            <p className="text-xs text-muted-foreground">{lang === "en" ? "Nova release history" : "История обновлений Nova"}</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <div className="mb-6 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-card to-primary/5 p-5 relative overflow-hidden">
          <div className="absolute -right-8 -top-10 text-violet-400/10">
            <Sparkles size={150} />
          </div>
          <div className="relative">
            <p className="text-[11px] uppercase tracking-[0.18em] text-violet-300 font-black mb-2">
              {lang === "en" ? "Keep up with Nova" : "Будьте в курсе Nova"}
            </p>
            <h2 className="text-2xl font-black tracking-tight">
              {lang === "en" ? "Fresh ideas, better conversations." : "Новые идеи для лучших разговоров."}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
              {lang === "en"
                ? "See what we improved and discover the features that make Nova feel more personal."
                : "Здесь появляются важные изменения и функции, которые делают Nova удобнее и приятнее."}
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-violet-300">
              <ArrowUpRight size={14} />
              {lang === "en" ? "Updated regularly" : "Обновляется регулярно"}
            </div>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">{lang === "en" ? "Could not load updates" : "Не удалось загрузить обновления"}</p>
            <button onClick={load} className="mt-3 text-sm text-primary hover:underline">{lang === "en" ? "Try again" : "Повторить"}</button>
          </div>
        ) : updates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3 rounded-3xl border border-dashed border-border bg-card/30">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-primary/10 flex items-center justify-center">
              <Rocket size={28} className="text-violet-400" />
            </div>
            <p className="font-semibold text-foreground">{lang === "en" ? "No updates yet" : "Обновлений пока нет"}</p>
            <p className="text-sm text-muted-foreground max-w-xs">{lang === "en" ? "Nova release notes will appear here." : "Здесь будет появляться история выпусков Nova — что исправили, что добавили."}</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[19px] top-6 bottom-6 w-px bg-border" />

            <div className="space-y-6">
              {updates.map((u, i) => {
                const releaseDate = formatDate(u.published_at || u.scheduled_at || u.created_at);
                return (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex gap-4"
                  >
                    {/* Timeline dot */}
                    <div className="flex-shrink-0 flex flex-col items-center" style={{ width: 38 }}>
                      <div className={`w-[38px] h-[38px] rounded-full flex items-center justify-center border-2 z-10 ${
                        i === 0
                          ? "bg-violet-500 border-violet-500 text-white shadow-lg shadow-violet-500/30"
                          : "bg-card border-border text-muted-foreground"
                      }`}>
                        <Rocket size={16} />
                      </div>
                    </div>

                    {/* Card */}
                    <div className={`flex-1 pb-2 ${i === 0 ? "pb-0" : ""}`}>
                      <div className={`bg-card border rounded-2xl p-4 ${i === 0 ? "border-violet-500/30 shadow-md shadow-violet-500/10" : "border-border"}`}>
                        {/* Version + date */}
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                              i === 0
                                ? "bg-violet-500/15 text-violet-400 border-violet-500/30"
                                : "bg-secondary text-muted-foreground border-border"
                            }`}>
                              v{u.version}
                            </span>
                            {i === 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {lang === "en" ? "Latest" : "Последнее"}
                              </span>
                            )}
                          </div>
                          {releaseDate && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Calendar size={11} />
                              {releaseDate}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="font-bold text-sm mb-2">{u.title}</h3>

                        {/* Body — render lines as bullet list */}
                        <div className="space-y-1">
                          {u.body.split("\n").filter(Boolean).map((line, li) => (
                            <div key={li} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Tag size={12} className="shrink-0 mt-[3px] opacity-40" />
                              <span className="leading-relaxed">{line.replace(/^[-•*]\s*/, "")}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
