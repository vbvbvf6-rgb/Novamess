---
name: Account moderation system (bans + deletion reasons)
description: How temporary bans and deletion-with-reason are implemented, for consistency in future moderation work.
---

Bans are no longer a simple boolean. `users.ban_reason` (text) and `users.ban_expires_at` (timestamptz, null = permanent) sit alongside `is_banned`. `POST /admin/users/:userId/ban` accepts `{ ban, reason, durationHours }`; login (`auth.ts`) auto-clears an expired ban instead of just checking the boolean, and returns `{ accountBanned, banReason, banExpiresAt }` in the 403 body.

Deletions require a reason. Before the hard delete, `admin.ts` upserts into `deleted_accounts (username, reason, deleted_at)`. On login, a not-found username is checked against this table so the user gets `{ accountDeleted, reason }` (410) instead of a generic "wrong password".

**Why:** users need to know *why* they were banned/deleted rather than being silently locked out — this was an explicit product requirement.
**How to apply:** any future moderation action (mute, warn, etc.) should follow the same shape — reason + optional expiry stored on the row, surfaced to the affected user at their next relevant request (login for bans/deletion).
