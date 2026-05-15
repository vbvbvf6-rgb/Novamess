import React, { useState, useRef, useEffect } from "react";
import { useGetPosts, useGetMe, useCreatePost, useLikePost, useCreatePostComment, useGetPostComments, Post } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Send, Image, X, Plus, Trash2, MoreVertical, ZoomIn, ShieldAlert, AlertCircle, CheckCircle2, Clock, ChevronDown, ChevronUp, Flame, TrendingUp, Star, Camera } from "lucide-react";
import { formatDistanceToNow as fDTN } from "date-fns";
import { ru } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const getCurrentUserId = () => Number(sessionStorage.getItem("pulse-user-id") || "0");

function VerifiedBadge() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="hsl(16 100% 50%)"/>
      <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function AdminBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0">
      ADMIN
    </span>
  );
}

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-white/10 rounded-full transition-colors"
      >
        <X size={22} />
      </button>
      <motion.img
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        src={src}
        alt=""
        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </motion.div>
  );
}

function AppealModal({ post, onClose, onSubmitted }: { post: any; onClose: () => void; onSubmitted: () => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const currentUserId = getCurrentUserId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 10) { setError("Минимум 10 символов"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/posts/${post.id}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(sessionStorage.getItem("pulse-token") ? { "Authorization": `Bearer ${sessionStorage.getItem("pulse-token")}` } : {}) },
        body: JSON.stringify({ appealText: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка"); setLoading(false); return; }
      onSubmitted();
      onClose();
    } catch { setError("Ошибка соединения"); }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="bg-card border border-border rounded-2xl p-5 max-w-md w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <AlertCircle size={20} className="text-orange-400" />
          </div>
          <div>
            <h3 className="font-bold">Апелляция</h3>
            <p className="text-xs text-muted-foreground">Объясните, почему пост не нарушает правила</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="mb-3 p-3 bg-destructive/5 border border-destructive/20 rounded-xl">
          <p className="text-xs text-muted-foreground mb-1">Причина блокировки:</p>
          <p className="text-sm text-destructive/80">{post.moderationReason || "Нарушение правил сообщества"}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Объясните, почему данный контент не нарушает правила сообщества..."
            rows={4}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || text.trim().length < 10}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {loading ? "Отправка..." : "Отправить апелляцию"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function BlockedPostCard({ post, onAppealSubmitted }: { post: any; onAppealSubmitted: () => void }) {
  const [showAppeal, setShowAppeal] = useState(false);
  const [, setLocation] = useLocation();
  const appeal = post.appeal;

  const appealStatus = appeal?.status;

  return (
    <>
      <AnimatePresence>
        {showAppeal && (
          <AppealModal
            post={post}
            onClose={() => setShowAppeal(false)}
            onSubmitted={onAppealSubmitted}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-destructive/30 rounded-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 p-4 pb-3">
          <button
            onClick={() => post.author?.id && setLocation(`/user/${post.author.id}`)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 overflow-hidden hover:opacity-85 transition-opacity opacity-60"
            style={{ backgroundColor: post.author?.avatarColor || "#333" }}
          >
            {post.author?.avatarUrl ? (
              <img src={post.author.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              (post.author?.displayName || "U")[0].toUpperCase()
            )}
          </button>
          <div className="flex-1 min-w-0 opacity-60">
            <p className="font-semibold text-sm truncate">{post.author?.displayName || "Unknown"}</p>
            <p className="text-xs text-muted-foreground">@{post.author?.username} · {fDTN(new Date(post.createdAt), { addSuffix: true, locale: ru })}</p>
          </div>
        </div>

        <div className="mx-4 mb-4 p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-destructive mb-0.5">Пост заблокирован</p>
              <p className="text-xs text-muted-foreground mb-3">
                {post.moderationReason || "Контент нарушает правила сообщества"}
              </p>

              {!appealStatus && (
                <button
                  onClick={() => setShowAppeal(true)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-colors"
                >
                  Подать апелляцию
                </button>
              )}

              {appealStatus === 'pending' && (
                <div className="flex items-center gap-1.5 text-xs text-yellow-500">
                  <Clock size={13} />
                  <span className="font-medium">Апелляция на рассмотрении</span>
                </div>
              )}

              {appealStatus === 'approved' && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 size={13} />
                  <span className="font-medium">Апелляция одобрена — пост восстановлен</span>
                </div>
              )}

              {appealStatus === 'rejected' && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-destructive">
                    <X size={13} />
                    <span className="font-medium">Апелляция отклонена</span>
                  </div>
                  {appeal?.admin_response && (
                    <p className="text-xs text-muted-foreground">Ответ: {appeal.admin_response}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

const getAuthHeader = () => {
  const t = sessionStorage.getItem("pulse-token");
  return t ? { "Authorization": `Bearer ${t}` } : {};
};

function CommentThread({ post, onCountChange }: { post: any; onCountChange: (n: number) => void }) {
  const [commentText, setCommentText] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const createComment = useCreatePostComment();
  const { data: me } = useGetMe();
  const currentUserId = getCurrentUserId();
  const [, setLocation] = useLocation();

  const { data: comments = [], refetch: refetchComments, isLoading } = useGetPostComments(post.id, {} as any);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const text = commentText.trim();
    setCommentText("");
    createComment.mutate({ postId: post.id, data: { text } }, {
      onSuccess: () => {
        refetchComments();
        queryClient.setQueryData(["/api/posts"], (old: any) =>
          Array.isArray(old)
            ? old.map((p: any) => p.id === post.id ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p)
            : old
        );
        onCountChange((post.commentsCount || 0) + 1);
      }
    });
  };

  const handleDeleteComment = async (commentId: number) => {
    setDeletingId(commentId);
    try {
      await fetch(`/api/posts/${post.id}/comments/${commentId}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });
      await refetchComments();
      queryClient.setQueryData(["/api/posts"], (old: any) =>
        Array.isArray(old)
          ? old.map((p: any) => p.id === post.id ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 0) - 1) } : p)
          : old
      );
      onCountChange(Math.max(0, (post.commentsCount || 0) - 1));
    } catch {}
    setDeletingId(null);
  };

  const isAdmin = (me as any)?.isAdmin === true;

  return (
    <div className="border-t border-border bg-secondary/20">
      <div className="px-4 pt-3 pb-1 flex items-center gap-2">
        <MessageCircle size={14} className="text-primary" />
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Комментарии</span>
        <span className="text-[11px] text-muted-foreground font-medium">
          {Array.isArray(comments) ? comments.length : 0}
        </span>
      </div>

      <div className="px-4 pb-3 space-y-2.5 max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 py-1">
            {[1, 2].map(i => (
              <div key={i} className="flex gap-2 animate-pulse">
                <div className="w-7 h-7 rounded-full bg-secondary shrink-0" />
                <div className="flex-1 bg-secondary rounded-xl h-12" />
              </div>
            ))}
          </div>
        ) : !Array.isArray(comments) || comments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            Будьте первым, кто оставит комментарий
          </p>
        ) : (
          (comments as any[]).map((comment: any) => {
            const isOwn = comment.userId === currentUserId || comment.user_id === currentUserId;
            const canDel = isOwn || isAdmin;
            return (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2 group"
              >
                <button
                  onClick={() => comment.author?.id && setLocation(`/user/${comment.author.id}`)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: comment.author?.avatarColor || "#333" }}
                >
                  {comment.author?.avatarUrl ? (
                    <img src={comment.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (comment.author?.displayName || "U")[0].toUpperCase()
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="bg-secondary rounded-xl px-3 py-2 relative">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <button
                        onClick={() => comment.author?.id && setLocation(`/user/${comment.author.id}`)}
                        className="text-xs font-bold hover:text-primary transition-colors truncate max-w-[130px]"
                      >
                        {comment.author?.displayName || "Unknown"}
                      </button>
                      {comment.author?.isVerified && <VerifiedBadge />}
                      {comment.author?.isAdmin === true && <AdminBadge />}
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                        {fDTN(new Date(comment.createdAt), { addSuffix: true, locale: ru })}
                      </span>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed break-words">{comment.text}</p>
                  </div>
                </div>
                {canDel && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    disabled={deletingId === comment.id}
                    className="opacity-0 group-hover:opacity-100 self-start mt-1 p-1 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-all disabled:opacity-30 shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      <div className="px-4 pb-4">
        <form onSubmit={handleComment} className="flex gap-2 items-center">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden"
            style={{ backgroundColor: (me as any)?.avatarColor || "#3B82F6" }}
          >
            {(me as any)?.avatarUrl ? (
              <img src={(me as any).avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              ((me as any)?.displayName || "U")[0].toUpperCase()
            )}
          </div>
          <input
            ref={inputRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Написать комментарий..."
            maxLength={500}
            className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary/50 transition-colors"
          />
          <button
            type="submit"
            disabled={!commentText.trim() || createComment.isPending}
            className="p-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}

function PostCard({ post, onAppealSubmitted }: { post: Post & { appeal?: any; moderationStatus?: string; moderationReason?: string }; onAppealSubmitted?: () => void }) {
  const [showComments, setShowComments] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const likePost = useLikePost();
  const { data: me } = useGetMe();
  const currentUserId = getCurrentUserId();

  const isBlocked = (post as any).moderationStatus === 'rejected';
  const isOwnPost = post.author?.id === currentUserId;

  if (isBlocked && isOwnPost) {
    return <BlockedPostCard post={post} onAppealSubmitted={onAppealSubmitted || (() => {})} />;
  }

  if (isBlocked) return null;

  const canDelete = post.author?.id === currentUserId || (me as any)?.isAdmin === true;
  const displayCommentCount = localCommentCount !== null ? localCommentCount : (post.commentsCount ?? 0);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
        headers: sessionStorage.getItem("pulse-token") ? { "Authorization": `Bearer ${sessionStorage.getItem("pulse-token")}` } : {},
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    } catch {}
    setIsDeleting(false);
  };

  const handleLike = () => {
    queryClient.setQueryData(["/api/posts"], (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((p: any) => {
        if (p.id !== post.id) return p;
        const wasLiked = p.isLiked;
        return { ...p, isLiked: !wasLiked, likesCount: p.likesCount + (wasLiked ? -1 : 1) };
      });
    });
    likePost.mutate({ postId: post.id }, {
      onError: () => queryClient.invalidateQueries({ queryKey: ["/api/posts"] })
    });
  };

  const isVerified = (post.author as any)?.isVerified;
  const isAdmin = (post.author as any)?.isAdmin === true;

  return (
    <>
      <AnimatePresence>
        {lightboxImg && (
          <ImageLightbox src={lightboxImg} onClose={() => setLightboxImg(null)} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 p-4 pb-3">
          <button
            onClick={() => post.author?.id && setLocation(`/user/${post.author.id}`)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 overflow-hidden hover:opacity-85 transition-opacity"
            style={{ backgroundColor: post.author?.avatarColor || "#333" }}
          >
            {post.author?.avatarUrl ? (
              <img src={post.author.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              (post.author?.displayName || "U")[0].toUpperCase()
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => post.author?.id && setLocation(`/user/${post.author.id}`)}
                className="font-semibold text-sm hover:text-primary transition-colors truncate max-w-[150px]"
              >
                {post.author?.displayName || "Unknown"}
              </button>
              {isVerified && <VerifiedBadge />}
              {isAdmin && <AdminBadge />}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              @{post.author?.username} · {fDTN(new Date(post.createdAt), { addSuffix: true, locale: ru })}
            </p>
          </div>
          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors shrink-0">
                  <MoreVertical size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 size={14} className="mr-2" />
                  {isDeleting ? "Удаление..." : "Удалить пост"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="px-4 pb-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.text}</p>
        </div>

        {post.imageUrl && (
          <div className="border-t border-b border-border relative group cursor-pointer" onClick={() => setLightboxImg(post.imageUrl!)}>
            <img src={post.imageUrl} alt="" className="w-full max-h-80 object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn size={28} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 px-4 py-2.5 border-t border-border">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-sm transition-colors group px-2.5 py-1.5 rounded-xl hover:bg-red-500/10 ${
              post.isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
            }`}
          >
            <Heart
              size={17}
              className={`transition-transform group-hover:scale-110 ${post.isLiked ? "fill-current" : ""}`}
            />
            <span className="font-semibold text-xs">{post.likesCount}</span>
          </button>

          <button
            onClick={() => setShowComments(v => !v)}
            className={`flex items-center gap-1.5 text-sm transition-all group px-2.5 py-1.5 rounded-xl hover:bg-primary/10 ${
              showComments ? "text-primary bg-primary/8" : "text-muted-foreground hover:text-primary"
            }`}
          >
            <MessageCircle
              size={17}
              className={`transition-transform group-hover:scale-110 ${showComments ? "fill-primary/20" : ""}`}
            />
            <span className="font-semibold text-xs">{displayCommentCount}</span>
            <span className="text-[11px] font-medium hidden sm:inline">Комментарии</span>
            {showComments
              ? <ChevronUp size={13} className="opacity-60" />
              : <ChevronDown size={13} className="opacity-60" />
            }
          </button>
        </div>

        <AnimatePresence>
          {showComments && (
            <motion.div
              key="comments"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <CommentThread
                post={{ ...post, commentsCount: displayCommentCount }}
                onCountChange={setLocalCommentCount}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

type FeedMode = "all" | "popular" | "hot" | "media";

const FEED_MODES: { id: FeedMode; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "all",     label: "Все",        icon: <Star size={14} />,       description: "Все публикации" },
  { id: "popular", label: "Популярное", icon: <TrendingUp size={14} />, description: "Больше всего лайков" },
  { id: "hot",     label: "Горячее",    icon: <Flame size={14} />,      description: "Активные за 48 ч" },
  { id: "media",   label: "С фото",     icon: <Camera size={14} />,     description: "Только с фотографиями" },
];

function applyFeedMode(posts: any[], mode: FeedMode): any[] {
  if (!Array.isArray(posts)) return [];
  const visible = posts.filter((p: any) => !(p as any)._optimistic || true);

  switch (mode) {
    case "popular":
      return [...visible].sort((a, b) => {
        const scoreA = (a.likesCount ?? 0) + (a.commentsCount ?? 0) * 1.5;
        const scoreB = (b.likesCount ?? 0) + (b.commentsCount ?? 0) * 1.5;
        return scoreB - scoreA;
      });

    case "hot": {
      const cutoff = Date.now() - 48 * 60 * 60 * 1000;
      const recent = visible.filter((p: any) => new Date(p.createdAt).getTime() >= cutoff);
      const older  = visible.filter((p: any) => new Date(p.createdAt).getTime() < cutoff);
      const scored = [...recent].sort((a, b) => {
        const scoreA = (a.likesCount ?? 0) * 2 + (a.commentsCount ?? 0) * 3;
        const scoreB = (b.likesCount ?? 0) * 2 + (b.commentsCount ?? 0) * 3;
        return scoreB - scoreA;
      });
      return [...scored, ...older];
    }

    case "media":
      return visible.filter((p: any) => !!p.imageUrl);

    case "all":
    default:
      return visible;
  }
}

export default function Feed() {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [feedMode, setFeedMode] = useState<FeedMode>("all");
  const { data: posts, isLoading, refetch } = useGetPosts({ query: { refetchInterval: 20000 } } as any);
  const { data: me } = useGetMe();
  const createPost = useCreatePost();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUserId = getCurrentUserId();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageLoading(true);

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (fileInputRef.current) fileInputRef.current.value = "";
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) { setImageLoading(false); return; }

      const img = new window.Image();
      img.onload = () => {
        try {
          const MAX = 1200;
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          if (!w || !h) { setNewPostImage(dataUrl); setImageLoading(false); return; }
          const scale = Math.min(1, MAX / Math.max(w, h));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(w * scale);
          canvas.height = Math.round(h * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) { setNewPostImage(dataUrl); setImageLoading(false); return; }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setNewPostImage(canvas.toDataURL("image/jpeg", 0.82));
        } catch {
          setNewPostImage(dataUrl);
        } finally {
          setImageLoading(false);
        }
      };
      img.onerror = () => { setNewPostImage(dataUrl); setImageLoading(false); };
      img.src = dataUrl;
    };
    reader.onerror = () => { if (fileInputRef.current) fileInputRef.current.value = ""; setImageLoading(false); };
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim() && !newPostImage) return;
    const text = newPostText;
    const image = newPostImage;
    setNewPostText("");
    setNewPostImage(null);
    setShowCreatePost(false);

    const optimisticId = -Date.now();
    const optimisticPost = {
      id: optimisticId,
      text: text || " ",
      imageUrl: image || null,
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
      userId: currentUserId,
      moderationStatus: 'approved',
      author: me ? {
        id: me.id,
        displayName: me.displayName,
        username: (me as any).username,
        avatarUrl: (me as any).avatarUrl || null,
        avatarColor: me.avatarColor,
        isVerified: (me as any).isVerified,
      } : null,
      _optimistic: true,
    };

    queryClient.setQueryData(["/api/posts"], (old: any) =>
      Array.isArray(old) ? [optimisticPost, ...old] : [optimisticPost]
    );

    try {
      await createPost.mutateAsync(
        { data: { text: text || " ", imageUrl: image || undefined } },
      );
    } catch {
      queryClient.setQueryData(["/api/posts"], (old: any) =>
        Array.isArray(old) ? old.filter((p: any) => p.id !== optimisticId) : old
      );
      toast({ title: "Не удалось опубликовать пост", description: "Попробуйте ещё раз", variant: "destructive" });
    } finally {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    }
  };

  const filteredPosts = applyFeedMode(posts as any[] ?? [], feedMode);
  const activeMode = FEED_MODES.find(m => m.id === feedMode)!;

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <header className="border-b border-border bg-card/80 backdrop-blur-md z-10 shrink-0">
        <div className="h-16 flex items-center px-6 justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="text-primary">📡</span> Лента
          </h1>
          <button
            onClick={() => setShowCreatePost(!showCreatePost)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-[0_0_10px_rgba(255,80,0,0.2)]"
          >
            <Plus size={16} /> Новый пост
          </button>
        </div>

        {/* Recommendation tabs */}
        <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto scrollbar-none">
          {FEED_MODES.map((mode) => {
            const isActive = feedMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setFeedMode(mode.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[0_0_8px_rgba(255,80,0,0.3)]"
                    : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {mode.icon}
                {mode.label}
              </button>
            );
          })}
        </div>

        {/* Active mode hint */}
        <AnimatePresence mode="wait">
          <motion.div
            key={feedMode}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-5 pb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground"
          >
            <span className="text-primary/70">{activeMode.icon}</span>
            <span>{activeMode.description}</span>
            {feedMode !== "all" && (
              <span className="ml-auto text-primary/60 font-medium">
                {filteredPosts.length} публ.
              </span>
            )}
          </motion.div>
        </AnimatePresence>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin pb-24 md:pb-0">
        <div className="max-w-2xl mx-auto p-4 space-y-4">

          <AnimatePresence>
            {showCreatePost && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-card border border-primary/30 rounded-2xl overflow-hidden shadow-sm"
              >
                <form onSubmit={handleCreatePost} className="p-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold">Создать пост</h3>
                    <button type="button" onClick={() => { setShowCreatePost(false); setNewPostImage(null); setImageLoading(false); }} className="text-muted-foreground hover:text-foreground">
                      <X size={18} />
                    </button>
                  </div>
                  <textarea
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    placeholder="Что происходит?"
                    rows={3}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
                    autoFocus
                  />
                  {imageLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                      <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                      Загрузка фото...
                    </div>
                  )}
                  {newPostImage && !imageLoading && (
                    <div className="relative inline-block">
                      <img src={newPostImage} alt="preview" className="max-h-40 rounded-xl object-contain border border-border" />
                      <button
                        type="button"
                        onClick={() => setNewPostImage(null)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <input
                    id="post-image-input"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="post-image-input"
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/10 cursor-pointer"
                    >
                      <Image size={16} /> {newPostImage ? "Сменить фото" : "Фото"}
                    </label>
                    <button
                      type="submit"
                      disabled={imageLoading || (!newPostText.trim() && !newPostImage)}
                      className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                    >
                      {imageLoading ? "Обработка..." : "Опубликовать"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <motion.div
              key={feedMode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 text-muted-foreground"
            >
              <div className="text-5xl mb-4">
                {feedMode === "media" ? "🖼️" : feedMode === "hot" ? "🔥" : feedMode === "popular" ? "⭐" : "📡"}
              </div>
              <h3 className="text-base font-semibold mb-1">
                {feedMode === "media" ? "Нет публикаций с фото" :
                 feedMode === "hot" ? "Нет активных постов за 48 ч" :
                 feedMode === "popular" ? "Пока нет популярных постов" :
                 "Нет постов"}
              </h3>
              <p className="text-sm">
                {feedMode !== "all"
                  ? <button onClick={() => setFeedMode("all")} className="text-primary hover:underline">Посмотреть все публикации</button>
                  : "Будь первым кто поделится чем-нибудь!"
                }
              </p>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={feedMode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {filteredPosts.map((post: any) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onAppealSubmitted={() => refetch()}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
