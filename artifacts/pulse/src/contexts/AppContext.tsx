import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Call } from "@workspace/api-client-react";
import { getSavedAccounts, SavedAccount, MAX_ACCOUNTS } from "@/lib/accounts";

// Free STUN (NAT traversal discovery) + Free TURN relay via Open Relay Project.
// TURN is essential for users behind symmetric NAT (mobile networks, corporate routers etc).
// Open Relay Project: https://www.metered.ca/tools/openrelay/ — completely free, no signup.
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:openrelay.metered.ca:80" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turns:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

function createSilentStream(): MediaStream {
  try {
    const ac = new AudioContext();
    const dest = ac.createMediaStreamDestination();
    return dest.stream;
  } catch {
    return new MediaStream();
  }
}

export interface AppState {
  currentUserId: number;
  selectedChatId: number | null;
  setSelectedChatId: (id: number | null) => void;
  activeCall: Call | null;
  setActiveCall: (call: Call | null) => void;
  isDark: boolean;
  toggleTheme: () => void;
  logout: () => void;
  typingByChat: Record<number, string[]>;
  typingTypeByChat: Record<number, string>;
  setTypingForChat: (chatId: number, names: string[], typingType?: string) => void;
  savedAccounts: SavedAccount[];
  switchAccount: (userId: number) => void;
  removeAccount: (userId: number) => void;
  openAddAccount: () => void;
  canAddAccount: boolean;
  startCall: (calleeId: number, chatId: number | null, type: "audio" | "video") => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  hangUp: () => Promise<void>;
  inviteToCall: (inviteeId: number) => Promise<void>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  remoteStreams: Map<number, MediaStream>;
  isScreenSharing: boolean;
  callParticipantIds: number[];
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
  const [typingTypeByChat, setTypingTypeByChat] = useState<Record<number, string>>({});
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => getSavedAccounts());
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem("pulse-theme");
    return stored !== "light";
  });
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<number, MediaStream>>(new Map());
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const currentUserId = Number(sessionStorage.getItem("pulse-user-id") || "1");
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  // ── refs ─────────────────────────────────────────────────────────────────
  const activeCallRef = useRef<Call | null>(null);
  activeCallRef.current = activeCall;

  // groupRoomId = the Socket.IO room for this call session (= original callId)
  const groupRoomIdRef = useRef<number | null>(null);

  // userId → RTCPeerConnection for every remote participant
  const peersRef = useRef<Map<number, RTCPeerConnection>>(new Map());

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Signals that arrived before the peer was created — keyed by fromUserId
  const pendingSignalsRef = useRef<Map<number, { type: string; sdp?: string; candidate?: RTCIceCandidateInit }[]>>(new Map());

  const socketRef = useRef<Socket | null>(null);

  // ── theme ─────────────────────────────────────────────────────────────────
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

  const toggleTheme = () => setIsDark((p) => !p);
  const logout = () => { onLogout(); };

  const getUserHeaders = useCallback((): Record<string, string> => {
    const token = sessionStorage.getItem("pulse-token");
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }, []);

  // ── socket ────────────────────────────────────────────────────────────────
  const getSocket = useCallback((): Socket => {
    if (socketRef.current?.connected) return socketRef.current;
    const token = sessionStorage.getItem("pulse-token");
    const sock = io("/", {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
    });
    socketRef.current = sock;
    return sock;
  }, []);

  // ── cleanup ───────────────────────────────────────────────────────────────
  const cleanupCall = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    const roomId = groupRoomIdRef.current;
    if (roomId && socketRef.current) {
      socketRef.current.emit("leave-call", { callId: roomId });
      socketRef.current.off("webrtc-signal");
      socketRef.current.off("peer-joined");
      socketRef.current.off("peers-present");
      socketRef.current.off("peer-left");
    }
    groupRoomIdRef.current = null;

    peersRef.current.forEach((pc) => { try { pc.close(); } catch {} });
    peersRef.current.clear();

    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    pendingSignalsRef.current.clear();

    setLocalStream(null);
    setRemoteStreams(new Map());
    setIsScreenSharing(false);
    setActiveCall(null);
  }, []);

  // ── peer factory ──────────────────────────────────────────────────────────
  const createPeer = useCallback((targetUserId: number, roomId: number): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit("webrtc-signal", {
          callId: roomId,
          targetUserId,
          signal: { type: "ice", candidate: e.candidate.toJSON() },
        });
      }
    };

    pc.ontrack = (e) => {
      if (e.streams?.[0]) {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(targetUserId, e.streams[0]);
          return next;
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "disconnected" || state === "failed" || state === "closed") {
        peersRef.current.delete(targetUserId);
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(targetUserId);
          return next;
        });
        if (peersRef.current.size === 0 && state === "failed") {
          cleanupCall();
        }
      }
    };

    return pc;
  }, [cleanupCall]);

  // ── signal handler ────────────────────────────────────────────────────────
  const applySignal = useCallback(async (
    fromUserId: number,
    signal: { type: string; sdp?: string; candidate?: RTCIceCandidateInit },
    roomId: number,
  ) => {
    try {
      let pc = peersRef.current.get(fromUserId);
      if (!pc) {
        // Peer not yet created — create it and buffer this signal
        pc = createPeer(fromUserId, roomId);
        peersRef.current.set(fromUserId, pc);
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((t) => pc!.addTrack(t, localStreamRef.current!));
        }
        // Flush any earlier pending signals for this user
        const pending = pendingSignalsRef.current.get(fromUserId) || [];
        pendingSignalsRef.current.delete(fromUserId);
        for (const s of pending) await applySignal(fromUserId, s, roomId);
      }

      if (signal.type === "offer") {
        if (pc.signalingState !== "stable") return;
        await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: signal.sdp }));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.emit("webrtc-signal", {
          callId: roomId,
          targetUserId: fromUserId,
          signal: { type: "answer", sdp: answer.sdp },
        });
      } else if (signal.type === "answer") {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: signal.sdp }));
        }
      } else if (signal.type === "ice" && signal.candidate) {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } else {
          // Queue ICE for after remote description is set
          const arr = pendingSignalsRef.current.get(fromUserId) || [];
          arr.push(signal);
          pendingSignalsRef.current.set(fromUserId, arr);
        }
      }
    } catch (err) {
      console.warn("applySignal error:", err);
    }
  }, [createPeer]);

  // ── setup socket listeners for an active call ────────────────────────────
  const setupCallSocket = useCallback((sock: Socket, roomId: number) => {
    sock.off("webrtc-signal");
    sock.off("peer-joined");
    sock.off("peers-present");
    sock.off("peer-left");

    sock.on("webrtc-signal", async ({ signal, fromUserId }: { signal: { type: string; sdp?: string; candidate?: RTCIceCandidateInit }; fromUserId: number }) => {
      await applySignal(fromUserId, signal, roomId);
    });

    // Another user just joined our room — we (as the existing member) send them an offer
    // IMPORTANT: skip if we already have a peer for this user (e.g. we already sent them an offer
    // as part of startCall — creating a second peer overwrites the first and breaks signaling).
    sock.on("peer-joined", async ({ userId: newUserId }: { userId: number; callId: number }) => {
      if (newUserId === currentUserIdRef.current) return;
      if (peersRef.current.has(newUserId)) return; // already negotiating — don't duplicate
      const pc = createPeer(newUserId, roomId);
      peersRef.current.set(newUserId, pc);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sock.emit("webrtc-signal", {
        callId: roomId,
        targetUserId: newUserId,
        signal: { type: "offer", sdp: offer.sdp },
      });
    });

    // We just joined and there are existing peers — they will send us offers,
    // but we pre-create peer slots so signals can be routed
    sock.on("peers-present", ({ userIds }: { userIds: number[]; callId: number }) => {
      for (const uid of userIds) {
        if (uid === currentUserIdRef.current) continue;
        if (!peersRef.current.has(uid)) {
          const pc = createPeer(uid, roomId);
          peersRef.current.set(uid, pc);
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
          }
        }
      }
    });

    sock.on("peer-left", ({ userId: leftUserId }: { userId: number }) => {
      const pc = peersRef.current.get(leftUserId);
      if (pc) { try { pc.close(); } catch {} }
      peersRef.current.delete(leftUserId);
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(leftUserId);
        return next;
      });
    });
  }, [applySignal, createPeer]);

  // ── startCall ─────────────────────────────────────────────────────────────
  const startCall = useCallback(async (calleeId: number, chatId: number | null, type: "audio" | "video") => {
    // 1. Get media — always falls back to silent stream, never throws
    let stream: MediaStream;
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
      } else {
        stream = createSilentStream();
      }
    } catch (mediaErr: any) {
      if (type === "video" && (mediaErr.name === "NotFoundError" || mediaErr.name === "DevicesNotFoundError")) {
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); }
        catch { stream = createSilentStream(); }
      } else {
        stream = createSilentStream();
      }
    }
    localStreamRef.current = stream;
    setLocalStream(stream);

    // 2. Create the call record via API — this is the fatal step
    let call: Call;
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: getUserHeaders(),
        body: JSON.stringify({ calleeId, ...(chatId != null ? { chatId } : {}), type }),
      });
      if (!res.ok) throw new Error("Failed to create call");
      call = await res.json();
    } catch (err) {
      console.error("startCall: API error", err);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
      throw err;
    }

    // 3. Show call UI immediately — from here, WebRTC errors must NOT abort the call
    activeCallRef.current = call;
    setActiveCall(call);
    groupRoomIdRef.current = call.id;

    // 4. Ring timeout — mark as missed if callee doesn't answer in 60 s
    ringTimeoutRef.current = setTimeout(async () => {
      if (activeCallRef.current?.id === call.id && activeCallRef.current?.status === "ringing") {
        try {
          await fetch(`/api/calls/${call.id}`, {
            method: "PUT",
            headers: getUserHeaders(),
            body: JSON.stringify({ status: "missed" }),
          });
        } catch {}
        cleanupCall();
      }
    }, 60_000);

    // 5. Socket.IO + WebRTC — non-fatal; call UI stays even if this fails
    try {
      const sock = getSocket();
      setupCallSocket(sock, call.id);
      sock.emit("join-call", { callId: call.id });

      const pc = createPeer(calleeId, call.id);
      peersRef.current.set(calleeId, pc);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sock.emit("webrtc-signal", {
        callId: call.id,
        targetUserId: calleeId,
        signal: { type: "offer", sdp: offer.sdp },
      });
    } catch (rtcErr) {
      console.warn("startCall: WebRTC setup failed (call UI still active):", rtcErr);
    }
  }, [getUserHeaders, createPeer, cleanupCall, getSocket, setupCallSocket]);

  // ── acceptCall ────────────────────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call) return;
    if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }

    // 1. Get media — never throws
    let stream: MediaStream;
    try {
      stream = navigator.mediaDevices?.getUserMedia
        ? await navigator.mediaDevices.getUserMedia({ audio: true, video: call.type === "video" })
        : createSilentStream();
    } catch { stream = createSilentStream(); }
    localStreamRef.current = stream;
    setLocalStream(stream);

    // 2. Update call status via API — fatal if this fails
    try {
      await fetch(`/api/calls/${call.id}`, {
        method: "PUT",
        headers: getUserHeaders(),
        body: JSON.stringify({ status: "active" }),
      });
    } catch (err) {
      console.error("acceptCall: API error", err);
      cleanupCall();
      return;
    }

    // 3. Show active call UI
    const updatedCall = { ...call, status: "active" as const };
    activeCallRef.current = updatedCall;
    setActiveCall(updatedCall);

    // 4. Socket.IO + WebRTC — non-fatal
    const roomId = groupRoomIdRef.current ?? call.id;
    groupRoomIdRef.current = roomId;
    try {
      const sock = getSocket();
      setupCallSocket(sock, roomId);
      sock.emit("join-call", { callId: roomId });
    } catch (rtcErr) {
      console.warn("acceptCall: WebRTC/socket setup failed (call still active):", rtcErr);
    }
  }, [getSocket, setupCallSocket, getUserHeaders, cleanupCall]);

  // ── declineCall ───────────────────────────────────────────────────────────
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

  // ── hangUp ────────────────────────────────────────────────────────────────
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

  // ── inviteToCall ──────────────────────────────────────────────────────────
  const inviteToCall = useCallback(async (inviteeId: number) => {
    const call = activeCallRef.current;
    if (!call) return;
    const roomId = groupRoomIdRef.current ?? call.id;
    await fetch(`/api/calls/${roomId}/invite`, {
      method: "POST",
      headers: getUserHeaders(),
      body: JSON.stringify({ inviteeId }),
    });
  }, [getUserHeaders]);

  // ── screen sharing ────────────────────────────────────────────────────────
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { displaySurface: "monitor" },
        audio: true,
      });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) return;

      // Replace video track in every peer connection
      peersRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screenTrack).catch(() => {});
      });

      // Also replace in localStream so the local PiP shows the screen
      if (localStreamRef.current) {
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) localStreamRef.current.removeTrack(oldVideoTrack);
        localStreamRef.current.addTrack(screenTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }

      setIsScreenSharing(true);

      // Auto-stop when user clicks "Stop sharing" in browser
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.warn("getDisplayMedia error:", err);
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    const screenStream = screenStreamRef.current;
    if (!screenStream) return;
    screenStream.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;

    // Switch back to camera track
    const cameraStream = localStreamRef.current;
    if (cameraStream) {
      const cameraVideoTrack = cameraStream.getVideoTracks().find((t) => t.label !== "Screen");
      peersRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender && cameraVideoTrack) sender.replaceTrack(cameraVideoTrack).catch(() => {});
      });
      // Rebuild localStream with camera tracks
      const audioTracks = cameraStream.getAudioTracks();
      const newStream = new MediaStream([...(cameraVideoTrack ? [cameraVideoTrack] : []), ...audioTracks]);
      localStreamRef.current = newStream;
      setLocalStream(newStream);
    }

    setIsScreenSharing(false);
  }, []);

  // ── SSE for lifecycle events ──────────────────────────────────────────────
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let dead = false;

    const connect = () => {
      if (dead) return;
      const uid = currentUserIdRef.current;
      const token = sessionStorage.getItem("pulse-token");
      const sseUrl = token
        ? `/api/users/me/events?_token=${encodeURIComponent(token)}`
        : `/api/users/me/events?_uid=${uid}`;
      es = new EventSource(sseUrl);

      es.addEventListener("incoming-call", (e: MessageEvent) => {
        try {
          const callData = JSON.parse(e.data);
          // Store group room ID if this is a group invite
          if (callData.groupRoomId) {
            groupRoomIdRef.current = callData.groupRoomId;
          } else {
            groupRoomIdRef.current = callData.id;
          }
          setActiveCall(callData as Call);
        } catch {}
      });

      es.addEventListener("call-accepted", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
          setActiveCall((prev) => (prev ? { ...prev, status: "active", ...data } : null));
        } catch {}
      });

      es.addEventListener("call-declined", () => { cleanupCall(); });
      es.addEventListener("call-ended", () => { cleanupCall(); });

      es.addEventListener("new-message", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          window.dispatchEvent(new CustomEvent("pulse:new-message", { detail: data }));
          const token = sessionStorage.getItem("pulse-token");
          if (token && data.chatId) {
            fetch(`/api/chats/${data.chatId}/deliver`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
          }
        } catch {}
      });

      es.addEventListener("p2p-signal", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          window.dispatchEvent(new CustomEvent("pulse:p2p-signal", { detail: data }));
        } catch {}
      });

      es.addEventListener("moderation-removed", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          window.dispatchEvent(new CustomEvent("pulse:moderation-removed", { detail: data }));
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
  }, [currentUserId, cleanupCall]);

  // ── socket cleanup on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── typing ────────────────────────────────────────────────────────────────
  const setTypingForChat = useCallback((chatId: number, names: string[], typingType?: string) => {
    setTypingByChat((prev) => {
      const current = prev[chatId] || [];
      if (JSON.stringify(current) === JSON.stringify(names)) return prev;
      if (names.length === 0) { const next = { ...prev }; delete next[chatId]; return next; }
      return { ...prev, [chatId]: names };
    });
    setTypingTypeByChat((prev) => {
      if (!typingType || names.length === 0) { const next = { ...prev }; delete next[chatId]; return next; }
      return { ...prev, [chatId]: typingType };
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

  const openAddAccount = useCallback(() => { onOpenAddAccount(); }, [onOpenAddAccount]);

  const canAddAccount = savedAccounts.length < MAX_ACCOUNTS;

  // Convenience: first remote stream (for 1-on-1 calls)
  const remoteStream = remoteStreams.size > 0 ? [...remoteStreams.values()][0] : null;
  const callParticipantIds = [...peersRef.current.keys()];

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
    typingTypeByChat,
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
    inviteToCall,
    startScreenShare,
    stopScreenShare,
    localStream,
    remoteStream,
    remoteStreams,
    isScreenSharing,
    callParticipantIds,
  };

  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error("useAppContext must be used within an AppProvider");
  return context;
}
