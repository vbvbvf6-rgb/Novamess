import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { Call } from "@workspace/api-client-react";
import { getSavedAccounts, SavedAccount, MAX_ACCOUNTS } from "@/lib/accounts";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
];

interface AppState {
  currentUserId: number;
  selectedChatId: number | null;
  setSelectedChatId: (id: number | null) => void;
  activeCall: Call | null;
  setActiveCall: (call: Call | null) => void;
  isDark: boolean;
  toggleTheme: () => void;
  logout: () => void;
  typingByChat: Record<number, string[]>;
  setTypingForChat: (chatId: number, names: string[]) => void;
  savedAccounts: SavedAccount[];
  switchAccount: (userId: number) => void;
  removeAccount: (userId: number) => void;
  openAddAccount: () => void;
  canAddAccount: boolean;
  startCall: (calleeId: number, chatId: number | null, type: "audio" | "video") => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  hangUp: () => Promise<void>;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

const AppContext = createContext<AppState | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
  onLogout: () => void;
  onSwitchAccount: (userId: number) => void;
  onRemoveAccount: (userId: number) => void;
  onOpenAddAccount: () => void;
}

export function AppProvider({ children, onLogout, onSwitchAccount, onRemoveAccount, onOpenAddAccount }: AppProviderProps) {
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [typingByChat, setTypingByChat] = useState<Record<number, string[]>>({});
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => getSavedAccounts());
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem("pulse-theme");
    return stored !== "light";
  });
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const currentUserId = Number(localStorage.getItem("pulse-user-id") || "1");
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const activeCallRef = useRef<Call | null>(null);
  activeCallRef.current = activeCall;
  const pendingSignalsRef = useRef<{ type: string; payload: any }[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
    localStorage.setItem("pulse-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);
  const logout = () => { onLogout(); };

  const getUserHeaders = useCallback((): Record<string, string> => ({
    "Content-Type": "application/json",
    "x-user-id": String(currentUserIdRef.current),
  }), []);

  const cleanupCall = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    pendingSignalsRef.current = [];
  }, []);

  const applySignal = useCallback(async (pc: RTCPeerConnection, signal: { type: string; payload: any }) => {
    try {
      const callId = activeCallRef.current?.id;
      if (!callId) return;
      if (signal.type === "offer") {
        if (pc.signalingState !== "stable") return;
        await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await fetch(`/api/calls/${callId}/signal`, {
          method: "POST",
          headers: getUserHeaders(),
          body: JSON.stringify({ type: "answer", payload: answer }),
        });
      } else if (signal.type === "answer") {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
        }
      } else if (signal.type === "ice") {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
        }
      }
    } catch (err) {
      console.warn("applySignal error:", err);
    }
  }, [getUserHeaders]);

  const createPeer = useCallback((callId: number): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        fetch(`/api/calls/${callId}/signal`, {
          method: "POST",
          headers: getUserHeaders(),
          body: JSON.stringify({ type: "ice", payload: e.candidate }),
        }).catch(() => {});
      }
    };

    pc.ontrack = (e) => {
      if (e.streams?.[0]) setRemoteStream(e.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        cleanupCall();
      }
    };

    return pc;
  }, [getUserHeaders, cleanupCall]);

  const startCall = useCallback(async (calleeId: number, chatId: number | null, type: "audio" | "video") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const res = await fetch("/api/calls", {
        method: "POST",
        headers: getUserHeaders(),
        body: JSON.stringify({ calleeId, ...(chatId != null ? { chatId } : {}), type }),
      });
      if (!res.ok) throw new Error("Failed to create call");
      const call: Call = await res.json();

      activeCallRef.current = call;
      setActiveCall(call);

      const pc = createPeer(call.id);
      peerRef.current = pc;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await fetch(`/api/calls/${call.id}/signal`, {
        method: "POST",
        headers: getUserHeaders(),
        body: JSON.stringify({ type: "offer", payload: offer }),
      });
    } catch (err: any) {
      console.error("startCall error:", err);
      cleanupCall();
      throw err;
    }
  }, [getUserHeaders, createPeer, cleanupCall]);

  const acceptCall = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: call.type === "video" });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeer(call.id);
      peerRef.current = pc;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const pending = pendingSignalsRef.current.splice(0);
      for (const signal of pending) {
        await applySignal(pc, signal);
      }

      await fetch(`/api/calls/${call.id}`, {
        method: "PUT",
        headers: getUserHeaders(),
        body: JSON.stringify({ status: "active" }),
      });
      const updatedCall = { ...call, status: "active" as const };
      activeCallRef.current = updatedCall;
      setActiveCall(updatedCall);
    } catch (err) {
      console.error("acceptCall error:", err);
      cleanupCall();
    }
  }, [createPeer, applySignal, getUserHeaders, cleanupCall]);

  const declineCall = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call) return;
    try {
      await fetch(`/api/calls/${call.id}`, {
        method: "PUT",
        headers: getUserHeaders(),
        body: JSON.stringify({ status: "declined" }),
      });
    } catch {}
    cleanupCall();
  }, [getUserHeaders, cleanupCall]);

  const hangUp = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call) return;
    try {
      await fetch(`/api/calls/${call.id}`, {
        method: "PUT",
        headers: getUserHeaders(),
        body: JSON.stringify({ status: "ended" }),
      });
    } catch {}
    cleanupCall();
  }, [getUserHeaders, cleanupCall]);

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let dead = false;

    const connect = () => {
      if (dead) return;
      const uid = currentUserIdRef.current;
      es = new EventSource(`/api/users/me/events?_uid=${uid}`);

      es.addEventListener("incoming-call", (e: MessageEvent) => {
        try {
          const call = JSON.parse(e.data);
          setActiveCall(call);
        } catch {}
      });

      es.addEventListener("call-accepted", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setActiveCall(prev => prev ? { ...prev, status: "active", ...data } : null);
        } catch {}
      });

      es.addEventListener("call-declined", () => {
        cleanupCall();
      });

      es.addEventListener("call-ended", () => {
        cleanupCall();
      });

      es.addEventListener("webrtc-signal", async (e: MessageEvent) => {
        try {
          const signal = JSON.parse(e.data);
          if (peerRef.current) {
            await applySignal(peerRef.current, signal);
          } else {
            pendingSignalsRef.current.push(signal);
          }
        } catch {}
      });

      es.onerror = () => {
        es?.close();
        es = null;
        if (!dead) retryTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      dead = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      es?.close();
    };
  }, [currentUserId, applySignal, cleanupCall]);

  const setTypingForChat = useCallback((chatId: number, names: string[]) => {
    setTypingByChat(prev => {
      const current = prev[chatId] || [];
      if (JSON.stringify(current) === JSON.stringify(names)) return prev;
      if (names.length === 0) {
        const next = { ...prev };
        delete next[chatId];
        return next;
      }
      return { ...prev, [chatId]: names };
    });
  }, []);

  const switchAccount = useCallback((userId: number) => {
    setSavedAccounts(getSavedAccounts());
    onSwitchAccount(userId);
  }, [onSwitchAccount]);

  const removeAccount = useCallback((userId: number) => {
    onRemoveAccount(userId);
    setSavedAccounts(getSavedAccounts());
  }, [onRemoveAccount]);

  const openAddAccount = useCallback(() => {
    onOpenAddAccount();
  }, [onOpenAddAccount]);

  const canAddAccount = savedAccounts.length < MAX_ACCOUNTS;

  const state: AppState = {
    currentUserId,
    selectedChatId,
    setSelectedChatId,
    activeCall,
    setActiveCall,
    isDark,
    toggleTheme,
    logout,
    typingByChat,
    setTypingForChat,
    savedAccounts,
    switchAccount,
    removeAccount,
    openAddAccount,
    canAddAccount,
    startCall,
    acceptCall,
    declineCall,
    hangUp,
    localStream,
    remoteStream,
  };

  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
