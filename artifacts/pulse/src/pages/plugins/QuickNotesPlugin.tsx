import { useEffect, useState } from "react";
import { Check, Plus, StickyNote, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Note {
  id: string;
  text: string;
  createdAt: number;
}

const STORAGE_KEY = "nova-plugin-quick-notes";

function loadNotes(): Note[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter((note) => note?.id && note?.text) : [];
  } catch {
    return [];
  }
}

export function QuickNotesPlugin() {
  const { lang } = useLanguage();
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    setNotes((current) => [
      { id: crypto.randomUUID(), text, createdAt: Date.now() },
      ...current,
    ]);
    setDraft("");
  };

  const removeNote = (id: string) => {
    setNotes((current) => current.filter((note) => note.id !== id));
  };

  const ru = lang === "ru";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
          <StickyNote size={24} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-500">
            {ru ? "Плагин" : "Plugin"}
          </p>
          <h1 className="text-2xl font-black tracking-tight">
            {ru ? "Быстрые заметки" : "Quick notes"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ru
              ? "Сохраняйте короткие мысли прямо на этом устройстве."
              : "Keep short thoughts on this device."}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="flex gap-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") addNote();
            }}
            placeholder={ru ? "Новая заметка..." : "New note..."}
            rows={3}
            className="min-h-24 flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={addNote}
            disabled={!draft.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-2xl bg-primary text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={ru ? "Добавить заметку" : "Add note"}
          >
            <Plus size={20} />
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {ru ? "Ctrl/Cmd + Enter — сохранить" : "Ctrl/Cmd + Enter — save"}
        </p>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/70 bg-muted/20 px-6 py-14 text-center">
          <Check size={24} className="mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-semibold">{ru ? "Заметок пока нет" : "No notes yet"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {ru ? "Добавьте первую заметку выше." : "Add your first note above."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <article key={note.id} className="group flex items-start gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
              <StickyNote size={18} className="mt-0.5 shrink-0 text-amber-500" />
              <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-6">{note.text}</p>
              <button
                type="button"
                onClick={() => removeNote(note.id)}
                className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label={ru ? "Удалить заметку" : "Delete note"}
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}