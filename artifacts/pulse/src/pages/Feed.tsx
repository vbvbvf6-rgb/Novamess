import React, { useState } from "react";
import { useGetPosts, useCreatePost, useLikePost, useCreatePostComment, useGetPostComments, Post } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Send, Image, X, BadgeCheck, Plus, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";

function VerifiedBadge() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#00BCD4"/>
      <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PostCard({ post }: { post: Post }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const likePost = useLikePost();
  const createComment = useCreatePostComment();
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      {/* Author Header */}
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => post.author?.id && setLocation(`/user/${post.author.id}`)}
              className="font-semibold text-sm hover:text-primary transition-colors truncate"
            >
              {post.author?.displayName || "Unknown"}
            </button>
            {isVerified && <VerifiedBadge />}
          </div>
          <p className="text-xs text-muted-foreground">
            @{post.author?.username} · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.text}</p>
      </div>

      {/* Image */}
      {post.imageUrl && (
        <div className="border-t border-b border-border">
          <img src={post.imageUrl} alt="" className="w-full max-h-80 object-cover" />
        </div>
      )}

      {/* Actions */}
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

      {/* Comments */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-4 space-y-3">
              {comments?.map((comment) => (
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
                    </div>
                    <p className="text-xs text-foreground">{comment.text}</p>
                  </div>
                </div>
              ))}
              
              <form onSubmit={handleComment} className="flex gap-2 mt-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
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

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;
    createPost.mutate(
      { data: { text: newPostText, imageUrl: newPostImage || undefined } },
      {
        onSuccess: () => {
          setNewPostText("");
          setNewPostImage(null);
          setShowCreatePost(false);
          queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
        }
      }
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <header className="h-16 border-b border-border flex items-center px-6 justify-between bg-card/80 backdrop-blur-md z-10 shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="text-primary">📡</span> Feed
        </h1>
        <button
          onClick={() => setShowCreatePost(!showCreatePost)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-[0_0_10px_rgba(0,188,212,0.2)]"
        >
          <Plus size={16} /> New Post
        </button>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          
          {/* Create Post Form */}
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
                    <h3 className="font-semibold">Create Post</h3>
                    <button type="button" onClick={() => setShowCreatePost(false)} className="text-muted-foreground hover:text-foreground">
                      <X size={18} />
                    </button>
                  </div>
                  <textarea
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    placeholder="What's on your mind?"
                    rows={3}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/10"
                      >
                        <Image size={16} /> Photo
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={!newPostText.trim() || createPost.isPending}
                      className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                    >
                      {createPost.isPending ? "Posting..." : "Post"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Posts List */}
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
              <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
              <p className="text-sm">Be the first to share something!</p>
            </div>
          ) : (
            posts?.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </div>
    </div>
  );
}
