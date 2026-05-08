import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Video, Mic, MicOff, PhoneOff, Camera, CameraOff, Volume2 } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { useUpdateCallStatus, Call } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function ActiveCall() {
  const { activeCall, setActiveCall, currentUserId } = useAppContext();
  const updateCall = useUpdateCallStatus();
  const queryClient = useQueryClient();
  
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    if (!activeCall || activeCall.status !== "active") return;
    const interval = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall]);

  if (!activeCall || activeCall.status !== "active") return null;

  const isOutgoing = activeCall.callerId === currentUserId;
  const otherUser = isOutgoing ? activeCall.callee : activeCall.caller;
  const isVideo = activeCall.type === "video";

  const handleHangUp = () => {
    updateCall.mutate({ callId: activeCall.id, data: { status: "ended" } }, {
      onSuccess: () => {
        setActiveCall(null);
        queryClient.invalidateQueries({ queryKey: ["/api/calls"] });
      }
    });
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col"
      >
        {isVideo ? (
          <div className="flex-1 relative bg-black flex items-center justify-center">
            {!isVideoOff ? (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-900/40 flex items-center justify-center">
                <div className="text-white/20 animate-pulse text-xl font-bold tracking-widest uppercase">
                  Connected
                </div>
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full overflow-hidden" style={{ backgroundColor: otherUser?.avatarColor || "#333" }}>
                {otherUser?.avatarUrl ? (
                  <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                    {otherUser?.displayName?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            )}
            <div className="absolute top-6 right-6 w-32 h-48 bg-zinc-800 rounded-xl overflow-hidden border-2 border-border shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-tr from-zinc-700 to-zinc-600 flex items-center justify-center">
                <Camera size={24} className="text-white/50" />
              </div>
            </div>
            <div className="absolute top-6 left-6 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-white font-medium">
              {formatDuration(duration)}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" style={{ animationDuration: "3s" }} />
              <div className="absolute inset-[-20px] bg-primary/10 rounded-full animate-ping" style={{ animationDuration: "3s", animationDelay: "0.5s" }} />
              <div 
                className="w-40 h-40 rounded-full flex items-center justify-center text-white font-bold text-6xl relative z-10 shadow-[0_0_50px_rgba(0,188,212,0.3)] border-4 border-background"
                style={{ backgroundColor: otherUser?.avatarColor || "#333" }}
              >
                {otherUser?.avatarUrl ? (
                  <img src={otherUser.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  otherUser?.displayName?.[0]?.toUpperCase()
                )}
              </div>
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-2">{otherUser?.displayName}</h2>
            <p className="text-xl text-primary font-mono tabular-nums">{formatDuration(duration)}</p>
          </div>
        )}

        {/* Controls */}
        <div className="h-32 bg-card/50 backdrop-blur-xl border-t border-border flex items-center justify-center gap-6 pb-6">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isMuted ? "bg-secondary text-foreground" : "bg-primary/20 text-primary hover:bg-primary/30"}`}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          
          {isVideo && (
            <button 
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? "bg-secondary text-foreground" : "bg-primary/20 text-primary hover:bg-primary/30"}`}
            >
              {isVideoOff ? <CameraOff size={24} /> : <Camera size={24} />}
            </button>
          )}
          
          {!isVideo && (
            <button className="w-14 h-14 rounded-full flex items-center justify-center bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
              <Volume2 size={24} />
            </button>
          )}

          <button 
            onClick={handleHangUp}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-[0_0_20px_rgba(220,38,38,0.4)]"
          >
            <PhoneOff size={28} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
