import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, PhoneOff, Camera, CameraOff,
  Volume2, VolumeX, FlipHorizontal, Maximize2,
  Monitor, MonitorOff, UserPlus, X, Search,
} from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { useGetContacts } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { playRingbackTone } from "@/lib/ringtones";

function SoundWaves({ active }: { active: boolean }) {
  return (
    <div className="flex items-end justify-center gap-[3px] h-10">
      {[0.4, 0.7, 1, 0.85, 0.55, 0.9, 0.65, 1, 0.75, 0.45, 0.8, 0.6].map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-primary"
          animate={active ? { scaleY: [h * 0.3, h, h * 0.5, h * 0.8, h * 0.3] } : { scaleY: 0.15 }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }}
          style={{ originY: 1, height: 40 }}
        />
      ))}
    </div>
  );
}

function PulseRings({ color }: { color: string }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: color + "55" }}
          animate={{ scale: [1, 1.8 + i * 0.25], opacity: [0.6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
        />
      ))}
    </>
  );
}

function Avatar({ user, size = 32 }: { user: any; size?: number }) {
  const bg = user?.avatarColor || "#444";
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold overflow-hidden shrink-0"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.35 }}
    >
      {user?.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
      ) : (
        user?.displayName?.[0]?.toUpperCase() ?? "?"
      )}
    </div>
  );
}

