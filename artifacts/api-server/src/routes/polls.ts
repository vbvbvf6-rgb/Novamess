import { Router } from "express";
import { db, messagesTable, chatMembersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { eq, and } from "drizzle-orm";
import { broadcastToChat } from "../lib/sse";

const router = Router();

async function isChatMember(chatId: number, userId: number): Promise<boolean> {
  const rows = await db.execute(sql`SELECT 1 FROM chat_members WHERE chat_id = ${chatId} AND user_id = ${userId} LIMIT 1`);
  return rows.rows.length > 0;
}

router.post("/polls", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { chatId, question, options, allowMultiple } = req.body;

    if (!chatId || !question || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: "chatId, question и минимум 2 варианта обязательны" });
    }
    if (options.length > 10) {
      return res.status(400).json({ error: "Максимум 10 вариантов ответа" });
    }
    if (String(question).length > 300) {
      return res.status(400).json({ error: "Вопрос слишком длинный" });
    }
    if (!(await isChatMember(Number(chatId), uid))) {
      return res.status(403).json({ error: "Нет доступа к чату" });
    }

    const cleanOptions = (options as string[]).map(o => String(o).trim()).filter(o => o.length > 0);

    const [msg] = await db.insert(messagesTable).values({
      chatId: Number(chatId),
      senderId: uid,
      text: String(question).trim(),
      type: "poll",
    }).returning();

    const pollRows = await db.execute(sql`
      INSERT INTO polls (message_id, chat_id, created_by, question, options, allow_multiple)
      VALUES (${msg.id}, ${Number(chatId)}, ${uid}, ${String(question).trim()}, ${JSON.stringify(cleanOptions)}, ${allowMultiple === true})
      RETURNING *
    `);
    const poll = pollRows.rows[0] as any;

    broadcastToChat(Number(chatId), "new-message", { messageId: msg.id, chatId: Number(chatId) });

    res.status(201).json({ ...poll, options: cleanOptions, votes: [], myVotes: [] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/polls/:pollId", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const pollId = Number(req.params.pollId);

    const pollRows = await db.execute(sql`SELECT * FROM polls WHERE id = ${pollId} LIMIT 1`);
    const poll = pollRows.rows[0] as any;
    if (!poll) return res.status(404).json({ error: "Опрос не найден" });

    if (!(await isChatMember(poll.chat_id, uid))) {
      return res.status(403).json({ error: "Нет доступа" });
    }

    const votes = await db.execute(sql`
      SELECT pv.*, u.display_name, u.avatar_color
      FROM poll_votes pv
      JOIN users u ON u.id = pv.user_id
      WHERE pv.poll_id = ${pollId}
    `);

    const myVotes = (votes.rows as any[]).filter(v => v.user_id === uid).map(v => v.option_index);
    const options: string[] = typeof poll.options === "string" ? JSON.parse(poll.options) : poll.options;

    res.json({
      ...poll,
      options,
      votes: votes.rows,
      myVotes,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/polls/:pollId/vote", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const pollId = Number(req.params.pollId);
    const { optionIndex } = req.body;

    if (optionIndex === undefined || optionIndex === null) {
      return res.status(400).json({ error: "optionIndex обязателен" });
    }

    const pollRows = await db.execute(sql`SELECT * FROM polls WHERE id = ${pollId} LIMIT 1`);
    const poll = pollRows.rows[0] as any;
    if (!poll) return res.status(404).json({ error: "Опрос не найден" });

    if (!(await isChatMember(poll.chat_id, uid))) {
      return res.status(403).json({ error: "Нет доступа" });
    }

    const options: string[] = typeof poll.options === "string" ? JSON.parse(poll.options) : poll.options;
    const idx = Number(optionIndex);
    if (idx < 0 || idx >= options.length) {
      return res.status(400).json({ error: "Неверный вариант ответа" });
    }

    const existing = await db.execute(sql`SELECT id FROM poll_votes WHERE poll_id = ${pollId} AND user_id = ${uid} AND option_index = ${idx} LIMIT 1`);
    if ((existing.rows as any[]).length > 0) {
      await db.execute(sql`DELETE FROM poll_votes WHERE poll_id = ${pollId} AND user_id = ${uid} AND option_index = ${idx}`);
    } else {
      if (!poll.allow_multiple) {
        await db.execute(sql`DELETE FROM poll_votes WHERE poll_id = ${pollId} AND user_id = ${uid}`);
      }
      await db.execute(sql`INSERT INTO poll_votes (poll_id, user_id, option_index) VALUES (${pollId}, ${uid}, ${idx}) ON CONFLICT DO NOTHING`);
    }

    broadcastToChat(poll.chat_id, "new-message", { chatId: poll.chat_id });

    const votes = await db.execute(sql`
      SELECT pv.*, u.display_name, u.avatar_color
      FROM poll_votes pv
      JOIN users u ON u.id = pv.user_id
      WHERE pv.poll_id = ${pollId}
    `);
    const myVotes = (votes.rows as any[]).filter(v => v.user_id === uid).map(v => v.option_index);

    res.json({ ...poll, options, votes: votes.rows, myVotes });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
