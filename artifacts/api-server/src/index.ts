import { createServer } from "node:http";
import path from "node:path";
import fs from "node:fs";
import app from "./app";
import { logger } from "./lib/logger";
import { initSocketIO } from "./lib/socket";
import { runSeed } from "./seed";
import { db, messagesTable, storiesTable } from "@workspace/db";
import { sql, and, eq, lte, lt } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { broadcastToChat } from "./lib/sse";
import { runWeeklyScan } from "./routes/admin";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ── Auto-migrate on startup (production / Docker only) ────────────────────
// Strategy:
//   • Fresh DB  → run migrate() to create all tables from scratch.
//   • Existing DB → skip migrate() entirely; schema drift is handled by
//     the ALTER TABLE IF NOT EXISTS block below, which runs every startup.
//   This avoids the "relation already exists" error when Drizzle tries to
//   re-apply CREATE TABLE statements that don't use IF NOT EXISTS.
if (process.env.NODE_ENV === "production") {
  const dockerPath = path.join(process.cwd(), "migrations");
  const nativePath = path.join(process.cwd(), "lib/db/drizzle");
  const migrationsFolder = fs.existsSync(dockerPath) ? dockerPath : nativePath;
  try {
    // Check whether the DB is already initialised (users table exists)
    const tableCheck = await db.execute(sql`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users' LIMIT 1
    `);
    const dbAlreadyInitialised = tableCheck.rows.length > 0;

    if (dbAlreadyInitialised) {
      logger.info("DB already initialised — skipping migrate(), relying on ALTER TABLE drift fixes");
    } else {
      logger.info({ migrationsFolder }, "Fresh DB detected — running full migrations…");
      await migrate(db, { migrationsFolder });
      logger.info("DB migrations complete ✓");
    }
  } catch (migErr) {
    logger.warn({ err: migErr }, "DB migration check warning (non-fatal) — server will continue");
  }
}

const httpServer = createServer(app);
initSocketIO(httpServer);

// ── Global error handlers ──────────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — server will continue running");
});
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});

