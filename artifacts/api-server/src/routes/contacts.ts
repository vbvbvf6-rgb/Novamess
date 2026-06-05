import { Router } from "express";
import { db, contactsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { AddContactBody } from "@workspace/api-zod";

const router = Router();

async function getUserPrimeInfo(userId: number): Promise<{ hasPrime: boolean; isPrimePlus: boolean }> {
  try {
    const row = await db.execute(sql`SELECT has_prime, prime_tier, prime_expires_at FROM users WHERE id = ${userId}`);
    const u = row.rows[0] as any;
    const hasPrime = (u?.has_prime === true || u?.has_prime === "t") && u?.prime_expires_at && new Date(u.prime_expires_at) > new Date();
    const isPrimePlus = hasPrime && u?.prime_tier === "prime_plus";
    return { hasPrime: !!hasPrime, isPrimePlus: !!isPrimePlus };
  } catch { return { hasPrime: false, isPrimePlus: false }; }
}

router.get("/contacts", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const contacts = await db
      .select({ user: usersTable })
      .from(contactsTable)
      .innerJoin(usersTable, eq(contactsTable.contactId, usersTable.id))
      .where(eq(contactsTable.userId, uid));
    res.json(contacts.map(c => c.user));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/contacts", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const body = AddContactBody.parse(req.body);

    const countRow = await db.execute(sql`SELECT COUNT(*) as cnt FROM contacts WHERE user_id = ${uid}`);
    const currentCount = Number((countRow.rows[0] as any)?.cnt || 0);
    const { hasPrime, isPrimePlus } = await getUserPrimeInfo(uid);
    const maxContacts = isPrimePlus ? 10000 : hasPrime ? 2000 : 500;
    if (currentCount >= maxContacts) {
      return res.status(400).json({
        error: isPrimePlus
          ? `Достигнут максимальный лимит контактов (${maxContacts.toLocaleString()})`
          : `Достигнут лимит контактов (${maxContacts}). Обновитесь до ${hasPrime ? "Prime+" : "Prime"} для большего лимита`
      });
    }

    try {
      await db.insert(contactsTable).values({ userId: uid, contactId: body.userId }).onConflictDoNothing();
    } catch {}
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, body.userId) });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(201).json(user);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/contacts/:contactId", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const contactId = Number(req.params.contactId);
    await db.delete(contactsTable).where(
      and(eq(contactsTable.userId, uid), eq(contactsTable.contactId, contactId))
    );
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
