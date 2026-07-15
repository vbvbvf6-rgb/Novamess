import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Call } from "@workspace/api-client-react";
import { getSavedAccounts, SavedAccount, MAX_ACCOUNTS } from "@/lib/accounts";
import { toast } from "@/hooks/use-toast";

// ICE servers are fetched from the API at call-start time so that TURN
// credentials live only on the server and are never baked into the JS bundle.
// Falls back to a comprehensive set of public STUN + TURN servers if the fetch fails.
const FALLBACK_ICE: RTCIceServer[] = [
  // STUN — Google (very reliable) + Cloudflare
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:stun.relay.metered.ca:80" },
  // TURN — Metered.ca open relay (needed when STUN fails behind symmetric NAT)
  { urls: "turn:global.relay.metered.ca:80",               username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:global.relay.metered.ca:443",              username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:global.relay.metered.ca:80?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turns:global.relay.metered.ca:443",             username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:a.relay.metered.ca:80",                    username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:a.relay.metered.ca:443",                   username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:a.relay.metered.ca:80?transport=tcp",      username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turns:a.relay.metered.ca:443",                  username: "openrelayproject", credential: "openrelayproject" },
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
  reacquireCamera: () => Promise<void>;
  flipCamera: () => Promise<void>;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  remoteStreams: Map<number, MediaStream>;
  isScreenSharing: boolean;
  callParticipantIds: number[];
  userStatusMap: Record<number, string>;
  isCallMinimized: boolean;
  minimizeCall: () => void;
  expandCall: () => void;
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
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const minimizeCall = useCallback(() => setIsCallMinimized(true), []);
  const expandCall = useCallback(() => setIsCallMinimized(false), []);

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

  // Stable ref to createPeer — lets createPeer call itself for relay fallback
  // without introducing a circular useCallback dependency.
  const createPeerRef = useRef<((targetUserId: number, roomId: number, policy?: RTCIceTransportPolicy) => RTCPeerConnection) | null>(null);

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
    setIsCallMinimized(false);
    setActiveCall(null);
  }, []);

  // ── peer factory ──────────────────────────────────────────────────────────
  // iceTransportPolicy: "all" = try direct + relay; "relay" = force TURN only
  // Video calls default to a very low WebRTC bitrate on some networks/browsers,
  // producing blurry/pixelated video. Bump the encoder's target bitrate once a
  // video sender exists on the peer connection.
  const boostVideoBitrate = useCallback((pc: RTCPeerConnection) => {
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (!sender) return;
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
    params.encodings.forEach((enc) => {
      enc.maxBitrate = 2_500_000; // ~2.5 Mbps — sharp 720p video
      enc.priority = "high";
    });
    sender.setParameters(params).catch(() => {});
  }, []);

  const createPeer = useCallback((
    targetUserId: number,
    roomId: number,
    iceTransportPolicy: RTCIceTransportPolicy = "all",
  ): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current,
      // max-bundle: all media shares one transport — better cross-browser compat
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
      iceTransportPolicy,
    });

    // Send ICE candidates as they trickle in — don't wait for gathering to finish
    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit("webrtc-signal", {
          callId: roomId,
          targetUserId,
          signal: { type: "ice", candidate: e.candidate.toJSON() },
        });
      }
      if (!e.candidate) {
        console.debug(`[WebRTC] ICE gathering complete for peer ${targetUserId}`);
      }
    };

    pc.ontrack = (e) => {
      if (e.streams?.[0]) {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(targetUserId, e.streams[0]);
          return next;
        });
      } else {
        // Firefox: tracks arrive one at a time, build stream incrementally
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          const existing = prev.get(targetUserId);
          const newStream = new MediaStream([...(existing?.getTracks() ?? []), e.track]);
          next.set(targetUserId, newStream);
          return next;
        });
      }
    };

    let iceRestartTimer: ReturnType<typeof setTimeout> | null = null;
    let iceRestartCount = 0;
    const MAX_ICE_RESTARTS = 3;

    pc.oniceconnectionstatechange = () => {
      const ice = pc.iceConnectionState;
      console.debug(`[WebRTC] ICE state → ${ice} (peer ${targetUserId}, policy=${iceTransportPolicy})`);

      if (ice === "failed") {
        if (iceRestartCount < MAX_ICE_RESTARTS - 1) {
          // Standard ICE restart — same peer, re-gather candidates
          iceRestartCount++;
          console.debug(`[WebRTC] ICE restart #${iceRestartCount}`);
          try { pc.restartIce(); } catch (_) {}
        } else if (iceRestartCount === MAX_ICE_RESTARTS - 1 && iceTransportPolicy !== "relay") {
          // Last resort: close this peer and recreate with TURN-relay-only.
          // Use createPeerRef to avoid circular useCallback dep; relay peers
          // won't enter this branch again (iceTransportPolicy === "relay").
          iceRestartCount++;
          console.debug("[WebRTC] ICE failed — switching to relay-only (TURN) transport");
          pc.close(); // triggers onconnectionstatechange("closed") below
          const relayPc = createPeerRef.current!(targetUserId, roomId, "relay");
          peersRef.current.set(targetUserId, relayPc);
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => relayPc.addTrack(t, localStreamRef.current!));
            boostVideoBitrate(relayPc);
          }
          relayPc.createOffer()
            .then((offer) => relayPc.setLocalDescription(offer).then(() => {
              socketRef.current?.emit("webrtc-signal", {
                callId: roomId,
                targetUserId,
                signal: { type: "offer", sdp: offer.sdp },
              });
            }))
            .catch(() => {});
        } else {
          window.dispatchEvent(new CustomEvent("pulse:call-error", {
            detail: { message: "Не удалось установить соединение. Проверьте интернет." },
          }));
        }
      } else if (ice === "disconnected") {
        // Transient disconnect — wait 4 s then trigger a standard ICE restart
        iceRestartTimer = setTimeout(() => {
          if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
            if (iceRestartCount < MAX_ICE_RESTARTS) {
              iceRestartCount++;
              try { pc.restartIce(); } catch (_) {}
            }
          }
        }, 4000);
      } else if (ice === "connected" || ice === "completed") {
        iceRestartCount = 0;
        if (iceRestartTimer) { clearTimeout(iceRestartTimer); iceRestartTimer = null; }
        console.debug(`[WebRTC] Connected to peer ${targetUserId} ✓ (${iceTransportPolicy})`);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.debug(`[WebRTC] Connection state → ${state} (peer ${targetUserId})`);
      if (state === "failed" || state === "closed") {
        if (iceRestartTimer) { clearTimeout(iceRestartTimer); iceRestartTimer = null; }
        // Identity guard: only clean up peersRef if this peer is still the active
        // one. If a relay fallback peer was installed, pc.close() fires "closed"
        // on the old peer — we must NOT delete the new relayPc from peersRef.
        if (peersRef.current.get(targetUserId) === pc) {
          peersRef.current.delete(targetUserId);
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.delete(targetUserId);
            return next;
          });
          if (state === "failed") {
            window.dispatchEvent(new CustomEvent("pulse:call-error", {
              detail: { message: "Соединение разорвано. Попробуйте позвонить снова." },
            }));
          } else if (state === "closed" && peersRef.current.size === 0) {
            cleanupCall();
          }
        }
      }
    };

    return pc;
  }, [cleanupCall]);

  // Keep the ref in sync so the relay-fallback inside createPeer can call itself
  // without a circular useCallback dependency.
  createPeerRef.current = createPeer;

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
          boostVideoBitrate(pc!);
          boostVideoBitrate(pc);
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
        boostVideoBitrate(pc);
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
            boostVideoBitrate(pc);
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
    const getAudio = async (): Promise<MediaStream> => {
      return navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    };
    const getVideo = async (): Promise<MediaStream> => {
      // Try high-quality front camera first, then minimal, then audio-only
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        });
      } catch {
        return await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: true,
        });
      }
    };
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        stream = createSilentStream();
        window.dispatchEvent(new CustomEvent("pulse:call-error", { detail: { message: "Медиаустройства недоступны в этом браузере." } }));
      } else if (type === "video") {
        try {
          stream = await getVideo();
        } catch {
          // Camera fully unavailable — fallback to audio only
          try { stream = await getAudio(); }
          catch { stream = createSilentStream(); }
          window.dispatchEvent(new CustomEvent("pulse:call-error", { detail: { message: "Камера недоступна. Продолжаем без видео." } }));
        }
      } else {
        try { stream = await getAudio(); }
        catch { stream = createSilentStream(); window.dispatchEvent(new CustomEvent("pulse:call-error", { detail: { message: "Доступ к микрофону запрещён." } })); }
      }
    } catch {
      stream = createSilentStream();
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
      // Join the room — when the callee accepts and joins, the server fires
      // "peer-joined" which triggers the offer in setupCallSocket's handler.
      // DO NOT pre-create a peer or send an offer here: doing so would buffer
      // the offer before the callee is ready, and the peer-joined guard
      // (peersRef.has(calleeId)) would block the re-offer, leaving the call
      // in a broken state if the buffer is missed.
      sock.emit("join-call", { callId: call.id });
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
    const getAudio2 = async (): Promise<MediaStream> => {
      return navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    };
    const getVideo2 = async (): Promise<MediaStream> => {
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        });
      } catch {
        return await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: true,
        });
      }
    };
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        stream = createSilentStream();
        window.dispatchEvent(new CustomEvent("pulse:call-error", { detail: { message: "Медиаустройства недоступны в этом браузере." } }));
      } else if (call.type === "video") {
        try {
          stream = await getVideo2();
        } catch {
          try { stream = await getAudio2(); }
          catch { stream = createSilentStream(); }
          window.dispatchEvent(new CustomEvent("pulse:call-error", { detail: { message: "Камера недоступна. Продолжаем без видео." } }));
        }
      } else {
        try { stream = await getAudio2(); }
        catch { stream = createSilentStream(); window.dispatchEvent(new CustomEvent("pulse:call-error", { detail: { message: "Доступ к микрофону запрещён." } })); }
      }
    } catch {
      stream = createSilentStream();
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

  // ── push notification accept/decline (works even after a cold start) ─────
  // A click on the "Принять"/"Отклонить" action of a call push notification
  // opens/focuses the app with ?callAction=accept|decline&callId=N. The call
  // may not be in state yet (fresh launch, or the SSE "incoming-call" event
  // fired before this tab existed) so we fetch it first if needed.
  const handlePushCallAction = useCallback(async (action: string, callId: number) => {
    if (action !== "accept" && action !== "decline") return;
    try {
      if (!activeCallRef.current || activeCallRef.current.id !== callId) {
        const res = await fetch(`/api/calls/${callId}`, { headers: getUserHeaders() });
        if (!res.ok) return;
        const call = await res.json();
        if (call.status !== "ringing") return;
        activeCallRef.current = call;
        setActiveCall(call);
      }
      if (action === "accept") await acceptCall();
      else await declineCall();
    } catch {}
  }, [getUserHeaders, acceptCall, declineCall]);

  // Cold start: the SW opened a brand-new window with the action in the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("callAction");
    const callId = params.get("callId");
    if (action && callId) {
      window.history.replaceState({}, "", window.location.pathname);
      handlePushCallAction(action, Number(callId));
    }
  }, [handlePushCallAction]);

  // Warm start: a window was already open — the SW posts a message instead
  // of navigating, so we listen for it here.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data) return;
      if (data.type === "notification-click") {
        if (data.isCall && data.callId != null && (data.action === "accept" || data.action === "decline")) {
          handlePushCallAction(data.action, Number(data.callId));
        } else if (data.chatId) {
          // Message notification tapped — navigate to that chat
          setSelectedChatId(Number(data.chatId));
          window.dispatchEvent(new CustomEvent("pulse:navigate-home"));
        }
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [handlePushCallAction, setSelectedChatId]);

  // Send auth token to SW so it can make API requests in background (periodic sync)
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const sendToken = () => {
      const token = sessionStorage.getItem("pulse-token");
      const userId = sessionStorage.getItem("pulse-user-id");
      if (token && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "set-auth", token, userId });
      }
    };
    // Send immediately if controller is ready, else wait for it
    if (navigator.serviceWorker.controller) {
      sendToken();
    }
    navigator.serviceWorker.addEventListener("controllerchange", sendToken);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", sendToken);
  }, []);

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
    if (!call) throw new Error("No active call");
    const roomId = groupRoomIdRef.current ?? call.id;
    const res = await fetch(`/api/calls/${roomId}/invite`, {
      method: "POST",
      headers: getUserHeaders(),
      body: JSON.stringify({ inviteeId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any)?.error || "Invite failed");
    }
  }, [getUserHeaders]);

  // ── screen sharing ────────────────────────────────────────────────────────
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: true,
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

  // ── Flip between front/back camera mid-call ──────────────────────────────
  // `applyConstraints({ facingMode })` alone silently no-ops on many Android
  // devices/browsers (esp. MIUI/Redmi) that don't map facingMode to a real
  // constraint. Fall back to enumerating video input devices and swapping to
  // a different physical camera via getUserMedia + replaceTrack.
  const flipCamera = useCallback(async () => {
    const vt = localStreamRef.current?.getVideoTracks()[0];
    if (!vt) return;
    const currentFacing = vt.getSettings().facingMode;
    const targetFacing = currentFacing === "environment" ? "user" : "environment";

    // Attempt 1: cheap in-place constraint switch (works on most desktop/iOS browsers)
    try {
      await vt.applyConstraints({ facingMode: { ideal: targetFacing } });
      const applied = vt.getSettings().facingMode;
      if (applied === targetFacing || (!currentFacing && applied)) return;
    } catch {}

    // Attempt 2: enumerate devices and pick a different physical camera
    try {
      if (!navigator.mediaDevices?.enumerateDevices) throw new Error("no enumerateDevices");
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === "videoinput");
      if (cams.length < 2) return; // only one camera — nothing to flip to
      const currentDeviceId = vt.getSettings().deviceId;
      const currentIndex = cams.findIndex((c) => c.deviceId === currentDeviceId);
      const nextCam = cams[(currentIndex + 1) % cams.length];

      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { deviceId: { exact: nextCam.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      const newTrack = newStream.getVideoTracks()[0];
      if (!newTrack) return;

      // Swap into every peer connection sender
      peersRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        sender?.replaceTrack(newTrack).catch(() => {});
      });

      // Swap into the local stream shown to the user
      const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
      vt.stop();
      const combined = new MediaStream([newTrack, ...audioTracks]);
      localStreamRef.current = combined;
      cameraVideoTrackRef.current = newTrack;
      setLocalStream(combined);
    } catch (err) {
      console.warn("flipCamera fallback failed:", err);
      window.dispatchEvent(new CustomEvent("pulse:call-error", { detail: { message: "Не удалось переключить камеру" } }));
    }
  }, []);

  // ── Re-acquire camera mid-call (e.g., user toggles video back on) ────────
  const reacquireCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });
      const videoTrack = videoStream.getVideoTracks()[0];
      if (!videoTrack) return;

      // Stop any existing ended video track
      localStreamRef.current?.getVideoTracks().forEach((t) => { try { t.stop(); } catch {} });

      const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
      const newStream = new MediaStream([videoTrack, ...audioTracks]);
      localStreamRef.current = newStream;
      setLocalStream(newStream);
      cameraVideoTrackRef.current = videoTrack;

      // Add/replace in all peer connections
      peersRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(videoTrack).catch(() => {});
        } else {
          pc.addTrack(videoTrack, newStream);
        }
      });

      // Mirror the facing mode on the track if supported (mobile front camera)
      try {
        const settings = videoTrack.getSettings();
        if (!settings.facingMode) {
          videoTrack.applyConstraints({ facingMode: "user" }).catch(() => {});
        }
      } catch {}
    } catch (err) {
      console.warn("reacquireCamera failed:", err);
      window.dispatchEvent(new CustomEvent("pulse:call-error", { detail: { message: "Не удалось включить камеру" } }));
    }
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

      // Distinguish a graceful end/decline (peer action) from a dropped
      // connection (network failure, handled separately via "pulse:call-error").
      es.addEventListener("call-declined", () => {
        toast({ title: "Звонок отклонён", description: "Собеседник отклонил вызов" });
        cleanupCall();
      });
      es.addEventListener("call-ended", () => {
        toast({ title: "Звонок завершён", description: "Собеседник завершил звонок" });
        cleanupCall();
      });

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

      es.addEventListener("contact-request", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          window.dispatchEvent(new CustomEvent("pulse:contact-request", { detail: data }));
        } catch {}
      });

      es.addEventListener("contact-request-accepted", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          window.dispatchEvent(new CustomEvent("pulse:contact-request-accepted", { detail: data }));
        } catch {}
      });

      es.addEventListener("post-rejected", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          window.dispatchEvent(new CustomEvent("pulse:post-rejected", { detail: data }));
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

  // ── ICE restart on tab re-focus (mobile background fix) ──────────────────
  // When a mobile browser backgrounds, ICE connections go "disconnected".
  // JS timers are suspended so the 4-second restart never fires.
  // Trigger restartIce() immediately when the page becomes visible again.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (peersRef.current.size === 0) return;
      peersRef.current.forEach((pc) => {
        const ice = pc.iceConnectionState;
        if (ice === "disconnected" || ice === "failed") {
          try { pc.restartIce(); } catch {}
        }
      });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

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
    reacquireCamera,
    flipCamera,
    localStream,
    remoteStream,
    remoteStreams,
    isScreenSharing,
    callParticipantIds,
    userStatusMap,
    isCallMinimized,
    minimizeCall,
    expandCall,
  };

  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error("useAppContext must be used within an AppProvider");
  return context;
}
