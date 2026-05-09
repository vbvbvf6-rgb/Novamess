import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, MessageSquare, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppContext } from "@/contexts/AppContext";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface SearchResult {
  id: number;
  chat_id: number;
  sender_id: number;
  text: string;
  created_at: string;
  display_name: string;
  avatar_color: string;
  avatar_url?: string;
  chat_name?: string;
  chat_type: string;
  other_user_name?: string;
}

interface GlobalSearchProps {
  onClose: () => void;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("pulse-token");
  if (token) return { Authorization: `Bearer ${token}` };
  const uid = localStorage.getItem("pulse-user-id");
  return uid ? { "x-user-id": uid } : {};
}

export function GlobalSearch({ onClose }: GlobalSearchProps) {
  const { t, lang } = useLanguage();
  const { setSelectedChatId } = useAppContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setError("");
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/messages/search?q=${encodeURIComponent(query.trim())}&limit=30`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        } else {
          setError("");
          setResults([]);
        }
      } catch {
        setError(t("common.error"));
      }
      setLoading(false);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    setSelectedChatId(result.chat_id);
    onClose();
  };

  function highlight(text: string, q: string) {
    if (!q.trim()) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-primary/25 text-primary rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  }

  function chatLabel(r: SearchResult) {
    if (r.chat_type === "direct") return r.other_user_name || r.display_name;
    return r.chat_name || (r.chat_type === "group" ? "Группа" : "Канал");
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
    >
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary w-4 h-4" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t("search.placeholder")}
              className="w-full pl-9 pr-4 py-2.5 bg-secondary rounded-xl border border-border focus:border-primary focus:outline-none text-sm transition-colors"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {lang === "ru" ? "Закрыть" : "Close"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
            <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
            {lang === "ru" ? "Поиск..." : "Searching..."}
          </div>
        )}

        {!loading && query.trim().length >= 2 && results.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <MessageSquare size={40} className="text-muted-foreground/30" />
            <p className="text-sm">{t("search.noResults")}</p>
            <p className="text-xs text-muted-foreground/60">«{query}»</p>
          </div>
        )}

        {!loading && error && (
          <div className="px-4 py-4 text-sm text-destructive">{error}</div>
        )}

        {!loading && results.length > 0 && (
          <div className="py-2">
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {lang === "ru" ? `Найдено: ${results.length}` : `Found: ${results.length}`}
            </div>
            {results.map(r => (
              <button
                key={r.id}
                onClick={() => handleResultClick(r)}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left group"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden mt-0.5"
                  style={{ backgroundColor: r.avatar_color || "#3B82F6" }}
                >
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt={r.display_name} className="w-full h-full object-cover" />
                  ) : (
                    r.display_name?.[0]?.toUpperCase() || "?"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-sm font-semibold truncate">{r.display_name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: lang === "ru" ? ru : undefined })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate leading-snug">
                    {highlight(r.text || "", query)}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-muted-foreground/60">
                      {t("search.inChat")} <span className="text-primary/70">{chatLabel(r)}</span>
                    </span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-muted-foreground shrink-0 mt-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        )}

        {!query.trim() && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Search size={40} className="text-muted-foreground/20" />
            <p className="text-sm font-medium">{t("search.globalTitle")}</p>
            <p className="text-xs text-muted-foreground/60">
              {lang === "ru" ? "Введите от 2 символов" : "Type at least 2 characters"}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
