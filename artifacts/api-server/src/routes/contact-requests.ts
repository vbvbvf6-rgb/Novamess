import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { broadcastToUser } from "../lib/sse";

const router = Router();

// ── GET /contact-requests/incoming — pending requests for me ──────────────
router.get("/contact-requests/incoming", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(sql`
      SELECT cr.id, cr.from_user_id, cr.created_at,
             u.username, u.display_name as "displayName", u.avatar_url as "avatarUrl",
             u.avatar_color as "avatarColor", u.status
      FROM contact_requests cr
      JOIN users u ON u.id = cr.from_user_id
      WHERE cr.to_user_id = ${uid} AND cr.status = 'pending'
      ORDER BY cr.created_at DESC
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /contact-requests/outgoing — requests I sent ─────────────────────
router.get("/contact-requests/outgoing", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(sql`
      SELECT cr.id, cr.to_user_id, cr.status, cr.created_at,
             u.username, u.display_name as "displayName", u.avatar_url as "avatarUrl",
             u.avatar_color as "avatarColor"
      FROM contact_requests cr
      JOIN users u ON u.id = cr.to_user_id
      WHERE cr.from_user_id = ${uid}
      ORDER BY cr.created_at DESC
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /contact-requests — send a request ───────────────────────────────
router.post("/contact-requests", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const toUserId = Number(req.body.toUserId);
    if (!toUserId || toUserId === uid) return res.status(400).json({ error: "Invalid user" });

    // Check target exists and get their admin status
    const target = await db.execute(sql`SELECT id, is_admin FROM users WHERE id = ${toUserId}`);
    if (!target.rows.length) return res.status(404).json({ error: "User not found" });

    // Check not already contacts
    const alreadyContact = await db.execute(sql`
      SELECT 1 FROM contacts WHERE user_id = ${uid} AND contact_id = ${toUserId}
    `);
    if (alreadyContact.rows.length) return res.status(200).json({ status: "already_contacts" });

    // Upsert contact request
    const [row] = (await db.execute(sql`
      INSERT INTO contact_requests (from_user_id, to_user_id, status)
      VALUES (${uid}, ${toUserId}, 'pending')
      ON CONFLICT (from_user_id, to_user_id)
      DO UPDATE SET status = 'pending', created_at = NOW()
      RETURNING id, status
    `)).rows as any[];

    // Notify recipient via SSE
    const sender = await db.execute(sql`SELECT display_name, avatar_url, avatar_color FROM users WHERE id = ${uid}`);
    const s = sender.rows[0] as any;
    broadcastToUser(toUserId, "contact-request", {
      requestId: row.id,
      fromUserId: uid,
      displayName: s?.display_name || "User",
      avatarUrl: s?.avatar_url || null,
      avatarColor: s?.avatar_color || "#3B82F6",
    });

    res.status(201).json({ status: "sent", requestId: row.id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /contact-requests/:id/accept ─────────────────────────────────────
router.post("/contact-requests/:id/accept", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const reqId = Number(req.params.id);

    const rows = await db.execute(sql`
      SELECT * FROM contact_requests WHERE id = ${reqId} AND to_user_id = ${uid} AND status = 'pending'
    `);
    if (!rows.rows.length) return res.status(404).json({ error: "Request not found" });
    const cr = rows.rows[0] as any;

    // Atomically update request + add both contact directions using a CTE transaction
    await db.execute(sql`
      WITH upd AS (
        UPDATE contact_requests SET status = 'accepted' WHERE id = ${reqId}
      ),
      ins1 AS (
        INSERT INTO contacts (user_id, contact_id) VALUES (${uid}, ${cr.from_user_id}) ON CONFLICT DO NOTHING
      )
      INSERT INTO contacts (user_id, contact_id) VALUES (${cr.from_user_id}, ${uid}) ON CONFLICT DO NOTHING
    `);

    // Notify requester
    broadcastToUser(cr.from_user_id, "contact-request-accepted", { byUserId: uid });

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /contact-requests/:id/decline ───────────────────────────────────
router.post("/contact-requests/:id/decline", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const reqId = Number(req.params.id);

    const rows = await db.execute(sql`
      SELECT * FROM contact_requests WHERE id = ${reqId} AND to_user_id = ${uid} AND status = 'pending'
    `);
    if (!rows.rows.length) return res.status(404).json({ error: "Request not found" });

    await db.execute(sql`UPDATE contact_requests SET status = 'declined' WHERE id = ${reqId}`);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /contact-requests/:id — cancel sent request ───────────────────
router.delete("/contact-requests/:id", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const reqId = Number(req.params.id);
    await db.execute(sql`
      DELETE FROM contact_requests WHERE id = ${reqId} AND from_user_id = ${uid}
    `);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
