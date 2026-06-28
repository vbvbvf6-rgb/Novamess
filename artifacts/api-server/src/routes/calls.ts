import { Router } from "express";
import { db, callsTable, usersTable } from "@workspace/db";
import { eq, or, desc } from "drizzle-orm";
import { InitiateCallBody, UpdateCallStatusBody } from "@workspace/api-zod";
import { broadcastToUser } from "../lib/sse";
import { sendPushToUser } from "./push.js";

const router = Router();

// ── ICE server config (served from backend so TURN creds stay server-side) ──

// Metered.ca: generates per-request time-limited credentials (recommended, free tier available)
// Set METERED_API_KEY + METERED_APP_URL env vars to use your own metered.ca app.
// Without env vars the fetch will fail gracefully and fall through to public TURN servers.
const EMBEDDED_METERED_KEY = process.env.METERED_API_KEY ?? "";
const METERED_APP_URL = process.env.METERED_APP_URL ?? "";

async function fetchMeteredIce(): Promise<RTCIceServer[]> {
  const apiKey = process.env.METERED_API_KEY || EMBEDDED_METERED_KEY;
  if (!apiKey) return [];
  try {
    const resp = await fetch(
      `${METERED_APP_URL}/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!resp.ok) return [];
    const data = await resp.json() as RTCIceServer[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// Xirsys: fetch short-lived credentials from their API
async function fetchXirsysIce(): Promise<RTCIceServer[]> {
  const ident   = process.env.XIRSYS_IDENT;
  const secret  = process.env.XIRSYS_SECRET;
  const channel = process.env.XIRSYS_CHANNEL ?? "aura";
  if (!ident || !secret) return [];
  try {
    const auth = Buffer.from(`${ident}:${secret}`).toString("base64");
    const resp = await fetch(`https://global.xirsys.net/_turn/${channel}`, {
      method: "PUT",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ format: "urls" }),
      signal: AbortSignal.timeout(4000),
    });
    if (!resp.ok) return [];
    const data = await resp.json() as { v?: { iceServers?: RTCIceServer[] } };
    return Array.isArray(data?.v?.iceServers) ? data.v.iceServers : [];
  } catch {
    return [];
  }
}

// Fallback public TURN servers — multiple providers for maximum coverage across networks
// These are last-resort relays; dedicated credentials (METERED_API_KEY) are strongly preferred
const FALLBACK_TURN_SERVERS: RTCIceServer[] = [
  // Metered.ca Open Relay (genuine public shared creds — globally distributed)
  { urls: "stun:stun.relay.metered.ca:80" },
  { urls: "turn:global.relay.metered.ca:80",                  username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:global.relay.metered.ca:443",                 username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:global.relay.metered.ca:80?transport=tcp",    username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turns:global.relay.metered.ca:443",                username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turns:global.relay.metered.ca:443?transport=tcp",  username: "openrelayproject", credential: "openrelayproject" },
  // Metered.ca additional relay endpoints
  { urls: "turn:a.relay.metered.ca:80",   username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:a.relay.metered.ca:443",  username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turns:a.relay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:a.relay.metered.ca:80?transport=tcp",  username: "openrelayproject", credential: "openrelayproject" },
  // ExpressTurn — free public TURN relay
  { urls: "turn:free.expressturn.com:3478",             username: "efun", credential: "b211abe84d3263408ab0d6a0c46ed6e0a15f" },
  { urls: "turn:free.expressturn.com:3478?transport=tcp", username: "efun", credential: "b211abe84d3263408ab0d6a0c46ed6e0a15f" },
  // NOTE: numb.viagenie.ca was permanently shut down — removed.
];

