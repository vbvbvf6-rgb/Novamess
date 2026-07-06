import { Router } from "express";
import { db, postsTable, postLikesTable, postCommentsTable, usersTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { moderateContent, localModerationCheck, checkCustomBannedWords } from "../lib/moderation";
import { getBanwords, findBanword } from "../lib/banwords";
import { broadcastToUser } from "../lib/sse";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function buildPost(postId: number, currentUserId: number) {
  const post = await db.query.postsTable.findFirst({ where: eq(postsTable.id, postId) });
  if (!post) return null;
  const author = await db.query.usersTable.findFirst({ where: eq(usersTable.id, post.userId) });
  const likeRow = await db.query.postLikesTable.findFirst({
    where: and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, currentUserId))
  });

  let appeal: any = null;
  try {
    const appealRows = await db.execute(sql`SELECT id, status, appeal_text, admin_response, created_at FROM moderation_appeals WHERE post_id = ${postId}`);
    appeal = (appealRows.rows[0] as any) || null;
  } catch {}

  return {
    ...post,
    author: author ?? null,
    isLiked: !!likeRow,
    appeal,
  };
}

// Count how many posts/comments have been blocked for this user in the last 24h
async function countRecentStrikes(userId: number): Promise<number> {
  try {
    const rows = await db.execute(sql`
      SELECT COUNT(*) AS cnt FROM posts
      WHERE user_id = ${userId}
        AND moderation_status = 'rejected'
        AND created_at > NOW() - INTERVAL '24 hours'
    `);
    return Number((rows.rows[0] as any)?.cnt || 0);
  } catch {
    return 0;
  }
}

