import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Call } from "@workspace/api-client-react";
import { getSavedAccounts, SavedAccount, MAX_ACCOUNTS } from "@/lib/accounts";

// ICE servers are fetched from the API at call-start time so that TURN
// credentials live only on the server and are never baked into the JS bundle.
// Falls back to Google STUN if the fetch fails.
const FALLBACK_ICE: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

async function fetchIceServers(headers: Record<string, string>): Promise<RTCIceServer[]> {
  try {
    const res = await fetch("/api/calls/ice-servers", { headers });
    if (!res.ok) return FALLBACK_ICE;
    const data = await res.json();
    return Array.isArray(data.iceServers) && data.iceServers.length > 0
      ? data.iceServers
      : FALLBACK_ICE;
  } catch {
    return FALLBACK_ICE;
  }
}

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
  userStatusMap: Record<number, string>;
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
  const [userStatusMap, setUserStatusMap] = useState<Record<number, string>>({});

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
  const cameraVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iceServersRef = useRef<RTCIceServer[]>(FALLBACK_ICE);

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
    // Clean up the old disconnected socket before creating a new one
    // to prevent duplicate event listeners from accumulating.
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    const token = sessionStorage.getItem("pulse-token");
    // When VITE_API_URL is set (Vercel split-deploy) connect Socket.IO directly
    // to the backend. Otherwise use the current origin (single-server deploy).
    const apiBase = import.meta.env.VITE_API_URL ?? "";
    const sock = io(apiBase || "/", {
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
    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current,
      // bundle all media into one transport — reduces ICE candidates & ports needed
      bundlePolicy: "max-bundle",
      // use a single RTCP mux — simpler traversal through firewalls
      rtcpMuxPolicy: "require",
      // allow both relay (TURN) and direct (host/srflx) — required for international calls
      iceTransportPolicy: "all",
    });

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

    // ICE restart on disconnection — try to recover before giving up
    let iceRestartTimer: ReturnType<typeof setTimeout> | null = null;
    pc.oniceconnectionstatechange = () => {
      const ice = pc.iceConnectionState;
      if (ice === "failed") {
        // Attempt ICE restart immediately on hard failure
        try { pc.restartIce(); } catch (_) {}
      } else if (ice === "disconnected") {
        // "disconnected" can be transient — give it 4 s before restarting
        iceRestartTimer = setTimeout(() => {
          if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
            try { pc.restartIce(); } catch (_) {}
          }
        }, 4000);
      } else if (ice === "connected" || ice === "completed") {
        if (iceRestartTimer) { clearTimeout(iceRestartTimer); iceRestartTimer = null; }
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      // "disconnected" is a transient state — ICE may recover on its own.
      // Only tear down on permanently terminal states.
      if (state === "failed" || state === "closed") {
        if (iceRestartTimer) { clearTimeout(iceRestartTimer); iceRestartTimer = null; }
        peersRef.current.delete(targetUserId);
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(targetUserId);
          return next;
        });
        if (state === "failed") {
          // WebRTC failed — notify UI but keep call alive so user can still hang up manually
          window.dispatchEvent(new CustomEvent("pulse:call-error", {
            detail: { message: "Соединение прервано. Проверьте интернет или настройте TURN-сервер." },
          }));
        } else if (state === "closed" && peersRef.current.size === 0) {
          cleanupCall();
        }
      }
    };

    return pc;
  }, [cleanupCall]);

  // ── helpers ───────────────────────────────────────────────────────────────
  // Flush any ICE candidates buffered while waiting for remote description.
  const flushPendingIce = useCallback(async (pc: RTCPeerConnection, fromUserId: number) => {
    const buffered = pendingSignalsRef.current.get(fromUserId) ?? [];
    if (buffered.length === 0) return;
    pendingSignalsRef.current.delete(fromUserId);
    for (const s of buffered) {
      if (s.type === "ice" && s.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(s.candidate)).catch(() => {});
      }
    }
  }, []);

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
        // Flush ICE candidates that arrived before the remote description was ready
        await flushPendingIce(pc, fromUserId);
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
          // Flush ICE candidates that arrived before the remote description was ready
          await flushPendingIce(pc, fromUserId);
        }
      } else if (signal.type === "ice" && signal.candidate) {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
        } else {
          // Queue ICE for after remote description is set
          const arr = pendingSignalsRef.current.get(fromUserId) ?? [];
          arr.push(signal);
          pendingSignalsRef.current.set(fromUserId, arr);
        }
      }
    } catch (err) {
      console.warn("applySignal error:", err);
    }
  }, [createPeer, flushPendingIce]);

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
    // 1. Get media — always falls back gracefully, never throws
    let stream: MediaStream;
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
      } else {
        stream = createSilentStream();
        window.dispatchEvent(new CustomEvent("pulse:call-error", { detail: { message: "Медиаустройства недоступны в этом браузере." } }));
      }
    } catch (mediaErr: any) {
      const errName: string = mediaErr?.name ?? "";
      if (type === "video" && (errName === "NotFoundError" || errName === "DevicesNotFoundError")) {
        // Camera not found — try audio only
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); }
        catch { stream = createSilentStream(); }
        window.dispatchEvent(new CustomEvent("pulse:call-error", { detail: { message: "Камера не найдена. Видео недоступно." } }));
      } else if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        // User denied camera/mic — try audio-only as fallback for video calls
        if (type === "video") {
          try { stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); }
          catch { stream = createSilentStream(); }
          window.dispatchEvent(new CustomEvent("pulse:call-error", { detail: { message: "Доступ к камере запрещён. Видео недоступно." } }));
        } else {
          stream = createSilentStream();
          window.dispatchEvent(new CustomEvent("pulse:call-error", { detail: { message: "Доступ к микрофону запрещён." } }));
        }
      } else {
        stream = createSilentStream();
        window.dispatchEvent(new CustomEvent("pulse:call-error", { detail: { message: "Не удалось получить доступ к медиаустройствам." } }));
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
      import("@/utils/questTracker").then(({ trackQuestAction }) => trackQuestAction("call_made"));
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
      // Fetch ICE servers (TURN credentials) from backend — happens once per call
      iceServersRef.current = await fetchIceServers(getUserHeaders());

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
      if (navigator.mediaDevices?.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: call.type === "video" });
      } else {
        stream = createSilentStream();
        window.dispatchEvent(new CustomEvent("pulse:call-error", { detail: { message: "Медиаустройства недоступны в этом браузере." } }));
      }
    } catch (mediaErr: any) {
      const errName: string = mediaErr?.name ?? "";
      if (call.type === "video" && (errName === "NotFoundError" || errName === "DevicesNotFoundError")) {
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); }
        catch { stream = createSilentStream(); }
        window.dispatchEvent(new CustomEvent("pulse:call-error", { detail: { message: "Камера не найдена. Видео недоступно." } }));
      } else if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        if (call.type === "video") {
          try { stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); }
          catch { stream = createSilentStream(); }
          window.dispatchEvent(new CustomEvent("pulse:call-error", { detail: { message: "Доступ к камере запрещён. Видео недоступно." } }));
        } else {
          stream = createSilentStream();
          window.dispatchEvent(new CustomEvent("pulse:call-error", { detail: { message: "Доступ к микрофону запрещён." } }));
        }
      } else {
        stream = createSilentStream();
      }
    }
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
      // Fetch ICE servers (TURN credentials) from backend — happens once per call
      iceServersRef.current = await fetchIceServers(getUserHeaders());

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

      // Save the original camera track before replacing it so we can restore it later
      if (localStreamRef.current) {
        const existingCamera = localStreamRef.current.getVideoTracks()[0];
        if (existingCamera) cameraVideoTrackRef.current = existingCamera;
      }

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

    // Restore the saved camera track (cameraVideoTrackRef holds it reliably)
    const cameraVideoTrack = cameraVideoTrackRef.current;
    cameraVideoTrackRef.current = null;

    const cameraStream = localStreamRef.current;
    if (cameraStream) {
      // Remove the screen track from the stream
      cameraStream.getVideoTracks().forEach((t) => cameraStream.removeTrack(t));

      // Re-add camera track if we have one
      if (cameraVideoTrack) cameraStream.addTrack(cameraVideoTrack);

      // Replace track in all peer connections
      peersRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(cameraVideoTrack ?? null).catch(() => {});
        }
      });

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
    let retryCount = 0;

    const getBackoffMs = () => Math.min(1000 * Math.pow(2, retryCount), 30000);

    const connect = () => {
      if (dead) return;
      const uid = currentUserIdRef.current;
      const token = sessionStorage.getItem("pulse-token");
      const apiBase = import.meta.env.VITE_API_URL ?? "";
      const sseUrl = token
        ? `${apiBase}/api/users/me/events?_token=${encodeURIComponent(token)}`
        : `${apiBase}/api/users/me/events?_uid=${uid}`;
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
          setActiveCall((prev: Call | null) => (prev ? { ...prev, status: "active", ...data } : null));
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

      es.addEventListener("open", () => { retryCount = 0; });

      es.onerror = () => {
        es?.close();
        es = null;
        if (!dead) {
          const delay = getBackoffMs();
          retryCount++;
          retryTimeout = setTimeout(connect, delay);
        }
      };
    };

    connect();
    return () => {
      dead = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      es?.close();
    };
  }, [currentUserId, cleanupCall]);

  // ── socket connect on mount for status tracking ───────────────────────────
  useEffect(() => {
    const sock = getSocket();
    sock.on("user-status", ({ userId, status }: { userId: number; status: string }) => {
      setUserStatusMap(prev => ({ ...prev, [userId]: status }));
    });
    return () => {
      sock.off("user-status");
    };
  }, [getSocket]);

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
    userStatusMap,
  };

  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error("useAppContext must be used within an AppProvider");
  return context;
}