router.get("/calls/ice-servers", async (_req, res) => {
  // Base STUN servers — diverse providers for global coverage
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:global.stun.twilio.com:3478" },
    { urls: "stun:stun.nextcloud.com:443" },
  ];

  // Prefer dedicated TURN providers (fetched in parallel for speed)
  const [meteredServers, xirsysServers] = await Promise.all([
    fetchMeteredIce(),
    fetchXirsysIce(),
  ]);

  if (meteredServers.length > 0) {
    // Metered.ca gave us fresh per-request credentials — use those
    servers.push(...meteredServers);
  } else if (xirsysServers.length > 0) {
    // Xirsys gave us fresh credentials
    servers.push(...xirsysServers);
  } else {
    // Neither premium provider configured — fall back to public servers
    servers.push(...FALLBACK_TURN_SERVERS);
  }

  // Generic TURN override — works with ANY provider (Twilio, coturn, etc.)
  // Set TURN_URL, TURN_USER, TURN_CRED in your environment to use your own server
  const turnUrl  = process.env.TURN_URL;
  const turnUser = process.env.TURN_USER;
  const turnCred = process.env.TURN_CRED;
  if (turnUrl && turnUser && turnCred) {
    servers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
    const tlsUrl = turnUrl.replace(/^turn:/, "turns:").replace(/(\?.*)?$/, "?transport=tcp");
    servers.push({ urls: tlsUrl, username: turnUser, credential: turnCred });
  }

  res.json({ iceServers: servers });
});

async function buildCall(call: typeof callsTable.$inferSelect) {
  const caller = call.callerId ? await db.query.usersTable.findFirst({ where: eq(usersTable.id, call.callerId) }) : null;
  const callee = call.calleeId ? await db.query.usersTable.findFirst({ where: eq(usersTable.id, call.calleeId) }) : null;
  return { ...call, caller, callee };
}

