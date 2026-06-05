import React, { useState, useRef, useEffect } from "react";
import { useGetStories, useCreateStory, getGetStoriesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Plus, X, Type, Image as ImageIcon, Upload, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";

const STORY_DURATION = 5000;

async function compressStoryImage(file: File, maxPx = 1280, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width > height) { height = Math.round((height * maxPx) / width); width = maxPx; }
        else { width = Math.round((width * maxPx) / height); height = maxPx; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(url); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(""); };
    img.src = url;
  });
}

const BG_COLORS = [
  "#1a1a2e", "#16213e", "#0f3460",
  "#2d1b69", "#4a0e8f", "#7b2d8b",
  "#b5179e", "#f72585", "#e63946",
  "#d62828", "#f77f00", "#fcbf49",
  "#0a9396", "#005f73", "#001219",
  "#386641", "#6a994e", "#a7c957",
];

async function markStoryViewed(storyId: number) {
  const token = sessionStorage.getItem("pulse-token");
  if (!token) return;
  try {
    await fetch(`/api/stories/${storyId}/view`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
    });
  } catch {}
}

async function fetchStoryViews(storyId: number): Promise<number> {
  const token = sessionStorage.getItem("pulse-token");
  if (!token) return 0;
  try {
    const res = await fetch(`/api/stories/${storyId}/views`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count ?? 0;
  } catch { return 0; }
}

export default function Stories() {
  const { data: stories, isLoading } = useGetStories();
  const createStoryMutation = useCreateStory();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [storyText, setStoryText] = useState("");
  const [storyBg, setStoryBg] = useState("#1a1a2e");
  const [storyImageUrl, setStoryImageUrl] = useState("");
  const [storyImageCaption, setStoryImageCaption] = useState("");
  const [storyType, setStoryType] = useState<"text" | "image">("text");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [viewingGroup, setViewingGroup] = useState<any>(null);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [viewCount, setViewCount] = useState<number | null>(null);
  const currentUserId = Number(sessionStorage.getItem("pulse-user-id") || "0");

  useEffect(() => {
    if (!viewingGroup) return;
    const story = viewingGroup.stories[viewingIndex];
    if (!story) return;
    markStoryViewed(story.id);
    if (story.userId === currentUserId || viewingGroup.user?.id === currentUserId) {
      setViewCount(null);
      fetchStoryViews(story.id).then(setViewCount);
    } else {
      setViewCount(null);
    }
  }, [viewingGroup?.user?.id, viewingIndex]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const compressed = await compressStoryImage(file);
    if (compressed) setStoryImageUrl(compressed);
  };

  const handleCreateStory = async () => {
    if (storyType === "text" && !storyText.trim()) return;
    if (storyType === "image" && !storyImageUrl.trim()) return;
    setIsSubmitting(true);
    setCreateError("");
    try {
      await createStoryMutation.mutateAsync({
        data: {
          type: storyType,
          text: storyType === "text" ? storyText.trim() : (storyImageCaption.trim() || undefined),
          backgroundColor: storyBg,
          mediaUrl: storyType === "image" ? storyImageUrl.trim() : undefined,
        }
      });
      queryClient.invalidateQueries({ queryKey: getGetStoriesQueryKey() });
      setShowCreate(false);
      setStoryText("");
      setStoryImageUrl("");
      setStoryImageCaption("");
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

  const goNext = () => {
    if (!viewingGroup) return;
    if (viewingIndex < viewingGroup.stories.length - 1) {
      setViewingIndex(i => i + 1);
    } else {
      setViewingGroup(null);
    }
  };

  const goPrev = () => {
    if (viewingIndex > 0) {
      setViewingIndex(i => i - 1);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <header className="border-b border-border flex items-center px-6 justify-between bg-card/80 backdrop-blur-md z-10 shrink-0" style={{ minHeight: "calc(4rem + env(safe-area-inset-top, 0px))", paddingTop: "env(safe-area-inset-top, 0px)" }}>
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

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 max-w-4xl w-full mx-auto scrollbar-thin">
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
                <textarea
                  value={storyImageCaption}
                  onChange={e => setStoryImageCaption(e.target.value)}
                  placeholder="Подпись к фото (необязательно)..."
                  rows={2}
                  maxLength={200}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                />
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
        {viewingGroup && (() => {
          const story = viewingGroup.stories[viewingIndex];
          const isOwnStory = viewingGroup.user?.id === currentUserId;
          return (
            <motion.div
              key="story-viewer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-neutral-900"
            >
              <div className="relative w-full h-full flex items-stretch justify-center">
                <div
                  className="hidden md:block flex-1 bg-black/40 cursor-pointer"
                  onClick={() => setViewingGroup(null)}
                />
                <div className="relative w-full max-w-[430px] h-full overflow-hidden">
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{ backgroundColor: story?.backgroundColor || "#111" }}
                  >
                    {story?.type === "image" && story.mediaUrl && (
                      <img
                        src={story.mediaUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                    {story?.type === "text" && (
                      <div className="w-full h-full flex items-center justify-center p-8">
                        <p className="text-white font-bold text-2xl text-center leading-tight drop-shadow-lg">
                          {story.text}
                        </p>
                      </div>
                    )}
                    {story?.text && story?.type === "image" && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 pb-20">
                        <p className="text-white text-base font-medium text-center drop-shadow">{story.text}</p>
                      </div>
                    )}
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/40 pointer-events-none" />

                  <div className="absolute top-0 left-0 right-0 flex gap-1 px-3 pt-3 z-10"
                    style={{ paddingTop: "max(12px, env(safe-area-inset-top, 12px))" }}
                  >
                    {viewingGroup.stories.map((_: any, i: number) => (
                      <div key={i} className="h-[3px] flex-1 bg-white/30 rounded-full overflow-hidden">
                        {i < viewingIndex && (
                          <div className="h-full bg-white w-full" />
                        )}
                        {i === viewingIndex && (
                          <motion.div
                            key={`prog-${viewingGroup.user?.id}-${viewingIndex}`}
                            className="h-full bg-white rounded-full"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: STORY_DURATION / 1000, ease: "linear" }}
                            onAnimationComplete={goNext}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="absolute left-4 right-16 flex items-center gap-3 z-10"
                    style={{ top: "max(52px, calc(env(safe-area-inset-top, 0px) + 40px))" }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden border-2 border-white shrink-0"
                      style={{ backgroundColor: viewingGroup.user.avatarColor }}
                    >
                      {viewingGroup.user.avatarUrl ? (
                        <img src={viewingGroup.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : viewingGroup.user.displayName[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white font-bold drop-shadow-md text-sm">{viewingGroup.user.displayName}</span>
                      {isOwnStory && viewCount !== null && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Eye size={11} className="text-white/70" />
                          <span className="text-white/70 text-[11px]">{viewCount} просмотр{viewCount === 1 ? "" : viewCount >= 2 && viewCount <= 4 ? "а" : "ов"}</span>
                        </div>
                      )}
                      {isOwnStory && viewCount === null && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Eye size={11} className="text-white/40" />
                          <span className="text-white/40 text-[11px]">Загрузка...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setViewingGroup(null)}
                    className="absolute z-10 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                    style={{ top: "max(52px, calc(env(safe-area-inset-top, 0px) + 40px))", right: "16px" }}
                  >
                    <X size={20} />
                  </button>

                  <div className="absolute top-0 bottom-0 left-0 right-0 flex z-[5]" style={{ top: "120px" }}>
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={goPrev}
                    />
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={goNext}
                    />
                  </div>
                </div>

                <div
                  className="hidden md:block flex-1 bg-black/40 cursor-pointer"
                  onClick={() => setViewingGroup(null)}
                />
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
