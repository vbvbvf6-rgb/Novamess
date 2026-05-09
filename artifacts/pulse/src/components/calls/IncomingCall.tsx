import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";

export function IncomingCall() {
  const { activeCall, currentUserId, acceptCall, declineCall } = useAppContext();

  if (!activeCall || activeCall.status !== "ringing" || activeCall.callerId === currentUserId) return null;

  const isVideo = activeCall.type === "video";
  const caller = activeCall.caller;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-md bg-card/95 backdrop-blur-xl border border-border shadow-[0_10px_40px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent animate-pulse" />

        <div className="p-6 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl relative z-10 shadow-lg border-2 border-background overflow-hidden"
              style={{ backgroundColor: caller?.avatarColor || "#333" }}
            >
              {caller?.avatarUrl ? (
                <img src={caller.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                caller?.displayName?.[0]?.toUpperCase()
              )}
            </div>
          </div>

          <h3 className="text-xl font-bold text-foreground mb-1">{caller?.displayName}</h3>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            {isVideo ? <Video size={16} /> : <Phone size={16} />}
            {isVideo ? "Входящий видеозвонок..." : "Входящий звонок..."}
          </p>

          <div className="flex items-center justify-center gap-8 mt-8 w-full">
            <button onClick={() => declineCall()} className="flex flex-col items-center gap-2 group">
              <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center group-hover:bg-destructive group-hover:text-white transition-colors">
                <PhoneOff size={24} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Отклонить</span>
            </button>

            <button onClick={() => acceptCall()} className="flex flex-col items-center gap-2 group">
              <div className="w-14 h-14 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)] animate-pulse">
                {isVideo ? <Video size={24} /> : <Phone size={24} className="animate-bounce" />}
              </div>
              <span className="text-xs font-medium text-muted-foreground">Принять</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
