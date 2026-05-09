import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Zap, Users, TrendingUp, Send, CheckCircle, AlertTriangle, RefreshCw,
  Plus, Trash2, Key, BadgeCheck, X, ShieldCheck, ShieldOff, MessageSquare,
  PhoneCall, Gift, Crown, Megaphone, BarChart3, Activity, Star,
  Edit3, Save, ChevronDown, ChevronRight, ChevronLeft, Minus, Ban, FileText, Trophy, Image, Package,
  ShieldAlert, Clock, CheckCircle2, Bug, Inbox, Send as SendIcon
} from "lucide-react";

interface AdminUser {
  id: number;
  username: string;
  display_name: string;
  avatar_color: string;
  avatar_url: string | null;
  status: string;
  balance: number;
  created_at: string;
  is_verified: boolean;
  is_admin: boolean;
  is_bot: boolean;
  has_prime: boolean;
}

interface Stats {
  totalUsers: number;
  totalSpark: number;
  primeUsers: number;
  totalMessages: number;
  totalChats: number;
  totalCalls: number;
  totalGifts: number;
}

interface UserStats {
  messagesSent: number;
  giftsSent: number;
  giftsReceived: number;
  callsTotal: number;
}

interface AdminPost {
  id: number;
  text: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: number;
  username: string;
  display_name: string;
  avatar_color: string;
  avatar_url: string | null;
}

interface LeaderEntry {
  id: number;
  username: string;
  display_name: string;
  avatar_color: string;
  avatar_url: string | null;
  score: number;
}

interface Leaderboard {
  byBalance: LeaderEntry[];
  byMessages: LeaderEntry[];
  byGifts: LeaderEntry[];
}

function getHeader(): Record<string, string> {
  const token = localStorage.getItem("pulse-token");
  if (token) return { "Authorization": `Bearer ${token}` };
  const uid = localStorage.getItem("pulse-user-id");
  return uid ? { "x-user-id": uid } : {};
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-xl font-black text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</p>
      </div>
    </div>
  );
}

