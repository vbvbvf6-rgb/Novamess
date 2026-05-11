import React from "react";
import { useGetMyStats, useGetMe } from "@workspace/api-client-react";
import { GiftShowcase } from "@/components/GiftShowcase";
import { GiftLeaderboard } from "@/components/GiftLeaderboard";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Phone, Gift, Users, Clock, CalendarDays, Settings, BadgeCheck, Crown } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Profile() {
  const { data: user, isLoading: userLoading } = useGetMe();
  const { data: stats, isLoading: statsLoading } = useGetMyStats();

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <header className="h-16 border-b border-border flex items-center px-6 justify-between bg-card/80 backdrop-blur-md z-10 shrink-0">
        <h1 className="text-xl font-bold">My Profile</h1>
        <Link href="/settings">
          <button className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-xl text-sm font-medium transition-colors">
            <Settings size={16} className="text-primary" />
            Edit Profile
          </button>
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-3xl w-full mx-auto scrollbar-thin">
        {userLoading ? (
          <div className="space-y-8">
            <div className="flex flex-col items-center">
              <Skeleton className="w-32 h-32 rounded-full mb-4" />
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Header Section */}
            <div
              className="flex flex-col items-center text-center p-6 rounded-3xl border border-border bg-card/30 relative overflow-hidden"
              style={(user as any)?.hasPrime ? { borderColor: "rgba(250,204,21,0.3)" } : undefined}
            >
              {(user as any)?.hasPrime ? (
                <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/15 via-orange-500/5 to-transparent" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-50" />
              )}

              {(user as any)?.hasPrime && (
                <div className="absolute inset-0 overflow-hidden rounded-3xl">
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute rounded-full"
                      style={{
                        width: i % 2 === 0 ? 5 : 3,
                        height: i % 2 === 0 ? 5 : 3,
                        left: `${8 + i * 11}%`,
                        top: `${15 + (i % 4) * 18}%`,
                        background: i % 2 === 0 ? "#facc15" : "#fb923c",
                      }}
                      animate={{ y: [0, -12, 0], opacity: [0.3, 0.8, 0.3] }}
                      transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: i * 0.35 }}
                    />
                  ))}
                </div>
              )}

              <div className="relative mb-4 z-10">
                {(user as any)?.hasPrime && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-[3px] rounded-full"
                    style={{
                      background: "conic-gradient(from 0deg, #facc15, #fb923c, #f97316, #facc15)",
                      borderRadius: "50%",
                    }}
                  />
                )}
                <div
                  className="w-32 h-32 rounded-full flex items-center justify-center text-white font-bold text-5xl relative shadow-2xl border-4 border-background"
                  style={{ backgroundColor: user?.avatarColor || "#333" }}
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    (user?.displayName || "U")[0].toUpperCase()
                  )}
                  <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-background ${
                    user?.status === "online" ? "bg-green-500" :
                    user?.status === "away" ? "bg-yellow-500" : "bg-gray-500"
                  }`} />
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-1 relative z-10 flex-wrap justify-center">
                <h2
                  className="text-3xl font-bold text-foreground"
                  style={(user as any)?.hasPrime ? {
                    background: "linear-gradient(90deg, #facc15, #fb923c)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  } : undefined}
                >
                  {user?.displayName}
                </h2>
                {(user as any)?.hasPrime && (
                  <motion.div
                    animate={{ rotate: [0, -8, 8, -8, 0], scale: [1, 1.15, 1] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                    className="w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_12px_rgba(250,204,21,0.6)]"
                  >
                    <Crown size={14} className="text-black" />
                  </motion.div>
                )}
                {(user as any)?.isVerified && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="12" fill="hsl(16 100% 50%)"/>
                    <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {(user as any)?.hasPrime && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Prime ⭐</span>
                )}
              </div>
              <p className="text-primary font-medium mb-1 relative z-10">@{user?.username}</p>
              
              {(user as any)?.statusText && (
                <p className="text-sm text-muted-foreground mb-2 relative z-10">{(user as any).statusText}</p>
              )}
              
              {user?.bio && (
                <p className="text-muted-foreground max-w-md relative z-10 text-sm italic">"{user.bio}"</p>
              )}
              
              <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground uppercase tracking-wider font-semibold relative z-10 bg-black/20 px-4 py-2 rounded-full backdrop-blur-md">
                <CalendarDays size={14} /> Joined {user?.createdAt ? format(new Date(user.createdAt), "MMMM yyyy") : "Unknown"}
              </div>
            </div>

            {/* Gift Showcase */}
            {user && <GiftShowcase userId={(user as any).id} />}

            {/* Gift Leaderboard */}
            {user && <GiftLeaderboard userId={(user as any).id} />}

            {/* Stats Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 px-2">Your Activity</h3>
              {statsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatCard 
                    icon={<MessageSquare className="text-blue-500" />} 
                    label="Messages" 
                    value={stats?.messagesSent?.toLocaleString() || "0"} 
                    color="bg-blue-500/10 border-blue-500/20" 
                  />
                  <StatCard 
                    icon={<Phone className="text-green-500" />} 
                    label="Calls Made" 
                    value={stats?.callsMade?.toLocaleString() || "0"} 
                    color="bg-green-500/10 border-green-500/20" 
                  />
                  <StatCard 
                    icon={<Clock className="text-orange-500" />} 
                    label="Call Time" 
                    value={stats?.callDurationSeconds ? `${Math.floor(stats.callDurationSeconds / 60)}m` : "0m"} 
                    color="bg-orange-500/10 border-orange-500/20" 
                  />
                  <StatCard 
                    icon={<Gift className="text-purple-500" />} 
                    label="Gifts Sent" 
                    value={stats?.giftsSent?.toLocaleString() || "0"} 
                    color="bg-purple-500/10 border-purple-500/20" 
                  />
                  <StatCard 
                    icon={<Gift className="text-pink-500" />} 
                    label="Gifts Received" 
                    value={stats?.giftsReceived?.toLocaleString() || "0"} 
                    color="bg-pink-500/10 border-pink-500/20" 
                  />
                  <StatCard 
                    icon={<Users className="text-primary" />} 
                    label="Contacts" 
                    value={stats?.contactsCount?.toLocaleString() || "0"} 
                    color="bg-primary/10 border-primary/20" 
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
  return (
    <div className={`p-5 rounded-2xl border flex flex-col items-center text-center ${color} transition-transform hover:-translate-y-1`}>
      <div className="mb-3 p-3 bg-background/50 rounded-xl shadow-sm backdrop-blur-sm">
        {icon}
      </div>
      <span className="text-2xl font-bold text-foreground mb-1">{value}</span>
      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{label}</span>
    </div>
  );
}
