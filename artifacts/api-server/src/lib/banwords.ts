import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

let cache: string[] = [];
let cacheExpiry = 0;

export async function getBanwords(): Promise<string[]> {
  if (Date.now() < cacheExpiry) return cache;
  try {
    const rows = await db.execute(sql`SELECT word FROM banwords ORDER BY id`);
    cache = (rows.rows as any[]).map(r => String(r.word).toLowerCase());
    cacheExpiry = Date.now() + 60_000;
  } catch (error) {
    // Never fail open: if the moderation list cannot be read, callers must
    // stop publication instead of silently allowing potentially banned text.
    throw error;
  }
  return cache;
}

export function invalidateBanwordsCache() {
  cacheExpiry = 0;
}

/** Returns the first matching banword or null. */
export function findBanword(text: string, banwords: string[]): string | null {
  if (!text || banwords.length === 0) return null;
  // Keep the check server-side and normalize punctuation/spacing so a word
  // cannot be bypassed with case changes or separators such as "сло-во".
  const lower = text.toLocaleLowerCase("ru-RU");
  const compact = lower.replace(/[\s\p{P}\p{S}_]+/gu, "");
  return banwords.find((word) => {
    const normalizedWord = String(word).trim().toLocaleLowerCase("ru-RU");
    if (!normalizedWord) return false;
    return lower.includes(normalizedWord) || compact.includes(normalizedWord.replace(/[\s\p{P}\p{S}_]+/gu, ""));
  }) ?? null;
}
