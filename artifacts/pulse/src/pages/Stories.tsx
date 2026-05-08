import React, { useState, useRef } from "react";
import { useGetStories, useCreateStory, getGetStoriesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Plus, X, Type, Image as ImageIcon, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";

const BG_COLORS = [
  "#1a1a2e", "#16213e", "#0f3460",
  "#2d1b69", "#4a0e8f", "#7b2d8b",
  "#b5179e", "#f72585", "#e63946",
  "#d62828", "#f77f00", "#fcbf49",
  "#0a9396", "#005f73", "#001219",
  "#386641", "#6a994e", "#a7c957",
];

export default function Stories() {
  const { data: stories, isLoading } = useGetStories();
  const createStory = useCreateStory();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [storyText, setStoryText] = useState("");
  const [storyBg, setStoryBg] = useState("#1a1a2e");
  const [storyImageUrl, setStoryImageUrl] = useState("");
  const [storyType, setStoryType] = useState<"text" | "image">("text");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [viewingGroup, setViewingGroup] = useState<any>(null);
  const [viewingIndex, setViewingIndex] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setStoryImageUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCreateStory = async () => {
    if (storyType === "text" && !storyText.trim()) return;
    if (storyType === "image" && !storyImageUrl.trim()) return;
    setIsSubmitting(true);
    setCreateError("");
    try {
      await createStory({
        data: {
          type: storyType,
          text: storyType === "text" ? storyText.trim() : undefined,
          backgroundColor: storyBg,
          mediaUrl: storyType === "image" ? storyImageUrl.trim() : undefined,
        }
      });
      queryClient.invalidateQueries({ queryKey: getGetStoriesQueryKey() });
      setShowCreate(false);
      setStoryText("");
      setStoryImageUrl("");
      setStoryBg("#1a1a2e");
      setStoryType("text");
    } catch (e: any) {
      setCreateError(e?.message ?? "Ошибка при публикации истории");
    }
    setIsSubmitting(false);
  };

  const openViewer = (group: any, index = 0) => {
    setViewingGroup(group);
    setViewingIndex(index);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <header className="h-16 border-b border-border flex items-center px-6 justify-between bg-card/80 backdrop-blur-md z-10 shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Play className="text-primary" size={20} /> Истории
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> Добавить
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-4xl w-full mx-auto scrollbar-thin">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="aspect-[9/16] rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreate(true)}
              className="aspect-[9/16] rounded-2xl border-2 border-dashed border-primary/40 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-primary">
                <Plus size={28} />
              </div>
              <h3 className="font-bold text-foreground text-sm">Добавить историю</h3>
              <p className="text-xs text-muted-foreground mt-1">24 часа</p>
            </motion.div>

            {stories?.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground mt-8 py-8">
                <p className="font-medium">Нет историй</p>
                <p className="text-sm mt-1 opacity-60">Истории ваших контактов появятся здесь</p>
              </div>
            )}

            {stories?.map((group: any) => {
              const latestStory = group.stories[0];
              return (
                <motion.div
                  key={group.user.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => openViewer(group, 0)}
                  className="aspect-[9/16] rounded-2xl relative overflow-hidden cursor-pointer group bg-card border border-border"
                >
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{ backgroundColor: latestStory?.backgroundColor || "#111" }}
                  >
                    {latestStory?.type === "image" && latestStory.mediaUrl && (
                      <img src={latestStory.mediaUrl} alt="" className="w-full h-full object-cover" />
                    )}
                    {latestStory?.type === "text" && (
                      <div className="w-full h-full flex items-center justify-center p-4 text-center">
                        <p className="text-white font-bold text-xl leading-tight drop-shadow-lg">
                          {latestStory.text}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

                  <div className="absolute inset-0 p-3 flex flex-col justify-between">
                    <div className="flex gap-1">
                      {group.stories.map((_: any, i: number) => (
                        <div key={i} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden">
                          {i === 0 && <div className="h-full bg-white w-full" />}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-full p-[2px] ${group.hasUnviewed ? "bg-primary" : "bg-white/20"}`}>
                        <div
                          className="w-full h-full rounded-full border border-background overflow-hidden flex items-center justify-center text-white font-bold text-xs"
                          style={{ backgroundColor: group.user.avatarColor }}
                        >
                          {group.user.avatarUrl ? (
                            <img src={group.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            group.user.displayName[0].toUpperCase()
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-white font-bold text-xs drop-shadow-md">{group.user.displayName}</span>
                        <p className="text-white/60 text-[10px]">{group.stories.length} {group.stories.length === 1 ? "история" : "истории"}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
          <DialogTitle>Новая история</DialogTitle>
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setStoryType("text")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${storyType === "text" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                <Type size={16} /> Текст
              </button>
              <button
                onClick={() => setStoryType("image")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${storyType === "image" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                <ImageIcon size={16} /> Фото
              </button>
            </div>

            <div
              className="w-full h-40 rounded-2xl flex items-center justify-center relative overflow-hidden border border-border"
              style={{ backgroundColor: storyBg }}
            >
              {storyType === "text" && storyText ? (
                <p className="text-white font-bold text-lg text-center px-4 drop-shadow-lg">{storyText}</p>
              ) : storyType === "image" && storyImageUrl ? (
                <img src={storyImageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <p className="text-white/40 text-sm">{storyType === "text" ? "Предпросмотр текста" : "Предпросмотр изображения"}</p>
              )}
            </div>

            {storyType === "text" ? (
              <textarea
                value={storyText}
                onChange={e => setStoryText(e.target.value)}
                placeholder="Напишите что-нибудь..."
                rows={3}
                maxLength={300}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                autoFocus
              />
            ) : (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/40 text-sm font-medium text-primary hover:bg-primary/5 hover:border-primary transition-all"
                >
                  <Upload size={16} />
                  {storyImageUrl ? "Сменить фото" : "Выбрать фото с устройства"}
                </button>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Фон</label>
              <div className="flex flex-wrap gap-2">
                {BG_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setStoryBg(color)}
                    className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${storyBg === color ? "ring-2 ring-white ring-offset-2 ring-offset-background scale-110" : ""}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {createError && (
              <p className="text-sm text-red-500 text-center bg-red-500/10 rounded-xl px-3 py-2">{createError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowCreate(false); setCreateError(""); }}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateStory}
                disabled={isSubmitting || (storyType === "text" ? !storyText.trim() : !storyImageUrl)}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Публикую..." : "Опубликовать"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {viewingGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          >
            <div className="relative w-full max-w-sm h-full max-h-screen">
              {(() => {
                const story = viewingGroup.stories[viewingIndex];
                return (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: story?.backgroundColor || "#111" }}
                  >
                    {story?.type === "image" && story.mediaUrl && (
                      <img src={story.mediaUrl} alt="" className="w-full h-full object-contain" />
                    )}
                    {story?.type === "text" && (
                      <p className="text-white font-bold text-2xl text-center px-8 drop-shadow-lg">{story.text}</p>
                    )}
                  </div>
                );
              })()}

              <div className="absolute top-0 left-0 right-0 p-4 flex gap-1">
                {viewingGroup.stories.map((_: any, i: number) => (
                  <div key={i} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden">
                    <div className={`h-full bg-white ${i <= viewingIndex ? "w-full" : "w-0"} transition-all`} />
                  </div>
                ))}
              </div>

              <div className="absolute top-8 left-4 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden border-2 border-white"
                  style={{ backgroundColor: viewingGroup.user.avatarColor }}
                >
                  {viewingGroup.user.avatarUrl ? (
                    <img src={viewingGroup.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : viewingGroup.user.displayName[0].toUpperCase()}
                </div>
                <span className="text-white font-bold drop-shadow-md">{viewingGroup.user.displayName}</span>
              </div>

              <button
                onClick={() => setViewingGroup(null)}
                className="absolute top-8 right-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="absolute inset-0 flex">
                <div className="flex-1" onClick={() => setViewingIndex(i => Math.max(0, i - 1))} />
                <div className="flex-1" onClick={() => {
                  if (viewingIndex < viewingGroup.stories.length - 1) {
                    setViewingIndex(i => i + 1);
                  } else {
                    setViewingGroup(null);
                  }
                }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
