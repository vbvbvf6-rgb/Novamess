import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Diamond, Zap, Users, TrendingUp, Send, CheckCircle, AlertTriangle, RefreshCw,
  Plus, Trash2, Key, BadgeCheck, X, ShieldCheck, ShieldOff, MessageSquare,
  PhoneCall, Gift, Crown, Megaphone, BarChart3, Activity, Star,
  Edit3, Save, ChevronDown, ChevronRight, ChevronLeft, Minus, Ban, FileText, Trophy, Image, Package,
  ShieldAlert, Clock, CheckCircle2, Bug, Inbox, Send as SendIcon, Download,
  Wrench, Mail, ToggleLeft, ToggleRight, Timer
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

interface GiftItem {
  id: number;
  name: string;
  emoji: string;
  rarity: string;
  stars: number;
  price: number;
  animationType: string;
  primeOnly: boolean;
}

const ADMIN_GIFT_IMAGE_MAP: Record<string, string> = {
  "Сердечко":       "/gifts/heart.png",
  "Звёздочка":      "/gifts/star-42.png",
  "Цветок сакуры":  "/gifts/sakura.png",
  "Пончик":         "/gifts/donut.png",
  "Котёнок":        "/gifts/kitten.png",
  "Воздушный шар":  "/gifts/balloon.png",
  "Четырёхлистник": "/gifts/clover.png",
  "Пицца":          "/gifts/pizza.png",
  "Торт":           "/gifts/birthday-cake.png",
  "Луна":           "/gifts/moon.png",
  "Корона":         "/gifts/crown.png",
  "Корона Prime":   "/gifts/crown.png",
  "Красная роза":   "/gifts/rose-in-glass.png",
  "Бриллиант":      "/gifts/diamond-heart.png",
  "Волшебство":     "/gifts/magic-crystal.png",
  "Кристалл":       "/gifts/magic-crystal.png",
  "Пульс":          "/gifts/confetti-box.png",
};

function AdminGiftThumb({ name, emoji, size = 40 }: { name: string; emoji: string; size?: number }) {
  const src = ADMIN_GIFT_IMAGE_MAP[name];
  if (src) return <img src={src} alt={name} style={{ width: size, height: size, objectFit: "contain" }} draggable={false} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />;
  return <span style={{ fontSize: size * 0.78, lineHeight: 1 }}>{emoji}</span>;
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
}