export default function Admin() {
  const userId = Number(localStorage.getItem("pulse-user-id") || "0");
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    fetch("/api/admin/check", { headers: getHeader() })
      .then(r => r.json())
      .then(d => { setHasAccess(d.isAdmin === true); setAccessChecked(true); })
      .catch(() => { setHasAccess(false); setAccessChecked(true); });
  }, [userId]);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userStatsLoading, setUserStatsLoading] = useState(false);
  const [giveAmount, setGiveAmount] = useState<string>("");
  const [giveLoading, setGiveLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"balance" | "password" | "actions" | "stats">("balance");
  const [newPassword, setNewPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Mass SPARK
  const [massAmount, setMassAmount] = useState("");
  const [massLoading, setMassLoading] = useState(false);
  const [showMassConfirm, setShowMassConfirm] = useState(false);

  // Announcement
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [showAnnounce, setShowAnnounce] = useState(false);

  // Prime
  const [primeMonths, setPrimeMonths] = useState("1");
  const [primeLoading, setPrimeLoading] = useState(false);

  // Edit profile
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Posts moderation
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [showPosts, setShowPosts] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderTab, setLeaderTab] = useState<"byBalance" | "byMessages" | "byGifts">("byBalance");

  // Ban
  const [banLoading, setBanLoading] = useState(false);
  const [bannedIds, setBannedIds] = useState<Set<number>>(new Set());

  // Moderation Appeals
  interface ModerationAppeal {
    id: number;
    post_id: number;
    user_id: number;
    appeal_text: string;
    status: 'pending' | 'approved' | 'rejected';
    admin_response: string | null;
    created_at: string;
    resolved_at: string | null;
    post_text: string;
    post_image_url: string | null;
    moderation_reason: string | null;
    moderation_confidence: number | null;
    moderation_categories: string | null;
    username: string;
    display_name: string;
    avatar_color: string;
    avatar_url: string | null;
  }
  const [appeals, setAppeals] = useState<ModerationAppeal[]>([]);
  const [appealsLoading, setAppealsLoading] = useState(false);
  const [showAppeals, setShowAppeals] = useState(false);
  const [appealActionLoading, setAppealActionLoading] = useState<number | null>(null);
  const [appealResponse, setAppealResponse] = useState<Record<number, string>>({});

  // Support Bugs
  interface AdminBugReport {
    id: number; title: string; description: string; category: string; status: string;
    platform_info: string | null; admin_note: string | null; created_at: string;
    username: string; display_name: string; avatar_color: string; avatar_url: string | null;
  }
  interface AdminSupportTicket {
    id: number; subject: string; status: string; created_at: string; updated_at: string;
    message_count: number; last_message: string | null; last_is_admin: boolean;
    username: string; display_name: string; avatar_color: string; avatar_url: string | null;
  }
  interface SupportMessage { id: number; is_admin: boolean; text: string; created_at: string; display_name: string | null; avatar_color: string | null; }
  interface TicketDetail extends AdminSupportTicket { messages: SupportMessage[]; }

  const [bugs, setBugs] = useState<AdminBugReport[]>([]);
  const [bugsLoading, setBugsLoading] = useState(false);
  const [showBugs, setShowBugs] = useState(false);
  const [bugActionId, setBugActionId] = useState<number | null>(null);
  const [bugNote, setBugNote] = useState<Record<number, string>>({});
  const [bugStatusEdit, setBugStatusEdit] = useState<Record<number, string>>({});

  const [supportTickets, setSupportTickets] = useState<AdminSupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [showTickets, setShowTickets] = useState(false);
  const [activeAdminTicket, setActiveAdminTicket] = useState<TicketDetail | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState("");
  const [ticketReplying, setTicketReplying] = useState(false);

  const [verifications, setVerifications] = useState<any[]>([]);
  const [vLoading, setVLoading] = useState(false);
  const [showV, setShowV] = useState(false);
  const [vActionId, setVActionId] = useState<number | null>(null);
  const [vPreview, setVPreview] = useState<string | null>(null);

  const fetchVerifications = async () => {
    setVLoading(true);
    try {
      const r = await fetch("/api/admin/age-verifications", { headers: getHeader() });
      if (r.ok) setVerifications(await r.json());
    } catch {}
    setVLoading(false);
  };

  const handleAgeVerify = async (userId: number, approve: boolean) => {
    setVActionId(userId);
    try {
      const r = await fetch(`/api/admin/age-verifications/${userId}/${approve ? "approve" : "reject"}`, { method: "POST", headers: getHeader() });
      const d = await r.json();
      if (!r.ok) { showToast(d.error || "Ошибка", "err"); setVActionId(null); return; }
      showToast(approve ? "✅ Верифицирован" : "❌ Отклонён", "ok");
      setVerifications(prev => prev.map(v => v.id === userId ? { ...v, age_verified: approve } : v));
    } catch { showToast("Ошибка", "err"); }
    setVActionId(null);
  };

  const fetchBugs = async () => {
    setBugsLoading(true);
    try {
      const res = await fetch("/api/admin/support/bugs", { headers: getHeader() });
      if (res.ok) setBugs(await res.json());
    } catch {}
    setBugsLoading(false);
  };

  const fetchSupportTickets = async () => {
    setTicketsLoading(true);
    try {
      const res = await fetch("/api/admin/support/tickets", { headers: getHeader() });
      if (res.ok) setSupportTickets(await res.json());
    } catch {}
    setTicketsLoading(false);
  };

  const openAdminTicket = async (ticketId: number) => {
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`, { headers: getHeader() });
      if (res.ok) setActiveAdminTicket(await res.json());
    } catch {}
  };

  const handleBugUpdate = async (bugId: number) => {
    setBugActionId(bugId);
    const status = bugStatusEdit[bugId];
    const note = bugNote[bugId];
    try {
      const res = await fetch(`/api/admin/support/bugs/${bugId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ status: status || undefined, adminNote: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); setBugActionId(null); return; }
      showToast("✅ Обновлено", "ok");
      setBugs(prev => prev.map(b => b.id === bugId ? { ...b, status: status || b.status, admin_note: note || b.admin_note } : b));
      setBugNote(prev => { const n = { ...prev }; delete n[bugId]; return n; });
    } catch { showToast("Ошибка", "err"); }
    setBugActionId(null);
  };

  const handleTicketReply = async (close = false) => {
    if (!activeAdminTicket || !ticketReplyText.trim()) return;
    setTicketReplying(true);
    try {
      const res = await fetch(`/api/admin/support/tickets/${activeAdminTicket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ text: ticketReplyText.trim(), closeTicket: close }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); setTicketReplying(false); return; }
      showToast(close ? "✅ Ответ отправлен, тикет закрыт" : "✅ Ответ отправлен", "ok");
      setTicketReplyText("");
      await openAdminTicket(activeAdminTicket.id);
      await fetchSupportTickets();
    } catch { showToast("Ошибка", "err"); }
    setTicketReplying(false);
  };

  const fetchAppeals = async () => {
    setAppealsLoading(true);
    try {
      const res = await fetch("/api/admin/moderation/appeals", { headers: getHeader() });
      if (res.ok) setAppeals(await res.json());
    } catch {}
    setAppealsLoading(false);
  };

  const handleAppealApprove = async (appealId: number) => {
    setAppealActionLoading(appealId);
    try {
      const res = await fetch(`/api/admin/moderation/appeals/${appealId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ adminResponse: appealResponse[appealId] || "" }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); return; }
      showToast("✅ Апелляция одобрена, пост восстановлен", "ok");
      setAppeals(prev => prev.map(a => a.id === appealId ? { ...a, status: 'approved' as const } : a));
    } catch { showToast("Ошибка соединения", "err"); }
    setAppealActionLoading(null);
  };

  const handleAppealReject = async (appealId: number) => {
    setAppealActionLoading(appealId);
    try {
      const res = await fetch(`/api/admin/moderation/appeals/${appealId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ adminResponse: appealResponse[appealId] || "" }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); return; }
      showToast("❌ Апелляция отклонена", "ok");
      setAppeals(prev => prev.map(a => a.id === appealId ? { ...a, status: 'rejected' as const } : a));
    } catch { showToast("Ошибка соединения", "err"); }
    setAppealActionLoading(null);
  };

  // Top-up requests
  interface TopupRequest {
    id: number;
    user_id: number;
    username: string;
    display_name: string;
    avatar_color: string;
    avatar_url: string | null;
    amount: number;
    package_label: string;
    price_label: string;
    status: string;
    created_at: string;
  }
  const [topupRequests, setTopupRequests] = useState<TopupRequest[]>([]);
  const [topupLoading, setTopupLoading] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [topupActionLoading, setTopupActionLoading] = useState<number | null>(null);

  const fetchTopupRequests = async () => {
    setTopupLoading(true);
    try {
      const res = await fetch("/api/admin/topup-requests", { headers: getHeader() });
      if (res.ok) setTopupRequests(await res.json());
    } catch {}
    setTopupLoading(false);
  };

  const handleTopupApprove = async (id: number) => {
    setTopupActionLoading(id);
    try {
      const res = await fetch(`/api/admin/topup-requests/${id}/approve`, { method: "POST", headers: getHeader() });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); return; }
      showToast(`✅ Одобрено +${data.amount} ⚡ пользователю`, "ok");
      setTopupRequests(prev => prev.map(r => r.id === id ? { ...r, status: "approved" } : r));
    } catch { showToast("Ошибка соединения", "err"); }
    setTopupActionLoading(null);
  };

  const handleTopupDeny = async (id: number) => {
    setTopupActionLoading(id);
    try {
      const res = await fetch(`/api/admin/topup-requests/${id}/deny`, { method: "POST", headers: getHeader() });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); return; }
      showToast("❌ Заявка отклонена", "ok");
      setTopupRequests(prev => prev.map(r => r.id === id ? { ...r, status: "denied" } : r));
    } catch { showToast("Ошибка соединения", "err"); }
    setTopupActionLoading(null);
  };

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPosts = async () => {
    setPostsLoading(true);
    try {
      const res = await fetch("/api/admin/posts", { headers: getHeader() });
      if (res.ok) setPosts(await res.json());
    } catch {}
    setPostsLoading(false);
  };

  const handleDeletePost = async (postId: number) => {
    setDeletingPostId(postId);
    try {
      const res = await fetch(`/api/admin/posts/${postId}`, { method: "DELETE", headers: getHeader() });
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        showToast("🗑️ Пост удалён", "ok");
      } else {
        showToast("Ошибка удаления", "err");
      }
    } catch { showToast("Ошибка соединения", "err"); }
    setDeletingPostId(null);
  };

  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true);
    try {
      const res = await fetch("/api/admin/leaderboard", { headers: getHeader() });
      if (res.ok) setLeaderboard(await res.json());
    } catch {}
    setLeaderboardLoading(false);
  };

  const handleBanToggle = async (target: AdminUser) => {
    const isBanned = bannedIds.has(target.id);
    setBanLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${target.id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ ban: !isBanned }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); return; }
      showToast(data.message, "ok");
      setBannedIds(prev => {
        const next = new Set(prev);
        if (!isBanned) next.add(target.id); else next.delete(target.id);
        return next;
      });
    } catch { showToast("Ошибка соединения", "err"); }
    setBanLoading(false);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch("/api/admin/users", { headers: getHeader() }),
        fetch("/api/admin/stats", { headers: getHeader() }),
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchUserStats = async (uid: number) => {
    setUserStatsLoading(true);
    setUserStats(null);
    try {
      const res = await fetch(`/api/admin/users/${uid}/stats`, { headers: getHeader() });
      if (res.ok) setUserStats(await res.json());
    } catch {}
    setUserStatsLoading(false);
  };

  const selectUser = (user: AdminUser) => {
    setSelectedUser(user);
    setActiveTab("balance");
    setShowEditProfile(false);
    setEditDisplayName(user.display_name);
    setEditBio("");
  };

  useEffect(() => {
    if (activeTab === "stats" && selectedUser) {
      fetchUserStats(selectedUser.id);
    }
  }, [activeTab, selectedUser]);

  const handleGive = async (amount: number) => {
    if (!selectedUser) return;
    setGiveLoading(true);
    try {
      const res = await fetch("/api/admin/give-currency", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ userId: selectedUser.id, amount }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); return; }
      showToast(`${amount > 0 ? "+" : ""}${amount} ⚡ → ${selectedUser.display_name}`, "ok");
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, balance: data.newBalance } : u));
      setSelectedUser(prev => prev ? { ...prev, balance: data.newBalance } : null);
      if (stats) setStats(prev => prev ? { ...prev, totalSpark: prev.totalSpark + amount } : null);
      setGiveAmount("");
    } catch { showToast("Ошибка соединения", "err"); }
    setGiveLoading(false);
  };

  const handleCustomAmount = () => {
    const n = Number(giveAmount);
    if (isNaN(n) || n === 0) return showToast("Введите корректную сумму", "err");
    handleGive(n);
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword.trim()) return;
    if (newPassword.length < 6) { showToast("Пароль минимум 6 символов", "err"); return; }
    setPwLoading(true);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ userId: selectedUser.id, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) showToast(data.error || "Ошибка", "err");
      else { showToast(`🔐 Пароль @${selectedUser.username} изменён`, "ok"); setNewPassword(""); }
    } catch { showToast("Ошибка соединения", "err"); }
    setPwLoading(false);
  };

  const handleToggleVerified = async (target: AdminUser) => {
    try {
      const res = await fetch("/api/admin/set-verified", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ userId: target.id, isVerified: !target.is_verified }),
      });
      if (res.ok) {
        showToast(`${!target.is_verified ? "✅ Верификация выдана" : "❌ Верификация снята"}: @${target.username}`, "ok");
        setUsers(prev => prev.map(u => u.id === target.id ? { ...u, is_verified: !target.is_verified } : u));
        setSelectedUser(prev => prev?.id === target.id ? { ...prev, is_verified: !target.is_verified } : prev);
      }
    } catch { showToast("Ошибка", "err"); }
  };

  const handleToggleAdmin = async (target: AdminUser) => {
    try {
      const res = await fetch("/api/admin/set-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ userId: target.id, isAdmin: !target.is_admin }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); return; }
      showToast(`${!target.is_admin ? "🛡️ Права выданы" : "🚫 Права сняты"}: @${target.username}`, "ok");
      setUsers(prev => prev.map(u => u.id === target.id ? { ...u, is_admin: !target.is_admin } : u));
      setSelectedUser(prev => prev?.id === target.id ? { ...prev, is_admin: !target.is_admin } : prev);
    } catch { showToast("Ошибка", "err"); }
  };

  const handleTogglePrime = async (give: boolean) => {
    if (!selectedUser) return;
    setPrimeLoading(true);
    try {
      const res = await fetch("/api/admin/give-prime", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ userId: selectedUser.id, give, months: Number(primeMonths) || 1 }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); return; }
      showToast(data.message, "ok");
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, has_prime: give } : u));
      setSelectedUser(prev => prev ? { ...prev, has_prime: give } : null);
      if (stats) setStats(prev => prev ? { ...prev, primeUsers: prev.primeUsers + (give ? 1 : -1) } : null);
    } catch { showToast("Ошибка соединения", "err"); }
    setPrimeLoading(false);
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteConfirm.id}`, { method: "DELETE", headers: getHeader() });
      const data = await res.json();
      if (!res.ok) showToast(data.error || "Ошибка удаления", "err");
      else {
        showToast(`🗑️ @${deleteConfirm.username} удалён`, "ok");
        setUsers(prev => prev.filter(u => u.id !== deleteConfirm.id));
        if (selectedUser?.id === deleteConfirm.id) setSelectedUser(null);
        if (stats) setStats(prev => prev ? { ...prev, totalUsers: prev.totalUsers - 1 } : null);
        setDeleteConfirm(null);
      }
    } catch { showToast("Ошибка соединения", "err"); }
    setDeleteLoading(false);
  };

  const handleMassGive = async () => {
    const n = Number(massAmount);
    if (isNaN(n) || n === 0) return showToast("Введите корректную сумму", "err");
    setMassLoading(true);
    try {
      const res = await fetch("/api/admin/mass-give", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ amount: n }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); return; }
      showToast(`⚡ ${n > 0 ? "+" : ""}${n} SPARK → ${data.usersAffected} пользователей`, "ok");
      setMassAmount("");
      setShowMassConfirm(false);
      fetchData();
    } catch { showToast("Ошибка соединения", "err"); }
    setMassLoading(false);
  };

  const handleAnnouncement = async () => {
    if (!announcementText.trim()) return;
    setAnnouncementLoading(true);
    try {
      const res = await fetch("/api/admin/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ text: announcementText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); return; }
      showToast(`📢 Отправлено в ${data.chatsSent} чат(ов)`, "ok");
      setAnnouncementText("");
      setShowAnnounce(false);
    } catch { showToast("Ошибка соединения", "err"); }
    setAnnouncementLoading(false);
  };

  const handleEditProfile = async () => {
    if (!selectedUser || !editDisplayName.trim()) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ displayName: editDisplayName.trim(), bio: editBio }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); return; }
      showToast(`✏️ Профиль @${selectedUser.username} обновлён`, "ok");
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, display_name: editDisplayName.trim() } : u));
      setSelectedUser(prev => prev ? { ...prev, display_name: editDisplayName.trim() } : null);
      setShowEditProfile(false);
    } catch { showToast("Ошибка соединения", "err"); }
    setEditLoading(false);
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.display_name.toLowerCase().includes(search.toLowerCase())
  );

  if (!accessChecked) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <RefreshCw size={32} className="animate-spin text-primary" />
      </div>
    );
  }
  if (!hasAccess) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield size={64} className="mx-auto mb-4 text-destructive opacity-50" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Доступ запрещён</h2>
          <p className="text-muted-foreground">У вас нет прав администратора</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2.5 px-5 py-3 rounded-2xl font-semibold text-sm shadow-2xl backdrop-blur-xl border ${
              toast.type === "ok"
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                : "bg-red-500/20 border-red-500/30 text-red-300"
            }`}
          >
            {toast.type === "ok" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Trash2 size={20} className="text-destructive" />
              </div>
              <div>
                <h3 className="font-bold">Удалить пользователя</h3>
                <p className="text-sm text-muted-foreground">Это действие необратимо</p>
              </div>
            </div>
            <p className="text-sm text-foreground mb-5">
              Вы действительно хотите удалить <span className="font-bold">@{deleteConfirm.username}</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
                Отмена
              </button>
              <button onClick={handleDeleteUser} disabled={deleteLoading} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:bg-destructive/90 transition-colors disabled:opacity-50">
                {deleteLoading ? "Удаляем..." : "Удалить"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Mass SPARK confirm */}
      {showMassConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Zap size={20} className="text-yellow-400" />
              </div>
              <div>
                <h3 className="font-bold">Массовая выдача SPARK</h3>
                <p className="text-sm text-muted-foreground">Всем пользователям сразу</p>
              </div>
            </div>
            <p className="text-sm mb-5">
              Выдать <span className="font-bold text-primary">{Number(massAmount) > 0 ? "+" : ""}{massAmount} ⚡ SPARK</span> каждому из <span className="font-bold">{users.length}</span> пользователей?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowMassConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">Отмена</button>
              <button onClick={handleMassGive} disabled={massLoading} className="flex-1 py-2.5 rounded-xl bg-yellow-500 text-black text-sm font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50">
                {massLoading ? "..." : "Подтвердить"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <header className="h-16 border-b border-border flex items-center px-6 justify-between bg-card/80 backdrop-blur-md shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Shield className="text-primary" size={20} /> Панель администратора
        </h1>
        <button onClick={fetchData} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={<Users size={20} className="text-primary" />} label="Пользователей" value={stats.totalUsers} color="bg-primary/10" />
            <StatCard icon={<Zap size={20} className="text-yellow-400" />} label="SPARK в обороте" value={stats.totalSpark} color="bg-yellow-500/10" />
            <StatCard icon={<Crown size={20} className="text-amber-400" />} label="Prime подписок" value={stats.primeUsers} color="bg-amber-500/10" />
            <StatCard icon={<MessageSquare size={20} className="text-blue-400" />} label="Сообщений" value={stats.totalMessages} color="bg-blue-500/10" />
            <StatCard icon={<Activity size={20} className="text-green-400" />} label="Чатов" value={stats.totalChats} color="bg-green-500/10" />
            <StatCard icon={<PhoneCall size={20} className="text-cyan-400" />} label="Звонков" value={stats.totalCalls} color="bg-cyan-500/10" />
            <StatCard icon={<Gift size={20} className="text-pink-400" />} label="Подарков" value={stats.totalGifts} color="bg-pink-500/10" />
            <StatCard icon={<TrendingUp size={20} className="text-violet-400" />} label="Средний баланс" value={stats.totalUsers > 0 ? Math.round(stats.totalSpark / stats.totalUsers) : 0} color="bg-violet-500/10" />
          </div>
        )}

        {/* Tools row: Announcement + Mass SPARK + Posts + Leaderboard */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Broadcast announcement */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowAnnounce(v => !v)}
              className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Megaphone size={18} className="text-orange-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Объявление всем</p>
                  <p className="text-xs text-muted-foreground">Отправить сообщение от бота</p>
                </div>
              </div>
              {showAnnounce ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
            </button>
            {showAnnounce && (
              <div className="px-4 pb-4 space-y-3 border-t border-border">
                <textarea
                  value={announcementText}
                  onChange={e => setAnnouncementText(e.target.value)}
                  placeholder="Текст объявления от DeepSeek AI..."
                  rows={3}
                  className="w-full mt-3 bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                />
                <button
                  onClick={handleAnnouncement}
                  disabled={announcementLoading || !announcementText.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  <Send size={14} />
                  {announcementLoading ? "Отправляем..." : "Отправить объявление"}
                </button>
              </div>
            )}
          </div>

          {/* Mass SPARK */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <Zap size={18} className="text-yellow-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Массовая выдача SPARK</p>
                  <p className="text-xs text-muted-foreground">Всем {users.length} пользователям сразу</p>
                </div>
              </div>
              <div className="flex gap-2 mb-2">
                {[100, 500, 1000].map(n => (
                  <button
                    key={n}
                    onClick={() => setMassAmount(String(n))}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${massAmount === String(n) ? "border-yellow-500 bg-yellow-500/10 text-yellow-400" : "border-border hover:border-yellow-500/40"}`}
                  >
                    +{n >= 1000 ? `${n/1000}k` : n}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={massAmount}
                  onChange={e => setMassAmount(e.target.value)}
                  placeholder="Сумма (отриц. = снять)"
                  className="flex-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-yellow-500 transition-colors"
                />
                <button
                  onClick={() => {
                    const n = Number(massAmount);
                    if (isNaN(n) || n === 0) return showToast("Введите корректную сумму", "err");
                    setShowMassConfirm(true);
                  }}
                  disabled={!massAmount}
                  className="px-4 py-2.5 rounded-xl bg-yellow-500 text-black font-bold text-sm hover:bg-yellow-400 transition-colors disabled:opacity-40"
                >
                  <Zap size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Top-up Requests */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => { setShowTopup(v => !v); if (!showTopup && topupRequests.length === 0) fetchTopupRequests(); }}
            className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Package size={18} className="text-green-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Заявки на пополнение</p>
                <p className="text-xs text-muted-foreground">
                  {topupRequests.filter(r => r.status === "pending").length > 0
                    ? `${topupRequests.filter(r => r.status === "pending").length} ожидают подтверждения`
                    : "Одобрить или отклонить заявки"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {topupRequests.filter(r => r.status === "pending").length > 0 && (
                <span className="w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-black flex items-center justify-center">
                  {topupRequests.filter(r => r.status === "pending").length}
                </span>
              )}
              {showTopup ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
            </div>
          </button>
          {showTopup && (
            <div className="border-t border-border">
              <div className="p-2 border-b border-border flex justify-end">
                <button onClick={fetchTopupRequests} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary transition-colors">
                  <RefreshCw size={12} className={topupLoading ? "animate-spin" : ""} /> Обновить
                </button>
              </div>
              {topupLoading ? (
                <div className="p-6 flex justify-center"><RefreshCw size={20} className="animate-spin text-muted-foreground" /></div>
              ) : topupRequests.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Заявок нет</div>
              ) : (
                <div className="divide-y divide-border max-h-96 overflow-y-auto">
                  {topupRequests.map(r => (
                    <div key={r.id} className="p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white" style={{ background: r.avatar_color }}>
                        {r.avatar_url ? <img src={r.avatar_url} className="w-full h-full rounded-full object-cover" /> : r.display_name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">@{r.username}</p>
                        <p className="text-xs text-muted-foreground">{r.package_label} — {r.amount} ⚡ за {r.price_label}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString("ru-RU")}</p>
                      </div>
                      {r.status === "pending" ? (
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleTopupApprove(r.id)}
                            disabled={topupActionLoading === r.id}
                            className="px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-500/20 transition-colors disabled:opacity-50"
                          >
                            {topupActionLoading === r.id ? "..." : "✓ Одобрить"}
                          </button>
                          <button
                            onClick={() => handleTopupDeny(r.id)}
                            disabled={topupActionLoading === r.id}
                            className="px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-bold hover:bg-destructive/20 transition-colors disabled:opacity-50"
                          >
                            {topupActionLoading === r.id ? "..." : "✗"}
                          </button>
                        </div>
                      ) : (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-xl shrink-0 ${r.status === "approved" ? "bg-green-500/10 text-green-400" : "bg-destructive/10 text-destructive"}`}>
                          {r.status === "approved" ? "Одобрено" : "Отклонено"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Age Verification Queue */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => { setShowV(v => !v); if (!showV && verifications.length === 0) fetchVerifications(); }}
            className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <ShieldCheck size={18} className="text-blue-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Верификация возраста</p>
                <p className="text-xs text-muted-foreground">
                  {verifications.filter(v => !v.age_verified).length > 0
                    ? `${verifications.filter(v => !v.age_verified).length} ожидают проверки`
                    : "Проверка документов пользователей"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {verifications.filter(v => !v.age_verified).length > 0 && (
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center">
                  {verifications.filter(v => !v.age_verified).length}
                </span>
              )}
              {showV ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
            </div>
          </button>
          {showV && (
            <div className="border-t border-border">
              <div className="p-2 border-b border-border flex justify-end">
                <button onClick={fetchVerifications} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary transition-colors">
                  <RefreshCw size={12} className={vLoading ? "animate-spin" : ""} /> Обновить
                </button>
              </div>
              {vLoading ? (
                <div className="p-6 flex justify-center"><RefreshCw size={20} className="animate-spin text-muted-foreground" /></div>
              ) : verifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Документов нет</div>
              ) : (
                <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                  {verifications.map(v => (
                    <div key={v.id} className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white overflow-hidden" style={{ backgroundColor: v.avatar_color }}>
                          {v.avatar_url ? <img src={v.avatar_url} className="w-full h-full object-cover" alt="" /> : v.display_name?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">@{v.username} · {v.display_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {v.birth_date ? `ДР: ${new Date(v.birth_date).toLocaleDateString("ru-RU")}` : ""}{v.age_group ? ` · ${v.age_group}` : ""}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border shrink-0 ${v.age_verified ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-blue-500/10 text-blue-400 border-blue-500/30"}`}>
                          {v.age_verified ? "✓ Одобрен" : "⏳ Ожидание"}
                        </span>
                      </div>
                      {v.id_document_url && (
                        <div>
                          <button
                            onClick={() => setVPreview(vPreview === v.id_document_url ? null : v.id_document_url)}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <Image size={12} /> {vPreview === v.id_document_url ? "Скрыть документ" : "Просмотреть документ"}
                          </button>
                          {vPreview === v.id_document_url && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-border">
                              <img src={v.id_document_url} alt="ID Document" className="w-full max-h-64 object-contain bg-black/10" />
                            </div>
                          )}
                        </div>
                      )}
                      {!v.age_verified && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAgeVerify(v.id, true)}
                            disabled={vActionId === v.id}
                            className="flex-1 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 size={13} />
                            {vActionId === v.id ? "..." : "Одобрить · выдать доступ"}
                          </button>
                          <button
                            onClick={() => handleAgeVerify(v.id, false)}
                            disabled={vActionId === v.id}
                            className="flex-1 py-2 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-bold hover:bg-destructive/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            <X size={13} />
                            {vActionId === v.id ? "..." : "Отклонить"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Moderation Appeals */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => { setShowAppeals(v => !v); if (!showAppeals && appeals.length === 0) fetchAppeals(); }}
            className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <ShieldAlert size={18} className="text-orange-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Апелляции к блокировкам</p>
                <p className="text-xs text-muted-foreground">
                  {appeals.filter(a => a.status === "pending").length > 0
                    ? `${appeals.filter(a => a.status === "pending").length} ожидают рассмотрения`
                    : "Рассмотреть запросы пользователей"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {appeals.filter(a => a.status === "pending").length > 0 && (
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center">
                  {appeals.filter(a => a.status === "pending").length}
                </span>
              )}
              {showAppeals ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
            </div>
          </button>

          {showAppeals && (
            <div className="border-t border-border">
              <div className="p-2 border-b border-border flex justify-end">
                <button onClick={fetchAppeals} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary transition-colors">
                  <RefreshCw size={12} className={appealsLoading ? "animate-spin" : ""} /> Обновить
                </button>
              </div>
              {appealsLoading ? (
                <div className="p-6 flex justify-center"><RefreshCw size={20} className="animate-spin text-muted-foreground" /></div>
              ) : appeals.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Апелляций нет</div>
              ) : (
                <div className="divide-y divide-border max-h-[520px] overflow-y-auto">
                  {appeals.map(appeal => (
                    <div key={appeal.id} className="p-4 space-y-3">
                      {/* User info */}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold overflow-hidden" style={{ backgroundColor: appeal.avatar_color }}>
                          {appeal.avatar_url ? <img src={appeal.avatar_url} className="w-full h-full rounded-full object-cover" alt="" /> : appeal.display_name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">@{appeal.username}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(appeal.created_at).toLocaleString("ru-RU")}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          appeal.status === 'pending' ? "bg-orange-500/10 text-orange-400 border border-orange-500/30" :
                          appeal.status === 'approved' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                          "bg-destructive/10 text-destructive border border-destructive/30"
                        }`}>
                          {appeal.status === 'pending' ? '⏳ На рассмотрении' : appeal.status === 'approved' ? '✓ Одобрено' : '✗ Отклонено'}
                        </span>
                      </div>

                      {/* Blocked post text */}
                      <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Заблокированный пост</p>
                        <p className="text-xs text-foreground line-clamp-3">{appeal.post_text}</p>
                        {appeal.moderation_reason && (
                          <p className="text-[10px] text-destructive/70 mt-1.5">
                            Причина ИИ: {appeal.moderation_reason}
                            {appeal.moderation_confidence != null && ` (${appeal.moderation_confidence}%)`}
                          </p>
                        )}
                      </div>

                      {/* Appeal text */}
                      <div className="bg-secondary/50 rounded-xl p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Обращение пользователя</p>
                        <p className="text-xs text-foreground">{appeal.appeal_text}</p>
                      </div>

                      {/* Action */}
                      {appeal.status === 'pending' ? (
                        <div className="space-y-2">
                          <input
                            value={appealResponse[appeal.id] || ""}
                            onChange={e => setAppealResponse(prev => ({ ...prev, [appeal.id]: e.target.value }))}
                            placeholder="Ответ администратора (необязательно)..."
                            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAppealApprove(appeal.id)}
                              disabled={appealActionLoading === appeal.id}
                              className="flex-1 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle2 size={13} />
                              {appealActionLoading === appeal.id ? "..." : "Одобрить · восстановить пост"}
                            </button>
                            <button
                              onClick={() => handleAppealReject(appeal.id)}
                              disabled={appealActionLoading === appeal.id}
                              className="flex-1 py-2 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-bold hover:bg-destructive/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                              <X size={13} />
                              {appealActionLoading === appeal.id ? "..." : "Отклонить"}
                            </button>
                          </div>
                        </div>
                      ) : appeal.admin_response ? (
                        <div className="text-xs text-muted-foreground italic px-1">Ответ: {appeal.admin_response}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Support Tickets + Bug Reports */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Support Tickets */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => { setShowTickets(v => !v); if (!showTickets && supportTickets.length === 0) fetchSupportTickets(); setActiveAdminTicket(null); }}
              className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <Inbox size={18} className="text-cyan-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Тикеты поддержки</p>
                  <p className="text-xs text-muted-foreground">
                    {supportTickets.filter(t => t.status === "open").length > 0
                      ? `${supportTickets.filter(t => t.status === "open").length} открытых`
                      : "Обращения пользователей"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {supportTickets.filter(t => t.status === "open").length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-cyan-500 text-white text-[10px] font-black flex items-center justify-center">
                    {supportTickets.filter(t => t.status === "open").length}
                  </span>
                )}
                {showTickets ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
              </div>
            </button>

            {showTickets && (
              <div className="border-t border-border">
                {activeAdminTicket ? (
                  <div className="p-4 flex flex-col gap-3">
                    <button onClick={() => setActiveAdminTicket(null)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors self-start">
                      <ChevronLeft size={14} /> Назад к списку
                    </button>
                    <div className="mb-1">
                      <p className="font-semibold text-sm">{activeAdminTicket.subject}</p>
                      <p className="text-[10px] text-muted-foreground">@{activeAdminTicket.username} · #{activeAdminTicket.id}</p>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {activeAdminTicket.messages?.map(msg => (
                        <div key={msg.id} className={`flex ${msg.is_admin ? "justify-start" : "justify-end"}`}>
                          <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs ${msg.is_admin ? "bg-secondary text-foreground rounded-tl-sm" : "bg-primary/20 text-foreground rounded-tr-sm"}`}>
                            {msg.is_admin && <p className="text-[10px] font-bold text-primary mb-0.5">Поддержка</p>}
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            <p className="text-[9px] text-muted-foreground mt-1">{new Date(msg.created_at).toLocaleString("ru-RU", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {activeAdminTicket.status !== 'closed' && (
                      <div className="space-y-2">
                        <textarea
                          value={ticketReplyText}
                          onChange={e => setTicketReplyText(e.target.value)}
                          placeholder="Ответ пользователю..."
                          rows={3}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleTicketReply(false)}
                            disabled={ticketReplying || !ticketReplyText.trim()}
                            className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            <SendIcon size={12} /> {ticketReplying ? "..." : "Ответить"}
                          </button>
                          <button
                            onClick={() => handleTicketReply(true)}
                            disabled={ticketReplying || !ticketReplyText.trim()}
                            className="flex-1 py-2 rounded-xl bg-secondary border border-border text-xs font-bold hover:bg-secondary/80 transition-colors disabled:opacity-50"
                          >
                            {ticketReplying ? "..." : "Ответить и закрыть"}
                          </button>
                        </div>
                      </div>
                    )}
                    {activeAdminTicket.status === 'closed' && (
                      <p className="text-center text-xs text-muted-foreground">Тикет закрыт</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="p-2 border-b border-border flex justify-end">
                      <button onClick={fetchSupportTickets} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary transition-colors">
                        <RefreshCw size={12} className={ticketsLoading ? "animate-spin" : ""} /> Обновить
                      </button>
                    </div>
                    {ticketsLoading ? (
                      <div className="p-6 flex justify-center"><RefreshCw size={20} className="animate-spin text-muted-foreground" /></div>
                    ) : supportTickets.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">Тикетов нет</div>
                    ) : (
                      <div className="divide-y divide-border max-h-80 overflow-y-auto">
                        {supportTickets.map(t => (
                          <button key={t.id} onClick={() => openAdminTicket(t.id)} className="w-full p-3 flex gap-3 text-left hover:bg-secondary/30 transition-colors group">
                            <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold overflow-hidden" style={{ backgroundColor: t.avatar_color }}>
                              {t.avatar_url ? <img src={t.avatar_url} className="w-full h-full rounded-full object-cover" alt="" /> : t.display_name[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <p className="text-xs font-semibold truncate">{t.subject}</p>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                                  t.status === 'open' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                                  t.status === 'answered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                  t.status === 'closed' ? 'bg-muted/50 text-muted-foreground border-border' :
                                  'bg-orange-500/10 text-orange-400 border-orange-500/30'
                                }`}>
                                  {t.status === 'open' ? 'Открыт' : t.status === 'answered' ? 'Отвечен' : t.status === 'closed' ? 'Закрыт' : 'Ожидает'}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">@{t.username} · {t.last_message}</p>
                              <p className="text-[9px] text-muted-foreground">{Number(t.message_count)} сообщ. · {new Date(t.updated_at).toLocaleDateString("ru-RU")}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Bug Reports */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => { setShowBugs(v => !v); if (!showBugs && bugs.length === 0) fetchBugs(); }}
              className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Bug size={18} className="text-red-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Репорты багов</p>
                  <p className="text-xs text-muted-foreground">
                    {bugs.filter(b => b.status === "new").length > 0
                      ? `${bugs.filter(b => b.status === "new").length} новых`
                      : "Сообщения об ошибках"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {bugs.filter(b => b.status === "new").length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                    {bugs.filter(b => b.status === "new").length}
                  </span>
                )}
                {showBugs ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
              </div>
            </button>

            {showBugs && (
              <div className="border-t border-border">
                <div className="p-2 border-b border-border flex justify-end">
                  <button onClick={fetchBugs} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary transition-colors">
                    <RefreshCw size={12} className={bugsLoading ? "animate-spin" : ""} /> Обновить
                  </button>
                </div>
                {bugsLoading ? (
                  <div className="p-6 flex justify-center"><RefreshCw size={20} className="animate-spin text-muted-foreground" /></div>
                ) : bugs.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Репортов нет</div>
                ) : (
                  <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
                    {bugs.map(bug => (
                      <div key={bug.id} className="p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold overflow-hidden" style={{ backgroundColor: bug.avatar_color }}>
                            {bug.avatar_url ? <img src={bug.avatar_url} className="w-full h-full rounded-full object-cover" alt="" /> : bug.display_name[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-semibold truncate">{bug.title}</p>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                                bug.status === 'new' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                                bug.status === 'in_progress' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                                bug.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                'bg-muted/50 text-muted-foreground border-border'
                              }`}>
                                {bug.status === 'new' ? 'Новый' : bug.status === 'acknowledged' ? 'Принят' : bug.status === 'in_progress' ? 'В работе' : bug.status === 'resolved' ? 'Решён' : 'Закрыт'}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">@{bug.username} · #{bug.id} · {new Date(bug.created_at).toLocaleDateString("ru-RU")}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 pl-9">{bug.description}</p>
                        {bug.admin_note && (
                          <div className="pl-9 text-[10px] text-primary italic">Ответ: {bug.admin_note}</div>
                        )}
                        {bug.status !== 'resolved' && bug.status !== 'closed' && (
                          <div className="pl-9 space-y-1.5">
                            <div className="flex gap-1.5">
                              {(['acknowledged', 'in_progress', 'resolved'] as const).map(s => (
                                <button
                                  key={s}
                                  onClick={() => setBugStatusEdit(prev => ({ ...prev, [bug.id]: s }))}
                                  className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${bugStatusEdit[bug.id] === s ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}
                                >
                                  {s === 'acknowledged' ? 'Принят' : s === 'in_progress' ? 'В работе' : 'Решён'}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-1.5">
                              <input
                                value={bugNote[bug.id] || ""}
                                onChange={e => setBugNote(prev => ({ ...prev, [bug.id]: e.target.value }))}
                                placeholder="Ответ пользователю (необязательно)..."
                                className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:border-primary transition-colors"
                              />
                              <button
                                onClick={() => handleBugUpdate(bug.id)}
                                disabled={bugActionId === bug.id || (!bugStatusEdit[bug.id] && !bugNote[bug.id])}
                                className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                              >
                                {bugActionId === bug.id ? "..." : "Сохранить"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Posts Moderation + Leaderboard */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Posts moderation */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => { setShowPosts(v => !v); if (!showPosts && posts.length === 0) fetchPosts(); }}
              className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <FileText size={18} className="text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Модерация постов</p>
                  <p className="text-xs text-muted-foreground">Просмотр и удаление постов ленты</p>
                </div>
              </div>
              {showPosts ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
            </button>
            {showPosts && (
              <div className="border-t border-border max-h-80 overflow-y-auto">
                <div className="p-2 border-b border-border flex justify-end">
                  <button onClick={fetchPosts} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary transition-colors">
                    <RefreshCw size={12} className={postsLoading ? "animate-spin" : ""} /> Обновить
                  </button>
                </div>
                {postsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-3 border-b border-border flex gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-secondary shrink-0" />
                      <div className="flex-1 space-y-2"><div className="h-3 bg-secondary rounded w-3/4" /><div className="h-2 bg-secondary rounded w-1/2" /></div>
                    </div>
                  ))
                ) : posts.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">Постов нет</p>
                ) : posts.map(post => (
                  <div key={post.id} className="p-3 border-b border-border flex gap-3 group hover:bg-secondary/30 transition-colors">
                    <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold overflow-hidden" style={{ backgroundColor: post.avatar_color }}>
                      {post.avatar_url ? <img src={post.avatar_url} alt="" className="w-full h-full object-cover" /> : post.display_name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">@{post.username}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{post.text}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        {post.image_url && <span className="flex items-center gap-0.5"><Image size={9} /> фото</span>}
                        <span>❤️ {post.likes_count}</span>
                        <span>💬 {post.comments_count}</span>
                        <span>{new Date(post.created_at).toLocaleDateString("ru-RU")}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      disabled={deletingPostId === post.id}
                      className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => { setShowLeaderboard(v => !v); if (!showLeaderboard && !leaderboard) fetchLeaderboard(); }}
              className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Trophy size={18} className="text-amber-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Лидерборд</p>
                  <p className="text-xs text-muted-foreground">Топ пользователей по категориям</p>
                </div>
              </div>
              {showLeaderboard ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
            </button>
            {showLeaderboard && (
              <div className="border-t border-border p-4">
                <div className="flex gap-1 mb-3 bg-secondary/50 rounded-xl p-1">
                  {([["byBalance", "⚡ SPARK"], ["byMessages", "💬 Сообщ."], ["byGifts", "🎁 Подарки"]] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setLeaderTab(key)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${leaderTab === key ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {leaderboardLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 py-2 animate-pulse">
                      <div className="w-5 h-5 bg-secondary rounded" />
                      <div className="w-7 h-7 bg-secondary rounded-full" />
                      <div className="flex-1 h-3 bg-secondary rounded" />
                    </div>
                  ))
                ) : leaderboard ? (
                  <div className="space-y-2">
                    {(leaderboard[leaderTab] || []).map((entry, idx) => (
                      <div key={entry.id} className="flex items-center gap-2.5">
                        <span className={`w-5 text-center text-xs font-black ${idx === 0 ? "text-amber-400" : idx === 1 ? "text-gray-400" : idx === 2 ? "text-orange-600" : "text-muted-foreground"}`}>
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                        </span>
                        <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden" style={{ backgroundColor: entry.avatar_color }}>
                          {entry.avatar_url ? <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" /> : entry.display_name[0]?.toUpperCase()}
                        </div>
                        <p className="flex-1 text-sm font-medium truncate">{entry.display_name}</p>
                        <p className="text-sm font-black text-primary">{Number(entry.score).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Users + Details */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* User list */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between gap-2">
              <h2 className="font-bold text-foreground whitespace-nowrap">Пользователи</h2>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="text-sm bg-background border border-border rounded-xl px-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary w-full max-w-[160px] transition-colors"
              />
            </div>
            <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-secondary" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-secondary rounded w-24" />
                      <div className="h-2 bg-secondary rounded w-16" />
                    </div>
                  </div>
                ))
              ) : filtered.map(user => (
                <motion.button
                  key={user.id}
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                  onClick={() => selectUser(user)}
                  className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${selectedUser?.id === user.id ? "bg-primary/10 border-l-2 border-primary" : ""}`}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden"
                    style={{ backgroundColor: user.avatar_color }}
                  >
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                      : user.display_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-sm truncate">{user.display_name}</p>
                      {user.is_verified && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0">
                          <circle cx="12" cy="12" r="12" fill="#00BCD4"/>
                          <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {user.has_prime && <Star size={10} className="text-amber-400 fill-amber-400 shrink-0" />}
                      {user.is_admin && <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">ADM</span>}
                      {user.is_bot && <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">BOT</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                  <div className="flex items-center gap-1 text-primary text-sm font-bold shrink-0">
                    <Zap size={12} /> {Number(user.balance).toLocaleString()}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* User detail panel */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {selectedUser ? (
              <motion.div key={selectedUser.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {/* User header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0 overflow-hidden"
                      style={{ backgroundColor: selectedUser.avatar_color }}
                    >
                      {selectedUser.avatar_url
                        ? <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                        : selectedUser.display_name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-foreground">{selectedUser.display_name}</p>
                        {selectedUser.is_verified && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="12" fill="#00BCD4"/>
                            <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {selectedUser.has_prime && <Star size={13} className="text-amber-400 fill-amber-400" />}
                      </div>
                      <p className="text-sm text-muted-foreground">@{selectedUser.username} · ID {selectedUser.id}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Баланс</p>
                      <p className="text-xl font-black text-primary flex items-center gap-1">
                        <Zap size={16} /> {Number(selectedUser.balance).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Регистрация: {new Date(selectedUser.created_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border overflow-x-auto">
                  {(["balance", "password", "actions", "stats"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap px-2 ${activeTab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {t === "balance" ? "⚡ Баланс" : t === "password" ? "🔐 Пароль" : t === "actions" ? "⚙️ Действия" : "📊 Статистика"}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  {/* Balance tab */}
                  {activeTab === "balance" && (
                    <>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Быстрая выдача ⚡ SPARK</p>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {[50, 100, 500, 1000, 5000, 10000].map(amt => (
                          <motion.button
                            key={amt}
                            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                            onClick={() => handleGive(amt)}
                            disabled={giveLoading}
                            className="flex items-center justify-center gap-1 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-sm hover:bg-primary/20 transition-all disabled:opacity-50"
                          >
                            <Plus size={12} /> {amt >= 1000 ? `${amt / 1000}k` : amt}
                          </motion.button>
                        ))}
                      </div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Снять SPARK</p>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {[50, 100, 500].map(amt => (
                          <motion.button
                            key={amt}
                            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                            onClick={() => handleGive(-amt)}
                            disabled={giveLoading}
                            className="flex items-center justify-center gap-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/20 transition-all disabled:opacity-50"
                          >
                            <Minus size={12} /> {amt}
                          </motion.button>
                        ))}
                      </div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Произвольная сумма</p>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={giveAmount}
                          onChange={e => setGiveAmount(e.target.value)}
                          placeholder="Сумма (отриц. — списать)"
                          className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                          onKeyDown={e => e.key === "Enter" && handleCustomAmount()}
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={handleCustomAmount}
                          disabled={giveLoading || !giveAmount}
                          className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Send size={14} />
                          {giveLoading ? "..." : "Выдать"}
                        </motion.button>
                      </div>
                    </>
                  )}

                  {/* Password tab */}
                  {activeTab === "password" && (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">Установить новый пароль для @{selectedUser.username}</p>
                      <input
                        type="text"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Новый пароль (мин. 6 символов)"
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                      />
                      <button
                        onClick={handleResetPassword}
                        disabled={pwLoading || !newPassword.trim()}
                        className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Key size={16} />
                        {pwLoading ? "Сохраняем..." : "Сбросить пароль"}
                      </button>
                    </div>
                  )}

                  {/* Actions tab */}
                  {activeTab === "actions" && (
                    <div className="space-y-3">
                      {/* Edit profile */}
                      <button
                        onClick={() => setShowEditProfile(v => !v)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-border text-muted-foreground hover:border-primary/30 hover:text-primary transition-all text-sm font-medium"
                      >
                        <Edit3 size={18} />
                        Редактировать профиль
                        {showEditProfile ? <ChevronDown size={15} className="ml-auto" /> : <ChevronRight size={15} className="ml-auto" />}
                      </button>
                      {showEditProfile && (
                        <div className="space-y-2 p-3 bg-background/50 rounded-xl border border-border">
                          <input
                            value={editDisplayName}
                            onChange={e => setEditDisplayName(e.target.value)}
                            placeholder="Имя"
                            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                          />
                          <input
                            value={editBio}
                            onChange={e => setEditBio(e.target.value)}
                            placeholder="Биография (опционально)"
                            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                          />
                          <button
                            onClick={handleEditProfile}
                            disabled={editLoading || !editDisplayName.trim()}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            <Save size={14} />
                            {editLoading ? "..." : "Сохранить"}
                          </button>
                        </div>
                      )}

                      {/* Verify */}
                      <button
                        onClick={() => handleToggleVerified(selectedUser)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-sm font-medium ${
                          selectedUser.is_verified
                            ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                            : "bg-card border-border text-muted-foreground hover:border-cyan-500/30 hover:text-cyan-400"
                        }`}
                      >
                        <BadgeCheck size={18} />
                        {selectedUser.is_verified ? "Снять верификацию" : "Выдать верификацию ✓"}
                      </button>

                      {/* Prime */}
                      <div className={`p-3 rounded-xl border transition-all ${selectedUser.has_prime ? "bg-amber-500/10 border-amber-500/30" : "border-border"}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <Crown size={18} className={selectedUser.has_prime ? "text-amber-400" : "text-muted-foreground"} />
                          <span className={`text-sm font-medium ${selectedUser.has_prime ? "text-amber-400" : "text-muted-foreground"}`}>
                            {selectedUser.has_prime ? "Prime активна" : "Prime не активна"}
                          </span>
                        </div>
                        {!selectedUser.has_prime ? (
                          <div className="flex gap-2">
                            <select
                              value={primeMonths}
                              onChange={e => setPrimeMonths(e.target.value)}
                              className="flex-1 bg-background border border-border rounded-xl px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-amber-500"
                            >
                              {[1, 3, 6, 12].map(m => <option key={m} value={m}>{m} мес.</option>)}
                            </select>
                            <button
                              onClick={() => handleTogglePrime(true)}
                              disabled={primeLoading}
                              className="flex-1 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              <Crown size={13} /> Выдать Prime
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleTogglePrime(false)}
                            disabled={primeLoading}
                            className="w-full py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                          >
                            {primeLoading ? "..." : "Отозвать Prime"}
                          </button>
                        )}
                      </div>

                      {/* Admin rights */}
                      {!selectedUser.is_admin && (
                        <button
                          onClick={() => handleToggleAdmin(selectedUser)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-sm font-medium ${
                            selectedUser.is_admin
                              ? "bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
                              : "bg-card border-border text-muted-foreground hover:border-purple-500/30 hover:text-purple-400"
                          }`}
                        >
                          {selectedUser.is_admin ? <ShieldOff size={18} /> : <ShieldCheck size={18} />}
                          {selectedUser.is_admin ? "Снять права администратора" : "Выдать права администратора"}
                        </button>
                      )}

                      {/* Ban / Unban */}
                      {!selectedUser.is_admin && (
                        <button
                          onClick={() => handleBanToggle(selectedUser)}
                          disabled={banLoading}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-sm font-medium ${
                            bannedIds.has(selectedUser.id)
                              ? "bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
                              : "bg-card border-border text-muted-foreground hover:border-orange-500/30 hover:text-orange-400"
                          }`}
                        >
                          <Ban size={18} />
                          {bannedIds.has(selectedUser.id) ? "Разблокировать пользователя" : "Заблокировать пользователя"}
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteConfirm(selectedUser)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all text-sm font-medium"
                      >
                        <Trash2 size={18} /> Удалить пользователя
                      </button>
                    </div>
                  )}

                  {/* Stats tab */}
                  {activeTab === "stats" && (
                    <div>
                      {userStatsLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-14 bg-secondary/50 rounded-xl animate-pulse" />
                          ))}
                        </div>
                      ) : userStats ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                              <MessageSquare size={20} className="text-blue-400 mx-auto mb-1" />
                              <p className="text-2xl font-black text-foreground">{userStats.messagesSent.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">Сообщений</p>
                            </div>
                            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-center">
                              <PhoneCall size={20} className="text-cyan-400 mx-auto mb-1" />
                              <p className="text-2xl font-black text-foreground">{userStats.callsTotal.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">Звонков</p>
                            </div>
                            <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-3 text-center">
                              <Gift size={20} className="text-pink-400 mx-auto mb-1" />
                              <p className="text-2xl font-black text-foreground">{userStats.giftsSent.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">Подарков отправлено</p>
                            </div>
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                              <Gift size={20} className="text-green-400 mx-auto mb-1" />
                              <p className="text-2xl font-black text-foreground">{userStats.giftsReceived.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">Подарков получено</p>
                            </div>
                          </div>
                          <div className="bg-muted/30 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
                            <div className="flex justify-between">
                              <span>Баланс</span>
                              <span className="font-bold text-primary">{Number(selectedUser.balance).toLocaleString()} ⚡</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Prime</span>
                              <span className={selectedUser.has_prime ? "text-amber-400 font-bold" : ""}>{selectedUser.has_prime ? "✓ Активна" : "Нет"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Верификация</span>
                              <span className={selectedUser.is_verified ? "text-cyan-400 font-bold" : ""}>{selectedUser.is_verified ? "✓ Верифицирован" : "Нет"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Роль</span>
                              <span>{selectedUser.is_admin ? "Администратор" : selectedUser.is_bot ? "Бот" : "Пользователь"}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground text-sm py-8">Не удалось загрузить статистику</p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-16 text-muted-foreground p-5">
                <BarChart3 size={48} className="mb-3 opacity-20" />
                <p className="font-medium">Выберите пользователя</p>
                <p className="text-sm opacity-60 mt-1">для управления аккаунтом</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