// Check if user is auto-muted from posting due to strikes
async function isUserFeedMuted(userId: number): Promise<boolean> {
  const strikes = await countRecentStrikes(userId);
  return strikes >= 3;
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.get("/posts", async (req, res) => {
  try {
    const uid = req.currentUserId;

    const isAdminRow = await db.execute(sql`SELECT is_admin FROM users WHERE id = ${uid}`);
    const isAdmin = !!(isAdminRow.rows[0] as any)?.is_admin;

    const posts = await db.select().from(postsTable).orderBy(desc(postsTable.createdAt)).limit(100);

    const visible = posts.filter((p: any) => {
      if (isAdmin) return true;
      if ((p as any).moderationStatus === 'rejected') {
        // Rejected posts are hidden from everyone in the main feed
        return false;
      }
      return true;
    });

    const built = await Promise.all(visible.map(p => buildPost(p.id, uid)));
    res.json(built.filter(Boolean));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/posts", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { text, imageUrl, topic } = req.body;
    if (!text && !imageUrl) return res.status(400).json({ error: "text or image required" });

    // ── Admin bypass: skip all moderation ────────────────────────────────────
    const isAdminRow = await db.execute(sql`SELECT is_admin FROM users WHERE id = ${uid}`);
    const isAdmin = !!(isAdminRow.rows[0] as any)?.is_admin;
    if (isAdmin) {
      const [post] = await db.insert(postsTable).values({
        userId: uid, text, imageUrl, topic: topic || null,
      }).returning();
      const built = await buildPost(post.id, uid);
      return res.status(201).json(built);
    }

    // ── Strike check: auto-mute after 3 blocked posts in 24h ─────────────────
    if (await isUserFeedMuted(uid)) {
      return res.status(429).json({
        error: "Вы временно ограничены в публикациях из-за нарушений правил. Ограничение снимается через 24 часа.",
        code: "FEED_MUTED",
      });
    }

    // ── Banwords table check (admin-managed, same source as messages) ──────────
    if (text) {
      const banwords = await getBanwords();
      const hit = findBanword(text, banwords);
      if (hit) {
        return res.status(422).json({
          error: "Пост содержит запрещённое слово и не может быть опубликован.",
          code: "MODERATION_BLOCKED",
          categories: ["banned_word"],
        });
      }
    }

    // ── Custom banned words check ─────────────────────────────────────────────
    if (text) {
      try {
        const bwRows = await db.execute(sql`
          SELECT word FROM banned_words LIMIT 500
        `);
        const customWords = (bwRows.rows as any[]).map(r => r.word);
        const customResult = checkCustomBannedWords(text, customWords);
        if (customResult) {
          await db.insert(postsTable).values({
            userId: uid, text, imageUrl, topic: topic || null,
            moderationStatus: "rejected",
            moderationReason: customResult.reason,
            moderationConfidence: customResult.confidence,
            moderationCategories: customResult.categories,
          } as any).returning();
          return res.status(422).json({
            error: customResult.reason,
            code: "MODERATION_BLOCKED",
            categories: customResult.categories,
          });
        }
      } catch {}
    }

    // ── Synchronous local regex check (instant, no network) ──────────────────
    if (text) {
      const localResult = localModerationCheck(text);
      if (localResult) {
        // Insert as rejected immediately so it counts as a strike
        const [blocked] = await db.insert(postsTable).values({
          userId: uid, text, imageUrl, topic: topic || null,
          moderationStatus: "rejected",
          moderationReason: localResult.reason,
          moderationConfidence: localResult.confidence,
          moderationCategories: localResult.categories,
        } as any).returning();
        return res.status(422).json({
          error: localResult.reason,
          code: "MODERATION_BLOCKED",
          categories: localResult.categories,
        });
      }
    }

    // ── Synchronous AI moderation check (blocks response until done) ──────────
    if (text && text.trim().length >= 5) {
      try {
        const aiResult = await moderateContent(text);
        if (aiResult.flagged && aiResult.confidence >= 75) {
          // Insert as rejected so it counts as a strike
          await db.insert(postsTable).values({
            userId: uid, text, imageUrl, topic: topic || null,
            moderationStatus: "rejected",
            moderationReason: aiResult.reason || "Контент нарушает правила сообщества",
            moderationConfidence: aiResult.confidence,
            moderationCategories: aiResult.categories,
          } as any).returning();
          return res.status(422).json({
            error: aiResult.reason || "Контент нарушает правила сообщества",
            code: "MODERATION_BLOCKED",
            categories: aiResult.categories,
            confidence: aiResult.confidence,
          });
        }
      } catch {
        // AI timed out — fall through to insert, run async below as backup
      }
    }

    // ── Clean content — insert and publish ────────────────────────────────────
    const [post] = await db.insert(postsTable).values({
      userId: uid, text, imageUrl, topic: topic || null,
    }).returning();
    const built = await buildPost(post.id, uid);
    res.status(201).json(built);

    // Async AI re-check as safety net (catches anything that slipped through timeout)
    setImmediate(async () => {
      if (!text || text.trim().length < 5) return;
      try {
        const result = await moderateContent(text);
        if (result.flagged && result.confidence >= 75) {
          await db.execute(sql`
            UPDATE posts SET
              moderation_status = 'rejected',
              moderation_reason = ${result.reason || 'Контент нарушает правила сообщества'},
              moderation_confidence = ${result.confidence},
              moderation_categories = ${JSON.stringify(result.categories)}
            WHERE id = ${post.id}
          `);
          broadcastToUser(uid, "moderation-removed", { postId: post.id });
        }
      } catch {}
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/posts/:postId", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const postId = Number(req.params.postId);

    const post = await db.query.postsTable.findFirst({ where: eq(postsTable.id, postId) });
    const isAdminRow = await db.execute(sql`SELECT is_admin FROM users WHERE id = ${uid}`);
    const isAdmin = !!(isAdminRow.rows[0] as any)?.is_admin;

    if (!post) return res.status(404).json({ error: "Not found" });
    if (post.userId !== uid && !isAdmin) return res.status(403).json({ error: "Forbidden" });

    await db.execute(sql`DELETE FROM moderation_appeals WHERE post_id = ${postId}`);
    await db.delete(postCommentsTable).where(eq(postCommentsTable.postId, postId));
    await db.delete(postLikesTable).where(eq(postLikesTable.postId, postId));
    await db.delete(postsTable).where(eq(postsTable.id, postId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/posts/:postId/like", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const postId = Number(req.params.postId);
    const existing = await db.query.postLikesTable.findFirst({
      where: and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, uid))
    });
    if (existing) {
      await db.delete(postLikesTable).where(eq(postLikesTable.id, existing.id));
      // Use SQL expression to decrement atomically (avoids null assertion crash)
      await db.execute(sql`UPDATE posts SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1) WHERE id = ${postId}`);
    } else {
      await db.insert(postLikesTable).values({ postId, userId: uid });
      await db.execute(sql`UPDATE posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = ${postId}`);
    }
    const built = await buildPost(postId, uid);
    res.json(built);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/posts/:postId/comments", async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const comments = await db.select().from(postCommentsTable).where(eq(postCommentsTable.postId, postId)).orderBy(postCommentsTable.createdAt);
    const built = await Promise.all(comments.map(async c => {
      const author = await db.query.usersTable.findFirst({ where: eq(usersTable.id, c.userId) });
      return { ...c, author: author ?? null };
    }));
    res.json(built);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/posts/:postId/comments", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const postId = Number(req.params.postId);
    const { text } = req.body;
    if (!text || !String(text).trim()) return res.status(400).json({ error: "text required" });

    const clean = String(text).trim();

    // ── Sync local check for comments ─────────────────────────────────────────
    const localResult = localModerationCheck(clean);
    if (localResult) {
      return res.status(422).json({
        error: localResult.reason,
        code: "MODERATION_BLOCKED",
      });
    }

    // ── Sync AI check for comments ────────────────────────────────────────────
    if (clean.length >= 5) {
      try {
        const aiResult = await moderateContent(clean);
        if (aiResult.flagged && aiResult.confidence >= 25) {
          return res.status(422).json({
            error: aiResult.reason || "Комментарий нарушает правила сообщества",
            code: "MODERATION_BLOCKED",
          });
        }
      } catch {
        // AI timeout — allow through, async check below
      }
    }

    // ── Insert comment ────────────────────────────────────────────────────────
    const [comment] = await db.insert(postCommentsTable).values({ postId, userId: uid, text: clean }).returning();
    await db.execute(sql`UPDATE posts SET comments_count = comments_count + 1 WHERE id = ${postId}`);
    const author = await db.query.usersTable.findFirst({ where: eq(usersTable.id, uid) });
    res.status(201).json({ ...comment, author: author ?? null });

    // Async AI safety net for comments
    setImmediate(async () => {
      if (clean.length < 5) return;
      try {
        const result = await moderateContent(clean);
        if (result.flagged && result.confidence >= 25) {
          await db.execute(sql`DELETE FROM post_comments WHERE id = ${comment.id}`);
          await db.execute(sql`UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = ${postId}`);
        }
      } catch {}
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/posts/:postId/comments/:commentId", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const postId = Number(req.params.postId);
    const commentId = Number(req.params.commentId);

    const userRows = await db.execute(sql`SELECT is_admin FROM users WHERE id = ${uid} LIMIT 1`);
    const isAdmin = (userRows.rows[0] as any)?.is_admin === true;

    const rows = await db.execute(
      sql`SELECT id, user_id FROM post_comments WHERE id = ${commentId} AND post_id = ${postId} LIMIT 1`
    );
    const comment = rows.rows[0] as any;
    if (!comment) return res.status(404).json({ error: "Комментарий не найден" });
    if (comment.user_id !== uid && !isAdmin) {
      return res.status(403).json({ error: "Нет прав для удаления" });
    }

    await db.execute(sql`DELETE FROM post_comments WHERE id = ${commentId}`);
    await db.execute(sql`UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = ${postId}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── Appeals ───────────────────────────────────────────────────────────────────

router.post("/posts/:postId/appeal", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const postId = Number(req.params.postId);
    const { appealText } = req.body;

    if (!appealText || typeof appealText !== "string" || appealText.trim().length < 10) {
      return res.status(400).json({ error: "Напишите объяснение (минимум 10 символов)" });
    }

    const post = await db.query.postsTable.findFirst({ where: eq(postsTable.id, postId) });
    if (!post) return res.status(404).json({ error: "Пост не найден" });
    if (post.userId !== uid) return res.status(403).json({ error: "Это не ваш пост" });
    if ((post as any).moderationStatus !== 'rejected') {
      return res.status(400).json({ error: "Пост не заблокирован" });
    }

    const existing = await db.execute(sql`SELECT id, status FROM moderation_appeals WHERE post_id = ${postId}`);
    if ((existing.rows as any[]).length > 0) {
      const ex = existing.rows[0] as any;
      if (ex.status === 'pending') return res.status(409).json({ error: "Апелляция уже отправлена и ожидает рассмотрения" });
      if (ex.status === 'rejected') return res.status(409).json({ error: "Апелляция была отклонена и не может быть подана повторно" });
    }

    await db.execute(sql`
      INSERT INTO moderation_appeals (post_id, user_id, appeal_text)
      VALUES (${postId}, ${uid}, ${appealText.trim()})
      ON CONFLICT (post_id) DO UPDATE SET
        appeal_text = ${appealText.trim()},
        status = 'pending',
        admin_response = NULL,
        resolved_at = NULL,
        created_at = NOW()
    `);

    res.status(201).json({ success: true, message: "Апелляция отправлена на рассмотрение" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/posts/:postId/appeal", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const postId = Number(req.params.postId);
    const rows = await db.execute(sql`SELECT * FROM moderation_appeals WHERE post_id = ${postId} AND user_id = ${uid}`);
    res.json(rows.rows[0] || null);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── Post Reports ──────────────────────────────────────────────────────────────

router.post("/posts/:postId/report", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const postId = Number(req.params.postId);
    const { reason, details } = req.body;
    if (!reason) return res.status(400).json({ error: "Укажите причину жалобы" });

    const post = await db.query.postsTable.findFirst({ where: eq(postsTable.id, postId) });
    if (!post) return res.status(404).json({ error: "Пост не найден" });
    if (post.userId === uid) return res.status(400).json({ error: "Нельзя пожаловаться на собственный пост" });

    await db.execute(sql`
      INSERT INTO post_reports (post_id, reporter_id, reason, details)
      VALUES (${postId}, ${uid}, ${reason}, ${details ?? null})
    `);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