function getHeader(): Record<string, string> {
  const token = sessionStorage.getItem("pulse-token");
  return token ? { "Authorization": `Bearer ${token}` } : {};
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
  const userId = Number(sessionStorage.getItem("pulse-user-id") || "0");
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
  const [activeTab, setActiveTab] = useState<"balance" | "password" | "actions" | "stats" | "gifts">("balance");
  const [newPassword, setNewPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Mass SPARK
  const [massAmount, setMassAmount] = useState("");
  const [massLoading, setMassLoading] = useState(false);
  const [showMassConfirm, setShowMassConfirm] = useState(false);


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
  const [leaderTab, setLeaderTab] = useState<"byBalance" | "byMessages">("byBalance");

  // Gifts
  const [giftItems, setGiftItems] = useState<GiftItem[]>([]);
  const [giftItemsLoading, setGiftItemsLoading] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState<number | null>(null);
  const [giftMessage, setGiftMessage] = useState("");
  const [giftAnonymous, setGiftAnonymous] = useState(false);
  const [giftLoading, setGiftLoading] = useState(false);

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

  // Banwords
  interface Banword { id: number; word: string; created_at: string; }
  interface ScanFlagged {
    id: number; text: string; chatId: number; senderId: number;
    senderName: string; senderUsername: string; avatarColor: string; avatarUrl: string | null;
    createdAt: string; reason: string; categories: string[];
  }
  const [banwords, setBanwordsState] = useState<Banword[]>([]);
  const [banwordsLoading, setBanwordsLoading] = useState(false);
  const [showBanwords, setShowBanwords] = useState(false);
  const [newBanword, setNewBanword] = useState("");
  const [addingBanword, setAddingBanword] = useState(false);
  const [deletingBanwordId, setDeletingBanwordId] = useState<number | null>(null);
  const [importingFromWeb, setImportingFromWeb] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<{ scanned: number; flagged: ScanFlagged[] } | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [deletingScannedId, setDeletingScannedId] = useState<number | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [addingBulk, setAddingBulk] = useState(false);

  // Support Bugs
  interface AdminBugReport {
    id: number; title: string; description: string; category: string; status: string;
    platform_info: string | null; admin_note: string | null; created_at: string;
    screenshot_url: string | null;
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
  const [expandedBugs, setExpandedBugs] = useState<Set<number>>(new Set());
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

  // Chat Management
  interface AdminChat {
    id: number; type: string; name: string; avatar_color: string; avatar_url: string | null;
    created_at: string; member_count: number; message_count: number;
  }
  const [adminChats, setAdminChats] = useState<AdminChat[]>([]);
  const [adminChatsLoading, setAdminChatsLoading] = useState(false);
  const [showAdminChats, setShowAdminChats] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<number | null>(null);
  const [chatSearchQ, setChatSearchQ] = useState("");

  const fetchAdminChats = async () => {
    setAdminChatsLoading(true);
    try {
      const res = await fetch("/api/admin/chats", { headers: getHeader() });
      if (res.ok) setAdminChats(await res.json());
    } catch {}
    setAdminChatsLoading(false);
  };

  const handleDeleteChat = async (chatId: number) => {
    setDeletingChatId(chatId);
    try {
      const res = await fetch(`/api/admin/chats/${chatId}`, { method: "DELETE", headers: getHeader() });
      if (res.ok) {
        setAdminChats(prev => prev.filter(c => c.id !== chatId));
        showToast("🗑️ Чат удалён", "ok");
      } else { showToast("Ошибка удаления", "err"); }
    } catch { showToast("Ошибка соединения", "err"); }
    setDeletingChatId(null);
  };

  // Gift Catalog Management
  interface CatalogGift {
    id: number; name: string; emoji: string; rarity: string; animation_type: string;
    stars: number; price: number; prime_only: boolean; times_sent: number;
  }
  const [giftCatalog, setGiftCatalog] = useState<CatalogGift[]>([]);
  const [giftCatalogLoading, setGiftCatalogLoading] = useState(false);
  const [showGiftCatalog, setShowGiftCatalog] = useState(false);
  const [editingCatalogGiftId, setEditingCatalogGiftId] = useState<number | null>(null);
  const [catalogEdit, setCatalogEdit] = useState<Record<number, Partial<CatalogGift>>>({});
  const [catalogSavingId, setCatalogSavingId] = useState<number | null>(null);

  const fetchGiftCatalog = async () => {
    setGiftCatalogLoading(true);
    try {
      const res = await fetch("/api/admin/gift-catalog", { headers: getHeader() });
      if (res.ok) setGiftCatalog(await res.json());
    } catch {}
    setGiftCatalogLoading(false);
  };

  const handleSaveCatalogGift = async (giftId: number) => {
    const edits = catalogEdit[giftId];
    if (!edits) return;
    setCatalogSavingId(giftId);
    try {
      const res = await fetch(`/api/admin/gift-items/${giftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({
          price: edits.price !== undefined ? Number(edits.price) : undefined,
          rarity: edits.rarity,
          stars: edits.stars !== undefined ? Number(edits.stars) : undefined,
          primeOnly: edits.prime_only,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); setCatalogSavingId(null); return; }
      showToast("✅ Подарок обновлён", "ok");
      setGiftCatalog(prev => prev.map(g => g.id === giftId ? { ...g, ...edits } : g));
      setEditingCatalogGiftId(null);
      setCatalogEdit(prev => { const n = { ...prev }; delete n[giftId]; return n; });
    } catch { showToast("Ошибка соединения", "err"); }
    setCatalogSavingId(null);
  };

  const fetchAppeals = async () => {
    setAppealsLoading(true);
    try {
      const res = await fetch("/api/admin/moderation/appeals", { headers: getHeader() });
      if (res.ok) setAppeals(await res.json());
    } catch {}
    setAppealsLoading(false);
  };

  const handleAppealAction = async (appealId: number, action: "approve" | "reject") => {
    setAppealActionLoading(appealId);
    try {
      const res = await fetch(`/api/admin/moderation/appeals/${appealId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ adminResponse: appealResponse[appealId]?.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); }
      else {
        showToast(action === "approve" ? "✅ Апелляция одобрена, пост восстановлен" : "❌ Апелляция отклонена", action === "approve" ? "ok" : "err");
        setAppeals(prev => prev.map(a => a.id === appealId ? { ...a, status: action === "approve" ? "approved" : "rejected", admin_response: appealResponse[appealId] || null } : a));
        setAppealResponse(prev => { const n = { ...prev }; delete n[appealId]; return n; });
      }
    } catch { showToast("Ошибка соединения", "err"); }
    setAppealActionLoading(null);
  };

  // Platform Events
  interface PlatformEvent {
    id: number; title: string; description: string | null; imageUrl: string | null;
    bannerColor: string; startAt: string | null; endAt: string | null; isActive: boolean; createdAt: string;
  }
  const [platformEvents, setPlatformEvents] = useState<PlatformEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showUserReports, setShowUserReports] = useState(false);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [editingEvent, setEditingEvent] = useState<PlatformEvent | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventImage, setEventImage] = useState("");
  const [eventColor, setEventColor] = useState("#7c3aed");
  const [eventStartAt, setEventStartAt] = useState("");
  const [eventEndAt, setEventEndAt] = useState("");
  const [eventActive, setEventActive] = useState(true);
  const [eventEmoji, setEventEmoji] = useState("🎉");
  const [eventSaving, setEventSaving] = useState(false);
  const [eventKind, setEventKind] = useState<"event" | "giveaway">("event");
  const [eventCost, setEventCost] = useState(0);
  const [eventConditions, setEventConditions] = useState("");
  // Announcement
  const [showAnnouncementPanel, setShowAnnouncementPanel] = useState(false);
  const [announcementMsg, setAnnouncementMsg] = useState("");
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<string | null>(null);

  // Maintenance mode
  interface MaintenanceSettings { active: boolean; message: string; fixes: string[]; endsAt: string | null; }
  const [showMaintenancePanel, setShowMaintenancePanel] = useState(false);
  const [maintenance, setMaintenance] = useState<MaintenanceSettings>({ active: false, message: "", fixes: [], endsAt: null });
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintFixInput, setMaintFixInput] = useState("");
  const [mailTestResult, setMailTestResult] = useState<any>(null);
  const [mailTestLoading, setMailTestLoading] = useState(false);
  const [mailTestTo, setMailTestTo] = useState("");
  const fetchCurrentAnnouncement = async () => {
    try {
      const r = await fetch("/api/announcement", { headers: getHeader() });
      const d = await r.json();
      setCurrentAnnouncement(d?.message || null);
      if (d?.message) setAnnouncementMsg(d.message);
    } catch {}
  };

  const EVENT_TYPES = [
    { emoji: "🎉", label: "Праздник", color: "#f59e0b" },
    { emoji: "🏆", label: "Турнир", color: "#eab308" },
    { emoji: "🎁", label: "Раздача", color: "#8b5cf6" },
    { emoji: "⚡", label: "Буст", color: "#f97316" },
    { emoji: "🎮", label: "Игра", color: "#3b82f6" },
    { emoji: "🔥", label: "Хот", color: "#ef4444" },
    { emoji: "💎", label: "Prime", color: "#a855f7" },
    { emoji: "🌟", label: "Особое", color: "#06b6d4" },
    { emoji: "🎵", label: "Музыка", color: "#ec4899" },
    { emoji: "🚀", label: "Запуск", color: "#10b981" },
  ];

  const fetchPlatformEvents = async () => {
    setEventsLoading(true);
    try {
      const res = await fetch("/api/admin/platform-events", { headers: getHeader() });
      if (res.ok) setPlatformEvents(await res.json());
    } catch {}
    setEventsLoading(false);
  };

  const fetchUserReports = async () => {
    try {
      const res = await fetch("/api/admin/user-reports", { headers: getHeader() });
      if (res.ok) setUserReports(await res.json());
    } catch {}
  };

  const resolveUserReport = async (id: number, status: "reviewed" | "dismissed") => {
    try {
      await fetch(`/api/admin/user-reports/${id}`, {
        method: "PATCH",
        headers: { ...getHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setUserReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch {}
  };

  const openEventForm = (ev?: PlatformEvent) => {
    if (ev) {
      setEditingEvent(ev);
      const emojiMatch = ev.title.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u);
      const parsedEmoji = emojiMatch ? emojiMatch[0].trim() : "🎉";
      const cleanTitle = emojiMatch ? ev.title.slice(emojiMatch[0].length) : ev.title;
      setEventEmoji(parsedEmoji);
      setEventTitle(cleanTitle);
      setEventDesc(ev.description || "");
      setEventImage(ev.imageUrl || "");
      const matchedType = EVENT_TYPES.find(t => t.emoji === parsedEmoji);
      setEventColor(matchedType?.color || ev.bannerColor || "#7c3aed");
      setEventStartAt(ev.startAt ? ev.startAt.slice(0, 16) : "");
      setEventEndAt(ev.endAt ? ev.endAt.slice(0, 16) : "");
      setEventActive(ev.isActive);
      setEventKind((ev as any).eventType === "giveaway" ? "giveaway" : "event");
      setEventCost((ev as any).cost || 0);
      const conds = (ev as any).conditions;
      setEventConditions(conds ? (typeof conds === "string" ? conds : JSON.stringify(conds)) : "");
    } else {
      setEditingEvent(null);
      setEventEmoji("🎉"); setEventTitle(""); setEventDesc(""); setEventImage("");
      setEventColor("#f59e0b"); setEventStartAt(""); setEventEndAt(""); setEventActive(true);
      setEventKind("event"); setEventCost(0); setEventConditions("");
    }
    setShowEventForm(true);
  };

  const handleSaveEvent = async () => {
    if (!eventTitle.trim()) return showToast("Введите заголовок", "err");
    setEventSaving(true);
    const fullTitle = `${eventEmoji} ${eventTitle.trim()}`;
    try {
      const condParsed = eventConditions.trim()
        ? eventConditions.trim().split("\n").map(s => s.trim()).filter(Boolean)
        : null;
      const payload = {
        title: fullTitle, description: eventDesc.trim() || null,
        imageUrl: eventImage.trim() || null, bannerColor: eventColor,
        startAt: eventStartAt || null, endAt: eventEndAt || null, isActive: eventActive,
        eventType: eventKind,
        cost: eventKind === "giveaway" ? eventCost : 0,
        conditions: condParsed ? JSON.stringify(condParsed) : null,
      };
      const url = editingEvent ? `/api/admin/platform-events/${editingEvent.id}` : "/api/admin/platform-events";
      const method = editingEvent ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", ...getHeader() }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); setEventSaving(false); return; }
      showToast(editingEvent ? "✅ Событие обновлено" : "✅ Событие создано", "ok");
      setShowEventForm(false);
      fetchPlatformEvents();
    } catch { showToast("Ошибка соединения", "err"); }
    setEventSaving(false);
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm("Удалить событие?")) return;
    try {
      await fetch(`/api/admin/platform-events/${id}`, { method: "DELETE", headers: getHeader() });
      showToast("🗑️ Событие удалено", "ok");
      setPlatformEvents(prev => prev.filter(e => e.id !== id));
    } catch { showToast("Ошибка", "err"); }
  };

  const handleToggleEventActive = async (ev: PlatformEvent) => {
    try {
      const res = await fetch(`/api/admin/platform-events/${ev.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ isActive: !ev.isActive }),
      });
      if (res.ok) {
        setPlatformEvents(prev => prev.map(e => e.id === ev.id ? { ...e, isActive: !e.isActive } : e));
        showToast(!ev.isActive ? "✅ Событие активировано" : "⏸ Событие скрыто", "ok");
      }
    } catch { showToast("Ошибка", "err"); }
  };

  // Broadcast Push
  const [showBroadcastPush, setShowBroadcastPush] = useState(false);
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("");
  const [pushLoading, setPushLoading] = useState(false);

  const handleBroadcastPush = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) return showToast("Заполните заголовок и текст", "err");
    setPushLoading(true);
    try {
      const res = await fetch("/api/admin/broadcast-push", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ title: pushTitle.trim(), body: pushBody.trim(), url: pushUrl.trim() || "/" }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); setPushLoading(false); return; }
      showToast(`📲 Push отправлен ${data.sent} подписчикам`, "ok");
      setPushTitle(""); setPushBody(""); setPushUrl("");
      setShowBroadcastPush(false);
    } catch { showToast("Ошибка соединения", "err"); }
    setPushLoading(false);
  };

  // Detailed Stats
  interface DetailedStats {
    newUsersToday: number; newUsersThisWeek: number;
    messagesToday: number; messagesThisWeek: number; giftsToday: number;
    topGifts: { name: string; emoji: string; rarity: string; cnt: number }[];
    bannedUsers: number;
  }
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null);
  const [detailedStatsLoading, setDetailedStatsLoading] = useState(false);
  const [showDetailedStats, setShowDetailedStats] = useState(false);

  const fetchDetailedStats = async () => {
    setDetailedStatsLoading(true);
    try {
      const res = await fetch("/api/admin/stats/detailed", { headers: getHeader() });
      if (res.ok) setDetailedStats(await res.json());
    } catch {}
    setDetailedStatsLoading(false);
  };

  const fetchGiftItems = async () => {
    setGiftItemsLoading(true);
    try {
      const res = await fetch("/api/gifts", { headers: getHeader() });
      if (res.ok) setGiftItems(await res.json());
    } catch {}
    setGiftItemsLoading(false);
  };

  const handleGiveGift = async () => {
    if (!selectedUser || !selectedGiftId) return;
    setGiftLoading(true);
    try {
      const res = await fetch("/api/admin/give-gift", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({
          userId: selectedUser.id,
          giftItemId: selectedGiftId,
          message: giftMessage.trim() || undefined,
          anonymous: giftAnonymous,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); setGiftLoading(false); return; }
      showToast(data.message, "ok");
      setSelectedGiftId(null);
      setGiftMessage("");
      setGiftAnonymous(false);
      if (stats) setStats(prev => prev ? { ...prev, totalGifts: prev.totalGifts + 1 } : null);
    } catch { showToast("Ошибка соединения", "err"); }
    setGiftLoading(false);
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
      showToast(`✅ Одобрено +${data.amount} 💎 пользователю`, "ok");
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

  // ── Maintenance handlers ──────────────────────────────────────────────────
  const fetchMaintenance = async () => {
    try {
      const res = await fetch("/api/admin/maintenance", { headers: getHeader() });
      if (res.ok) setMaintenance(await res.json());
    } catch {}
  };

  const saveMaintenance = async (data: { active: boolean; message: string; fixes: string[]; endsAt: string | null }) => {
    setMaintenanceLoading(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify(data),
      });
      const r = await res.json();
      if (!res.ok) { showToast(r.error || "Ошибка", "err"); }
      else {
        setMaintenance(r.data);
        showToast(r.data.active ? "🔧 Техперерыв включён" : "✅ Техперерыв отключён", r.data.active ? "err" : "ok");
      }
    } catch { showToast("Ошибка соединения", "err"); }
    setMaintenanceLoading(false);
  };

  const addMaintFix = () => {
    const v = maintFixInput.trim();
    if (!v) return;
    setMaintenance(prev => ({ ...prev, fixes: [...prev.fixes, v] }));
    setMaintFixInput("");
  };

  const handleMailTest = async () => {
    setMailTestLoading(true);
    setMailTestResult(null);
    try {
      const url = mailTestTo.trim()
        ? `/api/admin/mail-test?to=${encodeURIComponent(mailTestTo.trim())}`
        : "/api/admin/mail-test";
      const res = await fetch(url, { headers: getHeader() });
      setMailTestResult(await res.json());
    } catch (e: any) {
      setMailTestResult({ ok: false, error: e?.message || "Ошибка соединения" });
    }
    setMailTestLoading(false);
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

  useEffect(() => { fetchData(); fetchMaintenance(); }, [fetchData]);

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
    setSelectedGiftId(null);
    setGiftMessage("");
    setGiftAnonymous(false);
  };

  useEffect(() => {
    if (activeTab === "stats" && selectedUser) {
      fetchUserStats(selectedUser.id);
    }
    if (activeTab === "gifts" && giftItems.length === 0) {
      fetchGiftItems();
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
      showToast(`${amount > 0 ? "+" : ""}${amount} 💎 → ${selectedUser.display_name}`, "ok");
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

  const handleTogglePrime = async (give: boolean, _months?: number) => {
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
      showToast(`${n > 0 ? "+" : ""}${n} 💎 Кристаллы → ${data.usersAffected} пользователей`, "ok");
      setMassAmount("");
      setShowMassConfirm(false);
      fetchData();
    } catch { showToast("Ошибка соединения", "err"); }
    setMassLoading(false);
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

  const fetchBanwords = async () => {
    setBanwordsLoading(true);
    try {
      const res = await fetch("/api/admin/banwords", { headers: getHeader() });
      if (res.ok) setBanwordsState(await res.json());
    } catch {}
    setBanwordsLoading(false);
  };

  const handleAddBanword = async () => {
    const word = newBanword.trim().toLowerCase();
    if (!word) return;
    setAddingBanword(true);
    try {
      const res = await fetch("/api/admin/banwords", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ word }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); }
      else { setBanwordsState(prev => [data, ...prev]); setNewBanword(""); showToast(`🚫 «${word}» добавлен`, "ok"); }
    } catch { showToast("Ошибка соединения", "err"); }
    setAddingBanword(false);
  };

  const handleDeleteBanword = async (id: number, word: string) => {
    setDeletingBanwordId(id);
    try {
      const res = await fetch(`/api/admin/banwords/${id}`, { method: "DELETE", headers: getHeader() });
      if (res.ok) { setBanwordsState(prev => prev.filter(b => b.id !== id)); showToast(`✅ «${word}» удалён`, "ok"); }
      else showToast("Ошибка", "err");
    } catch { showToast("Ошибка соединения", "err"); }
    setDeletingBanwordId(null);
  };

  const handleImportFromWeb = async () => {
    setImportingFromWeb(true);
    try {
      const res = await fetch("/api/admin/banwords/import-from-web", {
        method: "POST",
        headers: getHeader(),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ Добавлено ${data.added} слов (${data.fromInternet > 0 ? `+${data.fromInternet} из интернета` : "встроенный список"})`, "ok");
        fetchBanwords();
      } else {
        showToast(data.error || "Ошибка импорта", "err");
      }
    } catch { showToast("Ошибка соединения", "err"); }
    setImportingFromWeb(false);
  };

  const handleScanMessages = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/admin/banwords/scan-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ limit: 500 }),
      });
      const data = await res.json();
      if (res.ok) {
        setScanResults(data);
        setShowScanModal(true);
      } else {
        showToast(data.error || "Ошибка сканирования", "err");
      }
    } catch { showToast("Ошибка соединения", "err"); }
    setScanning(false);
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim()) return;
    setAddingBulk(true);
    try {
      const res = await fetch("/api/admin/banwords/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ words: bulkText }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ Добавлено: ${data.added} · Уже было: ${data.skipped}`, "ok");
        setBulkText("");
        setBulkMode(false);
        fetchBanwords();
      } else {
        showToast(data.error || "Ошибка", "err");
      }
    } catch { showToast("Ошибка соединения", "err"); }
    setAddingBulk(false);
  };

  const handleDeleteScanned = async (id: number) => {
    setDeletingScannedId(id);
    try {
      const res = await fetch(`/api/admin/banwords/scan-delete/${id}`, {
        method: "DELETE",
        headers: getHeader(),
      });
      if (res.ok) {
        setScanResults(prev => prev ? { ...prev, flagged: prev.flagged.filter(f => f.id !== id) } : null);
        showToast("Сообщение удалено", "ok");
      } else {
        showToast("Ошибка удаления", "err");
      }
    } catch { showToast("Ошибка соединения", "err"); }
    setDeletingScannedId(null);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Zap size={20} className="text-yellow-400" />
              </div>
              <div>
                <h3 className="font-bold">Массовая выдача ИСКРА</h3>
                <p className="text-sm text-muted-foreground">Всем пользователям сразу</p>
              </div>
            </div>
            <p className="text-sm mb-5">
              Выдать <span className="font-bold text-primary">{Number(massAmount) > 0 ? "+" : ""}{massAmount} 💎 Кристаллы</span> каждому из <span className="font-bold">{users.length}</span> пользователей?
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

      <header className="border-b border-border flex items-center px-5 justify-between bg-card/90 backdrop-blur-xl shrink-0 relative overflow-hidden" style={{ minHeight: "calc(4rem + env(safe-area-inset-top, 0px))", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/6 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.18), rgba(234,88,12,0.08))", border: "1px solid rgba(239,68,68,0.25)" }}>
            <Shield size={17} className="text-red-400" />
          </div>
          <h1 className="text-xl font-black text-foreground">Панель администратора</h1>
        </div>
        <button onClick={fetchData} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors relative z-10">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-8 space-y-5">

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={<Users size={20} className="text-primary" />} label="Пользователей" value={stats.totalUsers} color="bg-primary/10" />
            <StatCard icon={<Diamond size={20} className="text-cyan-400" />} label="Кристаллы в обороте" value={stats.totalSpark} color="bg-cyan-500/10" />
            <StatCard icon={<Crown size={20} className="text-amber-400" />} label="Prime подписок" value={stats.primeUsers} color="bg-amber-500/10" />
            <StatCard icon={<MessageSquare size={20} className="text-blue-400" />} label="Сообщений" value={stats.totalMessages} color="bg-blue-500/10" />
            <StatCard icon={<Activity size={20} className="text-green-400" />} label="Чатов" value={stats.totalChats} color="bg-green-500/10" />
            <StatCard icon={<PhoneCall size={20} className="text-cyan-400" />} label="Звонков" value={stats.totalCalls} color="bg-cyan-500/10" />
            <StatCard icon={<Gift size={20} className="text-pink-400" />} label="Подарков" value={stats.totalGifts} color="bg-pink-500/10" />
            <StatCard icon={<TrendingUp size={20} className="text-violet-400" />} label="Средний баланс" value={stats.totalUsers > 0 ? Math.round(stats.totalSpark / stats.totalUsers) : 0} color="bg-violet-500/10" />
          </div>
        )}

        {/* ── Maintenance Mode ─────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => { setShowMaintenancePanel(v => !v); }}
            className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${maintenance.active ? "bg-orange-500/15" : "bg-secondary"}`}>
                <Wrench size={18} className={maintenance.active ? "text-orange-400" : "text-muted-foreground"} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Технический перерыв</p>
                <p className={`text-xs ${maintenance.active ? "text-orange-400 font-medium" : "text-muted-foreground"}`}>
                  {maintenance.active
                    ? maintenance.endsAt
                      ? `Активен · до ${new Date(maintenance.endsAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`
                      : "Активен (без таймера)"
                    : "Отключён · пользователи видят приложение"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {maintenance.active && (
                <span className="px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[10px] font-black">ВКЛ</span>
              )}
              {showMaintenancePanel ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
            </div>
          </button>

          {showMaintenancePanel && (
            <div className="border-t border-border p-4 space-y-4">
              {/* Quick toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border">
                <div>
                  <p className="text-sm font-semibold">Статус</p>
                  <p className="text-xs text-muted-foreground">{maintenance.active ? "Пользователи видят экран техперерыва" : "Приложение работает в штатном режиме"}</p>
                </div>
                <button
                  onClick={() => saveMaintenance({ ...maintenance, active: !maintenance.active })}
                  disabled={maintenanceLoading}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    maintenance.active
                      ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                      : "bg-orange-500/15 border border-orange-500/30 text-orange-400 hover:bg-orange-500/25"
                  }`}
                >
                  {maintenance.active ? <><ToggleRight size={16} /> Выключить</> : <><ToggleLeft size={16} /> Включить</>}
                </button>
              </div>

              {/* Duration presets */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Timer size={12} /> Длительность
                </p>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {[
                    { label: "15 мин", min: 15 },
                    { label: "30 мин", min: 30 },
                    { label: "1 час", min: 60 },
                    { label: "2 часа", min: 120 },
                    { label: "4 часа", min: 240 },
                    { label: "8 часов", min: 480 },
                    { label: "24 часа", min: 1440 },
                    { label: "∞ нет", min: 0 },
                  ].map(p => {
                    const endsAt = p.min > 0 ? new Date(Date.now() + p.min * 60_000).toISOString() : null;
                    const isSelected = p.min === 0
                      ? !maintenance.endsAt
                      : maintenance.endsAt && Math.abs(new Date(maintenance.endsAt).getTime() - Date.now() - p.min * 60_000) < 5 * 60_000;
                    return (
                      <button
                        key={p.label}
                        onClick={() => setMaintenance(prev => ({ ...prev, endsAt }))}
                        className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          isSelected
                            ? "bg-primary/15 border-primary/40 text-primary"
                            : "border-border hover:border-primary/30 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                {maintenance.endsAt && (
                  <p className="text-xs text-muted-foreground text-center">
                    Завершится: {new Date(maintenance.endsAt).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>

              {/* Message */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Сообщение для пользователей</p>
                <textarea
                  value={maintenance.message}
                  onChange={e => setMaintenance(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Мы уже работаем над улучшениями. Совсем скоро вернёмся!"
                  rows={2}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none transition-colors"
                />
              </div>

              {/* Fixes list */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Что будет исправлено</p>
                <div className="space-y-1.5 mb-2">
                  {maintenance.fixes.map((fix, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/40 border border-border text-sm">
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                      <span className="flex-1 text-foreground">{fix}</span>
                      <button
                        onClick={() => setMaintenance(prev => ({ ...prev, fixes: prev.fixes.filter((_, j) => j !== i) }))}
                        className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={maintFixInput}
                    onChange={e => setMaintFixInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addMaintFix()}
                    placeholder="Добавить пункт... (Enter)"
                    className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                  <button
                    onClick={addMaintFix}
                    className="px-3 py-2 rounded-xl bg-secondary border border-border text-sm hover:bg-primary/10 hover:border-primary/30 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={() => saveMaintenance(maintenance)}
                disabled={maintenanceLoading}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {maintenanceLoading ? <><RefreshCw size={14} className="animate-spin" /> Сохраняем...</> : <><Save size={14} /> Сохранить настройки</>}
              </button>

              {/* Divider */}
              <div className="border-t border-border/50 pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Mail size={12} /> Тест отправки Email
                </p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="email"
                    value={mailTestTo}
                    onChange={e => setMailTestTo(e.target.value)}
                    placeholder="Получатель (оставьте пустым = MAIL_FROM)"
                    className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                  <button
                    onClick={handleMailTest}
                    disabled={mailTestLoading}
                    className="px-4 py-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 font-semibold text-sm hover:bg-blue-500/25 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {mailTestLoading ? <RefreshCw size={14} className="animate-spin" /> : <Mail size={14} />}
                    {mailTestLoading ? "..." : "Тест"}
                  </button>
                </div>
                {mailTestResult && (
                  <div className={`p-3 rounded-xl border text-xs font-mono whitespace-pre-wrap break-all ${
                    mailTestResult.ok
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : "bg-red-500/10 border-red-500/20 text-red-300"
                  }`}>
                    <p className="font-bold mb-1 not-italic">{mailTestResult.ok ? "✅ Письмо отправлено!" : "❌ Ошибка отправки"}</p>
                    <p className="opacity-70">from: {mailTestResult.from}</p>
                    <p className="opacity-70">to: {mailTestResult.to}</p>
                    {mailTestResult.elasticResponse && (
                      <p className="opacity-70 mt-1">Ответ Elastic Email: {JSON.stringify(mailTestResult.elasticResponse)}</p>
                    )}
                    {mailTestResult.reason && <p className="opacity-70">Причина: {mailTestResult.reason}</p>}
                    {mailTestResult.error && <p className="opacity-70">Ошибка: {mailTestResult.error}</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tools row: Mass SPARK + Posts + Leaderboard */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Mass SPARK */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <Zap size={18} className="text-yellow-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Массовая выдача ИСКРА</p>
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
                  inputMode="numeric"
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
                <p className="font-semibold text-sm">Апелляции модерации</p>
                <p className="text-xs text-muted-foreground">
                  {appeals.filter(a => a.status === "pending").length > 0
                    ? `${appeals.filter(a => a.status === "pending").length} ожидают рассмотрения`
                    : "Проверить обжалования заблокированных постов"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {appeals.filter(a => a.status === "pending").length > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 bg-orange-500 text-white text-[11px] font-black rounded-full flex items-center justify-center">
                  {appeals.filter(a => a.status === "pending").length}
                </span>
              )}
              {showAppeals ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
            </div>
          </button>
          {showAppeals && (
            <div className="border-t border-border">
              <div className="p-3 flex items-center justify-between border-b border-border/50">
                <p className="text-xs text-muted-foreground font-medium">Всего: {appeals.length} · Ожидают: {appeals.filter(a => a.status === "pending").length}</p>
                <button onClick={fetchAppeals} disabled={appealsLoading} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50">
                  <RefreshCw size={12} className={appealsLoading ? "animate-spin" : ""} /> Обновить
                </button>
              </div>
              {appealsLoading && appeals.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">Загружаем...</div>
              ) : appeals.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">Нет апелляций</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {appeals.map(appeal => (
                    <div key={appeal.id} className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden"
                          style={{ backgroundColor: appeal.avatar_color }}
                        >
                          {appeal.avatar_url ? <img src={appeal.avatar_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} /> : appeal.display_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{appeal.display_name}</span>
                            <span className="text-xs text-muted-foreground">@{appeal.username}</span>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                              appeal.status === "pending" ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                              : appeal.status === "approved" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-destructive/15 text-destructive border border-destructive/30"
                            }`}>
                              {appeal.status === "pending" ? "Ожидает" : appeal.status === "approved" ? "Одобрено" : "Отклонено"}
                            </span>
                          </div>
                          <div className="mt-2 p-2.5 bg-destructive/5 border border-destructive/20 rounded-xl text-xs space-y-1">
                            <p className="text-muted-foreground font-medium">Заблокированный пост:</p>
                            <p className="text-foreground line-clamp-2">{appeal.post_text}</p>
                            {appeal.moderation_reason && (
                              <p className="text-destructive/80 italic">Причина: {appeal.moderation_reason}</p>
                            )}
                            {appeal.moderation_confidence && (
                              <p className="text-muted-foreground">Уверенность ИИ: {appeal.moderation_confidence}%</p>
                            )}
                          </div>
                          <div className="mt-2 p-2.5 bg-secondary/50 rounded-xl text-xs">
                            <p className="text-muted-foreground font-medium mb-1">Апелляция пользователя:</p>
                            <p className="text-foreground">{appeal.appeal_text}</p>
                          </div>
                          {appeal.admin_response && (
                            <div className="mt-2 p-2 bg-primary/5 border border-primary/20 rounded-lg text-xs">
                              <p className="text-primary/70 font-medium">Ответ админа:</p>
                              <p className="text-foreground">{appeal.admin_response}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      {appeal.status === "pending" && (
                        <div className="pl-11 space-y-2">
                          <input
                            type="text"
                            value={appealResponse[appeal.id] || ""}
                            onChange={e => setAppealResponse(prev => ({ ...prev, [appeal.id]: e.target.value }))}
                            placeholder="Ответ администратора (необязательно)..."
                            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAppealAction(appeal.id, "approve")}
                              disabled={appealActionLoading === appeal.id}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 size={13} />
                              {appealActionLoading === appeal.id ? "..." : "Одобрить и восстановить"}
                            </button>
                            <button
                              onClick={() => handleAppealAction(appeal.id, "reject")}
                              disabled={appealActionLoading === appeal.id}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              <X size={13} />
                              {appealActionLoading === appeal.id ? "..." : "Отклонить"}
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
                        {r.avatar_url ? <img src={r.avatar_url} className="w-full h-full rounded-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} /> : r.display_name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">@{r.username}</p>
                        <p className="text-xs text-muted-foreground">{r.package_label} — {r.amount} 💎 за {r.price_label}</p>
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
                              {t.avatar_url ? <img src={t.avatar_url} className="w-full h-full rounded-full object-cover" alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} /> : t.display_name[0]?.toUpperCase()}
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
                    {bugs.map(bug => {
                      const isExpanded = expandedBugs.has(bug.id);
                      const toggleExpand = () => setExpandedBugs(prev => {
                        const s = new Set(prev);
                        s.has(bug.id) ? s.delete(bug.id) : s.add(bug.id);
                        return s;
                      });
                      return (
                      <div key={bug.id} className="p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold overflow-hidden" style={{ backgroundColor: bug.avatar_color }}>
                            {bug.avatar_url ? <img src={bug.avatar_url} className="w-full h-full rounded-full object-cover" alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} /> : bug.display_name[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-semibold break-words min-w-0">{bug.title}</p>
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
                        <div className="pl-9">
                          <p className={`text-xs text-muted-foreground break-words ${isExpanded ? "" : "line-clamp-2"}`}>{bug.description}</p>
                          {bug.description && bug.description.length > 120 && (
                            <button onClick={toggleExpand} className="text-[10px] text-primary mt-0.5 hover:underline">
                              {isExpanded ? "Свернуть" : "Читать полностью"}
                            </button>
                          )}
                        </div>
                        {bug.admin_note && (
                          <div className="pl-9 text-[10px] text-primary italic">Ответ: {bug.admin_note}</div>
                        )}
                        {bug.screenshot_url && (
                          <div className="pl-9">
                            <a
                              href={bug.screenshot_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block relative w-fit group"
                            >
                              <img
                                src={bug.screenshot_url}
                                alt="Скриншот бага"
                                className="max-h-40 rounded-lg border border-border object-cover"
                              />
                              <span className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <span className="text-[10px] font-bold text-white">Открыть</span>
                              </span>
                            </a>
                            <a
                              href={bug.screenshot_url}
                              download={`bug-${bug.id}-screenshot.jpg`}
                              className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                            >
                              <Download size={11} /> Скачать фото
                            </a>
                          </div>
                        )}
                        <div className="pl-9 space-y-1.5">
                          {(bug.status !== 'resolved' && bug.status !== 'closed') && (
                            <>
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
                            </>
                          )}
                          <button
                            onClick={async () => {
                              if (!confirm("Удалить репорт?")) return;
                              const res = await fetch(`/api/admin/support/bugs/${bug.id}`, { method: "DELETE", headers: getHeader() });
                              if (res.ok) setBugs(prev => prev.filter(b => b.id !== bug.id));
                            }}
                            className="text-[10px] text-destructive hover:underline flex items-center gap-1"
                          >
                            🗑 Удалить репорт
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => { setShowDetailedStats(v => !v); if (!showDetailedStats && !detailedStats) fetchDetailedStats(); }}
            className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <BarChart3 size={18} className="text-indigo-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Подробная аналитика</p>
                <p className="text-xs text-muted-foreground">Динамика за сегодня и неделю</p>
              </div>
            </div>
            {showDetailedStats ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
          </button>
          {showDetailedStats && (
            <div className="border-t border-border p-4">
              {detailedStatsLoading ? (
                <div className="flex justify-center py-6"><RefreshCw size={20} className="animate-spin text-muted-foreground" /></div>
              ) : detailedStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Новых сегодня</p>
                      <p className="text-2xl font-black text-emerald-400">{detailedStats.newUsersToday}</p>
                      <p className="text-[10px] text-muted-foreground">за неделю: {detailedStats.newUsersThisWeek}</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Сообщений сегодня</p>
                      <p className="text-2xl font-black text-blue-400">{detailedStats.messagesToday}</p>
                      <p className="text-[10px] text-muted-foreground">за неделю: {detailedStats.messagesThisWeek}</p>
                    </div>
                    <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Подарков сегодня</p>
                      <p className="text-2xl font-black text-pink-400">{detailedStats.giftsToday}</p>
                      <p className="text-[10px] text-muted-foreground">заблокировано: {detailedStats.bannedUsers}</p>
                    </div>
                  </div>
                  {detailedStats.topGifts.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Топ подарков по отправкам</p>
                      <div className="space-y-1.5">
                        {detailedStats.topGifts.map((g, i) => (
                          <div key={i} className="flex items-center gap-2.5 text-sm">
                            <span className="text-muted-foreground w-4 text-center font-black">{i + 1}</span>
                            <span className="text-lg">{g.emoji}</span>
                            <span className="flex-1 font-medium text-foreground">{g.name}</span>
                            <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                              g.rarity === "cosmic" ? "bg-violet-500/20 text-violet-300" :
                              g.rarity === "legendary" ? "bg-amber-500/20 text-amber-300" :
                              g.rarity === "epic" ? "bg-purple-500/20 text-purple-300" :
                              g.rarity === "rare" ? "bg-blue-500/20 text-blue-300" : "bg-secondary text-muted-foreground"
                            }`}>{g.rarity}</span>
                            <span className="text-primary font-bold">{g.cnt}×</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={fetchDetailedStats} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary transition-colors">
                    <RefreshCw size={12} className={detailedStatsLoading ? "animate-spin" : ""} /> Обновить
                  </button>
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-6">Не удалось загрузить</p>
              )}
            </div>
          )}
        </div>

        {/* Global Announcements — combined panel */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => { setShowAnnouncementPanel(v => !v); if (!showAnnouncementPanel) { fetchCurrentAnnouncement(); } }}
            className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <span className="text-amber-400 text-base">📢</span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Глобальные объявления</p>
                <p className="text-xs text-muted-foreground">Баннер + рассылка всем пользователям</p>
              </div>
            </div>
            {showAnnouncementPanel ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
          </button>

          {showAnnouncementPanel && (
            <div className="border-t border-border divide-y divide-border/50">

              {/* ── Блок 1: Баннер-объявление ───────────────────────────── */}
              <div className="px-4 py-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Баннер</span>
                  <span className="text-[10px] text-muted-foreground">— отображается вверху экрана у всех пользователей</span>
                </div>
                {currentAnnouncement && (
                  <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <span className="text-amber-400 text-xs font-bold shrink-0 mt-0.5">Активно:</span>
                    <p className="text-xs text-foreground leading-relaxed flex-1">{currentAnnouncement}</p>
                  </div>
                )}
                <textarea
                  value={announcementMsg}
                  onChange={e => setAnnouncementMsg(e.target.value)}
                  placeholder="Текст баннера (будет показан вверху экрана всем пользователям)..."
                  rows={2}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500 transition-colors resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!announcementMsg.trim()) return showToast("Введите текст баннера", "err");
                      setAnnouncementSaving(true);
                      try {
                        const r = await fetch("/api/admin/announcement", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", ...getHeader() },
                          body: JSON.stringify({ message: announcementMsg.trim() }),
                        });
                        if (r.ok) { showToast("✅ Баннер опубликован", "ok"); setCurrentAnnouncement(announcementMsg.trim()); }
                        else { const d = await r.json(); showToast(d.error || "Ошибка", "err"); }
                      } catch { showToast("Ошибка соединения", "err"); }
                      setAnnouncementSaving(false);
                    }}
                    disabled={announcementSaving}
                    className="flex-1 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {announcementSaving ? "Публикую..." : "📢 Опубликовать баннер"}
                  </button>
                  {currentAnnouncement && (
                    <button
                      onClick={async () => {
                        try {
                          await fetch("/api/admin/announcement", { method: "DELETE", headers: getHeader() });
                          showToast("🗑️ Баннер удалён", "ok");
                          setCurrentAnnouncement(null);
                          setAnnouncementMsg("");
                        } catch { showToast("Ошибка", "err"); }
                      }}
                      className="px-3 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Broadcast Push + Chat Management */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Broadcast Push Notification */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowBroadcastPush(v => !v)}
              className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center">
                  <SendIcon size={18} className="text-sky-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Broadcast Push</p>
                  <p className="text-xs text-muted-foreground">Push-уведомление всем подписчикам</p>
                </div>
              </div>
              {showBroadcastPush ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
            </button>
            {showBroadcastPush && (
              <div className="px-4 pb-4 space-y-2.5 border-t border-border pt-3">
                <input
                  value={pushTitle}
                  onChange={e => setPushTitle(e.target.value)}
                  placeholder="Заголовок уведомления"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-sky-500 transition-colors"
                />
                <textarea
                  value={pushBody}
                  onChange={e => setPushBody(e.target.value)}
                  placeholder="Текст уведомления"
                  rows={2}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-sky-500 transition-colors resize-none"
                />
                <input
                  value={pushUrl}
                  onChange={e => setPushUrl(e.target.value)}
                  placeholder="URL (необязательно, например /chats)"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-sky-500 transition-colors"
                />
                <button
                  onClick={handleBroadcastPush}
                  disabled={pushLoading || !pushTitle.trim() || !pushBody.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-500 text-white font-bold text-sm hover:bg-sky-600 transition-colors disabled:opacity-50"
                >
                  <SendIcon size={14} />
                  {pushLoading ? "Отправляем..." : "Отправить push всем"}
                </button>
              </div>
            )}
          </div>

          {/* Chat Management */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => { setShowAdminChats(v => !v); if (!showAdminChats && adminChats.length === 0) fetchAdminChats(); }}
              className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center">
                  <MessageSquare size={18} className="text-teal-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Управление чатами</p>
                  <p className="text-xs text-muted-foreground">Просмотр и удаление групп/каналов</p>
                </div>
              </div>
              {showAdminChats ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
            </button>
            {showAdminChats && (
              <div className="border-t border-border">
                <div className="p-2 border-b border-border flex items-center gap-2">
                  <input
                    value={chatSearchQ}
                    onChange={e => setChatSearchQ(e.target.value)}
                    placeholder="Поиск чата..."
                    className="flex-1 text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal-500 transition-colors"
                  />
                  <button onClick={fetchAdminChats} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary transition-colors shrink-0">
                    <RefreshCw size={12} className={adminChatsLoading ? "animate-spin" : ""} />
                  </button>
                </div>
                {adminChatsLoading ? (
                  <div className="p-6 flex justify-center"><RefreshCw size={20} className="animate-spin text-muted-foreground" /></div>
                ) : adminChats.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Нет групп или каналов</div>
                ) : (
                  <div className="divide-y divide-border max-h-80 overflow-y-auto">
                    {adminChats
                      .filter(c => !chatSearchQ || c.name?.toLowerCase().includes(chatSearchQ.toLowerCase()))
                      .map(chat => (
                        <div key={chat.id} className="p-3 flex items-center gap-3 group hover:bg-secondary/30 transition-colors">
                          <div
                            className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold overflow-hidden"
                            style={{ backgroundColor: chat.avatar_color }}
                          >
                            {chat.avatar_url ? <img src={chat.avatar_url} className="w-full h-full object-cover" alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} /> : (chat.name || "?")[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{chat.name || "Без названия"}</p>
                            <p className="text-xs text-muted-foreground">
                              {chat.type === "channel" ? "Канал" : "Группа"} · {chat.member_count} участн. · {chat.message_count} сообщ.
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteChat(chat.id)}
                            disabled={deletingChatId === chat.id}
                            className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:text-destructive active:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 disabled:opacity-50"
                            title="Удалить чат"
                          >
                            {deletingChatId === chat.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Platform Events */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => { setShowEvents(v => !v); if (!showEvents && platformEvents.length === 0) fetchPlatformEvents(); }}
            className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <span className="text-violet-400 text-lg">🎉</span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">События / Ивенты</p>
                <p className="text-xs text-muted-foreground">
                  {platformEvents.filter(e => e.isActive).length > 0
                    ? `${platformEvents.filter(e => e.isActive).length} активных`
                    : "Управление событиями платформы"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {platformEvents.filter(e => e.isActive).length > 0 && (
                <span className="w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] font-black flex items-center justify-center">
                  {platformEvents.filter(e => e.isActive).length}
                </span>
              )}
              {showEvents ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
            </div>
          </button>

          {showEvents && (
            <div className="border-t border-border">
              <div className="p-2 border-b border-border flex justify-between items-center">
                <button onClick={fetchPlatformEvents} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary transition-colors">
                  <RefreshCw size={12} className={eventsLoading ? "animate-spin" : ""} /> Обновить
                </button>
                <button
                  onClick={() => openEventForm()}
                  className="text-xs bg-violet-500/15 text-violet-400 border border-violet-500/30 hover:bg-violet-500/25 font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={12} /> Новое событие
                </button>
              </div>

              {showEventForm && (
                <div className="p-4 border-b border-border bg-secondary/20 space-y-3">
                  <p className="text-sm font-bold text-foreground">{editingEvent ? "Редактировать событие" : "Новое событие"}</p>

                  {/* Event type / emoji picker */}
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Тип события</p>
                    <div className="flex flex-wrap gap-1.5">
                      {EVENT_TYPES.map(t => (
                        <button
                          key={t.emoji}
                          type="button"
                          onClick={() => { setEventEmoji(t.emoji); setEventColor(t.color); }}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            eventEmoji === t.emoji
                              ? "text-white border-transparent scale-105"
                              : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                          }`}
                          style={eventEmoji === t.emoji ? { background: t.color, boxShadow: `0 0 8px ${t.color}60` } : {}}
                        >
                          <span>{t.emoji}</span>
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live preview */}
                  <div className="rounded-xl p-3 border" style={{ background: `${eventColor}12`, borderColor: `${eventColor}40` }}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{eventEmoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-foreground truncate">{eventTitle || "Заголовок события"}</p>
                        {eventDesc && <p className="text-xs text-muted-foreground truncate mt-0.5">{eventDesc}</p>}
                      </div>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: `${eventColor}25`, color: eventColor }}>🔴 LIVE</span>
                    </div>
                  </div>

                  <input
                    value={eventTitle}
                    onChange={e => setEventTitle(e.target.value)}
                    placeholder="Заголовок события *"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  />
                  <textarea
                    value={eventDesc}
                    onChange={e => setEventDesc(e.target.value)}
                    placeholder="Описание (необязательно)"
                    rows={2}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none"
                  />
                  <input
                    value={eventImage}
                    onChange={e => setEventImage(e.target.value)}
                    placeholder="URL изображения (необязательно)"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground mb-1 block">Начало</label>
                      <input type="datetime-local" value={eventStartAt} onChange={e => setEventStartAt(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-500 transition-colors" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground mb-1 block">Конец</label>
                      <input type="datetime-local" value={eventEndAt} onChange={e => setEventEndAt(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-500 transition-colors" />
                    </div>
                  </div>
                  {/* Event kind + giveaway cost */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground mb-1 block">Категория</label>
                      <div className="flex gap-1.5">
                        {([{ v: "event", label: "Событие" }, { v: "giveaway", label: "Розыгрыш" }] as const).map(k => (
                          <button key={k.v} type="button" onClick={() => setEventKind(k.v)}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${eventKind === k.v ? "bg-violet-500 text-white border-violet-500" : "border-border text-muted-foreground hover:text-foreground"}`}>
                            {k.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {eventKind === "giveaway" && (
                      <div className="w-28">
                        <label className="text-[10px] text-muted-foreground mb-1 block">Стоимость (💎)</label>
                        <input type="number" inputMode="numeric" min={0} value={eventCost} onChange={e => setEventCost(Number(e.target.value))}
                          className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
                      </div>
                    )}
                  </div>
                  <textarea
                    value={eventConditions}
                    onChange={e => setEventConditions(e.target.value)}
                    placeholder={"Условия участия (по одному на строку, напр.:\nАктивный пользователь\nPrime подписка)"}
                    rows={2}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none"
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">Цвет:</label>
                      <input type="color" value={eventColor} onChange={e => setEventColor(e.target.value)}
                        className="w-8 h-8 rounded-lg border border-border cursor-pointer bg-transparent" />
                      <span className="text-xs font-mono text-muted-foreground">{eventColor}</span>
                    </div>
                    <label className="flex items-center gap-2 ml-auto cursor-pointer">
                      <span className="text-xs text-muted-foreground">Активно</span>
                      <div onClick={() => setEventActive(v => !v)}
                        className={`w-9 h-5 rounded-full border-2 transition-all relative cursor-pointer ${eventActive ? "bg-violet-500 border-violet-500" : "bg-secondary border-border"}`}>
                        <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${eventActive ? "left-4" : "left-0.5"}`} />
                      </div>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowEventForm(false)}
                      className="flex-1 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors">
                      Отмена
                    </button>
                    <button onClick={handleSaveEvent} disabled={eventSaving}
                      className="flex-1 py-2 rounded-xl text-white text-xs font-bold transition-colors disabled:opacity-50"
                      style={{ background: eventColor }}>
                      {eventSaving ? "Сохраняем..." : editingEvent ? "Сохранить" : `${eventEmoji} Создать`}
                    </button>
                  </div>
                </div>
              )}

              {eventsLoading ? (
                <div className="p-6 flex justify-center"><RefreshCw size={20} className="animate-spin text-muted-foreground" /></div>
              ) : platformEvents.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Нет событий. Создайте первое!</div>
              ) : (
                <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
                  {platformEvents.map(ev => (
                    <div key={ev.id} className="p-3 flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: ev.isActive ? "#10b981" : "#6b7280" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">{ev.title}</p>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${ev.isActive ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-muted-foreground border-border bg-secondary/50"}`}>
                            {ev.isActive ? "АКТИВНО" : "СКРЫТО"}
                          </span>
                        </div>
                        {ev.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{ev.description}</p>}
                        {(ev.startAt || ev.endAt) && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {ev.startAt ? `С ${new Date(ev.startAt).toLocaleDateString("ru-RU")}` : ""}
                            {ev.endAt ? ` по ${new Date(ev.endAt).toLocaleDateString("ru-RU")}` : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleToggleEventActive(ev)}
                          className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${ev.isActive ? "border-orange-500/30 text-orange-400 hover:bg-orange-500/10" : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"}`}>
                          {ev.isActive ? "Скрыть" : "Показать"}
                        </button>
                        <button onClick={() => openEventForm(ev)}
                          className="text-[10px] px-2 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                          ✏️
                        </button>
                        <button onClick={() => handleDeleteEvent(ev.id)}
                          className="text-[10px] px-2 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Reports */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => { setShowUserReports(v => !v); if (!showUserReports && userReports.length === 0) fetchUserReports(); }}
            className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
                <span className="text-red-400 text-lg">🚩</span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Жалобы на пользователей</p>
                <p className="text-xs text-muted-foreground">
                  {userReports.filter(r => r.status === "pending").length > 0
                    ? `${userReports.filter(r => r.status === "pending").length} новых`
                    : "Просмотр жалоб"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {userReports.filter(r => r.status === "pending").length > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                  {userReports.filter(r => r.status === "pending").length}
                </span>
              )}
              {showUserReports ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
            </div>
          </button>

          {showUserReports && (
            <div className="border-t border-border">
              <div className="p-2 border-b border-border flex justify-end">
                <button onClick={fetchUserReports} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary transition-colors">
                  <RefreshCw size={12} /> Обновить
                </button>
              </div>
              {userReports.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Жалоб нет</div>
              ) : (
                <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
                  {userReports.map(r => (
                    <div key={r.id} className={`p-3 transition-colors ${r.status !== "pending" ? "opacity-50" : "hover:bg-secondary/10"}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-red-400">@{r.reporter_username}</span>
                            <span className="text-xs text-muted-foreground">→</span>
                            <span className="text-xs font-semibold">@{r.target_username}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-auto ${r.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : r.status === "reviewed" ? "bg-green-500/20 text-green-400" : "bg-secondary text-muted-foreground"}`}>
                              {r.status === "pending" ? "Новая" : r.status === "reviewed" ? "Рассмотрена" : "Отклонена"}
                            </span>
                          </div>
                          <p className="text-xs font-medium mt-0.5">{r.reason}</p>
                          {r.details && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.details}</p>}
                          <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString("ru-RU")}</p>
                        </div>
                        {r.status === "pending" && (
                          <div className="flex flex-col gap-1 shrink-0">
                            <button onClick={() => resolveUserReport(r.id, "reviewed")} className="text-[10px] px-2 py-1 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-all">✓</button>
                            <button onClick={() => resolveUserReport(r.id, "dismissed")} className="text-[10px] px-2 py-1 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-all">✕</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* [Gift Catalog removed] */}
        <div className="hidden">
          <button
            onClick={() => {}}
            className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center">
                <Gift size={18} className="text-pink-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Каталог подарков</p>
                <p className="text-xs text-muted-foreground">Редактирование цен, редкости и звёзд</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {giftCatalog.length > 0 && <span className="text-xs text-muted-foreground">{giftCatalog.length} подарков</span>}
              {showGiftCatalog ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
            </div>
          </button>
          {showGiftCatalog && (
            <div className="border-t border-border">
              <div className="p-2 border-b border-border flex justify-end">
                <button onClick={fetchGiftCatalog} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary transition-colors">
                  <RefreshCw size={12} className={giftCatalogLoading ? "animate-spin" : ""} /> Обновить
                </button>
              </div>
              {giftCatalogLoading ? (
                <div className="p-6 flex justify-center"><RefreshCw size={20} className="animate-spin text-muted-foreground" /></div>
              ) : giftCatalog.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Каталог пуст</div>
              ) : (
                <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
                  {giftCatalog.map(gift => {
                    const isEditing = editingCatalogGiftId === gift.id;
                    const edits = catalogEdit[gift.id] || {};
                    const currentRarity = edits.rarity ?? gift.rarity;
                    return (
                      <div key={gift.id} className={`p-3 transition-colors ${isEditing ? "bg-secondary/20" : "hover:bg-secondary/10"}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                            <AdminGiftThumb name={gift.name} emoji={gift.emoji} size={38} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold truncate">{gift.name}</p>
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                currentRarity === "cosmic" ? "bg-violet-500/20 text-violet-300" :
                                currentRarity === "legendary" ? "bg-amber-500/20 text-amber-300" :
                                currentRarity === "epic" ? "bg-purple-500/20 text-purple-300" :
                                currentRarity === "rare" ? "bg-blue-500/20 text-blue-300" : "bg-secondary text-muted-foreground"
                              }`}>{currentRarity}</span>
                              {gift.prime_only && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">PRIME</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">⭐ {edits.stars ?? gift.stars} · {(edits.price ?? gift.price).toLocaleString()} 💎 · отправлено: {gift.times_sent}×</p>
                          </div>
                          <button
                            onClick={() => {
                              if (isEditing) { setEditingCatalogGiftId(null); setCatalogEdit(prev => { const n = { ...prev }; delete n[gift.id]; return n; }); }
                              else setEditingCatalogGiftId(gift.id);
                            }}
                            className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          >
                            {isEditing ? <X size={14} /> : <Edit3 size={14} />}
                          </button>
                        </div>
                        {isEditing && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mt-3 space-y-2 pl-13"
                          >
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Цена (💎)</label>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={edits.price ?? gift.price}
                                  onChange={e => setCatalogEdit(prev => ({ ...prev, [gift.id]: { ...prev[gift.id], price: Number(e.target.value) } }))}
                                  className="mt-1 w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Звёзды</label>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min={1}
                                  max={200}
                                  value={edits.stars ?? gift.stars}
                                  onChange={e => setCatalogEdit(prev => ({ ...prev, [gift.id]: { ...prev[gift.id], stars: Number(e.target.value) } }))}
                                  className="mt-1 w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Редкость</label>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {(["common","rare","epic","legendary","cosmic"] as const).map(r => (
                                  <button
                                    key={r}
                                    onClick={() => setCatalogEdit(prev => ({ ...prev, [gift.id]: { ...prev[gift.id], rarity: r } }))}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                                      currentRarity === r
                                        ? r === "cosmic" ? "bg-violet-500 text-white" : r === "legendary" ? "bg-amber-500 text-black" : r === "epic" ? "bg-purple-500 text-white" : r === "rare" ? "bg-blue-500 text-white" : "bg-secondary text-foreground"
                                        : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                                    }`}
                                  >
                                    {r}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setCatalogEdit(prev => ({ ...prev, [gift.id]: { ...prev[gift.id], prime_only: !(edits.prime_only ?? gift.prime_only) } }))}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${(edits.prime_only ?? gift.prime_only) ? "bg-amber-500/20 border border-amber-500/50 text-amber-300" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                              >
                                <Crown size={12} /> Prime Only
                              </button>
                            </div>
                            <button
                              onClick={() => handleSaveCatalogGift(gift.id)}
                              disabled={catalogSavingId === gift.id || Object.keys(edits).length === 0}
                              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                              <Save size={14} />
                              {catalogSavingId === gift.id ? "Сохраняем..." : "Сохранить изменения"}
                            </button>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
                      {post.avatar_url ? <img src={post.avatar_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} /> : post.display_name[0]?.toUpperCase()}
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
                      className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:text-destructive active:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 disabled:opacity-50"
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
                  {([["byBalance", "💎 Кристаллы"], ["byMessages", "💬 Сообщ."]] as const).map(([key, label]) => (
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
                          {entry.avatar_url ? <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} /> : entry.display_name[0]?.toUpperCase()}
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

        {/* Scan Results Modal */}
        <AnimatePresence>
          {showScanModal && scanResults && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={e => { if (e.target === e.currentTarget) setShowScanModal(false); }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
              >
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                    <ShieldAlert size={18} className="text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">Результаты сканирования ленты</p>
                    <p className="text-xs text-muted-foreground">
                      Проверено {scanResults.scanned} сообщений · Найдено нарушений: <span className={scanResults.flagged.length > 0 ? "text-red-400 font-bold" : "text-green-400 font-bold"}>{scanResults.flagged.length}</span>
                    </p>
                  </div>
                  <button onClick={() => setShowScanModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    <X size={16} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {scanResults.flagged.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
                        <ShieldCheck size={26} className="text-green-400" />
                      </div>
                      <p className="font-bold text-foreground">Нарушений не найдено</p>
                      <p className="text-xs text-muted-foreground">Все проверенные сообщения соответствуют правилам</p>
                    </div>
                  ) : (
                    scanResults.flagged.map(item => (
                      <div key={item.id} className="flex gap-3 p-3 rounded-xl bg-secondary/40 border border-red-500/10 hover:border-red-500/30 transition-colors">
                        {/* Avatar */}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-black shrink-0 overflow-hidden mt-0.5"
                          style={{ backgroundColor: item.avatarColor || "#6366f1" }}
                        >
                          {item.avatarUrl ? (
                            <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            (item.senderName || "?")[0].toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-bold text-foreground">{item.senderName}</span>
                            <span className="text-[10px] text-muted-foreground">@{item.senderUsername}</span>
                            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{new Date(item.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <p className="text-xs text-foreground/90 leading-relaxed mb-1.5 break-words line-clamp-3">{item.text}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                              {item.reason}
                            </span>
                            {item.categories.map(c => (
                              <span key={c} className="text-[9px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full uppercase tracking-wide">{c}</span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteScanned(item.id)}
                          disabled={deletingScannedId === item.id}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 shrink-0 self-start mt-0.5"
                          title="Удалить сообщение"
                        >
                          {deletingScannedId === item.id ? (
                            <RefreshCw size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {scanResults.flagged.length > 0 && (
                  <div className="px-4 py-3 border-t border-border shrink-0">
                    <p className="text-[10px] text-muted-foreground text-center">
                      Нажмите <Trash2 size={10} className="inline" /> чтобы удалить отдельное сообщение · ИИ-модерация работает автоматически при отправке
                    </p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Banwords */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => { setShowBanwords(v => !v); if (!showBanwords && banwords.length === 0) fetchBanwords(); }}
            className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Ban size={18} className="text-red-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Банворды и ИИ-фильтр</p>
                <p className="text-xs text-muted-foreground">
                  Запрещённые слова + нейросеть блокируют нарушения
                  {banwords.length > 0 && ` · ${banwords.length} слов`}
                </p>
              </div>
            </div>
            {showBanwords ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
          </button>
          {showBanwords && (
            <div className="border-t border-border">
              {/* Action buttons */}
              <div className="p-3 border-b border-border flex gap-2 flex-wrap">
                <button
                  onClick={handleImportFromWeb}
                  disabled={importingFromWeb}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 text-xs font-semibold disabled:opacity-50 transition-colors"
                >
                  {importingFromWeb ? <RefreshCw size={13} className="animate-spin" /> : <Activity size={13} />}
                  {importingFromWeb ? "Загрузка..." : "Загрузить из интернета"}
                </button>
                <button
                  onClick={handleScanMessages}
                  disabled={scanning}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 text-xs font-semibold disabled:opacity-50 transition-colors"
                >
                  {scanning ? <RefreshCw size={13} className="animate-spin" /> : <ShieldAlert size={13} />}
                  {scanning ? "Сканирование..." : "Сканировать ленту"}
                </button>
                {scanResults && (
                  <button
                    onClick={() => setShowScanModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors"
                  >
                    <FileText size={13} />
                    Результаты ({scanResults.flagged.length})
                  </button>
                )}
              </div>
              {/* Add form */}
              <div className="p-3 border-b border-border space-y-2">
                <div className="flex gap-1 p-0.5 rounded-xl bg-secondary w-fit">
                  <button
                    onClick={() => setBulkMode(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${!bulkMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Одно слово
                  </button>
                  <button
                    onClick={() => setBulkMode(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${bulkMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    До 1000 слов
                  </button>
                </div>
                {!bulkMode ? (
                  <div className="flex gap-2">
                    <input
                      value={newBanword}
                      onChange={e => setNewBanword(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleAddBanword()}
                      placeholder="Добавить слово вручную..."
                      className="flex-1 text-sm bg-background border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                    <button
                      onClick={handleAddBanword}
                      disabled={addingBanword || !newBanword.trim()}
                      className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-400 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Добавить
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={bulkText}
                      onChange={e => setBulkText(e.target.value)}
                      placeholder={"Вставьте слова через запятую, точку с запятой или с новой строки:\nплохо, матерно, грубо\nили каждое на новой строке\n(максимум 1000 слов за раз)"}
                      rows={6}
                      className="w-full text-sm bg-background border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none font-mono"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {bulkText.trim()
                          ? `~${bulkText.split(/[\n,;]+/).filter(w => w.trim().length >= 2).length} слов`
                          : "Разделитель: запятая, ; или новая строка"}
                      </span>
                      <button
                        onClick={handleBulkAdd}
                        disabled={addingBulk || !bulkText.trim()}
                        className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-400 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                      >
                        {addingBulk ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                        Добавить всё
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* List */}
              <div className="max-h-64 overflow-y-auto divide-y divide-border">
                {banwordsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-3 animate-pulse flex gap-2">
                      <div className="h-4 bg-secondary rounded flex-1" />
                      <div className="h-4 w-8 bg-secondary rounded" />
                    </div>
                  ))
                ) : banwords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <p>Список пуст</p>
                    <p className="text-xs mt-1 text-muted-foreground/60">Нажмите «Загрузить из интернета» для авто-заполнения</p>
                  </div>
                ) : banwords.map(bw => (
                  <div key={bw.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-secondary/30 transition-colors group">
                    <span className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                      <Ban size={11} className="text-red-400" />
                    </span>
                    <span className="flex-1 text-sm font-mono text-foreground">{bw.word}</span>
                    <span className="text-[10px] text-muted-foreground hidden group-hover:block">
                      {new Date(bw.created_at).toLocaleDateString("ru-RU")}
                    </span>
                    <button
                      onClick={() => handleDeleteBanword(bw.id, bw.word)}
                      disabled={deletingBanwordId === bw.id}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                      ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover rounded-full" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      : user.display_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-sm truncate">{user.display_name}</p>
                      {user.is_verified && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0">
                          <circle cx="12" cy="12" r="12" fill="hsl(16 100% 50%)"/>
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
                        ? <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover rounded-full" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                        : selectedUser.display_name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-foreground">{selectedUser.display_name}</p>
                        {selectedUser.is_verified && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="12" fill="hsl(16 100% 50%)"/>
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
                  {(["balance", "actions", "password", "stats"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap px-2 ${activeTab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {t === "balance" ? "💎 Баланс" : t === "password" ? "🔐 Пароль" : t === "actions" ? "⚙️ Действия" : "📊 Статистика"}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  {/* Balance tab */}
                  {activeTab === "balance" && (
                    <>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Быстрая выдача 💎 Кристаллы</p>
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
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Снять ИСКРА</p>
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
                          inputMode="numeric"
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
                              <span className="font-bold text-primary">{Number(selectedUser.balance).toLocaleString()} ✨</span>
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
