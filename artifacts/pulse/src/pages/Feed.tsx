import React, { useState, useRef, useEffect } from "react";
import { useGetPosts, useGetMe, useLikePost, useCreatePostComment, useGetPostComments, Post } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Send, Image, X, Plus, Trash2, MoreVertical, ZoomIn, ShieldAlert, AlertCircle, CheckCircle2, Clock, ChevronDown, ChevronUp, TrendingUp, Hash } from "lucide-react";
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
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
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
              <p className="text-xs text-muted-foreground mb-1">
                {post.moderationReason || "Контент нарушает правила сообщества"}
              </p>
              <p className="text-xs text-muted-foreground/60 mb-3 italic">
                👁 Только вы видите этот пост — другие пользователи его не видят
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

const getAuthHeader = (): Record<string, string> => {
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
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error || err?.message || "";
        const code = err?.response?.data?.code || "";
        if (code === "MODERATION_BLOCKED") {
          setCommentText(text);
        }
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
    } catch {
      setDeletingId(null);
    }
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

function PostCard({ post, onAppealSubmitted, onTopicClick }: { post: Post & { appeal?: any; moderationStatus?: string; moderationReason?: string }; onAppealSubmitted?: () => void; onTopicClick?: (topicId: string) => void }) {
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
          {(post as any).topic && (() => {
            const t = TOPICS.find(tp => tp.id === (post as any).topic);
            return t ? (
              <button
                onClick={() => onTopicClick?.(t.id)}
                className={`mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-gradient-to-r ${t.color} transition-opacity hover:opacity-80 ${onTopicClick ? "cursor-pointer" : "cursor-default"}`}
              >
                {t.emoji} {t.label}
              </button>
            ) : null;
          })()}
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
            <span className="text-[11px] font-medium">Комментарии</span>
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


const TOPICS = [
  { id: "games",   emoji: "🎮", label: "Игры",          color: "from-violet-500/20 to-indigo-500/20 border-violet-500/40 text-violet-300" },
  { id: "life",    emoji: "💫", label: "Жизнь",         color: "from-yellow-500/20 to-amber-500/20 border-yellow-500/40 text-yellow-300" },
  { id: "music",   emoji: "🎵", label: "Музыка",        color: "from-pink-500/20 to-rose-500/20 border-pink-500/40 text-pink-300" },
  { id: "sport",   emoji: "🏋️", label: "Спорт",         color: "from-green-500/20 to-emerald-500/20 border-green-500/40 text-green-300" },
  { id: "humor",   emoji: "😂", label: "Юмор",          color: "from-orange-500/20 to-yellow-500/20 border-orange-500/40 text-orange-300" },
  { id: "food",    emoji: "🍕", label: "Еда",           color: "from-red-500/20 to-orange-500/20 border-red-500/40 text-red-300" },
  { id: "travel",  emoji: "✈️", label: "Путешествия",   color: "from-sky-500/20 to-blue-500/20 border-sky-500/40 text-sky-300" },
  { id: "tech",    emoji: "💻", label: "Технологии",    color: "from-cyan-500/20 to-teal-500/20 border-cyan-500/40 text-cyan-300" },
  { id: "cinema",  emoji: "🎬", label: "Кино",          color: "from-purple-500/20 to-fuchsia-500/20 border-purple-500/40 text-purple-300" },
  { id: "beauty",  emoji: "💄", label: "Красота",       color: "from-fuchsia-500/20 to-pink-500/20 border-fuchsia-500/40 text-fuchsia-300" },
  { id: "animals", emoji: "🐾", label: "Животные",      color: "from-lime-500/20 to-green-500/20 border-lime-500/40 text-lime-300" },
  { id: "art",     emoji: "🎨", label: "Арт",           color: "from-indigo-500/20 to-violet-500/20 border-indigo-500/40 text-indigo-300" },
  { id: "edu",     emoji: "📚", label: "Учёба",         color: "from-teal-500/20 to-cyan-500/20 border-teal-500/40 text-teal-300" },
  { id: "love",    emoji: "❤️", label: "Отношения",     color: "from-rose-500/20 to-red-500/20 border-rose-500/40 text-rose-300" },
] as const;

type TopicId = typeof TOPICS[number]["id"];

// ─── Event Countdown ──────────────────────────────────────────────────────────
function useCountdown(endAt: string | null) {
  const [remaining, setRemaining] = React.useState(() =>
    endAt ? Math.max(0, new Date(endAt).getTime() - Date.now()) : null
  );
  React.useEffect(() => {
    if (!endAt) return;
    const id = setInterval(() => setRemaining(Math.max(0, new Date(endAt).getTime() - Date.now())), 1000);
    return () => clearInterval(id);
  }, [endAt]);
  if (remaining === null) return null;
  const d = Math.floor(remaining / 86400000);
  const h = Math.floor((remaining % 86400000) / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return { d, h, m, s, totalMs: remaining };
}

// ─── Floating Particle ────────────────────────────────────────────────────────
function Particle({ color, delay, x, size, duration, repeatDelay }: { color: string; delay: number; x: number; size: number; duration: number; repeatDelay: number }) {
  return (
    <motion.div
      className="absolute bottom-0 rounded-full pointer-events-none"
      style={{ left: `${x}%`, width: size, height: size, backgroundColor: color, opacity: 0.6 }}
      animate={{ y: [0, -80], opacity: [0, 0.8, 0], scale: [0.5, 1.2, 0.3] }}
      transition={{ duration, delay, repeat: Infinity, repeatDelay, ease: "easeOut" }}
    />
  );
}

// ─── Single Event Card ────────────────────────────────────────────────────────
function EventCard({ ev, onDismiss }: { ev: any; onDismiss: () => void }) {
  const color = ev.bannerColor || "#7c3aed";
  const countdown = useCountdown(ev.endAt);
  const [joined, setJoined] = React.useState(false);
  const [burst, setBurst] = React.useState(false);

  const progress = React.useMemo(() => {
    if (!ev.startAt || !ev.endAt) return null;
    const total = new Date(ev.endAt).getTime() - new Date(ev.startAt).getTime();
    const elapsed = Date.now() - new Date(ev.startAt).getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  }, [ev.startAt, ev.endAt]);

  // Detect emoji prefix in title
  const emojiMatch = ev.title.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u);
  const emoji = emojiMatch ? emojiMatch[0].trim() : "🎉";
  const cleanTitle = emojiMatch ? ev.title.slice(emojiMatch[0].length) : ev.title;

  const particles = React.useMemo(() => {
    const rand = (seed: number, min: number, max: number) => min + ((seed * 9301 + 49297) % 233280) / 233280 * (max - min);
    return Array.from({ length: 8 }, (_, i) => ({
      x: 5 + i * 13,
      delay: i * 0.35,
      size: 4 + (i % 3) * 3,
      duration: rand(i, 2.5, 4.5),
      repeatDelay: rand(i + 10, 1, 4),
    }));
  }, []);

  const handleJoin = () => {
    setJoined(v => !v);
    if (!joined) {
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}18 0%, ${color}08 60%, transparent 100%)`,
        border: `1.5px solid ${color}50`,
        boxShadow: `0 0 24px ${color}18, inset 0 1px 0 ${color}20`,
      }}
    >
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <Particle key={i} color={color} delay={p.delay} x={p.x} size={p.size} duration={p.duration} repeatDelay={p.repeatDelay} />
        ))}
      </div>

      {/* Glow pulse */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        animate={{ opacity: [0, 0.12, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${color}60 0%, transparent 70%)` }}
      />

      <div className="relative z-10 p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Big emoji / image */}
          <div className="shrink-0 relative">
            {ev.imageUrl ? (
              <motion.img
                src={ev.imageUrl}
                alt=""
                className="w-14 h-14 rounded-xl object-cover"
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : (
              <motion.div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: `${color}20`, border: `1.5px solid ${color}30` }}
                animate={{ rotate: [0, -6, 6, -4, 0], scale: [1, 1.08, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
              >
                {emoji}
              </motion.div>
            )}
            {/* Live dot */}
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background"
              style={{ backgroundColor: color }}
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <motion.span
                className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
                style={{ background: `${color}25`, color, border: `1px solid ${color}40` }}
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🔴 LIVE EVENT
              </motion.span>
              <button
                onClick={onDismiss}
                className="ml-auto p-0.5 text-muted-foreground hover:text-foreground rounded transition-colors"
              >
                <X size={13} />
              </button>
            </div>

            <p className="font-black text-base text-foreground leading-tight">{cleanTitle}</p>

            {ev.description && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{ev.description}</p>
            )}
          </div>
        </div>

        {/* Countdown timer */}
        {countdown && countdown.totalMs > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground font-medium shrink-0">Осталось:</span>
            <div className="flex items-center gap-1">
              {countdown.d > 0 && (
                <div className="flex flex-col items-center px-2 py-1 rounded-lg" style={{ background: `${color}18` }}>
                  <span className="text-sm font-black tabular-nums" style={{ color }}>{countdown.d}</span>
                  <span className="text-[8px] text-muted-foreground uppercase">дн</span>
                </div>
              )}
              <div className="flex flex-col items-center px-2 py-1 rounded-lg" style={{ background: `${color}18` }}>
                <span className="text-sm font-black tabular-nums" style={{ color }}>{String(countdown.h).padStart(2, "0")}</span>
                <span className="text-[8px] text-muted-foreground uppercase">ч</span>
              </div>
              <span className="text-sm font-black" style={{ color }}>:</span>
              <div className="flex flex-col items-center px-2 py-1 rounded-lg" style={{ background: `${color}18` }}>
                <span className="text-sm font-black tabular-nums" style={{ color }}>{String(countdown.m).padStart(2, "0")}</span>
                <span className="text-[8px] text-muted-foreground uppercase">мин</span>
              </div>
              <span className="text-sm font-black" style={{ color }}>:</span>
              <div className="flex flex-col items-center px-2 py-1 rounded-lg" style={{ background: `${color}18` }}>
                <motion.span
                  key={countdown.s}
                  className="text-sm font-black tabular-nums"
                  style={{ color }}
                  initial={{ opacity: 0.4, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {String(countdown.s).padStart(2, "0")}
                </motion.span>
                <span className="text-[8px] text-muted-foreground uppercase">сек</span>
              </div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {progress !== null && (
          <div className="mt-2.5">
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${color}80, ${color})` }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <p className="text-[9px] text-muted-foreground mt-0.5 text-right">{Math.round(progress)}% прошло</p>
          </div>
        )}

        {/* Footer: date + join button */}
        <div className="mt-3 flex items-center justify-between gap-3">
          {ev.endAt && !countdown && (
            <p className="text-[10px] text-muted-foreground">
              До {new Date(ev.endAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
            </p>
          )}
          {!ev.endAt && !countdown && <div />}

          <motion.button
            onClick={handleJoin}
            whileTap={{ scale: 0.92 }}
            className="relative ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white transition-all overflow-hidden"
            style={{
              background: joined
                ? `linear-gradient(135deg, #10b981, #059669)`
                : `linear-gradient(135deg, ${color}, ${color}cc)`,
              boxShadow: joined ? "0 0 12px #10b98150" : `0 0 12px ${color}50`,
            }}
          >
            <AnimatePresence mode="wait">
              {burst && (
                <motion.span
                  key="burst"
                  className="absolute inset-0 flex items-center justify-center text-base"
                  initial={{ opacity: 1, scale: 0.5 }}
                  animate={{ opacity: 0, scale: 2 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  🎊
                </motion.span>
              )}
            </AnimatePresence>
            <motion.span
              key={joined ? "joined" : "join"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {joined ? "✓ Участвую!" : "Участвовать"}
            </motion.span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function ActiveEvents() {
  const [events, setEvents] = React.useState<any[]>([]);
  const [dismissed, setDismissed] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    const token = sessionStorage.getItem("pulse-token");
    if (!token) return;
    fetch("/api/platform-events", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setEvents(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const visible = events.filter(e => !dismissed.has(e.id));
  if (visible.length === 0) return null;

  return (
    <AnimatePresence>
      <div className="space-y-3">
        {visible.map(ev => (
          <EventCard
            key={ev.id}
            ev={ev}
            onDismiss={() => setDismissed(prev => new Set([...prev, ev.id]))}
          />
        ))}
      </div>
    </AnimatePresence>
  );
}

function TrendingTopicsWidget({ posts, onTopicClick, selectedTopic }: {
  posts: any[];
  onTopicClick: (id: string) => void;
  selectedTopic: string | null;
}) {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const counts: Record<string, number> = {};
  for (const p of posts) {
    if (!p.topic) continue;
    const ts = p.createdAt ? new Date(p.createdAt).getTime() : 0;
    if (now - ts <= DAY_MS) {
      counts[p.topic] = (counts[p.topic] ?? 0) + 1;
    }
  }

  const ranked = TOPICS
    .map(t => ({ ...t, count: counts[t.id] ?? 0 }))
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const max = ranked[0]?.count ?? 1;

  if (ranked.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={15} className="text-primary" />
          <h3 className="text-[13px] font-bold">Тренды сегодня</h3>
        </div>
        <p className="text-[12px] text-muted-foreground text-center py-4">Пока нет активных тем</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={15} className="text-primary" />
        <h3 className="text-[13px] font-bold">Тренды сегодня</h3>
        <span className="ml-auto text-[10px] text-muted-foreground font-medium">за 24 ч</span>
      </div>
      <div className="space-y-2.5">
        {ranked.map((topic, i) => {
          const isActive = selectedTopic === topic.id;
          const barWidth = Math.max(8, Math.round((topic.count / max) * 100));
          return (
            <button
              key={topic.id}
              onClick={() => onTopicClick(topic.id)}
              className={`w-full group text-left rounded-xl px-3 py-2.5 transition-all ${
                isActive
                  ? "bg-primary/10 ring-1 ring-primary/30"
                  : "hover:bg-secondary/70"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[10px] font-black w-4 shrink-0 ${
                  i === 0 ? "text-amber-400" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-600" : "text-muted-foreground/60"
                }`}>
                  {i + 1}
                </span>
                <span className="text-[13px]">{topic.emoji}</span>
                <span className={`text-[12px] font-semibold flex-1 truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                  {topic.label}
                </span>
                <span className={`text-[11px] font-bold shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {topic.count}
                </span>
              </div>
              <div className="h-[3px] rounded-full bg-secondary overflow-hidden ml-6">
                <motion.div
                  className={`h-full rounded-full ${isActive ? "bg-primary" : "bg-primary/40 group-hover:bg-primary/60"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05, ease: "easeOut" }}
                />
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-border/50 text-center">
        <span className="text-[10px] text-muted-foreground">
          {Object.values(counts).reduce((a, b) => a + b, 0)} постов с темой сегодня
        </span>
      </div>
    </div>
  );
}

export default function Feed() {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [newPostTopic, setNewPostTopic] = useState<TopicId | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<TopicId | null>(null);
  const { data: posts, isLoading, refetch } = useGetPosts({ query: { refetchInterval: 20000 } } as any);
  const { data: me } = useGetMe();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    window.addEventListener("pulse:moderation-removed", handler);
    return () => window.removeEventListener("pulse:moderation-removed", handler);
  }, [queryClient]);

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
    if (isSubmitting) return;

    const text = newPostText;
    const image = newPostImage;
    const topic = newPostTopic;

    setIsSubmitting(true);

    try {
      const token = sessionStorage.getItem("pulse-token");
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text: text || " ", imageUrl: image || undefined, topic: topic || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 422 && data.code === "MODERATION_BLOCKED") {
          toast({
            title: "🚫 Пост заблокирован модерацией",
            description: data.error || "Контент нарушает правила сообщества",
            variant: "destructive",
          });
        } else if (res.status === 429 && data.code === "FEED_MUTED") {
          toast({
            title: "⏳ Вы временно ограничены",
            description: data.error,
            variant: "destructive",
          });
        } else {
          toast({ title: "Не удалось опубликовать пост", description: data.error || "Попробуйте ещё раз", variant: "destructive" });
        }
        return;
      }

      setNewPostText("");
      setNewPostImage(null);
      setNewPostTopic(null);
      setShowCreatePost(false);
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    } catch {
      toast({ title: "Не удалось опубликовать пост", description: "Попробуйте ещё раз", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPosts = (Array.isArray(posts) ? posts : [])
    .filter((p: any) => !selectedTopic || p.topic === selectedTopic);
  const activeTopic = selectedTopic ? TOPICS.find(t => t.id === selectedTopic) : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <header className="border-b border-border bg-card/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center px-6 justify-between" style={{ minHeight: "calc(4rem + env(safe-area-inset-top, 0px))", paddingTop: "env(safe-area-inset-top, 0px)" }}>
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

      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin pb-24 md:pb-0">
        <div className="max-w-5xl mx-auto p-4 flex gap-5 items-start">
        <div className="flex-1 min-w-0 space-y-4">

          <ActiveEvents />

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
                  {/* Topic picker */}
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1"><Hash size={10}/> Тема поста</p>
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                      <button type="button" onClick={() => setNewPostTopic(null)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 border transition-all ${
                          newPostTopic === null ? "bg-foreground text-background border-transparent" : "border-border text-muted-foreground hover:text-foreground"
                        }`}>
                        Без темы
                      </button>
                      {TOPICS.map(t => (
                        <button key={t.id} type="button" onClick={() => setNewPostTopic(prev => prev === t.id ? null : t.id)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 border transition-all ${
                            newPostTopic === t.id ? `bg-gradient-to-r ${t.color} border-current` : "border-border text-muted-foreground hover:text-foreground"
                          }`}>
                          {t.emoji} {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
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
                        className="absolute top-1 right-1 bg-black/40 text-white rounded-full p-0.5 hover:bg-black/60 transition-colors"
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
                      disabled={imageLoading || isSubmitting || (!newPostText.trim() && !newPostImage)}
                      className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                      {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {imageLoading ? "Обработка..." : isSubmitting ? "Проверка..." : "Опубликовать"}
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
              key={selectedTopic ?? "all"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 text-muted-foreground"
            >
              <div className="text-5xl mb-4">
                {activeTopic ? activeTopic.emoji : "📡"}
              </div>
              <h3 className="text-base font-semibold mb-1">
                {activeTopic ? `Нет постов по теме «${activeTopic.label}»` : "Нет постов"}
              </h3>
              <p className="text-sm">
                {selectedTopic
                  ? <button onClick={() => setSelectedTopic(null)} className="text-primary hover:underline">Показать все публикации</button>
                  : "Будь первым кто поделится чем-нибудь!"
                }
              </p>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedTopic ?? "all"}
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
                    onTopicClick={(id) => setSelectedTopic(id as TopicId)}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-72 shrink-0 hidden xl:block sticky top-4 space-y-4">
          <TrendingTopicsWidget
            posts={posts as any[] ?? []}
            selectedTopic={selectedTopic}
            onTopicClick={(id) => setSelectedTopic(prev => prev === id ? null : id as TopicId)}
          />
        </div>

        </div>
      </div>
    </div>
  );
}
