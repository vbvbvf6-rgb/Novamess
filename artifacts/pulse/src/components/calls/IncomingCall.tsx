import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { playRingtone, getSelectedRingtone } from "@/lib/ringtones";

export function IncomingCall() {
  const { activeCall, currentUserId, acceptCall, declineCall } = useAppContext();

  const visible =
    !!activeCall &&
    activeCall.status === "ringing" &&
    activeCall.callerId !== currentUserId;

  useEffect(() => {
    if (!visible) return;
    const stop = playRingtone(getSelectedRingtone());
    return stop;
  }, [visible]);

  if (!activeCall || !visible) return null;

  const isVideo = activeCall.type === "video";
  const caller = activeCall.caller;
  const avatarBg = caller?.avatarColor || "#444";

  return (
    <AnimatePresence>
      <motion.div
        key="incoming"
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] w-[92%] max-w-sm"
      >
        <div className="relative rounded-[28px] overflow-hidden bg-card border border-border shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          {/* Colored accent strip at top */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: `linear-gradient(90deg, transparent, ${avatarBg}cc, transparent)` }}
          />
          {/* Subtle color tint overlay */}
          <div
            className="absolute inset-0 pointer-events-none rounded-[28px]"
            style={{ background: `radial-gradient(ellipse at 20% 0%, ${avatarBg}20 0%, transparent 60%)` }}
          />

          <div className="relative px-6 pt-6 pb-5 flex items-center gap-5">
            {/* Avatar + pulse animation */}
            <div className="relative shrink-0">
              <motion.div
                className="absolute inset-[-8px] rounded-full"
                style={{ backgroundColor: avatarBg + "30" }}
                animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-[-16px] rounded-full"
                style={{ backgroundColor: avatarBg + "18" }}
                animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: 0.3 }}
              />
              <div
                className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-white font-bold text-2xl relative z-10 overflow-hidden shadow-lg"
                style={{ backgroundColor: avatarBg }}
              >
                {caller?.avatarUrl ? (
                  <img src={caller.avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  caller?.displayName?.[0]?.toUpperCase() ?? "?"
                )}
              </div>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-bold text-[17px] truncate leading-tight">
                {caller?.displayName ?? "Неизвестно"}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-green-500"
                />
                <span className="text-muted-foreground text-[13px]">
                  {isVideo ? "Входящий видеозвонок" : "Входящий звонок"}
                </span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="relative flex gap-3 px-6 pb-6">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => declineCall()}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white transition-colors font-semibold text-sm border border-red-500/20"
            >
              <PhoneOff size={18} />
              Отклонить
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => acceptCall()}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-500 text-white hover:bg-green-400 transition-colors font-semibold text-sm shadow-[0_0_20px_rgba(34,197,94,0.35)]"
            >
              {isVideo ? <Video size={18} /> : <Phone size={18} />}
              Принять
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
