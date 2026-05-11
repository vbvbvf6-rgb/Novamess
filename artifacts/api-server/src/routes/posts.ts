import { Router } from "express";
import { db, postsTable, postLikesTable, postCommentsTable, usersTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";

const router = Router();

// ── AI Auto-moderation ────────────────────────────────────────────────────────

interface ModerationResult {
  flagged: boolean;
  categories: string[];
  confidence: number;
  reason: string;
}

// ── Local keyword-based first-pass filter ─────────────────────────────────
// Catches obvious Russian/English insults without needing an AI call.
const INSULT_PATTERNS = [
  // Russian mat and heavy insults (partial matches)
  /\bмудак|мудил[ао]|мудозвон/i,
  /\bдебил|дебильн/i,
  /\bидиот|идиотк/i,
  /\bтупица|тупой\s+[^\s]+|тупорыл/i,
  /\bпридурок|придурк/i,
  /\bурод|уродин/i,
  /\bкозёл|козел\b|козлин/i,
  /\bлох\b|лошар/i,
  /\bбаран\b|барани/i,
  /\bдрочил|долбоёб|долбоеб/i,
  /\bпиздабол|пиздёж/i,
  /\bсволочь\b|сволоч/i,
  /\bублюдок|ублюдк/i,
  /\bпадла\b|падлюк/i,
  /\bохуел|охуеть|офигел/i,
  /\bзаткнись|заткни\s+пасть/i,
  /\bшлюха|шлюхи|шлюху/i,
  /\bпроститутк/i,
  /\bнигг[еэ]р|нигр[еа]/i,
  /\bчурк[аио]/i,
  /\bхохол|хохлы/i,
  /\bкацап/i,
  /\bпидор|пидар|пидр/i,
  /\bгандон/i,
  /\bебан[ыуое]|ёбан[ыуое]/i,
  /\bеблан|ёблан/i,
  /\bмразь\b|мрази/i,
  /\bтварь\b|твари\b/i,
  /\bскотин[аы]/i,
  /\bублюдок/i,
  /\bнегодяй/i,
  /\bзлодей/i,
  // English heavy insults
  /\bfuck\s+you\b/i,
  /\bkill\s+yourself\b/i,
  /\bkys\b/i,
  /\bass\s*hole\b/i,
  /\bmother\s*fuck/i,
  /\bnigger\b|\bnigga\b/i,
  /\bcunt\b/i,
  /\bfaggot\b/i,
  /\bretard\b/i,
  /\bgo\s+die\b/i,
  /\bi\s+hate\s+you\b/i,
  /\bwhore\b/i,
  /\bbitch\b.*\bstupid|stupid.*\bbitch\b/i,
  // Calls to violence
  /убей\s+(себя|его|её|их|всех)/i,
  /\bубийца\b.*ты|ты.*\bубийца\b/i,
];

function localModerationCheck(text: string): ModerationResult | null {
  const lower = text.toLowerCase();
  for (const pattern of INSULT_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        flagged: true,
        categories: ["harassment"],
        confidence: 95,
        reason: "Обнаружены оскорбления или нецензурная лексика",
      };
    }
  }
  return null;
}

async function moderateContent(text: string): Promise<ModerationResult> {
  const safe: ModerationResult = { flagged: false, categories: [], confidence: 0, reason: "" };
  if (!text || text.trim().length < 5) return safe;

  // Run local keyword filter first — instant, no API call needed
  const localResult = localModerationCheck(text);
  if (localResult) return localResult;

  const systemPrompt = `You are a strict content moderation AI for a social platform. Analyze the post text and return ONLY a JSON object (no markdown, no explanation) with:
- "flagged": boolean (true if content violates rules)
- "categories": array from: ["spam","hate_speech","adult_content","violence","harassment","misinformation","self_harm"]
- "confidence": integer 0-100
- "reason": string (short explanation in Russian, max 100 chars, empty if not flagged)

Flag ANY of the following: insults directed at a person or group, name-calling, mockery, humiliation, hate speech, slurs, calls to violence, explicit content, severe harassment, dangerous self-harm encouragement, or obvious spam. Do NOT allow personal attacks even if phrased subtly. Return flagged=true for any post containing insults, toxic language, or degrading content targeting real people.`;

  const tryModerate = async (model: string): Promise<ModerationResult | null> => {
    try {
      const r = await fetch("https://text.pollinations.ai/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text.slice(0, 1000) }
          ],
          max_tokens: 200,
          temperature: 0.1,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) return null;
      const data = await r.json() as any;
      const raw = data.choices?.[0]?.message?.content || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        flagged: !!parsed.flagged,
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        confidence: Number(parsed.confidence) || 0,
        reason: String(parsed.reason || ""),
      };
    } catch { return null; }
  };

  let result = await tryModerate("openai");
  if (!result) result = await tryModerate("mistral");
  return result || safe;
}

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

// ── Routes ────────────────────────────────────────────────────────────────────

router.get("/posts", async (req, res) => {
  try {
    const uid = req.currentUserId;

    const isAdminRow = await db.execute(sql`SELECT is_admin FROM users WHERE id = ${uid}`);
    const isAdmin = !!(isAdminRow.rows[0] as any)?.is_admin;

    const posts = await db.select().from(postsTable).orderBy(desc(postsTable.createdAt)).limit(100);

    const visible = posts.filter((p: any) => {
      if (isAdmin) return true;
      if ((p as any).moderationStatus === 'rejected') return p.userId === uid;
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
    const { text, imageUrl } = req.body;
    if (!text && !imageUrl) return res.status(400).json({ error: "text or image required" });

    const [post] = await db.insert(postsTable).values({ userId: uid, text, imageUrl }).returning();
    const built = await buildPost(post.id, uid);
    res.status(201).json(built);

    // Async AI moderation (don't block response)
    setImmediate(async () => {
      try {
        const result = await moderateContent(text);
        if (result.flagged && result.confidence >= 40) {
          await db.execute(sql`
            UPDATE posts SET
              moderation_status = 'rejected',
              moderation_reason = ${result.reason || 'Контент нарушает правила сообщества'},
              moderation_confidence = ${result.confidence},
              moderation_categories = ${JSON.stringify(result.categories)}
            WHERE id = ${post.id}
          `);
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
      await db.update(postsTable).set({ likesCount: Math.max(0, (await db.query.postsTable.findFirst({ where: eq(postsTable.id, postId) }))!.likesCount - 1) }).where(eq(postsTable.id, postId));
    } else {
      await db.insert(postLikesTable).values({ postId, userId: uid });
      const post = await db.query.postsTable.findFirst({ where: eq(postsTable.id, postId) });
      await db.update(postsTable).set({ likesCount: (post?.likesCount ?? 0) + 1 }).where(eq(postsTable.id, postId));
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
    if (!text) return res.status(400).json({ error: "text required" });
    const [comment] = await db.insert(postCommentsTable).values({ postId, userId: uid, text }).returning();
    const post = await db.query.postsTable.findFirst({ where: eq(postsTable.id, postId) });
    await db.update(postsTable).set({ commentsCount: (post?.commentsCount ?? 0) + 1 }).where(eq(postsTable.id, postId));
    const author = await db.query.usersTable.findFirst({ where: eq(usersTable.id, uid) });
    res.status(201).json({ ...comment, author: author ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
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

export default router;
