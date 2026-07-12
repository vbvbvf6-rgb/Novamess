---
name: Drizzle schema/DB drift danger
description: Why drizzle-kit generate can propose destructive DROP TABLE/COLUMN statements, and how to check before applying.
---

## The rule
Before running any SQL that `drizzle-kit generate` produces, read the generated `.sql` file in full. Never pipe it straight into `psql` unseen.

**Why:** `drizzle-kit generate` diffs the current `schema.ts` against the last recorded migration snapshot — not against the live database. If a table/column was removed from `schema.ts` at some point but the underlying DB table was never dropped (common when a feature is "removed from the UI" but its backend/DB is left alone, or when schema files get reorganized), the next `generate` will propose `DROP TABLE ... CASCADE` / `DROP COLUMN` for it, even though the table is alive and in active use via raw SQL (`db.execute(sql\`...\`)`) elsewhere in the codebase.

This bit us with `gift_items`/`gifts`: they were dropped from `lib/db/src/schema/*.ts` but the tables were still queried directly via raw SQL in `wallet.ts`/`users.ts` and populated by `seed.ts`. A blind `generate` + apply dropped real production-shaped data.

**How to apply:**
- After generating, open the `.sql` file and scan for `DROP TABLE`, `DROP COLUMN`, `CASCADE`. If present and unexpected, don't apply — instead add/restore the missing table(s) in `schema.ts` first (matching actual DB columns via `\d tablename`), regenerate, and confirm the new migration only contains the intended change.
- If a table is genuinely raw-SQL-only and intentionally absent from `schema.ts`, that's a trap for every future `generate` — better to add a schema.ts definition for it purely for drift-safety, even if the app code keeps using raw SQL.
