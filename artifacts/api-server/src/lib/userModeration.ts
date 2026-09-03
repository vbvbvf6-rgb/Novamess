import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export type ModerationType = "none" | "ban" | "shadow_ban" | "spam_ban" | "no_first_message";

export interface UserModeration {
  type: ModerationType;
  reason: string | null;
  expiresAt: Date | null;
}

/**
 * Returns the user's active moderation state. Expired actions are cleared
 * lazily so a temporary restriction always ends without a separate scheduler.
 */
export async function getActiveUserModeration(userId: number): Promise<UserModeration> {
  const rows = await db.execute(sql`
    SELECT is_banned, moderation_type, ban_reason, ban_expires_at
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `);
  const row = rows.rows[0] as any;
  if (!row) return { type: "none", reason: null, expiresAt: null };

  let type = String(row.moderation_type || "").toLowerCase() as ModerationType;
  if (!["none", "ban", "shadow_ban", "spam_ban", "no_first_message"].includes(type)) type = "none";
  if (type === "none" && (row.is_banned === true || row.is_banned === "t" || row.is_banned === 1)) {
    type = "ban";
  }

  const expiresAt = row.ban_expires_at ? new Date(row.ban_expires_at) : null;
  if (type !== "none" && expiresAt && expiresAt.getTime() <= Date.now()) {
    await db.execute(sql`
      UPDATE users
      SET is_banned = false, moderation_type = 'none', ban_reason = NULL, ban_expires_at = NULL
      WHERE id = ${userId}
    `);
    return { type: "none", reason: null, expiresAt: null };
  }

  return {
    type,
    reason: row.ban_reason || null,
    expiresAt,
  };
}

export function moderationBlocksWriting(type: ModerationType): boolean {
  return type === "ban" || type === "spam_ban";
}

export function moderationBlocksStartingDirectChat(type: ModerationType): boolean {
  return type === "no_first_message";
}
