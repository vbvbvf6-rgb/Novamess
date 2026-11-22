import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function isHalloweenEventEnabled(): Promise<boolean> {
  const rows = await db.execute(sql`
    SELECT value FROM app_settings WHERE key = 'halloween_event' LIMIT 1
  `);
  const rawValue = (rows.rows[0] as { value?: string } | undefined)?.value;
  if (!rawValue) return true;

  try {
    return JSON.parse(rawValue).enabled !== false;
  } catch {
    return true;
  }
}
