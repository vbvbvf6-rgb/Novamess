---
name: WebRTC call signaling architecture
description: How calls are established, what was broken, and the correct pattern.
---

## Correct call flow (after fix)

1. **Caller** `startCall()`: get media → create call record via API → fetch ICE servers → join Socket.IO room. **Do NOT pre-create a peer or send an offer here.**
2. **Callee** sees `incoming-call` SSE → call UI appears.
3. **Callee** `acceptCall()`: get media → update call status via API → fetch ICE servers → join Socket.IO room.
4. **Server**: callee joins room → emits `peer-joined` to caller.
5. **Caller** `peer-joined` handler (in `setupCallSocket`): creates peer, adds tracks, creates offer, sends it.
6. **Callee** receives `webrtc-signal` (offer) via `applySignal`: creates peer if needed, creates answer, sends it.
7. ICE flows both ways → connected.

## What was broken (and why)

The old `startCall()` pre-created the peer and sent an offer **before** the callee accepted. This offer got buffered server-side. When the callee later joined, the `peer-joined` event fired on the caller, but the guard `if (peersRef.current.has(calleeId)) return` blocked re-offering. The entire call then depended on the server buffer working — if the buffer was missed for any reason, no audio ever connected.

**Fix**: Remove pre-created peer/offer from `startCall()`. The `peer-joined` handler in `setupCallSocket` already creates the peer and offer correctly.

## ICE / TURN

- `bundlePolicy: "max-bundle"` — better cross-browser compat than `"balanced"`.
- `iceTransportPolicy: "all"` by default; `"relay"` forced on final ICE retry (TURN only).
- **Identity guard** in `onconnectionstatechange`: `if (peersRef.current.get(targetUserId) === pc)` — prevents the old peer's "closed" event from deleting the relay peer that replaced it.
- `createPeerRef` pattern: lets `createPeer` call itself recursively for relay fallback without circular `useCallback` dep.
- `numb.viagenie.ca` — permanently shut down, removed.
- Metered.ca embedded key removed; now requires `METERED_API_KEY` + `METERED_APP_URL` env vars. Falls through to openrelayproject public TURN if not set.

## Key files

- `artifacts/pulse/src/contexts/AppContext.tsx` — all WebRTC client logic
- `artifacts/api-server/src/lib/socket.ts` — Socket.IO room management, signal buffering
- `artifacts/api-server/src/routes/calls.ts` — ICE server endpoint, call CRUD, HTTP signaling fallback
