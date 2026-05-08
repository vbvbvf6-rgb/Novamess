import React, { useState, useRef } from "react";
import { useGetPosts, useCreatePost, useLikePost, useCreatePostComment, useGetPostComments, Post } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Send, Image, X, Plus, Trash2, MoreVertical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ADMIN_USER_IDS = [4];
const getCurrentUserId = () => Number(localStorage.getItem("pulse-user-id") || "0");

function VerifiedBadge() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#00BCD4"/>
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

function PostCard({ post }: { post: Post }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const likePost = useLikePost();
  const createComment = useCreatePostComment();
  const currentUserId = getCurrentUserId();

  const canDelete = post.author?.id === currentUserId || ADMIN_USER_IDS.includes(currentUserId);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
        headers: { "x-user-id": String(currentUserId) },
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    } catch {}
    setIsDeleting(false);
  };
  const { data: comments, refetch: refetchComments } = useGetPostComments(post.id, {
    query: { enabled: showComments }
  });

  const handleLike = () => {
    likePost.mutate({ postId: post.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      }
    });
  };

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    createComment.mutate({ postId: post.id, data: { text: commentText } }, {
      onSuccess: () => {
        setCommentText("");
        refetchComments();
        queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      }
    });
  };

  const isVerified = (post.author as any)?.isVerified;
  const isAdmin = ADMIN_USER_IDS.includes((post.author as any)?.id);

  return (
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
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => post.author?.id && setLocation(`/user/${post.author.id}`)}
              className="font-semibold text-sm hover:text-primary transition-colors truncate"
            >
              {post.author?.displayName || "Unknown"}
            </button>
            {isVerified && <VerifiedBadge />}
            {isAdmin && <AdminBadge />}
          </div>
          <p className="text-xs text-muted-foreground">
            @{post.author?.username} · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
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
        <div className="border-t border-b border-border">
          <img src={post.imageUrl} alt="" className="w-full max-h-80 object-cover" />
        </div>
      )}

      <div className="flex items-center gap-4 px-4 py-3 border-t border-border">
        <button
          onClick={handleLike}
          disabled={likePost.isPending}
          className={`flex items-center gap-1.5 text-sm transition-colors group ${
            post.isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
          }`}
        >
          <Heart
            size={18}
            className={`transition-transform group-hover:scale-110 ${post.isLiked ? "fill-current" : ""}`}
          />
          <span className="font-medium">{post.likesCount}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group"
        >
          <MessageCircle size={18} className="transition-transform group-hover:scale-110" />
          <span className="font-medium">{post.commentsCount}</span>
        </button>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-4 space-y-3">
              {comments?.map((comment: any) => (
                <div key={comment.id} className="flex gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden"
                    style={{ backgroundColor: (comment.author as any)?.avatarColor || "#333" }}
                  >
                    {(comment.author as any)?.avatarUrl ? (
                      <img src={(comment.author as any).avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      ((comment.author as any)?.displayName || "U")[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 bg-secondary rounded-xl px-3 py-2">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-xs font-semibold">{(comment.author as any)?.displayName}</span>
                      {(comment.author as any)?.isVerified && <VerifiedBadge />}
                      {ADMIN_USER_IDS.includes((comment.author as any)?.id) && <AdminBadge />}
                    </div>
                    <p className="text-xs text-foreground">{comment.text}</p>
                  </div>
                </div>
              ))}

              <form onSubmit={handleComment} className="flex gap-2 mt-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Написать комментарий..."
                  className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || createComment.isPending}
                  className="p-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Feed() {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const { data: posts, isLoading } = useGetPosts();
  const createPost = useCreatePost();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setNewPostImage(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim() && !newPostImage) return;
    try {
      await createPost.mutateAsync(
        { data: { text: newPostText || " ", imageUrl: newPostImage || undefined } },
      );
      setNewPostText("");
      setNewPostImage(null);
      setShowCreatePost(false);
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    } catch {
      // error handled silently, button resets
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <header className="h-16 border-b border-border flex items-center px-6 justify-between bg-card/80 backdrop-blur-md z-10 shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="text-primary">📡</span> Лента
        </h1>
        <button
          onClick={() => setShowCreatePost(!showCreatePost)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-[0_0_10px_rgba(0,188,212,0.2)]"
        >
          <Plus size={16} /> Новый пост
        </button>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-2xl mx-auto p-4 space-y-4">

          <AnimatePresence>
            {showCreatePost && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-card border border-primary/30 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(0,188,212,0.1)]"
              >
                <form onSubmit={handleCreatePost} className="p-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold">Создать пост</h3>
                    <button type="button" onClick={() => { setShowCreatePost(false); setNewPostImage(null); }} className="text-muted-foreground hover:text-foreground">
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
                  {newPostImage && (
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
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/10"
                    >
                      <Image size={16} /> {newPostImage ? "Сменить фото" : "Фото"}
                    </button>
                    <button
                      type="submit"
                      disabled={(!newPostText.trim() && !newPostImage) || createPost.isPending}
                      className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                    >
                      {createPost.isPending ? "Публикуем..." : "Опубликовать"}
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
          ) : posts?.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-6xl mb-4">📡</div>
              <h3 className="text-lg font-semibold mb-2">Нет постов</h3>
              <p className="text-sm">Будь первым кто поделится чем-нибудь!</p>
            </div>
          ) : (
            posts?.map((post: any) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </div>
    </div>
  );
}
