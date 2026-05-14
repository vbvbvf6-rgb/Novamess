import app from "./app";
import { logger } from "./lib/logger";
import { runSeed } from "./seed";
import { db, messagesTable } from "@workspace/db";
import { sql, and, eq, lte } from "drizzle-orm";
import { broadcastToChat } from "./lib/sse";

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

runSeed().catch((err) => logger.error({ err }, "Seed failed"));

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

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
