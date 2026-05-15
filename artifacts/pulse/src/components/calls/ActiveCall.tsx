import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, PhoneOff, Camera, CameraOff,
  Volume2, VolumeX, FlipHorizontal, Maximize2,
} from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";

function SoundWaves({ active }: { active: boolean }) {
  return (
    <div className="flex items-end justify-center gap-[3px] h-10">
      {[0.4, 0.7, 1, 0.85, 0.55, 0.9, 0.65, 1, 0.75, 0.45, 0.8, 0.6].map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-primary"
          animate={active ? {
            scaleY: [h * 0.3, h, h * 0.5, h * 0.8, h * 0.3],
          } : { scaleY: 0.15 }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.08,
            ease: "easeInOut",
          }}
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
          transition={{
            duration: 2.4,
            repeat: Infinity,
            delay: i * 0.7,
            ease: "easeOut",
          }}
        />
      ))}
    </>
  );
}

export function ActiveCall() {
  const { activeCall, currentUserId, hangUp, localStream, remoteStream } = useAppContext();

  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [isPipExpanded, setIsPipExpanded] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

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

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  const handleToggleMute = () => {
    if (localStream) localStream.getAudioTracks().forEach((t) => { t.enabled = isMuted; });
    setIsMuted((p) => !p);
  };

  const handleToggleVideo = () => {
    if (localStream) localStream.getVideoTracks().forEach((t) => { t.enabled = isVideoOff; });
    setIsVideoOff((p) => !p);
  };

  const formatDuration = (s: number) =>
    `${Math.floor(s / 3600) > 0 ? Math.floor(s / 3600) + ":" : ""}${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (!activeCall) return null;

  const isOutgoing = activeCall.callerId === currentUserId;

  /* ── OUTGOING / RINGING STATE (caller waiting for answer) ── */
  if (activeCall.status === "ringing" && isOutgoing) {
    const callee = activeCall.callee;
    const avatarBgRing = callee?.avatarColor || "#444";
    return (
      <AnimatePresence>
        <motion.div
          key="outgoing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
          style={{ background: `radial-gradient(ellipse at 50% 30%, ${avatarBgRing}33 0%, #0a0a0a 70%)` }}
        >
          <div className="relative mb-8">
            <PulseRings color={avatarBgRing} />
            <motion.div
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-36 h-36 rounded-full flex items-center justify-center text-white font-bold text-6xl relative z-10 overflow-hidden shadow-2xl"
              style={{ backgroundColor: avatarBgRing }}
            >
              {callee?.avatarUrl ? (
                <img src={callee.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                callee?.displayName?.[0]?.toUpperCase()
              )}
            </motion.div>
          </div>
          <h2 className="text-white text-3xl font-bold mb-2 drop-shadow-lg">{callee?.displayName}</h2>
          <motion.p
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="text-white/50 text-lg mb-16"
          >
            {activeCall.type === "video" ? "Видеозвонок…" : "Звоним…"}
          </motion.p>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={hangUp}
            className="w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.5)] hover:bg-red-600 transition-colors"
          >
            <PhoneOff size={30} />
          </motion.button>
          <p className="text-white/30 text-sm mt-4">Нажмите чтобы отменить</p>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (activeCall.status !== "active") return null;
  const otherUser = isOutgoing ? activeCall.callee : activeCall.caller;
  const isVideo = activeCall.type === "video";
  const avatarBg = otherUser?.avatarColor || "#444";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      >
        {/* ── VIDEO CALL ── */}
        {isVideo ? (
          <>
            {/* Remote video / placeholder */}
            <div className="absolute inset-0 bg-zinc-950">
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center gap-5"
                  style={{
                    background: `radial-gradient(circle at 50% 40%, ${avatarBg}44 0%, #0a0a0a 70%)`,
                  }}
                >
                  <motion.div
                    className="relative"
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <PulseRings color={avatarBg} />
                    <div
                      className="w-32 h-32 rounded-full flex items-center justify-center text-white font-bold text-5xl relative z-10 overflow-hidden shadow-2xl"
                      style={{ backgroundColor: avatarBg }}
                    >
                      {otherUser?.avatarUrl ? (
                        <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        otherUser?.displayName?.[0]?.toUpperCase()
                      )}
                    </div>
                  </motion.div>
                  <p className="text-white/50 text-sm tracking-wide animate-pulse">Ожидание видео…</p>
                </div>
              )}
            </div>

            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-safe pt-5 pointer-events-none z-10">
              <div className="bg-black/50 backdrop-blur-md px-4 py-1.5 rounded-full text-white font-mono text-sm tabular-nums">
                {formatDuration(duration)}
              </div>
              <div className="bg-black/50 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-sm font-medium">
                {otherUser?.displayName}
              </div>
              <div className="w-24" />
            </div>

            {/* PiP local video */}
            <motion.div
              drag
              dragMomentum={false}
              className="absolute top-16 right-4 z-20 cursor-grab active:cursor-grabbing"
              animate={{ width: isPipExpanded ? 160 : 100, height: isPipExpanded ? 220 : 140 }}
            >
              <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-zinc-900">
                {localStream && !isVideoOff ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                    <CameraOff size={20} className="text-white/30" />
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
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{
              background: `radial-gradient(ellipse at 50% 30%, ${avatarBg}33 0%, #0d0d0d 65%)`,
            }}
          >
            {/* Subtle grid lines */}
            <div className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />

            {/* Avatar with rings */}
            <div className="relative mb-8 z-10">
              <PulseRings color={avatarBg} />
              <motion.div
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="w-36 h-36 rounded-full flex items-center justify-center text-white font-bold text-6xl relative z-10 overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)]"
                style={{ backgroundColor: avatarBg }}
              >
                {otherUser?.avatarUrl ? (
                  <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  otherUser?.displayName?.[0]?.toUpperCase()
                )}
              </motion.div>
            </div>

            <h2 className="text-white text-3xl font-bold mb-1 z-10 drop-shadow-lg">{otherUser?.displayName}</h2>
            <p className="text-white/50 font-mono text-xl tabular-nums mb-10 z-10">{formatDuration(duration)}</p>

            {/* Sound waves */}
            <div className="z-10 mb-2 opacity-80">
              <SoundWaves active={!isMuted && !!remoteStream} />
            </div>
          </div>
        )}

        {/* ── CONTROL BAR ── */}
        <div className="absolute bottom-0 left-0 right-0 z-30">
          <div className="mx-auto max-w-sm px-6 pb-10 pt-6 flex items-center justify-center gap-4">
            {/* Mute */}
            <ControlBtn
              active={isMuted}
              activeColor="red"
              onClick={handleToggleMute}
              label={isMuted ? "Включить микр." : "Выключить микр."}
            >
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </ControlBtn>

            {/* Speaker (audio only) */}
            {!isVideo && (
              <ControlBtn
                active={isSpeakerOff}
                activeColor="red"
                onClick={() => setIsSpeakerOff((p) => !p)}
                label="Динамик"
              >
                {isSpeakerOff ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </ControlBtn>
            )}

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
                <ControlBtn
                  active={isVideoOff}
                  activeColor="red"
                  onClick={handleToggleVideo}
                  label={isVideoOff ? "Включить камеру" : "Выключить камеру"}
                >
                  {isVideoOff ? <CameraOff size={22} /> : <Camera size={22} />}
                </ControlBtn>

                <ControlBtn
                  active={false}
                  activeColor="blue"
                  onClick={() => {
                    if (localStream) {
                      const vt = localStream.getVideoTracks()[0];
                      if (vt && "facingMode" in vt.getSettings()) {
                        vt.applyConstraints({ facingMode: { exact: "environment" } }).catch(() => {});
                      }
                    }
                  }}
                  label="Перевернуть камеру"
                >
                  <FlipHorizontal size={22} />
                </ControlBtn>
              </>
            )}
          </div>
        </div>

        {/* Hidden remote audio for audio calls */}
        {!isVideo && (
          <audio
            ref={remoteAudioRef}
            autoPlay
            style={{ display: "none" }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function ControlBtn({
  children, active, activeColor, onClick, label,
}: {
  children: React.ReactNode;
  active: boolean;
  activeColor: "red" | "blue";
  onClick: () => void;
  label: string;
}) {
  const activeClass = activeColor === "red"
    ? "bg-red-500/20 text-red-400"
    : "bg-blue-500/20 text-blue-400";

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      title={label}
      className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
        active ? activeClass : "bg-white/10 text-white hover:bg-white/20"
      }`}
    >
      {children}
    </motion.button>
  );
}
