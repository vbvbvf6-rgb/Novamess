import React from "react";
import { useGetStories, useGetMe } from "@workspace/api-client-react";
import type { StoryGroup } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { SmilePlus } from "lucide-react";

export function StoriesBar() {
  const { data: stories, isLoading } = useGetStories();
  const { data: me } = useGetMe();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex gap-4 p-4 overflow-x-auto">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1 shrink-0">
            <Skeleton className="w-14 h-14 rounded-full" />
            <Skeleton className="w-10 h-3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 p-4 overflow-x-auto scrollbar-none">
      {/* Add story button */}
      <div
        onClick={() => setLocation("/stories")}
        className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
      >
        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center border-2 border-dashed border-muted-foreground group-hover:border-primary transition-colors text-muted-foreground group-hover:text-primary">
          <span className="text-2xl mb-1">+</span>
        </div>
        <span className="text-xs text-muted-foreground font-medium">История</span>
      </div>

      {stories?.map((storyGroup: StoryGroup) => {
        const isMe = me && storyGroup.user.id === (me as any).id;
        return (
          <div
            key={storyGroup.user.id}
            className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group relative"
            onClick={() => isMe ? setLocation("/profile") : setLocation("/stories")}
            title={isMe ? "Мой профиль и статус" : storyGroup.user.displayName}
          >
            <div className={`w-14 h-14 rounded-full p-[2px] ${storyGroup.hasUnviewed ? "bg-gradient-to-tr from-primary to-accent animate-pulse" : "bg-border"}`}>
              <div
                className="w-full h-full rounded-full border-2 border-background overflow-hidden bg-muted flex items-center justify-center font-bold text-lg text-white"
                style={{ backgroundColor: storyGroup.user.avatarColor }}
              >
                {storyGroup.user.avatarUrl ? (
                  <img src={storyGroup.user.avatarUrl} alt={storyGroup.user.displayName} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  storyGroup.user.displayName[0].toUpperCase()
                )}
              </div>
            </div>
            {isMe && (
              <div className="absolute bottom-5 right-0 w-5 h-5 rounded-full bg-primary border-2 border-background flex items-center justify-center shadow-sm">
                <SmilePlus size={10} className="text-white" />
              </div>
            )}
            <span className="text-xs text-muted-foreground font-medium truncate w-16 text-center group-hover:text-foreground transition-colors">
              {isMe ? "Мой статус" : storyGroup.user.displayName.split(" ")[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