// Invite modal shown during active calls
function InviteModal({ onClose }: { onClose: () => void }) {
  const { inviteToCall, currentUserId, activeCall } = useAppContext();
  const { data: contacts } = useGetContacts();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [inviting, setInviting] = useState<number | null>(null);

  const filtered = contacts?.filter(
    (c: { id: number; displayName?: string | null; username?: string | null }) =>
      c.id !== currentUserId &&
      c.id !== activeCall?.callerId &&
      c.id !== activeCall?.calleeId &&
      (c.displayName?.toLowerCase().includes(search.toLowerCase()) ||
        c.username?.toLowerCase().includes(search.toLowerCase())),
  );

  const handleInvite = async (userId: number, name: string) => {
    setInviting(userId);
    try {
      await inviteToCall(userId);
      toast({ title: `Приглашение отправлено`, description: name });
      onClose();
    } catch {
      toast({ title: "Ошибка", description: "Не удалось пригласить участника", variant: "destructive" });
    } finally {
      setInviting(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-end justify-center"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="relative w-full max-w-sm bg-card rounded-t-3xl overflow-hidden shadow-2xl z-10 border-t border-border"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-foreground/10" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h3 className="text-foreground font-bold text-lg">Пригласить участника</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-secondary/60 rounded-xl px-3 py-2.5 border border-border">
            <Search size={15} className="text-muted-foreground shrink-0" />
            <input
              autoFocus={typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск контактов…"
              className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        {/* Contacts list */}
        <div className="overflow-y-auto max-h-72 px-2 pb-8">
          {(!filtered || filtered.length === 0) ? (
            <p className="text-center text-muted-foreground text-sm py-8">Контакты не найдены</p>
          ) : (
            filtered.map((c: { id: number; displayName?: string | null; username?: string | null }) => (
              <button
                key={c.id}
                onClick={() => handleInvite(c.id, c.displayName || c.username || "Пользователь")}
                disabled={inviting === c.id}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-secondary/60 transition-colors disabled:opacity-50"
              >
                <Avatar user={c as any} size={44} />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-foreground font-semibold text-sm truncate">{c.displayName}</p>
                  {c.username && <p className="text-muted-foreground text-xs truncate">@{c.username}</p>}
                </div>
                <div className="shrink-0">
                  {inviting === c.id ? (
                    <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
                  ) : (
                    <UserPlus size={17} className="text-muted-foreground" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Participant tile for group video calls
function ParticipantTile({
  stream,
  user,
  muted,
}: {
  stream: MediaStream | null;
  user?: any;
  muted?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const bg = user?.avatarColor || "#333";
  return (
    <div className="relative rounded-2xl overflow-hidden bg-neutral-900 aspect-video flex items-center justify-center">
      {stream ? (
        <video ref={videoRef} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ background: `radial-gradient(circle at center, ${bg}44, #111)` }}>
          <Avatar user={user} size={56} />
        </div>
      )}
      {user && (
        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full text-white text-xs font-medium">
          {user.displayName}
        </div>
      )}
    </div>
  );
}

export function ActiveCall() {
  const {
    activeCall, currentUserId, hangUp,
    localStream, remoteStream, remoteStreams,
    isScreenSharing, startScreenShare, stopScreenShare,
  } = useAppContext();

  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [isPipExpanded, setIsPipExpanded] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent).detail?.message as string | undefined;
      setCallError(msg || "Аудио/видео недоступно");
    };
    window.addEventListener("pulse:call-error", handler);
    return () => window.removeEventListener("pulse:call-error", handler);
  }, []);

  // Ringback tone for outgoing call (caller hears while waiting)
  useEffect(() => {
    const isOutgoingRinging =
      !!activeCall &&
      activeCall.status === "ringing" &&
      activeCall.callerId === currentUserId;
    if (!isOutgoingRinging) return;
    const stop = playRingbackTone();
    return stop;
  }, [activeCall?.id, activeCall?.status, activeCall?.callerId, currentUserId]);

  useEffect(() => {
    if (!activeCall || activeCall.status !== "active") return;
    setDuration(0);
    const interval = setInterval(() => setDuration((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, [activeCall?.id, activeCall?.status]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  // Remote audio — always use the dedicated <audio> element for both call types
  useEffect(() => {
    const audio = remoteAudioRef.current;
    if (!audio) return;
    if (remoteStream) {
      audio.srcObject = remoteStream;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay blocked — show unlock button
          setAudioUnlocked(false);
        });
      }
      setAudioUnlocked(true);
    } else {
      audio.srcObject = null;
    }
  }, [remoteStream]);

  // Remote video (video tracks only — audio is handled by the audio element above)
  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video) return;
    if (remoteStream) {
      video.srcObject = remoteStream;
      video.play().catch(() => {});
    } else {
      video.srcObject = null;
    }
  }, [remoteStream]);

  // Speaker toggle
  useEffect(() => {
    if (remoteAudioRef.current) remoteAudioRef.current.muted = isSpeakerOff;
  }, [isSpeakerOff]);

  const handleUnlockAudio = () => {
    const audio = remoteAudioRef.current;
    if (!audio) return;
    audio.play().then(() => setAudioUnlocked(true)).catch(() => {});
  };

  const handleToggleMute = () => {
    if (localStream) localStream.getAudioTracks().forEach((t) => { t.enabled = isMuted; });
    setIsMuted((p) => !p);
  };

  const handleToggleVideo = () => {
    if (localStream) localStream.getVideoTracks().forEach((t) => { t.enabled = isVideoOff; });
    setIsVideoOff((p) => !p);
  };

  const handleFlipCamera = () => {
    if (localStream) {
      const vt = localStream.getVideoTracks()[0];
      if (vt) {
        const current = vt.getSettings().facingMode;
        vt.applyConstraints({ facingMode: current === "environment" ? "user" : "environment" }).catch(() => {});
      }
    }
  };

  const formatDuration = (s: number) =>
    `${Math.floor(s / 3600) > 0 ? Math.floor(s / 3600) + ":" : ""}${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (!activeCall) return null;

  const isOutgoing = activeCall.callerId === currentUserId;
  const isGroup = remoteStreams.size > 1;

  /* ── OUTGOING / RINGING STATE ── */
  if (activeCall.status === "ringing" && isOutgoing) {
    const callee = activeCall.callee;
    const avatarBg = callee?.avatarColor || "#444";
    return (
      <AnimatePresence>
        <motion.div
          key="outgoing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-background"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 50% 30%, ${avatarBg}30 0%, transparent 65%)` }}
          />
          <div className="relative mb-8 z-10">
            <PulseRings color={avatarBg} />
            <motion.div
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-36 h-36 rounded-full flex items-center justify-center text-white font-bold text-6xl relative z-10 overflow-hidden shadow-2xl"
              style={{ backgroundColor: avatarBg }}
            >
              {callee?.avatarUrl ? (
                <img src={callee.avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              ) : (
                callee?.displayName?.[0]?.toUpperCase()
              )}
            </motion.div>
          </div>
          <h2 className="text-foreground text-3xl font-bold mb-2 z-10">{callee?.displayName}</h2>
          <motion.p
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="text-muted-foreground text-lg mb-16 z-10"
          >
            {activeCall.type === "video" ? "Видеозвонок…" : "Звоним…"}
          </motion.p>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={hangUp}
            className="z-10 w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.3)] hover:bg-red-600 transition-colors"
          >
            <PhoneOff size={30} />
          </motion.button>
          <p className="text-muted-foreground/60 text-sm mt-4 z-10">Нажмите чтобы отменить</p>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (activeCall.status !== "active") return null;
  const otherUser = isOutgoing ? activeCall.callee : activeCall.caller;
  const isVideo = activeCall.type === "video";
  const avatarBg = otherUser?.avatarColor || "#444";

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col overflow-hidden"
        >
          {/* Connection error banner */}
          {callError && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-yellow-500/30 text-yellow-600 text-xs font-medium shadow-lg"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              {callError}
              <button onClick={() => setCallError(null)} className="ml-1 opacity-60 hover:opacity-100">✕</button>
            </motion.div>
          )}

          {/* Audio unlock banner — shown when browser blocks autoplay */}
          {!audioUnlocked && remoteStream && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-10"
            >
              <button
                onClick={handleUnlockAudio}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg"
              >
                <Volume2 size={14} /> Включить звук
              </button>
            </motion.div>
          )}

          {/* ── VIDEO CALL ── */}
          {isVideo ? (
            <>
              {/* Remote video / group grid / placeholder */}
              <div className="absolute inset-0 bg-neutral-950">
                {isGroup ? (
                  <div className={`w-full h-full grid gap-1 p-1 ${remoteStreams.size === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                    {[...remoteStreams.entries()].map(([uid, stream]) => (
                      <ParticipantTile key={uid} stream={stream} />
                    ))}
                  </div>
                ) : remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-5 bg-background">
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: `radial-gradient(circle at 50% 40%, ${avatarBg}25 0%, transparent 60%)` }}
                    />
                    <motion.div className="relative z-10" animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 3, repeat: Infinity }}>
                      <PulseRings color={avatarBg} />
                      <div
                        className="w-32 h-32 rounded-full flex items-center justify-center text-white font-bold text-5xl relative z-10 overflow-hidden shadow-2xl"
                        style={{ backgroundColor: avatarBg }}
                      >
                        {otherUser?.avatarUrl ? (
                          <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          otherUser?.displayName?.[0]?.toUpperCase()
                        )}
                      </div>
                    </motion.div>
                    <p className="text-muted-foreground text-sm tracking-wide animate-pulse z-10">Ожидание видео…</p>
                  </div>
                )}
              </div>

              {/* Top bar */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pointer-events-none z-10" style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top, 0px))" }}>
                <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-white font-mono text-sm tabular-nums">
                  {formatDuration(duration)}
                </div>
                <div className="flex items-center gap-2">
                  {isScreenSharing && (
                    <div className="bg-blue-500/80 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-semibold flex items-center gap-1.5">
                      <Monitor size={12} />
                      Демонстрация экрана
                    </div>
                  )}
                  <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-sm font-medium">
                    {isGroup ? `${remoteStreams.size + 1} участника` : otherUser?.displayName}
                  </div>
                </div>
                <div className="w-24" />
              </div>

              {/* PiP local video */}
              <motion.div
                drag
                dragMomentum={false}
                dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
                dragElastic={0.08}
                style={{ position: "absolute", top: 72, right: 16, zIndex: 20 }}
                animate={{ width: isPipExpanded ? 160 : 100, height: isPipExpanded ? 220 : 140 }}
                className="cursor-grab active:cursor-grabbing"
              >
                <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-neutral-800">
                  {localStream && !isVideoOff ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${!isScreenSharing ? "scale-x-[-1]" : ""}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-700">
                      <CameraOff size={20} className="text-white/30" />
                    </div>
                  )}
                  {isScreenSharing && (
                    <div className="absolute inset-0 flex items-end justify-center pb-1">
                      <span className="text-white/60 text-[9px] font-medium bg-black/50 px-1.5 py-0.5 rounded-full">Экран</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setIsPipExpanded((p) => !p)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white/70 hover:text-white"
                >
                  <Maximize2 size={11} />
                </button>
              </motion.div>
            </>
          ) : (
            /* ── AUDIO CALL ── */
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 50% 30%, ${avatarBg}25 0%, transparent 65%)` }}
              />
              <div className="absolute inset-0 opacity-[0.025]"
                style={{
                  backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />

              {/* Group participants row */}
              {isGroup && (
                <div className="flex -space-x-3 mb-6 z-10">
                  {[...remoteStreams.keys()].slice(0, 5).map((uid) => (
                    <div key={uid} className="w-12 h-12 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-foreground text-lg font-bold overflow-hidden">
                      {uid}
                    </div>
                  ))}
                </div>
              )}

              <div className="relative mb-8 z-10">
                {!isGroup && <PulseRings color={avatarBg} />}
                <motion.div
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="w-36 h-36 rounded-full flex items-center justify-center text-white font-bold text-6xl relative z-10 overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.4)]"
                  style={{ backgroundColor: avatarBg }}
                >
                  {otherUser?.avatarUrl ? (
                    <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    otherUser?.displayName?.[0]?.toUpperCase()
                  )}
                </motion.div>
              </div>

              <h2 className="text-foreground text-3xl font-bold mb-1 z-10">
                {isGroup ? `Групповой звонок` : otherUser?.displayName}
              </h2>
              {isGroup && (
                <p className="text-muted-foreground text-sm mb-1 z-10">{remoteStreams.size + 1} участника</p>
              )}
              <p className="text-muted-foreground font-mono text-xl tabular-nums mb-10 z-10">{formatDuration(duration)}</p>

              <div className="z-10 mb-2 opacity-80">
                <SoundWaves active={!isMuted && remoteStreams.size > 0} />
              </div>
            </div>
          )}

          {/* ── CONTROL BAR ── */}
          <div className="absolute bottom-0 left-0 right-0 z-30">
            {/* Semi-transparent bg for control bar */}
            <div className={`absolute inset-0 ${isVideo ? "bg-black/40 backdrop-blur-md" : ""}`} />
            <div className="relative mx-auto max-w-sm px-4 pb-[env(safe-area-inset-bottom,2.5rem)] pt-4 flex flex-col items-center gap-3">
              {/* Secondary row: screen share + invite + speaker (video) */}
              <div className="flex items-center gap-3">
                {/* Screen share (video calls only) */}
                {isVideo && (
                  <ControlBtn
                    active={isScreenSharing}
                    activeColor="blue"
                    isVideo={isVideo}
                    onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                    label={isScreenSharing ? "Остановить показ экрана" : "Показать экран"}
                  >
                    {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
                  </ControlBtn>
                )}

                {/* Invite participant */}
                <ControlBtn
                  active={false}
                  activeColor="blue"
                  isVideo={isVideo}
                  onClick={() => setShowInvite(true)}
                  label="Пригласить участника"
                >
                  <UserPlus size={20} />
                </ControlBtn>

                {/* Speaker toggle (both audio and video calls) */}
                <ControlBtn
                  active={isSpeakerOff}
                  activeColor="red"
                  isVideo={isVideo}
                  onClick={() => setIsSpeakerOff((p) => !p)}
                  label={isSpeakerOff ? "Включить динамик" : "Выключить динамик"}
                >
                  {isSpeakerOff ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </ControlBtn>
              </div>

              {/* Main row */}
              <div className="flex items-center justify-center gap-4">
                {/* Mute */}
                <ControlBtn active={isMuted} activeColor="red" isVideo={isVideo} onClick={handleToggleMute} label={isMuted ? "Включить микр." : "Выключить микр."}>
                  {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                </ControlBtn>

                {/* End call */}
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={hangUp}
                  className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)] hover:bg-red-600 transition-colors"
                  title="Завершить"
                >
                  <PhoneOff size={26} />
                </motion.button>

                {/* Camera toggle (video) */}
                {isVideo && (
                  <>
                    <ControlBtn active={isVideoOff} activeColor="red" isVideo={isVideo} onClick={handleToggleVideo} label={isVideoOff ? "Включить камеру" : "Выключить камеру"}>
                      {isVideoOff ? <CameraOff size={22} /> : <Camera size={22} />}
                    </ControlBtn>

                    <ControlBtn active={false} activeColor="blue" isVideo={isVideo} onClick={handleFlipCamera} label="Перевернуть камеру">
                      <FlipHorizontal size={22} />
                    </ControlBtn>
                  </>
                )}

                {/* Mute button for audio-only: keep it in this row (no cam buttons) */}
                {/* Speaker for audio-only call is already in secondary row */}
              </div>
            </div>
          </div>

          {/* Remote audio — always present, handles both audio and video calls */}
          <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />
        </motion.div>
      </AnimatePresence>

      {/* Invite modal */}
      <AnimatePresence>
        {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
      </AnimatePresence>
    </>
  );
}

function ControlBtn({
  children, active, activeColor, isVideo, onClick, label,
}: {
  children: React.ReactNode;
  active: boolean;
  activeColor: "red" | "blue";
  isVideo: boolean;
  onClick: () => void;
  label: string;
}) {
  const activeClass = activeColor === "red"
    ? "bg-red-500/30 text-red-400"
    : "bg-blue-500/30 text-blue-400";
  const inactiveClass = isVideo
    ? "bg-white/15 text-white hover:bg-white/25"
    : "bg-secondary text-foreground hover:bg-secondary/80";

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      title={label}
      className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${active ? activeClass : inactiveClass}`}
    >
      {children}
    </motion.button>
  );
}
