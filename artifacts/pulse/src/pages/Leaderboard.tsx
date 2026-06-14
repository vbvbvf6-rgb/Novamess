import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Users, Crown, BadgeCheck, Medal, Zap } from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

type Tab = "referral" | "balance" | "messages";

const TOKEN_KEY = "pulse-token";
const getToken = () => sessionStorage.getItem(TOKEN_KEY);

const apiFetch = (url: string) =>
  fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json());


function UserAvatar({ user, rank }: { user: any; rank: number }) {
  const medalColors: Record<number, string> = { 1: "#FFD700", 2: "#C0C0C0", 3: "#CD7F32" };
  const medal = medalColors[rank];

  return (
    <div className="relative shrink-0">
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg border-2"
        style={{
          backgroundColor: user.avatar_color || user.avatarColor || "#3B82F6",
          borderColor: medal || "transparent",
        }}
      >
        {user.avatar_url || user.avatarUrl ? (
          <img
            src={user.avatar_url || user.avatarUrl}
            alt={user.display_name || user.displayName}
            className="w-full h-full rounded-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          (user.display_name || user.displayName || "U")[0].toUpperCase()
        )}
      </div>
      {medal && (
        <div
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-background"
          style={{ backgroundColor: medal, color: rank === 1 ? "#7a5000" : rank === 2 ? "#555" : "#5a3000" }}
        >
          {rank}
        </div>
      )}
      {!medal && (
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black bg-secondary border-2 border-background text-muted-foreground">
          {rank}
        </div>
      )}
    </div>
  );
}