router.get("/calls", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const calls = await db.select().from(callsTable)
      .where(or(eq(callsTable.callerId, uid), eq(callsTable.calleeId, uid)))
      .orderBy(desc(callsTable.createdAt))
      .limit(50);
    const built = await Promise.all(calls.map(buildCall));
    res.json(built);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/calls", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const body = InitiateCallBody.parse(req.body);

    const callee = body.calleeId != null
      ? await db.query.usersTable.findFirst({ where: eq(usersTable.id, body.calleeId) })
      : undefined;

    const [call] = await db.insert(callsTable).values({
      callerId: uid,
      calleeId: body.calleeId,
      chatId: body.chatId,
      type: body.type,
      status: "ringing",
    }).returning();
    const built = await buildCall(call);

    if (callee?.isBot) {
      const [declined] = await db.update(callsTable)
        .set({ status: "declined", endedAt: new Date() })
        .where(eq(callsTable.id, call.id))
        .returning();
      const declinedBuilt = await buildCall(declined);
      broadcastToUser(uid, "call-declined", declinedBuilt);
      return res.status(201).json(declinedBuilt);
    }

    if (built.calleeId) {
      broadcastToUser(built.calleeId, "incoming-call", built);
      const callerName = (built.caller as any)?.displayName || (built.caller as any)?.username || "Неизвестный";
      const callerAvatar = (built.caller as any)?.avatarUrl || undefined;
      const callerColor = (built.caller as any)?.avatarColor || "#3B82F6";
      sendPushToUser(built.calleeId, {
        title: `📞 Входящий ${call.type === "video" ? "видео" : "аудио"}звонок`,
        body: `${callerName} ${call.type === "video" ? "вызывает на видеозвонок" : "звонит вам"}`,
        url: "/",
        tag: `call-${call.id}`,
        senderAvatar: callerAvatar,
        senderColor: callerColor,
        chatType: "call",
      });
    }
    res.status(201).json(built);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/calls/:callId", async (req, res) => {
  try {
    const callId = Number(req.params.callId);
    const uid = req.currentUserId;
    const call = await db.query.callsTable.findFirst({ where: eq(callsTable.id, callId) });
    if (!call) return res.status(404).json({ error: "Call not found" });
    // Only the caller or callee may fetch call details
    if (call.callerId !== uid && call.calleeId !== uid) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }
    const built = await buildCall(call);
    res.json(built);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/calls/:callId", async (req, res) => {
  try {
    const callId = Number(req.params.callId);
    const uid = req.currentUserId;
    const body = UpdateCallStatusBody.parse(req.body);
    const updateData: Record<string, unknown> = { status: body.status };
    if (body.status === "active") updateData.startedAt = new Date();
    if (body.status === "ended" || body.status === "declined") {
      updateData.endedAt = new Date();
      const call = await db.query.callsTable.findFirst({ where: eq(callsTable.id, callId) });
      if (call?.startedAt) {
        const dur = Math.floor((Date.now() - new Date(call.startedAt).getTime()) / 1000);
        updateData.durationSeconds = dur;
      }
    }
    const [updated] = await db.update(callsTable).set(updateData).where(eq(callsTable.id, callId)).returning();
    const built = await buildCall(updated);

    if (body.status === "active" && built.callerId) {
      broadcastToUser(built.callerId, "call-accepted", built);
    } else if (body.status === "declined" && built.callerId) {
      broadcastToUser(built.callerId, "call-declined", built);
    } else if (body.status === "ended") {
      const targetId = built.callerId === uid ? built.calleeId : built.callerId;
      if (targetId) broadcastToUser(targetId, "call-ended", built);
    } else if (body.status === "missed") {
      if (built.calleeId) broadcastToUser(built.calleeId, "call-ended", built);
    }

    res.json(built);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/calls/:callId/signal", async (req, res) => {
  try {
    const callId = Number(req.params.callId);
    const uid = req.currentUserId;
    const { type, payload } = req.body;
    if (!type || payload === undefined) return res.status(400).json({ error: "Missing type or payload" });

    const call = await db.query.callsTable.findFirst({ where: eq(callsTable.id, callId) });
    if (!call) return res.status(404).json({ error: "Call not found" });

    // Ensure the sender is actually a participant in this call
    if (call.callerId !== uid && call.calleeId !== uid) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }

    const targetId = call.callerId === uid ? call.calleeId : call.callerId;
    if (targetId) {
      broadcastToUser(targetId, "webrtc-signal", { type, payload, callId });
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Invite a user to an existing call (group call)
router.post("/calls/:callId/invite", async (req, res) => {
  try {
    const callId = Number(req.params.callId);
    const uid = req.currentUserId;
    const { inviteeId } = req.body;
    if (!inviteeId) return res.status(400).json({ error: "Missing inviteeId" });

    const originalCall = await db.query.callsTable.findFirst({ where: eq(callsTable.id, callId) });
    if (!originalCall) return res.status(404).json({ error: "Call not found" });

    const invitee = await db.query.usersTable.findFirst({ where: eq(usersTable.id, Number(inviteeId)) });
    if (!invitee) return res.status(404).json({ error: "User not found" });

    // Create a new call record for the invite
    const [newCall] = await db.insert(callsTable).values({
      callerId: uid,
      calleeId: Number(inviteeId),
      type: originalCall.type,
      status: "ringing",
    }).returning();

    const built = await buildCall(newCall);

    if (invitee.isBot) {
      const [declined] = await db.update(callsTable)
        .set({ status: "declined", endedAt: new Date() })
        .where(eq(callsTable.id, newCall.id))
        .returning();
      return res.status(201).json({ ...await buildCall(declined), groupRoomId: callId });
    }

    // Send incoming-call with groupRoomId so invitee knows which room to join
    broadcastToUser(Number(inviteeId), "incoming-call", { ...built, groupRoomId: callId });
    const inviterName = (built.caller as any)?.displayName || (built.caller as any)?.username || "Неизвестный";
    const inviterAvatar = (built.caller as any)?.avatarUrl || undefined;
    const inviterColor = (built.caller as any)?.avatarColor || "#3B82F6";
    sendPushToUser(Number(inviteeId), {
      title: `📞 Входящий ${originalCall.type === "video" ? "видео" : "аудио"}звонок`,
      body: `${inviterName} приглашает вас в звонок`,
      url: "/",
      tag: `call-${newCall.id}`,
      senderAvatar: inviterAvatar,
      senderColor: inviterColor,
      chatType: "call",
    });

    res.status(201).json({ ...built, groupRoomId: callId });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