// ── Graceful shutdown ──────────────────────────────────────────────────────
let isShuttingDown = false;
const shutdown = (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, "Graceful shutdown initiated");
  httpServer.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
  // Force-kill if close takes too long
  setTimeout(() => { logger.warn("Forced exit after timeout"); process.exit(1); }, 10_000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

runSeed().catch((err) => logger.error({ err }, "Seed failed"));

// ── Schema drift fixes — run on every startup so production stays in sync ──
const _schemaMigrations = (async () => {
  const run = (q: ReturnType<typeof sql>) =>
    db.execute(q).catch((e: any) => logger.warn({ msg: e?.message }, "migration skipped"));

  // calls soft-delete
  await run(sql`ALTER TABLE calls ADD COLUMN IF NOT EXISTS hidden_for_caller BOOLEAN NOT NULL DEFAULT FALSE`);
  await run(sql`ALTER TABLE calls ADD COLUMN IF NOT EXISTS hidden_for_callee BOOLEAN NOT NULL DEFAULT FALSE`);

  // contacts private nickname
  await run(sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS nickname TEXT`);

  // email verification (registration OTP)
  await run(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_code TEXT`);
  await run(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP WITH TIME ZONE`);
  await run(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE`);

  // password reset via email
  await run(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_code TEXT`);
  await run(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP WITH TIME ZONE`);
})();
_schemaMigrations.catch((e) => logger.error({ err: e }, "Schema migration block failed"));

// ── Contact requests table ─────────────────────────────────────────────────
db.execute(sql`
  CREATE TABLE IF NOT EXISTS contact_requests (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (from_user_id, to_user_id)
  )
`).catch(() => {/* table may not exist yet in fresh envs */});

// ── Create user_sessions table if it doesn't exist ────────────────────────
db.execute(sql`
  CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device TEXT NOT NULL DEFAULT 'Unknown',
    ip_address TEXT NOT NULL DEFAULT 'unknown',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  )
`).then(() =>
  db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`)
).catch((err) => logger.warn({ err }, "user_sessions table setup warning"));

httpServer.listen(port, () => {
  logger.info({ port }, "Server listening");
});

setInterval(async () => {
  try {
    const rows = await db.execute(sql`SELECT * FROM scheduled_messages WHERE scheduled_at <= NOW()`);
    for (const msg of rows.rows as any[]) {
      const [inserted] = await db.insert(messagesTable).values({
        chatId: msg.chat_id,
        senderId: msg.sender_id,
        text: msg.text,
        type: "text",
      }).returning();
      broadcastToChat(msg.chat_id, "new-message", { messageId: inserted.id, chatId: msg.chat_id });
      await db.execute(sql`DELETE FROM scheduled_messages WHERE id = ${msg.id}`);
    }
  } catch (err) {
    logger.warn({ err }, "Scheduled messages processor error");
  }
}, 30_000);

setInterval(async () => {
  try {
    const chats = await db.execute(sql`SELECT id, auto_delete_timer FROM chats WHERE auto_delete_timer IS NOT NULL AND auto_delete_timer > 0`);
    for (const chat of chats.rows as any[]) {
      const cutoff = new Date(Date.now() - Number(chat.auto_delete_timer) * 1000);
      const deleted = await db.delete(messagesTable).where(
        and(eq(messagesTable.chatId, Number(chat.id)), lte(messagesTable.createdAt, cutoff))
      ).returning({ id: messagesTable.id });
      for (const { id } of deleted) {
        broadcastToChat(Number(chat.id), "message-deleted", { messageId: id, chatId: Number(chat.id) });
      }
    }
  } catch (err) {
    logger.warn({ err }, "Auto-delete cleanup error");
  }
}, 10_000);

// ── Expired stories cleanup ────────────────────────────────────────────────
// Stories are only ever filtered out of query results by expiresAt — the
// rows (and their inline base64 media, when object storage isn't configured)
// stayed in the database forever. Actually delete them once expired so the
// table doesn't grow without bound.
setInterval(async () => {
  try {
    // story_views has no ON DELETE CASCADE to stories, so clear child rows first.
    await db.execute(sql`DELETE FROM story_views WHERE story_id IN (SELECT id FROM stories WHERE expires_at < NOW())`);
    await db.delete(storiesTable).where(lt(storiesTable.expiresAt, new Date()));
  } catch (err) {
    logger.warn({ err }, "Expired stories cleanup error");
  }
}, 15 * 60 * 1000);

// ── Long-term log retention cleanup ────────────────────────────────────────
// These tables are pure audit/log data (no user-facing history screen reads
// them past a few weeks) and would otherwise grow forever. Trim old rows
// daily so the database stays small over years of operation.
const DAY_MS = 24 * 60 * 60 * 1000;
setInterval(async () => {
  try {
    // Moderation scan run logs — keep 90 days.
    await db.execute(sql`DELETE FROM moderation_scan_runs WHERE started_at < NOW() - INTERVAL '90 days'`).catch(() => {});
    // Currency ledger entries — keep 2 years (balances themselves are unaffected, this is just the activity log).
    await db.execute(sql`DELETE FROM spark_activity WHERE created_at < NOW() - INTERVAL '2 years'`).catch(() => {});
    // Resolved moderation reports — keep 1 year, then purge (unresolved ones are kept indefinitely).
    await db.execute(sql`DELETE FROM user_reports WHERE created_at < NOW() - INTERVAL '1 year' AND status != 'pending'`).catch(() => {});
    await db.execute(sql`DELETE FROM post_reports WHERE created_at < NOW() - INTERVAL '1 year' AND status != 'pending'`).catch(() => {});
  } catch (err) {
    logger.warn({ err }, "Log retention cleanup error");
  }
}, DAY_MS);

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

async function maybeRunWeeklyScan() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS moderation_scan_runs (
        id SERIAL PRIMARY KEY,
        started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMP WITH TIME ZONE,
        posts_scanned INTEGER NOT NULL DEFAULT 0,
        posts_flagged INTEGER NOT NULL DEFAULT 0,
        triggered_by TEXT NOT NULL DEFAULT 'scheduler',
        status TEXT NOT NULL DEFAULT 'running'
      )
    `);
    await db.execute(sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_status TEXT`);
    await db.execute(sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_reason TEXT`);
    await db.execute(sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_confidence INTEGER`);
    await db.execute(sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_categories TEXT`);
    await db.execute(sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_scanned_at TIMESTAMP WITH TIME ZONE`);

    const lastRun = await db.execute(sql`
      SELECT started_at FROM moderation_scan_runs
      WHERE status = 'completed' AND triggered_by = 'scheduler'
      ORDER BY started_at DESC LIMIT 1
    `);

    const lastRunAt = (lastRun.rows[0] as any)?.started_at;
    const now = Date.now();
    const shouldRun = !lastRunAt || (now - new Date(lastRunAt).getTime()) >= WEEK_MS;

    if (!shouldRun) return;

    const [runResult] = (await db.execute(sql`
      INSERT INTO moderation_scan_runs (triggered_by, status)
      VALUES ('scheduler', 'running')
      RETURNING id
    `)).rows as any[];

    logger.info({ runId: runResult.id }, "Weekly AI moderation scan starting");
    setImmediate(() => runWeeklyScan(runResult.id, "scheduler"));
  } catch (err) {
    logger.warn({ err }, "Weekly moderation scheduler error");
  }
}

setTimeout(() => maybeRunWeeklyScan(), 60_000);
setInterval(() => maybeRunWeeklyScan(), 60 * 60 * 1000);

// ── Keep-alive: prevent Render free tier from sleeping ────────────────────────
// Pings the server's own /health endpoint every 10 minutes so Render doesn't
// spin down the instance after 15 minutes of inactivity.
const SELF_URL = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL;
if (SELF_URL && process.env.NODE_ENV === "production") {
  const keepAliveUrl = `${SELF_URL.replace(/\/$/, "")}/health`;
  setInterval(async () => {
    try {
      const res = await fetch(keepAliveUrl, { signal: AbortSignal.timeout(8000) });
      logger.debug({ status: res.status }, "Keep-alive ping sent");
    } catch (err) {
      logger.warn({ err }, "Keep-alive ping failed (non-fatal)");
    }
  }, 10 * 60 * 1000); // 10 minutes
  logger.info({ keepAliveUrl }, "Keep-alive pings enabled");
}