function ReferralLeaderboard({ me }: { me: any }) {
  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["referral-leaderboard"],
    queryFn: () => apiFetch("/api/referral/leaderboard"),
    refetchInterval: 30000,
  });

  const { data: myCode } = useQuery({
    queryKey: ["my-referral-code"],
    queryFn: () => apiFetch("/api/referral/my-code"),
  });

  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyCode = () => {
    if (!myCode?.code) return;
    navigator.clipboard.writeText(myCode.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const handleCopyLink = () => {
    if (!myCode?.link) return;
    navigator.clipboard.writeText(myCode.link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }).catch(() => {});
  };

  const handleShare = () => {
    if (!myCode?.link) return;
    if (navigator.share) {
      navigator.share({ title: "Присоединяйся к Nova!", text: `Используй мой код: ${myCode.code}`, url: myCode.link }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="space-y-5">
      {myCode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-green-500/30 overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(6,182,212,0.05))" }}
        >
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-green-500/15">
                <Users size={18} className="text-green-500" />
              </div>
              <div>
                <h3 className="font-black text-base text-foreground">Ваш реферальный код</h3>
                <p className="text-xs text-muted-foreground">Пригласите друзей в Nova</p>
              </div>
              {myCode.invited > 0 && (
                <span className="ml-auto text-[11px] font-black px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
                  +{myCode.invited} чел.
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div
                className="flex-1 bg-background/50 border border-border rounded-2xl px-5 py-3.5 font-mono text-xl font-black tracking-[0.3em] text-foreground text-center cursor-pointer select-all"
                onClick={handleCopyCode}
              >
                {myCode.code}
              </div>
              <button
                onClick={handleCopyCode}
                className="px-4 py-3.5 rounded-2xl bg-green-500/15 border border-green-500/30 text-green-500 font-bold text-sm hover:bg-green-500/25 transition-all shrink-0"
              >
                {copied ? "✓" : "Копировать"}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-2.5 rounded-xl bg-secondary border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
              >
                {copiedLink ? "✓ Ссылка скопирована" : "Копировать ссылку"}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary hover:bg-primary/20 transition-all"
              >
                Поделиться
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : !Array.isArray(leaderboard) || leaderboard.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold">Пока никто не пригласил друзей</p>
          <p className="text-sm mt-1">Будьте первым!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(leaderboard as any[]).map((entry: any, idx: number) => {
            const isMe = me && (entry.id === me.id);
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                  isMe
                    ? "border-green-500/40 bg-green-500/8"
                    : idx < 3
                    ? "border-border/80 bg-card/60"
                    : "border-border/40 bg-card/30"
                }`}
              >
                <UserAvatar user={entry} rank={idx + 1} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-foreground truncate">
                      {entry.display_name || entry.displayName}
                    </span>
                    {entry.is_verified && <BadgeCheck size={14} className="text-primary shrink-0" />}
                    {entry.has_prime && (
                      <Crown size={12} className={`shrink-0 ${entry.prime_tier === "prime_plus" ? "text-purple-400" : "text-yellow-400"}`} />
                    )}
                    {isMe && <span className="text-[10px] font-black text-green-500 bg-green-500/15 px-1.5 rounded">Вы</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">@{entry.username}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-lg text-foreground leading-none">{entry.invited_count}</p>
                  <p className="text-[11px] text-muted-foreground">приглашён{entry.invited_count === 1 ? "" : "о"}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatsLeaderboard({ tab, me }: { tab: Tab; me: any }) {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["leaderboard-stats", tab],
    queryFn: () => apiFetch(`/api/leaderboard?sort=${tab}`),
    refetchInterval: 60000,
  });

  const getValue = (u: any) => {
    if (tab === "messages") return u.messagesSent ?? u.messages_sent ?? 0;
    if (tab === "balance") return Number(u.balance ?? 0);
    return 0;
  };

  const getLabel = (u: any) => {
    if (tab === "messages") return `${Number(getValue(u)).toLocaleString()} сообщ.`;
    if (tab === "balance") return `${Number(getValue(u)).toLocaleString()} ⚡`;
    return "";
  };

  if (isLoading) return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}
    </div>
  );

  if (!Array.isArray(users) || users.length === 0) return (
    <div className="text-center py-12 text-muted-foreground">
      <Trophy size={40} className="mx-auto mb-3 opacity-30" />
      <p className="font-bold">Нет данных</p>
      <p className="text-sm mt-1">Станьте первым в рейтинге!</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {(users as any[]).map((entry: any, idx: number) => {
        const isMe = me && (entry.id === (me as any).id);
        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.04 }}
            className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
              isMe ? "border-primary/40 bg-primary/5" : idx < 3 ? "border-border/80 bg-card/60" : "border-border/40 bg-card/30"
            }`}
          >
            <UserAvatar user={entry} rank={idx + 1} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-foreground truncate">
                  {entry.display_name || entry.displayName}
                </span>
                {(entry.is_verified || entry.isVerified) && <BadgeCheck size={14} className="text-primary shrink-0" />}
                {(entry.has_prime || entry.hasPrime) && (
                  <Crown size={12} className={`shrink-0 ${(entry.prime_tier || entry.primeTier) === "prime_plus" ? "text-purple-400" : "text-yellow-400"}`} />
                )}
                {isMe && <span className="text-[10px] font-black text-primary bg-primary/15 px-1.5 rounded">Вы</span>}
              </div>
              <p className="text-xs text-muted-foreground">@{entry.username}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-black text-base text-foreground leading-none">{getLabel(entry)}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "referral", label: "Рефералы", icon: <Users size={14} /> },
  { key: "balance", label: "Баланс", icon: <Zap size={14} /> },
  { key: "messages", label: "Сообщения", icon: <Trophy size={14} /> },
];

export default function Leaderboard() {
  const { data: me } = useGetMe();
  const [activeTab, setActiveTab] = useState<Tab>("referral");

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <header className="border-b border-border flex items-center px-6 justify-between bg-card/80 backdrop-blur-md z-10 shrink-0" style={{ minHeight: "calc(4rem + env(safe-area-inset-top, 0px))", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="flex items-center gap-3">
          <Trophy size={22} className="text-yellow-400" />
          <h1 className="text-xl font-bold">Таблица лидеров</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-24 md:pb-6">
          <div className="flex gap-1 p-1 bg-secondary/60 rounded-2xl mb-6 border border-border/50">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? "bg-background text-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "referral" ? (
              <ReferralLeaderboard me={me} />
            ) : (
              <StatsLeaderboard tab={activeTab} me={me} />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
